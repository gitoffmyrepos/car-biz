'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiUrl } from '@/lib/api';

interface AuditLogEntry {
  id: number;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  target_description: string | null;
  reason: string | null;
  requires_reason: boolean;
  notes: string | null;
  success: boolean;
  timestamp: string;
  [key: string]: unknown;
}

interface AuditLogDetail extends AuditLogEntry {
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  error_message: string | null;
}

// Map action values to human-readable labels and colors
const actionLabels: Record<string, { label: string; color: string }> = {
  insurance_document_view: { label: 'Document View', color: 'bg-blue-100 text-blue-800' },
  insurance_document_download: { label: 'Document Download', color: 'bg-blue-100 text-blue-800' },
  insurance_verification_approve: { label: 'Insurance Approved', color: 'bg-green-100 text-green-800' },
  insurance_verification_reject: { label: 'Insurance Rejected', color: 'bg-red-100 text-red-800' },
  insurance_break_glass_access: { label: 'Break-Glass Access', color: 'bg-yellow-100 text-yellow-800' },
  payment_proof_view: { label: 'Payment View', color: 'bg-blue-100 text-blue-800' },
  payment_approve: { label: 'Payment Approved', color: 'bg-green-100 text-green-800' },
  payment_reject: { label: 'Payment Rejected', color: 'bg-red-100 text-red-800' },
  invoice_update: { label: 'Invoice Update', color: 'bg-purple-100 text-purple-800' },
  vehicle_assignment: { label: 'Vehicle Assigned', color: 'bg-indigo-100 text-indigo-800' },
  vehicle_unassignment: { label: 'Vehicle Unassigned', color: 'bg-gray-100 text-gray-800' },
  tracker_assignment: { label: 'Tracker Assigned', color: 'bg-indigo-100 text-indigo-800' },
  tracker_unassignment: { label: 'Tracker Unassigned', color: 'bg-gray-100 text-gray-800' },
  delinquency_escalation: { label: 'Delinquency Escalation', color: 'bg-orange-100 text-orange-800' },
  recovery_authorization: { label: 'Recovery Authorization', color: 'bg-red-100 text-red-800' },
  tow_action: { label: 'Tow Action', color: 'bg-red-100 text-red-800' },
  customer_ban: { label: 'Customer Banned', color: 'bg-red-100 text-red-800' },
  customer_unban: { label: 'Customer Unbanned', color: 'bg-green-100 text-green-800' },
  profile_update_by_admin: { label: 'Profile Update', color: 'bg-purple-100 text-purple-800' },
  admin_action: { label: 'Admin Action', color: 'bg-gray-100 text-gray-800' },
  data_export: { label: 'Data Export', color: 'bg-yellow-100 text-yellow-800' },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('');
  const [showInsuranceOnly, setShowInsuranceOnly] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('fx_weekly_lease_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      // Build URL with filters
      let endpoint = showInsuranceOnly
        ? '/api/admin/audit-logs/insurance'
        : '/api/admin/audit-logs';

      const params = new URLSearchParams();
      if (actionFilter && !showInsuranceOnly) params.append('action_filter', actionFilter);
      if (targetTypeFilter && !showInsuranceOnly) params.append('target_type_filter', targetTypeFilter);
      params.append('limit', '500');

      const url = apiUrl(`${endpoint}?${params}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, targetTypeFilter, showInsuranceOnly]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const fetchLogDetail = async (logId: number) => {
    try {
      const token = localStorage.getItem('fx_weekly_lease_token');
      if (!token) return;

      const response = await fetch(
        apiUrl(`/admin/audit-logs/${logId}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedLog(data);
        setShowDetailModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch log detail:', err);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionBadge = (action: string): ReactNode => {
    const config = actionLabels[action] || { label: action, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Define columns for DataTable
  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      filterable: true,
      render: (value) => formatTimestamp(value as string),
    },
    {
      key: 'actor_email',
      header: 'Actor',
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{value as string}</p>
          <p className="text-xs text-gray-500 capitalize">{row.actor_role}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      filterable: true,
      render: (value) => getActionBadge(value as string),
    },
    {
      key: 'target_type',
      header: 'Target',
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div>
          <p className="text-sm text-gray-900">{value as string}</p>
          <p className="text-xs text-gray-500">ID: {row.target_id}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      sortable: false,
      filterable: true,
      render: (value, row) => {
        if (value) {
          return (
            <p className="text-sm text-gray-700 truncate max-w-xs" title={value as string}>
              {value as string}
            </p>
          );
        } else if (row.requires_reason) {
          return <span className="text-xs text-red-500">Required but not provided</span>;
        }
        return <span className="text-xs text-gray-400">N/A</span>;
      },
    },
    {
      key: 'success',
      header: 'Status',
      sortable: true,
      filterable: false,
      render: (value) => {
        if (value) {
          return (
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Success
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Failed
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      render: (value) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            fetchLogDetail(value as number);
          }}
          className="text-gold-600 hover:text-gold-700 text-sm font-medium"
        >
          View Details
        </button>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-luxury-charcoal">Audit Logs</h1>
          <p className="text-gray-500 mt-1">
            Security audit trail for all sensitive operations
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-luxury-charcoal text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Insurance Only Toggle */}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showInsuranceOnly}
              onChange={(e) => setShowInsuranceOnly(e.target.checked)}
              className="form-checkbox h-4 w-4 text-gold-500 rounded border-gray-300 focus:ring-gold-500"
            />
            <span className="ml-2 text-sm text-gray-700">Insurance Actions Only</span>
          </label>

          {/* Action Filter */}
          {!showInsuranceOnly && (
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            >
              <option value="">All Actions</option>
              {Object.entries(actionLabels).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )}

          {/* Target Type Filter */}
          {!showInsuranceOnly && (
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            >
              <option value="">All Target Types</option>
              <option value="insurance_document">Insurance Documents</option>
              <option value="customer_profile">Customer Profiles</option>
              <option value="payment">Payments</option>
              <option value="vehicle">Vehicles</option>
            </select>
          )}

          {/* Clear Filters */}
          {(actionFilter || targetTypeFilter || showInsuranceOnly) && (
            <button
              onClick={() => {
                setActionFilter('');
                setTargetTypeFilter('');
                setShowInsuranceOnly(false);
              }}
              className="text-sm text-gold-600 hover:text-gold-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Audit Logs DataTable with Pagination, Sorting, and Filtering */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <DataTable
          data={logs}
          columns={columns}
          keyField="id"
          sortable={true}
          defaultSort={{ column: 'timestamp', direction: 'desc' }}
          pagination={true}
          pageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
          filterable={true}
          filterPlaceholder="Search logs by email, action, target..."
          loading={isLoading}
          emptyMessage="No audit logs found"
          striped={true}
          hoverable={true}
          onRowClick={(row) => fetchLogDetail(row.id)}
        />
      </div>

      {/* Results count */}
      {!isLoading && logs.length > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          Total: {logs.length} audit log entries
        </p>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-luxury-charcoal">
                  Audit Log #{selectedLog.id}
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
              {/* Action Info */}
              <div className="flex items-center space-x-4">
                {getActionBadge(selectedLog.action)}
                {selectedLog.success ? (
                  <span className="text-green-600 text-sm">Successful</span>
                ) : (
                  <span className="text-red-600 text-sm">Failed</span>
                )}
              </div>

              {/* Timestamp */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Timestamp</h3>
                <p className="text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
              </div>

              {/* Actor */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Actor</h3>
                <p className="text-gray-900">{selectedLog.actor_email}</p>
                <p className="text-sm text-gray-500">Role: {selectedLog.actor_role}</p>
                <p className="text-xs text-gray-400">ID: {selectedLog.actor_id}</p>
              </div>

              {/* Target */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Target</h3>
                <p className="text-gray-900">{selectedLog.target_type}</p>
                <p className="text-sm text-gray-500">ID: {selectedLog.target_id}</p>
                {selectedLog.target_description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedLog.target_description}</p>
                )}
              </div>

              {/* Reason */}
              {selectedLog.requires_reason && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Access Reason {selectedLog.requires_reason && <span className="text-red-500">*</span>}
                  </h3>
                  {selectedLog.reason ? (
                    <p className="text-gray-900 bg-yellow-50 border border-yellow-200 rounded p-3">
                      {selectedLog.reason}
                    </p>
                  ) : (
                    <p className="text-red-500 italic">No reason provided (required)</p>
                  )}
                </div>
              )}

              {/* Notes */}
              {selectedLog.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                  <p className="text-gray-900">{selectedLog.notes}</p>
                </div>
              )}

              {/* Before/After State */}
              {(selectedLog.before_state || selectedLog.after_state) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">State Changes</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.before_state && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Before</p>
                        <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(selectedLog.before_state, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.after_state && (
                      <div>
                        <p className="text-xs text-gray-400 mb-1">After</p>
                        <pre className="bg-green-50 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(selectedLog.after_state, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Request Context */}
              {(selectedLog.ip_address || selectedLog.user_agent || selectedLog.request_id) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Request Context</h3>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {selectedLog.request_id && (
                      <p><span className="text-gray-500">Request ID:</span> {selectedLog.request_id}</p>
                    )}
                    {selectedLog.ip_address && (
                      <p><span className="text-gray-500">IP Address:</span> {selectedLog.ip_address}</p>
                    )}
                    {selectedLog.user_agent && (
                      <p className="truncate" title={selectedLog.user_agent}>
                        <span className="text-gray-500">User Agent:</span> {selectedLog.user_agent}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {selectedLog.error_message && (
                <div>
                  <h3 className="text-sm font-medium text-red-500 mb-1">Error Message</h3>
                  <p className="text-red-700 bg-red-50 border border-red-200 rounded p-3">
                    {selectedLog.error_message}
                  </p>
                </div>
              )}
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
    </div>
  );
}
