'use client';

/**
 * Weekly Vehicle Leasing Platform - Customer Profile Page
 * Salvage-to-Lux Fleet Management
 *
 * Customer profile view and edit page.
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8100/api';

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
