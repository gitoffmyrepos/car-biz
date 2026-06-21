'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';

interface PaymentProof {
  has_proof: boolean;
  url?: string;
  uploaded_at?: string;
  payment_method?: string;
  invoice_number?: string;
  message?: string;
}

interface Invoice {
  id: number;
  lease_id: number;
  customer_profile_id: number;
  customer_name: string | null;
  customer_email: string | null;
  invoice_number: string;
  week_number: number;
  amount: number;
  late_fee: number;
  total_amount: number;
  period_start: string;
  period_end: string;
  due_date: string;
  status: string;
  payment_method: string | null;
  payment_proof_uploaded_at: string | null;
  has_payment_proof: boolean;
  verified_at: string | null;
  verified_by_id: string | null;
  verification_notes: string | null;
  rejection_reason: string | null;
  is_late: boolean;
  days_late: number;
  late_fee_applied_at: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  vehicle_info: string | null;
  weekly_payment: number | null;
}

interface InvoiceListResponse {
  invoices: Invoice[];
  total_count: number;
  pending_count: number;
  verification_in_progress_count: number;
  paid_count: number;
  late_count: number;
  total_pending_amount: number;
  total_collected_amount: number;
}

const statusOptions = ['pending', 'due', 'verification_in_progress', 'paid', 'late', 'rejected'];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  due: 'bg-orange-100 text-orange-700',
  verification_in_progress: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  late: 'bg-red-100 text-red-700',
  rejected: 'bg-gray-100 text-gray-700',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  due: 'Due',
  verification_in_progress: 'Verification',
  paid: 'Paid',
  late: 'Late',
  rejected: 'Rejected',
};

export default function AdminPaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentProof, setPaymentProof] = useState<PaymentProof | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalType, setApprovalType] = useState<'approve' | 'reject'>('approve');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total_count: 0,
    pending_count: 0,
    verification_in_progress_count: 0,
    paid_count: 0,
    late_count: 0,
    total_pending_amount: 0,
    total_collected_amount: 0,
  });

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('fx_weekly_lease_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      let url = apiUrl('/admin/invoices?limit=100');
      if (statusFilter) {
        url += `&status_filter=${statusFilter}`;
      }
      if (fromDate) {
        url += `&from_date=${fromDate}`;
      }
      if (toDate) {
        url += `&to_date=${toDate}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to fetch invoices');
      }

      const data: InvoiceListResponse = await response.json();

      // Filter by customer name/email if search is active
      let filteredInvoices = data.invoices;
      if (customerSearch.trim()) {
        const search = customerSearch.toLowerCase();
        filteredInvoices = data.invoices.filter(inv =>
          inv.customer_name?.toLowerCase().includes(search) ||
          inv.customer_email?.toLowerCase().includes(search)
        );
      }

      setInvoices(filteredInvoices);
      setStats({
        total_count: data.total_count,
        pending_count: data.pending_count,
        verification_in_progress_count: data.verification_in_progress_count,
        paid_count: data.paid_count,
        late_count: data.late_count,
        total_pending_amount: data.total_pending_amount,
        total_collected_amount: data.total_collected_amount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, fromDate, toDate]);

  // Re-filter when customer search changes (client-side filtering)
  useEffect(() => {
    if (customerSearch.trim() === '') {
      fetchInvoices();
    } else {
      // Client-side filtering for customer search
      const search = customerSearch.toLowerCase();
      setInvoices(prev => prev.filter(inv =>
        inv.customer_name?.toLowerCase().includes(search) ||
        inv.customer_email?.toLowerCase().includes(search)
      ));
    }
  }, [customerSearch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setCustomerSearch('');
  };

  const fetchPaymentProof = async (invoiceId: number) => {
    setLoadingProof(true);
    setPaymentProof(null);
    try {
      const token = localStorage.getItem('fx_weekly_lease_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        apiUrl(`/admin/invoices/${invoiceId}/payment-proof`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch payment proof');
      }

      const data: PaymentProof = await response.json();
      setPaymentProof(data);
    } catch (err) {
      console.error('Error fetching payment proof:', err);
      setPaymentProof({ has_proof: false, message: 'Error loading payment proof' });
    } finally {
      setLoadingProof(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!selectedInvoice) return;

    if (approvalType === 'reject' && !rejectionReason.trim()) {
      setVerificationError('Rejection reason is required');
      return;
    }

    setSubmittingVerification(true);
    setVerificationError(null);
    setVerificationSuccess(null);

    try {
      const token = localStorage.getItem('fx_weekly_lease_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        apiUrl(`/admin/invoices/${selectedInvoice.id}/verify`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approved: approvalType === 'approve',
            notes: verificationNotes.trim() || null,
            rejection_reason: approvalType === 'reject' ? rejectionReason.trim() : null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to verify payment');
      }

      const data = await response.json();
      setVerificationSuccess(data.message);

      // Close modals and refresh
      setTimeout(() => {
        setShowApprovalModal(false);
        setSelectedInvoice(null);
        setVerificationNotes('');
        setRejectionReason('');
        setVerificationSuccess(null);
        setPaymentProof(null);
        fetchInvoices();
      }, 1500);
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmittingVerification(false);
    }
  };

  const openApprovalModal = (type: 'approve' | 'reject') => {
    setApprovalType(type);
    setShowApprovalModal(true);
    setVerificationNotes('');
    setRejectionReason('');
    setVerificationError(null);
    setVerificationSuccess(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-charcoal">Weekly Invoices</h1>
          <p className="text-gray-500 mt-1">
            Manage weekly invoices and payments.
            {stats.total_count > 0 && <span className="font-medium"> {stats.total_count} total invoices.</span>}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Refresh Button */}
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="btn btn-secondary text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-luxury-charcoal">{stats.total_count}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending_count}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Verification</p>
          <p className="text-2xl font-bold text-blue-600">{stats.verification_in_progress_count}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Paid</p>
          <p className="text-2xl font-bold text-green-600">{stats.paid_count}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Late</p>
          <p className="text-2xl font-bold text-red-600">{stats.late_count}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Pending Amt</p>
          <p className="text-xl font-bold text-yellow-600">{formatCurrency(stats.total_pending_amount)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Collected</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(stats.total_collected_amount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status] || status}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Search */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Customer</label>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name or email"
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent w-48"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            />
          </div>

          {/* Clear Filters */}
          {(statusFilter || customerSearch || fromDate || toDate) && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading invoices</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-gray-500">Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="font-medium">No invoices found</p>
                    <p className="text-sm">
                      {statusFilter || customerSearch || fromDate || toDate
                        ? 'Try adjusting your filters.'
                        : 'No invoices have been generated yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-luxury-charcoal">{invoice.customer_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{invoice.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {invoice.vehicle_info || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Week {invoice.week_number}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                        {invoice.late_fee > 0 && (
                          <p className="text-xs text-red-500">+{formatCurrency(invoice.late_fee)} late fee</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-600">{formatDate(invoice.due_date)}</p>
                        {invoice.is_late && invoice.days_late > 0 && (
                          <p className="text-xs text-red-500">{invoice.days_late} days late</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[invoice.status] || 'bg-gray-100 text-gray-700'}`}>
                        {statusLabels[invoice.status] || invoice.status}
                      </span>
                      {invoice.has_payment_proof && invoice.status !== 'paid' && (
                        <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                          Has Proof
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedInvoice(invoice)}
                        className="text-gold-600 hover:text-gold-700 font-medium text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Results info */}
        {!loading && invoices.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500">
              Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-luxury-charcoal">
                    Invoice {selectedInvoice.invoice_number}
                  </h2>
                  <span className={`inline-flex mt-2 px-2 py-1 text-xs font-medium rounded-full ${statusColors[selectedInvoice.status] || 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[selectedInvoice.status] || selectedInvoice.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer & Vehicle Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Customer Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium text-luxury-charcoal">{selectedInvoice.customer_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-luxury-charcoal">{selectedInvoice.customer_email}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Vehicle Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Vehicle</p>
                      <p className="font-medium text-luxury-charcoal">{selectedInvoice.vehicle_info || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Weekly Payment</p>
                      <p className="font-medium text-luxury-charcoal">
                        {selectedInvoice.weekly_payment ? formatCurrency(selectedInvoice.weekly_payment) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Invoice Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Week Number</p>
                      <p className="font-medium text-luxury-charcoal">Week {selectedInvoice.week_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Period</p>
                      <p className="font-medium text-luxury-charcoal">
                        {formatDate(selectedInvoice.period_start)} - {formatDate(selectedInvoice.period_end)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Due Date</p>
                      <p className={`font-medium ${selectedInvoice.is_late ? 'text-red-600' : 'text-luxury-charcoal'}`}>
                        {formatDate(selectedInvoice.due_date)}
                        {selectedInvoice.is_late && selectedInvoice.days_late > 0 && (
                          <span className="text-xs ml-2">({selectedInvoice.days_late} days late)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500">Base Amount</p>
                      <p className="font-medium text-luxury-charcoal">{formatCurrency(selectedInvoice.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Late Fee</p>
                      <p className={`font-medium ${selectedInvoice.late_fee > 0 ? 'text-red-600' : 'text-luxury-charcoal'}`}>
                        {formatCurrency(selectedInvoice.late_fee)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Amount</p>
                      <p className="font-bold text-lg text-luxury-charcoal">{formatCurrency(selectedInvoice.total_amount)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Payment Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Payment Method</p>
                      <p className="font-medium text-luxury-charcoal">{selectedInvoice.payment_method || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Has Payment Proof</p>
                      <p className="font-medium text-luxury-charcoal">
                        {selectedInvoice.has_payment_proof ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </p>
                    </div>
                    {selectedInvoice.payment_proof_uploaded_at && (
                      <div>
                        <p className="text-xs text-gray-500">Proof Uploaded At</p>
                        <p className="font-medium text-luxury-charcoal">{formatDateTime(selectedInvoice.payment_proof_uploaded_at)}</p>
                      </div>
                    )}
                    {selectedInvoice.paid_at && (
                      <div>
                        <p className="text-xs text-gray-500">Paid At</p>
                        <p className="font-medium text-green-600">{formatDateTime(selectedInvoice.paid_at)}</p>
                      </div>
                    )}
                  </div>
                  {selectedInvoice.verified_at && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Verified At</p>
                          <p className="font-medium text-luxury-charcoal">{formatDateTime(selectedInvoice.verified_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Verified By</p>
                          <p className="font-medium text-luxury-charcoal">{selectedInvoice.verified_by_id || 'N/A'}</p>
                        </div>
                      </div>
                      {selectedInvoice.verification_notes && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500">Verification Notes</p>
                          <p className="text-sm text-luxury-charcoal">{selectedInvoice.verification_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {selectedInvoice.rejection_reason && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Rejection Reason</p>
                      <p className="text-sm text-red-600">{selectedInvoice.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {(selectedInvoice.notes || selectedInvoice.admin_notes) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {selectedInvoice.notes && (
                      <div>
                        <p className="text-xs text-gray-500">Customer Notes</p>
                        <p className="text-sm text-luxury-charcoal whitespace-pre-wrap">{selectedInvoice.notes}</p>
                      </div>
                    )}
                    {selectedInvoice.admin_notes && (
                      <div className={selectedInvoice.notes ? 'pt-3 border-t border-gray-200' : ''}>
                        <p className="text-xs text-gray-500">Admin Notes</p>
                        <p className="text-sm text-luxury-charcoal whitespace-pre-wrap">{selectedInvoice.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Timestamps</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Created At</p>
                      <p className="font-medium text-luxury-charcoal">{formatDateTime(selectedInvoice.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Updated</p>
                      <p className="font-medium text-luxury-charcoal">{formatDateTime(selectedInvoice.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Proof Section */}
            {selectedInvoice.has_payment_proof && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Payment Proof</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {!paymentProof && !loadingProof && (
                    <button
                      onClick={() => fetchPaymentProof(selectedInvoice.id)}
                      className="btn btn-secondary"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Payment Proof
                    </button>
                  )}
                  {loadingProof && (
                    <div className="flex items-center space-x-2">
                      <svg className="animate-spin w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-gray-500">Loading payment proof...</span>
                    </div>
                  )}
                  {paymentProof && !paymentProof.has_proof && (
                    <p className="text-gray-500">{paymentProof.message || 'No payment proof available'}</p>
                  )}
                  {paymentProof && paymentProof.has_proof && paymentProof.url && (
                    <div className="space-y-3">
                      <a
                        href={paymentProof.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary inline-flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open Payment Proof (New Tab)
                      </a>
                      <p className="text-xs text-gray-500">
                        Payment method: {paymentProof.payment_method || 'Not specified'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Verification Actions - Only show for invoices with payment proof and pending/verification status */}
                {selectedInvoice.has_payment_proof &&
                 (selectedInvoice.status === 'verification_in_progress' || selectedInvoice.status === 'pending') && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openApprovalModal('approve')}
                      className="btn bg-green-600 text-white hover:bg-green-700 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Approve Payment
                    </button>
                    <button
                      onClick={() => openApprovalModal('reject')}
                      className="btn bg-red-600 text-white hover:bg-red-700 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject Payment
                    </button>
                  </div>
                )}

                {/* Show status message for already processed invoices */}
                {selectedInvoice.status === 'paid' && (
                  <div className="flex items-center text-green-600">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Payment Approved
                  </div>
                )}
                {selectedInvoice.status === 'rejected' && (
                  <div className="flex items-center text-red-600">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Payment Rejected
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedInvoice(null);
                    setPaymentProof(null);
                  }}
                  className="btn btn-secondary ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Verification Modal */}
      {showApprovalModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">
                  {approvalType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
                </h2>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Invoice Info Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Invoice</p>
                    <p className="font-medium text-luxury-charcoal">{selectedInvoice.invoice_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-medium text-luxury-charcoal">{formatCurrency(selectedInvoice.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="font-medium text-luxury-charcoal">{selectedInvoice.customer_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Period</p>
                    <p className="font-medium text-luxury-charcoal">Week {selectedInvoice.week_number}</p>
                  </div>
                </div>
              </div>

              {approvalType === 'approve' ? (
                <div className="space-y-4">
                  <div className="flex items-center text-green-600 bg-green-50 rounded-lg p-4">
                    <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium">Approve this payment?</p>
                      <p className="text-sm text-green-600/80">This will mark the invoice as paid and update the ledger.</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Verification Notes (Optional)
                    </label>
                    <textarea
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder="Add any notes about the payment verification..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center text-red-600 bg-red-50 rounded-lg p-4">
                    <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-medium">Reject this payment?</p>
                      <p className="text-sm text-red-600/80">The customer will be notified and will need to resubmit payment proof.</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why the payment is being rejected..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">This reason will be visible to the customer.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Notes (Optional)
                    </label>
                    <textarea
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder="Internal notes about this rejection..."
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Error/Success Messages */}
              {verificationError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {verificationError}
                </div>
              )}
              {verificationSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
                  {verificationSuccess}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                disabled={submittingVerification}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPayment}
                disabled={submittingVerification || (approvalType === 'reject' && !rejectionReason.trim())}
                className={`btn ${approvalType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white flex items-center`}
              >
                {submittingVerification ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    {approvalType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
