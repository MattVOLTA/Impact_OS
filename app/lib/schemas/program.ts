/**
 * Program Validation Schemas
 *
 * Zod schemas for program enrollment validation.
 * Simplified schema: programs → program_companies / program_contacts (no cohorts table)
 */

import { z } from 'zod'

/**
 * Create Program Input Schema
 *
 * Fields:
 * - name (required): Program name
 * - description (optional): Program description
 */
export const createProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required').max(255, 'Program name too long'),
  description: z.string().optional()
})

export type CreateProgramInput = z.infer<typeof createProgramSchema>

/**
 * Update Program Input Schema
 *
 * All fields optional (partial update)
 */
export const updateProgramSchema = z.object({
  name: z.string().min(1, 'Program name is required').max(255, 'Program name too long').optional(),
  description: z.string().optional().nullable()
})

export type UpdateProgramInput = z.infer<typeof updateProgramSchema>

/**
 * Program Enrollment Dates Schema
 *
 * Fields:
 * - start_date (required): When company/contact joined the program
 * - end_date (optional, nullable): When they completed/left (NULL = still active)
 *
 * For cohort-based programs: All participants have same dates
 * For continuous intake: Each participant has individual dates
 */
export const enrollmentDatesSchema = z.object({
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable()
}).refine(
  (data) => {
    // If end_date provided, it must be on or after start_date
    if (data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date)
    }
    return true
  },
  {
    message: 'End date must be on or after start date',
    path: ['end_date']
  }
)

export type EnrollmentDates = z.infer<typeof enrollmentDatesSchema>

/**
 * Enroll Company Input Schema
 */
export const enrollCompanySchema = z.object({
  program_id: z.string().uuid('Invalid program ID'),
  company_id: z.string().uuid('Invalid company ID'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable()
}).refine(
  (data) => {
    if (data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date)
    }
    return true
  },
  {
    message: 'End date must be on or after start date',
    path: ['end_date']
  }
)

export type EnrollCompanyInput = z.infer<typeof enrollCompanySchema>

/**
 * Bulk Enroll Companies Input Schema
 *
 * For enrolling multiple companies with same dates (cohort-based pattern)
 */
export const bulkEnrollCompaniesSchema = z.object({
  program_id: z.string().uuid('Invalid program ID'),
  company_ids: z.array(z.string().uuid('Invalid company ID')).min(1, 'At least one company required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable()
}).refine(
  (data) => {
    if (data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date)
    }
    return true
  },
  {
    message: 'End date must be on or after start date',
    path: ['end_date']
  }
)

export type BulkEnrollCompaniesInput = z.infer<typeof bulkEnrollCompaniesSchema>

/**
 * Enroll Contact Input Schema
 */
export const enrollContactSchema = z.object({
  program_id: z.string().uuid('Invalid program ID'),
  contact_id: z.string().uuid('Invalid contact ID'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable()
}).refine(
  (data) => {
    if (data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date)
    }
    return true
  },
  {
    message: 'End date must be on or after start date',
    path: ['end_date']
  }
)

export type EnrollContactInput = z.infer<typeof enrollContactSchema>

/**
 * Bulk Enroll Contacts Input Schema
 */
export const bulkEnrollContactsSchema = z.object({
  program_id: z.string().uuid('Invalid program ID'),
  contact_ids: z.array(z.string().uuid('Invalid contact ID')).min(1, 'At least one contact required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().nullable()
}).refine(
  (data) => {
    if (data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date)
    }
    return true
  },
  {
    message: 'End date must be on or after start date',
    path: ['end_date']
  }
)

export type BulkEnrollContactsInput = z.infer<typeof bulkEnrollContactsSchema>
