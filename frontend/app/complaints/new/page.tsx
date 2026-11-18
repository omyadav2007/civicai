'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import LocationPicker from '@/components/LocationPicker';
import {
  ShieldAlert,
  UploadCloud,
  X,
  FileImage,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Send,
  Info,
  Sparkles,
  Building2,
  Eye,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { formatCategory, formatDepartment, formatAssignmentMethod } from '@/lib/utils';

export default function NewComplaintPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('POTHOLE');
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    address: string;
  }>({
    latitude: null,
    longitude: null,
    address: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    complaint: any;
    aiAnalysis?: any;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Handle image selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Selected image exceeds the 5MB file limit. Please select a smaller file.');
        return;
      }

      // Validate type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Invalid image format. Only JPG, JPEG, PNG, and WebP images are allowed.');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (title.trim().length < 5) {
      setError('Title must be at least 5 characters long.');
      return;
    }

    if (description.trim().length < 15) {
      setError('Description must be at least 15 characters long to provide sufficient detail.');
      return;
    }

    if (!location.address.trim() || location.address.trim().length < 5) {
      setError('Please provide a valid street address or landmark for the issue.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('address', location.address.trim());

      if (location.latitude !== null && location.latitude !== undefined) {
        formData.append('latitude', location.latitude.toString());
      }
      if (location.longitude !== null && location.longitude !== undefined) {
        formData.append('longitude', location.longitude.toString());
      }

      if (selectedFile) {
        formData.append('images', selectedFile);
      }

      const response: any = await api.post('/api/complaints', formData, true);

      if (response.success && response.data?.complaint) {
        setSubmissionResult({
          complaint: response.data.complaint,
          aiAnalysis: response.data.aiAnalysis,
        });
        setSubmitting(false);
      } else {
        setError(response.message || 'Submission failed. Please verify the form fields.');
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint. Server error.');
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (submissionResult) {
    const { complaint, aiAnalysis } = submissionResult;
    const isGemini =
      (aiAnalysis?.provider === 'gemini' || aiAnalysis?.provider === 'gemini-vision') &&
      complaint.assignmentMethod !== 'RULE_FALLBACK' &&
      aiAnalysis?.processingStatus !== 'FALLBACK_COMPLETED';
    const confidencePct = Math.round((aiAnalysis?.categoryConfidence ?? 0.85) * 100);

    return (
      <div className="flex-1 bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 space-y-2 border-b border-slate-800">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
              isGemini
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              {isGemini ? 'Google Gemini Vision Analysis Completed' : 'CivicAI Rule-Based Fallback Pipeline'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isGemini ? 'Complaint Analyzed & Assigned via Gemini' : 'Complaint Submitted & Assigned via Fallback'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {isGemini
                ? `Google Gemini Vision multimodal model (${aiAnalysis?.modelName || 'gemini-3.5-flash-lite'}) inspected your photographic evidence and automatically routed the incident.`
                : (aiAnalysis?.uncertaintyReason || "Your complaint has been submitted and automatically assigned using CivicAI's fallback classification system.")}
            </p>
          </div>

          {/* Results Grid */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Detected Issue
                </span>
                <div className="text-base font-extrabold text-slate-900">
                  {formatCategory(complaint.category)}
                </div>
                <div className="text-xs text-teal-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  AI Confidence: {confidencePct}%
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Severity Rating
                </span>
                <div className="text-base font-extrabold text-amber-700">
                  {complaint.severity || 'MEDIUM'} Severity
                </div>
                <div className="text-xs text-slate-500">
                  Priority: {complaint.priority}
                </div>
              </div>

              <div className="sm:col-span-2 bg-teal-50/60 p-5 rounded-2xl border border-teal-200/80 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-teal-600" />
                    Assigned Municipal Department
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-800 font-mono">
                    {formatAssignmentMethod(complaint.assignmentMethod)}
                  </span>
                </div>
                <div className="text-lg font-black text-teal-950">
                  {formatDepartment(complaint.department)}
                </div>
                <p className="text-xs text-teal-800/90 leading-relaxed">
                  <span className="font-semibold">Reason: </span>
                  {complaint.assignmentReason || aiAnalysis?.categoryExplanation || 'Dispatched for priority municipal field verification.'}
                </p>
              </div>
            </div>

            {/* Low Confidence Warning */}
            {confidencePct < 70 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Low AI Confidence Warning ({confidencePct}%)
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  The visual evidence is ambiguous or photographic proof is indistinct. This report has been flagged for mandatory human field review by municipal dispatchers.
                </p>
              </div>
            )}

            {/* Visual Evidence */}
            {aiAnalysis?.visualEvidence && aiAnalysis.visualEvidence.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  Observable Visual Evidence in Photo
                </span>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  {aiAnalysis.visualEvidence.map((ev: string, idx: number) => (
                    <li key={idx}>{ev}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tracking Button */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-400 font-mono">
                Complaint ID: #{complaint.id.slice(0, 8)}
              </span>
              <button
                onClick={() => router.push(`/complaints/${complaint.id}`)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl shadow-md transition-all"
              >
                View Full Tracking Details
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <span className="text-xs font-semibold text-teal-600 uppercase tracking-widest">
          Civic Incident Reporting
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Report a Civic Problem
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Provide accurate details, photo evidence, and location to ensure prompt municipal action.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2.5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Issue Basic Details */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center">
              1
            </span>
            Complaint Overview
          </h2>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Complaint Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Deep dangerous pothole opposite Sector 4 main junction"
              className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800"
            >
              <optgroup label="Garbage & Waste Management">
                <option value="OVERFLOWING_DUSTBIN">Overflowing Dustbin (Waste spilling from bin onto street)</option>
                <option value="ILLEGAL_GARBAGE_DUMPING">Illegal Garbage Dumping (Unauthorized waste dumping on plot/road)</option>
                <option value="UNCOLLECTED_GARBAGE">Uncollected Garbage (Household/commercial waste piling up)</option>
                <option value="GARBAGE_BLOCKING_DRAIN">Garbage Blocking Drainage (Solid waste clogging gutter/culvert)</option>
                <option value="OPEN_GARBAGE_DUMP">Open Garbage Dump (Large uncontrolled garbage wasteland)</option>
                <option value="MISSED_GARBAGE_COLLECTION">Missed Garbage Collection (Sanitation truck skipped route)</option>
                <option value="GENERAL_WASTE_MANAGEMENT">General Waste Management (Street sweeping & scattered litter)</option>
                <option value="GARBAGE">General Garbage Dump (Unspecified waste issue)</option>
              </optgroup>
              <optgroup label="Civic Infrastructure & Roads">
                <option value="POTHOLE">Pothole (Road depressions & cavities)</option>
                <option value="ROAD_DAMAGE">Road Damage (Subsidence / broken divider / sidewalk)</option>
                <option value="WATER_LEAKAGE">Water Leakage (Pipeline fracture / main leak)</option>
                <option value="DRAINAGE">Drainage (Clogged storm drain / overflow)</option>
                <option value="STREETLIGHT">Streetlight (Dark streetlight / electric pole hazard)</option>
                <option value="OTHER">Other Civic Hazard</option>
              </optgroup>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Detailed Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the hazard extent, how long it has persisted, and if it poses immediate pedestrian or vehicle risks..."
              className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum 15 characters. Clear descriptions assist field dispatch.
            </p>
          </div>
        </div>

        {/* Section 2: Photo Evidence */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center">
              2
            </span>
            Photo Evidence
          </h2>

          <div className="space-y-3">
            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/60 hover:bg-teal-50/20"
              >
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  Click to select photo or take camera snapshot
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports JPG, JPEG, PNG, WebP up to 5MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center max-h-[360px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="object-contain max-h-[360px] w-full"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full transition-colors shadow-lg"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-3 bg-slate-900/80 text-white text-[11px] px-2.5 py-1 rounded-md">
                  {selectedFile?.name} ({(selectedFile?.size! / (1024 * 1024)).toFixed(2)} MB)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Location */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center">
              3
            </span>
            Location & Geotag
          </h2>

          <LocationPicker
            latitude={location.latitude}
            longitude={location.longitude}
            address={location.address}
            onChange={setLocation}
          />
        </div>

        {/* Google Gemini Vision AI Triage & Privacy Notice */}
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3 text-xs text-sky-900">
          <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Google Gemini Vision & Automatic Dispatch Notice:</span> Uploaded photographs and complaint descriptions are securely analyzed using Google's Gemini Vision multimodal intelligence to identify visible civic defects, verify category, and automatically assign the incident to the appropriate municipal department without delay.
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="px-7 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting Complaint...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Civic Complaint
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
