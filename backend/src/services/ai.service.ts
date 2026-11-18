import fs from 'fs';
import path from 'path';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintSeverity,
  Department,
  AssignmentMethod,
  AiProcessingStatus,
} from '@prisma/client';
import { config } from '../config';
import { departmentService } from './department.service';

const AI_BASE_URL = config.aiServiceUrl;
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '25000', 10); // 25s for vision processing

interface CandidateItem {
  id: string;
  title: string;
  description: string;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  createdAt?: string;
}

export interface AiPipelineResult {
  predictedCategory: ComplaintCategory;
  categoryConfidence: number;
  categoryExplanation: string;
  estimatedSeverity: ComplaintSeverity;
  severityScore: number;
  severityExplanation: string;
  priorityScore: number;
  calculatedPriority: ComplaintPriority;
  priorityExplanation: string;
  duplicateCandidateIds: string[];
  duplicateDetails: any;
  modelMetadata: any;
  // Sprint 3 additions:
  assignedDepartment: Department;
  assignmentMethod: AssignmentMethod;
  assignmentReason: string;
  processingStatus: AiProcessingStatus;
  provider: string;
  modelName: string;
  visualDescription?: string;
  visualEvidence?: string[];
  requiresHumanReview: boolean;
  uncertaintyReason?: string;
}

class AiService {
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await this.fetchWithTimeout(`${AI_BASE_URL}/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async classify(title: string, description: string, imagePath?: string) {
    try {
      const res = await this.fetchWithTimeout(`${AI_BASE_URL}/api/v1/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, image_path: imagePath }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      console.warn('[AiService] Classification call failed:', err.message);
    }
    return null;
  }

  async estimateSeverity(category: string, description: string, title = '', imagePath?: string) {
    try {
      const res = await this.fetchWithTimeout(`${AI_BASE_URL}/api/v1/severity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, title, description, image_path: imagePath }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      console.warn('[AiService] Severity estimation call failed:', err.message);
    }
    return null;
  }

  async findDuplicates(target: CandidateItem, candidates: CandidateItem[], radiusMeters = 500.0) {
    try {
      const res = await this.fetchWithTimeout(`${AI_BASE_URL}/api/v1/duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, candidates, radius_meters: radiusMeters }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      console.warn('[AiService] Duplicate detection call failed:', err.message);
    }
    return { target_id: target.id, duplicate_candidates_found: 0, duplicates: [] };
  }

  async calculatePriority(severity: string, category: string, duplicateCount = 0, createdAt?: string) {
    try {
      const res = await this.fetchWithTimeout(`${AI_BASE_URL}/api/v1/priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ severity, category, duplicate_count: duplicateCount, created_at: createdAt }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      console.warn('[AiService] Priority calculation call failed:', err.message);
    }
    return null;
  }

  async runFullAnalysis(
    complaint: {
      id?: string;
      title: string;
      description: string;
      category?: string;
      latitude?: number | null;
      longitude?: number | null;
      createdAt?: Date | string;
      imagePath?: string;
      imageBase64?: string;
      imageMime?: string;
    },
    candidates: CandidateItem[] = []
  ): Promise<AiPipelineResult> {
    // Read image bytes if imagePath is provided but base64 is missing
    let base64Image = complaint.imageBase64;
    let mime = complaint.imageMime || 'image/jpeg';

    if (!base64Image && complaint.imagePath) {
      try {
        const filename = path.basename(complaint.imagePath);
        const resolvedPath = path.join(config.uploadDir, filename);
        if (fs.existsSync(resolvedPath)) {
          const fileBuf = fs.readFileSync(resolvedPath);
          base64Image = fileBuf.toString('base64');
          const ext = path.extname(filename).toLowerCase();
          if (ext === '.png') mime = 'image/png';
          else if (ext === '.webp') mime = 'image/webp';
          else mime = 'image/jpeg';
        }
      } catch (e: any) {
        console.warn('[AiService] Could not read image for multimodal analysis:', e.message);
      }
    }

    try {
      const res = await this.fetchWithTimeout(`${AI_BASE_URL}/api/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: complaint.title,
          description: complaint.description,
          category: complaint.category,
          latitude: complaint.latitude ? Number(complaint.latitude) : null,
          longitude: complaint.longitude ? Number(complaint.longitude) : null,
          created_at: complaint.createdAt ? new Date(complaint.createdAt).toISOString() : new Date().toISOString(),
          image_path: complaint.imagePath,
          image_base64: base64Image,
          image_mime: mime,
          candidates,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const duplicates = data.duplicates || [];
        const duplicateIds = duplicates.map((d: any) => d.complaint_id).filter(Boolean);

        const predictedCategory =
          (data.classification?.predicted_category as ComplaintCategory) ||
          (complaint.category as ComplaintCategory) ||
          ComplaintCategory.OTHER;

        const aiDeptSuggestion = data.department_assignment?.department;
        const resolvedDept = departmentService.validateAndResolveDepartment(aiDeptSuggestion, predictedCategory);

        const isFallback =
          data.provider === 'rule-fallback' ||
          data.classification?.provider === 'rule-fallback' ||
          data.department_assignment?.is_fallback === true ||
          data.department_assignment?.assignment_method === 'RULE_FALLBACK';

        const assignmentMethod = isFallback ? AssignmentMethod.RULE_FALLBACK : AssignmentMethod.AI_AUTO;
        const processingStatus = isFallback ? AiProcessingStatus.FALLBACK_COMPLETED : AiProcessingStatus.COMPLETED;
        const fallbackReason = data.fallback_reason || data.classification?.fallback_reason;
        const aiProvider = isFallback ? 'rule-fallback' : (data.provider || data.classification?.provider || 'gemini');
        const aiModel = isFallback
          ? 'civicai-nlp-rules-v2'
          : (data.classification?.model_name || data.classification?.method || 'gemini-3.5-flash-lite');

        return {
          predictedCategory,
          categoryConfidence: data.classification?.confidence ?? 0.8,
          categoryExplanation: data.classification?.explanation || 'Category classified by CivicAI Intelligence engine.',
          estimatedSeverity: (data.severity?.severity as ComplaintSeverity) || ComplaintSeverity.MEDIUM,
          severityScore: data.severity?.severity_score ?? 50.0,
          severityExplanation: data.severity?.explanation || 'Severity estimated by CivicAI multi-factor engine.',
          priorityScore: data.priority?.priority_score ?? 50.0,
          calculatedPriority: (data.priority?.priority as ComplaintPriority) || ComplaintPriority.MEDIUM,
          priorityExplanation: data.priority?.explanation || 'Priority calculated from multi-factor municipal urgency.',
          duplicateCandidateIds: duplicateIds,
          duplicateDetails: duplicates,
          modelMetadata: {
            method: data.classification?.method,
            provider: aiProvider,
            model_name: aiModel,
            fallback_reason: fallbackReason,
            key_indicators: data.classification?.key_indicators || data.classification?.visual_evidence,
            severity_factors: data.severity?.factors,
            priority_factors: data.priority?.factors,
            visual_description: data.classification?.visual_description,
            visual_evidence: data.classification?.visual_evidence,
            analyzedAt: new Date().toISOString(),
          },
          assignedDepartment: resolvedDept.department,
          assignmentMethod,
          assignmentReason: data.department_assignment?.assignment_reason || `Assigned to ${resolvedDept.departmentName}`,
          processingStatus,
          provider: aiProvider,
          modelName: aiModel,
          visualDescription: data.classification?.visual_description || 'Visual inspection processed.',
          visualEvidence: data.classification?.visual_evidence || [],
          requiresHumanReview: Boolean(data.requires_human_review),
          uncertaintyReason: fallbackReason || data.department_assignment?.uncertainty_reason || undefined,
        };
      }
    } catch (err: any) {
      console.warn('[AiService] Unified multimodal analysis failed or timed out:', err.message);
    }

    // Resilient fallback defaults (ALWAYS ASSIGN POLICY)
    const fallbackCategory = (complaint.category as ComplaintCategory) || ComplaintCategory.OTHER;
    const fallbackDept = departmentService.getDepartmentForCategory(fallbackCategory);

    return {
      predictedCategory: fallbackCategory,
      categoryConfidence: 0.5,
      categoryExplanation: 'CivicAI fallback classifier engaged; verified default municipal heuristic.',
      estimatedSeverity: ComplaintSeverity.MEDIUM,
      severityScore: 35.0,
      severityExplanation: 'Standard default severity triage score.',
      priorityScore: 35.0,
      calculatedPriority: ComplaintPriority.MEDIUM,
      priorityExplanation: 'Standard initial queue priority.',
      duplicateCandidateIds: [],
      duplicateDetails: [],
      modelMetadata: { fallback: true, analyzedAt: new Date().toISOString() },
      assignedDepartment: fallbackDept,
      assignmentMethod: AssignmentMethod.RULE_FALLBACK,
      assignmentReason: `Assigned to ${fallbackDept} via CivicAI deterministic fallback routing rule.`,
      processingStatus: AiProcessingStatus.FALLBACK_COMPLETED,
      provider: 'rule-fallback',
      modelName: 'civicai-nlp-rules-v2',
      visualDescription: complaint.imagePath ? 'Image cataloged for review; processed via local fallback.' : 'No photograph provided.',
      visualEvidence: [],
      requiresHumanReview: true,
      uncertaintyReason: 'AI service unavailable or timed out; assigned via deterministic fallback rule.',
    };
  }
}

export const aiService = new AiService();
