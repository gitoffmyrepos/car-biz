'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Tracker {
  id: number;
  device_id: string;
  serial_number: string;
  model: string;
  manufacturer: string | null;
  firmware_version: string | null;
  sim_number: string | null;
  sim_carrier: string | null;
  imei: string | null;
  status: string;
  assigned_vehicle_id: number | null;
  assigned_vehicle_info: string | null;
  assigned_at: string | null;
  last_latitude: string | null;
  last_longitude: string | null;
  last_location_update: string | null;
  last_checkin: string | null;
  provider_name: string | null;
  provider_device_id: string | null;
  purchase_date: string | null;
  purchase_cost: string | null;
  warranty_expiry: string | null;
  notes: string | null;
  admin_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  vin: string;
  status: string;
  current_tracker_id: number | null;
}

interface TrackerFormData {
  device_id: string;
  serial_number: string;
  model: string;
  manufacturer: string;
  firmware_version: string;
  sim_number: string;
  sim_carrier: string;
  imei: string;
  status: string;
  provider_name: string;
  provider_device_id: string;
  purchase_cost: string;
  notes: string;
}

type TrackerStatusFilter = 'all' | 'available' | 'assigned' | 'maintenance' | 'decommissioned' | 'lost';

const statusColors: Record<string, { bg: string; text: string }> = {
  available: { bg: 'bg-green-100', text: 'text-green-700' },
  assigned: { bg: 'bg-blue-100', text: 'text-blue-700' },
  maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  decommissioned: { bg: 'bg-gray-100', text: 'text-gray-700' },
  lost: { bg: 'bg-red-100', text: 'text-red-700' },
};

const initialFormData: TrackerFormData = {
  device_id: '',
  serial_number: '',
  model: '',
  manufacturer: '',
  firmware_version: '',
  sim_number: '',
  sim_carrier: '',
  imei: '',
  status: 'available',
  provider_name: '',
  provider_device_id: '',
  purchase_cost: '',
  notes: '',
};

export default function AdminTrackersPage() {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TrackerStatusFilter>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTracker, setSelectedTracker] = useState<Tracker | null>(null);

  // Form state
  const [formData, setFormData] = useState<TrackerFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // Vehicle assignment state
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fx_weekly_lease_token') || '';
    }
    return '';
  };

  const fetchTrackers = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? 'http://localhost:8100/api/admin/trackers'
        : `http://localhost:8100/api/admin/trackers?status_filter=${statusFilter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trackers');
      }

      const data = await response.json();
      setTrackers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackers();
  }, [statusFilter]);

  const fetchAvailableVehicles = async () => {
    try {
      setLoadingVehicles(true);
      // Fetch all vehicles and filter for ones without trackers
      const response = await fetch('http://localhost:8100/api/admin/vehicles', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }

      const data = await response.json();
      // Filter vehicles that don't have a tracker assigned
      const vehiclesWithoutTracker = data.filter((v: Vehicle) => !v.current_tracker_id);
      setAvailableVehicles(vehiclesWithoutTracker);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicles');
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleAssignTracker = async () => {
    if (!selectedTracker || !selectedVehicleId) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8100/api/admin/trackers/${selectedTracker.id}/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicle_id: selectedVehicleId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to assign tracker');
      }

      setShowAssignModal(false);
      setShowDetailModal(false);
      setSelectedTracker(null);
      setSelectedVehicleId(null);
      fetchTrackers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign tracker');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassignTracker = async (tracker: Tracker) => {
    if (!confirm(`Are you sure you want to unassign tracker ${tracker.device_id} from ${tracker.assigned_vehicle_info}?`)) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8100/api/admin/trackers/${tracker.id}/unassign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to unassign tracker');
      }

      setShowDetailModal(false);
      setSelectedTracker(null);
      fetchTrackers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign tracker');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignModal = async (tracker: Tracker) => {
    setSelectedTracker(tracker);
    setSelectedVehicleId(null);
    await fetchAvailableVehicles();
    setShowAssignModal(true);
  };

  const openAddModal = () => {
    setFormData(initialFormData);
    setShowAddModal(true);
  };

  const openEditModal = (tracker: Tracker) => {
    setSelectedTracker(tracker);
    setFormData({
      device_id: tracker.device_id,
      serial_number: tracker.serial_number,
      model: tracker.model,
      manufacturer: tracker.manufacturer || '',
      firmware_version: tracker.firmware_version || '',
      sim_number: tracker.sim_number || '',
      sim_carrier: tracker.sim_carrier || '',
      imei: tracker.imei || '',
      status: tracker.status,
      provider_name: tracker.provider_name || '',
      provider_device_id: tracker.provider_device_id || '',
      purchase_cost: tracker.purchase_cost || '',
      notes: tracker.notes || '',
    });
    setShowEditModal(true);
  };

  const openDetailModal = (tracker: Tracker) => {
    setSelectedTracker(tracker);
    setShowDetailModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8100/api/admin/trackers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          manufacturer: formData.manufacturer || null,
          firmware_version: formData.firmware_version || null,
          sim_number: formData.sim_number || null,
          sim_carrier: formData.sim_carrier || null,
          imei: formData.imei || null,
          provider_name: formData.provider_name || null,
          provider_device_id: formData.provider_device_id || null,
          purchase_cost: formData.purchase_cost || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create tracker');
      }

      setShowAddModal(false);
      fetchTrackers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tracker');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTracker) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8100/api/admin/trackers/${selectedTracker.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: formData.device_id,
          serial_number: formData.serial_number,
          model: formData.model,
          manufacturer: formData.manufacturer || null,
          firmware_version: formData.firmware_version || null,
          sim_number: formData.sim_number || null,
          sim_carrier: formData.sim_carrier || null,
          imei: formData.imei || null,
          status: formData.status,
          provider_name: formData.provider_name || null,
          provider_device_id: formData.provider_device_id || null,
          purchase_cost: formData.purchase_cost || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update tracker');
      }

      setShowEditModal(false);
      setSelectedTracker(null);
      fetchTrackers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tracker');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTracker = async (tracker: Tracker) => {
    if (!confirm(`Are you sure you want to delete tracker ${tracker.device_id}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8100/api/admin/trackers/${tracker.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete tracker');
      }

      fetchTrackers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tracker');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-charcoal">GPS Tracker Management</h1>
          <p className="text-gray-500 mt-1">Manage GPS tracker devices for fleet tracking</p>
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
            Add Tracker
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
          <div className="flex flex-wrap gap-2">
            {(['all', 'available', 'assigned', 'maintenance', 'decommissioned', 'lost'] as TrackerStatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  statusFilter === status
                    ? 'bg-gold-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
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

      {/* Trackers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Device ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Serial #</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading trackers...</td>
                </tr>
              ) : trackers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No trackers found. Click &quot;Add Tracker&quot; to add your first device.
                  </td>
                </tr>
              ) : (
                trackers.map((tracker) => (
                  <tr key={tracker.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-mono font-medium text-luxury-charcoal">
                          {tracker.device_id}
                        </p>
                        {tracker.provider_name && (
                          <p className="text-xs text-gray-500">
                            Provider: {tracker.provider_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-sm text-gray-900">{tracker.model}</span>
                        {tracker.manufacturer && (
                          <p className="text-xs text-gray-500">{tracker.manufacturer}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-600">{tracker.serial_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[tracker.status]?.bg || 'bg-gray-100'
                      } ${statusColors[tracker.status]?.text || 'text-gray-700'}`}>
                        {tracker.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {tracker.assigned_vehicle_info ? (
                        <span className="text-sm text-gray-900">{tracker.assigned_vehicle_info}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDetailModal(tracker)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openEditModal(tracker)}
                          className="text-gold-600 hover:text-gold-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                        {tracker.status === 'available' && (
                          <button
                            onClick={() => openAssignModal(tracker)}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            Assign
                          </button>
                        )}
                        {tracker.status === 'assigned' && (
                          <button
                            onClick={() => handleUnassignTracker(tracker)}
                            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                          >
                            Unassign
                          </button>
                        )}
                        {tracker.status !== 'assigned' && (
                          <button
                            onClick={() => handleDeleteTracker(tracker)}
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

      {/* Add Tracker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Add New Tracker</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateTracker} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Device ID <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="device_id"
                    value={formData.device_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 font-mono"
                    placeholder="e.g., TRK-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 font-mono"
                    placeholder="e.g., SN123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., GL300W"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., Queclink"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firmware Version</label>
                  <input
                    type="text"
                    name="firmware_version"
                    value={formData.firmware_version}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., v1.2.3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIM Number</label>
                  <input
                    type="text"
                    name="sim_number"
                    value={formData.sim_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="SIM card number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIM Carrier</label>
                  <input
                    type="text"
                    name="sim_carrier"
                    value={formData.sim_carrier}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., AT&T, Verizon"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IMEI</label>
                  <input
                    type="text"
                    name="imei"
                    value={formData.imei}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 font-mono"
                    placeholder="15-digit IMEI"
                    maxLength={15}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost ($)</label>
                  <input
                    type="text"
                    name="purchase_cost"
                    value={formData.purchase_cost}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., 99.99"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name</label>
                  <input
                    type="text"
                    name="provider_name"
                    value={formData.provider_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., Traccar, GPS.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Device ID</label>
                  <input
                    type="text"
                    name="provider_device_id"
                    value={formData.provider_device_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="ID used by tracking provider"
                  />
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
                  {submitting ? 'Creating...' : 'Create Tracker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tracker Modal */}
      {showEditModal && selectedTracker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Edit Tracker</h2>
                <button onClick={() => { setShowEditModal(false); setSelectedTracker(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateTracker} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
                  <input
                    type="text"
                    name="device_id"
                    value={formData.device_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="decommissioned">Decommissioned</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firmware Version</label>
                  <input
                    type="text"
                    name="firmware_version"
                    value={formData.firmware_version}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIM Number</label>
                  <input
                    type="text"
                    name="sim_number"
                    value={formData.sim_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SIM Carrier</label>
                  <input
                    type="text"
                    name="sim_carrier"
                    value={formData.sim_carrier}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedTracker(null); }}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 font-medium disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tracker Detail Modal */}
      {showDetailModal && selectedTracker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Tracker Details</h2>
                <button onClick={() => { setShowDetailModal(false); setSelectedTracker(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-luxury-charcoal font-mono">
                  {selectedTracker.device_id}
                </h3>
                <p className="text-sm text-gray-500">{selectedTracker.model} {selectedTracker.manufacturer && `by ${selectedTracker.manufacturer}`}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[selectedTracker.status]?.bg || 'bg-gray-100'
                    } ${statusColors[selectedTracker.status]?.text || 'text-gray-700'}`}>
                      {selectedTracker.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Serial Number</label>
                  <p className="text-sm font-mono text-gray-900">{selectedTracker.serial_number}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">IMEI</label>
                  <p className="text-sm font-mono text-gray-900">{selectedTracker.imei || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Firmware</label>
                  <p className="text-sm text-gray-900">{selectedTracker.firmware_version || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">SIM Number</label>
                  <p className="text-sm text-gray-900">{selectedTracker.sim_number || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">SIM Carrier</label>
                  <p className="text-sm text-gray-900">{selectedTracker.sim_carrier || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Provider</label>
                  <p className="text-sm text-gray-900">{selectedTracker.provider_name || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Provider ID</label>
                  <p className="text-sm font-mono text-gray-900">{selectedTracker.provider_device_id || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Purchase Cost</label>
                  <p className="text-sm text-gray-900">{selectedTracker.purchase_cost ? `$${selectedTracker.purchase_cost}` : 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Last Checkin</label>
                  <p className="text-sm text-gray-900">
                    {selectedTracker.last_checkin ? new Date(selectedTracker.last_checkin).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>

              {selectedTracker.assigned_vehicle_info && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Currently Assigned to:</span> {selectedTracker.assigned_vehicle_info}
                  </p>
                </div>
              )}

              {(selectedTracker.last_latitude && selectedTracker.last_longitude) && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Last Known Location:</span> {selectedTracker.last_latitude}, {selectedTracker.last_longitude}
                    {selectedTracker.last_location_update && (
                      <span className="text-xs text-green-600 block mt-1">
                        Updated: {new Date(selectedTracker.last_location_update).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {selectedTracker.notes && (
                <div className="mt-4">
                  <label className="text-xs font-medium text-gray-500 uppercase">Notes</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedTracker.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-3">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedTracker(null); }}
                className="flex-1 min-w-[100px] py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Close
              </button>
              {selectedTracker.status === 'available' && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openAssignModal(selectedTracker);
                  }}
                  className="flex-1 min-w-[100px] py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Assign to Vehicle
                </button>
              )}
              {selectedTracker.status === 'assigned' && (
                <button
                  onClick={() => handleUnassignTracker(selectedTracker)}
                  disabled={submitting}
                  className="flex-1 min-w-[100px] py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50"
                >
                  {submitting ? 'Unassigning...' : 'Unassign'}
                </button>
              )}
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openEditModal(selectedTracker);
                }}
                className="flex-1 min-w-[100px] py-2 px-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 font-medium"
              >
                Edit Tracker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Tracker Modal */}
      {showAssignModal && selectedTracker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Assign Tracker to Vehicle</h2>
                <button onClick={() => { setShowAssignModal(false); setSelectedTracker(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500">Assigning tracker</p>
                <h3 className="text-lg font-bold text-luxury-charcoal font-mono">{selectedTracker.device_id}</h3>
                <p className="text-sm text-gray-500">{selectedTracker.model}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Vehicle</label>
                {loadingVehicles ? (
                  <div className="text-center py-4 text-gray-500">Loading vehicles...</div>
                ) : availableVehicles.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>No vehicles available for assignment.</p>
                    <p className="text-xs mt-1">All vehicles may already have trackers assigned.</p>
                  </div>
                ) : (
                  <select
                    value={selectedVehicleId || ''}
                    onChange={(e) => setSelectedVehicleId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    <option value="">Select a vehicle...</option>
                    {availableVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.vin.slice(-6)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedVehicleId && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Ready to assign:</span> This will link tracker{' '}
                    <span className="font-mono">{selectedTracker.device_id}</span> to the selected vehicle.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={() => { setShowAssignModal(false); setSelectedTracker(null); }}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTracker}
                disabled={!selectedVehicleId || submitting}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Assigning...' : 'Assign Tracker'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
