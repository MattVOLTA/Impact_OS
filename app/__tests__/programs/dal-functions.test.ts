/**
 * Programs DAL Tests - Simplified Schema
 *
 * Tests verify:
 * - Program CRUD operations with tenant isolation
 * - Company enrollment (individual and bulk)
 * - Contact enrollment (individual and bulk)
 * - Date handling (start_date required, end_date optional = active)
 * - Reporting query for companies/contacts active in time period
 * - RLS policies prevent cross-tenant access
 *
 * Simplified schema: programs → program_companies / program_contacts (no cohorts table)
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'
const TENANT_2_ID = '22222222-2222-2222-2222-222222222222'

const testUserIds = new Set<string>()
const testProgramIds = new Set<string>()
const testCompanyIds = new Set<string>()
const testContactIds = new Set<string>()

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Helper to create test user
async function createTestUser(tenantId: string) {
  const email = `program-test-${Date.now()}-${Math.random()}@test.com`
  const { data: { user } } = await adminClient.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
    user_metadata: {
      tenant_id: tenantId,
      first_name: 'Test',
      last_name: 'User'
    }
  })

  if (!user) throw new Error('User creation failed')
  testUserIds.add(user.id)

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  await userClient.auth.signInWithPassword({
    email,
    password: 'test-password-123'
  })

  return { user, userClient }
}

// Helper to create test company
async function createTestCompany(tenantId: string, name: string) {
  const { data: company, error } = await adminClient
    .from('companies')
    .insert({
      tenant_id: tenantId,
      business_name: name
    })
    .select()
    .single()

  if (error || !company) throw new Error('Company creation failed')
  testCompanyIds.add(company.id)
  return company
}

// Helper to create test contact
async function createTestContact(tenantId: string, firstName: string, lastName: string) {
  const { data: contact, error } = await adminClient
    .from('contacts')
    .insert({
      tenant_id: tenantId,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`
    })
    .select()
    .single()

  if (error || !contact) throw new Error('Contact creation failed')
  testContactIds.add(contact.id)
  return contact
}

afterEach(async () => {
  // Cleanup enrollments first (FK constraints)
  for (const programId of testProgramIds) {
    await adminClient
      .from('company_program_enrollments')
      .delete()
      .eq('program_id', programId)

    await adminClient
      .from('program_contacts')
      .delete()
      .eq('program_id', programId)
  }

  // Cleanup programs
  for (const programId of testProgramIds) {
    await adminClient
      .from('programs')
      .delete()
      .eq('id', programId)
  }
  testProgramIds.clear()

  // Cleanup companies
  for (const companyId of testCompanyIds) {
    await adminClient
      .from('companies')
      .delete()
      .eq('id', companyId)
  }
  testCompanyIds.clear()

  // Cleanup contacts
  for (const contactId of testContactIds) {
    await adminClient
      .from('contacts')
      .delete()
      .eq('id', contactId)
  }
  testContactIds.clear()

  // Cleanup users
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

// ============================================================================
// Program CRUD Tests
// ============================================================================

describe('Programs DAL - CRUD Operations', () => {
  test('should create program with tenant isolation', async () => {
    const { data: program, error } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Spring Accelerator',
        description: 'Early-stage startup accelerator'
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(program).toBeDefined()
    expect(program?.name).toBe('Spring Accelerator')
    expect(program?.tenant_id).toBe(TENANT_1_ID)

    if (program) testProgramIds.add(program.id)
  })

  test('should get all programs for tenant', async () => {
    // Create programs for tenant 1
    const { data: program1 } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Program 1'
      })
      .select()
      .single()

    const { data: program2 } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Program 2'
      })
      .select()
      .single()

    // Create program for tenant 2 (should not be returned)
    const { data: program3 } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_2_ID,
        name: 'Program 3'
      })
      .select()
      .single()

    if (program1) testProgramIds.add(program1.id)
    if (program2) testProgramIds.add(program2.id)
    if (program3) testProgramIds.add(program3.id)

    // Query as tenant 1 user via RLS
    const { userClient } = await createTestUser(TENANT_1_ID)
    const { data: programs, error } = await userClient
      .from('programs')
      .select('*')

    expect(error).toBeNull()
    expect(programs).toBeDefined()
    expect(programs?.length).toBe(2) // Only tenant 1 programs
    expect(programs?.some(p => p.name === 'Program 3')).toBe(false) // Tenant 2 excluded
  })

  test('should update program', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Original Name'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const { userClient } = await createTestUser(TENANT_1_ID)
    const { data: updated, error } = await userClient
      .from('programs')
      .update({
        name: 'Updated Name',
        description: 'New description'
      })
      .eq('id', program.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated?.name).toBe('Updated Name')
    expect(updated?.description).toBe('New description')
  })

  test('should delete program and cascade enrollments', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'To Delete'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const company = await createTestCompany(TENANT_1_ID, 'Test Company')

    // Enroll company
    await adminClient
      .from('company_program_enrollments')
      .insert({
        program_id: program.id,
        company_id: company.id,
        start_date: '2024-01-01'
      })

    const { userClient } = await createTestUser(TENANT_1_ID)

    // Delete program
    const { error } = await userClient
      .from('programs')
      .delete()
      .eq('id', program.id)

    expect(error).toBeNull()

    // Verify enrollment also deleted (cascade)
    const { data: enrollments } = await adminClient
      .from('company_program_enrollments')
      .select('*')
      .eq('program_id', program.id)

    expect(enrollments?.length).toBe(0)
  })

  test('should prevent cross-tenant program access via RLS', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Tenant 1 Program'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    // Try to access as tenant 2 user
    const { userClient } = await createTestUser(TENANT_2_ID)
    const { data: programs } = await userClient
      .from('programs')
      .select('*')
      .eq('id', program.id)

    expect(programs?.length).toBe(0) // RLS blocks access
  })
})

// ============================================================================
// Company Enrollment Tests
// ============================================================================

describe('Company Enrollments - Individual and Bulk', () => {
  test('should enroll company with start and end dates', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Spring 2024 Accelerator'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const company = await createTestCompany(TENANT_1_ID, 'Test Company')

    // Enroll with dates
    const { data: enrollment, error } = await adminClient
      .from('company_program_enrollments')
      .insert({
        program_id: program.id,
        company_id: company.id,
        start_date: '2024-01-01',
        end_date: '2024-06-30'
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(enrollment?.start_date).toBe('2024-01-01')
    expect(enrollment?.end_date).toBe('2024-06-30')
  })

  test('should enroll company with NULL end_date (still active)', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: '2024 Mentorship'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const company = await createTestCompany(TENANT_1_ID, 'Active Company')

    // Enroll without end_date (still active)
    const { data: enrollment, error } = await adminClient
      .from('company_program_enrollments')
      .insert({
        program_id: program.id,
        company_id: company.id,
        start_date: '2024-02-15',
        end_date: null
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(enrollment?.start_date).toBe('2024-02-15')
    expect(enrollment?.end_date).toBeNull()
  })

  test('should bulk enroll multiple companies with same dates', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Cohort Program'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const company1 = await createTestCompany(TENANT_1_ID, 'Company 1')
    const company2 = await createTestCompany(TENANT_1_ID, 'Company 2')
    const company3 = await createTestCompany(TENANT_1_ID, 'Company 3')

    // Bulk enroll with same dates
    const enrollmentData = [company1.id, company2.id, company3.id].map(id => ({
      program_id: program.id,
      company_id: id,
      start_date: '2024-01-01',
      end_date: '2024-06-30'
    }))

    const { data: enrollments, error } = await adminClient
      .from('company_program_enrollments')
      .insert(enrollmentData)
      .select()

    expect(error).toBeNull()
    expect(enrollments?.length).toBe(3)
    expect(enrollments?.every(e => e.start_date === '2024-01-01')).toBe(true)
    expect(enrollments?.every(e => e.end_date === '2024-06-30')).toBe(true)
  })

  test('should update company enrollment dates', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Test Program'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const company = await createTestCompany(TENANT_1_ID, 'Test Company')

    // Initial enrollment
    await adminClient
      .from('company_program_enrollments')
      .insert({
        program_id: program.id,
        company_id: company.id,
        start_date: '2024-01-01',
        end_date: null
      })

    // Update to set end_date (company completed)
    const { userClient } = await createTestUser(TENANT_1_ID)
    const { data: updated, error } = await userClient
      .from('company_program_enrollments')
      .update({
        end_date: '2024-12-31'
      })
      .eq('program_id', program.id)
      .eq('company_id', company.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated?.end_date).toBe('2024-12-31')
  })

  test('should unenroll company from program', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Test Program'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const company = await createTestCompany(TENANT_1_ID, 'Test Company')

    // Enroll
    await adminClient
      .from('company_program_enrollments')
      .insert({
        program_id: program.id,
        company_id: company.id,
        start_date: '2024-01-01'
      })

    // Unenroll
    const { userClient } = await createTestUser(TENANT_1_ID)
    const { error } = await userClient
      .from('company_program_enrollments')
      .delete()
      .eq('program_id', program.id)
      .eq('company_id', company.id)

    expect(error).toBeNull()

    // Verify removed
    const { data: enrollments } = await userClient
      .from('company_program_enrollments')
      .select('*')
      .eq('program_id', program.id)

    expect(enrollments?.length).toBe(0)
  })
})

// ============================================================================
// Contact Enrollment Tests
// ============================================================================

describe('Contact Enrollments - Individual and Bulk', () => {
  test('should enroll contact in program', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Founder Training'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const contact = await createTestContact(TENANT_1_ID, 'John', 'Doe')

    // Enroll contact
    const { data: enrollment, error } = await adminClient
      .from('program_contacts')
      .insert({
        program_id: program.id,
        contact_id: contact.id,
        start_date: '2024-03-01',
        end_date: null
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(enrollment?.start_date).toBe('2024-03-01')
    expect(enrollment?.end_date).toBeNull()
  })

  test('should bulk enroll multiple contacts', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Leadership Program'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const contact1 = await createTestContact(TENANT_1_ID, 'Alice', 'Smith')
    const contact2 = await createTestContact(TENANT_1_ID, 'Bob', 'Johnson')
    const contact3 = await createTestContact(TENANT_1_ID, 'Carol', 'Williams')

    // Bulk enroll
    const enrollmentData = [contact1.id, contact2.id, contact3.id].map(id => ({
      program_id: program.id,
      contact_id: id,
      start_date: '2024-02-01',
      end_date: '2024-05-31'
    }))

    const { data: enrollments, error } = await adminClient
      .from('program_contacts')
      .insert(enrollmentData)
      .select()

    expect(error).toBeNull()
    expect(enrollments?.length).toBe(3)
    expect(enrollments?.every(e => e.start_date === '2024-02-01')).toBe(true)
  })
})

// ============================================================================
// Reporting Query Tests
// ============================================================================

describe('Reporting - Active Companies and Contacts in Period', () => {
  test('should query companies active in Q2 2024', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Test Program'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const company = await createTestCompany(TENANT_1_ID, 'Q2 Company')

    // Enroll for full year (includes Q2)
    await adminClient
      .from('company_program_enrollments')
      .insert({
        program_id: program.id,
        company_id: company.id,
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      })

    const { userClient } = await createTestUser(TENANT_1_ID)

    // Query for Q2 (Apr 1 - June 30)
    const { data: companies } = await userClient
      .from('companies')
      .select(`
        *,
        company_program_enrollments!inner (
          start_date,
          end_date,
          program_id
        )
      `)
      .eq('company_program_enrollments.program_id', program.id)
      .lte('company_program_enrollments.start_date', '2024-06-30')

    // Should include company since enrollment overlaps Q2
    const activeInQ2 = companies?.filter(c => {
      return c.company_program_enrollments.some((e: any) => {
        return !e.end_date || e.end_date >= '2024-04-01'
      })
    })

    expect(activeInQ2?.length).toBe(1)
  })

  test('should handle multiple companies with different enrollment periods', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Continuous Intake'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const companyA = await createTestCompany(TENANT_1_ID, 'Company A')
    const companyB = await createTestCompany(TENANT_1_ID, 'Company B')
    const companyC = await createTestCompany(TENANT_1_ID, 'Company C')

    // Company A: Jan 15 - Mar 30 (NOT active in Q2)
    await adminClient
      .from('company_program_enrollments')
      .insert({
        program_id: program.id,
        company_id: companyA.id,
        start_date: '2024-01-15',
        end_date: '2024-03-30'
      })

    // Company B: Feb 1 - NULL (active in Q2)
    await adminClient
      .from('company_program_enrollments')
      .insert({
        program_id: program.id,
        company_id: companyB.id,
        start_date: '2024-02-01',
        end_date: null
      })

    // Company C: Apr 10 - Aug 15 (active in Q2)
    await adminClient
      .from('company_program_enrollments')
      .insert({
        program_id: program.id,
        company_id: companyC.id,
        start_date: '2024-04-10',
        end_date: '2024-08-15'
      })

    const { userClient } = await createTestUser(TENANT_1_ID)

    // Query for Q2 (Apr 1 - June 30)
    const { data: companies } = await userClient
      .from('companies')
      .select(`
        id,
        business_name,
        company_program_enrollments!inner (
          start_date,
          end_date,
          program_id
        )
      `)
      .eq('company_program_enrollments.program_id', program.id)
      .lte('company_program_enrollments.start_date', '2024-06-30')

    // Filter for Q2 active (end_date >= Apr 1 OR end_date IS NULL)
    const activeInQ2 = companies?.filter(company => {
      return company.company_program_enrollments.some((e: any) => {
        return !e.end_date || e.end_date >= '2024-04-01'
      })
    })

    expect(activeInQ2?.length).toBe(2) // Company B and C
    expect(activeInQ2?.some(c => c.business_name === 'Company B')).toBe(true)
    expect(activeInQ2?.some(c => c.business_name === 'Company C')).toBe(true)
    expect(activeInQ2?.some(c => c.business_name === 'Company A')).toBe(false)
  })
})

// ============================================================================
// Tenant Isolation Tests
// ============================================================================

describe('Tenant Isolation - RLS Policies', () => {
  test('should prevent cross-tenant enrollment access via RLS', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Test Program'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const company = await createTestCompany(TENANT_1_ID, 'Test Company')

    // Enroll company
    await adminClient
      .from('company_program_enrollments')
      .insert({
        program_id: program.id,
        company_id: company.id,
        start_date: '2024-01-01'
      })

    // Try to access as tenant 2 user
    const { userClient } = await createTestUser(TENANT_2_ID)
    const { data: enrollments } = await userClient
      .from('company_program_enrollments')
      .select('*')
      .eq('program_id', program.id)

    expect(enrollments?.length).toBe(0) // RLS blocks (inherits from company)
  })

  test('should prevent cross-tenant contact enrollment access', async () => {
    const { data: program } = await adminClient
      .from('programs')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Test Program'
      })
      .select()
      .single()

    if (!program) throw new Error('Program creation failed')
    testProgramIds.add(program.id)

    const contact = await createTestContact(TENANT_1_ID, 'Test', 'Contact')

    // Enroll contact
    await adminClient
      .from('program_contacts')
      .insert({
        program_id: program.id,
        contact_id: contact.id,
        start_date: '2024-01-01'
      })

    // Try to access as tenant 2 user
    const { userClient } = await createTestUser(TENANT_2_ID)
    const { data: enrollments } = await userClient
      .from('program_contacts')
      .select('*')
      .eq('program_id', program.id)

    expect(enrollments?.length).toBe(0) // RLS blocks (inherits from contact)
  })
})
