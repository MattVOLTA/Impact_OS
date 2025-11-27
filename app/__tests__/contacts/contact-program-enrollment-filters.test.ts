/**
 * Tests for Contact Program Enrollment Filtering
 *
 * Verifies that contacts can be filtered by program enrollment status.
 * Tests the query logic and data structure without requiring authentication.
 *
 * Related to Issue #52: Feature: Add Program Enrollment Filtering to Contacts List
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
const testProgramIds = new Set<string>()

describe('Contact Program Enrollment Filters', () => {
  let testProgramId: string
  let activeContactId: string
  let alumniContactId: string
  let mixedContactId: string
  let notEnrolledContactId: string

  beforeAll(async () => {
    // Create test program
    const { data: program, error: programError } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TEST_TENANT_ID,
        name: `Test Program ${Date.now()}`,
        description: 'Program for enrollment filter tests'
      })
      .select()
      .single()

    if (programError) throw programError
    testProgramId = program.id
    testProgramIds.add(testProgramId)

    // Create test contacts
    const timestamp = Date.now()
    const { data: contacts, error: contactsError} = await adminClient
      .from('contacts')
      .insert([
        {
          tenant_id: TEST_TENANT_ID,
          first_name: 'Active',
          last_name: 'Contact',
          email: `active-${timestamp}@test.com`
        },
        {
          tenant_id: TEST_TENANT_ID,
          first_name: 'Alumni',
          last_name: 'Contact',
          email: `alumni-${timestamp}@test.com`
        },
        {
          tenant_id: TEST_TENANT_ID,
          first_name: 'Mixed',
          last_name: 'Contact',
          email: `mixed-${timestamp}@test.com`
        },
        {
          tenant_id: TEST_TENANT_ID,
          first_name: 'NotEnrolled',
          last_name: 'Contact',
          email: `notenrolled-${timestamp}@test.com`
        }
      ])
      .select()

    if (contactsError) throw contactsError

    activeContactId = contacts[0].id
    alumniContactId = contacts[1].id
    mixedContactId = contacts[2].id
    notEnrolledContactId = contacts[3].id

    testContactIds.add(activeContactId)
    testContactIds.add(alumniContactId)
    testContactIds.add(mixedContactId)
    testContactIds.add(notEnrolledContactId)

    // Create program enrollments
    const today = new Date().toISOString().split('T')[0]
    const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    await adminClient
      .from('program_contacts')
      .insert([
        // Active enrollment (end_date in future)
        {
          contact_id: activeContactId,
          program_id: testProgramId,
          start_date: today,
          end_date: futureDate
        },
        // Alumni enrollment (end_date in past)
        {
          contact_id: alumniContactId,
          program_id: testProgramId,
          start_date: pastDate,
          end_date: pastDate
        },
        // Mixed: one active, one alumni
        {
          contact_id: mixedContactId,
          program_id: testProgramId,
          start_date: today,
          end_date: futureDate // Active
        }
      ])

    // Create second program for mixed contact (alumni)
    const { data: program2 } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TEST_TENANT_ID,
        name: 'Second Program',
        description: 'Second program for mixed contact'
      })
      .select()
      .single()

    if (program2) {
      await adminClient
        .from('program_contacts')
        .insert({
          contact_id: mixedContactId,
          program_id: program2.id,
          start_date: pastDate,
          end_date: pastDate // Alumni
        })
    }
  })

  afterAll(async () => {
    // Clean up test data
    await adminClient
      .from('program_contacts')
      .delete()
      .in('contact_id', [activeContactId, alumniContactId, mixedContactId, notEnrolledContactId])

    for (const contactId of testContactIds) {
      await adminClient.from('contacts').delete().eq('id', contactId)
    }
    testContactIds.clear()

    for (const programId of testProgramIds) {
      await adminClient.from('programs').delete().eq('id', programId)
    }
    testProgramIds.clear()
  })

  describe('Program Counts Query', () => {
    it('should correctly count active and alumni programs per contact', async () => {
      // Query program counts directly
      const { data: counts } = await adminClient
        .from('contacts')
        .select(`
          id,
          first_name,
          program_contacts (
            end_date
          )
        `)
        .in('id', [activeContactId, alumniContactId, mixedContactId, notEnrolledContactId])

      expect(counts).toBeDefined()
      expect(counts?.length).toBe(4)

      // Manual count calculation
      const today = new Date().toISOString().split('T')[0]

      counts?.forEach(contact => {
        const enrollments = contact.program_contacts || []
        const activeCount = enrollments.filter(
          (e: any) => !e.end_date || e.end_date >= today
        ).length
        const alumniCount = enrollments.filter(
          (e: any) => e.end_date && e.end_date < today
        ).length

        if (contact.id === activeContactId) {
          expect(activeCount).toBe(1)
          expect(alumniCount).toBe(0)
        } else if (contact.id === alumniContactId) {
          expect(activeCount).toBe(0)
          expect(alumniCount).toBe(1)
        } else if (contact.id === mixedContactId) {
          expect(activeCount).toBe(1)
          expect(alumniCount).toBe(1)
        } else if (contact.id === notEnrolledContactId) {
          expect(activeCount).toBe(0)
          expect(alumniCount).toBe(0)
        }
      })
    })
  })

  describe('Filter: Active Enrollments Query', () => {
    it('should identify contacts with active enrollments', async () => {
      const today = new Date().toISOString().split('T')[0]

      const { data: activeEnrollments } = await adminClient
        .from('program_contacts')
        .select('contact_id')
        .in('contact_id', [activeContactId, alumniContactId, mixedContactId, notEnrolledContactId])
        .or(`end_date.is.null,end_date.gte.${today}`)

      const activeContactIds = new Set(activeEnrollments?.map(e => e.contact_id) || [])

      // Should include active and mixed contacts
      expect(activeContactIds.has(activeContactId)).toBe(true)
      expect(activeContactIds.has(mixedContactId)).toBe(true)
      expect(activeContactIds.has(alumniContactId)).toBe(false)
      expect(activeContactIds.has(notEnrolledContactId)).toBe(false)
    })
  })

  describe('Filter: Alumni Enrollments Query', () => {
    it('should identify contacts with alumni enrollments (no active)', async () => {
      const today = new Date().toISOString().split('T')[0]

      const { data: activeEnrollments } = await adminClient
        .from('program_contacts')
        .select('contact_id')
        .in('contact_id', [activeContactId, alumniContactId, mixedContactId, notEnrolledContactId])
        .or(`end_date.is.null,end_date.gte.${today}`)

      const { data: alumniEnrollments } = await adminClient
        .from('program_contacts')
        .select('contact_id')
        .in('contact_id', [activeContactId, alumniContactId, mixedContactId, notEnrolledContactId])
        .lt('end_date', today)

      const activeContactIds = new Set(activeEnrollments?.map(e => e.contact_id) || [])
      const alumniContactIds = new Set(alumniEnrollments?.map(e => e.contact_id) || [])

      // Alumni only = has alumni enrollments but NOT in active set
      const alumniOnlyIds = Array.from(alumniContactIds).filter(id => !activeContactIds.has(id))

      // Should only include alumni contact (mixed has active enrollment)
      expect(alumniOnlyIds).toContain(alumniContactId)
      expect(alumniOnlyIds).not.toContain(mixedContactId)
      expect(alumniOnlyIds).not.toContain(activeContactId)
    })
  })

  describe('Filter: Not Enrolled Query', () => {
    it('should identify contacts with no enrollments', async () => {
      const { data: enrollments } = await adminClient
        .from('program_contacts')
        .select('contact_id')
        .in('contact_id', [activeContactId, alumniContactId, mixedContactId, notEnrolledContactId])

      const enrolledIds = new Set(enrollments?.map(e => e.contact_id) || [])
      const allTestIds = [activeContactId, alumniContactId, mixedContactId, notEnrolledContactId]
      const notEnrolledIds = allTestIds.filter(id => !enrolledIds.has(id))

      // Should only include notEnrolled contact
      expect(notEnrolledIds).toEqual([notEnrolledContactId])
    })
  })

  describe('Filter: By Specific Program Query', () => {
    it('should filter contacts by specific program', async () => {
      const { data: enrollments } = await adminClient
        .from('program_contacts')
        .select('contact_id')
        .in('contact_id', [activeContactId, alumniContactId, mixedContactId, notEnrolledContactId])
        .eq('program_id', testProgramId)

      const contactsInProgram = new Set(enrollments?.map(e => e.contact_id) || [])

      // Should include active, alumni, and mixed (all in testProgram)
      expect(contactsInProgram.size).toBe(3)
      expect(contactsInProgram.has(activeContactId)).toBe(true)
      expect(contactsInProgram.has(alumniContactId)).toBe(true)
      expect(contactsInProgram.has(mixedContactId)).toBe(true)
      expect(contactsInProgram.has(notEnrolledContactId)).toBe(false)
    })
  })

  describe('Enrollment Data Structure', () => {
    it('should verify program_contacts table has required columns', async () => {
      // Verify table structure supports active/alumni logic
      const { data: enrollment } = await adminClient
        .from('program_contacts')
        .select('contact_id, program_id, start_date, end_date')
        .eq('contact_id', activeContactId)
        .single()

      expect(enrollment).toBeDefined()
      expect(enrollment).toHaveProperty('contact_id')
      expect(enrollment).toHaveProperty('program_id')
      expect(enrollment).toHaveProperty('start_date')
      expect(enrollment).toHaveProperty('end_date')

      // Note: Database indexes verified via MCP tools:
      // - idx_program_contacts_contact
      // - idx_program_contacts_program
    })
  })
})
