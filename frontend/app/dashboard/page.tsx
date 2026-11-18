'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Complaint, ComplaintStats } from '@/types';
import { formatDate } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';
import CategoryBadge from '@/components/CategoryBadge';
import {
  PlusCircle,
  Search,
  Filter,
  FileQuestion,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  ArrowUpRight,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<ComplaintStats>({
    total: 0,
    submitted: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchMyComplaints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const response: any = await api.get(`/api/complaints/my?${params.toString()}`);
      if (response.success && response.data) {
        setComplaints(response.data.complaints || []);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchMyComplaints();
    }
  }, [user, fetchMyComplaints]);

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-teal-600 uppercase tracking-widest">
            Citizen Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track and manage your submitted civic hazard reports.
          </p>
        </div>

        <Link
          href="/complaints/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Report New Issue
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 my-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Reports
            </span>
            <FolderOpen className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.total}</div>
          <div className="text-xs text-slate-400 mt-1">Filed by your account</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-sky-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Submitted
            </span>
            <Clock className="w-5 h-5 text-sky-500" />
          </div>
          <div className="text-3xl font-black text-sky-700">{stats.submitted}</div>
          <div className="text-xs text-slate-400 mt-1">Awaiting field triage</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              In Progress
            </span>
            <RefreshCw className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-700">{stats.inProgress}</div>
          <div className="text-xs text-slate-400 mt-1">Active municipal work orders</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Resolved
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-700">{stats.resolved}</div>
          <div className="text-xs text-slate-400 mt-1">Completed civic repairs</div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm mb-6 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, description, or street..."
            className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 font-medium"
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
            <option value="WATER_LEAKAGE">Water Leakage</option>
            <option value="DRAINAGE">Drainage Problems</option>
            <option value="STREETLIGHT">Streetlight</option>
            <option value="ROAD_DAMAGE">Road Damage</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <button
          onClick={() => fetchMyComplaints()}
          title="Refresh"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center self-end md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content List / Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading civic complaints from database...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-700 space-y-2">
          <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
          <h3 className="font-bold">Error loading complaints</h3>
          <p className="text-xs sm:text-sm text-rose-600">{error}</p>
          <button
            onClick={() => fetchMyComplaints()}
            className="px-4 py-2 mt-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
          >
            Retry Request
          </button>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
            <FileQuestion className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No complaints found</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1">
              {search || statusFilter || categoryFilter
                ? 'No complaints match the specified filters. Try resetting search filters.'
                : 'You have not reported any civic issues yet. Be the first to report a problem in your street!'}
            </p>
          </div>
          <Link
            href="/complaints/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Report Issue Now
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Responsive Cards for Complaints */}
          <div className="grid grid-cols-1 gap-4">
            {complaints.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      ID: #{item.id.slice(0, 8).toUpperCase()}
                    </span>
                    <CategoryBadge category={item.category} />
                    <StatusBadge status={item.status} size="sm" />
                    <PriorityBadge priority={item.priority} />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                      <span className="truncate max-w-[240px]">{item.address}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{formatDate(item.createdAt)}</span>
                    </span>
                    {item.images && item.images.length > 0 && (
                      <span className="text-[11px] bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full font-medium">
                        {item.images.length} Image{item.images.length > 1 ? 's' : ''} attached
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-auto flex items-center justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <Link
                    href={`/complaints/${item.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
                  >
                    View Details
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
