/**
 * Company Validation Schemas
 *
 * Zod schemas for company input validation.
 * See docs/architecture/auth-best-practices.md for validation patterns.
 */

import { z } from 'zod'

/**
 * Company Type enum (organizational classification)
 */
export const companyTypeEnum = z.enum([
  'Startup',
  'Investment Fund',
  'Government',
  'University',
  'Service Provider',
  'Large Corporation',
  'Non-Profit'
])

export type CompanyType = z.infer<typeof companyTypeEnum>

/**
 * Canadian Provinces and Territories
 */
export const canadianProvinceEnum = z.enum([
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon'
])

export type CanadianProvince = z.infer<typeof canadianProvinceEnum>

/**
 * Create Company Input Schema
 *
 * MVP fields only:
 * - business_name (required)
 * - company_type (required)
 * - city (required for BAI)
 * - province (required for BAI)
 * - industry_ids (optional array of industry UUIDs for multi-select)
 * - website_url (optional)
 */
export const createCompanySchema = z.object({
  business_name: z.string().min(1, 'Company name is required').max(255),
  company_type: companyTypeEnum,
  description: z.string().optional(),
  city: z.string().min(1, 'City is required').max(100),
  province: canadianProvinceEnum,
  date_established: z.string().optional(), // ISO date string or date input
  logo_url: z.string().url().optional().nullable(),
  industry_ids: z.array(z.string().uuid()).optional().default([]),
  website_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  commitment_track_id: z.string().uuid().optional()
})

export type CreateCompanyInput = z.infer<typeof createCompanySchema>

/**
 * Update Company Input Schema
 *
 * All fields optional for updates
 */
export const updateCompanySchema = createCompanySchema.partial()

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>

/**
 * Company with Industries (for display)
 */
export const companyWithIndustriesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  business_name: z.string(),
  company_type: companyTypeEnum.nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  website_url: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  industries: z.array(z.object({
    id: z.string().uuid(),
    name: z.string()
  })).optional()
})

export type CompanyWithIndustries = z.infer<typeof companyWithIndustriesSchema>
