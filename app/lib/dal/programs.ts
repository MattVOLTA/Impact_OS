/**
 * Data Access Layer - Programs
 *
 * Simplified schema: programs → program_companies / program_contacts (no cohorts)
 *
 * All program enrollment data access goes through these functions.
 * Follows DAL pattern: requireAuth() → validate → query → return
 *
 * See docs/architecture/auth-best-practices.md for patterns.
 */

import { requireAuth, getCurrentTenantId } from './shared'
import {
  createProgramSchema,
  updateProgramSchema,
  enrollmentDatesSchema,
  type CreateProgramInput,
  type UpdateProgramInput,
  type EnrollmentDates
} from '@/lib/schemas/program'

// ============================================================================
// Types
// ============================================================================

export interface Program {
  id: string
  tenant_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ProgramWithCounts extends Program {
  company_count: number
  contact_count: number
}

export interface ProgramEnrollment {
  company_id?: string
  contact_id?: string
  program_id: string
  start_date: string
  end_date: string | null
  created_at: string
}

export interface CompanyEnrollment extends ProgramEnrollment {
  company_id: string
  company?: {
    id: string
    business_name: string
  }
}

export interface ContactEnrollment extends ProgramEnrollment {
  contact_id: string
  contact?: {
    id: string
    first_name: string
    last_name: string
    email: string | null
  }
}

// ============================================================================
// Program CRUD Operations
// ============================================================================

/**
 * Get all programs for the authenticated user's tenant
 *
 * Optionally includes counts of enrolled companies and contacts.
 *
 * @param includeCounts - Whether to include enrollment counts
 * @returns Array of programs
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getPrograms(includeCounts = false): Promise<Program[] | ProgramWithCounts[]> {
  const { supabase } = await requireAuth()

  if (includeCounts) {
    // Get programs with counts
    const { data: programs, error } = await supabase
      .from('programs')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching programs:', error)
      throw new Error(`Failed to fetch programs: ${error.message}`)
    }

    // Get company counts for each program
    const { data: companyCounts } = await supabase
      .from('company_program_enrollments')
      .select('program_id')

    // Get contact counts for each program
    const { data: contactCounts } = await supabase
      .from('program_contacts')
      .select('program_id')

    // Aggregate counts by program_id
    const companyCountMap = new Map<string, number>()
    companyCounts?.forEach(row => {
      companyCountMap.set(row.program_id, (companyCountMap.get(row.program_id) || 0) + 1)
    })

    const contactCountMap = new Map<string, number>()
    contactCounts?.forEach(row => {
      contactCountMap.set(row.program_id, (contactCountMap.get(row.program_id) || 0) + 1)
    })

    return (programs || []).map(program => ({
      ...program,
      company_count: companyCountMap.get(program.id) || 0,
      contact_count: contactCountMap.get(program.id) || 0
    }))
  }

  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching programs:', error)
    throw new Error(`Failed to fetch programs: ${error.message}`)
  }

  return data || []
}

/**
 * Get a single program by ID
 *
 * @param id - Program UUID
 * @returns Program or null if not found
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getProgram(id: string): Promise<Program | null> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching program:', error)
    throw new Error(`Failed to fetch program: ${error.message}`)
  }

  return data
}

/**
 * Create a new program
 *
 * @param input - Program creation data
 * @returns Created program
 * @throws {Error} 'Unauthorized' if not authenticated
 * @throws {Error} Validation errors if input invalid
 */
export async function createProgram(input: CreateProgramInput): Promise<Program> {
  const { supabase } = await requireAuth()
  const tenantId = await getCurrentTenantId()

  // Validate input
  const validated = createProgramSchema.parse(input)

  const { data, error } = await supabase
    .from('programs')
    .insert({
      ...validated,
      tenant_id: tenantId
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating program:', error)
    throw new Error(`Failed to create program: ${error.message}`)
  }

  return data
}

/**
 * Update an existing program
 *
 * @param id - Program UUID
 * @param input - Program update data
 * @returns Updated program
 * @throws {Error} 'Unauthorized' if not authenticated
 * @throws {Error} Validation errors if input invalid
 */
export async function updateProgram(id: string, input: UpdateProgramInput): Promise<Program> {
  const { supabase } = await requireAuth()

  // Validate input
  const validated = updateProgramSchema.parse(input)

  const { data, error } = await supabase
    .from('programs')
    .update({
      ...validated,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating program:', error)
    throw new Error(`Failed to update program: ${error.message}`)
  }

  return data
}

/**
 * Delete a program
 *
 * Manually handles all dependencies:
 * 1. Sets program_id to NULL on all associated forms (don't delete forms)
 * 2. Deletes all company enrollments
 * 3. Deletes all contact enrollments
 * 4. Finally deletes the program itself
 *
 * @param id - Program UUID
 * @returns void
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function deleteProgram(id: string): Promise<void> {
  const { supabase } = await requireAuth()

  // First, unlink forms (set program_id to NULL, don't delete them)
  const { error: formError } = await supabase
    .from('forms')
    .update({ program_id: null })
    .eq('program_id', id)

  if (formError) {
    console.error('Error unlinking forms:', formError)
    throw new Error(`Failed to unlink forms: ${formError.message}`)
  }

  // Delete company enrollments
  const { error: companyError } = await supabase
    .from('company_program_enrollments')
    .delete()
    .eq('program_id', id)

  if (companyError) {
    console.error('Error deleting company enrollments:', companyError)
    throw new Error(`Failed to delete company enrollments: ${companyError.message}`)
  }

  // Delete contact enrollments
  const { error: contactError } = await supabase
    .from('program_contacts')
    .delete()
    .eq('program_id', id)

  if (contactError) {
    console.error('Error deleting contact enrollments:', contactError)
    throw new Error(`Failed to delete contact enrollments: ${contactError.message}`)
  }

  // Finally delete the program
  const { error } = await supabase
    .from('programs')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting program:', error)
    throw new Error(`Failed to delete program: ${error.message}`)
  }
}

// ============================================================================
// Company Enrollment Operations
// ============================================================================

/**
 * Get all company enrollments for a program
 *
 * Includes company details.
 *
 * @param programId - Program UUID
 * @returns Array of company enrollments
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getCompanyEnrollments(programId: string): Promise<CompanyEnrollment[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('company_program_enrollments')
    .select(`
      *,
      company:companies (
        id,
        business_name
      )
    `)
    .eq('program_id', programId)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching company enrollments:', error)
    throw new Error(`Failed to fetch company enrollments: ${error.message}`)
  }

  return data || []
}

/**
 * Enroll a company in a program
 *
 * @param programId - Program UUID
 * @param companyId - Company UUID
 * @param dates - Enrollment dates (start_date required, end_date optional)
 * @returns Created enrollment
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function enrollCompany(
  programId: string,
  companyId: string,
  dates: EnrollmentDates
): Promise<CompanyEnrollment> {
  const { supabase } = await requireAuth()

  // Validate dates
  const validated = enrollmentDatesSchema.parse(dates)

  const { data, error } = await supabase
    .from('company_program_enrollments')
    .insert({
      program_id: programId,
      company_id: companyId,
      start_date: validated.start_date,
      end_date: validated.end_date || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error enrolling company:', error)
    throw new Error(`Failed to enroll company: ${error.message}`)
  }

  return data as CompanyEnrollment
}

/**
 * Enroll multiple companies in a program with same dates
 *
 * Used for cohort-based programs where all companies start/end together.
 *
 * @param programId - Program UUID
 * @param companyIds - Array of company UUIDs
 * @param dates - Enrollment dates (same for all companies)
 * @returns Array of created enrollments
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function bulkEnrollCompanies(
  programId: string,
  companyIds: string[],
  dates: EnrollmentDates
): Promise<CompanyEnrollment[]> {
  const { supabase } = await requireAuth()

  if (companyIds.length === 0) {
    throw new Error('At least one company ID required')
  }

  // Validate dates
  const validated = enrollmentDatesSchema.parse(dates)

  const enrollmentData = companyIds.map(companyId => ({
    program_id: programId,
    company_id: companyId,
    start_date: validated.start_date,
    end_date: validated.end_date || null
  }))

  const { data, error } = await supabase
    .from('company_program_enrollments')
    .insert(enrollmentData)
    .select()

  if (error) {
    console.error('Error bulk enrolling companies:', error)
    throw new Error(`Failed to bulk enroll companies: ${error.message}`)
  }

  return (data || []) as CompanyEnrollment[]
}

/**
 * Update company enrollment dates
 *
 * @param programId - Program UUID
 * @param companyId - Company UUID
 * @param dates - Updated enrollment dates
 * @returns Updated enrollment
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function updateCompanyEnrollment(
  programId: string,
  companyId: string,
  dates: EnrollmentDates
): Promise<CompanyEnrollment> {
  const { supabase } = await requireAuth()

  // Validate dates
  const validated = enrollmentDatesSchema.parse(dates)

  const { data, error } = await supabase
    .from('company_program_enrollments')
    .update({
      start_date: validated.start_date,
      end_date: validated.end_date || null
    })
    .eq('program_id', programId)
    .eq('company_id', companyId)
    .select()
    .single()

  if (error) {
    console.error('Error updating company enrollment:', error)
    throw new Error(`Failed to update company enrollment: ${error.message}`)
  }

  return data as CompanyEnrollment
}

/**
 * Unenroll a company from a program
 *
 * @param programId - Program UUID
 * @param companyId - Company UUID
 * @returns void
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function unenrollCompany(programId: string, companyId: string): Promise<void> {
  const { supabase } = await requireAuth()

  const { error } = await supabase
    .from('company_program_enrollments')
    .delete()
    .eq('program_id', programId)
    .eq('company_id', companyId)

  if (error) {
    console.error('Error unenrolling company:', error)
    throw new Error(`Failed to unenroll company: ${error.message}`)
  }
}

// ============================================================================
// Contact Enrollment Operations
// ============================================================================

/**
 * Get all contact enrollments for a program
 *
 * Includes contact details.
 *
 * @param programId - Program UUID
 * @returns Array of contact enrollments
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getContactEnrollments(programId: string): Promise<ContactEnrollment[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('program_contacts')
    .select(`
      *,
      contact:contacts (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('program_id', programId)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching contact enrollments:', error)
    throw new Error(`Failed to fetch contact enrollments: ${error.message}`)
  }

  return data || []
}

/**
 * Enroll a contact in a program
 *
 * @param programId - Program UUID
 * @param contactId - Contact UUID
 * @param dates - Enrollment dates (start_date required, end_date optional)
 * @returns Created enrollment
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function enrollContact(
  programId: string,
  contactId: string,
  dates: EnrollmentDates
): Promise<ContactEnrollment> {
  const { supabase } = await requireAuth()

  // Validate dates
  const validated = enrollmentDatesSchema.parse(dates)

  const { data, error } = await supabase
    .from('program_contacts')
    .insert({
      program_id: programId,
      contact_id: contactId,
      start_date: validated.start_date,
      end_date: validated.end_date || null
    })
    .select()
    .single()

  if (error) {
    console.error('Error enrolling contact:', error)
    throw new Error(`Failed to enroll contact: ${error.message}`)
  }

  return data as ContactEnrollment
}

/**
 * Enroll multiple contacts in a program with same dates
 *
 * @param programId - Program UUID
 * @param contactIds - Array of contact UUIDs
 * @param dates - Enrollment dates (same for all contacts)
 * @returns Array of created enrollments
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function bulkEnrollContacts(
  programId: string,
  contactIds: string[],
  dates: EnrollmentDates
): Promise<ContactEnrollment[]> {
  const { supabase } = await requireAuth()

  if (contactIds.length === 0) {
    throw new Error('At least one contact ID required')
  }

  // Validate dates
  const validated = enrollmentDatesSchema.parse(dates)

  const enrollmentData = contactIds.map(contactId => ({
    program_id: programId,
    contact_id: contactId,
    start_date: validated.start_date,
    end_date: validated.end_date || null
  }))

  const { data, error } = await supabase
    .from('program_contacts')
    .insert(enrollmentData)
    .select()

  if (error) {
    console.error('Error bulk enrolling contacts:', error)
    throw new Error(`Failed to bulk enroll contacts: ${error.message}`)
  }

  return (data || []) as ContactEnrollment[]
}

/**
 * Update contact enrollment dates
 *
 * @param programId - Program UUID
 * @param contactId - Contact UUID
 * @param dates - Updated enrollment dates
 * @returns Updated enrollment
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function updateContactEnrollment(
  programId: string,
  contactId: string,
  dates: EnrollmentDates
): Promise<ContactEnrollment> {
  const { supabase } = await requireAuth()

  // Validate dates
  const validated = enrollmentDatesSchema.parse(dates)

  const { data, error } = await supabase
    .from('program_contacts')
    .update({
      start_date: validated.start_date,
      end_date: validated.end_date || null
    })
    .eq('program_id', programId)
    .eq('contact_id', contactId)
    .select()
    .single()

  if (error) {
    console.error('Error updating contact enrollment:', error)
    throw new Error(`Failed to update contact enrollment: ${error.message}`)
  }

  return data as ContactEnrollment
}

/**
 * Unenroll a contact from a program
 *
 * @param programId - Program UUID
 * @param contactId - Contact UUID
 * @returns void
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function unenrollContact(programId: string, contactId: string): Promise<void> {
  const { supabase } = await requireAuth()

  const { error } = await supabase
    .from('program_contacts')
    .delete()
    .eq('program_id', programId)
    .eq('contact_id', contactId)

  if (error) {
    console.error('Error unenrolling contact:', error)
    throw new Error(`Failed to unenroll contact: ${error.message}`)
  }
}

// ============================================================================
// Helper Functions for Auto-Enrollment Workflow
// ============================================================================

/**
 * Get contacts associated with a company
 *
 * Used for auto-enrolling contacts when enrolling a company in a program.
 *
 * @param companyId - Company UUID
 * @returns Array of contacts associated with this company
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getContactsByCompany(companyId: string): Promise<any[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('company_contacts')
    .select(`
      contact:contacts (
        id,
        first_name,
        last_name,
        email,
        role
      )
    `)
    .eq('company_id', companyId)

  if (error) {
    console.error('Error fetching contacts by company:', error)
    throw new Error(`Failed to fetch contacts: ${error.message}`)
  }

  // Flatten the nested structure
  return (data || []).map((item: any) => item.contact).filter(Boolean)
}

/**
 * Get companies associated with a contact
 *
 * Used for auto-enrolling companies when enrolling a contact in a program.
 *
 * @param contactId - Contact UUID
 * @returns Array of companies associated with this contact
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getCompaniesByContact(contactId: string): Promise<any[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('company_contacts')
    .select(`
      company:companies (
        id,
        business_name
      )
    `)
    .eq('contact_id', contactId)

  if (error) {
    console.error('Error fetching companies by contact:', error)
    throw new Error(`Failed to fetch companies: ${error.message}`)
  }

  return (data || []).map((item: any) => item.company).filter(Boolean)
}

/**
 * Get contacts enrolled in a specific program who are associated with a company
 *
 * Used when editing company enrollment dates to offer propagating to contacts.
 * Only returns contacts that are:
 * - Associated with the company
 * - Currently enrolled in the same program
 * - Still active (end_date NULL or in future)
 *
 * @param programId - Program UUID
 * @param companyId - Company UUID
 * @returns Array of enrolled contacts
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getEnrolledContactsByCompany(
  programId: string,
  companyId: string
): Promise<any[]> {
  const { supabase } = await requireAuth()

  // Get contacts associated with company
  const associatedContacts = await getContactsByCompany(companyId)
  const contactIds = associatedContacts.map(c => c.id)

  if (contactIds.length === 0) return []

  // Get those contacts' enrollments in this program (active only)
  const { data, error } = await supabase
    .from('program_contacts')
    .select(`
      *,
      contact:contacts (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('program_id', programId)
    .in('contact_id', contactIds)

  if (error) {
    console.error('Error fetching enrolled contacts:', error)
    throw new Error(`Failed to fetch enrolled contacts: ${error.message}`)
  }

  // Filter for active only (end_date NULL or future)
  const now = new Date().toISOString().split('T')[0]
  return (data || []).filter(enrollment =>
    !enrollment.end_date || enrollment.end_date >= now
  )
}

/**
 * Get companies enrolled in a specific program that are associated with a contact
 *
 * Mirror of getEnrolledContactsByCompany but for contacts → companies.
 *
 * @param programId - Program UUID
 * @param contactId - Contact UUID
 * @returns Array of enrolled companies
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getEnrolledCompaniesByContact(
  programId: string,
  contactId: string
): Promise<any[]> {
  const { supabase } = await requireAuth()

  const associatedCompanies = await getCompaniesByContact(contactId)
  const companyIds = associatedCompanies.map(c => c.id)

  if (companyIds.length === 0) return []

  const { data, error } = await supabase
    .from('company_program_enrollments')
    .select(`
      *,
      company:companies (
        id,
        business_name
      )
    `)
    .eq('program_id', programId)
    .in('company_id', companyIds)

  if (error) {
    console.error('Error fetching enrolled companies:', error)
    throw new Error(`Failed to fetch enrolled companies: ${error.message}`)
  }

  const now = new Date().toISOString().split('T')[0]
  return (data || []).filter(enrollment =>
    !enrollment.end_date || enrollment.end_date >= now
  )
}

// ============================================================================
// Get Programs by Company/Contact (for detail pages)
// ============================================================================

/**
 * Get all programs a company is enrolled in
 *
 * Includes program details and enrollment dates.
 *
 * @param companyId - Company UUID
 * @returns Array of enrollments with program details
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getProgramsByCompany(companyId: string): Promise<any[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('company_program_enrollments')
    .select(`
      *,
      program:programs (
        id,
        name,
        description
      )
    `)
    .eq('company_id', companyId)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching programs by company:', error)
    throw new Error(`Failed to fetch programs: ${error.message}`)
  }

  return data || []
}

/**
 * Get all programs a contact is enrolled in
 *
 * Includes program details and enrollment dates.
 *
 * @param contactId - Contact UUID
 * @returns Array of enrollments with program details
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getProgramsByContact(contactId: string): Promise<any[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('program_contacts')
    .select(`
      *,
      program:programs (
        id,
        name,
        description
      )
    `)
    .eq('contact_id', contactId)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching programs by contact:', error)
    throw new Error(`Failed to fetch programs: ${error.message}`)
  }

  return data || []
}

// ============================================================================
// Reporting Helpers
// ============================================================================

/**
 * Get companies that were active in a program during a specific time period
 *
 * A company is considered "active" if:
 * - start_date <= period_end AND (end_date >= period_start OR end_date IS NULL)
 *
 * @param programId - Program UUID (optional - if omitted, searches all programs)
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @returns Array of companies with enrollment details
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getCompaniesActiveInPeriod(
  startDate: Date,
  endDate: Date,
  programId?: string
): Promise<any[]> {
  const { supabase } = await requireAuth()

  const startIso = startDate.toISOString().split('T')[0] // Date only
  const endIso = endDate.toISOString().split('T')[0]

  let query = supabase
    .from('companies')
    .select(`
      *,
      company_program_enrollments!inner (
        start_date,
        end_date,
        program_id,
        program:programs (
          id,
          name
        )
      )
    `)
    .lte('company_program_enrollments.start_date', endIso)

  // Filter by program if provided
  if (programId) {
    query = query.eq('company_program_enrollments.program_id', programId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching active companies:', error)
    throw new Error(`Failed to fetch active companies: ${error.message}`)
  }

  // Filter for companies active during period (end_date >= startDate OR end_date IS NULL)
  const activeCompanies = (data || []).filter(company => {
    return company.company_program_enrollments.some((enrollment: any) => {
      if (!enrollment.end_date) {
        // Still active (no end date)
        return true
      }
      // Check if end_date >= period start
      return enrollment.end_date >= startIso
    })
  })

  return activeCompanies
}

/**
 * Get contacts that were active in a program during a specific time period
 *
 * Same logic as companies: active if enrolled during the period.
 *
 * @param programId - Program UUID (optional - if omitted, searches all programs)
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @returns Array of contacts with enrollment details
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getContactsActiveInPeriod(
  startDate: Date,
  endDate: Date,
  programId?: string
): Promise<any[]> {
  const { supabase } = await requireAuth()

  const startIso = startDate.toISOString().split('T')[0]
  const endIso = endDate.toISOString().split('T')[0]

  let query = supabase
    .from('contacts')
    .select(`
      *,
      program_contacts!inner (
        start_date,
        end_date,
        program_id,
        program:programs (
          id,
          name
        )
      )
    `)
    .lte('program_contacts.start_date', endIso)

  if (programId) {
    query = query.eq('program_contacts.program_id', programId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching active contacts:', error)
    throw new Error(`Failed to fetch active contacts: ${error.message}`)
  }

  // Filter for contacts active during period
  const activeContacts = (data || []).filter(contact => {
    return contact.program_contacts.some((enrollment: any) => {
      if (!enrollment.end_date) {
        return true
      }
      return enrollment.end_date >= startIso
    })
  })

  return activeContacts
}
