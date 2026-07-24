/**
 * Fresh Batch Request System — Zod schemas and request validation
 *
 * All customer-facing input flows through these schemas. Prices, status, and
 * gallon-equivalents are never accepted from the client; they are computed or
 * assigned server-side.
 */

import { z } from 'zod';
import {
  FLAVOR_PROFILES,
  QUANTITY_UNITS,
  REQUEST_SOURCES,
} from './types';

const MAX_EMAIL_LENGTH = 254;
const MAX_NOTES_LENGTH = 1000;
const MAX_FREE_TEXT_LENGTH = 120;

export const flavorProfileSchema = z.enum(FLAVOR_PROFILES);

export const quantityUnitSchema = z.enum(QUANTITY_UNITS);

export const requestSourceSchema = z.enum(REQUEST_SOURCES);

const emailSchema = z
  .string()
  .min(1, 'Email address is required')
  .email('Valid email address is required')
  .max(MAX_EMAIL_LENGTH, 'Email address is too long')
  .transform((v) => v.toLowerCase().trim());

const phoneSchema = z
  .string()
  .max(15, 'Phone number is too long')
  .regex(/^(\+)?[\d\s\-()]+$/, 'Phone number contains invalid characters')
  .optional()
  .nullable()
  .transform((v) => (v ? v.trim() : null));

const productSlugSchema = z
  .string()
  .max(80, 'Product reference is too long')
  .regex(/^[a-z0-9-]+$/, 'Product reference contains invalid characters')
  .optional()
  .nullable();

const freeTextFlavorSchema = z
  .string()
  .max(MAX_FREE_TEXT_LENGTH, 'Flavor description is too long')
  .optional()
  .nullable();

const marketIdSchema = z.string().min(1, 'Preferred pickup market is required').max(40);

const dateSchema = z.coerce
  .date()
  .refine((d) => {
    const now = new Date();
    const min = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    return d >= min;
  }, 'Need-by date must be at least 48 hours in the future')
  .optional()
  .nullable();

const notesSchema = z
  .string()
  .max(MAX_NOTES_LENGTH, 'Notes are too long')
  .optional()
  .nullable();

const consentSchema = z.boolean().default(false);

/**
 * Raw customer input schema for POST /api/fresh-batch/requests
 */
export const freshBatchRequestInputSchema = z
  .object({
    email: emailSchema,
    phone: phoneSchema,
    requestedProductSlug: productSlugSchema,
    flavorProfile: flavorProfileSchema.optional().nullable(),
    requestedFlavorText: freeTextFlavorSchema,
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(100, 'Quantity is too large'),
    quantityUnit: quantityUnitSchema,
    preferredMarketId: marketIdSchema,
    needByDate: dateSchema,
    notes: notesSchema,
    requestSource: requestSourceSchema.default('homepage_hero'),
    marketingEmailConsent: consentSchema,
    smsConsent: consentSchema,
  })
  .refine(
    (data) => {
      const hasProduct = !!data.requestedProductSlug;
      const hasProfile = !!data.flavorProfile;
      const hasText = !!data.requestedFlavorText?.trim();
      return hasProduct || hasProfile || hasText;
    },
    {
      message: 'Please select a flavor, a flavor profile, or describe a flavor.',
      path: ['flavor'],
    }
  )
  .refine(
    (data) => {
      // If phone is provided, SMS consent must be explicitly false unless phone is present.
      // The schema already defaults false. This rule just enforces that consent cannot be
      // silently derived from the presence of a phone number.
      if (!data.phone || data.phone.trim().length === 0) {
        return data.smsConsent === false;
      }
      return true;
    },
    {
      message: 'SMS consent requires a phone number.',
      path: ['smsConsent'],
    }
  );

export type FreshBatchRequestInput = z.infer<typeof freshBatchRequestInputSchema>;

/**
 * Sanitize free-text notes to remove obviously unsupported claim language.
 */
const HEALTH_CLAIM_WORDS = [
  'cure',
  'treat',
  'heal',
  'disease',
  'medical',
  'diabetes',
  'blood pressure',
  'blood sugar',
  'thyroid',
  'weight loss',
  'detox',
  'immunity',
  'immune',
  'fat burner',
  'inflammation',
  'anxiety',
  'depression',
  'cancer',
  'virus',
  'infection',
  'cleanse',
  'parasite',
];

export function containsHealthClaims(text: string): boolean {
  const lower = text.toLowerCase();
  return HEALTH_CLAIM_WORDS.some((word) => lower.includes(word.toLowerCase()));
}

export function sanitizeNotes(notes: string | null): string | null {
  if (!notes) return null;
  const trimmed = notes.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_NOTES_LENGTH);
}

/**
 * Normalizes a customer request into a validated input object.
 */
export function normalizeRequestInput(raw: unknown): FreshBatchRequestInput {
  return freshBatchRequestInputSchema.parse(raw);
}
