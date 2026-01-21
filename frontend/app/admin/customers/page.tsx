'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Customer {
  id: number;
  keycloak_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  insurance_status: string;
  insurance_document_key: string | null;
  insurance_expiration_date: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerDetail extends Customer {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  drivers_license_number: string | null;
  drivers_license_state: string | null;
  is_banned: boolean;
  notification_email: boolean;
  notification_sms: boolean;
}

type InsuranceStatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'not_uploaded' | 'expired';

const statusColors: Record<string, { bg: string; text: string }> = {
  not_uploaded: { bg: 'bg-gray-100', text: 'text-gray-700' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  approved: { bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
  expired: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InsuranceStatusFilter>('all');

  // Modal state for viewing customer details
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loadingDocument, setLoadingDocument] = useState(false);

  // Verification form state
  const [verificationAction, setVerificationAction] = useState<'approve' | 'reject' | null>(null);
  const [expirationDate, setExpirationDate] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || '';
    }
    return '';
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? 'http://localhost:8100/api/admin/customers'
        : `http://localhost:8100/api/admin/customers?insurance_status=${statusFilter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data = await response.json();
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  const openCustomerModal = async (customerId: number) => {
    try {
      const response = await fetch(`http://localhost:8100/api/admin/customers/${customerId}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch customer details');
      }

      const data = await response.json();
      setSelectedCustomer(data);
      setShowModal(true);
      setDocumentUrl(null);
      setVerificationAction(null);
      setExpirationDate('');
      setVerificationNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    }
  };

  const fetchDocumentUrl = async () => {
    if (!selectedCustomer) return;

    try {
      setLoadingDocument(true);
      const response = await fetch(
        `http://localhost:8100/api/admin/customers/${selectedCustomer.id}/insurance-document`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get document URL');
      }

      const data = await response.json();
      setDocumentUrl(data.document_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoadingDocument(false);
    }
  };

  const submitVerification = async () => {
    if (!selectedCustomer || !verificationAction) return;

    if (verificationAction === 'approve' && !expirationDate) {
      setError('Expiration date is required for approval');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(
        `http://localhost:8100/api/admin/customers/${selectedCustomer.id}/verify-insurance`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: verificationAction,
            expiration_date: verificationAction === 'approve' ? new Date(expirationDate).toISOString() : null,
            notes: verificationNotes || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Verification failed');
      }

      // Close modal and refresh list
      setShowModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
    setDocumentUrl(null);
    setVerificationAction(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-charcoal">Customer Management</h1>
          <p className="text-gray-500 mt-1">Manage customer profiles and insurance verification</p>
        </div>
        <Link href="/admin" className="text-sm text-gold-600 hover:text-gold-700 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by Insurance Status:</span>
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'approved', 'rejected', 'not_uploaded', 'expired'] as InsuranceStatusFilter[]).map((status) => (
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
          <button
            onClick={() => setError(null)}
            className="text-sm text-red-600 hover:text-red-800 mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Insurance Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Verified
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
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
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-luxury-charcoal">
                          {customer.full_name || 'Name not set'}
                        </p>
                        <p className="text-xs text-gray-500">{customer.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {customer.phone || 'No phone'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[customer.insurance_status]?.bg || 'bg-gray-100'
                      } ${statusColors[customer.insurance_status]?.text || 'text-gray-700'}`}>
                        {customer.insurance_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {customer.is_verified ? (
                        <span className="inline-flex items-center text-green-600">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(customer.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openCustomerModal(customer.id)}
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
      </div>

      {/* Customer Detail Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">Customer Details</h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                  <p className="text-sm text-gray-900">{selectedCustomer.email}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Full Name</label>
                  <p className="text-sm text-gray-900">{selectedCustomer.full_name || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
                  <p className="text-sm text-gray-900">{selectedCustomer.phone || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Account Status</label>
                  <p className="text-sm">
                    {selectedCustomer.is_verified ? (
                      <span className="text-green-600 font-medium">Verified</span>
                    ) : (
                      <span className="text-yellow-600 font-medium">Not Verified</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Insurance Section */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-semibold text-luxury-charcoal mb-4">Insurance Verification</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                    <p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[selectedCustomer.insurance_status]?.bg || 'bg-gray-100'
                      } ${statusColors[selectedCustomer.insurance_status]?.text || 'text-gray-700'}`}>
                        {selectedCustomer.insurance_status.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Expiration Date</label>
                    <p className="text-sm text-gray-900">
                      {selectedCustomer.insurance_expiration_date
                        ? new Date(selectedCustomer.insurance_expiration_date).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  </div>
                </div>

                {/* Document Viewer */}
                {selectedCustomer.insurance_document_key && (
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-500 uppercase">Document</label>
                    {!documentUrl ? (
                      <button
                        onClick={fetchDocumentUrl}
                        disabled={loadingDocument}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        {loadingDocument ? 'Loading...' : 'View Insurance Document'}
                      </button>
                    ) : (
                      <div className="mt-2">
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open Document (expires in 5 min)
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          Document key: {selectedCustomer.insurance_document_key}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Verification Actions */}
                {selectedCustomer.insurance_status === 'pending' && (
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <h4 className="font-medium text-gray-900 mb-3">Verification Actions</h4>

                    <div className="flex gap-3 mb-4">
                      <button
                        onClick={() => setVerificationAction('approve')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                          verificationAction === 'approve'
                            ? 'bg-green-600 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setVerificationAction('reject')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                          verificationAction === 'reject'
                            ? 'bg-red-600 text-white'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        Reject
                      </button>
                    </div>

                    {verificationAction === 'approve' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Policy Expiration Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    )}

                    {verificationAction && (
                      <>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (optional)
                          </label>
                          <textarea
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                            placeholder="Add verification notes..."
                          />
                        </div>

                        <button
                          onClick={submitVerification}
                          disabled={submitting || (verificationAction === 'approve' && !expirationDate)}
                          className={`w-full py-2 px-4 rounded-lg font-medium text-white transition-colors disabled:opacity-50 ${
                            verificationAction === 'approve'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-red-600 hover:bg-red-700'
                          }`}
                        >
                          {submitting ? 'Processing...' : `Confirm ${verificationAction === 'approve' ? 'Approval' : 'Rejection'}`}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Address Info */}
              {(selectedCustomer.address_line1 || selectedCustomer.city) && (
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-lg font-semibold text-luxury-charcoal mb-4">Address</h3>
                  <p className="text-sm text-gray-900">
                    {selectedCustomer.address_line1 && <span>{selectedCustomer.address_line1}<br /></span>}
                    {selectedCustomer.address_line2 && <span>{selectedCustomer.address_line2}<br /></span>}
                    {selectedCustomer.city && <span>{selectedCustomer.city}, </span>}
                    {selectedCustomer.state && <span>{selectedCustomer.state} </span>}
                    {selectedCustomer.zip_code && <span>{selectedCustomer.zip_code}</span>}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={closeModal}
                className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
