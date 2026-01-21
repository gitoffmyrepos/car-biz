'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// Dashboard stats card component
function StatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  bgColor = 'bg-white',
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  bgColor?: string;
}) {
  return (
    <div className={`${bgColor} rounded-xl shadow-sm p-6 border border-gray-100`}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center text-gold-600">
          {icon}
        </div>
        {trend && trendValue && (
          <span
            className={`text-sm font-medium px-2 py-1 rounded-full ${
              trend === 'up'
                ? 'bg-green-100 text-green-600'
                : trend === 'down'
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
      </div>
      <h3 className="text-3xl font-bold text-luxury-charcoal mb-1">{value}</h3>
      <p className="text-gray-500 text-sm">{title}</p>
    </div>
  );
}

// Recent activity item component
function ActivityItem({
  title,
  description,
  time,
  type,
}: {
  title: string;
  description: string;
  time: string;
  type: 'inquiry' | 'payment' | 'vehicle' | 'customer';
}) {
  const icons = {
    inquiry: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    payment: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
    ),
    vehicle: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    customer: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  };

  const colors = {
    inquiry: 'bg-blue-100 text-blue-600',
    payment: 'bg-green-100 text-green-600',
    vehicle: 'bg-purple-100 text-purple-600',
    customer: 'bg-gold-100 text-gold-600',
  };

  return (
    <div className="flex items-start space-x-3 py-3 border-b border-gray-100 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors[type]}`}>
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-luxury-charcoal truncate">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <span className="text-xs text-gray-400">{time}</span>
    </div>
  );
}

interface DashboardStats {
  total_inquiries: number;
  new_inquiries: number;
  total_customers: number;
  active_leases: number;
  pending_payments: number;
  pending_vehicle_requests: number;
  pending_verifications: number;
  late_invoices: number;
}

interface InquiryItem {
  id: number;
  full_name: string;
  email: string;
  vehicle_type: string;
  created_at: string;
  status: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_inquiries: 0,
    new_inquiries: 0,
    total_customers: 0,
    active_leases: 0,
    pending_payments: 0,
    pending_vehicle_requests: 0,
    pending_verifications: 0,
    late_invoices: 0,
  });
  const [recentInquiries, setRecentInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('fx_weekly_lease_token');

      try {
        // Fetch dashboard stats from admin endpoint
        const statsResponse = await fetch('http://localhost:8100/api/admin/dashboard/stats', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // Fetch recent inquiries
        const inquiriesResponse = await fetch('http://localhost:8100/api/inquiries/');
        if (inquiriesResponse.ok) {
          const inquiriesData = await inquiriesResponse.json();
          setRecentInquiries(inquiriesData.items?.slice(0, 5) || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-luxury-charcoal">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn btn-secondary text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export
          </button>
          <button className="btn btn-primary text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Entry
          </button>
        </div>
      </div>

      {/* Stats Grid - Row 1: Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Leases"
          value={loading ? '...' : stats.active_leases}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          }
          bgColor="bg-green-50"
        />
        <StatCard
          title="Total Customers"
          value={loading ? '...' : stats.total_customers}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          title="Pending Payments"
          value={loading ? '...' : stats.pending_payments}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend={stats.pending_payments > 0 ? 'up' : 'neutral'}
          trendValue={stats.pending_payments > 0 ? 'Action needed' : 'All clear'}
          bgColor={stats.pending_payments > 0 ? 'bg-amber-50' : 'bg-white'}
        />
        <StatCard
          title="Late Invoices"
          value={loading ? '...' : stats.late_invoices}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend={stats.late_invoices > 0 ? 'down' : 'neutral'}
          trendValue={stats.late_invoices > 0 ? 'Requires attention' : 'None'}
          bgColor={stats.late_invoices > 0 ? 'bg-red-50' : 'bg-white'}
        />
      </div>

      {/* Stats Grid - Row 2: Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Inquiries"
          value={loading ? '...' : stats.total_inquiries}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          }
        />
        <StatCard
          title="New Inquiries"
          value={loading ? '...' : stats.new_inquiries}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          trend={stats.new_inquiries > 0 ? 'up' : 'neutral'}
          trendValue={stats.new_inquiries > 0 ? 'Follow up' : 'None'}
          bgColor={stats.new_inquiries > 0 ? 'bg-blue-50' : 'bg-white'}
        />
        <StatCard
          title="Vehicle Requests"
          value={loading ? '...' : stats.pending_vehicle_requests}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          trend={stats.pending_vehicle_requests > 0 ? 'up' : 'neutral'}
          trendValue={stats.pending_vehicle_requests > 0 ? 'Pending' : 'None'}
        />
        <StatCard
          title="Insurance Verifications"
          value={loading ? '...' : stats.pending_verifications}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          trend={stats.pending_verifications > 0 ? 'up' : 'neutral'}
          trendValue={stats.pending_verifications > 0 ? 'Pending' : 'None'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Inquiries */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-luxury-charcoal">Recent Inquiries</h2>
            <Link href="/admin/inquiries" className="text-sm text-gold-600 hover:text-gold-700 font-medium">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle Interest
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : recentInquiries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No inquiries yet
                    </td>
                  </tr>
                ) : (
                  recentInquiries.map((inquiry) => (
                    <tr key={inquiry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-luxury-charcoal">{inquiry.full_name}</p>
                          <p className="text-xs text-gray-500">{inquiry.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 capitalize">{inquiry.vehicle_type.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            inquiry.status === 'new'
                              ? 'bg-blue-100 text-blue-700'
                              : inquiry.status === 'contacted'
                              ? 'bg-yellow-100 text-yellow-700'
                              : inquiry.status === 'converted'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {inquiry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(inquiry.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-luxury-charcoal">Recent Activity</h2>
          </div>
          <div className="p-4">
            {recentInquiries.length > 0 ? (
              recentInquiries.map((inquiry) => (
                <ActivityItem
                  key={inquiry.id}
                  title={`New inquiry from ${inquiry.full_name}`}
                  description={`Interested in ${inquiry.vehicle_type.replace('_', ' ')}`}
                  time={new Date(inquiry.created_at).toLocaleDateString()}
                  type="inquiry"
                />
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-luxury-charcoal mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/inquiries"
            className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-8 h-8 text-gold-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-sm font-medium text-luxury-charcoal">View Inquiries</span>
          </Link>
          <Link
            href="/admin/vehicles"
            className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-8 h-8 text-gold-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm font-medium text-luxury-charcoal">Add Vehicle</span>
          </Link>
          <Link
            href="/admin/customers"
            className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-8 h-8 text-gold-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-sm font-medium text-luxury-charcoal">Add Customer</span>
          </Link>
          <Link
            href="/admin/payments"
            className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-8 h-8 text-gold-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-sm font-medium text-luxury-charcoal">Review Payments</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
