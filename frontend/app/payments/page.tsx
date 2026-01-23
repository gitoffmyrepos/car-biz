'use client';

/**
 * Weekly Vehicle Leasing Platform - Payments/Invoices Page
 * Salvage-to-Lux Fleet Management
 *
 * Customer page for viewing weekly invoices and payment history.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8100/api';

interface Invoice {
  id: number;
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
  verified_at: string | null;
  rejection_reason: string | null;
  is_late: boolean;
  days_late: number;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
}

interface PaymentProofUploadResponse {
  success: boolean;
  message: string;
  invoice_id: number;
  invoice_number: string;
  status: string;
  proof_uploaded_at: string | null;
}

interface InvoiceListResponse {
  invoices: Invoice[];
  total_count: number;
  pending_count: number;
  paid_count: number;
  total_due: number;
}

interface CustomerProfile {
  is_banned: boolean;
  ban_reason: string | null;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const isLoggingOut = useRef(false);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState<Invoice | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('zelle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);

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

  // Fetch customer profile (for banned status)
  const fetchCustomerProfile = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/customer/dashboard-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomerProfile({
          is_banned: data.is_banned || false,
          ban_reason: data.ban_reason || null,
        });
      }
    } catch {
      // Non-critical, continue without profile
    }
  }, [token]);

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    if (!token) return;

    setIsLoadingData(true);
    setError(null);

    try {
      const url = statusFilter
        ? `${API_BASE_URL}/customer/invoices?status_filter=${statusFilter}`
        : `${API_BASE_URL}/customer/invoices`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data: InvoiceListResponse = await response.json();
        setInvoices(data.invoices);
        setTotalCount(data.total_count);
        setPendingCount(data.pending_count);
        setPaidCount(data.paid_count);
        setTotalDue(data.total_due);
      } else {
        setError('Failed to load invoices');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoadingData(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchCustomerProfile();
      fetchInvoices();
    }
  }, [isAuthenticated, token, fetchCustomerProfile, fetchInvoices]);

  const handleLogout = () => {
    isLoggingOut.current = true;
    logout();
    router.push('/');
  };

  // Handle payment proof upload
  const handleUploadProof = async () => {
    if (!uploadingInvoice || !selectedFile || !token) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const url = `${API_BASE_URL}/customer/invoices/${uploadingInvoice.id}/upload-proof?payment_method=${encodeURIComponent(paymentMethod)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data: PaymentProofUploadResponse = await response.json();
        setUploadSuccess(data.message);
        // Refresh invoices to show updated status
        await fetchInvoices();
        // Close modal after brief delay to show success
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadingInvoice(null);
          setSelectedFile(null);
          setUploadSuccess(null);
          setSelectedInvoice(null); // Close detail modal too
        }, 2000);
      } else {
        const errorData = await response.json();
        setUploadError(errorData.detail || 'Failed to upload payment proof');
      }
    } catch {
      setUploadError('Network error. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Open upload modal for an invoice
  const openUploadModal = (invoice: Invoice) => {
    setUploadingInvoice(invoice);
    setShowUploadModal(true);
    setSelectedFile(null);
    setUploadError(null);
    setUploadSuccess(null);
    setPaymentMethod('zelle');
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (images only)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File too large. Maximum size is 10MB.');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  // Check if invoice can have proof uploaded
  // Banned customers cannot upload payment proofs (read-only access)
  const canUploadProof = (invoice: Invoice) => {
    if (customerProfile?.is_banned) {
      return false;
    }
    return ['due', 'late', 'rejected'].includes(invoice.status);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      due: 'bg-yellow-100 text-yellow-800',
      verification_in_progress: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      late: 'bg-red-100 text-red-800',
      rejected: 'bg-red-100 text-red-800',
      waived: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-gray-100 text-gray-500',
    };

    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      due: 'Due',
      verification_in_progress: 'Verifying',
      paid: 'Paid',
      late: 'Late',
      rejected: 'Rejected',
      waived: 'Waived',
      cancelled: 'Cancelled',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-700'}`}>
        {statusLabels[status] || status}
      </span>
    );
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
            <Link
              href="/dashboard"
              className="text-sm text-gray-300 hover:text-gold transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/notifications"
              className="text-sm text-gray-300 hover:text-gold transition-colors"
            >
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
      <main className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-charcoal">Weekly Invoices</h1>
            <p className="text-gray-600 mt-1">View and manage your payment history</p>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-charcoal hover:text-gold transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Banned Customer Banner - Read-Only Access Notice */}
        {customerProfile?.is_banned && (
          <div className="mb-6 bg-amber-50 border-2 border-amber-400 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-800">Read-Only Access</h3>
                <p className="text-amber-700 mt-1">
                  Your account is currently banned. You can view your payment history but cannot upload new payment proofs.
                </p>
                {customerProfile.ban_reason && (
                  <p className="text-amber-600 mt-2 text-sm">
                    <strong>Reason:</strong> {customerProfile.ban_reason}
                  </p>
                )}
                <p className="text-amber-600 mt-3 text-sm">
                  If you believe this is an error, please <Link href="/contact" className="underline font-medium hover:text-amber-800">contact support</Link>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Invoices</p>
                <p className="text-2xl font-bold text-charcoal">{totalCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-charcoal">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Paid</p>
                <p className="text-2xl font-bold text-charcoal">{paidCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Due</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            <label htmlFor="status-filter" className="text-sm font-medium text-charcoal">Filter by Status:</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
            >
              <option value="">All Invoices</option>
              <option value="pending">Pending</option>
              <option value="due">Due</option>
              <option value="verification_in_progress">Verification in Progress</option>
              <option value="paid">Paid</option>
              <option value="late">Late</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Invoice List */}
        {invoices.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-charcoal mb-2">No Invoices Found</h3>
            <p className="text-gray-600">
              {statusFilter ? 'No invoices match the selected filter.' : 'You don\'t have any invoices yet. Once you have an active lease, your weekly invoices will appear here.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-charcoal">{invoice.invoice_number}</p>
                          <p className="text-xs text-gray-500">Week {invoice.week_number}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-600">
                          {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className={`text-sm ${invoice.is_late ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {formatDate(invoice.due_date)}
                          {invoice.is_late && (
                            <span className="block text-xs text-red-500">{invoice.days_late} days late</span>
                          )}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-semibold text-charcoal">{formatCurrency(invoice.total_amount)}</p>
                          {invoice.late_fee > 0 && (
                            <p className="text-xs text-red-500">+{formatCurrency(invoice.late_fee)} late fee</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status)}
                        {invoice.rejection_reason && (
                          <p className="text-xs text-red-500 mt-1 max-w-32 truncate" title={invoice.rejection_reason}>
                            {invoice.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedInvoice(invoice)}
                            className="text-gold hover:text-gold/80 font-medium"
                          >
                            View
                          </button>
                          {canUploadProof(invoice) && (
                            <button
                              onClick={() => openUploadModal(invoice)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Upload Proof
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-charcoal">Invoice Details</h2>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-charcoal">{selectedInvoice.invoice_number}</span>
                  {getStatusBadge(selectedInvoice.status)}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Week Number</p>
                    <p className="font-medium text-charcoal">Week {selectedInvoice.week_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className={`font-medium ${selectedInvoice.is_late ? 'text-red-600' : 'text-charcoal'}`}>
                      {formatDate(selectedInvoice.due_date)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Period Start</p>
                    <p className="font-medium text-charcoal">{formatDate(selectedInvoice.period_start)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Period End</p>
                    <p className="font-medium text-charcoal">{formatDate(selectedInvoice.period_end)}</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount</span>
                      <span className="font-medium">{formatCurrency(selectedInvoice.amount)}</span>
                    </div>
                    {selectedInvoice.late_fee > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Late Fee</span>
                        <span className="font-medium">+{formatCurrency(selectedInvoice.late_fee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-lg font-semibold text-charcoal">Total</span>
                      <span className="text-lg font-bold text-gold">{formatCurrency(selectedInvoice.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {selectedInvoice.payment_method && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium text-charcoal capitalize">{selectedInvoice.payment_method}</p>
                  </div>
                )}

                {selectedInvoice.payment_proof_uploaded_at && (
                  <div>
                    <p className="text-sm text-gray-500">Proof Uploaded</p>
                    <p className="font-medium text-charcoal">{formatDate(selectedInvoice.payment_proof_uploaded_at)}</p>
                  </div>
                )}

                {selectedInvoice.paid_at && (
                  <div>
                    <p className="text-sm text-gray-500">Paid On</p>
                    <p className="font-medium text-green-600">{formatDate(selectedInvoice.paid_at)}</p>
                  </div>
                )}

                {selectedInvoice.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                    <p className="text-sm text-red-600 mt-1">{selectedInvoice.rejection_reason}</p>
                  </div>
                )}

                {selectedInvoice.notes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700">Notes</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-3">
                {canUploadProof(selectedInvoice) && (
                  <button
                    onClick={() => openUploadModal(selectedInvoice)}
                    className="w-full px-4 py-2 bg-gold text-charcoal font-semibold rounded-lg hover:bg-gold/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Payment Proof
                  </button>
                )}
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="w-full px-4 py-2 bg-charcoal text-white font-semibold rounded-lg hover:bg-charcoal/90 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Proof Upload Modal */}
        {showUploadModal && uploadingInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-charcoal">Upload Payment Proof</h2>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadingInvoice(null);
                      setSelectedFile(null);
                      setUploadError(null);
                      setUploadSuccess(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Invoice Info */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Uploading proof for:</p>
                  <p className="font-medium text-charcoal">{uploadingInvoice.invoice_number}</p>
                  <p className="text-sm text-gray-600">Amount due: {formatCurrency(uploadingInvoice.total_amount)}</p>
                </div>

                {/* Success Message */}
                {uploadSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm text-green-700">{uploadSuccess}</p>
                  </div>
                )}

                {/* Error Message */}
                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700">{uploadError}</p>
                  </div>
                )}

                {!uploadSuccess && (
                  <>
                    {/* Payment Method Selection */}
                    <div>
                      <label htmlFor="payment-method" className="block text-sm font-medium text-charcoal mb-2">
                        Payment Method
                      </label>
                      <select
                        id="payment-method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50"
                      >
                        <option value="zelle">Zelle</option>
                        <option value="cashapp">Cash App</option>
                        <option value="cash">Cash (In Person)</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* File Upload */}
                    <div>
                      <label className="block text-sm font-medium text-charcoal mb-2">
                        Payment Screenshot
                      </label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                          selectedFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gold'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        {selectedFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                              <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <p className="text-sm text-gray-600">Click to select payment screenshot</p>
                            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, or WebP (max 10MB)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadingInvoice(null);
                    setSelectedFile(null);
                    setUploadError(null);
                    setUploadSuccess(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-charcoal font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                {!uploadSuccess && (
                  <button
                    onClick={handleUploadProof}
                    disabled={!selectedFile || isUploading}
                    className={`flex-1 px-4 py-2 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      selectedFile && !isUploading
                        ? 'bg-gold text-charcoal hover:bg-gold/90'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      'Upload Proof'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Instructions */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-charcoal mb-4">Payment Information</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Accepted Payment Methods</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-charcoal">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Zelle
                </li>
                <li className="flex items-center gap-2 text-charcoal">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Cash App
                </li>
                <li className="flex items-center gap-2 text-charcoal">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Cash (In Person)
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Notes</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-gold">*</span>
                  Payments are due weekly on the same day as your lease start date
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold">*</span>
                  Late fees of $25 may apply after a 3-day grace period
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold">*</span>
                  Upload payment proof for faster verification
                </li>
              </ul>
            </div>
          </div>
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
