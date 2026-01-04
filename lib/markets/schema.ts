/**
 * Market Validation Schemas
 * Shared between API and UI for consistent validation
 */

import { z } from 'zod';

export const HOURS_REGEX = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

export const baseMarketSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters'),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters'),
  state: z
    .string()
    .length(2, 'State must be 2 characters (e.g., GA)'),
  zip: z
    .string()
    .min(5, 'ZIP must be at least 5 characters')
    .max(10, 'ZIP must be less than 10 characters'),
  lat: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  hours: z
    .string()
    .regex(HOURS_REGEX, 'Use format HH:MM-HH:MM (e.g., 09:00-13:00)'),
  dayOfWeek: z
    .number()
    .int()
    .min(0, 'Day of week must be 0-6')
    .max(6, 'Day of week must be 0-6'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  mapsUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
  featured: z.boolean().default(false),
});

export const createMarketSchema = baseMarketSchema;

export const updateMarketSchema = baseMarketSchema.partial().extend({
  marketId: z.string().min(1, 'Market ID is required'),
});

export const deleteMarketSchema = z.object({
  marketId: z.string().min(1, 'Market ID is required'),
});

export const toggleStatusSchema = z.object({
  marketId: z.string().min(1, 'Market ID is required'),
  isActive: z.boolean(),
});

export type CreateMarketInput = z.infer<typeof createMarketSchema>;
export type UpdateMarketInput = z.infer<typeof updateMarketSchema>;
export type DeleteMarketInput = z.infer<typeof deleteMarketSchema>;
export type ToggleStatusInput = z.infer<typeof toggleStatusSchema>;
