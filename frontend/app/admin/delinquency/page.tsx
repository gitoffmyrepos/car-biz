'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiUrl } from '@/lib/api';
import Link from 'next/link';

interface RecoveryWorkflowStatus {
  recovery_workflow_enabled: boolean;
  message: string;
  setting_exists: boolean;
  updated_at?: string;
  updated_by?: string;
}

interface DelinquencyCase {
  id: number;
  case_number: string;
  customer_profile_id: number;
  customer_name: string;
  customer_email: string | null;
  invoice_id: number;
  lease_id: number;
  vehicle_id: number | null;
  vehicle_info: string | null;
  status: string;
  escalation_level: string;
  amount_owed: number;
  late_fees_accumulated: number;
  total_owed: number;
  amount_paid: number;
  remaining_balance: number;
  days_delinquent: number;
  delinquent_since: string;
  contact_attempts: number;
  last_contact_at: string | null;
  recovery_authorized: boolean;
  tow_scheduled: boolean;
  is_priority: boolean;
  assigned_to: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RecoveryAction {
  id: number;
  delinquency_case_id: number;
  customer_profile_id: number;
  lease_id: number;
  vehicle_id: number | null;
  action_number: string;
  status: string;
  authorized_by: string;
  authorization_reason: string;
  contract_version: string;
  authorization_notes: string | null;
  tow_vendor_name: string | null;
  tow_vendor_phone: string | null;
  tow_vendor_email: string | null;
  tow_vendor_reference: string | null;
  tow_vendor_address: string | null;
  tow_vendor_notes: string | null;
  tow_scheduled_at: string | null;
  tow_pickup_location: string | null;
  tow_destination: string | null;
  estimated_tow_cost: number | null;
  actual_tow_cost: number | null;
  vehicle_recovered_at: string | null;
  recovery_completed_by: string | null;
  vehicle_condition_notes: string | null;
  mileage_at_recovery: number | null;
  failure_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  customer_notified: boolean;
  customer_notified_at: string | null;
  lease_terminated: boolean;
  lease_terminated_at: string | null;
  customer_banned: boolean;
  ban_record_id: number | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface DelinquencyTypes {
  statuses: { value: string; label: string }[];
  escalation_levels: { value: string; label: string }[];
}

type StatusFilter = 'all' | 'open' | 'escalated' | 'payment_plan' | 'recovery_pending' | 'vehicle_recovered' | 'resolved' | 'closed';

const statusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  escalated: { bg: 'bg-orange-100', text: 'text-orange-700' },
  payment_plan: { bg: 'bg-blue-100', text: 'text-blue-700' },
  recovery_pending: { bg: 'bg-red-100', text: 'text-red-700' },
  vehicle_recovered: { bg: 'bg-purple-100', text: 'text-purple-700' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

const escalationColors: Record<string, { bg: string; text: string }> = {
  level_1: { bg: 'bg-blue-100', text: 'text-blue-700' },
  level_2: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  level_3: { bg: 'bg-orange-100', text: 'text-orange-700' },
  level_4: { bg: 'bg-red-100', text: 'text-red-700' },
  level_5: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export default function AdminDelinquencyPage() {
  const [cases, setCases] = useState<DelinquencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [delinquencyTypes, setDelinquencyTypes] = useState<DelinquencyTypes | null>(null);
  const [recoveryWorkflowStatus, setRecoveryWorkflowStatus] = useState<RecoveryWorkflowStatus | null>(null);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showTowVendorModal, setShowTowVendorModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<DelinquencyCase | null>(null);
  const [selectedRecoveryAction, setSelectedRecoveryAction] = useState<RecoveryAction | null>(null);

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [contactMethod, setContactMethod] = useState('phone');
  const [contactNotes, setContactNotes] = useState('');
  const [resolutionType, setResolutionType] = useState('paid');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Compliance gate form state
  const [complianceConfirmed, setComplianceConfirmed] = useState(false);
  const [recoveryReason, setRecoveryReason] = useState('');
  const [contractVersion, setContractVersion] = useState('');
  const [recoveryNotes, setRecoveryNotes] = useState('');

  // Tow vendor form state
  const [towVendorName, setTowVendorName] = useState('');
  const [towVendorPhone, setTowVendorPhone] = useState('');
  const [towVendorEmail, setTowVendorEmail] = useState('');
  const [towVendorReference, setTowVendorReference] = useState('');
  const [towVendorAddress, setTowVendorAddress] = useState('');
  const [towVendorNotes, setTowVendorNotes] = useState('');
  const [towScheduledAt, setTowScheduledAt] = useState('');
  const [towPickupLocation, setTowPickupLocation] = useState('');
  const [towDestination, setTowDestination] = useState('');
  const [estimatedTowCost, setEstimatedTowCost] = useState('');

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fx_weekly_lease_token') || '';
    }
    return '';
  };

  const fetchCases = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? apiUrl('/admin/delinquency')
        : apiUrl(`/admin/delinquency?status=${statusFilter}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch delinquency cases');
      }

      const data = await response.json();
      setCases(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchDelinquencyTypes = async () => {
    try {
      const response = await fetch(apiUrl('/admin/delinquency/types'), {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch delinquency types');
      }

      const data = await response.json();
      setDelinquencyTypes(data);
    } catch (err) {
      console.error('Failed to fetch delinquency types:', err);
    }
  };

  const fetchRecoveryWorkflowStatus = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/admin/settings/recovery-workflow-status'), {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        // Default to enabled if we can't fetch the setting
        setRecoveryWorkflowStatus({
          recovery_workflow_enabled: true,
          message: 'Recovery workflow status unavailable',
          setting_exists: false,
        });
        return;
      }

      const data = await response.json();
      setRecoveryWorkflowStatus(data);
    } catch (err) {
      console.error('Failed to fetch recovery workflow status:', err);
      // Default to enabled on error
      setRecoveryWorkflowStatus({
        recovery_workflow_enabled: true,
        message: 'Recovery workflow status unavailable',
        setting_exists: false,
      });
    }
  }, []);

  useEffect(() => {
    fetchCases();
    fetchDelinquencyTypes();
    fetchRecoveryWorkflowStatus();
  }, [statusFilter, fetchRecoveryWorkflowStatus]);

  const openDetailModal = (delinquencyCase: DelinquencyCase) => {
    setSelectedCase(delinquencyCase);
    setShowDetailModal(true);
  };

  const openContactModal = (delinquencyCase: DelinquencyCase) => {
    setSelectedCase(delinquencyCase);
    setContactMethod('phone');
    setContactNotes('');
    setShowContactModal(true);
  };

  const openResolveModal = (delinquencyCase: DelinquencyCase) => {
    setSelectedCase(delinquencyCase);
    setResolutionType('paid');
    setResolutionNotes('');
    setShowResolveModal(true);
  };

  const handleRecordContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/admin/delinquency/${selectedCase.id}/contact`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: contactMethod,
          notes: contactNotes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to record contact');
      }

      setShowContactModal(false);
      setShowDetailModal(false);
      setSelectedCase(null);
      fetchCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record contact');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (delinquencyCase: DelinquencyCase, level: string) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/admin/delinquency/${delinquencyCase.id}/escalate?level=${level}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to escalate case');
      }

      setShowDetailModal(false);
      setSelectedCase(null);
      fetchCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to escalate case');
    } finally {
      setSubmitting(false);
    }
  };

  const openRecoveryModal = (delinquencyCase: DelinquencyCase) => {
    setSelectedCase(delinquencyCase);
    setComplianceConfirmed(false);
    setRecoveryReason('');
    setContractVersion('');
    setRecoveryNotes('');
    setShowRecoveryModal(true);
  };

  const fetchRecoveryActionForCase = async (caseId: number): Promise<RecoveryAction | null> => {
    try {
      const response = await fetch(apiUrl(`/admin/recovery-actions?case_id=${caseId}`), {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      if (!response.ok) return null;
      const data = await response.json();
      // Return the first (and should be only) recovery action for this case
      return data.items && data.items.length > 0 ? data.items[0] : null;
    } catch {
      return null;
    }
  };

  const openTowVendorModal = async (delinquencyCase: DelinquencyCase) => {
    setSelectedCase(delinquencyCase);
    setError(null);

    // Fetch existing recovery action for this case
    const recoveryAction = await fetchRecoveryActionForCase(delinquencyCase.id);
    if (recoveryAction) {
      setSelectedRecoveryAction(recoveryAction);
      // Pre-fill form with existing data
      setTowVendorName(recoveryAction.tow_vendor_name || '');
      setTowVendorPhone(recoveryAction.tow_vendor_phone || '');
      setTowVendorEmail(recoveryAction.tow_vendor_email || '');
      setTowVendorReference(recoveryAction.tow_vendor_reference || '');
      setTowVendorAddress(recoveryAction.tow_vendor_address || '');
      setTowVendorNotes(recoveryAction.tow_vendor_notes || '');
      setTowScheduledAt(recoveryAction.tow_scheduled_at ? recoveryAction.tow_scheduled_at.slice(0, 16) : '');
      setTowPickupLocation(recoveryAction.tow_pickup_location || '');
      setTowDestination(recoveryAction.tow_destination || '');
      setEstimatedTowCost(recoveryAction.estimated_tow_cost ? String(recoveryAction.estimated_tow_cost) : '');
    } else {
      // Reset form
      setSelectedRecoveryAction(null);
      setTowVendorName('');
      setTowVendorPhone('');
      setTowVendorEmail('');
      setTowVendorReference('');
      setTowVendorAddress('');
      setTowVendorNotes('');
      setTowScheduledAt('');
      setTowPickupLocation('');
      setTowDestination('');
      setEstimatedTowCost('');
    }

    setShowTowVendorModal(true);
  };

  const handleSaveTowVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecoveryAction) {
      setError('No recovery action found for this case');
      return;
    }

    // Validate required field
    if (!towVendorName.trim()) {
      setError('Tow vendor name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/admin/recovery-actions/${selectedRecoveryAction.id}/vendor`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vendor_name: towVendorName.trim(),
          vendor_phone: towVendorPhone.trim() || null,
          vendor_email: towVendorEmail.trim() || null,
          vendor_reference: towVendorReference.trim() || null,
          vendor_address: towVendorAddress.trim() || null,
          vendor_notes: towVendorNotes.trim() || null,
          scheduled_at: towScheduledAt ? new Date(towScheduledAt).toISOString() : null,
          pickup_location: towPickupLocation.trim() || null,
          destination: towDestination.trim() || null,
          estimated_cost: estimatedTowCost ? parseFloat(estimatedTowCost) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save tow vendor details');
      }

      setShowTowVendorModal(false);
      setShowDetailModal(false);
      setSelectedCase(null);
      setSelectedRecoveryAction(null);
      fetchCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tow vendor details');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthorizeRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    // Validate form
    if (!complianceConfirmed) {
      setError('You must confirm compliance authorization to proceed');
      return;
    }
    if (recoveryReason.trim().length < 10) {
      setError('Recovery reason must be at least 10 characters');
      return;
    }
    if (!contractVersion.trim()) {
      setError('Contract version reference is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/admin/delinquency/${selectedCase.id}/authorize-recovery`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compliance_confirmed: complianceConfirmed,
          reason: recoveryReason.trim(),
          contract_version: contractVersion.trim(),
          notes: recoveryNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to authorize recovery');
      }

      setShowRecoveryModal(false);
      setShowDetailModal(false);
      setSelectedCase(null);
      fetchCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authorize recovery');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/admin/delinquency/${selectedCase.id}/resolve`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolution_type: resolutionType,
          notes: resolutionNotes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to resolve case');
      }

      setShowResolveModal(false);
      setShowDetailModal(false);
      setSelectedCase(null);
      fetchCases();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve case');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delinquency & Recovery</h1>
          <p className="text-gray-600">Manage delinquent accounts and recovery actions</p>
        </div>
        <Link
          href="/admin"
          className="text-amber-600 hover:text-amber-700 flex items-center gap-1"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Recovery Workflow Disabled Notice */}
      {recoveryWorkflowStatus && recoveryWorkflowStatus.recovery_workflow_enabled === false && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-medium">Recovery Workflow Disabled</p>
            <p className="text-sm text-amber-700">
              Vehicle recovery actions are currently disabled by system configuration.
              Contact a system administrator to enable recovery workflow if needed.
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-gray-700 font-medium">Filter by Status:</span>
          {['all', 'open', 'escalated', 'recovery_pending', 'resolved', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as StatusFilter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading delinquency cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No delinquency cases found
            {statusFilter !== 'all' && (
              <span> for status &quot;{statusFilter.replace('_', ' ')}&quot;</span>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Late</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cases.map((delinquencyCase) => {
                const statusStyle = statusColors[delinquencyCase.status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                const escalationStyle = escalationColors[delinquencyCase.escalation_level] || { bg: 'bg-gray-100', text: 'text-gray-700' };

                return (
                  <tr key={delinquencyCase.id} className={`hover:bg-gray-50 ${delinquencyCase.is_priority ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{delinquencyCase.case_number}</div>
                      <div className="text-xs text-gray-500">{formatDate(delinquencyCase.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{delinquencyCase.customer_name}</div>
                      <div className="text-xs text-gray-500">{delinquencyCase.customer_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {delinquencyCase.vehicle_info || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                        {delinquencyCase.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${escalationStyle.bg} ${escalationStyle.text}`}>
                        {delinquencyCase.escalation_level.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${delinquencyCase.days_delinquent > 7 ? 'text-red-600' : 'text-gray-900'}`}>
                        {delinquencyCase.days_delinquent} days
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{formatCurrency(delinquencyCase.remaining_balance)}</div>
                      <div className="text-xs text-gray-500">of {formatCurrency(delinquencyCase.total_owed)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDetailModal(delinquencyCase)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                        {delinquencyCase.status !== 'resolved' && delinquencyCase.status !== 'closed' && (
                          <>
                            <button
                              onClick={() => openContactModal(delinquencyCase)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Contact
                            </button>
                            <button
                              onClick={() => openResolveModal(delinquencyCase)}
                              className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                            >
                              Resolve
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Case Details</h2>
                <p className="text-gray-600">{selectedCase.case_number}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer & Vehicle Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Customer</h3>
                  <p className="font-medium">{selectedCase.customer_name}</p>
                  <p className="text-sm text-gray-600">{selectedCase.customer_email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Vehicle</h3>
                  <p className="font-medium">{selectedCase.vehicle_info || 'N/A'}</p>
                </div>
              </div>

              {/* Status & Escalation */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Status</h3>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[selectedCase.status]?.bg || 'bg-gray-100'} ${statusColors[selectedCase.status]?.text || 'text-gray-700'}`}>
                    {selectedCase.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Escalation Level</h3>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${escalationColors[selectedCase.escalation_level]?.bg || 'bg-gray-100'} ${escalationColors[selectedCase.escalation_level]?.text || 'text-gray-700'}`}>
                    {selectedCase.escalation_level.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Financial Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Financial Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Amount Owed</p>
                    <p className="font-medium">{formatCurrency(selectedCase.amount_owed)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Late Fees</p>
                    <p className="font-medium">{formatCurrency(selectedCase.late_fees_accumulated)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Owed</p>
                    <p className="font-bold text-red-600">{formatCurrency(selectedCase.total_owed)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount Paid</p>
                    <p className="font-medium text-green-600">{formatCurrency(selectedCase.amount_paid)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Remaining Balance</p>
                    <p className="font-bold">{formatCurrency(selectedCase.remaining_balance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Days Delinquent</p>
                    <p className={`font-bold ${selectedCase.days_delinquent > 7 ? 'text-red-600' : 'text-gray-900'}`}>
                      {selectedCase.days_delinquent} days
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact & Recovery Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Contact Attempts</h3>
                  <p className="font-medium">{selectedCase.contact_attempts}</p>
                  {selectedCase.last_contact_at && (
                    <p className="text-sm text-gray-600">Last: {formatDate(selectedCase.last_contact_at)}</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Recovery Status</h3>
                  <p className="font-medium">
                    {selectedCase.recovery_authorized ? 'Recovery Authorized' : 'Not Authorized'}
                  </p>
                  {selectedCase.tow_scheduled && (
                    <p className="text-sm text-red-600">Tow Scheduled</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedCase.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">Notes</h3>
                  <div className="bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap">{selectedCase.notes}</div>
                </div>
              )}

              {/* Actions */}
              {selectedCase.status !== 'resolved' && selectedCase.status !== 'closed' && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Quick Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openContactModal(selectedCase)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      disabled={submitting}
                    >
                      Record Contact
                    </button>
                    {selectedCase.escalation_level !== 'level_5' && (
                      <button
                        onClick={() => {
                          const levels = ['level_1', 'level_2', 'level_3', 'level_4', 'level_5'];
                          const currentIndex = levels.indexOf(selectedCase.escalation_level);
                          if (currentIndex < levels.length - 1) {
                            handleEscalate(selectedCase, levels[currentIndex + 1]);
                          }
                        }}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        disabled={submitting}
                      >
                        Escalate
                      </button>
                    )}
                    {!selectedCase.recovery_authorized && selectedCase.escalation_level !== 'level_1' && (
                      recoveryWorkflowStatus?.recovery_workflow_enabled !== false ? (
                        <button
                          onClick={() => openRecoveryModal(selectedCase)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          disabled={submitting}
                        >
                          Initiate Recovery
                        </button>
                      ) : (
                        <div className="relative group">
                          <button
                            className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed opacity-60"
                            disabled={true}
                            title="Recovery workflow is currently disabled"
                          >
                            Initiate Recovery
                          </button>
                          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                            <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                              Recovery workflow is disabled
                            </div>
                          </div>
                        </div>
                      )
                    )}
                    {selectedCase.recovery_authorized && (
                      <button
                        onClick={() => openTowVendorModal(selectedCase)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        disabled={submitting}
                      >
                        Enter Tow Vendor Details
                      </button>
                    )}
                    <button
                      onClick={() => openResolveModal(selectedCase)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      disabled={submitting}
                    >
                      Resolve Case
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Record Contact Attempt</h2>
              <button onClick={() => setShowContactModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleRecordContact} className="p-6 space-y-4">
              <p className="text-gray-600">Recording contact for case {selectedCase.case_number}</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Method</label>
                <select
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                  placeholder="Notes about the contact attempt..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Resolve Case</h2>
              <button onClick={() => setShowResolveModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleResolve} className="p-6 space-y-4">
              <p className="text-gray-600">Resolving case {selectedCase.case_number}</p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Type</label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="paid">Paid in Full</option>
                  <option value="settled">Settled (Partial Payment)</option>
                  <option value="written_off">Written Off</option>
                  <option value="recovered">Vehicle Recovered</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                  placeholder="Notes about how the case was resolved..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Resolving...' : 'Resolve Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recovery Compliance Gate Modal */}
      {showRecoveryModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b flex justify-between items-center bg-red-50">
              <div>
                <h2 className="text-xl font-bold text-red-900">Compliance Gate - Initiate Recovery</h2>
                <p className="text-sm text-red-700">Case: {selectedCase.case_number}</p>
              </div>
              <button onClick={() => setShowRecoveryModal(false)} className="text-red-700 hover:text-red-900 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleAuthorizeRecovery} className="p-6 space-y-4">
              {/* Warning Banner */}
              <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-red-600 text-xl">⚠️</span>
                  <div>
                    <p className="font-bold text-red-800">Important: This action will initiate vehicle recovery</p>
                    <ul className="text-sm text-red-700 mt-2 space-y-1">
                      <li>• The customer will be notified of recovery action</li>
                      <li>• This action is logged for compliance purposes</li>
                      <li>• Lease will be terminated upon recovery</li>
                      <li>• Customer may be permanently banned</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Case Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Customer: <strong>{selectedCase.customer_name}</strong></p>
                <p className="text-sm text-gray-600">Days Delinquent: <strong className="text-red-600">{selectedCase.days_delinquent}</strong></p>
                <p className="text-sm text-gray-600">Total Owed: <strong>{formatCurrency(selectedCase.total_owed)}</strong></p>
              </div>

              {/* Compliance Checkbox */}
              <div className="border border-gray-300 rounded-lg p-4 bg-yellow-50">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={complianceConfirmed}
                    onChange={(e) => setComplianceConfirmed(e.target.checked)}
                    className="mt-1 h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">
                    <strong>I confirm compliance authorization:</strong> I have verified that all required pre-recovery steps have been completed,
                    the customer has been notified per contractual obligations, and this recovery action complies with applicable laws and company policies.
                  </span>
                </label>
              </div>

              {/* Reason for Recovery */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Recovery <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={recoveryReason}
                  onChange={(e) => setRecoveryReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24"
                  placeholder="Enter detailed reason for initiating recovery (minimum 10 characters)..."
                  required
                  minLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {recoveryReason.length}/10 characters minimum
                </p>
              </div>

              {/* Contract Version Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Version Reference <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contractVersion}
                  onChange={(e) => setContractVersion(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., v2.1, Contract-2024-01-15"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the version or ID of the lease contract being enforced
                </p>
              </div>

              {/* Supporting Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supporting Notes (Optional)
                </label>
                <textarea
                  value={recoveryNotes}
                  onChange={(e) => setRecoveryNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                  placeholder="Any additional notes or context..."
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !complianceConfirmed || recoveryReason.trim().length < 10 || !contractVersion.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Authorizing...' : 'Authorize Recovery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tow Vendor Details Modal */}
      {showTowVendorModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center bg-purple-50">
              <div>
                <h2 className="text-xl font-bold text-purple-900">Tow Vendor Details</h2>
                <p className="text-sm text-purple-700">Case: {selectedCase.case_number}</p>
                {selectedRecoveryAction && (
                  <p className="text-xs text-purple-600">Action: {selectedRecoveryAction.action_number} | Status: {selectedRecoveryAction.status.replace('_', ' ').toUpperCase()}</p>
                )}
              </div>
              <button onClick={() => setShowTowVendorModal(false)} className="text-purple-700 hover:text-purple-900 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSaveTowVendor} className="p-6 space-y-4">
              {/* Vendor Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 uppercase mb-3">Vendor Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={towVendorName}
                      onChange={(e) => setTowVendorName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g., ABC Towing Services"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={towVendorPhone}
                      onChange={(e) => setTowVendorPhone(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g., (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={towVendorEmail}
                      onChange={(e) => setTowVendorEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g., dispatch@abctowing.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Reference #</label>
                    <input
                      type="text"
                      value={towVendorReference}
                      onChange={(e) => setTowVendorReference(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g., TOW-12345"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Address</label>
                  <textarea
                    value={towVendorAddress}
                    onChange={(e) => setTowVendorAddress(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 h-16"
                    placeholder="Full address of tow vendor..."
                  />
                </div>
              </div>

              {/* Scheduling Information */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-700 uppercase mb-3">Scheduling Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date/Time</label>
                    <input
                      type="datetime-local"
                      value={towScheduledAt}
                      onChange={(e) => setTowScheduledAt(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={estimatedTowCost}
                      onChange={(e) => setEstimatedTowCost(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g., 250.00"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
                    <textarea
                      value={towPickupLocation}
                      onChange={(e) => setTowPickupLocation(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-16"
                      placeholder="Address where vehicle will be picked up..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                    <textarea
                      value={towDestination}
                      onChange={(e) => setTowDestination(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 h-16"
                      placeholder="Where vehicle will be taken..."
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Notes</label>
                <textarea
                  value={towVendorNotes}
                  onChange={(e) => setTowVendorNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20"
                  placeholder="Any special instructions or notes for the tow vendor..."
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowTowVendorModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !towVendorName.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Save Tow Vendor Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
