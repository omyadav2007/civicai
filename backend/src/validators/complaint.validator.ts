import { z } from 'zod';

export const createComplaintSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150),
  description: z.string().min(15, 'Description must be at least 15 characters').max(2000),
  category: z.enum([
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
  ]),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  address: z.string().min(5, 'Address must be at least 5 characters').max(255),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
