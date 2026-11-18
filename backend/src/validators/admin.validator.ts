import { z } from 'zod';

export const updateStatusSchema = z.object({
  status: z.enum(['SUBMITTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']),
  notes: z.string().max(1000).optional(),
});

export const assignDepartmentSchema = z.object({
  department: z.enum([
    'ROAD_MAINTENANCE',
    'SANITATION',
    'WATER_SUPPLY',
    'DRAINAGE',
    'ELECTRICITY',
    'PUBLIC_WORKS',
  ]),
  notes: z.string().max(1000).optional(),
});

export const addNoteSchema = z.object({
  note: z.string().min(2, 'Note must be at least 2 characters').max(2000),
});

export const correctAiSchema = z.object({
  category: z
    .enum([
      'POTHOLE',
      'GARBAGE',
      'OVERFLOWING_DUSTBIN',
      'ILLEGAL_GARBAGE_DUMPING',
      'UNCOLLECTED_GARBAGE',
      'GARBAGE_BLOCKING_DRAIN',
      'OPEN_GARBAGE_DUMP',
      'MISSED_GARBAGE_COLLECTION',
      'GENERAL_WASTE_MANAGEMENT',
      'WATER_LEAKAGE',
      'DRAINAGE',
      'STREETLIGHT',
      'ROAD_DAMAGE',
      'OTHER',
    ])
    .optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  department: z
    .enum([
      'ROAD_MAINTENANCE',
      'SANITATION',
      'WATER_SUPPLY',
      'DRAINAGE',
      'ELECTRICITY',
      'PUBLIC_WORKS',
    ])
    .optional(),
  notes: z.string().max(1000).optional(),
});
