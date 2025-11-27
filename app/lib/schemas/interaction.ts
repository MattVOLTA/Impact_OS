/**
 * Interaction Validation Schemas
 *
 * Zod schemas for interaction input validation.
 * Note: Current schema is Fireflies-specific (meetings only).
 * See docs/architecture/auth-best-practices.md for validation patterns.
 */

import { z } from 'zod'

/**
 * Match confidence enum (database constraint)
 */
export const matchConfidenceEnum = z.enum(['high', 'medium', 'low'])
export type MatchConfidence = z.infer<typeof matchConfidenceEnum>

/**
 * Interaction type enum (database constraint)
 */
export const interactionTypeEnum = z.enum(['meeting', 'email', 'call'])
export type InteractionType = z.infer<typeof interactionTypeEnum>

/**
 * Create Interaction Input Schema
 *
 * Required fields:
 * - title: Interaction title/description
 * - contact_ids: At least one contact must be linked
 *
 * Optional fields:
 * - meeting_date: When the meeting occurred
 * - summary: Meeting summary (could be AI-generated from Fireflies)
 * - notes: Additional manual notes
 * - company_ids: Related companies
 * - is_manual_entry: Whether this was manually entered (vs Fireflies auto-capture)
 * - fireflies_transcript_id: FK to Fireflies transcript (if auto-captured)
 */
export const createInteractionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  interaction_type: interactionTypeEnum.optional().default('meeting'),
  meeting_date: z.coerce.date({ message: 'Invalid date format' }).optional(),
  summary: z.string().optional().nullable(),
  contact_ids: z.array(z.string().uuid()).min(1, 'At least one contact is required'),
  company_ids: z.array(z.string().uuid()).optional().default([]),
  fireflies_transcript_id: z.string().optional().nullable()
})

export type CreateInteractionInput = z.infer<typeof createInteractionSchema>

/**
 * Update Interaction Input Schema
 *
 * All fields optional for updates.
 * Note: contact_ids and company_ids, if provided, will replace existing associations.
 */
export const updateInteractionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500).optional(),
  interaction_type: interactionTypeEnum.optional(),
  meeting_date: z.coerce.date({ message: 'Invalid date format' }).optional(),
  summary: z.string().optional().nullable(),
  contact_ids: z.array(z.string().uuid()).min(1, 'At least one contact is required').optional(),
  company_ids: z.array(z.string().uuid()).optional()
})

export type UpdateInteractionInput = z.infer<typeof updateInteractionSchema>

/**
 * Interaction Filter Schema (for list view)
 */
export const interactionFiltersSchema = z.object({
  company_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  search_query: z.string().optional(),
  limit: z.number().int().positive().optional().default(20),
  offset: z.number().int().min(0).optional().default(0)
})

export type InteractionFilters = z.infer<typeof interactionFiltersSchema>
