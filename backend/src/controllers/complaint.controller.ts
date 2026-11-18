import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { createComplaintSchema } from '../validators/complaint.validator';
import { ComplaintCategory, ComplaintStatus, Role } from '@prisma/client';
import { aiService } from '../services/ai.service';

export const createComplaint = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const validatedData = createComplaintSchema.parse(req.body);

    // Prepare files uploaded via multer
    const files = req.files as Express.Multer.File[] | undefined;
    const singleFile = req.file as Express.Multer.File | undefined;
    const uploadedFiles = files && files.length > 0 ? files : singleFile ? [singleFile] : [];

    // Initial persistent save in database transaction
    const initialComplaint = await prisma.$transaction(async (tx) => {
      const newComplaint = await tx.complaint.create({
        data: {
          title: validatedData.title.trim(),
          description: validatedData.description.trim(),
          category: validatedData.category as ComplaintCategory,
          latitude: validatedData.latitude !== undefined && validatedData.latitude !== null ? validatedData.latitude : null,
          longitude: validatedData.longitude !== undefined && validatedData.longitude !== null ? validatedData.longitude : null,
          address: validatedData.address.trim(),
          citizenId: req.user!.id,
          status: ComplaintStatus.SUBMITTED,
        },
      });

      // Save images if any
      if (uploadedFiles.length > 0) {
        await tx.complaintImage.createMany({
          data: uploadedFiles.map((file) => ({
            complaintId: newComplaint.id,
            imageUrl: `/uploads/${file.filename}`,
            imageType: file.mimetype,
          })),
        });
      }

      // Initial status history log
      await tx.complaintStatusHistory.create({
        data: {
          complaintId: newComplaint.id,
          previousStatus: null,
          newStatus: ComplaintStatus.SUBMITTED,
        },
      });

      return tx.complaint.findUnique({
        where: { id: newComplaint.id },
        include: {
          images: true,
          statusHistory: {
            orderBy: { changedAt: 'asc' },
          },
        },
      });
    });

    if (!initialComplaint) {
      res.status(500).json({ success: false, message: 'Failed to record complaint in database.' });
      return;
    }

    // Prepare candidate complaints for duplicate detection
    const candidates = await prisma.complaint.findMany({
      where: { id: { not: initialComplaint.id } },
      take: 30,
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

    const firstImage = uploadedFiles[0];
    const imagePath = firstImage ? `/uploads/${firstImage.filename}` : undefined;

    // Run Sprint 3 AI Intelligence Pipeline (Gemini Vision + Routing + Priority)
    let aiResult;
    try {
      aiResult = await aiService.runFullAnalysis(
        {
          id: initialComplaint.id,
          title: initialComplaint.title,
          description: initialComplaint.description,
          category: initialComplaint.category,
          latitude: initialComplaint.latitude ? Number(initialComplaint.latitude) : null,
          longitude: initialComplaint.longitude ? Number(initialComplaint.longitude) : null,
          createdAt: initialComplaint.createdAt,
          imagePath,
          imageMime: firstImage?.mimetype,
        },
        candidateItems
      );
    } catch (e: any) {
      console.warn('[ComplaintController] Direct AI analysis encountered error; generating fallback:', e.message);
    }

    // Persist AI analysis and deterministic department assignment (Always Assign Policy)
    let finalComplaint = initialComplaint;

    if (aiResult) {
      try {
        await prisma.aiAnalysis.upsert({
          where: { complaintId: initialComplaint.id },
          create: {
            complaintId: initialComplaint.id,
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

        // Always assign the department and update priority/severity
        const updated = await prisma.complaint.update({
          where: { id: initialComplaint.id },
          data: {
            department: aiResult.assignedDepartment,
            assignmentMethod: aiResult.assignmentMethod,
            assignedAt: new Date(),
            assignmentReason: aiResult.assignmentReason,
            requiresHumanReview: aiResult.requiresHumanReview,
            priority: aiResult.calculatedPriority,
            severity: aiResult.estimatedSeverity,
            category: aiResult.predictedCategory,
          },
          include: {
            images: true,
            statusHistory: { orderBy: { changedAt: 'asc' } },
            aiAnalysis: true,
          },
        });

        if (updated) {
          finalComplaint = updated;
        }
      } catch (err: any) {
        console.error('[ComplaintController] Error persisting AI analysis & assignment:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Complaint submitted and automatically assigned successfully.',
      data: {
        complaint: finalComplaint,
        aiAnalysis: aiResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getComplaints = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, category, search, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    if (status && Object.values(ComplaintStatus).includes(status as ComplaintStatus)) {
      where.status = status as ComplaintStatus;
    }

    if (category && Object.values(ComplaintCategory).includes(category as ComplaintCategory)) {
      where.category = category as ComplaintCategory;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { address: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, complaints] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        include: {
          images: true,
          citizen: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
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

export const getMyComplaints = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { status, category, search, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * take;

    const where: any = {
      citizenId: req.user.id,
    };

    if (status && Object.values(ComplaintStatus).includes(status as ComplaintStatus)) {
      where.status = status as ComplaintStatus;
    }

    if (category && Object.values(ComplaintCategory).includes(category as ComplaintCategory)) {
      where.category = category as ComplaintCategory;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { address: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, complaints, countsByStatus] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        include: {
          images: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.complaint.groupBy({
        by: ['status'],
        where: { citizenId: req.user.id },
        _count: { status: true },
      }),
    ]);

    // Build summary counts for citizen dashboard
    const stats = {
      total: 0,
      submitted: 0,
      inProgress: 0,
      resolved: 0,
      rejected: 0,
    };

    countsByStatus.forEach((item) => {
      const count = item._count.status;
      stats.total += count;
      if (item.status === ComplaintStatus.SUBMITTED) stats.submitted = count;
      if (item.status === ComplaintStatus.IN_PROGRESS) stats.inProgress = count;
      if (item.status === ComplaintStatus.RESOLVED) stats.resolved = count;
      if (item.status === ComplaintStatus.REJECTED) stats.rejected = count;
    });

    res.status(200).json({
      success: true,
      data: {
        complaints,
        stats,
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

export const getComplaintById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        images: true,
        aiAnalysis: true,
        statusHistory: {
          orderBy: { changedAt: 'asc' },
        },
        citizen: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
      return;
    }

    // Ownership check: If authenticated user is a CITIZEN, they can only view their own complaint
    // Note: If unauthenticated, return 401. If citizen but not owner, return 403.
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (req.user.role === Role.CITIZEN && complaint.citizenId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this complaint.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { complaint },
    });
  } catch (error) {
    next(error);
  }
};

export const getComplaintHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      select: { citizenId: true },
    });

    if (!complaint) {
      res.status(404).json({
        success: false,
        message: 'Complaint not found.',
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (req.user.role === Role.CITIZEN && complaint.citizenId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this history.',
      });
      return;
    }

    const history = await prisma.complaintStatusHistory.findMany({
      where: { complaintId: id },
      orderBy: { changedAt: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: { history },
    });
  } catch (error) {
    next(error);
  }
};
