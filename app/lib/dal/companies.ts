/**
 * Data Access Layer - Companies
 *
 * All company data access goes through this module.
 * Authentication is checked via requireAuth() before any database operation.
 *
 * See docs/architecture/auth-best-practices.md for DAL pattern explanation.
 */

import { requireAuth } from './shared'
import { createCompanySchema, updateCompanySchema, type CreateCompanyInput, type UpdateCompanyInput } from '../schemas/company'

export interface Company {
  id: string
  tenant_id: string
  business_name: string
  company_type?: string | null
  description?: string | null
  business_number?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  phone?: string | null
  email?: string | null
  website_url?: string | null
  date_established?: string | null
  logo_url?: string | null
  created_at: string
  updated_at: string
}

export interface CompanyWithIndustries extends Company {
  industries?: Array<{
    id: string
    name: string
  }>
  active_programs_count?: number
  alumni_programs_count?: number
  commitment_track?: {
    id: string
    title: string
  }
}

/**
 * Get all companies for the current tenant with their industries
 *
 * RLS automatically filters by tenant_id from JWT claims.
 *
 * @param {string} searchQuery - Optional search filter for company name
 * @returns {Promise<CompanyWithIndustries[]>} List of companies with industries
 */
export async function getCompanies(searchQuery?: string): Promise<CompanyWithIndustries[]> {
  const { supabase } = await requireAuth()

  let query = supabase
    .from('companies')
    .select(`
      *,
      company_industries (
        industry:industries (
          id,
          name
        )
      ),
      commitment_track:commitment_tracks (
        id,
        title
      )
    `)
    .order('business_name')

  if (searchQuery) {
    query = query.ilike('business_name', `%${searchQuery}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`)
  }

  // Transform data to flatten industries array
  return (data || []).map(company => ({
    ...company,
    industries: company.company_industries?.map((ci: any) => ci.industry) || [],
    commitment_track: company.commitment_track
  }))
}

/**
 * Get paginated companies for current tenant with optional search and program filters
 *
 * Search filters ALL records in database BEFORE pagination.
 * Returns total count of filtered results for pagination UI.
 *
 * @param params - Pagination and filter parameters
 * @returns Object with companies array and total count
 */
export async function getCompaniesPaginated({
  search,
  page = 1,
  pageSize = 50,
  programId,
  enrollmentStatus = 'all',
  companyType
}: {
  search?: string
  page?: number
  pageSize?: number
  programId?: string
  enrollmentStatus?: 'all' | 'active' | 'alumni' | 'not_enrolled'
  companyType?: string
}): Promise<{ companies: CompanyWithIndustries[], totalCount: number }> {
  const { supabase } = await requireAuth()

  // Calculate range
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Build base query
  let query = supabase
    .from('companies')
    .select(`
      *,
      company_industries (
        industry:industries (
          id,
          name
        )
      )
    `, { count: 'exact' })
    .order('business_name')

  // Apply search filter BEFORE pagination
  if (search) {
    query = query.ilike('business_name', `%${search}%`)
  }

  // Apply company type filter BEFORE pagination
  if (companyType && companyType !== 'all') {
    query = query.eq('company_type', companyType)
  }

  // Get initial results (we'll filter by enrollment status in memory if needed)
  const { data: allCompanies, error, count: initialCount } = await query

  if (error) {
    throw new Error(`Failed to fetch companies: ${error.message}`)
  }

  // If no enrollment filters, just paginate and return
  if (enrollmentStatus === 'all' && !programId) {
    const paginatedData = (allCompanies || []).slice(from, to + 1)
    const companies = paginatedData.map(company => ({
      ...company,
      industries: company.company_industries?.map((ci: any) => ci.industry) || []
    }))

    // Fetch program counts for paginated companies
    const companiesWithCounts = await enrichCompaniesWithProgramCounts(supabase, companies)

    return {
      companies: companiesWithCounts,
      totalCount: initialCount || 0
    }
  }

  // Apply enrollment filtering
  const companyIds = (allCompanies || []).map(c => c.id)

  if (companyIds.length === 0) {
    return { companies: [], totalCount: 0 }
  }

  // Get all enrollments for filtering
  let enrollmentQuery = supabase
    .from('company_program_enrollments')
    .select('company_id, program_id, start_date, end_date')
    .in('company_id', companyIds)

  if (programId) {
    enrollmentQuery = enrollmentQuery.eq('program_id', programId)
  }

  const { data: enrollments, error: enrollmentError } = await enrollmentQuery

  if (enrollmentError) {
    throw new Error(`Failed to fetch enrollments: ${enrollmentError.message}`)
  }

  // Filter companies based on enrollment status
  const today = new Date().toISOString().split('T')[0]
  const filteredCompanyIds = new Set<string>()

  if (enrollmentStatus === 'active') {
    // Companies with at least one active enrollment
    enrollments?.forEach(enrollment => {
      const isActive = !enrollment.end_date || enrollment.end_date >= today
      if (isActive) {
        filteredCompanyIds.add(enrollment.company_id)
      }
    })
  } else if (enrollmentStatus === 'alumni') {
    // Companies with alumni enrollments but NO active enrollments
    const activeCompanyIds = new Set<string>()
    const alumniCompanyIds = new Set<string>()

    enrollments?.forEach(enrollment => {
      const isActive = !enrollment.end_date || enrollment.end_date >= today
      if (isActive) {
        activeCompanyIds.add(enrollment.company_id)
      } else {
        alumniCompanyIds.add(enrollment.company_id)
      }
    })

    // Alumni only: has alumni enrollments but NOT in active set
    alumniCompanyIds.forEach(id => {
      if (!activeCompanyIds.has(id)) {
        filteredCompanyIds.add(id)
      }
    })
  } else if (enrollmentStatus === 'not_enrolled') {
    // Companies with NO enrollments
    const enrolledCompanyIds = new Set(enrollments?.map(e => e.company_id) || [])
    companyIds.forEach(id => {
      if (!enrolledCompanyIds.has(id)) {
        filteredCompanyIds.add(id)
      }
    })
  } else if (enrollmentStatus === 'all' && programId) {
    // When filtering by program but status is 'all', include all companies with enrollments in that program
    enrollments?.forEach(enrollment => {
      filteredCompanyIds.add(enrollment.company_id)
    })
  }

  // Filter companies array
  const filteredCompanies = (allCompanies || []).filter(company =>
    filteredCompanyIds.has(company.id)
  )

  // Apply pagination to filtered results
  const paginatedData = filteredCompanies.slice(from, to + 1)

  // Transform data to flatten industries array
  const companies = paginatedData.map(company => ({
    ...company,
    industries: company.company_industries?.map((ci: any) => ci.industry) || []
  }))

  // Enrich with program counts
  const companiesWithCounts = await enrichCompaniesWithProgramCounts(supabase, companies)

  return {
    companies: companiesWithCounts,
    totalCount: filteredCompanies.length
  }
}

/**
 * Helper function to enrich companies with program enrollment counts
 *
 * @param supabase - Supabase client
 * @param companies - Array of companies to enrich
 * @returns Companies with active_programs_count and alumni_programs_count
 */
async function enrichCompaniesWithProgramCounts(
  supabase: any,
  companies: CompanyWithIndustries[]
): Promise<CompanyWithIndustries[]> {
  if (companies.length === 0) return companies

  const companyIds = companies.map(c => c.id)
  const today = new Date().toISOString().split('T')[0]

  // Fetch all enrollments for these companies
  const { data: enrollments, error } = await supabase
    .from('company_program_enrollments')
    .select('company_id, end_date')
    .in('company_id', companyIds)

  if (error) {
    console.error('Failed to fetch program counts:', error)
    // Return companies without counts rather than failing
    return companies.map(c => ({
      ...c,
      active_programs_count: 0,
      alumni_programs_count: 0
    }))
  }

  // Count active and alumni programs per company
  const counts = new Map<string, { active: number; alumni: number }>()

  enrollments?.forEach((enrollment: { company_id: string; end_date: string | null }) => {
    const current = counts.get(enrollment.company_id) || { active: 0, alumni: 0 }
    const isActive = !enrollment.end_date || enrollment.end_date >= today

    if (isActive) {
      current.active++
    } else {
      current.alumni++
    }

    counts.set(enrollment.company_id, current)
  })

  // Enrich companies with counts
  return companies.map(company => ({
    ...company,
    active_programs_count: counts.get(company.id)?.active || 0,
    alumni_programs_count: counts.get(company.id)?.alumni || 0
  }))
}

/**
 * Get a single company by ID with industries
 *
 * RLS ensures user can only access companies in their tenant.
 *
 * @param {string} companyId - Company UUID
 * @returns {Promise<CompanyWithIndustries | null>} Company with industries or null
 */
export async function getCompany(companyId: string): Promise<CompanyWithIndustries | null> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      company_industries (
        industry:industries (
          id,
          name
        )
      ),
      commitment_track:commitment_tracks (
        id,
        title
      )
    `)
    .eq('id', companyId)
    .single()

  if (error) {
    return null
  }

  return {
    ...data,
    industries: data.company_industries?.map((ci: any) => ci.industry) || [],
    commitment_track: data.commitment_track
  }
}

/**
 * Create a new company with optional industry associations
 *
 * RLS automatically sets tenant_id from JWT claims.
 *
 * @param {CreateCompanyInput} input - Company data (validated with Zod)
 * @returns {Promise<Company>} Created company
 */
export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  // Validate input
  const validated = createCompanySchema.parse(input)
  const { industry_ids, ...companyData } = validated

  const { supabase } = await requireAuth()

  // Get active organization ID (required by RLS WITH CHECK policy)
  const { getCurrentOrganizationId } = await import('./shared')
  const tenantId = await getCurrentOrganizationId()

  // Create company with explicit tenant_id
  const { data: company, error } = await supabase
    .from('companies')
    .insert({
      ...companyData,
      tenant_id: tenantId // Required by RLS WITH CHECK policy
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create company: ${error.message}`)
  }

  // Associate industries if provided
  if (industry_ids && industry_ids.length > 0) {
    const industryAssociations = industry_ids.map(industry_id => ({
      company_id: company.id,
      industry_id
    }))

    const { error: industryError } = await supabase
      .from('company_industries')
      .insert(industryAssociations)

    if (industryError) {
      // Log error but don't fail - company was created successfully
      console.error('Failed to associate industries:', industryError)
    }
  }

  return company as Company
}

/**
 * Update a company and its industry associations
 *
 * RLS ensures user can only update companies in their tenant.
 *
 * @param {string} companyId - Company UUID
 * @param {UpdateCompanyInput} updates - Fields to update
 * @returns {Promise<Company>} Updated company
 */
export async function updateCompany(
  companyId: string,
  updates: UpdateCompanyInput
): Promise<Company> {
  const validated = updateCompanySchema.parse(updates)
  const { industry_ids, ...companyData } = validated

  const { supabase } = await requireAuth()

  // Update company
  const { data: company, error } = await supabase
    .from('companies')
    .update(companyData)
    .eq('id', companyId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update company: ${error.message}`)
  }

  // Update industry associations if provided
  if (industry_ids !== undefined) {
    // Delete existing associations
    await supabase
      .from('company_industries')
      .delete()
      .eq('company_id', companyId)

    // Insert new associations
    if (industry_ids.length > 0) {
      const industryAssociations = industry_ids.map(industry_id => ({
        company_id: companyId,
        industry_id
      }))

      const { error: industryError } = await supabase
        .from('company_industries')
        .insert(industryAssociations)

      if (industryError) {
        console.error('Failed to update industries:', industryError)
      }
    }
  }

  return company as Company
}

/**
 * Delete a company
 *
 * RLS ensures user can only delete companies in their tenant.
 * Cascading deletes will remove related records (company_industries, company_contacts, etc.)
 *
 * @param {string} companyId - Company UUID
 * @returns {Promise<void>}
 */
export async function deleteCompany(companyId: string): Promise<void> {
  const { supabase } = await requireAuth()

  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId)

  if (error) {
    throw new Error(`Failed to delete company: ${error.message}`)
  }
}

/**
 * Get all industries (for multi-select dropdown)
 *
 * Reference data - no tenant scoping needed
 *
 * @returns {Promise<Array<{id: string, name: string}>>} All industries
 */
export async function getIndustries(): Promise<Array<{ id: string; name: string; description?: string }>> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('industries')
    .select('id, name, description')
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch industries: ${error.message}`)
  }

  return data || []
}
