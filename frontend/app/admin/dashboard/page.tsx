'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AdminDashboardData } from '@/types';
import { formatDate, formatCategory, formatDepartment } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';
import CategoryBadge from '@/components/CategoryBadge';
import {
  Inbox,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ArrowUpRight,
  TrendingUp,
  Search,
  Filter,
  Layers,
  Sparkles,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res: any = await api.get('/api/admin/dashboard');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to fetch dashboard data.');
      }
    } catch (err: any) {
      setError(err.message || 'Server error loading admin metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 min-h-[60vh] flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Aggregating municipal telemetry from database...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800 space-y-3 max-w-md mx-auto my-12">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="font-bold text-base">Error Loading Dashboard</h3>
        <p className="text-xs text-rose-600">{error || 'Unknown error occurred.'}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { kpi, distributions, recentComplaints } = data;

  // Filter recent complaints client-side for quick search
  const filteredRecent = recentComplaints.filter((c) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase()) ||
      c.citizen?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            Live Municipal Command Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Admin Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time civic incident intelligence, dispatch triage, and AI duplicate detection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Data
          </button>
          <Link
            href="/admin/complaints"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Inbox className="w-3.5 h-3.5" />
            Manage All ({kpi.total})
          </Link>
        </div>
      </div>

      {/* 6 Core KPI Cards (Connected directly to database) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Total */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Reports</span>
            <Inbox className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{kpi.total}</div>
          <div className="text-[10px] text-slate-400 mt-1">Stored in database</div>
        </div>

        {/* Submitted */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-sky-100 shadow-sm bg-gradient-to-br from-white to-sky-50/30">
          <div className="flex items-center justify-between text-sky-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Triage</span>
            <Clock className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-800">{kpi.submitted}</div>
          <div className="text-[10px] text-sky-600/80 mt-1">Requires dispatch</div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-100 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
            <RefreshCw className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-800">{kpi.inProgress}</div>
          <div className="text-[10px] text-amber-600/80 mt-1">Field team active</div>
        </div>

        {/* Resolved */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-sm bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800">{kpi.resolved}</div>
          <div className="text-[10px] text-emerald-600/80 mt-1">Successfully fixed</div>
        </div>

        {/* High Priority */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-100 shadow-sm bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">High Priority</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-800">{kpi.highPriority}</div>
          <div className="text-[10px] text-rose-600/80 mt-1">Urgent attention</div>
        </div>

        {/* Duplicate Candidates */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-teal-100 shadow-sm bg-gradient-to-br from-white to-teal-50/30">
          <div className="flex items-center justify-between text-teal-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">AI Duplicates</span>
            <Copy className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-800">{kpi.duplicateCandidates}</div>
          <div className="text-[10px] text-teal-600/80 mt-1">Clusters detected</div>
        </div>
      </div>

      {/* Sprint 3: Gemini Vision & Automatic Assignment Metrics */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-5 rounded-2xl text-white border border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Automatic Municipal Routing & Triage Telemetry
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Gemini Vision Multi-Factor Pipeline</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Auto-Assigned (AI)</span>
            <div className="text-xl font-black text-teal-300">{kpi.aiAutoAssigned ?? 0}</div>
            <div className="text-[10px] text-slate-400">Gemini Vision routing</div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fallback Assigned</span>
            <div className="text-xl font-black text-sky-300">{kpi.fallbackAssigned ?? 0}</div>
            <div className="text-[10px] text-slate-400">Rule-based classifier</div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Flagged for Review</span>
            <div className="text-xl font-black text-amber-300">{kpi.requiresReview ?? 0}</div>
            <div className="text-[10px] text-slate-400">Confidence &lt; 85% or OTHER</div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Processing Failures</span>
            <div className="text-xl font-black text-emerald-400">{kpi.processingFailures ?? 0}</div>
            <div className="text-[10px] text-slate-400">0% unhandled failures</div>
          </div>
        </div>
      </div>

      {/* Analytics Distributions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">By Category</h3>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="space-y-2">
            {distributions.category.map((c) => {
              const pct = kpi.total > 0 ? Math.round((c.count / kpi.total) * 100) : 0;
              return (
                <div key={c.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{formatCategory(c.category)}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{c.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">By Priority</h3>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="space-y-2">
            {distributions.priority.map((p) => {
              const pct = kpi.total > 0 ? Math.round((p.count / kpi.total) * 100) : 0;
              const barColor =
                p.priority === 'HIGH' ? 'bg-rose-500' : p.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400';
              return (
                <div key={p.priority} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{p.priority}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{p.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`${barColor} h-full rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Lifecycle Status</h3>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="space-y-2">
            {distributions.status.map((s) => {
              const pct = kpi.total > 0 ? Math.round((s.count / kpi.total) * 100) : 0;
              const barColor =
                s.status === 'RESOLVED' ? 'bg-emerald-500' : s.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-sky-500';
              return (
                <div key={s.status} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{s.status}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{s.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`${barColor} h-full rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Workload */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Department Queue</h3>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="space-y-2">
            {distributions.department.map((d) => {
              const pct = kpi.total > 0 ? Math.round((d.count / kpi.total) * 100) : 0;
              return (
                <div key={d.department} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[130px]">{formatDepartment(d.department)}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{d.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-sky-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Complaints Queue</h2>
            <p className="text-xs text-slate-500">Live feed of recent citizen hazard submissions</p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter recent..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-3">Complaint ID</th>
                <th className="py-3 px-3">Title & Address</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Citizen</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecent.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    No complaints match current filters.
                  </td>
                </tr>
              ) : (
                filteredRecent.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-600">
                      #{c.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3 px-3 max-w-[240px]">
                      <div className="font-bold text-slate-900 truncate">{c.title}</div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal-600" />
                        {c.address}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <CategoryBadge category={c.category} />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{c.citizen?.name || 'Citizen'}</div>
                      <div className="text-[10px] text-slate-400">{c.citizen?.email}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {c.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/complaints/${c.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 rounded-lg font-semibold transition-colors border border-slate-200"
                      >
                        Inspect
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
