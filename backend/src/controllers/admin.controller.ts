import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import {
  updateStatusSchema,
  assignDepartmentSchema,
  addNoteSchema,
  correctAiSchema,
} from '../validators/admin.validator';
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintSeverity,
  ComplaintStatus,
  Department,
  AssignmentMethod,
  AiProcessingStatus,
} from '@prisma/client';
import { aiService } from '../services/ai.service';

/**
 * 1. Admin Dashboard KPI Statistics and Recent Activity
 */
export const getAdminDashboardStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalCount,
      submittedCount,
      inProgressCount,
      resolvedCount,
      rejectedCount,
      highPriorityCount,
      statusGroups,
      categoryGroups,
      priorityGroups,
      departmentGroups,
      duplicateCandidateCount,
      aiAutoAssignedCount,
      fallbackAssignedCount,
      requiresReviewCount,
      processingFailuresCount,
      recentComplaints,
    ] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: ComplaintStatus.SUBMITTED } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.IN_PROGRESS } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.RESOLVED } }),
      prisma.complaint.count({ where: { status: ComplaintStatus.REJECTED } }),
      prisma.complaint.count({ where: { priority: ComplaintPriority.HIGH } }),
      prisma.complaint.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.complaint.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
      prisma.complaint.groupBy({
        by: ['priority'],
        _count: { priority: true },
      }),
      prisma.complaint.groupBy({
        by: ['department'],
        _count: { department: true },
      }),
      // Count complaints that have duplicate candidate references
      prisma.aiAnalysis.count({
        where: {
          duplicateCandidateIds: {
            isEmpty: false,
          },
        },
      }),
      // Sprint 3: Assignment & Review statistics from real DB records
      prisma.complaint.count({ where: { assignmentMethod: AssignmentMethod.AI_AUTO } }),
      prisma.complaint.count({ where: { assignmentMethod: AssignmentMethod.RULE_FALLBACK } }),
      prisma.complaint.count({ where: { requiresHumanReview: true } }),
      prisma.aiAnalysis.count({ where: { processingStatus: AiProcessingStatus.FAILED } }),
      prisma.complaint.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          citizen: {
            select: { id: true, name: true, email: true },
          },
          images: { take: 1 },
          aiAnalysis: {
            select: {
              priorityScore: true,
              duplicateCandidateIds: true,
              provider: true,
              modelName: true,
              visualDescription: true,
              processingStatus: true,
              requiresHumanReview: true,
            },
          },
        },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        kpi: {
          total: totalCount,
          submitted: submittedCount,
          inProgress: inProgressCount,
          resolved: resolvedCount,
          rejected: rejectedCount,
          highPriority: highPriorityCount,
          duplicateCandidates: duplicateCandidateCount,
          // Sprint 3 KPIs
          aiAutoAssigned: aiAutoAssignedCount,
          fallbackAssigned: fallbackAssignedCount,
          requiresReview: requiresReviewCount,
          processingFailures: processingFailuresCount,
        },
        distributions: {
          status: statusGroups.map((g) => ({ status: g.status, count: g._count.status })),
          category: categoryGroups.map((g) => ({ category: g.category, count: g._count.category })),
          priority: priorityGroups.map((g) => ({ priority: g.priority, count: g._count.priority })),
          department: departmentGroups.map((g) => ({
            department: g.department || 'UNASSIGNED',
            count: g._count.department,
          })),
        },
        recentComplaints,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get All Complaints with Advanced Filters, Search, Sorting, and Pagination
 */
export const getAdminComplaints = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      status,
      category,
      severity,
      priority,
      department,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '15',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 15));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    if (status && Object.values(ComplaintStatus).includes(status as ComplaintStatus)) {
      where.status = status as ComplaintStatus;
    }

    if (category && Object.values(ComplaintCategory).includes(category as ComplaintCategory)) {
      where.category = category as ComplaintCategory;
    }

    if (severity && Object.values(ComplaintSeverity).includes(severity as ComplaintSeverity)) {
      where.severity = severity as ComplaintSeverity;
    }

    if (priority && Object.values(ComplaintPriority).includes(priority as ComplaintPriority)) {
      where.priority = priority as ComplaintPriority;
    }

    if (department) {
      if (department === 'UNASSIGNED') {
        where.department = null;
      } else if (Object.values(Department).includes(department as Department)) {
        where.department = department as Department;
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { citizen: { name: { contains: q, mode: 'insensitive' } } },
        { citizen: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const validSortFields = ['createdAt', 'updatedAt', 'priority', 'severity', 'status'];
    const orderByField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const orderDirection = (sortOrder as string).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, complaints] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        include: {
          citizen: {
            select: { id: true, name: true, email: true },
          },
          images: true,
          aiAnalysis: {
            select: {
              predictedCategory: true,
              estimatedSeverity: true,
              priorityScore: true,
              duplicateCandidateIds: true,
              isCorrected: true,
            },
          },
        },
        orderBy: { [orderByField]: orderDirection },
        skip,
        take,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        complaints,
        pagination: {
          total,
          page: pageNum,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get Full Complaint Dossier for Admin
 */
export const getAdminComplaintById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        citizen: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
        images: true,
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { changedAt: 'asc' },
        },
        adminNotes: {
          include: {
            admin: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        aiAnalysis: true,
      },
    });

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    // Fetch duplicate candidate previews if any exist
    let duplicateCandidates: any[] = [];
    if (complaint.aiAnalysis?.duplicateCandidateIds?.length) {
      duplicateCandidates = await prisma.complaint.findMany({
        where: {
          id: { in: complaint.aiAnalysis.duplicateCandidateIds },
        },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          priority: true,
          address: true,
          createdAt: true,
          citizen: {
            select: { name: true },
          },
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        complaint,
        duplicateCandidates,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update Complaint Status (Lifecycle: SUBMITTED -> IN_PROGRESS -> RESOLVED / REJECTED)
 */
export const updateComplaintStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status: newStatus, notes } = updateStatusSchema.parse(req.body);

    const existing = await prisma.complaint.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    const previousStatus = existing.status;

    // Check current complaint status before updating
    // If requested status equals current status, return 409 Conflict and do not create a StatusHistory entry
    if (previousStatus === newStatus) {
      res.status(409).json({
        success: false,
        message: `Complaint is already in '${newStatus}' status. No transition occurred.`,
      });
      return;
    }

    // Execute state update and audit log in a transaction with concurrency protection
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Re-read within transaction to prevent race conditions during concurrent updates
        const current = await tx.complaint.findUnique({
          where: { id },
          select: { id: true, status: true },
        });

        if (!current) {
          throw new Error('COMPLAINT_NOT_FOUND');
        }

        if (current.status === (newStatus as ComplaintStatus)) {
          throw new Error('STATUS_CONFLICT');
        }

        const complaint = await tx.complaint.update({
          where: { id },
          data: { status: newStatus as ComplaintStatus },
        });

        await tx.complaintStatusHistory.create({
          data: {
            complaintId: id,
            previousStatus: current.status,
            newStatus: newStatus as ComplaintStatus,
            changedById: req.user?.id,
            notes: notes?.trim() || null,
          },
        });

        return { complaint, previousStatus: current.status };
      });

      res.status(200).json({
        success: true,
        message: `Complaint status updated from ${result.previousStatus} to ${newStatus}.`,
        data: { complaint: result.complaint },
      });
    } catch (txError: any) {
      if (txError.message === 'STATUS_CONFLICT') {
        res.status(409).json({
          success: false,
          message: `Complaint is already in '${newStatus}' status. No transition occurred.`,
        });
        return;
      }
      if (txError.message === 'COMPLAINT_NOT_FOUND') {
        res.status(404).json({ success: false, message: 'Complaint not found.' });
        return;
      }
      throw txError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Assign Department
 */
export const assignDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { department, notes } = assignDepartmentSchema.parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.update({
        where: { id },
        data: {
          department: department as Department,
          assignmentMethod: AssignmentMethod.MANUAL,
          assignedAt: new Date(),
          assignmentReason: notes?.trim() || `Manual reassignment to ${department}.`,
          requiresHumanReview: false,
        },
      });

      // Update AI analysis record if present
      await tx.aiAnalysis.updateMany({
        where: { complaintId: id },
        data: {
          isCorrected: true,
          correctedDepartment: department as Department,
          correctedBy: req.user!.id,
          correctedAt: new Date(),
          correctionNotes: notes?.trim() || null,
          requiresHumanReview: false,
        },
      });

      // Record an auditable admin note indicating department assignment
      const noteText = notes
        ? `Manual department reassignment to ${department}. Notes: ${notes.trim()}`
        : `Manual department reassignment to ${department}.`;

      await tx.adminNote.create({
        data: {
          complaintId: id,
          adminId: req.user!.id,
          note: noteText,
        },
      });

      return complaint;
    });

    res.status(200).json({
      success: true,
      message: `Complaint successfully assigned to ${department}.`,
      data: { complaint: updated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Add Administrative Internal Note
 */
export const addAdminNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { note } = addNoteSchema.parse(req.body);

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    const createdNote = await prisma.adminNote.create({
      data: {
        complaintId: id,
        adminId: req.user!.id,
        note: note.trim(),
      },
      include: {
        admin: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Admin note recorded successfully.',
      data: { note: createdNote },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Manually Trigger or Re-Run AI Analysis for a Complaint
 */
export const triggerAiAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!complaint) {
      res.status(404).json({ success: false, message: 'Complaint not found.' });
      return;
    }

    // Get other complaints as duplicate candidates (limit to recent 50)
    const candidates = await prisma.complaint.findMany({
      where: { id: { not: id } },
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        latitude: true,
        longitude: true,
        status: true,
        createdAt: true,
      },
    });

    const candidateItems = candidates.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      latitude: c.latitude ? Number(c.latitude) : null,
      longitude: c.longitude ? Number(c.longitude) : null,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    }));

    const firstImage = complaint.images?.[0];
    const imagePath = firstImage ? firstImage.imageUrl : undefined;

    const aiResult = await aiService.runFullAnalysis(
      {
        id: complaint.id,
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        latitude: complaint.latitude ? Number(complaint.latitude) : null,
        longitude: complaint.longitude ? Number(complaint.longitude) : null,
        createdAt: complaint.createdAt,
        imagePath,
      },
      candidateItems
    );

    if (!aiResult) {
      res.status(503).json({
        success: false,
        message: 'AI Analysis service currently unavailable. Please verify FastAPI service is running.',
      });
      return;
    }

    // Upsert AiAnalysis record in database
    const analysis = await prisma.aiAnalysis.upsert({
      where: { complaintId: id },
      create: {
        complaintId: id,
        predictedCategory: aiResult.predictedCategory,
        categoryConfidence: aiResult.categoryConfidence,
        categoryExplanation: aiResult.categoryExplanation,
        estimatedSeverity: aiResult.estimatedSeverity,
        severityScore: aiResult.severityScore,
        severityExplanation: aiResult.severityExplanation,
        priorityScore: aiResult.priorityScore,
        calculatedPriority: aiResult.calculatedPriority,
        priorityExplanation: aiResult.priorityExplanation,
        duplicateCandidateIds: aiResult.duplicateCandidateIds,
        duplicateDetails: aiResult.duplicateDetails,
        modelMetadata: aiResult.modelMetadata,
        provider: aiResult.provider,
        modelName: aiResult.modelName,
        visualDescription: aiResult.visualDescription,
        visualEvidence: aiResult.visualEvidence,
        processingStatus: aiResult.processingStatus,
        requiresHumanReview: aiResult.requiresHumanReview,
        uncertaintyReason: aiResult.uncertaintyReason,
      },
      update: {
        predictedCategory: aiResult.predictedCategory,
        categoryConfidence: aiResult.categoryConfidence,
        categoryExplanation: aiResult.categoryExplanation,
        estimatedSeverity: aiResult.estimatedSeverity,
        severityScore: aiResult.severityScore,
        severityExplanation: aiResult.severityExplanation,
        priorityScore: aiResult.priorityScore,
        calculatedPriority: aiResult.calculatedPriority,
        priorityExplanation: aiResult.priorityExplanation,
        duplicateCandidateIds: aiResult.duplicateCandidateIds,
        duplicateDetails: aiResult.duplicateDetails,
        modelMetadata: aiResult.modelMetadata,
        provider: aiResult.provider,
        modelName: aiResult.modelName,
        visualDescription: aiResult.visualDescription,
        visualEvidence: aiResult.visualEvidence,
        processingStatus: aiResult.processingStatus,
        requiresHumanReview: aiResult.requiresHumanReview,
        uncertaintyReason: aiResult.uncertaintyReason,
      },
    });

    // Update complaint priority, severity, and department routing if not manually assigned
    await prisma.complaint.update({
      where: { id },
      data: {
        priority: aiResult.calculatedPriority,
        severity: aiResult.estimatedSeverity,
        ...(complaint.assignmentMethod !== AssignmentMethod.MANUAL
          ? {
              department: aiResult.assignedDepartment,
              assignmentMethod: aiResult.assignmentMethod,
              assignmentReason: aiResult.assignmentReason,
              assignedAt: new Date(),
            }
          : {}),
      },
    });

    res.status(200).json({
      success: true,
      message: 'AI intelligence analysis completed and saved.',
      data: { analysis },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Admin Correction of AI Prediction (Stores human audit correction)
 */
export const correctAiAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { category, severity, department, notes } = correctAiSchema.parse(req.body);

    const existingAnalysis = await prisma.aiAnalysis.findUnique({
      where: { complaintId: id },
    });

    if (!existingAnalysis) {
      res.status(404).json({
        success: false,
        message: 'No existing AI analysis record found for this complaint to correct.',
      });
      return;
    }

    const updatedAnalysis = await prisma.$transaction(async (tx) => {
      const analysis = await tx.aiAnalysis.update({
        where: { complaintId: id },
        data: {
          isCorrected: true,
          correctedCategory: category as ComplaintCategory | undefined,
          correctedSeverity: severity as ComplaintSeverity | undefined,
          correctedDepartment: department as Department | undefined,
          correctedBy: req.user?.id,
          correctedAt: new Date(),
          correctionNotes: notes?.trim() || null,
          requiresHumanReview: false,
        },
      });

      // Update complaint entity with corrected values if specified
      const complaintUpdateData: any = {
        requiresHumanReview: false,
      };
      if (category) complaintUpdateData.category = category as ComplaintCategory;
      if (severity) complaintUpdateData.severity = severity as ComplaintSeverity;
      if (department) {
        complaintUpdateData.department = department as Department;
        complaintUpdateData.assignmentMethod = AssignmentMethod.MANUAL;
        complaintUpdateData.assignedAt = new Date();
        complaintUpdateData.assignmentReason = notes?.trim() || `Administrative override to ${department}.`;
      }

      await tx.complaint.update({
        where: { id },
        data: complaintUpdateData,
      });

      await tx.adminNote.create({
        data: {
          complaintId: id,
          adminId: req.user!.id,
          note: `Admin corrected AI predictions: ${[
            category ? `Category -> ${category}` : null,
            severity ? `Severity -> ${severity}` : null,
            department ? `Department -> ${department}` : null,
            notes ? `Reason: ${notes}` : null,
          ]
            .filter(Boolean)
            .join(', ')}`,
        },
      });

      return analysis;
    });

    res.status(200).json({
      success: true,
      message: 'AI prediction corrected and logged for future model tuning.',
      data: { analysis: updatedAnalysis },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 9. Admin Analytics
 */
export const getAdminAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const complaints = await prisma.complaint.findMany({
      select: {
        id: true,
        createdAt: true,
        status: true,
        category: true,
        priority: true,
        department: true,
        statusHistory: {
          select: { newStatus: true, changedAt: true },
          orderBy: { changedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Compute accurate average resolution turnaround from original submission to resolution
    let totalResolutionHours = 0;
    let totalResolutionMinutes = 0;
    let resolvedCount = 0;

    complaints.forEach((c) => {
      // Exclude unresolved complaints from average turnaround calculation
      if (c.status !== ComplaintStatus.RESOLVED) return;

      // Find the FIRST resolution event in audit history (not later unrelated status transitions)
      const resolvedHistories = (c.statusHistory || []).filter(
        (h) => h.newStatus === ComplaintStatus.RESOLVED
      );

      if (resolvedHistories.length === 0) return;

      // Earliest resolution timestamp
      const firstResolution = resolvedHistories[0];
      const resTime = new Date(firstResolution.changedAt).getTime();

      // Original submission timestamp:
      // Earliest of c.createdAt and earliest statusHistory record (properly captures seeded/historical submissions)
      const allHistoryTimes = (c.statusHistory || []).map((h) => new Date(h.changedAt).getTime());
      const submissionTime = Math.min(new Date(c.createdAt).getTime(), ...allHistoryTimes);

      // Handle missing or invalid timestamps without inventing values
      if (isNaN(submissionTime) || isNaN(resTime)) return;

      const diffMs = resTime - submissionTime;
      // Do not use negative turnaround or invent values
      if (diffMs < 0) return;

      const hours = diffMs / (1000 * 3600);
      const minutes = Math.round(diffMs / (1000 * 60));

      totalResolutionHours += hours;
      totalResolutionMinutes += minutes;
      resolvedCount++;
    });

    // Use accurate decimal precision (1 decimal) or minutes
    const avgResolutionHours = resolvedCount > 0 ? Number((totalResolutionHours / resolvedCount).toFixed(1)) : 0;
    const avgResolutionMinutes = resolvedCount > 0 ? Math.round(totalResolutionMinutes / resolvedCount) : 0;

    // Group complaints by month (e.g. "Oct 2026", "Nov 2026")
    const timelineMap: Record<string, { count: number; resolved: number }> = {};
    complaints.forEach((c) => {
      const monthKey = new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!timelineMap[monthKey]) timelineMap[monthKey] = { count: 0, resolved: 0 };
      timelineMap[monthKey].count++;
      if (c.status === ComplaintStatus.RESOLVED) timelineMap[monthKey].resolved++;
    });

    const monthlyTrends = Object.entries(timelineMap).map(([month, data]) => ({
      month,
      total: data.count,
      resolved: data.resolved,
    }));

    res.status(200).json({
      success: true,
      data: {
        avgResolutionHours,
        avgResolutionMinutes,
        resolvedCount,
        totalComplaints: complaints.length,
        resolutionRate: complaints.length > 0 ? Math.round((resolvedCount / complaints.length) * 100) : 0,
        monthlyTrends,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. AI Insights Overview
 */
export const getAiInsights = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalAnalyzed, analyses, unanalyzedCount, complaintsWithDuplicates] = await Promise.all([
      prisma.aiAnalysis.count(),
      prisma.aiAnalysis.findMany({
        include: {
          complaint: {
            select: { id: true, title: true, category: true, status: true, priority: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.complaint.count({
        where: { aiAnalysis: null },
      }),
      prisma.aiAnalysis.findMany({
        where: {
          duplicateCandidateIds: {
            isEmpty: false,
          },
        },
        include: {
          complaint: {
            select: { id: true, title: true, category: true, address: true, createdAt: true },
          },
        },
      }),
    ]);

    // Breakdown category predictions
    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    let lowConfidenceCount = 0;
    let correctedCount = 0;

    analyses.forEach((a) => {
      categoryCounts[a.predictedCategory] = (categoryCounts[a.predictedCategory] || 0) + 1;
      severityCounts[a.estimatedSeverity] = (severityCounts[a.estimatedSeverity] || 0) + 1;
      if (a.categoryConfidence < 0.60) lowConfidenceCount++;
      if (a.isCorrected) correctedCount++;
    });

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalAnalyzed,
          unanalyzedCount,
          lowConfidenceCount,
          correctedCount,
          duplicateClustersCount: complaintsWithDuplicates.length,
        },
        categoryDistribution: Object.entries(categoryCounts).map(([cat, count]) => ({ category: cat, count })),
        severityDistribution: Object.entries(severityCounts).map(([sev, count]) => ({ severity: sev, count })),
        duplicateClusters: complaintsWithDuplicates.map((item) => ({
          complaintId: item.complaintId,
          title: item.complaint.title,
          category: item.complaint.category,
          duplicateCandidatesCount: item.duplicateCandidateIds.length,
          duplicateDetails: item.duplicateDetails,
        })),
        recentAnalyses: analyses.slice(0, 15),
      },
    });
  } catch (error) {
    next(error);
  }
};
