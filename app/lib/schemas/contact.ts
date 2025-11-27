/**
 * Contact Validation Schemas
 *
 * Zod schemas for contact input validation.
 */

import { z } from 'zod'

/**
 * Create Contact Input Schema
 *
 * Fields:
 * - first_name (required)
 * - last_name (required)
 * - email (optional but unique if provided)
 * - phone (optional)
 */
export const createContactSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable().or(z.literal('')),
  role: z.string().max(100).optional().nullable().or(z.literal('')), // Deprecated - use title
  title: z.string().max(200).optional().nullable().or(z.literal('')),
  bio: z.string().optional().nullable(),
  linkedin_url: z.string().url('Invalid LinkedIn URL').optional().nullable().or(z.literal('')),
  photo_url: z.string().url().optional().nullable(),
})

export type CreateContactInput = z.infer<typeof createContactSchema>

/**
 * Update Contact Input Schema
 *
 * All fields optional for updates
 */
export const updateContactSchema = createContactSchema.partial()

export type UpdateContactInput = z.infer<typeof updateContactSchema>

/**
 * Contact Email Schema
 *
 * Schema for contact email address with type and primary designation.
 */
export const contactEmailSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  email_type: z.enum(['work', 'personal', 'other']).optional().nullable(),
  is_primary: z.boolean().default(false)
})

export type ContactEmailInput = z.infer<typeof contactEmailSchema>

/**
 * Add Email Input Schema
 */
export const addEmailSchema = contactEmailSchema

export type AddEmailInput = z.infer<typeof addEmailSchema>

/**
 * Update Email Input Schema
 *
 * All fields optional for updates
 */
export const updateEmailSchema = contactEmailSchema.partial()

export type UpdateEmailInput = z.infer<typeof updateEmailSchema>
