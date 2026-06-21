'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import Link from 'next/link';

interface MaintenanceSchedule {
  id: number;
  vehicle_id: number;
  vehicle_info: string;
  maintenance_type: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  estimated_duration_hours: number | null;
  status: string;
  priority: string;
  service_provider: string | null;
  service_location: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  completed_at: string | null;
  completed_by: string | null;
  completion_notes: string | null;
  completion_mileage: number | null;
  created_by: string;
  created_at: string;
  is_recurring: boolean;
  requires_vehicle_offline: boolean;
  notes: string | null;
}

interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  vin: string;
  status: string;
}

interface MaintenanceTypes {
  types: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
  priorities: { value: string; label: string }[];
}

interface MaintenanceFormData {
  vehicle_id: number | null;
  maintenance_type: string;
  title: string;
  description: string;
  scheduled_date: string;
  estimated_duration_hours: string;
  priority: string;
  service_provider: string;
  service_location: string;
  estimated_cost: string;
  is_recurring: boolean;
  recurrence_interval_days: string;
  requires_vehicle_offline: boolean;
  notes: string;
}

type StatusFilter = 'all' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';

const statusColors: Record<string, { bg: string; text: string }> = {
  scheduled: { bg: 'bg-blue-100', text: 'text-blue-700' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700' },
};

const priorityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: 'bg-gray-100', text: 'text-gray-700' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  urgent: { bg: 'bg-red-100', text: 'text-red-700' },
};

const initialFormData: MaintenanceFormData = {
  vehicle_id: null,
  maintenance_type: 'oil_change',
  title: '',
  description: '',
  scheduled_date: '',
  estimated_duration_hours: '',
  priority: 'medium',
  service_provider: '',
  service_location: '',
  estimated_cost: '',
  is_recurring: false,
  recurrence_interval_days: '',
  requires_vehicle_offline: true,
  notes: '',
};

export default function AdminMaintenancePage() {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceTypes | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);

  // Form state
  const [formData, setFormData] = useState<MaintenanceFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // Vehicles for selection
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Complete form state
  const [completeForm, setCompleteForm] = useState({
    actual_cost: '',
    completion_mileage: '',
    completion_notes: '',
  });

  // Cancel form state
  const [cancelReason, setCancelReason] = useState('');

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fx_weekly_lease_token') || '';
    }
    return '';
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? apiUrl('/admin/maintenance')
        : apiUrl(`/admin/maintenance?status=${statusFilter}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch maintenance schedules');
      }

      const data = await response.json();
      setSchedules(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceTypes = async () => {
    try {
      const response = await fetch(apiUrl('/admin/maintenance/types'), {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch maintenance types');
      }

      const data = await response.json();
      setMaintenanceTypes(data);
    } catch (err) {
      console.error('Failed to fetch maintenance types:', err);
    }
  };

  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await fetch(apiUrl('/admin/vehicles'), {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }

      const data = await response.json();
      setVehicles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicles');
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchMaintenanceTypes();
  }, [statusFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const openAddModal = async () => {
    setFormData(initialFormData);
    await fetchVehicles();
    setShowAddModal(true);
  };

  const openDetailModal = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setShowDetailModal(true);
  };

  const openCompleteModal = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setCompleteForm({
      actual_cost: schedule.estimated_cost?.toString() || '',
      completion_mileage: '',
      completion_notes: '',
    });
    setShowCompleteModal(true);
  };

  const openCancelModal = (schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl('/admin/maintenance'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_id: formData.vehicle_id,
          maintenance_type: formData.maintenance_type,
          title: formData.title,
          description: formData.description || null,
          scheduled_date: formData.scheduled_date,
          estimated_duration_hours: formData.estimated_duration_hours ? parseFloat(formData.estimated_duration_hours) : null,
          priority: formData.priority,
          service_provider: formData.service_provider || null,
          service_location: formData.service_location || null,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          is_recurring: formData.is_recurring,
          recurrence_interval_days: formData.recurrence_interval_days ? parseInt(formData.recurrence_interval_days) : null,
          requires_vehicle_offline: formData.requires_vehicle_offline,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = typeof errorData.detail === 'string'
          ? errorData.detail
          : (Array.isArray(errorData.detail)
            ? errorData.detail.map((e: { msg?: string }) => e.msg || 'Validation error').join(', ')
            : 'Failed to create maintenance schedule');
        throw new Error(errorMsg);
      }

      setShowAddModal(false);
      fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create maintenance schedule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartMaintenance = async (schedule: MaintenanceSchedule) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/admin/maintenance/${schedule.id}/start`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to start maintenance');
      }

      setShowDetailModal(false);
      setSelectedSchedule(null);
      fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/admin/maintenance/${selectedSchedule.id}/complete`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actual_cost: completeForm.actual_cost ? parseFloat(completeForm.actual_cost) : null,
          mileage_at_service: completeForm.completion_mileage ? parseInt(completeForm.completion_mileage) : null,
          completion_notes: completeForm.completion_notes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to complete maintenance');
      }

      setShowCompleteModal(false);
      setShowDetailModal(false);
      setSelectedSchedule(null);
      fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/admin/maintenance/${selectedSchedule.id}/cancel`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancelReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to cancel maintenance');
      }

      setShowCancelModal(false);
      setShowDetailModal(false);
      setSelectedSchedule(null);
      fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (schedule: MaintenanceSchedule) => {
    if (!confirm(`Are you sure you want to delete this maintenance schedule for "${schedule.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(apiUrl(`/admin/maintenance/${schedule.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete maintenance schedule');
      }

      fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete maintenance schedule');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMaintenanceType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-charcoal">Vehicle Maintenance</h1>
          <p className="text-gray-500 mt-1">Schedule and track vehicle maintenance</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="text-sm text-gold-600 hover:text-gold-700 font-medium py-2">
            &larr; Back to Dashboard
          </Link>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 font-medium text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Schedule Maintenance
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
          <div className="flex flex-wrap gap-2">
            {(['all', 'scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  statusFilter === status
                    ? 'bg-gold-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-sm text-red-600 hover:text-red-800 mt-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Maintenance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Maintenance</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Cost</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading maintenance schedules...</td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No maintenance schedules found. Click &quot;Schedule Maintenance&quot; to create one.
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-luxury-charcoal">
                          {schedule.vehicle_info || `Vehicle #${schedule.vehicle_id}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{schedule.title}</p>
                        <p className="text-xs text-gray-500">{formatMaintenanceType(schedule.maintenance_type)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{formatDate(schedule.scheduled_date)}</span>
                      {schedule.estimated_duration_hours && (
                        <p className="text-xs text-gray-500">{schedule.estimated_duration_hours}h estimated</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[schedule.status]?.bg || 'bg-gray-100'
                      } ${statusColors[schedule.status]?.text || 'text-gray-700'}`}>
                        {schedule.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        priorityColors[schedule.priority]?.bg || 'bg-gray-100'
                      } ${priorityColors[schedule.priority]?.text || 'text-gray-700'}`}>
                        {schedule.priority.charAt(0).toUpperCase() + schedule.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {schedule.estimated_cost ? `$${schedule.estimated_cost.toFixed(2)}` : '-'}
                      </span>
                      {schedule.actual_cost && (
                        <p className="text-xs text-green-600">Actual: ${schedule.actual_cost.toFixed(2)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDetailModal(schedule)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View
                        </button>
                        {schedule.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleStartMaintenance(schedule)}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                              Start
                            </button>
                            <button
                              onClick={() => openCancelModal(schedule)}
                              className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {schedule.status === 'in_progress' && (
                          <button
                            onClick={() => openCompleteModal(schedule)}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            Complete
                          </button>
                        )}
                        {(schedule.status === 'cancelled' || schedule.status === 'completed') && (
                          <button
                            onClick={() => handleDeleteSchedule(schedule)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Maintenance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Schedule Maintenance</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle <span className="text-red-500">*</span></label>
                  {loadingVehicles ? (
                    <div className="text-center py-2 text-gray-500">Loading vehicles...</div>
                  ) : (
                    <select
                      name="vehicle_id"
                      value={formData.vehicle_id || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehicle_id: e.target.value ? Number(e.target.value) : null }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    >
                      <option value="">Select a vehicle...</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.vin.slice(-6)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type <span className="text-red-500">*</span></label>
                  <select
                    name="maintenance_type"
                    value={formData.maintenance_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    {maintenanceTypes?.types.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority <span className="text-red-500">*</span></label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    {maintenanceTypes?.priorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>{priority.label}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., Scheduled Oil Change"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="Additional details about the maintenance..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    name="scheduled_date"
                    value={formData.scheduled_date}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (hours)</label>
                  <input
                    type="number"
                    name="estimated_duration_hours"
                    value={formData.estimated_duration_hours}
                    onChange={handleInputChange}
                    step="0.5"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Provider</label>
                  <input
                    type="text"
                    name="service_provider"
                    value={formData.service_provider}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., QuickLube Auto Service"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Location</label>
                  <input
                    type="text"
                    name="service_location"
                    value={formData.service_location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., 123 Main St, Anytown"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost ($)</label>
                  <input
                    type="number"
                    name="estimated_cost"
                    value={formData.estimated_cost}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., 75.00"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="requires_vehicle_offline"
                      checked={formData.requires_vehicle_offline}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Requires Vehicle Offline</span>
                  </label>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 font-medium disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Maintenance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Maintenance Details</h2>
                <button onClick={() => { setShowDetailModal(false); setSelectedSchedule(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-luxury-charcoal">{selectedSchedule.title}</h3>
                <p className="text-sm text-gray-500">{formatMaintenanceType(selectedSchedule.maintenance_type)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Vehicle</label>
                  <p className="text-sm text-gray-900">{selectedSchedule.vehicle_info || `Vehicle #${selectedSchedule.vehicle_id}`}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[selectedSchedule.status]?.bg || 'bg-gray-100'
                    } ${statusColors[selectedSchedule.status]?.text || 'text-gray-700'}`}>
                      {selectedSchedule.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Priority</label>
                  <p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      priorityColors[selectedSchedule.priority]?.bg || 'bg-gray-100'
                    } ${priorityColors[selectedSchedule.priority]?.text || 'text-gray-700'}`}>
                      {selectedSchedule.priority.charAt(0).toUpperCase() + selectedSchedule.priority.slice(1)}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Scheduled Date</label>
                  <p className="text-sm text-gray-900">{formatDateTime(selectedSchedule.scheduled_date)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Est. Duration</label>
                  <p className="text-sm text-gray-900">{selectedSchedule.estimated_duration_hours ? `${selectedSchedule.estimated_duration_hours} hours` : 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Est. Cost</label>
                  <p className="text-sm text-gray-900">{selectedSchedule.estimated_cost ? `$${selectedSchedule.estimated_cost.toFixed(2)}` : 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Service Provider</label>
                  <p className="text-sm text-gray-900">{selectedSchedule.service_provider || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Service Location</label>
                  <p className="text-sm text-gray-900">{selectedSchedule.service_location || 'Not specified'}</p>
                </div>
              </div>

              {selectedSchedule.description && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedSchedule.description}</p>
                </div>
              )}

              {selectedSchedule.notes && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-gray-500 uppercase">Notes</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedSchedule.notes}</p>
                </div>
              )}

              {selectedSchedule.status === 'completed' && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Completion Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-green-600">Completed At:</span>
                      <span className="text-green-800 ml-1">{selectedSchedule.completed_at ? formatDateTime(selectedSchedule.completed_at) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-green-600">Completed By:</span>
                      <span className="text-green-800 ml-1">{selectedSchedule.completed_by || '-'}</span>
                    </div>
                    <div>
                      <span className="text-green-600">Actual Cost:</span>
                      <span className="text-green-800 ml-1">{selectedSchedule.actual_cost ? `$${selectedSchedule.actual_cost.toFixed(2)}` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-green-600">Mileage:</span>
                      <span className="text-green-800 ml-1">{selectedSchedule.completion_mileage || '-'}</span>
                    </div>
                  </div>
                  {selectedSchedule.completion_notes && (
                    <div className="mt-2">
                      <span className="text-green-600">Notes:</span>
                      <p className="text-green-800 mt-1">{selectedSchedule.completion_notes}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Created by {selectedSchedule.created_by} on {formatDateTime(selectedSchedule.created_at)}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedSchedule(null); }}
                className="flex-1 min-w-[100px] py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Close
              </button>
              {selectedSchedule.status === 'scheduled' && (
                <>
                  <button
                    onClick={() => handleStartMaintenance(selectedSchedule)}
                    disabled={submitting}
                    className="flex-1 min-w-[100px] py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Starting...' : 'Start Maintenance'}
                  </button>
                  <button
                    onClick={() => openCancelModal(selectedSchedule)}
                    className="flex-1 min-w-[100px] py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                  >
                    Cancel
                  </button>
                </>
              )}
              {selectedSchedule.status === 'in_progress' && (
                <button
                  onClick={() => openCompleteModal(selectedSchedule)}
                  className="flex-1 min-w-[100px] py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Mark Complete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Complete Maintenance</h2>
                <button onClick={() => setShowCompleteModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCompleteMaintenance} className="p-6 space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500">Completing maintenance for</p>
                <h3 className="text-lg font-bold text-luxury-charcoal">{selectedSchedule.title}</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cost ($)</label>
                <input
                  type="number"
                  value={completeForm.actual_cost}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, actual_cost: e.target.value }))}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="Enter actual cost"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Mileage</label>
                <input
                  type="number"
                  value={completeForm.completion_mileage}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, completion_mileage: e.target.value }))}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="Enter vehicle mileage at completion"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Notes</label>
                <textarea
                  value={completeForm.completion_notes}
                  onChange={(e) => setCompleteForm(prev => ({ ...prev, completion_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="Any notes about the completed maintenance..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  {submitting ? 'Completing...' : 'Mark Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Cancel Maintenance</h2>
                <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCancelMaintenance} className="p-6 space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500">Cancel maintenance for</p>
                <h3 className="text-lg font-bold text-luxury-charcoal">{selectedSchedule.title}</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Reason <span className="text-red-500">*</span></label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  placeholder="Please provide a reason for cancellation..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !cancelReason.trim()}
                  className="flex-1 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50"
                >
                  {submitting ? 'Cancelling...' : 'Confirm Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
