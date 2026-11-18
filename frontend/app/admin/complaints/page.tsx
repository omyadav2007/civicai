'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Complaint } from '@/types';
import { formatDate, formatCategory, formatDepartment } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';
import CategoryBadge from '@/components/CategoryBadge';
import {
  Inbox,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  AlertTriangle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function AdminComplaintsPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [priority, setPriority] = useState('');
  const [department, setDepartment] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Sync if URL search param status changes
  useEffect(() => {
    if (initialStatus !== status) {
      setStatus(initialStatus);
      setPage(1);
    }
  }, [initialStatus]);

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '12');
      if (search.trim()) params.append('search', search.trim());
      if (status) params.append('status', status);
      if (category) params.append('category', category);
      if (severity) params.append('severity', severity);
      if (priority) params.append('priority', priority);
      if (department) params.append('department', department);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const res: any = await api.get(`/api/admin/complaints?${params.toString()}`);
      if (res.success && res.data) {
        setComplaints(res.data.complaints || []);
        setTotal(res.data.pagination?.total || 0);
        setTotalPages(res.data.pagination?.totalPages || 1);
      } else {
        setError(res.message || 'Failed to retrieve complaints.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with backend.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, category, severity, priority, department, sortBy, sortOrder]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setCategory('');
    setSeverity('');
    setPriority('');
    setDepartment('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/admin/complaints');
    }
  };

  const getFilterHeading = () => {
    if (status) {
      const statusLabels: Record<string, string> = {
        SUBMITTED: 'Submitted Reports (Pending Triage)',
        IN_PROGRESS: 'In-Progress Reports',
        RESOLVED: 'Resolved Reports',
        REJECTED: 'Rejected Reports',
      };
      return `${statusLabels[status] || `${status} Reports`} (${total})`;
    }
    if (category) {
      return `${formatCategory(category)} Incident Reports (${total})`;
    }
    if (search.trim()) {
      return `Search Results for "${search.trim()}" (${total})`;
    }
    return `All Incident Reports (${total})`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-widest">
            Municipal Complaint Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {getFilterHeading()}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {status
              ? `Filtered by status: ${status}. Showing ${total} matching incident reports.`
              : 'Inspect all citizen reports, filter by status or department, update status, and manage AI duplicate clusters.'}
          </p>
        </div>

        <button
          onClick={() => fetchComplaints()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, description, address, or citizen name..."
              className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1 font-medium whitespace-nowrap self-end md:self-auto"
          >
            Clear Filters
          </button>
        </div>

        {/* Dropdowns row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-slate-100">
          {/* Status */}
          <select
            value={status}
            onChange={(e) => {
              const newStatus = e.target.value;
              setStatus(newStatus);
              setPage(1);
              if (typeof window !== 'undefined') {
                const newUrl = newStatus ? `/admin/complaints?status=${newStatus}` : '/admin/complaints';
                window.history.replaceState(null, '', newUrl);
              }
            }}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="">All Categories</option>
            <option value="OVERFLOWING_DUSTBIN">Overflowing Dustbin</option>
            <option value="ILLEGAL_GARBAGE_DUMPING">Illegal Garbage Dumping</option>
            <option value="UNCOLLECTED_GARBAGE">Uncollected Garbage</option>
            <option value="GARBAGE_BLOCKING_DRAIN">Garbage Blocking Drain</option>
            <option value="OPEN_GARBAGE_DUMP">Open Garbage Dump</option>
            <option value="MISSED_GARBAGE_COLLECTION">Missed Garbage Collection</option>
            <option value="GENERAL_WASTE_MANAGEMENT">General Waste Management</option>
            <option value="GARBAGE">Garbage (General)</option>
            <option value="POTHOLE">Pothole</option>
            <option value="ROAD_DAMAGE">Road Damage</option>
            <option value="WATER_LEAKAGE">Water Leakage</option>
            <option value="DRAINAGE">Drainage</option>
            <option value="STREETLIGHT">Streetlight</option>
            <option value="OTHER">Other</option>
          </select>

          {/* Severity */}
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="">All Severities</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
            <option value="PENDING">Pending</option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Department */}
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="">All Departments</option>
            <option value="ROAD_MAINTENANCE">Road Maintenance</option>
            <option value="SANITATION">Sanitation</option>
            <option value="WATER_SUPPLY">Water Supply</option>
            <option value="DRAINAGE">Drainage</option>
            <option value="ELECTRICITY">Electricity</option>
            <option value="PUBLIC_WORKS">Public Works</option>
            <option value="UNASSIGNED">Unassigned</option>
          </select>

          {/* Sort By */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('-');
              setSortBy(sb);
              setSortOrder(so);
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="priority-desc">Priority (High to Low)</option>
            <option value="status-asc">Status</option>
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Querying complaints repository...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800 space-y-2">
          <AlertTriangle className="w-8 h-8 mx-auto text-rose-600" />
          <h3 className="font-bold">Error loading complaints</h3>
          <p className="text-xs text-rose-600">{error}</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No complaints found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No incident reports match the current filter criteria.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3.5">ID</th>
                  <th className="py-3 px-3.5">Title & Location</th>
                  <th className="py-3 px-3.5">Category</th>
                  <th className="py-3 px-3.5">Department</th>
                  <th className="py-3 px-3.5">Citizen</th>
                  <th className="py-3 px-3.5">Severity</th>
                  <th className="py-3 px-3.5">Priority</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">AI Details</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3.5 font-mono font-semibold text-slate-600">
                      #{c.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-3.5 max-w-[260px]">
                      <div className="font-bold text-slate-900 truncate">{c.title}</div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                        <span>{c.address}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <CategoryBadge category={c.category} />
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {formatDepartment(c.department)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="font-medium text-slate-800">{c.citizen?.name || 'Citizen'}</div>
                      <div className="text-[10px] text-slate-400">{c.citizen?.email}</div>
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {c.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      {c.aiAnalysis ? (
                        <div className="flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full w-fit">
                          <Sparkles className="w-3 h-3" />
                          <span>Score: {c.aiAnalysis.priorityScore}</span>
                          {c.aiAnalysis.duplicateCandidateIds?.length > 0 && (
                            <span className="font-bold text-amber-700">({c.aiAnalysis.duplicateCandidateIds.length} dups)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No AI telemetry</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/complaints/${c.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-semibold transition-colors shadow-sm"
                      >
                        Inspect
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing page <span className="font-bold text-slate-900">{page}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span> ({total} total results)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
