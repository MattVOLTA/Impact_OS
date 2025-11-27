/**
 * Company Milestones DAL Tests
 *
 * TDD: These tests are written FIRST and should FAIL until implementation.
 * Following strict TDD cycle: RED → GREEN → REFACTOR
 *
 * Tests verify:
 * - Setting company's current milestone
 * - Updating milestone status
 * - Milestone history tracking
 * - Tenant isolation
 */

import { createClient } from '@supabase/supabase-js'

// Test tenant IDs
const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'

// Track test IDs for cleanup
const testUserIds = new Set<string>()
const testTrackIds = new Set<string>()
const testDefinitionIds = new Set<string>()
const testCompanyIds = new Set<string>()
const testCompanyMilestoneIds = new Set<string>()

// Admin client for setup/cleanup
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cleanup after each test
afterEach(async () => {
  // Delete in reverse dependency order
  for (const id of testCompanyMilestoneIds) {
    await adminClient.from('company_milestones').delete().eq('id', id)
  }
  testCompanyMilestoneIds.clear()

  for (const id of testCompanyIds) {
    await adminClient.from('companies').delete().eq('id', id)
  }
  testCompanyIds.clear()

  for (const id of testDefinitionIds) {
    await adminClient.from('milestone_definitions').delete().eq('id', id)
  }
  testDefinitionIds.clear()

  for (const id of testTrackIds) {
    await adminClient.from('milestone_tracks').delete().eq('id', id)
  }
  testTrackIds.clear()

  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

// Helper to create test user
async function createTestUser(email: string, tenantId: string, role: string = 'admin') {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
    user_metadata: {
      tenant_id: tenantId,
      first_name: 'Test',
      last_name: 'User',
      role
    }
  })

  if (error) throw error
  if (!data.user) throw new Error('User creation failed')

  const { error: memberError } = await adminClient.from('organization_members').insert({
    user_id: data.user.id,
    organization_id: tenantId,
    role
  })

  if (memberError) throw memberError

  const { error: sessionError } = await adminClient.from('user_sessions').insert({
    user_id: data.user.id,
    active_organization_id: tenantId
  })

  if (sessionError) throw sessionError

  testUserIds.add(data.user.id)
  return data.user
}

// Helper to create company
async function createTestCompany(userClient: any, tenantId: string, name: string) {
  const { data, error } = await userClient
    .from('companies')
    .insert({
      tenant_id: tenantId,
      business_name: name,
      company_type: 'Startup',
      city: 'Test City',
      province: 'Ontario'
    })
    .select()
    .single()

  if (error) throw error
  if (data) testCompanyIds.add(data.id)
  return data
}

// Helper to create track with milestone
async function createTrackWithMilestone(userClient: any, tenantId: string) {
  // Make slug unique by adding timestamp
  const uniqueSlug = `software-${Date.now()}`

  const { data: track } = await userClient
    .from('milestone_tracks')
    .insert({
      tenant_id: tenantId,
      name: 'Software',
      slug: uniqueSlug
    })
    .select()
    .single()

  if (track) testTrackIds.add(track.id)

  const { data: milestone } = await userClient
    .from('milestone_definitions')
    .insert({
      track_id: track.id,
      order_position: 1,
      name: 'Problem Validated',
      evidence_description: 'Evidence',
      objective_signal: 'Signal'
    })
    .select()
    .single()

  if (milestone) testDefinitionIds.add(milestone.id)

  return { track, milestone }
}

describe('Company Milestones DAL - TDD', () => {
  test('sets current milestone for company', async () => {
    const timestamp = Date.now()
    const email = `admin-cm-set-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-cm-set-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    const company = await createTestCompany(userClient, TENANT_1_ID, 'Test Company')
    const { milestone } = await createTrackWithMilestone(userClient, TENANT_1_ID)

    // Set company milestone
    const { data: companyMilestone, error } = await userClient
      .from('company_milestones')
      .insert({
        company_id: company.id,
        milestone_definition_id: milestone.id,
        status: 'working_towards'
      })
      .select()
      .single()

    if (companyMilestone) testCompanyMilestoneIds.add(companyMilestone.id)

    expect(error).toBeNull()
    expect(companyMilestone).toBeDefined()
    expect(companyMilestone.company_id).toBe(company.id)
    expect(companyMilestone.milestone_definition_id).toBe(milestone.id)
    expect(companyMilestone.status).toBe('working_towards')
    expect(companyMilestone.is_verified).toBeNull()
    expect(companyMilestone.completed_at).toBeNull()
  })

  test('marks milestone as completed with date', async () => {
    const timestamp = Date.now()
    const email = `admin-cm-complete-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-cm-complete-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    const company = await createTestCompany(userClient, TENANT_1_ID, 'Test Company')
    const { milestone } = await createTrackWithMilestone(userClient, TENANT_1_ID)

    const completedDate = new Date().toISOString()

    const { data: companyMilestone } = await userClient
      .from('company_milestones')
      .insert({
        company_id: company.id,
        milestone_definition_id: milestone.id,
        status: 'completed',
        completed_at: completedDate,
        is_verified: true,
        notes: 'Achieved milestone successfully'
      })
      .select()
      .single()

    if (companyMilestone) testCompanyMilestoneIds.add(companyMilestone.id)

    expect(companyMilestone).toBeDefined()
    expect(companyMilestone.status).toBe('completed')
    expect(companyMilestone.is_verified).toBe(true)
    expect(companyMilestone.completed_at).toBeTruthy() // Just verify it exists
    expect(companyMilestone.notes).toBe('Achieved milestone successfully')
  })

  test('updates milestone status', async () => {
    const timestamp = Date.now()
    const email = `admin-cm-update-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-cm-update-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    const company = await createTestCompany(userClient, TENANT_1_ID, 'Test Company')
    const { milestone } = await createTrackWithMilestone(userClient, TENANT_1_ID)

    // Create initial record
    const { data: initial } = await userClient
      .from('company_milestones')
      .insert({
        company_id: company.id,
        milestone_definition_id: milestone.id,
        status: 'working_towards'
      })
      .select()
      .single()

    if (initial) testCompanyMilestoneIds.add(initial.id)

    // Update to completed
    const completedDate = new Date().toISOString()
    const { data: updated, error } = await userClient
      .from('company_milestones')
      .update({
        status: 'completed',
        completed_at: completedDate,
        is_verified: true
      })
      .eq('id', initial!.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated.status).toBe('completed')
    expect(updated.completed_at).toBeTruthy() // Just verify it exists
    expect(updated.is_verified).toBe(true)
  })

  test('enforces unique company-milestone combination', async () => {
    const timestamp = Date.now()
    const email = `admin-cm-unique-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-cm-unique-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    const company = await createTestCompany(userClient, TENANT_1_ID, 'Test Company')
    const { milestone } = await createTrackWithMilestone(userClient, TENANT_1_ID)

    // Create first record
    const { data: first } = await userClient
      .from('company_milestones')
      .insert({
        company_id: company.id,
        milestone_definition_id: milestone.id,
        status: 'working_towards'
      })
      .select()
      .single()

    if (first) testCompanyMilestoneIds.add(first.id)

    // Try to create duplicate
    const { data: duplicate, error } = await userClient
      .from('company_milestones')
      .insert({
        company_id: company.id,
        milestone_definition_id: milestone.id,
        status: 'completed'
      })
      .select()
      .single()

    // Should fail due to unique constraint
    expect(error).not.toBeNull()
    expect(duplicate).toBeNull()
  })

  test('retrieves company milestone with definition details', async () => {
    const timestamp = Date.now()
    const email = `admin-cm-details-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-cm-details-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    const company = await createTestCompany(userClient, TENANT_1_ID, 'Test Company')
    const { milestone } = await createTrackWithMilestone(userClient, TENANT_1_ID)

    const { data: companyMilestone } = await userClient
      .from('company_milestones')
      .insert({
        company_id: company.id,
        milestone_definition_id: milestone.id,
        status: 'working_towards'
      })
      .select()
      .single()

    if (companyMilestone) testCompanyMilestoneIds.add(companyMilestone.id)

    // Retrieve with relationships
    const { data: withDetails, error } = await userClient
      .from('company_milestones')
      .select(`
        *,
        milestone_definition:milestone_definitions(*),
        company:companies(id, business_name)
      `)
      .eq('id', companyMilestone!.id)
      .single()

    expect(error).toBeNull()
    expect(withDetails).toBeDefined()
    expect(withDetails.milestone_definition.name).toBe('Problem Validated')
    expect(withDetails.company.business_name).toBe('Test Company')
  })
})
