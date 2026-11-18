'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Complaint, Department, ComplaintStatus, ComplaintCategory, ComplaintSeverity } from '@/types';
import { formatDate, formatCategory, formatDepartment, formatAssignmentMethod } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';
import CategoryBadge from '@/components/CategoryBadge';
import Timeline from '@/components/Timeline';
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Calendar,
  AlertTriangle,
  User,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Building2,
  FileText,
  Send,
  CheckCircle,
  Copy,
  Layers,
  Wrench,
  Clock,
  RefreshCw,
  Edit3,
} from 'lucide-react';

export default function AdminComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status Change State
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('IN_PROGRESS');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Department State
  const [selectedDept, setSelectedDept] = useState<Department>('ROAD_MAINTENANCE');
  const [deptNotes, setDeptNotes] = useState('');
  const [updatingDept, setUpdatingDept] = useState(false);

  // Internal Note State
  const [internalNote, setInternalNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // AI Correction State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctedCategory, setCorrectedCategory] = useState<ComplaintCategory>('POTHOLE');
  const [correctedSeverity, setCorrectedSeverity] = useState<ComplaintSeverity>('HIGH');
  const [correctedDepartment, setCorrectedDepartment] = useState<Department>('ROAD_MAINTENANCE');
  const [correctionReason, setCorrectionReason] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Re-run AI State
  const [triggeringAi, setTriggeringAi] = useState(false);

  const fetchComplaintDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res: any = await api.get(`/api/admin/complaints/${id}`);
      if (res.success && res.data) {
        setComplaint(res.data.complaint);
        setDuplicateCandidates(res.data.duplicateCandidates || []);
        if (res.data.complaint.status) setNewStatus(res.data.complaint.status);
        if (res.data.complaint.department) setSelectedDept(res.data.complaint.department);
        if (res.data.complaint.category) setCorrectedCategory(res.data.complaint.category);
        if (res.data.complaint.severity) setCorrectedSeverity(res.data.complaint.severity);
      } else {
        setError(res.message || 'Complaint details not found.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve complaint details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchComplaintDetails();
  }, [id]);

  // Handle Status Update
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingStatus(true);
    setActionSuccess(null);
    try {
      const res: any = await api.patch(`/api/admin/complaints/${id}/status`, {
        status: newStatus,
        notes: statusNotes,
      });
      if (res.success) {
        setActionSuccess(res.message);
        setStatusNotes('');
        await fetchComplaintDetails();
      } else {
        setError(res.message || 'Status update failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error updating status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Department Assignment
  const handleAssignDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingDept(true);
    setActionSuccess(null);
    try {
      const res: any = await api.patch(`/api/admin/complaints/${id}/assign`, {
        department: selectedDept,
        notes: deptNotes,
      });
      if (res.success) {
        setActionSuccess(res.message);
        setDeptNotes('');
        await fetchComplaintDetails();
      } else {
        setError(res.message || 'Department assignment failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error assigning department.');
    } finally {
      setUpdatingDept(false);
    }
  };

  // Handle Adding Internal Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNote.trim()) return;
    setAddingNote(true);
    setActionSuccess(null);
    try {
      const res: any = await api.post(`/api/admin/complaints/${id}/notes`, {
        note: internalNote,
      });
      if (res.success) {
        setActionSuccess('Internal note added successfully.');
        setInternalNote('');
        await fetchComplaintDetails();
      } else {
        setError(res.message || 'Failed to add note.');
      }
    } catch (err: any) {
      setError(err.message || 'Error recording internal note.');
    } finally {
      setAddingNote(false);
    }
  };

  // Handle AI Correction
  const handleSaveAiCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCorrection(true);
    try {
      const res: any = await api.patch(`/api/admin/complaints/${id}/ai-correction`, {
        category: correctedCategory,
        severity: correctedSeverity,
        department: correctedDepartment,
        notes: correctionReason,
      });
      if (res.success) {
        setActionSuccess('AI prediction corrected and stored for auditing.');
        setShowCorrectionModal(false);
        setCorrectionReason('');
        await fetchComplaintDetails();
      } else {
        setError(res.message || 'Correction failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving AI correction.');
    } finally {
      setSavingCorrection(false);
    }
  };

  // Handle Re-running AI Analysis
  const handleTriggerAi = async () => {
    setTriggeringAi(true);
    setActionSuccess(null);
    try {
      const res: any = await api.post(`/api/admin/complaints/${id}/trigger-ai`, {});
      if (res.success) {
        setActionSuccess('AI intelligence re-analyzed and refreshed successfully.');
        await fetchComplaintDetails();
      } else {
        setError(res.message || 'AI pipeline failed.');
      }
    } catch (err: any) {
      setError(err.message || 'AI service error.');
    } finally {
      setTriggeringAi(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-[60vh] flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Retrieving complaint dossier #{id?.slice(0, 8)}...</p>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800 space-y-3 max-w-md mx-auto my-12">
        <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="font-bold text-base">Error Loading Dossier</h3>
        <p className="text-xs text-rose-600">{error || 'Complaint record not found.'}</p>
        <Link
          href="/admin/complaints"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Complaints
        </Link>
      </div>
    );
  }

  const ai = complaint.aiAnalysis;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/admin/complaints"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Complaint Queue
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded">
              #{complaint.id.toUpperCase()}
            </span>
            <CategoryBadge category={complaint.category} />
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
            {complaint.department && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                Dept: {formatDepartment(complaint.department)}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            {complaint.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerAi}
            disabled={triggeringAi}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-teal-600 ${triggeringAi ? 'animate-spin' : ''}`} />
            {triggeringAi ? 'Analyzing AI...' : 'Re-run AI Analysis'}
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Lifecycle, Photos, AI Intelligence, Duplicate Clusters */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Tracker */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Audit Status Lifecycle
            </h2>
            <Timeline currentStatus={complaint.status} history={complaint.statusHistory || []} />
          </div>

          {/* AI Intelligence Dossier */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white p-6 rounded-2xl shadow-md space-y-5 border border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">CivicAI Intelligence Telemetry</h3>
                  <p className="text-[11px] text-teal-300/80">Machine classification, severity risk, and priority scoring</p>
                </div>
              </div>

              <button
                onClick={() => setShowCorrectionModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                Correct AI Prediction
              </button>
            </div>

            {ai ? (
              <div className="space-y-4">
                {/* Provider and Method Pill Row */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] pb-1">
                  {(() => {
                    const isGemini = (ai.provider === 'gemini' || ai.provider === 'gemini-vision') && complaint.assignmentMethod !== 'RULE_FALLBACK';
                    return (
                      <>
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold font-mono border ${
                          isGemini
                            ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          Provider: {isGemini ? 'Google Gemini Vision' : 'CivicAI Rule Fallback'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-700/80 text-slate-300 font-mono">
                          Model: {ai.modelName || (isGemini ? 'gemini-3.5-flash-lite' : 'civicai-nlp-rules-v2')}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                          Method: {complaint.assignmentMethod ? formatAssignmentMethod(complaint.assignmentMethod) : 'AI Auto'}
                        </span>
                        {(complaint.requiresHumanReview || ai.requiresHumanReview) && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                            ⚠ Human Review Required
                          </span>
                        )}
                        {ai.processingStatus === 'FALLBACK_COMPLETED' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 font-bold">
                            Fallback Active
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Predicted Category
                    </span>
                    <div className="text-sm font-bold text-teal-300">{formatCategory(ai.predictedCategory)}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">
                        Confidence: {(ai.categoryConfidence * 100).toFixed(0)}%
                      </span>
                      {ai.categoryConfidence < 0.60 && (
                        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[9px] font-bold">
                          Low Confidence
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Estimated Severity
                    </span>
                    <div className="text-sm font-bold text-amber-300">{ai.estimatedSeverity}</div>
                    <div className="text-[10px] text-slate-400">
                      Hazard Score: {ai.severityScore ?? 'N/A'}/100
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Priority Score
                    </span>
                    <div className="text-sm font-bold text-sky-300">
                      {ai.priorityScore}/100 ({ai.calculatedPriority})
                    </div>
                    <div className="text-[10px] text-slate-400">Multi-factor municipal index</div>
                  </div>
                </div>

                {/* Visual Findings & Evidence */}
                {(ai.visualDescription || (ai.visualEvidence && ai.visualEvidence.length > 0)) && (
                  <div className="bg-slate-800/90 p-4 rounded-xl border border-teal-500/30 space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Multimodal Visual Intelligence
                    </span>
                    {ai.visualDescription && (
                      <p className="text-slate-200 italic leading-relaxed">
                        &quot;{ai.visualDescription}&quot;
                      </p>
                    )}
                    {ai.visualEvidence && ai.visualEvidence.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] text-slate-400 uppercase block font-semibold mb-1">
                          Observable Concrete Visual Evidence:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                          {ai.visualEvidence.map((ev: string, idx: number) => (
                            <li key={idx}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanations */}
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-teal-300">Category Rationale: </span>
                    <span className="text-slate-300">{ai.categoryExplanation}</span>
                  </div>
                  <div>
                    <span className="font-bold text-amber-300">Severity Factors: </span>
                    <span className="text-slate-300">{ai.severityExplanation}</span>
                  </div>
                  <div>
                    <span className="font-bold text-sky-300">Priority Formula: </span>
                    <span className="text-slate-300">{ai.priorityExplanation}</span>
                  </div>
                  {complaint.assignmentReason && (
                    <div>
                      <span className="font-bold text-emerald-300">Department Routing: </span>
                      <span className="text-slate-300">{complaint.assignmentReason}</span>
                    </div>
                  )}
                  {ai.uncertaintyReason && (
                    <div className="text-amber-300 pt-1 border-t border-slate-700/60">
                      <span className="font-bold">Uncertainty Note: </span>
                      <span>{ai.uncertaintyReason}</span>
                    </div>
                  )}
                </div>

                {ai.isCorrected && (
                  <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl p-3 text-xs text-amber-200">
                    <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-400">
                      Audited Human Correction Applied
                    </span>
                    <span>
                      Corrected on {formatDate(ai.correctedAt!)}
                      {ai.correctionNotes ? ` — Note: ${ai.correctionNotes}` : ''}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-slate-400">No AI analysis data attached yet.</p>
                <button
                  onClick={handleTriggerAi}
                  disabled={triggeringAi}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Generate AI Telemetry Now
                </button>
              </div>
            )}
          </div>

          {/* Duplicate Candidates Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-teal-600" />
                Detected Duplicate Candidates ({duplicateCandidates.length})
              </h2>
              <span className="text-[11px] text-slate-400">Within 500m & semantic threshold</span>
            </div>

            {duplicateCandidates.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                No potential duplicate complaints identified in the immediate geographic vicinity.
              </p>
            ) : (
              <div className="space-y-3">
                {duplicateCandidates.map((dup) => (
                  <div
                    key={dup.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          #{dup.id.slice(0, 8).toUpperCase()}
                        </span>
                        <CategoryBadge category={dup.category} />
                        <StatusBadge status={dup.status} size="sm" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{dup.title}</h4>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                        <span>{dup.address}</span>
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                      <Link
                        href={`/admin/complaints/${dup.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-teal-50 hover:text-teal-700 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-sm transition-colors"
                      >
                        Inspect Candidate
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description & Photos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Description & Evidence
            </h2>
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>

            {complaint.images && complaint.images.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 block mb-3">
                  Attached Photographs ({complaint.images.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {complaint.images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={api.getImageUrl(img.imageUrl)}
                        alt="Citizen photograph"
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                      <a
                        href={api.getImageUrl(img.imageUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 p-1.5 bg-slate-950/80 hover:bg-slate-950 text-white rounded-lg text-xs flex items-center gap-1 shadow"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Full Screen
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Internal Administrative Notes */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              Administrative Notes Thread ({complaint.adminNotes?.length || 0})
            </h2>

            {/* Note Input */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Add confidential internal note, crew dispatch memo, or field verification remarks..."
                className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addingNote || !internalNote.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                  {addingNote ? 'Saving Note...' : 'Record Note'}
                </button>
              </div>
            </form>

            {/* Existing Notes Feed */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {(!complaint.adminNotes || complaint.adminNotes.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No internal administrative notes recorded yet.</p>
              ) : (
                complaint.adminNotes.map((note) => (
                  <div key={note.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="font-semibold text-slate-700">{note.admin?.name || 'Municipal Officer'}</span>
                      <span className="font-mono">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed">{note.note}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Actions (Status, Department, Citizen details, Location) */}
        <div className="space-y-6">
          {/* Action Box 1: Update Status */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              Update Incident Status
            </h3>

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Transition Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  <option value="SUBMITTED">SUBMITTED (Pending review)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Dispatched to field)</option>
                  <option value="RESOLVED">RESOLVED (Completed on site)</option>
                  <option value="REJECTED">REJECTED (Outside jurisdiction)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Status Change Audit Memo
                </label>
                <input
                  type="text"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g., Work crew assigned to patch road"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={updatingStatus || newStatus === complaint.status}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-40"
              >
                {updatingStatus ? 'Updating Status...' : 'Apply Status Update'}
              </button>
            </form>
          </div>

          {/* Action Box 2: Department Assignment */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              Assign Department
            </h3>

            <form onSubmit={handleAssignDept} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Responsible Agency
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value as Department)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800"
                >
                  <option value="ROAD_MAINTENANCE">Road Maintenance (Potholes, Asphalt)</option>
                  <option value="SANITATION">Sanitation (Garbage, Waste Dumps)</option>
                  <option value="WATER_SUPPLY">Water Supply (Pipelines, Leaks)</option>
                  <option value="DRAINAGE">Drainage (Storm Drains, Flooding)</option>
                  <option value="ELECTRICITY">Electricity (Streetlights, Poles)</option>
                  <option value="PUBLIC_WORKS">Public Works (Infrastructure, Footpaths)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Assignment Note (Optional)
                </label>
                <input
                  type="text"
                  value={deptNotes}
                  onChange={(e) => setDeptNotes(e.target.value)}
                  placeholder="e.g., Routing to Ward 4 supervisor"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={updatingDept}
                className="w-full py-2.5 px-4 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-40"
              >
                {updatingDept ? 'Assigning...' : 'Confirm Department Assignment'}
              </button>
            </form>
          </div>

          {/* Citizen Reporter Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              Citizen Reporter Details
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Name</span>
                <span className="font-bold text-slate-900">{complaint.citizen?.name || 'Verified Citizen'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Email</span>
                <span className="font-mono text-slate-700">{complaint.citizen?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reported Date</span>
                <span className="font-mono text-slate-700">{formatDate(complaint.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Location & GPS Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Geotag & Location</span>
              <MapPin className="w-3.5 h-3.5 text-teal-600" />
            </h3>

            <div className="space-y-2 text-xs">
              <p className="text-slate-800 font-medium leading-snug">{complaint.address}</p>

              {complaint.latitude && complaint.longitude && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="font-mono text-slate-500 text-[11px]">
                    Lat: {complaint.latitude}, Lon: {complaint.longitude}
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}#map=17/${complaint.latitude}/${complaint.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 w-full justify-center px-4 py-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in OpenStreetMap
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-teal-600" />
                Correct AI Prediction
              </h3>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAiCorrection} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjust Category
                </label>
                <select
                  value={correctedCategory}
                  onChange={(e) => setCorrectedCategory(e.target.value as ComplaintCategory)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjust Severity
                </label>
                <select
                  value={correctedSeverity}
                  onChange={(e) => setCorrectedSeverity(e.target.value as ComplaintSeverity)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reassign Municipal Department
                </label>
                <select
                  value={correctedDepartment}
                  onChange={(e) => setCorrectedDepartment(e.target.value as Department)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="ROAD_MAINTENANCE">Road Maintenance</option>
                  <option value="SANITATION">Sanitation</option>
                  <option value="WATER_SUPPLY">Water Supply</option>
                  <option value="DRAINAGE">Drainage</option>
                  <option value="ELECTRICITY">Electricity</option>
                  <option value="PUBLIC_WORKS">Public Works</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correction Reason / Audit Remarks
                </label>
                <textarea
                  rows={3}
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Explain why the model classification was adjusted (e.g. Photograph confirms underground water leak rather than surface rain accumulation)..."
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCorrection || !correctionReason.trim()}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {savingCorrection ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
