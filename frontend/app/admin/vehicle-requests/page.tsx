'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';
import Link from 'next/link';

interface VehicleRequest {
  id: number;
  customer_profile_id: number;
  customer_email: string;
  customer_name: string | null;
  status: string;
  vehicle_preference: string | null;
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

interface Vehicle {
  id: number;
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  body_type: string | null;
  license_plate: string | null;
  weekly_rate: number;
  security_deposit: number | null;
  status: string;
  condition: string;
  mileage: number | null;
}

type StatusFilter = 'all' | 'pending' | 'reviewing' | 'approved' | 'assigned' | 'rejected' | 'cancelled';

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  reviewing: { bg: 'bg-blue-100', text: 'text-blue-700' },
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  assigned: { bg: 'bg-purple-100', text: 'text-purple-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export default function AdminVehicleRequestsPage() {
  const [requests, setRequests] = useState<VehicleRequest[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VehicleRequest | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [weeklyPayment, setWeeklyPayment] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);

  // Status update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gigwheels_token') || '';
    }
    return '';
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? apiUrl('/admin/vehicle-requests')
        : apiUrl(`/admin/vehicle-requests?status_filter=${statusFilter}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vehicle requests');
      }

      const data = await response.json();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableVehicles = async () => {
    try {
      const response = await fetch(apiUrl('/admin/available-vehicles'), {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available vehicles');
      }

      const data = await response.json();
      setAvailableVehicles(data);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const openAssignModal = async (request: VehicleRequest) => {
    setSelectedRequest(request);
    setSelectedVehicleId(null);
    setWeeklyPayment('');
    setSecurityDeposit('');
    setStartDate(request.preferred_start_date ? request.preferred_start_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setAssignmentNotes('');
    setAssignmentSuccess(null);
    setError(null);

    await fetchAvailableVehicles();
    setShowAssignModal(true);
  };

  const handleVehicleSelect = (vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
    const vehicle = availableVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setWeeklyPayment(vehicle.weekly_rate.toString());
      setSecurityDeposit(vehicle.security_deposit?.toString() || '');
    }
  };

  const submitAssignment = async () => {
    if (!selectedRequest || !selectedVehicleId || !weeklyPayment || !startDate) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(apiUrl('/admin/assign-vehicle'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_id: selectedVehicleId,
          customer_profile_id: selectedRequest.customer_profile_id,
          vehicle_request_id: selectedRequest.id,
          weekly_payment: parseFloat(weeklyPayment),
          security_deposit: securityDeposit ? parseFloat(securityDeposit) : null,
          start_date: new Date(startDate).toISOString(),
          notes: assignmentNotes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Assignment failed');
      }

      const result = await response.json();
      setAssignmentSuccess(`Vehicle ${result.vehicle_info} successfully assigned! Lease ID: ${result.lease_id}`);

      // Refresh the list after a short delay
      setTimeout(() => {
        setShowAssignModal(false);
        fetchRequests();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusModal = (request: VehicleRequest) => {
    setSelectedRequest(request);
    setNewStatus('');
    setStatusNotes('');
    setError(null);
    setShowStatusModal(true);
  };

  const submitStatusUpdate = async () => {
    if (!selectedRequest || !newStatus) {
      setError('Please select a status');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const url = apiUrl(`/admin/vehicle-requests/${selectedRequest.id}/status?new_status=${newStatus}${statusNotes ? `&notes=${encodeURIComponent(statusNotes)}` : ''}`);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Status update failed');
      }

      setShowStatusModal(false);
      fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedRequest(null);
    setError(null);
    setAssignmentSuccess(null);
  };

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setSelectedRequest(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-charcoal">Vehicle Requests</h1>
          <p className="text-gray-500 mt-1">Manage customer vehicle requests and assignments</p>
        </div>
        <Link href="/admin" className="text-sm text-gold-600 hover:text-gold-700 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'reviewing', 'approved', 'assigned', 'rejected', 'cancelled'] as StatusFilter[]).map((status) => (
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
      {error && !showAssignModal && !showStatusModal && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-sm text-red-600 hover:text-red-800 mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preference
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading vehicle requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No vehicle requests found
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-luxury-charcoal">#{request.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-luxury-charcoal">
                          {request.customer_name || 'Name not set'}
                        </p>
                        <p className="text-xs text-gray-500">{request.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {request.vehicle_preference?.replace('_', ' ') || 'Any'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[request.status]?.bg || 'bg-gray-100'
                      } ${statusColors[request.status]?.text || 'text-gray-700'}`}>
                        {request.status}
                      </span>
                      {request.assigned_vehicle_info && (
                        <p className="text-xs text-purple-600 mt-1">{request.assigned_vehicle_info}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {(request.status === 'pending' || request.status === 'reviewing' || request.status === 'approved') && (
                          <button
                            onClick={() => openAssignModal(request)}
                            className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium"
                          >
                            Assign Vehicle
                          </button>
                        )}
                        {request.status !== 'assigned' && request.status !== 'cancelled' && (
                          <button
                            onClick={() => openStatusModal(request)}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs font-medium"
                          >
                            Update Status
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

      {/* Assignment Modal */}
      {showAssignModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-luxury-charcoal">Assign Vehicle</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Assign a vehicle to {selectedRequest.customer_name || selectedRequest.customer_email}
                  </p>
                </div>
                <button onClick={closeAssignModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Success Message */}
              {assignmentSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-green-700 font-medium">{assignmentSuccess}</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {!assignmentSuccess && (
                <>
                  {/* Request Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Request Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Preference:</span>
                        <span className="ml-2 text-gray-900">{selectedRequest.vehicle_preference?.replace('_', ' ') || 'Any'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Preferred Start:</span>
                        <span className="ml-2 text-gray-900">
                          {selectedRequest.preferred_start_date
                            ? new Date(selectedRequest.preferred_start_date).toLocaleDateString()
                            : 'Not specified'}
                        </span>
                      </div>
                      {selectedRequest.notes && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Notes:</span>
                          <span className="ml-2 text-gray-900">{selectedRequest.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Vehicle <span className="text-red-500">*</span>
                    </label>
                    {availableVehicles.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-700">No available vehicles at this time.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 max-h-60 overflow-y-auto">
                        {availableVehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            onClick={() => handleVehicleSelect(vehicle.id)}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedVehicleId === vehicle.id
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {vehicle.color || 'Color N/A'} | {vehicle.body_type || 'Type N/A'} | {vehicle.mileage?.toLocaleString() || 'N/A'} miles
                                </p>
                                <p className="text-xs text-gray-400 mt-1">VIN: {vehicle.vin}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gold-600">${vehicle.weekly_rate}/week</p>
                                <p className="text-xs text-gray-500">
                                  Deposit: ${vehicle.security_deposit || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lease Terms */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weekly Payment <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={weeklyPayment}
                          onChange={(e) => setWeeklyPayment(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Security Deposit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={securityDeposit}
                          onChange={(e) => setSecurityDeposit(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={assignmentNotes}
                      onChange={(e) => setAssignmentNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Add any notes about this lease..."
                    />
                  </div>
                </>
              )}
            </div>

            {!assignmentSuccess && (
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex space-x-3">
                <button
                  onClick={closeAssignModal}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAssignment}
                  disabled={submitting || !selectedVehicleId || !weeklyPayment || !startDate}
                  className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Assigning...' : 'Assign Vehicle'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Update Status</h2>
                <button onClick={closeStatusModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Status
                </label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  statusColors[selectedRequest.status]?.bg || 'bg-gray-100'
                } ${statusColors[selectedRequest.status]?.text || 'text-gray-700'}`}>
                  {selectedRequest.status}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                >
                  <option value="">Select status...</option>
                  <option value="pending">Pending</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  To set status to &apos;assigned&apos;, use the Assign Vehicle button
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes {newStatus === 'rejected' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  placeholder={newStatus === 'rejected' ? 'Rejection reason...' : 'Add notes...'}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex space-x-3">
              <button
                onClick={closeStatusModal}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitStatusUpdate}
                disabled={submitting || !newStatus}
                className="flex-1 py-2 px-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 disabled:opacity-50 font-medium"
              >
                {submitting ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
