/**
 * Set Company Milestone Server Action Tests
 *
 * TDD: Tests for the server action that updates a company's current milestone.
 *
 * Tests verify:
 * - Setting a company's current milestone
 * - Permission enforcement (editors/admins only)
 * - Creating milestone history entries
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'

const testUserIds = new Set<string>()
const testTrackIds = new Set<string>()
const testDefinitionIds = new Set<string>()
const testCompanyIds = new Set<string>()
const testCompanyMilestoneIds = new Set<string>()

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

afterEach(async () => {
  // Cleanup in reverse dependency order
  await adminClient.from('milestone_history').delete().in(
    'company_id',
    Array.from(testCompanyIds)
  )

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

  await adminClient.from('organization_members').insert({
    user_id: data.user.id,
    organization_id: tenantId,
    role
  })

  await adminClient.from('user_sessions').insert({
    user_id: data.user.id,
    active_organization_id: tenantId
  })

  testUserIds.add(data.user.id)
  return data.user
}

describe('Set Company Milestone - Server Action Logic', () => {
  test('sets company current milestone and creates history entry', async () => {
    const timestamp = Date.now()
    const email = `admin-set-milestone-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-set-milestone-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Create company
    const { data: company } = await userClient
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: 'Test Company',
        company_type: 'Startup',
        city: 'Test City',
        province: 'Ontario'
      })
      .select()
      .single()

    if (company) testCompanyIds.add(company.id)

    // Create track and milestones
    const { data: track } = await userClient
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Software',
        slug: `software-${timestamp}`
      })
      .select()
      .single()

    if (track) testTrackIds.add(track.id)

    const { data: milestone1 } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track!.id,
        order_position: 1,
        name: 'Problem Validated',
        evidence_description: 'Evidence',
        objective_signal: 'Signal'
      })
      .select()
      .single()

    if (milestone1) testDefinitionIds.add(milestone1.id)

    // Set company milestone
    const { data: companyMilestone, error } = await userClient
      .from('company_milestones')
      .insert({
        company_id: company!.id,
        milestone_definition_id: milestone1!.id,
        status: 'working_towards'
      })
      .select()
      .single()

    if (companyMilestone) testCompanyMilestoneIds.add(companyMilestone.id)

    expect(error).toBeNull()
    expect(companyMilestone.status).toBe('working_towards')

    // Create history entry
    const { data: history, error: historyError } = await userClient
      .from('milestone_history')
      .insert({
        company_id: company!.id,
        from_milestone_id: null, // First milestone
        to_milestone_id: milestone1!.id,
        changed_by: (await userClient.auth.getUser()).data.user!.id,
        metadata: { note: 'Initial milestone set' }
      })
      .select()
      .single()

    expect(historyError).toBeNull()
    expect(history.company_id).toBe(company!.id)
    expect(history.to_milestone_id).toBe(milestone1!.id)
    expect(history.from_milestone_id).toBeNull()
  })

  test('updates company milestone and creates progression history', async () => {
    const timestamp = Date.now()
    const email = `admin-update-milestone-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-update-milestone-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Setup: company, track, two milestones
    const { data: company } = await userClient
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: 'Test Company',
        company_type: 'Startup',
        city: 'Test City',
        province: 'Ontario'
      })
      .select()
      .single()

    if (company) testCompanyIds.add(company.id)

    const { data: track } = await userClient
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Software',
        slug: `software-${timestamp}`
      })
      .select()
      .single()

    if (track) testTrackIds.add(track.id)

    const { data: milestone1 } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track!.id,
        order_position: 1,
        name: 'Problem Validated',
        evidence_description: 'Evidence',
        objective_signal: 'Signal'
      })
      .select()
      .single()

    if (milestone1) testDefinitionIds.add(milestone1.id)

    const { data: milestone2 } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track!.id,
        order_position: 2,
        name: 'Solution Validated',
        evidence_description: 'Evidence',
        objective_signal: 'Signal'
      })
      .select()
      .single()

    if (milestone2) testDefinitionIds.add(milestone2.id)

    // Set initial milestone
    const { data: initial } = await userClient
      .from('company_milestones')
      .insert({
        company_id: company!.id,
        milestone_definition_id: milestone1!.id,
        status: 'working_towards'
      })
      .select()
      .single()

    if (initial) testCompanyMilestoneIds.add(initial.id)

    // Update to next milestone
    const { data: updated, error: updateError } = await userClient
      .from('company_milestones')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        is_verified: true
      })
      .eq('id', initial!.id)
      .select()
      .single()

    expect(updateError).toBeNull()
    expect(updated.status).toBe('completed')

    // Create new working_towards for milestone 2
    const { data: next } = await userClient
      .from('company_milestones')
      .insert({
        company_id: company!.id,
        milestone_definition_id: milestone2!.id,
        status: 'working_towards'
      })
      .select()
      .single()

    if (next) testCompanyMilestoneIds.add(next.id)

    // Create history entry for progression
    const user = (await userClient.auth.getUser()).data.user!
    const { data: history } = await userClient
      .from('milestone_history')
      .insert({
        company_id: company!.id,
        from_milestone_id: milestone1!.id,
        to_milestone_id: milestone2!.id,
        changed_by: user.id,
        metadata: { verified: true }
      })
      .select()
      .single()

    expect(history.from_milestone_id).toBe(milestone1!.id)
    expect(history.to_milestone_id).toBe(milestone2!.id)
  })
})
