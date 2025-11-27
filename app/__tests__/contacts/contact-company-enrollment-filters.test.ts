/**
 * Tests for Contact Filtering with Company Enrollments
 *
 * Verifies that contacts can be filtered based on BOTH:
 * 1. Direct program enrollments (contact → program)
 * 2. Company-based enrollments (contact → company → program)
 *
 * This ensures the "Active in Programs" filter shows contacts who are
 * directly enrolled OR associated with companies that are enrolled.
 *
 * Related to: Contact filter enhancement request
 *
 * NOTE: These tests verify the query logic and data structure directly
 * at the database level, without requiring Next.js authentication context.
 */

import { createClient } from '@supabase/supabase-js'

// Admin client for test setup and cleanup
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Use existing Volta tenant for testing
const TEST_TENANT_ID = '11111111-1111-1111-1111-111111111111'

// Track test IDs for cleanup
const testContactIds = new Set<string>()
const testCompanyIds = new Set<string>()
const testProgramIds = new Set<string>()

describe('Contact Company Enrollment Filters', () => {
  let testProgramId: string
  let testProgram2Id: string

  // Companies
  let activeCompanyId: string
  let alumniCompanyId: string
  let notEnrolledCompanyId: string

  // Contacts
  let directlyEnrolledContactId: string
  let companyBasedContactId: string
  let bothEnrollmentsContactId: string
  let alumniWithActiveCompanyContactId: string
  let notEnrolledContactId: string
  let multipleCompaniesContactId: string

  beforeAll(async () => {
    // Create test programs
    const timestamp = Date.now()
    const { data: programs, error: programError } = await adminClient
      .from('programs')
      .insert([
        {
          tenant_id: TEST_TENANT_ID,
          name: `Test Program 1 ${timestamp}`,
          description: 'Primary test program'
        },
        {
          tenant_id: TEST_TENANT_ID,
          name: `Test Program 2 ${timestamp}`,
          description: 'Secondary test program'
        }
      ])
      .select()

    if (programError) throw programError
    testProgramId = programs[0].id
    testProgram2Id = programs[1].id
    testProgramIds.add(testProgramId)
    testProgramIds.add(testProgram2Id)

    // Create test companies
    const { data: companies, error: companiesError } = await adminClient
      .from('companies')
      .insert([
        {
          tenant_id: TEST_TENANT_ID,
          business_name: `Active Company ${timestamp}`
        },
        {
          tenant_id: TEST_TENANT_ID,
          business_name: `Alumni Company ${timestamp}`
        },
        {
          tenant_id: TEST_TENANT_ID,
          business_name: `Not Enrolled Company ${timestamp}`
        }
      ])
      .select()

    if (companiesError) throw companiesError

    activeCompanyId = companies[0].id
    alumniCompanyId = companies[1].id
    notEnrolledCompanyId = companies[2].id

    testCompanyIds.add(activeCompanyId)
    testCompanyIds.add(alumniCompanyId)
    testCompanyIds.add(notEnrolledCompanyId)

    // Create company enrollments
    const today = new Date().toISOString().split('T')[0]
    const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    await adminClient
      .from('company_program_enrollments')
      .insert([
        // Active company enrollment
        {
          company_id: activeCompanyId,
          program_id: testProgramId,
          start_date: today,
          end_date: futureDate
        },
        // Alumni company enrollment
        {
          company_id: alumniCompanyId,
          program_id: testProgramId,
          start_date: pastDate,
          end_date: pastDate
        }
      ])

    // Create test contacts
    const { data: contacts, error: contactsError } = await adminClient
      .from('contacts')
      .insert([
        {
          tenant_id: TEST_TENANT_ID,
          first_name: 'DirectlyEnrolled',
          last_name: 'Contact',
          email: `direct-${timestamp}@test.com`
        },
        {
          tenant_id: TEST_TENANT_ID,
          first_name: 'CompanyBased',
          last_name: 'Contact',
          email: `companybased-${timestamp}@test.com`
        },
        {
          tenant_id: TEST_TENANT_ID,
          first_name: 'BothEnrollments',
          last_name: 'Contact',
          email: `both-${timestamp}@test.com`
        },
        {
          tenant_id: TEST_TENANT_ID,
          first_name: 'AlumniWithActiveCompany',
          last_name: 'Contact',
          email: `alumniwithactive-${timestamp}@test.com`
        },
        {
          tenant_id: TEST_TENANT_ID,
          first_name: 'NotEnrolled',
          last_name: 'Contact',
          email: `notenrolled-${timestamp}@test.com`
        },
        {
          tenant_id: TEST_TENANT_ID,
          first_name: 'MultipleCompanies',
          last_name: 'Contact',
          email: `multiple-${timestamp}@test.com`
        }
      ])
      .select()

    if (contactsError) throw contactsError

    directlyEnrolledContactId = contacts[0].id
    companyBasedContactId = contacts[1].id
    bothEnrollmentsContactId = contacts[2].id
    alumniWithActiveCompanyContactId = contacts[3].id
    notEnrolledContactId = contacts[4].id
    multipleCompaniesContactId = contacts[5].id

    testContactIds.add(directlyEnrolledContactId)
    testContactIds.add(companyBasedContactId)
    testContactIds.add(bothEnrollmentsContactId)
    testContactIds.add(alumniWithActiveCompanyContactId)
    testContactIds.add(notEnrolledContactId)
    testContactIds.add(multipleCompaniesContactId)

    // Create direct contact enrollments
    await adminClient
      .from('program_contacts')
      .insert([
        // Contact 1: Directly enrolled (active)
        {
          contact_id: directlyEnrolledContactId,
          program_id: testProgramId,
          start_date: today,
          end_date: futureDate
        },
        // Contact 3: Both direct (active) + company (will link below)
        {
          contact_id: bothEnrollmentsContactId,
          program_id: testProgram2Id,
          start_date: today,
          end_date: futureDate
        },
        // Contact 4: Alumni direct enrollment + active company (will link below)
        {
          contact_id: alumniWithActiveCompanyContactId,
          program_id: testProgram2Id,
          start_date: pastDate,
          end_date: pastDate
        }
      ])

    // Link contacts to companies
    await adminClient
      .from('company_contacts')
      .insert([
        // Contact 2: Only company-based enrollment (active company)
        {
          contact_id: companyBasedContactId,
          company_id: activeCompanyId
        },
        // Contact 3: Both direct + company enrollment (active company)
        {
          contact_id: bothEnrollmentsContactId,
          company_id: activeCompanyId
        },
        // Contact 4: Alumni direct + active company
        {
          contact_id: alumniWithActiveCompanyContactId,
          company_id: activeCompanyId
        },
        // Contact 5: Not enrolled contact, linked to not enrolled company
        {
          contact_id: notEnrolledContactId,
          company_id: notEnrolledCompanyId
        },
        // Contact 6: Multiple companies (one active, one alumni)
        {
          contact_id: multipleCompaniesContactId,
          company_id: activeCompanyId
        },
        {
          contact_id: multipleCompaniesContactId,
          company_id: alumniCompanyId
        }
      ])
  })

  afterAll(async () => {
    // Clean up test data
    await adminClient
      .from('program_contacts')
      .delete()
      .in('contact_id', Array.from(testContactIds))

    await adminClient
      .from('company_contacts')
      .delete()
      .in('contact_id', Array.from(testContactIds))

    await adminClient
      .from('company_program_enrollments')
      .delete()
      .in('company_id', Array.from(testCompanyIds))

    for (const contactId of testContactIds) {
      await adminClient.from('contacts').delete().eq('id', contactId)
    }
    testContactIds.clear()

    for (const companyId of testCompanyIds) {
      await adminClient.from('companies').delete().eq('id', companyId)
    }
    testCompanyIds.clear()

    for (const programId of testProgramIds) {
      await adminClient.from('programs').delete().eq('id', programId)
    }
    testProgramIds.clear()
  })

  describe('Active Filter - Direct and Company Enrollments', () => {
    it('should show contacts with direct active enrollments', async () => {
      const today = new Date().toISOString().split('T')[0]

      // Query direct enrollments
      const { data: directEnrollments } = await adminClient
        .from('program_contacts')
        .select('contact_id')
        .in('contact_id', Array.from(testContactIds))
        .or(`end_date.is.null,end_date.gte.${today}`)

      const activeContactIds = new Set(directEnrollments?.map(e => e.contact_id) || [])

      // Should include contact with direct enrollment
      expect(activeContactIds.has(directlyEnrolledContactId)).toBe(true)
    })

    it('should show contacts associated with active companies', async () => {
      const today = new Date().toISOString().split('T')[0]

      // Get contacts and their company associations
      const { data: contacts } = await adminClient
        .from('contacts')
        .select(`
          id,
          company_contacts (
            company:companies (
              id
            )
          )
        `)
        .in('id', Array.from(testContactIds))

      // Get active company enrollments
      const { data: companyEnrollments } = await adminClient
        .from('company_program_enrollments')
        .select('company_id')
        .in('company_id', [activeCompanyId, alumniCompanyId, notEnrolledCompanyId])
        .or(`end_date.is.null,end_date.gte.${today}`)

      const activeCompanyIds = new Set(companyEnrollments?.map(e => e.company_id) || [])

      // Find contacts with active companies
      const contactsWithActiveCompanies = contacts?.filter(contact =>
        contact.company_contacts?.some((cc: any) =>
          cc.company?.id && activeCompanyIds.has(cc.company.id)
        )
      ).map(c => c.id)

      // Should include contact linked to active company (NEW BEHAVIOR)
      expect(contactsWithActiveCompanies).toContain(companyBasedContactId)
    })

    it('should combine direct and company-based enrollments', async () => {
      const today = new Date().toISOString().split('T')[0]

      // Get direct enrollments
      const { data: directEnrollments } = await adminClient
        .from('program_contacts')
        .select('contact_id')
        .in('contact_id', Array.from(testContactIds))
        .or(`end_date.is.null,end_date.gte.${today}`)

      // Get contacts with companies
      const { data: contacts } = await adminClient
        .from('contacts')
        .select(`
          id,
          company_contacts (
            company:companies (
              id
            )
          )
        `)
        .in('id', Array.from(testContactIds))

      // Get active company enrollments
      const { data: companyEnrollments } = await adminClient
        .from('company_program_enrollments')
        .select('company_id')
        .in('company_id', Array.from(testCompanyIds))
        .or(`end_date.is.null,end_date.gte.${today}`)

      const activeCompanyIds = new Set(companyEnrollments?.map(e => e.company_id) || [])

      // Combine both sources
      const activeContactIds = new Set(directEnrollments?.map(e => e.contact_id) || [])

      contacts?.forEach(contact => {
        const hasActiveCompany = contact.company_contacts?.some((cc: any) =>
          cc.company?.id && activeCompanyIds.has(cc.company.id)
        )
        if (hasActiveCompany) {
          activeContactIds.add(contact.id)
        }
      })

      // Should include all active contacts
      expect(activeContactIds.has(directlyEnrolledContactId)).toBe(true)
      expect(activeContactIds.has(companyBasedContactId)).toBe(true)
      expect(activeContactIds.has(bothEnrollmentsContactId)).toBe(true)
      expect(activeContactIds.has(alumniWithActiveCompanyContactId)).toBe(true)
      expect(activeContactIds.has(multipleCompaniesContactId)).toBe(true)

      // Should NOT include not enrolled contact
      expect(activeContactIds.has(notEnrolledContactId)).toBe(false)
    })
  })

  describe('Query Logic Validation', () => {
    it('should verify company enrollment table has correct structure', async () => {
      const { data: enrollment } = await adminClient
        .from('company_program_enrollments')
        .select('company_id, program_id, start_date, end_date')
        .eq('company_id', activeCompanyId)
        .single()

      expect(enrollment).toBeDefined()
      expect(enrollment).toHaveProperty('company_id')
      expect(enrollment).toHaveProperty('program_id')
      expect(enrollment).toHaveProperty('start_date')
      expect(enrollment).toHaveProperty('end_date')
    })

    it('should verify company_contacts junction table works', async () => {
      const { data: links } = await adminClient
        .from('company_contacts')
        .select('contact_id, company_id')
        .eq('contact_id', companyBasedContactId)

      expect(links).toBeDefined()
      expect(links?.length).toBeGreaterThan(0)
      expect(links?.[0]).toHaveProperty('contact_id')
      expect(links?.[0]).toHaveProperty('company_id')
      expect(links?.[0].company_id).toBe(activeCompanyId)
    })

    it('should efficiently query company enrollments for multiple contacts', async () => {
      // Extract company IDs from contact associations
      const { data: contacts } = await adminClient
        .from('contacts')
        .select(`
          id,
          company_contacts (
            company:companies (
              id
            )
          )
        `)
        .in('id', Array.from(testContactIds))

      const companyIds = new Set<string>()
      contacts?.forEach(contact => {
        contact.company_contacts?.forEach((cc: any) => {
          if (cc.company?.id) {
            companyIds.add(cc.company.id)
          }
        })
      })

      // Single query for all company enrollments
      const { data: companyEnrollments } = await adminClient
        .from('company_program_enrollments')
        .select('company_id, end_date')
        .in('company_id', Array.from(companyIds))

      expect(companyEnrollments).toBeDefined()
      expect(companyEnrollments!.length).toBeGreaterThan(0)
    })
  })
})
