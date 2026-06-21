'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '@/lib/api';

interface Inquiry {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  preferred_contact: string;
  vehicle_type: string;
  timeframe: string;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface InquiryListResponse {
  items: Inquiry[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

const statusOptions = ['new', 'contacted', 'in_progress', 'converted', 'closed'];

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

const vehicleTypeLabels: Record<string, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  truck: 'Truck',
  sports: 'Sports',
  luxury: 'Luxury',
  any: 'Any',
};

const timeframeLabels: Record<string, string> = {
  immediate: 'Immediately',
  this_week: 'This Week',
  this_month: 'This Month',
  just_browsing: 'Just Browsing',
};

const preferredContactLabels: Record<string, string> = {
  email: 'Email',
  phone: 'Phone',
  either: 'Either',
};

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = apiUrl(`/inquiries/?page=${page}&per_page=10`);
      if (statusFilter) {
        url += `&status_filter=${statusFilter}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch inquiries');
      }
      const data: InquiryListResponse = await response.json();
      setInquiries(data.items);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [page, statusFilter]);

  const handleStatusChange = async (inquiryId: number, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(
        apiUrl(`/inquiries/${inquiryId}/status?new_status=${newStatus}`),
        {
          method: 'PATCH',
        }
      );
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      // Refresh the list
      await fetchInquiries();
      // Update selected inquiry if open
      if (selectedInquiry && selectedInquiry.id === inquiryId) {
        const updatedInquiry = await response.json();
        setSelectedInquiry(updatedInquiry);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-charcoal">Inquiries</h1>
          <p className="text-gray-500 mt-1">
            Manage customer inquiries from the contact form.
            {total > 0 && <span className="font-medium"> {total} total inquiries.</span>}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
          {/* Refresh Button */}
          <button
            onClick={fetchInquiries}
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading inquiries</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Inquiries Table */}
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
                  Contact
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle Interest
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timeframe
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
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
                      <span className="text-gray-500">Loading inquiries...</span>
                    </div>
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <p className="font-medium">No inquiries found</p>
                    <p className="text-sm">
                      {statusFilter
                        ? 'Try adjusting your status filter.'
                        : 'New inquiries will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                inquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      #{inquiry.id}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-luxury-charcoal">{inquiry.full_name}</p>
                        <p className="text-xs text-gray-500">{inquiry.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-600">{inquiry.phone || 'N/A'}</p>
                        <p className="text-xs text-gray-500">
                          Prefers: {preferredContactLabels[inquiry.preferred_contact] || inquiry.preferred_contact}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gold-100 text-gold-700">
                        {vehicleTypeLabels[inquiry.vehicle_type] || inquiry.vehicle_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {timeframeLabels[inquiry.timeframe] || inquiry.timeframe}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={inquiry.status}
                        onChange={(e) => handleStatusChange(inquiry.id, e.target.value)}
                        disabled={updatingStatus}
                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer ${statusColors[inquiry.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(inquiry.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedInquiry(inquiry)}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages || loading}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">
                  Inquiry #{selectedInquiry.id}
                </h2>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Customer Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-medium text-luxury-charcoal">{selectedInquiry.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-luxury-charcoal">{selectedInquiry.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-luxury-charcoal">{selectedInquiry.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Preferred Contact</p>
                      <p className="font-medium text-luxury-charcoal">
                        {preferredContactLabels[selectedInquiry.preferred_contact] || selectedInquiry.preferred_contact}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inquiry Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Inquiry Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Vehicle Interest</p>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gold-100 text-gold-700">
                        {vehicleTypeLabels[selectedInquiry.vehicle_type] || selectedInquiry.vehicle_type}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Timeframe</p>
                      <p className="font-medium text-luxury-charcoal">
                        {timeframeLabels[selectedInquiry.timeframe] || selectedInquiry.timeframe}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <select
                        value={selectedInquiry.status}
                        onChange={(e) => handleStatusChange(selectedInquiry.id, e.target.value)}
                        disabled={updatingStatus}
                        className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer ${statusColors[selectedInquiry.status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {selectedInquiry.notes && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Notes</p>
                      <p className="text-sm text-luxury-charcoal whitespace-pre-wrap">
                        {selectedInquiry.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Timestamps</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Submitted</p>
                      <p className="font-medium text-luxury-charcoal">{formatDate(selectedInquiry.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Last Updated</p>
                      <p className="font-medium text-luxury-charcoal">{formatDate(selectedInquiry.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedInquiry(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <a
                href={`mailto:${selectedInquiry.email}?subject=Re: Your GigWheels Inquiry&body=Dear ${selectedInquiry.full_name},%0D%0A%0D%0AThank you for your inquiry about our ${vehicleTypeLabels[selectedInquiry.vehicle_type] || selectedInquiry.vehicle_type} vehicles.%0D%0A%0D%0A`}
                className="btn btn-primary"
              >
                Send Email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
