'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatCategory } from '@/lib/utils';
import CategoryBadge from '@/components/CategoryBadge';
import {
  Sparkles,
  Copy,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  BrainCircuit,
  Layers,
  HelpCircle,
  Clock,
} from 'lucide-react';

export default function AdminAiInsightsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const res: any = await api.get('/api/admin/ai-insights');
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to retrieve AI insights.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with AI intelligence service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 min-h-[60vh] flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Aggregating machine learning intelligence and duplicate clusters...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800 space-y-3 max-w-md mx-auto my-12">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="font-bold text-base">Error Loading AI Insights</h3>
        <p className="text-xs text-rose-600">{error || 'Unable to retrieve telemetry.'}</p>
        <button
          onClick={fetchInsights}
          className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const { metrics, categoryDistribution, severityDistribution, duplicateClusters, recentAnalyses } = data;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-500" />
            Machine Learning Intelligence Pipeline
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            AI Operations & Model Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Explainable NLP classification, multi-factor hazard severity ratings, and Haversine duplicate clustering.
          </p>
        </div>

        <button
          onClick={fetchInsights}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition-all self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Telemetry
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Analyzed</span>
            <BrainCircuit className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{metrics.totalAnalyzed}</div>
          <div className="text-xs text-teal-700 font-medium">100% database complaints processed</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Duplicate Clusters</span>
            <Copy className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-700">{metrics.duplicateClustersCount}</div>
          <div className="text-xs text-slate-400">Geo & semantic candidate pairs</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Human Reviews</span>
            <HelpCircle className="w-5 h-5 text-sky-500" />
          </div>
          <div className="text-3xl font-black text-sky-700">{metrics.lowConfidenceCount}</div>
          <div className="text-xs text-slate-400">Confidence below threshold</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Audited Corrections</span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-700">{metrics.correctedCount}</div>
          <div className="text-xs text-slate-400">Admin feedback stored for tuning</div>
        </div>
      </div>

      {/* Distribution Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Prediction Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-600" />
              Category Prediction Breakdown
            </h3>
            <span className="text-xs font-mono text-slate-400">TF-IDF NLP Distribution</span>
          </div>
          <div className="space-y-3">
            {categoryDistribution.map((item: any) => {
              const pct = metrics.totalAnalyzed > 0 ? Math.round((item.count / metrics.totalAnalyzed) * 100) : 0;
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-800">{formatCategory(item.category)}</span>
                    <span className="text-slate-500 font-mono">{item.count} records ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Estimated Severity Risk Distribution
            </h3>
            <span className="text-xs font-mono text-slate-400">Hazard Weight Engine</span>
          </div>
          <div className="space-y-3">
            {severityDistribution.map((item: any) => {
              const pct = metrics.totalAnalyzed > 0 ? Math.round((item.count / metrics.totalAnalyzed) * 100) : 0;
              const color =
                item.severity === 'HIGH' ? 'bg-rose-500' : item.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400';
              return (
                <div key={item.severity} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-800">{item.severity} Hazard</span>
                    <span className="text-slate-500 font-mono">{item.count} complaints ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Duplicate Candidate Clusters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Copy className="w-4 h-4 text-teal-600" />
              Detected Duplicate Clusters
            </h3>
            <p className="text-xs text-slate-500">
              Complaints within 500m radius that exhibit high semantic similarity to existing issues
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            {duplicateClusters.length} Cluster{duplicateClusters.length !== 1 ? 's' : ''}
          </span>
        </div>

        {duplicateClusters.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">No overlapping duplicate clusters currently recorded.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {duplicateClusters.map((cluster: any) => (
              <div
                key={cluster.complaintId}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2 hover:border-teal-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    #{cluster.complaintId.slice(0, 8).toUpperCase()}
                  </span>
                  <CategoryBadge category={cluster.category} />
                </div>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{cluster.title}</h4>
                <div className="text-[11px] text-teal-700 font-medium">
                  Matches {cluster.duplicateCandidatesCount} other nearby report(s)
                </div>
                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/admin/complaints/${cluster.complaintId}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900"
                  >
                    Open Complaint Dossier
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Model Audit Log Feed */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <BrainCircuit className="w-4 h-4 text-teal-600" />
            Recent AI Telemetry & Rationale Logs
          </h3>
          <span className="text-xs text-slate-400 font-mono">Real Inference Logs</span>
        </div>

        <div className="space-y-3">
          {recentAnalyses.map((item: any) => (
            <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/60">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{item.complaint?.title}</span>
                  <CategoryBadge category={item.predictedCategory} />
                </div>
                <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                  <span>Score: {item.priorityScore}/100 ({item.calculatedPriority})</span>
                  <span>•</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-700">Rationale: </span>
                {item.categoryExplanation} — {item.severityExplanation}
              </p>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Confidence: {(item.categoryConfidence * 100).toFixed(0)}%</span>
                  {item.isCorrected && (
                    <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Human Corrected
                    </span>
                  )}
                </div>

                <Link
                  href={`/admin/complaints/${item.complaintId}`}
                  className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold text-xs"
                >
                  Inspect Dossier
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
