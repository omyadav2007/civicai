'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  Calendar,
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res: any = await api.get('/api/admin/analytics');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to retrieve analytics.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with analytics endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 min-h-[60vh] flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Computing municipal resolution analytics from database...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800 space-y-3 max-w-md mx-auto my-12">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="font-bold text-base">Error Loading Analytics</h3>
        <p className="text-xs text-rose-600">{error || 'Unable to load analytics metrics.'}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-teal-500" />
            Performance & SLA Metrics
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Municipal Workload Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Average time to resolution, turnaround rates, and monthly civic volume.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Metrics
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Volume</span>
            <Building2 className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{data.totalComplaints}</div>
          <div className="text-xs text-slate-400">Total reports received</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resolution Rate</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-700">{data.resolutionRate}%</div>
          <div className="text-xs text-slate-400">{data.resolvedCount} completed cases</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Turnaround</span>
            <Clock className="w-5 h-5 text-sky-500" />
          </div>
          <div className="text-3xl font-black text-sky-700">{data.avgResolutionHours} hrs</div>
          <div className="text-xs text-slate-400">Dispatch to on-site fix</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Pipeline</span>
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-700">
            {data.totalComplaints - data.resolvedCount}
          </div>
          <div className="text-xs text-slate-400">Awaiting or in field progress</div>
        </div>
      </div>

      {/* Monthly Trends Table / Bar Visual */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-600" />
            Monthly Report Volume & Resolution Performance
          </h3>
          <span className="text-xs text-slate-400 font-mono">Aggregated DB Queries</span>
        </div>

        <div className="space-y-4">
          {(!data.monthlyTrends || data.monthlyTrends.length === 0) ? (
            <p className="text-xs text-slate-400 italic py-4">No historical monthly data recorded.</p>
          ) : (
            data.monthlyTrends.map((trend: any) => {
              const resPct = trend.total > 0 ? Math.round((trend.resolved / trend.total) * 100) : 0;
              return (
                <div key={trend.month} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>{trend.month}</span>
                    <span className="font-mono text-slate-500">
                      {trend.resolved} resolved of {trend.total} reported ({resPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${resPct}%` }} />
                    <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${100 - resPct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
