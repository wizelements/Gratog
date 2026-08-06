/**
 * Menu Validation Schemas
 * Shared between API and UI for consistent validation
 */

import { z } from 'zod';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?$/;
const DATE_INPUT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDateInput(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return null;

  // Accept ISO strings or HTML date inputs; treat bare dates as midnight America/New_York.
  if (ISO_DATE_REGEX.test(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (DATE_INPUT_REGEX.test(value)) {
    const d = new Date(`${value}T00:00:00-04:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

const dateInputSchema = z
  .union([z.string(), z.date(), z.coerce.date()])
  .refine((v) => {
    const d = parseDateInput(v) ?? (v instanceof Date ? v : new Date(v as string));
    return d && !Number.isNaN(d.getTime());
  }, 'Must be a valid date')
  .transform((v) => {
    const d = parseDateInput(v) ?? (v instanceof Date ? v : new Date(v as string));
    return d;
  });

const menuFields = {
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
  weekStart: dateInputSchema,
  weekEnd: dateInputSchema,
  isActive: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  linkedProducts: z.array(z.string()).optional(),
  seasonalTags: z.array(z.string().min(1).max(40)).max(8).optional(),
};

export const baseMenuSchema = z.object(menuFields).refine(
  (data) => {
    if (!data.weekStart || !data.weekEnd) return true;
    return data.weekEnd > data.weekStart;
  },
  {
    message: 'Week end must be after week start',
    path: ['weekEnd'],
  }
).refine(
  (data) => {
    if (!data.weekStart || !data.weekEnd) return true;
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = (data.weekEnd.getTime() - data.weekStart.getTime()) / msPerDay;
    return days >= 6 && days <= 8;
  },
  {
    message: 'Week range must be roughly 7 days (Monday to Sunday)',
    path: ['weekEnd'],
  }
);

export const createMenuSchema = baseMenuSchema;

export const updateMenuSchema = z.object(menuFields).partial().extend({
  menuId: z.string().min(1, 'Menu ID is required'),
});

export const deleteMenuSchema = z.object({
  menuId: z.string().min(1, 'Menu ID is required'),
});

export const setActiveMenuSchema = z.object({
  menuId: z.string().min(1, 'Menu ID is required'),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type CreateMenuFormInput = z.input<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type DeleteMenuInput = z.infer<typeof deleteMenuSchema>;
export type SetActiveMenuInput = z.infer<typeof setActiveMenuSchema>;
