'use client';

/**
 * GigWheels - Incident Report Page
 * Weekly car rentals for gig drivers
 *
 * Customer incident report submission and viewing.
 */

import { useEffect, useRef, useState, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { apiBaseUrl } from '@/lib/api';

const API_BASE_URL = apiBaseUrl();

interface Incident {
  id: number;
  customer_profile_id: number;
  lease_id: number | null;
  customer_email: string;
  customer_name: string | null;
  incident_type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  location: string | null;
  incident_date: string;
  photo_keys: string[] | null;
  admin_notes: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  resolved_at: string | null;
}

interface CanReportResponse {
  can_report: boolean;
  has_active_lease: boolean;
  active_lease_id: number | null;
  reasons: string[];
}

const INCIDENT_TYPES = [
  { value: 'accident', label: 'Accident / Collision' },
  { value: 'breakdown', label: 'Mechanical Breakdown' },
  { value: 'theft', label: 'Theft' },
  { value: 'vandalism', label: 'Vandalism' },
  { value: 'flat_tire', label: 'Flat Tire' },
  { value: 'lockout', label: 'Locked Out' },
  { value: 'warning_light', label: 'Warning Light' },
  { value: 'body_damage', label: 'Body/Cosmetic Damage' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low - Minor issue, vehicle operational', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium - Moderate issue', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High - Serious issue', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical - Safety concern', color: 'bg-red-100 text-red-800' },
];

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

export default function IncidentsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const isLoggingOut = useRef(false);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [canReport, setCanReport] = useState<CanReportResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    incident_type: '',
    severity: 'medium',
    title: '',
    description: '',
    location: '',
  });
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoggingOut.current) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch incidents and eligibility
  const fetchData = useCallback(async () => {
    if (!token) return;

    setIsLoadingData(true);
    setError(null);

    try {
      const [incidentsRes, canReportRes] = await Promise.all([
        fetch(`${API_BASE_URL}/customer/incidents`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/customer/can-report-incident`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (incidentsRes.ok) {
        const data = await incidentsRes.json();
        setIncidents(data.incidents);
      }

      if (canReportRes.ok) {
        const data = await canReportRes.json();
        setCanReport(data);
      }
    } catch (err) {
      setError('Network error. Please try again.');
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

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      setSelectedPhotos(prev => [...prev, ...newPhotos].slice(0, 5)); // Max 5 photos
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !canReport?.can_report) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create incident report
      const response = await fetch(`${API_BASE_URL}/customer/incidents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incident_type: formData.incident_type,
          severity: formData.severity,
          title: formData.title,
          description: formData.description,
          location: formData.location || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit incident report');
      }

      const incident = await response.json();

      // Upload photos if any
      if (selectedPhotos.length > 0) {
        for (let i = 0; i < selectedPhotos.length; i++) {
          const photo = selectedPhotos[i];
          const formDataUpload = new FormData();
          formDataUpload.append('file', photo);

          await fetch(`${API_BASE_URL}/customer/incidents/${incident.id}/photos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formDataUpload,
          });

          setUploadProgress(((i + 1) / selectedPhotos.length) * 100);
        }
      }

      setSubmitSuccess(true);
      setShowForm(false);
      setFormData({
        incident_type: '',
        severity: 'medium',
        title: '',
        description: '',
        location: '',
      });
      setSelectedPhotos([]);
      setUploadProgress(0);
      fetchData(); // Refresh incidents list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit incident report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityInfo = (severity: string) => {
    return SEVERITY_LEVELS.find(s => s.value === severity) || SEVERITY_LEVELS[1];
  };

  const getIncidentTypeLabel = (type: string) => {
    const found = INCIDENT_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-luxury-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
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
            <Link href="/dashboard" className="text-sm text-gray-300 hover:text-gold transition-colors">
              Dashboard
            </Link>
            <Link href="/notifications" className="text-sm text-gray-300 hover:text-gold transition-colors">
              Notifications
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-charcoal">Incident Reports</h1>
            <p className="text-gray-600 mt-1">Report and track vehicle incidents</p>
          </div>
          {canReport?.can_report && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-lg hover:bg-gold/90 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Report Incident
            </button>
          )}
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Incident report submitted successfully. Our team will review it shortly.
            <button onClick={() => setSubmitSuccess(false)} className="ml-auto text-green-800 hover:text-green-900">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Cannot Report Warning */}
        {canReport && !canReport.can_report && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">Cannot Report Incident</h3>
                <ul className="mt-2 text-yellow-700 list-disc list-inside">
                  {canReport.reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Incident Report Form */}
        {showForm && canReport?.can_report && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-charcoal">Report New Incident</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Incident Type */}
              <div>
                <label htmlFor="incident_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Incident Type *
                </label>
                <select
                  id="incident_type"
                  name="incident_type"
                  value={formData.incident_type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                >
                  <option value="">Select incident type...</option>
                  {INCIDENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
                  Severity Level *
                </label>
                <select
                  id="severity"
                  name="severity"
                  value={formData.severity}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                >
                  {SEVERITY_LEVELS.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title / Summary *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Brief description of the incident"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={5}
                  placeholder="Please provide as much detail as possible about what happened, when, and any other relevant information."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent resize-none"
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Where did this incident occur?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:border-transparent"
                />
              </div>

              {/* Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photos (Optional - Max 5)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gold transition-colors">
                  <input
                    type="file"
                    id="photos"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                    disabled={selectedPhotos.length >= 5}
                  />
                  <label htmlFor="photos" className={`cursor-pointer ${selectedPhotos.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-600">
                      {selectedPhotos.length >= 5 ? 'Maximum 5 photos reached' : 'Click to upload photos of the incident'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">JPG, PNG, or WebP up to 10MB each</p>
                  </label>
                </div>

                {/* Selected Photos Preview */}
                {selectedPhotos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {selectedPhotos.map((photo, index) => (
                      <div key={index} className="relative">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {isSubmitting && uploadProgress > 0 && (
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gold h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.incident_type || !formData.title || !formData.description}
                  className="flex-1 px-6 py-3 bg-gold text-charcoal font-semibold rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Incidents List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-charcoal">Your Incident Reports</h2>
          </div>

          {incidents.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-2">No Incident Reports</h3>
              <p className="text-gray-600">
                You haven&apos;t reported any incidents yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {incidents.map(incident => (
                <div key={incident.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-charcoal">{incident.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                          {incident.status.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityInfo(incident.severity).color}`}>
                          {incident.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        <span className="font-medium">{getIncidentTypeLabel(incident.incident_type)}</span>
                        {incident.location && <span> &bull; {incident.location}</span>}
                      </p>
                      <p className="text-sm text-gray-600 line-clamp-2">{incident.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                        <span>Reported: {formatDate(incident.created_at)}</span>
                        {incident.photo_keys && incident.photo_keys.length > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {incident.photo_keys.length} photo{incident.photo_keys.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {incident.resolved_at && (
                          <span className="text-green-600">Resolved: {formatDate(incident.resolved_at)}</span>
                        )}
                      </div>
                      {incident.resolution_notes && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">
                            <span className="font-medium">Resolution: </span>
                            {incident.resolution_notes}
                          </p>
                        </div>
                      )}
                    </div>
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
