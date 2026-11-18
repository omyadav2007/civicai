import { prisma } from '../config/prisma';
import { aiService } from '../services/ai.service';
import { Department } from '@prisma/client';

async function main() {
  console.log('Running AI analysis backfill for existing complaints...');
  const complaints = await prisma.complaint.findMany({
    include: { aiAnalysis: true },
    orderBy: { createdAt: 'asc' },
  });

  const departmentMap: Record<string, Department> = {
    POTHOLE: Department.ROAD_MAINTENANCE,
    ROAD_DAMAGE: Department.ROAD_MAINTENANCE,
    GARBAGE: Department.SANITATION,
    WATER_LEAKAGE: Department.WATER_SUPPLY,
    DRAINAGE: Department.DRAINAGE,
    STREETLIGHT: Department.ELECTRICITY,
    OTHER: Department.PUBLIC_WORKS,
  };

  for (const c of complaints) {
    console.log(`Processing complaint #${c.id.slice(0, 8)}: "${c.title}"`);

    // Assign a reasonable initial department if currently unassigned
    if (!c.department) {
      const dept = departmentMap[c.category] || Department.PUBLIC_WORKS;
      await prisma.complaint.update({
        where: { id: c.id },
        data: { department: dept },
      });
    }

    if (c.aiAnalysis) {
      console.log(`  Complaint #${c.id.slice(0, 8)} already has AI analysis.`);
      continue;
    }

    const otherComplaints = complaints
      .filter((other) => other.id !== c.id)
      .map((other) => ({
        id: other.id,
        title: other.title,
        description: other.description,
        category: other.category,
        latitude: other.latitude ? Number(other.latitude) : null,
        longitude: other.longitude ? Number(other.longitude) : null,
        status: other.status,
        createdAt: other.createdAt.toISOString(),
      }));

    const result = await aiService.runFullAnalysis(
      {
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        latitude: c.latitude ? Number(c.latitude) : null,
        longitude: c.longitude ? Number(c.longitude) : null,
        createdAt: c.createdAt,
      },
      otherComplaints
    );

    if (result) {
      await prisma.aiAnalysis.create({
        data: {
          complaintId: c.id,
          predictedCategory: result.predictedCategory,
          categoryConfidence: result.categoryConfidence,
          categoryExplanation: result.categoryExplanation,
          estimatedSeverity: result.estimatedSeverity,
          severityScore: result.severityScore,
          severityExplanation: result.severityExplanation,
          priorityScore: result.priorityScore,
          calculatedPriority: result.calculatedPriority,
          priorityExplanation: result.priorityExplanation,
          duplicateCandidateIds: result.duplicateCandidateIds,
          duplicateDetails: result.duplicateDetails,
          modelMetadata: result.modelMetadata,
        },
      });

      await prisma.complaint.update({
        where: { id: c.id },
        data: {
          severity: result.estimatedSeverity,
          priority: result.calculatedPriority,
        },
      });
      console.log(`  -> AI analysis generated: Category: ${result.predictedCategory}, Severity: ${result.estimatedSeverity}, Priority: ${result.calculatedPriority} (${result.priorityScore}/100)`);
    }
  }

  console.log('AI backfill completed successfully.');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
