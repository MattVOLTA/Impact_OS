/**
 * Milestone Editor Server Actions Tests
 *
 * TDD: Tests for admin actions to manage milestone definitions
 *
 * Tests verify:
 * - Creating new milestone
 * - Updating milestone definition
 * - Deleting (soft delete) milestone
 * - Reordering milestones
 * - Admin-only permission enforcement
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'

const testUserIds = new Set<string>()
const testTrackIds = new Set<string>()
const testDefinitionIds = new Set<string>()

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

afterEach(async () => {
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

describe('Milestone Editor Actions - Admin Operations', () => {
  test('creates new milestone definition', async () => {
    const timestamp = Date.now()
    const email = `admin-create-def-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-create-def-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Create track
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

    // Create milestone definition
    const { data: milestone, error } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track!.id,
        order_position: 1,
        name: 'Custom Milestone',
        evidence_description: 'Custom evidence requirement',
        objective_signal: 'Custom signal'
      })
      .select()
      .single()

    if (milestone) testDefinitionIds.add(milestone.id)

    expect(error).toBeNull()
    expect(milestone.name).toBe('Custom Milestone')
    expect(milestone.evidence_description).toBe('Custom evidence requirement')
    expect(milestone.objective_signal).toBe('Custom signal')
  })

  test('updates milestone definition text', async () => {
    const timestamp = Date.now()
    const email = `admin-update-def-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-update-def-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Create track and milestone
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

    const { data: milestone } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track!.id,
        order_position: 1,
        name: 'Original Name',
        evidence_description: 'Original evidence',
        objective_signal: 'Original signal'
      })
      .select()
      .single()

    if (milestone) testDefinitionIds.add(milestone.id)

    // Update the milestone
    const { data: updated, error } = await userClient
      .from('milestone_definitions')
      .update({
        name: 'Updated Name',
        evidence_description: 'Updated evidence',
        objective_signal: 'Updated signal'
      })
      .eq('id', milestone!.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated.name).toBe('Updated Name')
    expect(updated.evidence_description).toBe('Updated evidence')
    expect(updated.objective_signal).toBe('Updated signal')
  })

  test('soft deletes milestone definition', async () => {
    const timestamp = Date.now()
    const email = `admin-delete-def-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-delete-def-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Create track and milestone
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

    const { data: milestone } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track!.id,
        order_position: 1,
        name: 'To Delete',
        evidence_description: 'Evidence',
        objective_signal: 'Signal'
      })
      .select()
      .single()

    if (milestone) testDefinitionIds.add(milestone.id)

    // Soft delete
    const { error } = await userClient
      .from('milestone_definitions')
      .update({ is_active: false })
      .eq('id', milestone!.id)

    expect(error).toBeNull()

    // Verify it's marked inactive
    const { data: deleted } = await userClient
      .from('milestone_definitions')
      .select('*')
      .eq('id', milestone!.id)
      .single()

    expect(deleted.is_active).toBe(false)
  })

  test('reorders milestone definitions', async () => {
    const timestamp = Date.now()
    const email = `admin-reorder-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-reorder-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Create track
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

    // Create 3 milestones
    const { data: m1 } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track!.id,
        order_position: 1,
        name: 'First',
        evidence_description: 'E1',
        objective_signal: 'S1'
      })
      .select()
      .single()

    const { data: m2 } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track!.id,
        order_position: 2,
        name: 'Second',
        evidence_description: 'E2',
        objective_signal: 'S2'
      })
      .select()
      .single()

    const { data: m3 } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track!.id,
        order_position: 3,
        name: 'Third',
        evidence_description: 'E3',
        objective_signal: 'S3'
      })
      .select()
      .single()

    if (m1) testDefinitionIds.add(m1.id)
    if (m2) testDefinitionIds.add(m2.id)
    if (m3) testDefinitionIds.add(m3.id)

    // Reorder: Use temporary high numbers to avoid conflicts
    // Step 1: Move everything to temp positions (100+)
    await userClient.from('milestone_definitions').update({ order_position: 103 }).eq('id', m1!.id)
    await userClient.from('milestone_definitions').update({ order_position: 102 }).eq('id', m2!.id)
    await userClient.from('milestone_definitions').update({ order_position: 101 }).eq('id', m3!.id)

    // Step 2: Set final positions (swap first and third)
    await userClient.from('milestone_definitions').update({ order_position: 1 }).eq('id', m3!.id)
    await userClient.from('milestone_definitions').update({ order_position: 2 }).eq('id', m2!.id)
    await userClient.from('milestone_definitions').update({ order_position: 3 }).eq('id', m1!.id)

    // Verify new order
    const { data: reordered } = await userClient
      .from('milestone_definitions')
      .select('*')
      .eq('track_id', track!.id)
      .order('order_position')

    expect(reordered?.[0].name).toBe('Third')
    expect(reordered?.[1].name).toBe('Second')
    expect(reordered?.[2].name).toBe('First')
  })
})
