'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Vehicle {
  id: number;
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  body_type: string | null;
  license_plate: string | null;
  mileage: number | null;
  weekly_rate: number;
  status: string;
  condition: string;
  current_lease_id: number | null;
  is_active: boolean;
  show_on_fleet_page: boolean;
  created_at: string;
  updated_at: string;
}

interface VehicleFormData {
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string;
  body_type: string;
  license_plate: string;
  mileage: number | string;
  weekly_rate: number;
  security_deposit: number | string;
  status: string;
  condition: string;
  notes: string;
  show_on_fleet_page: boolean;
}

interface ConditionReport {
  id: number;
  vehicle_id: number;
  report_type: string;
  overall_condition: string;
  mileage: number;
  exterior_notes: string | null;
  interior_notes: string | null;
  mechanical_notes: string | null;
  damage_notes: string | null;
  damage_details: Record<string, string> | null;
  photo_keys: string[] | null;
  fuel_level: number | null;
  tire_condition: string | null;
  created_by_id: string;
  created_by_email: string;
  lease_id: number | null;
  incident_report_id: number | null;
  admin_notes: string | null;
  report_date: string;
  created_at: string;
  updated_at: string;
}

interface ConditionReportFormData {
  report_type: string;
  overall_condition: string;
  mileage: number | string;
  exterior_notes: string;
  interior_notes: string;
  mechanical_notes: string;
  damage_notes: string;
  fuel_level: number | string;
  tire_condition: string;
  admin_notes: string;
}

type VehicleStatusFilter = 'all' | 'available' | 'leased' | 'maintenance' | 'unavailable' | 'pending_inspection';

const statusColors: Record<string, { bg: string; text: string }> = {
  available: { bg: 'bg-green-100', text: 'text-green-700' },
  leased: { bg: 'bg-blue-100', text: 'text-blue-700' },
  maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  unavailable: { bg: 'bg-red-100', text: 'text-red-700' },
  pending_inspection: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

const conditionColors: Record<string, { bg: string; text: string }> = {
  excellent: { bg: 'bg-green-100', text: 'text-green-700' },
  good: { bg: 'bg-blue-100', text: 'text-blue-700' },
  fair: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  needs_repair: { bg: 'bg-red-100', text: 'text-red-700' },
};

const initialFormData: VehicleFormData = {
  vin: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  color: '',
  body_type: '',
  license_plate: '',
  mileage: '',
  weekly_rate: 150,
  security_deposit: '',
  status: 'available',
  condition: 'good',
  notes: '',
  show_on_fleet_page: true,
};

const initialConditionReportFormData: ConditionReportFormData = {
  report_type: 'periodic',
  overall_condition: 'good',
  mileage: '',
  exterior_notes: '',
  interior_notes: '',
  mechanical_notes: '',
  damage_notes: '',
  fuel_level: '',
  tire_condition: '',
  admin_notes: '',
};

const reportTypeOptions = [
  { value: 'pre_lease', label: 'Pre-Lease Inspection' },
  { value: 'post_lease', label: 'Post-Lease Return' },
  { value: 'periodic', label: 'Periodic Inspection' },
  { value: 'incident', label: 'Post-Incident' },
  { value: 'maintenance', label: 'Maintenance Check' },
  { value: 'acquisition', label: 'Acquisition Inspection' },
];

const overallConditionOptions = [
  { value: 'excellent', label: 'Excellent', color: 'text-green-600' },
  { value: 'good', label: 'Good', color: 'text-blue-600' },
  { value: 'fair', label: 'Fair', color: 'text-yellow-600' },
  { value: 'poor', label: 'Poor', color: 'text-orange-600' },
  { value: 'needs_repair', label: 'Needs Repair', color: 'text-red-600' },
];

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<VehicleStatusFilter>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConditionReportModal, setShowConditionReportModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Form state
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData);
  const [conditionReportFormData, setConditionReportFormData] = useState<ConditionReportFormData>(initialConditionReportFormData);
  const [submitting, setSubmitting] = useState(false);

  // Condition reports state
  const [conditionReports, setConditionReports] = useState<ConditionReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fx_weekly_lease_token') || '';
    }
    return '';
  };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? 'http://localhost:8100/api/admin/vehicles'
        : `http://localhost:8100/api/admin/vehicles?status_filter=${statusFilter}`;

      const response = await fetch(url, {
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
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter]);

  const fetchConditionReports = async (vehicleId: number) => {
    try {
      setLoadingReports(true);
      const response = await fetch(
        `http://localhost:8100/api/admin/vehicles/${vehicleId}/condition-reports`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch condition reports');
      }

      const data = await response.json();
      setConditionReports(data);
    } catch (err) {
      console.error('Failed to fetch condition reports:', err);
      setConditionReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleConditionReportInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setConditionReportFormData(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    } else {
      setConditionReportFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateConditionReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:8100/api/admin/vehicles/${selectedVehicle.id}/condition-reports`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vehicle_id: selectedVehicle.id,
            ...conditionReportFormData,
            mileage: conditionReportFormData.mileage === '' ? selectedVehicle.mileage || 0 : conditionReportFormData.mileage,
            fuel_level: conditionReportFormData.fuel_level === '' ? null : conditionReportFormData.fuel_level,
            exterior_notes: conditionReportFormData.exterior_notes || null,
            interior_notes: conditionReportFormData.interior_notes || null,
            mechanical_notes: conditionReportFormData.mechanical_notes || null,
            damage_notes: conditionReportFormData.damage_notes || null,
            admin_notes: conditionReportFormData.admin_notes || null,
            tire_condition: conditionReportFormData.tire_condition || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create condition report');
      }

      setShowConditionReportModal(false);
      setConditionReportFormData(initialConditionReportFormData);
      // Refresh the condition reports list
      await fetchConditionReports(selectedVehicle.id);
      // Also refresh vehicles list to update the vehicle condition
      fetchVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create condition report');
    } finally {
      setSubmitting(false);
    }
  };

  const openConditionReportModal = () => {
    if (selectedVehicle) {
      setConditionReportFormData({
        ...initialConditionReportFormData,
        mileage: selectedVehicle.mileage || '',
      });
      setShowConditionReportModal(true);
    }
  };

  const openAddModal = () => {
    setFormData(initialFormData);
    setShowAddModal(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      vin: vehicle.vin,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color || '',
      body_type: vehicle.body_type || '',
      license_plate: vehicle.license_plate || '',
      mileage: vehicle.mileage || '',
      weekly_rate: vehicle.weekly_rate,
      security_deposit: '',
      status: vehicle.status,
      condition: vehicle.condition,
      notes: '',
      show_on_fleet_page: vehicle.show_on_fleet_page,
    });
    setShowEditModal(true);
  };

  const openDetailModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetailModal(true);
    // Fetch condition reports for this vehicle
    fetchConditionReports(vehicle.id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8100/api/admin/vehicles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          mileage: formData.mileage === '' ? null : formData.mileage,
          security_deposit: formData.security_deposit === '' ? null : formData.security_deposit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create vehicle');
      }

      setShowAddModal(false);
      fetchVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8100/api/admin/vehicles/${selectedVehicle.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          make: formData.make,
          model: formData.model,
          year: formData.year,
          color: formData.color || null,
          body_type: formData.body_type || null,
          license_plate: formData.license_plate || null,
          mileage: formData.mileage === '' ? null : formData.mileage,
          weekly_rate: formData.weekly_rate,
          status: formData.status,
          condition: formData.condition,
          notes: formData.notes || null,
          show_on_fleet_page: formData.show_on_fleet_page,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update vehicle');
      }

      setShowEditModal(false);
      setSelectedVehicle(null);
      fetchVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!confirm(`Are you sure you want to delete ${vehicle.year} ${vehicle.make} ${vehicle.model} (VIN: ${vehicle.vin})?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8100/api/admin/vehicles/${vehicle.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete vehicle');
      }

      fetchVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vehicle');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-charcoal">Vehicle Management</h1>
          <p className="text-gray-500 mt-1">Manage fleet vehicles and availability</p>
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
            Add Vehicle
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
          <div className="flex flex-wrap gap-2">
            {(['all', 'available', 'leased', 'maintenance', 'unavailable', 'pending_inspection'] as VehicleStatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  statusFilter === status
                    ? 'bg-gold-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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

      {/* Vehicles Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">VIN</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Rate</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading vehicles...</td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No vehicles found. Click &quot;Add Vehicle&quot; to add your first vehicle.
                  </td>
                </tr>
              ) : (
                vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-luxury-charcoal">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-xs text-gray-500">
                          {vehicle.color && `${vehicle.color} • `}
                          {vehicle.body_type && `${vehicle.body_type}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-600">{vehicle.vin}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[vehicle.status]?.bg || 'bg-gray-100'
                      } ${statusColors[vehicle.status]?.text || 'text-gray-700'}`}>
                        {vehicle.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        conditionColors[vehicle.condition]?.bg || 'bg-gray-100'
                      } ${conditionColors[vehicle.condition]?.text || 'text-gray-700'}`}>
                        {vehicle.condition.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">${vehicle.weekly_rate}/week</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDetailModal(vehicle)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openEditModal(vehicle)}
                          className="text-gold-600 hover:text-gold-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                        {!vehicle.current_lease_id && (
                          <button
                            onClick={() => handleDeleteVehicle(vehicle)}
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

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Add New Vehicle</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIN <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="vin"
                    value={formData.vin}
                    onChange={handleInputChange}
                    required
                    maxLength={17}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 font-mono"
                    placeholder="17-character VIN"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="make"
                    value={formData.make}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., Toyota"
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
                    placeholder="e.g., Camry"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    required
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., Black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body Type</label>
                  <select
                    name="body_type"
                    value={formData.body_type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    <option value="">Select type</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="truck">Truck</option>
                    <option value="coupe">Coupe</option>
                    <option value="van">Van</option>
                    <option value="hatchback">Hatchback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                  <input
                    type="text"
                    name="license_plate"
                    value={formData.license_plate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., ABC-1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                  <input
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., 50000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Rate ($) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="weekly_rate"
                    value={formData.weekly_rate}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
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
                    <option value="maintenance">Maintenance</option>
                    <option value="pending_inspection">Pending Inspection</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                  <select
                    name="condition"
                    value={formData.condition}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="needs_repair">Needs Repair</option>
                  </select>
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

                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="show_on_fleet_page"
                      checked={formData.show_on_fleet_page}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-gold-600 focus:ring-gold-500 rounded"
                    />
                    <span className="text-sm text-gray-700">Show on public fleet page</span>
                  </label>
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
                  {submitting ? 'Creating...' : 'Create Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {showEditModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Edit Vehicle</h2>
                <button onClick={() => { setShowEditModal(false); setSelectedVehicle(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                  <input
                    type="text"
                    value={selectedVehicle.vin}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 font-mono text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">VIN cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                  <input
                    type="text"
                    name="make"
                    value={formData.make}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    required
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
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
                    <option value="leased">Leased</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="pending_inspection">Pending Inspection</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                  <select
                    name="condition"
                    value={formData.condition}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="needs_repair">Needs Repair</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Rate ($)</label>
                  <input
                    type="number"
                    name="weekly_rate"
                    value={formData.weekly_rate}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                  <input
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="show_on_fleet_page"
                      checked={formData.show_on_fleet_page}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-gold-600 focus:ring-gold-500 rounded"
                    />
                    <span className="text-sm text-gray-700">Show on public fleet page</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedVehicle(null); }}
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

      {/* Vehicle Detail Modal */}
      {showDetailModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Vehicle Details</h2>
                <button onClick={() => { setShowDetailModal(false); setSelectedVehicle(null); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-2xl font-bold text-luxury-charcoal">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                </h3>
                <p className="text-sm font-mono text-gray-500">{selectedVehicle.vin}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                  <p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[selectedVehicle.status]?.bg || 'bg-gray-100'
                    } ${statusColors[selectedVehicle.status]?.text || 'text-gray-700'}`}>
                      {selectedVehicle.status.replace('_', ' ')}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Condition</label>
                  <p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      conditionColors[selectedVehicle.condition]?.bg || 'bg-gray-100'
                    } ${conditionColors[selectedVehicle.condition]?.text || 'text-gray-700'}`}>
                      {selectedVehicle.condition.replace('_', ' ')}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Color</label>
                  <p className="text-sm text-gray-900">{selectedVehicle.color || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Body Type</label>
                  <p className="text-sm text-gray-900">{selectedVehicle.body_type || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">License Plate</label>
                  <p className="text-sm text-gray-900">{selectedVehicle.license_plate || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Mileage</label>
                  <p className="text-sm text-gray-900">{selectedVehicle.mileage ? `${selectedVehicle.mileage.toLocaleString()} mi` : 'Not recorded'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Weekly Rate</label>
                  <p className="text-sm font-semibold text-green-600">${selectedVehicle.weekly_rate}/week</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">On Fleet Page</label>
                  <p className="text-sm text-gray-900">{selectedVehicle.show_on_fleet_page ? 'Yes' : 'No'}</p>
                </div>
              </div>

              {selectedVehicle.current_lease_id && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Currently Leased</span> - Lease ID: {selectedVehicle.current_lease_id}
                  </p>
                </div>
              )}

              {/* Condition Reports Section */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Condition Reports</h4>
                  <button
                    onClick={openConditionReportModal}
                    className="px-3 py-1 bg-gold-600 text-white text-xs rounded-md hover:bg-gold-700 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Report
                  </button>
                </div>

                {loadingReports ? (
                  <p className="text-sm text-gray-500 text-center py-2">Loading reports...</p>
                ) : conditionReports.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">No condition reports yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {conditionReports.map((report) => (
                      <div key={report.id} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-600">
                            {reportTypeOptions.find(r => r.value === report.report_type)?.label || report.report_type}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            conditionColors[report.overall_condition]?.bg || 'bg-gray-100'
                          } ${conditionColors[report.overall_condition]?.text || 'text-gray-700'}`}>
                            {report.overall_condition.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">
                            {report.mileage.toLocaleString()} mi
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(report.report_date).toLocaleDateString()}
                          </span>
                        </div>
                        {(report.damage_notes || report.exterior_notes) && (
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {report.damage_notes || report.exterior_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedVehicle(null); setConditionReports([]); }}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  openEditModal(selectedVehicle);
                }}
                className="flex-1 py-2 px-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 font-medium"
              >
                Edit Vehicle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Condition Report Modal */}
      {showConditionReportModal && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-luxury-charcoal">New Condition Report</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                  </p>
                </div>
                <button onClick={() => setShowConditionReportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateConditionReport} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Report Type <span className="text-red-500">*</span></label>
                  <select
                    name="report_type"
                    value={conditionReportFormData.report_type}
                    onChange={handleConditionReportInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    {reportTypeOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overall Condition <span className="text-red-500">*</span></label>
                  <select
                    name="overall_condition"
                    value={conditionReportFormData.overall_condition}
                    onChange={handleConditionReportInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    {overallConditionOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="mileage"
                    value={conditionReportFormData.mileage}
                    onChange={handleConditionReportInputChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="Current mileage"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Level (%)</label>
                  <input
                    type="number"
                    name="fuel_level"
                    value={conditionReportFormData.fuel_level}
                    onChange={handleConditionReportInputChange}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="0-100"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tire Condition</label>
                  <input
                    type="text"
                    name="tire_condition"
                    value={conditionReportFormData.tire_condition}
                    onChange={handleConditionReportInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="e.g., Good tread, front left needs replacement"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exterior Notes</label>
                  <textarea
                    name="exterior_notes"
                    value={conditionReportFormData.exterior_notes}
                    onChange={handleConditionReportInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="Body condition, paint, windows, lights..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interior Notes</label>
                  <textarea
                    name="interior_notes"
                    value={conditionReportFormData.interior_notes}
                    onChange={handleConditionReportInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="Seats, dashboard, electronics, cleanliness..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mechanical Notes</label>
                  <textarea
                    name="mechanical_notes"
                    value={conditionReportFormData.mechanical_notes}
                    onChange={handleConditionReportInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="Engine, brakes, transmission, warning lights..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Damage Notes</label>
                  <textarea
                    name="damage_notes"
                    value={conditionReportFormData.damage_notes}
                    onChange={handleConditionReportInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="Any damage observed (scratches, dents, etc.)..."
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                  <textarea
                    name="admin_notes"
                    value={conditionReportFormData.admin_notes}
                    onChange={handleConditionReportInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    placeholder="Internal notes (not shown to customers)..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowConditionReportModal(false)}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-4 bg-gold-600 text-white rounded-lg hover:bg-gold-700 font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
