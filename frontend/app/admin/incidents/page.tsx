'use client';

import { useState, useEffect, useCallback } from 'react';

interface IncidentReport {
  id: number;
  customer_profile_id: number;
  customer_email: string;
  customer_name: string | null;
  lease_id: number | null;
  incident_type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  location: string | null;
  incident_date: string;
  photo_keys: string[] | null;
  assigned_to: string | null;
  admin_notes: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  resolved_at: string | null;
}

// Status badge colors
const statusColors: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

// Severity badge colors
const severityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

// Incident type labels
const typeLabels: Record<string, string> = {
  accident: 'Accident',
  breakdown: 'Breakdown',
  theft: 'Theft',
  vandalism: 'Vandalism',
  flat_tire: 'Flat Tire',
  lockout: 'Lockout',
  warning_light: 'Warning Light',
  body_damage: 'Body Damage',
  other: 'Other',
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showAddNotesModal, setShowAddNotesModal] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Form state
  const [adminNotes, setAdminNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchIncidents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('fx_weekly_lease_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status_filter', statusFilter);
      if (severityFilter) params.append('severity_filter', severityFilter);
      if (typeFilter) params.append('type_filter', typeFilter);

      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100'}/api/admin/incidents?${params}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to fetch incidents');
      }

      const data = await response.json();
      setIncidents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, severityFilter, typeFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleStartReview = async (incidentId: number) => {
    try {
      const token = localStorage.getItem('fx_weekly_lease_token');
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100'}/api/admin/incidents/${incidentId}/start-review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchIncidents();
        if (selectedIncident?.id === incidentId) {
          const updated = await response.json();
          setSelectedIncident(prev => prev ? { ...prev, status: updated.status, assigned_to: updated.assigned_to } : null);
        }
      }
    } catch (err) {
      console.error('Failed to start review:', err);
    }
  };

  const handleResolve = async () => {
    if (!selectedIncident || !resolutionNotes.trim()) return;

    try {
      const token = localStorage.getItem('fx_weekly_lease_token');
      if (!token) return;

      const params = new URLSearchParams();
      params.append('resolution_notes', resolutionNotes);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100'}/api/admin/incidents/${selectedIncident.id}/resolve?${params}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setShowResolveModal(false);
        setResolutionNotes('');
        fetchIncidents();
        setShowDetailModal(false);
      }
    } catch (err) {
      console.error('Failed to resolve incident:', err);
    }
  };

  const handleAddNotes = async () => {
    if (!selectedIncident) return;

    try {
      const token = localStorage.getItem('fx_weekly_lease_token');
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100'}/api/admin/incidents/${selectedIncident.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            admin_notes: adminNotes,
          }),
        }
      );

      if (response.ok) {
        setShowAddNotesModal(false);
        setAdminNotes('');
        // Refresh the selected incident
        const incidentResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8100'}/api/admin/incidents/${selectedIncident.id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );
        if (incidentResponse.ok) {
          const updated = await incidentResponse.json();
          setSelectedIncident(updated);
        }
        fetchIncidents();
      }
    } catch (err) {
      console.error('Failed to add notes:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openDetailModal = (incident: IncidentReport) => {
    setSelectedIncident(incident);
    setShowDetailModal(true);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-luxury-charcoal">Incident Reports</h1>
          <p className="text-gray-500 mt-1">
            View and manage customer incident reports
          </p>
        </div>
        <button
          onClick={fetchIncidents}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-luxury-charcoal text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 self-center mr-2">Filter by Status:</span>
            {['all', 'submitted', 'under_review', 'in_progress', 'resolved', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-gold-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
          >
            <option value="">All Types</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Incidents Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading incidents...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">
              {statusFilter !== 'all'
                ? `No incidents with status "${statusFilter.replace('_', ' ')}"`
                : 'No incident reports found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {incidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{incident.id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {incident.customer_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">{incident.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {typeLabels[incident.incident_type] || incident.incident_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityColors[incident.severity] || 'bg-gray-100 text-gray-800'}`}>
                        {incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[incident.status] || 'bg-gray-100 text-gray-800'}`}>
                        {incident.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm text-gray-900 truncate" title={incident.title}>
                        {incident.title}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(incident.incident_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => openDetailModal(incident)}
                        className="text-gold-600 hover:text-gold-700 text-sm font-medium"
                      >
                        View
                      </button>
                      {incident.status === 'submitted' && (
                        <button
                          onClick={() => handleStartReview(incident.id)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results count */}
      {!isLoading && incidents.length > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          Showing {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">
                  Incident Report #{selectedIncident.id}
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Status & Severity */}
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[selectedIncident.status]}`}>
                  {selectedIncident.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${severityColors[selectedIncident.severity]}`}>
                  {selectedIncident.severity.charAt(0).toUpperCase() + selectedIncident.severity.slice(1)} Severity
                </span>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedIncident.title}</h3>
                <p className="text-sm text-gray-500">
                  {typeLabels[selectedIncident.incident_type] || selectedIncident.incident_type} - {formatDate(selectedIncident.incident_date)}
                </p>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500 mb-2">CUSTOMER</h4>
                <p className="text-gray-900 font-medium">{selectedIncident.customer_name || 'Unknown'}</p>
                <p className="text-sm text-gray-500">{selectedIncident.customer_email}</p>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">DESCRIPTION</h4>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedIncident.description}</p>
              </div>

              {/* Location */}
              {selectedIncident.location && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">LOCATION</h4>
                  <p className="text-gray-900">{selectedIncident.location}</p>
                </div>
              )}

              {/* Photos */}
              {selectedIncident.photo_keys && selectedIncident.photo_keys.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">PHOTOS ({selectedIncident.photo_keys.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedIncident.photo_keys.map((key, idx) => (
                      <div key={idx} className="bg-gray-100 px-3 py-2 rounded text-sm text-gray-600">
                        Photo {idx + 1}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedIncident.admin_notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">ADMIN NOTES</h4>
                  <p className="text-gray-900 bg-yellow-50 p-3 rounded-lg">{selectedIncident.admin_notes}</p>
                </div>
              )}

              {/* Resolution Notes */}
              {selectedIncident.resolution_notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">RESOLUTION</h4>
                  <p className="text-gray-900 bg-green-50 p-3 rounded-lg">{selectedIncident.resolution_notes}</p>
                </div>
              )}

              {/* Assigned To */}
              {selectedIncident.assigned_to && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">ASSIGNED TO</h4>
                  <p className="text-gray-900">{selectedIncident.assigned_to}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Reported</p>
                  <p className="text-gray-900">{formatDate(selectedIncident.created_at)}</p>
                </div>
                {selectedIncident.reviewed_at && (
                  <div>
                    <p className="text-gray-500">Reviewed</p>
                    <p className="text-gray-900">{formatDate(selectedIncident.reviewed_at)}</p>
                  </div>
                )}
                {selectedIncident.resolved_at && (
                  <div>
                    <p className="text-gray-500">Resolved</p>
                    <p className="text-gray-900">{formatDate(selectedIncident.resolved_at)}</p>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-500 mb-3">QUICK ACTIONS</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedIncident.status === 'submitted' && (
                    <button
                      onClick={() => handleStartReview(selectedIncident.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Start Review
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setAdminNotes(selectedIncident.admin_notes || '');
                      setShowAddNotesModal(true);
                    }}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                  >
                    Add Notes
                  </button>
                  {selectedIncident.status !== 'resolved' && selectedIncident.status !== 'closed' && (
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full bg-luxury-charcoal text-white py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Notes Modal */}
      {showAddNotesModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-luxury-charcoal">Add Admin Notes</h2>
              <p className="text-sm text-gray-500 mt-1">
                For incident #{selectedIncident.id}
              </p>
            </div>

            <div className="p-6">
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter admin notes..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowAddNotesModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNotes}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-luxury-charcoal">Resolve Incident</h2>
              <p className="text-sm text-gray-500 mt-1">
                Resolving incident #{selectedIncident.id}
              </p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes *
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe how the incident was resolved..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowResolveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolutionNotes.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resolve Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
