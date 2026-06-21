'use client';

/**
 * GigWheels - Vehicle Request Page
 * Weekly car rentals for gig drivers
 *
 * Customer page to submit a vehicle request.
 * Only approved customers (with approved insurance) can submit requests.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/api';

const API_BASE_URL = apiBaseUrl();

// Vehicle preferences
const vehiclePreferences = [
  { value: 'any', label: 'No Preference', description: 'Any available vehicle type' },
  { value: 'sedan', label: 'Sedan', description: 'Standard sedan for daily commuting' },
  { value: 'suv', label: 'SUV', description: 'Sport utility vehicle for families' },
  { value: 'luxury_sedan', label: 'Luxury Sedan', description: 'Premium sedan with luxury features' },
  { value: 'luxury_suv', label: 'Luxury SUV', description: 'Premium SUV with luxury amenities' },
  { value: 'sports', label: 'Sports Car', description: 'Performance-focused vehicle' },
];

// Request status display config
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending Review', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  reviewing: { label: 'Under Review', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100' },
  assigned: { label: 'Vehicle Assigned', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  cancelled: { label: 'Cancelled', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

interface EligibilityStatus {
  can_request: boolean;
  insurance_status: string;
  insurance_approved: boolean;
  has_active_request: boolean;
  active_request_id: number | null;
  active_request_status: string | null;
  is_banned: boolean;
  reasons: string[];
}

interface VehicleRequest {
  id: number;
  customer_profile_id: number;
  customer_email: string;
  customer_name: string | null;
  status: string;
  vehicle_preference: string;
  notes: string | null;
  preferred_start_date: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  assigned_vehicle_id: number | null;
  assigned_vehicle_info: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  assigned_at: string | null;
}

export default function VehicleRequestPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const isLoggingOut = useRef(false);

  const [eligibility, setEligibility] = useState<EligibilityStatus | null>(null);
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form data
  const [vehiclePreference, setVehiclePreference] = useState('any');
  const [notes, setNotes] = useState('');
  const [preferredStartDate, setPreferredStartDate] = useState('');
  const [gpsConsent, setGpsConsent] = useState(false);

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

  // Fetch eligibility and requests
  const fetchData = useCallback(async () => {
    if (!token) return;

    setIsLoadingData(true);
    setError(null);

    try {
      // Fetch eligibility status and requests in parallel
      const [eligibilityRes, requestsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/customer/can-request-vehicle`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/customer/vehicle-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (eligibilityRes.ok) {
        const eligibilityData = await eligibilityRes.json();
        setEligibility(eligibilityData);
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData);
      }
    } catch (err) {
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoadingData(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchData();
    }
  }, [isAuthenticated, token, fetchData]);

  const handleLogout = () => {
    isLoggingOut.current = true;
    logout();
    router.push('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !eligibility?.can_request) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/customer/vehicle-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicle_preference: vehiclePreference,
          notes: notes || null,
          preferred_start_date: preferredStartDate || null,
          gps_consent: gpsConsent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage('Your vehicle request has been submitted successfully! Our team will review it shortly.');
        setRequests([data, ...requests]);

        // Reset form
        setVehiclePreference('any');
        setNotes('');
        setPreferredStartDate('');
        setGpsConsent(false);

        // Update eligibility (now has active request)
        if (eligibility) {
          setEligibility({
            ...eligibility,
            can_request: false,
            has_active_request: true,
            active_request_id: data.id,
            active_request_status: data.status,
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || 'Failed to submit request. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/customer/vehicle-request/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh data
        await fetchData();
        setSuccessMessage('Vehicle request cancelled successfully.');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || 'Failed to cancel request.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const getStatusDisplay = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  if (isLoading || isLoadingData) {
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
            <Link href="/profile" className="text-sm text-gray-300 hover:text-white transition-colors">
              Profile
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
      <main className="max-w-4xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal">Request a Vehicle</h1>
          <p className="text-gray-600 mt-1">Submit a request to lease one of our premium vehicles</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Banned Customer Warning */}
        {eligibility?.is_banned && (
          <div className="mb-8 bg-red-50 border-2 border-red-500 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-800">Account Banned</h2>
                <p className="text-red-700 mt-1">
                  Your account has been banned and you cannot request new vehicles.
                </p>
                <p className="text-red-600 mt-3 text-sm">
                  If you believe this is an error, please{' '}
                  <Link href="/contact" className="underline font-medium hover:text-red-800">
                    contact support
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Eligibility Check */}
        {eligibility && !eligibility.can_request && !eligibility.is_banned && (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-charcoal">Cannot Submit Request</h2>
                <p className="text-gray-600 mt-1">Please address the following before requesting a vehicle:</p>
                <ul className="mt-3 space-y-2">
                  {eligibility.reasons.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <svg className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {reason}
                    </li>
                  ))}
                </ul>
                {!eligibility.insurance_approved && (
                  <div className="mt-4">
                    <Link
                      href="/profile"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-charcoal font-semibold rounded-lg hover:bg-gold/90 transition-colors"
                    >
                      Upload Insurance Document
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Request Form */}
        {eligibility?.can_request && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-charcoal mb-6">Submit Your Request</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Vehicle Preference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Vehicle Preference
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {vehiclePreferences.map((pref) => (
                    <label
                      key={pref.value}
                      className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        vehiclePreference === pref.value
                          ? 'border-gold bg-gold/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="vehicle_preference"
                        value={pref.value}
                        checked={vehiclePreference === pref.value}
                        onChange={(e) => setVehiclePreference(e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-charcoal">{pref.label}</p>
                        <p className="text-sm text-gray-500">{pref.description}</p>
                      </div>
                      {vehiclePreference === pref.value && (
                        <svg className="w-5 h-5 text-gold" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Preferred Start Date */}
              <div>
                <label htmlFor="preferred_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Start Date (optional)
                </label>
                <input
                  type="date"
                  id="preferred_start_date"
                  value={preferredStartDate}
                  onChange={(e) => setPreferredStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes (optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold transition-colors resize-none"
                  placeholder="Any specific requirements or preferences..."
                />
              </div>

              {/* GPS Tracking Consent */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex items-center h-6">
                    <input
                      type="checkbox"
                      id="gps_consent"
                      checked={gpsConsent}
                      onChange={(e) => setGpsConsent(e.target.checked)}
                      className="w-5 h-5 text-gold border-gray-300 rounded focus:ring-gold cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="gps_consent" className="block text-sm font-medium text-charcoal cursor-pointer">
                      I consent to GPS tracking <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      I acknowledge that all leased vehicles are equipped with GPS tracking devices for asset protection and fleet management purposes.
                      I have read and agree to the{' '}
                      <Link href="/gps-disclosure" target="_blank" className="text-gold hover:underline font-medium">
                        GPS Disclosure Policy
                      </Link>
                      .
                    </p>
                  </div>
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
                  disabled={isSubmitting || !gpsConsent}
                  className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-charcoal"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Request
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Previous Requests */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-charcoal mb-6">Your Vehicle Requests</h2>

          {requests.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-600">You haven&apos;t submitted any vehicle requests yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusDisplay(request.status).bgColor} ${getStatusDisplay(request.status).color}`}>
                          {getStatusDisplay(request.status).label}
                        </span>
                        <span className="text-sm text-gray-500">
                          Request #{request.id}
                        </span>
                      </div>
                      <p className="text-charcoal font-medium">
                        {vehiclePreferences.find((p) => p.value === request.vehicle_preference)?.label || 'No Preference'}
                      </p>
                      {request.notes && (
                        <p className="text-sm text-gray-600 mt-1">{request.notes}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Submitted {new Date(request.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>

                      {/* Admin Notes */}
                      {request.admin_notes && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs font-medium text-blue-700 mb-1">Admin Notes:</p>
                          <p className="text-sm text-blue-800">{request.admin_notes}</p>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {request.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <p className="text-xs font-medium text-red-700 mb-1">Rejection Reason:</p>
                          <p className="text-sm text-red-800">{request.rejection_reason}</p>
                        </div>
                      )}

                      {/* Assigned Vehicle */}
                      {request.assigned_vehicle_info && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-xs font-medium text-green-700 mb-1">Assigned Vehicle:</p>
                          <p className="text-sm text-green-800">{request.assigned_vehicle_info}</p>
                        </div>
                      )}
                    </div>

                    {/* Cancel Button */}
                    {(request.status === 'pending' || request.status === 'reviewing') && (
                      <button
                        onClick={() => handleCancelRequest(request.id)}
                        className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
