'use client';

/**
 * Weekly Vehicle Leasing Platform - Customer Profile Page
 * Salvage-to-Lux Fleet Management
 *
 * Customer profile view and edit page with insurance upload.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8100/api';

// Insurance status display config
const insuranceStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  not_uploaded: { label: 'Not Uploaded', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  pending: { label: 'Pending Verification', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  expired: { label: 'Expired', color: 'text-orange-700', bgColor: 'bg-orange-100' },
};

interface CustomerProfile {
  id: number;
  keycloak_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  drivers_license_number: string | null;
  drivers_license_state: string | null;
  insurance_status: string;
  insurance_expiration_date: string | null;
  is_verified: boolean;
  notification_email: boolean;
  notification_sms: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  notification_email: boolean;
  notification_sms: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const isLoggingOut = useRef(false);

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    notification_email: true,
    notification_sms: false,
  });

  // Insurance upload state
  const [isUploadingInsurance, setIsUploadingInsurance] = useState(false);
  const [insuranceUploadError, setInsuranceUploadError] = useState<string | null>(null);
  const [insuranceUploadSuccess, setInsuranceUploadSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect to login if not authenticated (unless logging out)
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoggingOut.current) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Redirect admins/ops to admin dashboard
  useEffect(() => {
    if (!isLoading && user && (user.is_admin || user.is_ops)) {
      router.push('/admin');
    }
  }, [isLoading, user, router]);

  // Fetch profile data
  useEffect(() => {
    async function fetchProfile() {
      if (!token) return;

      setIsLoadingProfile(true);
      try {
        const response = await fetch(`${API_BASE_URL}/customer/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data: CustomerProfile = await response.json();
          setProfile(data);
          setFormData({
            full_name: data.full_name || '',
            phone: data.phone || '',
            address_line1: data.address_line1 || '',
            address_line2: data.address_line2 || '',
            city: data.city || '',
            state: data.state || '',
            zip_code: data.zip_code || '',
            notification_email: data.notification_email,
            notification_sms: data.notification_sms,
          });
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setIsLoadingProfile(false);
      }
    }

    if (isAuthenticated && token) {
      fetchProfile();
    }
  }, [isAuthenticated, token]);

  const handleLogout = () => {
    isLoggingOut.current = true;
    logout();
    router.push('/');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data: CustomerProfile = await response.json();
        setProfile(data);
        setSuccessMessage('Profile updated successfully!');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || 'Failed to update profile');
      }
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Insurance upload handler
  const handleInsuranceUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Reset states
    setInsuranceUploadError(null);
    setInsuranceUploadSuccess(null);
    setIsUploadingInsurance(true);
    setUploadProgress(0);

    // Validate file type client-side
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setInsuranceUploadError('Invalid file type. Please upload a JPG, PNG, WebP, or PDF file.');
      setIsUploadingInsurance(false);
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setInsuranceUploadError('File too large. Maximum size is 10MB.');
      setIsUploadingInsurance(false);
      return;
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress for better UX
      setUploadProgress(30);

      const response = await fetch(`${API_BASE_URL}/customer/insurance/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      setUploadProgress(70);

      if (response.ok) {
        const data = await response.json();
        setUploadProgress(100);
        setInsuranceUploadSuccess(data.message || 'Insurance document uploaded successfully!');

        // Update profile state
        if (profile) {
          setProfile({
            ...profile,
            insurance_status: data.insurance_status,
          });
        }

        // Clear success after 5 seconds
        setTimeout(() => setInsuranceUploadSuccess(null), 5000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setInsuranceUploadError(errorData.detail || 'Failed to upload document. Please try again.');
      }
    } catch (err) {
      setInsuranceUploadError('Network error. Please check your connection and try again.');
    } finally {
      setIsUploadingInsurance(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [token, profile]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Get insurance status display
  const getInsuranceStatusDisplay = () => {
    const status = profile?.insurance_status || 'not_uploaded';
    return insuranceStatusConfig[status] || insuranceStatusConfig.not_uploaded;
  };

  if (isLoading || isLoadingProfile) {
    return (
      <div className="min-h-screen bg-luxury-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-luxury-cream">
      {/* Header */}
      <header className="bg-charcoal text-white py-4 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-gold">FX</span>Weekly
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white transition-colors">
              Dashboard
            </Link>
            <span className="text-sm text-gray-300">
              Welcome, <span className="text-gold font-medium">{user.name || user.email}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal">My Profile</h1>
          <p className="text-gray-600 mt-1">View and update your profile information</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Information (Read-only) */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-charcoal mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-charcoal font-medium">{profile?.email || user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Account Status</label>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  profile?.is_verified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {profile?.is_verified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>
            </div>
          </div>

          {/* Insurance Document Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-charcoal mb-4">Insurance Verification</h2>

            {/* Current Status */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-500 mb-2">Document Status</label>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getInsuranceStatusDisplay().bgColor} ${getInsuranceStatusDisplay().color}`}>
                {getInsuranceStatusDisplay().label}
              </span>
              {profile?.insurance_status === 'pending' && (
                <p className="text-sm text-gray-500 mt-2">
                  Your document is being reviewed. Verification typically takes up to 48 hours.
                </p>
              )}
              {profile?.insurance_status === 'rejected' && (
                <p className="text-sm text-red-600 mt-2">
                  Your document was not accepted. Please upload a clear copy of your valid insurance card.
                </p>
              )}
              {profile?.insurance_status === 'expired' && (
                <p className="text-sm text-orange-600 mt-2">
                  Your insurance has expired. Please upload an updated insurance document.
                </p>
              )}
            </div>

            {/* Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gold transition-colors">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleInsuranceUpload}
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                className="hidden"
                id="insurance-upload"
              />

              {/* Upload Icon */}
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>

              {/* Upload Status */}
              {isUploadingInsurance ? (
                <div>
                  <div className="flex justify-center mb-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold"></div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Uploading document...</p>
                  {/* Progress Bar */}
                  <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gold h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-2">
                    {profile?.insurance_status === 'not_uploaded'
                      ? 'Upload your driver insurance document'
                      : 'Upload a new insurance document'}
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    Accepted formats: JPG, PNG, WebP, PDF (Max 10MB)
                  </p>
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="inline-flex items-center px-4 py-2 bg-gold text-charcoal font-medium rounded-lg hover:bg-gold/90 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {profile?.insurance_status === 'not_uploaded' ? 'Upload Document' : 'Replace Document'}
                  </button>
                </>
              )}

              {/* Success Message */}
              {insuranceUploadSuccess && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {insuranceUploadSuccess}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {insuranceUploadError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {insuranceUploadError}
                  </p>
                </div>
              )}
            </div>

            {/* Requirements */}
            <div className="mt-4 text-sm text-gray-500">
              <p className="font-medium text-gray-700 mb-1">Document Requirements:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Clear, readable photo or scan of your insurance card</li>
                <li>Must show policy holder name, policy number, and coverage dates</li>
                <li>Document must be current and not expired</li>
              </ul>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-charcoal mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors"
                  placeholder="Enter your full name"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-charcoal mb-4">Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  id="address_line1"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors"
                  placeholder="123 Main Street"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700 mb-1">
                  Apartment, suite, etc. (optional)
                </label>
                <input
                  type="text"
                  id="address_line2"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors"
                  placeholder="Apt 4B"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors"
                  placeholder="New York"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors"
                  placeholder="NY"
                  maxLength={2}
                />
              </div>
              <div>
                <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zip_code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors"
                  placeholder="10001"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-charcoal mb-4">Notification Preferences</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="notification_email"
                  checked={formData.notification_email}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-gray-300 text-gold focus:ring-gold"
                />
                <span className="text-gray-700">Receive email notifications</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="notification_sms"
                  checked={formData.notification_sms}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-gray-300 text-gold focus:ring-gold"
                />
                <span className="text-gray-700">Receive SMS notifications</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 border-2 border-charcoal text-charcoal font-semibold rounded-lg hover:bg-charcoal hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-charcoal"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="bg-charcoal text-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-400">
          <p>&copy; 2026 FXWeekly. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/gps-disclosure" className="hover:text-white transition-colors">GPS Disclosure</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
