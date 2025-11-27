/**
 * Data Access Layer - Contacts
 *
 * All contact data access goes through this module.
 * Authentication checked via requireAuth() before any database operation.
 *
 * Refactored for Issue #55: Now uses authenticated client instead of admin client
 * so RLS policies apply and respect active organization context.
 *
 * See Epic #18 for contact management requirements.
 */

import { requireAuth, getCurrentTenantId } from './shared'

export interface ContactEmail {
  id: string
  contact_id: string
  email: string
  email_type?: 'work' | 'personal' | 'other' | null
  is_primary: boolean
  is_verified: boolean
  bounced_at?: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
  email?: string | null // Deprecated - use emails array
  phone?: string | null
  role?: string | null // Deprecated - use title field
  title?: string | null
  bio?: string | null
  linkedin_url?: string | null
  photo_url?: string | null
  created_at: string
  updated_at: string
  emails?: ContactEmail[] // All emails for this contact
  primary_email?: string | null // Convenience field - primary email address
}

export interface ContactWithCompanies extends Contact {
  companies?: Array<{
    id: string
    business_name: string
  }>
  active_programs_count?: number
  alumni_programs_count?: number
}

/**
 * Get all contacts for current tenant with optional search
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param searchQuery - Optional search filter for name or email
 * @returns Array of contacts with companies
 */
export async function getContacts(searchQuery?: string): Promise<ContactWithCompanies[]> {
  const { supabase } = await requireAuth()

  // Use authenticated client - RLS automatically filters by active organization
  let query = supabase
    .from('contacts')
    .select(`
      id,
      tenant_id,
      first_name,
      last_name,
      phone,
      role,
      bio,
      linkedin_url,
      photo_url,
      created_at,
      updated_at,
      contact_emails (
        id,
        email,
        email_type,
        is_primary,
        is_verified
      ),
      company_contacts (
        company:companies (
          id,
          business_name
        )
      )
    `)
    .order('last_name')
    .order('first_name')
    // Note: No manual tenant_id filter needed - RLS handles it automatically

  if (searchQuery) {
    // Search in names - email search will need to be handled separately via contact_emails join
    query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch contacts: ${error.message}`)
  }

  // Transform to flatten companies array and extract primary email
  return (data || []).map(contact => {
    const emails = (contact.contact_emails || []) as ContactEmail[]
    const primaryEmail = emails.find(e => e.is_primary)?.email || emails[0]?.email || null

    return {
      id: contact.id,
      tenant_id: contact.tenant_id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: primaryEmail, // Deprecated field - for backward compatibility
      primary_email: primaryEmail,
      phone: contact.phone,
      role: contact.role || null,
      bio: contact.bio,
      linkedin_url: contact.linkedin_url,
      photo_url: contact.photo_url,
      created_at: contact.created_at || new Date().toISOString(),
      updated_at: contact.updated_at || new Date().toISOString(),
      emails: emails,
      companies: contact.company_contacts?.map((cc: any) => cc.company).filter(Boolean) || []
    }
  })
}

/**
 * Get paginated contacts for current tenant with optional search
 *
 * Search filters ALL records in database BEFORE pagination.
 * Returns total count of filtered results for pagination UI.
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param params - Pagination parameters
 * @returns Object with contacts array and total count
 */
export async function getContactsPaginated({
  search,
  page = 1,
  pageSize = 50,
  programId,
  enrollmentStatus = 'all'
}: {
  search?: string
  page?: number
  pageSize?: number
  programId?: string
  enrollmentStatus?: 'all' | 'active' | 'alumni' | 'not_enrolled'
}): Promise<{ contacts: ContactWithCompanies[], totalCount: number }> {
  const { supabase } = await requireAuth()

  // Calculate range
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Use authenticated client - RLS automatically filters by active organization
  let query = supabase
    .from('contacts')
    .select(`
      id,
      tenant_id,
      first_name,
      last_name,
      phone,
      role,
      title,
      bio,
      linkedin_url,
      photo_url,
      created_at,
      updated_at,
      contact_emails (
        id,
        email,
        email_type,
        is_primary,
        is_verified
      ),
      company_contacts (
        company:companies (
          id,
          business_name
        )
      )
    `, { count: 'exact' })
    .order('last_name')
    .order('first_name')
    // Note: No manual tenant_id filter - RLS handles it via get_active_organization_id()

  // Apply search filter BEFORE pagination
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
  }

  // Get initial results (we'll filter by enrollment status in memory if needed)
  const { data: allContacts, error, count: initialCount } = await query

  if (error) {
    throw new Error(`Failed to fetch contacts: ${error.message}`)
  }

  if (!allContacts || allContacts.length === 0) {
    return { contacts: [], totalCount: 0 }
  }

  // If no enrollment filters, just paginate and return
  if (enrollmentStatus === 'all' && (!programId || programId === 'all')) {
    const paginatedData = (allContacts || []).slice(from, to + 1)
    const contacts = paginatedData.map(contact => {
      const emails = (contact.contact_emails || []) as ContactEmail[]
      const primaryEmail = emails.find(e => e.is_primary)?.email || emails[0]?.email || null

      return {
        id: contact.id,
        tenant_id: contact.tenant_id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: primaryEmail,
        primary_email: primaryEmail,
        phone: contact.phone,
        role: contact.role || null,
        bio: contact.bio,
        linkedin_url: contact.linkedin_url,
        photo_url: contact.photo_url,
        created_at: contact.created_at || new Date().toISOString(),
        updated_at: contact.updated_at || new Date().toISOString(),
        emails: emails,
        companies: contact.company_contacts?.map((cc: any) => cc.company).filter(Boolean) || []
      }
    })

    // Fetch program counts for paginated contacts
    const contactsWithCounts = await enrichContactsWithProgramCounts(supabase, contacts)

    return {
      contacts: contactsWithCounts,
      totalCount: initialCount || 0
    }
  }

  // Apply enrollment filtering
  // Fetch ALL enrollments for this tenant (RLS will automatically filter by active organization)
  let enrollmentQuery = supabase
    .from('program_contacts')
    .select(`
      contact_id,
      program_id,
      start_date,
      end_date
    `)

  if (programId && programId !== 'all') {
    enrollmentQuery = enrollmentQuery.eq('program_id', programId)
  }

  const { data: enrollments, error: enrollmentError } = await enrollmentQuery

  if (enrollmentError) {
    throw new Error(`Failed to fetch enrollments: ${enrollmentError.message}`)
  }

  // Filter contacts based on enrollment status
  const today = new Date().toISOString().split('T')[0]
  const filteredContactIds = new Set<string>()

  // Build set of contact IDs from search results for efficient filtering
  const searchedContactIds = new Set((allContacts || []).map(c => c.id))

  // Extract company IDs from already-loaded company_contacts data
  const companyIds = new Set<string>()
  allContacts?.forEach(contact => {
    contact.company_contacts?.forEach((cc: any) => {
      if (cc.company?.id) {
        companyIds.add(cc.company.id)
      }
    })
  })

  // Fetch company enrollments if we have companies
  let companyEnrollments: Array<{ company_id: string; end_date: string | null }> = []
  if (companyIds.size > 0) {
    let companyEnrollmentQuery = supabase
      .from('company_program_enrollments')
      .select('company_id, end_date')
      .in('company_id', Array.from(companyIds))

    if (programId && programId !== 'all') {
      companyEnrollmentQuery = companyEnrollmentQuery.eq('program_id', programId)
    }

    const { data, error: companyEnrollmentError } = await companyEnrollmentQuery

    if (companyEnrollmentError) {
      throw new Error(`Failed to fetch company enrollments: ${companyEnrollmentError.message}`)
    }

    companyEnrollments = data || []
  }

  // Build sets of companies with active/alumni enrollments
  const activeCompanyIds = new Set<string>()
  const alumniCompanyIds = new Set<string>()

  companyEnrollments.forEach(enrollment => {
    const isActive = !enrollment.end_date || enrollment.end_date >= today
    if (isActive) {
      activeCompanyIds.add(enrollment.company_id)
    } else {
      alumniCompanyIds.add(enrollment.company_id)
    }
  })

  if (enrollmentStatus === 'active') {
    // PART 1: Contacts with direct active enrollments
    enrollments?.forEach(enrollment => {
      if (searchedContactIds.has(enrollment.contact_id)) {
        const isActive = !enrollment.end_date || enrollment.end_date >= today
        if (isActive) {
          filteredContactIds.add(enrollment.contact_id)
        }
      }
    })

    // PART 2: Contacts associated with companies that have active enrollments
    allContacts?.forEach(contact => {
      if (searchedContactIds.has(contact.id)) {
        const hasActiveCompany = contact.company_contacts?.some((cc: any) =>
          cc.company?.id && activeCompanyIds.has(cc.company.id)
        )
        if (hasActiveCompany) {
          filteredContactIds.add(contact.id)
        }
      }
    })
  } else if (enrollmentStatus === 'alumni') {
    // Contacts with alumni enrollments but NO active enrollments
    const activeContactIds = new Set<string>()
    const alumniContactIds = new Set<string>()

    // PART 1: Direct enrollments
    enrollments?.forEach(enrollment => {
      if (searchedContactIds.has(enrollment.contact_id)) {
        const isActive = !enrollment.end_date || enrollment.end_date >= today
        if (isActive) {
          activeContactIds.add(enrollment.contact_id)
        } else {
          alumniContactIds.add(enrollment.contact_id)
        }
      }
    })

    // PART 2: Company-based enrollments
    allContacts?.forEach(contact => {
      if (searchedContactIds.has(contact.id)) {
        const hasActiveCompany = contact.company_contacts?.some((cc: any) =>
          cc.company?.id && activeCompanyIds.has(cc.company.id)
        )
        const hasAlumniCompany = contact.company_contacts?.some((cc: any) =>
          cc.company?.id && alumniCompanyIds.has(cc.company.id)
        )

        // Mark as active if they have any active company
        if (hasActiveCompany) {
          activeContactIds.add(contact.id)
        }
        // Mark as alumni if they have alumni company but no active
        if (hasAlumniCompany && !hasActiveCompany) {
          alumniContactIds.add(contact.id)
        }
      }
    })

    // Alumni only: has alumni enrollments (direct or company) but NOT active
    alumniContactIds.forEach(id => {
      if (!activeContactIds.has(id)) {
        filteredContactIds.add(id)
      }
    })
  } else if (enrollmentStatus === 'not_enrolled') {
    // Contacts with NO enrollments (direct or company-based)
    const enrolledContactIds = new Set(enrollments?.map(e => e.contact_id) || [])

    // Add contacts who have company enrollments
    allContacts?.forEach(contact => {
      if (searchedContactIds.has(contact.id)) {
        const hasEnrolledCompany = contact.company_contacts?.some((cc: any) =>
          cc.company?.id && (activeCompanyIds.has(cc.company.id) || alumniCompanyIds.has(cc.company.id))
        )
        if (hasEnrolledCompany) {
          enrolledContactIds.add(contact.id)
        }
      }
    })

    // Not enrolled: no direct enrollments AND no company enrollments
    searchedContactIds.forEach(id => {
      if (!enrolledContactIds.has(id)) {
        filteredContactIds.add(id)
      }
    })
  } else if (enrollmentStatus === 'all' && programId && programId !== 'all') {
    // When filtering by program but status is 'all', include all contacts with enrollments in that program
    // PART 1: Direct enrollments
    enrollments?.forEach(enrollment => {
      if (searchedContactIds.has(enrollment.contact_id)) {
        filteredContactIds.add(enrollment.contact_id)
      }
    })

    // PART 2: Company enrollments (already filtered by programId in query)
    allContacts?.forEach(contact => {
      if (searchedContactIds.has(contact.id)) {
        const hasEnrolledCompany = contact.company_contacts?.some((cc: any) =>
          cc.company?.id && (activeCompanyIds.has(cc.company.id) || alumniCompanyIds.has(cc.company.id))
        )
        if (hasEnrolledCompany) {
          filteredContactIds.add(contact.id)
        }
      }
    })
  }

  // Filter contacts array
  const filteredContacts = (allContacts || []).filter(contact =>
    filteredContactIds.has(contact.id)
  )

  // Apply pagination to filtered results
  const paginatedData = filteredContacts.slice(from, to + 1)

  // Transform data to flatten companies array and extract primary email
  const contacts = paginatedData.map(contact => {
    const emails = (contact.contact_emails || []) as ContactEmail[]
    const primaryEmail = emails.find(e => e.is_primary)?.email || emails[0]?.email || null

    return {
      id: contact.id,
      tenant_id: contact.tenant_id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: primaryEmail,
      primary_email: primaryEmail,
      phone: contact.phone,
      role: contact.role || null,
      bio: contact.bio,
      linkedin_url: contact.linkedin_url,
      photo_url: contact.photo_url,
      created_at: contact.created_at || new Date().toISOString(),
      updated_at: contact.updated_at || new Date().toISOString(),
      emails: emails,
      companies: contact.company_contacts?.map((cc: any) => cc.company).filter(Boolean) || []
    }
  })

  // Enrich with program counts
  const contactsWithCounts = await enrichContactsWithProgramCounts(supabase, contacts)

  return {
    contacts: contactsWithCounts,
    totalCount: filteredContacts.length
  }
}

/**
 * Helper function to enrich contacts with program enrollment counts
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param supabase - Authenticated Supabase client
 * @param contacts - Array of contacts to enrich
 * @returns Contacts with active_programs_count and alumni_programs_count
 */
async function enrichContactsWithProgramCounts(
  supabase: any,
  contacts: ContactWithCompanies[]
): Promise<ContactWithCompanies[]> {
  if (contacts.length === 0) return contacts

  const contactIds = contacts.map(c => c.id)
  const today = new Date().toISOString().split('T')[0]

  // Fetch all enrollments for these contacts - RLS handles tenant filtering
  const { data: enrollments, error } = await supabase
    .from('program_contacts')
    .select('contact_id, end_date')
    .in('contact_id', contactIds)

  if (error) {
    console.error('Failed to fetch program counts:', error)
    // Return contacts without counts rather than failing
    return contacts.map(c => ({
      ...c,
      active_programs_count: 0,
      alumni_programs_count: 0
    }))
  }

  // Count active and alumni programs per contact
  const counts = new Map<string, { active: number; alumni: number }>()

  enrollments?.forEach((enrollment: { contact_id: string; end_date: string | null }) => {
    const current = counts.get(enrollment.contact_id) || { active: 0, alumni: 0 }
    const isActive = !enrollment.end_date || enrollment.end_date >= today

    if (isActive) {
      current.active++
    } else {
      current.alumni++
    }

    counts.set(enrollment.contact_id, current)
  })

  // Enrich contacts with counts
  return contacts.map(contact => ({
    ...contact,
    active_programs_count: counts.get(contact.id)?.active || 0,
    alumni_programs_count: counts.get(contact.id)?.alumni || 0
  }))
}

/**
 * Search contacts by name (for duplicate detection)
 *
 * Searches first_name OR last_name (case-insensitive).
 * Includes company associations for context.
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param query - Search string (first or last name)
 * @returns Array of contacts with companies
 */
export async function searchContacts(query: string): Promise<ContactWithCompanies[]> {
  const { supabase } = await requireAuth()

  // RLS handles tenant filtering via get_active_organization_id()
  const { data, error } = await supabase
    .from('contacts')
    .select(`
      id,
      tenant_id,
      first_name,
      last_name,
      phone,
      role,
      bio,
      linkedin_url,
      photo_url,
      created_at,
      updated_at,
      contact_emails (
        id,
        email,
        email_type,
        is_primary,
        is_verified
      ),
      company_contacts (
        company:companies (
          id,
          business_name
        )
      )
    `)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .order('last_name')
    .order('first_name')

  if (error) {
    throw new Error(`Failed to search contacts: ${error.message}`)
  }

  // Transform to flatten companies array and extract primary email
  return (data || []).map(contact => {
    const emails = (contact.contact_emails || []) as ContactEmail[]
    const primaryEmail = emails.find(e => e.is_primary)?.email || emails[0]?.email || null

    return {
      id: contact.id,
      tenant_id: contact.tenant_id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: primaryEmail, // Deprecated field - for backward compatibility
      primary_email: primaryEmail,
      phone: contact.phone,
      role: contact.role || null,
      bio: contact.bio,
      linkedin_url: contact.linkedin_url,
      photo_url: contact.photo_url,
      created_at: contact.created_at || new Date().toISOString(),
      updated_at: contact.updated_at || new Date().toISOString(),
      emails: emails,
      companies: contact.company_contacts?.map((cc: any) => cc.company).filter(Boolean) || []
    }
  })
}

/**
 * Get single contact by ID with companies
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param contactId - Contact UUID
 * @returns Contact with companies or null
 */
export async function getContact(contactId: string): Promise<ContactWithCompanies | null> {
  const { supabase } = await requireAuth()

  // RLS handles tenant filtering via get_active_organization_id()
  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      contact_emails (
        id,
        email,
        email_type,
        is_primary,
        is_verified,
        bounced_at
      ),
      company_contacts (
        company:companies (
          id,
          business_name
        )
      )
    `)
    .eq('id', contactId)
    .single()

  if (error) {
    return null
  }

  const emails = (data.contact_emails || []) as ContactEmail[]
  const primaryEmail = emails.find(e => e.is_primary)?.email || emails[0]?.email || null

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    first_name: data.first_name,
    last_name: data.last_name,
    email: primaryEmail, // Deprecated field - for backward compatibility
    primary_email: primaryEmail,
    phone: data.phone,
    role: data.role,
    bio: data.bio,
    linkedin_url: data.linkedin_url,
    photo_url: data.photo_url,
    created_at: data.created_at,
    updated_at: data.updated_at,
    emails: emails,
    companies: data.company_contacts?.map((cc: any) => cc.company).filter(Boolean) || []
  }
}

/**
 * Get all contacts for a specific company
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param companyId - Company UUID
 * @returns Array of contacts linked to company
 */
export async function getContactsForCompany(companyId: string): Promise<Contact[]> {
  const { supabase } = await requireAuth()

  // RLS handles tenant filtering via get_active_organization_id()
  const { data, error } = await supabase
    .from('company_contacts')
    .select(`
      contact:contacts (
        id,
        first_name,
        last_name,
        phone,
        role,
        bio,
        linkedin_url,
        photo_url,
        created_at,
        updated_at,
        tenant_id,
        contact_emails (
          id,
          email,
          email_type,
          is_primary,
          is_verified
        )
      )
    `)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`Failed to fetch contacts: ${error.message}`)
  }

  // Extract contacts from junction table results and add email fields
  return (data || [])
    .map((item: any) => item.contact)
    .filter((contact: any) => contact)
    .map((contact: any) => {
      const emails = (contact.contact_emails || []) as ContactEmail[]
      const primaryEmail = emails.find(e => e.is_primary)?.email || emails[0]?.email || null

      return {
        ...contact,
        email: primaryEmail, // Deprecated field - for backward compatibility
        primary_email: primaryEmail,
        emails: emails
      }
    })
}

/**
 * Create a new contact
 *
 * Email uniqueness is enforced by database constraint.
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * Note: Still needs explicit tenant_id due to RLS with_check policy requirement
 *
 * @param data - Contact data
 * @returns Created contact
 */
export async function createContact(data: {
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
}): Promise<Contact> {
  const { supabase } = await requireAuth()

  // Get active organization ID (required by RLS WITH CHECK policy)
  const { getCurrentOrganizationId } = await import('./shared')
  const tenantId = await getCurrentOrganizationId()

  // RLS with_check policy requires explicit tenant_id on INSERT
  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      tenant_id: tenantId,
      ...data
    })
    .select()
    .single()

  if (error) {
    // Check for email uniqueness violation
    if (error.code === '23505') {
      throw new Error('A contact with this email already exists')
    }
    throw new Error(`Failed to create contact: ${error.message}`)
  }

  return contact as Contact
}

/**
 * Update a contact
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param contactId - Contact UUID
 * @param data - Fields to update
 * @returns Updated contact
 */
export async function updateContact(
  contactId: string,
  data: Partial<Omit<Contact, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<Contact> {
  const { supabase } = await requireAuth()

  // RLS handles tenant filtering via get_active_organization_id()
  const { data: contact, error } = await supabase
    .from('contacts')
    .update(data)
    .eq('id', contactId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('A contact with this email already exists')
    }
    throw new Error(`Failed to update contact: ${error.message}`)
  }

  return contact as Contact
}

/**
 * Delete a contact
 *
 * Cascades to company_contacts and contact_demographics.
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param contactId - Contact UUID
 */
export async function deleteContact(contactId: string): Promise<void> {
  const { supabase } = await requireAuth()

  // RLS handles tenant filtering via get_active_organization_id()
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)

  if (error) {
    throw new Error(`Failed to delete contact: ${error.message}`)
  }
}

/**
 * Link contact to company
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param contactId - Contact UUID
 * @param companyId - Company UUID
 */
export async function linkContactToCompany(contactId: string, companyId: string): Promise<void> {
  const { supabase } = await requireAuth()

  // RLS handles tenant filtering via parent table inheritance
  const { error } = await supabase
    .from('company_contacts')
    .insert({
      contact_id: contactId,
      company_id: companyId
    })

  if (error) {
    // Ignore duplicate link errors (idempotent)
    if (error.code === '23505') {
      return // Already linked
    }
    throw new Error(`Failed to link contact to company: ${error.message}`)
  }
}

/**
 * Unlink contact from company
 *
 * Removes junction record but keeps contact.
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param contactId - Contact UUID
 * @param companyId - Company UUID
 */
export async function unlinkContactFromCompany(contactId: string, companyId: string): Promise<void> {
  const { supabase } = await requireAuth()

  // RLS handles tenant filtering via parent table inheritance
  const { error } = await supabase
    .from('company_contacts')
    .delete()
    .eq('contact_id', contactId)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`Failed to unlink contact from company: ${error.message}`)
  }
}

/**
 * Add email to contact
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param contactId - Contact UUID
 * @param email - Email address
 * @param isPrimary - Whether this is the primary email
 * @param emailType - Type of email (work/personal/other)
 * @returns Created email record
 */
export async function addContactEmail(
  contactId: string,
  email: string,
  isPrimary: boolean = false,
  emailType?: 'work' | 'personal' | 'other'
): Promise<ContactEmail> {
  const { supabase } = await requireAuth()

  // Verify contact belongs to current tenant (RLS will filter)
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', contactId)
    .single()

  if (!contact) {
    throw new Error('Contact not found or access denied')
  }

  // RLS handles tenant filtering via parent table inheritance
  const { data: emailRecord, error } = await supabase
    .from('contact_emails')
    .insert({
      contact_id: contactId,
      email,
      email_type: emailType,
      is_primary: isPrimary
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('This email already exists for this contact')
    }
    throw new Error(`Failed to add email: ${error.message}`)
  }

  return emailRecord as ContactEmail
}

/**
 * Update contact email
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param emailId - Email UUID
 * @param data - Fields to update
 * @returns Updated email record
 */
export async function updateContactEmail(
  emailId: string,
  data: Partial<Pick<ContactEmail, 'email' | 'email_type' | 'is_primary' | 'is_verified'>>
): Promise<ContactEmail> {
  const { supabase } = await requireAuth()

  // Verify email belongs to contact in current tenant (RLS will filter)
  const { data: existingEmail } = await supabase
    .from('contact_emails')
    .select('contact_id, contacts!inner(id)')
    .eq('id', emailId)
    .single()

  if (!existingEmail) {
    throw new Error('Email not found or access denied')
  }

  // RLS handles tenant filtering via parent table inheritance
  const { data: emailRecord, error } = await supabase
    .from('contact_emails')
    .update(data)
    .eq('id', emailId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update email: ${error.message}`)
  }

  return emailRecord as ContactEmail
}

/**
 * Delete contact email
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param emailId - Email UUID
 */
export async function deleteContactEmail(emailId: string): Promise<void> {
  const { supabase } = await requireAuth()

  // Verify email belongs to contact in current tenant (RLS will filter)
  const { data: existingEmail } = await supabase
    .from('contact_emails')
    .select('contact_id, contacts!inner(id)')
    .eq('id', emailId)
    .single()

  if (!existingEmail) {
    throw new Error('Email not found or access denied')
  }

  // RLS handles tenant filtering via parent table inheritance
  const { error } = await supabase
    .from('contact_emails')
    .delete()
    .eq('id', emailId)

  if (error) {
    throw new Error(`Failed to delete email: ${error.message}`)
  }
}

/**
 * Set primary email for contact
 *
 * Unsets any existing primary email and sets the specified email as primary.
 *
 * Uses authenticated client so RLS policies apply (respects active organization)
 * Part of Issue #55: Fixed to use RLS instead of admin client
 *
 * @param emailId - Email UUID to set as primary
 */
export async function setPrimaryEmail(emailId: string): Promise<void> {
  const { supabase } = await requireAuth()

  // Get the email and verify access (RLS will filter)
  const { data: emailRecord } = await supabase
    .from('contact_emails')
    .select('contact_id, contacts!inner(id)')
    .eq('id', emailId)
    .single()

  if (!emailRecord) {
    throw new Error('Email not found or access denied')
  }

  const contactId = emailRecord.contact_id

  // Unset all primary emails for this contact (RLS handles tenant filtering)
  await supabase
    .from('contact_emails')
    .update({ is_primary: false })
    .eq('contact_id', contactId)

  // Set this email as primary
  const { error } = await supabase
    .from('contact_emails')
    .update({ is_primary: true })
    .eq('id', emailId)

  if (error) {
    throw new Error(`Failed to set primary email: ${error.message}`)
  }
}
