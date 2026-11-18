'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Complaint } from '@/types';
import { formatDate, formatCategory, formatDepartment, formatAssignmentMethod } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';
import CategoryBadge from '@/components/CategoryBadge';
import Timeline from '@/components/Timeline';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  AlertTriangle,
  Info,
  ShieldAlert,
  User,
  ExternalLink,
  Layers,
  Building2,
  Sparkles,
  Eye,
  ShieldCheck,
} from 'lucide-react';

export default function ComplaintDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const id = params?.id as string;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchComplaint() {
      if (!id || !user) return;
      try {
        setLoading(true);
        setError(null);
        const res: any = await api.get(`/api/complaints/${id}`);
        if (res.success && res.data?.complaint) {
          setComplaint(res.data.complaint);
        } else {
          setError(res.message || 'Complaint details not found.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve complaint.');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchComplaint();
    }
  }, [id, user]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading complaint record #{id?.slice(0, 8)}...</p>
        </div>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Unable to load complaint</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">{error || 'Record does not exist or you do not have permission.'}</p>
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      {/* Navigation header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Complaints
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded">
                COMPLAINT #{complaint.id.toUpperCase()}
              </span>
              <CategoryBadge category={complaint.category} />
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {complaint.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Complaint Details & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Tracker Card */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
              Resolution Lifecycle Tracker
            </h2>
            <Timeline
              currentStatus={complaint.status}
              history={complaint.statusHistory || []}
            />
          </div>

          {/* Description Card */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-400">
              Description & Hazard Extent
            </h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>
          </div>

          {/* Photos Card */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Photo Evidence ({complaint.images?.length || 0})
            </h2>

            {complaint.images && complaint.images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {complaint.images.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={api.getImageUrl(img.imageUrl)}
                      alt="Complaint attachment"
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    <a
                      href={api.getImageUrl(img.imageUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 p-1.5 bg-slate-950/80 hover:bg-slate-950 text-white rounded-lg text-xs flex items-center gap-1 shadow"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Full Size
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No photographs attached for this record.</p>
            )}
          </div>
        </div>

        {/* Right Column: Meta Information */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
              Complaint Metadata
            </h3>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Reported Date
              </span>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 mt-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                {formatDate(complaint.createdAt)}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Severity Rating
              </span>
              <div className="text-sm font-semibold text-slate-800 mt-1">
                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono">
                  {complaint.severity}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Assigned Priority
              </span>
              <div className="mt-1">
                <PriorityBadge priority={complaint.priority} />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Reported By
              </span>
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 mt-1">
                <User className="w-4 h-4 text-slate-400" />
                {complaint.citizen?.name || 'Current Citizen User'}
              </div>
            </div>
          </div>

          {/* Location & Map Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Location Details</span>
              <MapPin className="w-4 h-4 text-teal-600" />
            </h3>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Street Address / Landmark
              </span>
              <p className="text-sm text-slate-800 font-medium mt-1 leading-snug">
                {complaint.address}
              </p>
            </div>

            {complaint.latitude && complaint.longitude && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="text-xs text-slate-500 font-mono">
                  Coordinates: {complaint.latitude}, {complaint.longitude}
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}#map=16/${complaint.latitude}/${complaint.longitude}`}
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

          {/* Municipal Department Assignment & AI Triage Details */}
          <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>AI Municipal Routing</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {complaint.assignmentMethod ? formatAssignmentMethod(complaint.assignmentMethod) : 'AI Automatic'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Assigned Department
                </span>
                <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-teal-400" />
                  {formatDepartment(complaint.department)}
                </div>
              </div>

              {complaint.assignmentReason && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Routing Justification
                  </span>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">
                    {complaint.assignmentReason}
                  </p>
                </div>
              )}

              {complaint.aiAnalysis && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Intelligence Provider
                    </span>
                    <span className={`text-[11px] font-mono font-bold ${
                      complaint.aiAnalysis.provider === 'gemini' || complaint.aiAnalysis.provider === 'gemini-vision'
                        ? 'text-teal-300'
                        : 'text-amber-300'
                    }`}>
                      {complaint.aiAnalysis.provider === 'gemini' || complaint.aiAnalysis.provider === 'gemini-vision'
                        ? 'Google Gemini Vision'
                        : 'CivicAI Rule Fallback'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      Model Confidence
                    </span>
                    <span className="text-teal-400 font-mono font-bold">
                      {Math.round((complaint.aiAnalysis.categoryConfidence ?? 0.8) * 100)}%
                    </span>
                  </div>

                  {complaint.aiAnalysis.visualDescription && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Visual Finding
                      </span>
                      <p className="text-slate-300 mt-0.5 italic">
                        &quot;{complaint.aiAnalysis.visualDescription}&quot;
                      </p>
                    </div>
                  )}

                  {complaint.aiAnalysis.visualEvidence && complaint.aiAnalysis.visualEvidence.length > 0 && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Observed Evidence
                      </span>
                      <ul className="list-disc list-inside text-slate-400 mt-1 space-y-0.5 text-[11px]">
                        {complaint.aiAnalysis.visualEvidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
