/**
 * Menu Validation Schemas
 * Shared between API and UI for consistent validation
 */

import { z } from 'zod';

export const baseMenuSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  imageUrl: z
    .string()
    .url('Must be a valid URL')
    .min(1, 'Image URL is required'),
  thumbnailUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  canvaUrl: z
    .string()
    .url('Must be a valid Canva or public design URL')
    .optional()
    .or(z.literal('')),
  printUrl: z
    .string()
    .url('Must be a valid printable PDF or image URL')
    .optional()
    .or(z.literal('')),
  marketId: z
    .string()
    .optional()
    .or(z.literal('')),
  weekStart: z.string().min(1, 'Week start date is required'),
  weekEnd: z.string().min(1, 'Week end date is required'),
  isActive: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  linkedProducts: z.array(z.string()).optional(),
  seasonalTags: z.array(z.string().min(1).max(40)).max(8).optional(),
});

export const createMenuSchema = baseMenuSchema;

export const updateMenuSchema = baseMenuSchema.partial().extend({
  menuId: z.string().min(1, 'Menu ID is required'),
});

export const deleteMenuSchema = z.object({
  menuId: z.string().min(1, 'Menu ID is required'),
});

export const setActiveMenuSchema = z.object({
  menuId: z.string().min(1, 'Menu ID is required'),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type DeleteMenuInput = z.infer<typeof deleteMenuSchema>;
export type SetActiveMenuInput = z.infer<typeof setActiveMenuSchema>;
