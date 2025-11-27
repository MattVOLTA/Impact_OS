/**
 * Milestone Definitions DAL Tests
 *
 * TDD: These tests are written FIRST and should FAIL until implementation.
 * Following strict TDD cycle: RED → GREEN → REFACTOR
 *
 * Tests verify:
 * - CRUD operations for milestone definitions
 * - Ordering and sequencing
 * - Relationship to tracks
 * - Tenant isolation (via track ownership)
 */

import { createClient } from '@supabase/supabase-js'

// Test tenant IDs
const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'
const TENANT_2_ID = '22222222-2222-2222-2222-222222222222'

// Track test IDs for cleanup
const testUserIds = new Set<string>()
const testTrackIds = new Set<string>()
const testDefinitionIds = new Set<string>()

// Admin client for setup/cleanup
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cleanup after each test
afterEach(async () => {
  // Delete test definitions
  for (const id of testDefinitionIds) {
    await adminClient.from('milestone_definitions').delete().eq('id', id)
  }
  testDefinitionIds.clear()

  // Delete test tracks
  for (const id of testTrackIds) {
    await adminClient.from('milestone_tracks').delete().eq('id', id)
  }
  testTrackIds.clear()

  // Delete test users
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

  // Create organization member and session records
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

// Helper to create test track
async function createTestTrack(userClient: any, tenantId: string, name: string, slug: string) {
  // Make slug unique by adding timestamp
  const uniqueSlug = `${slug}-${Date.now()}`

  const { data: track, error } = await userClient
    .from('milestone_tracks')
    .insert({
      tenant_id: tenantId,
      name,
      slug: uniqueSlug
    })
    .select()
    .single()

  if (error) throw error
  if (track) testTrackIds.add(track.id)
  return track
}

describe('Milestone Definitions DAL - TDD RED Phase', () => {
  test('creates milestone definition for track', async () => {
    const timestamp = Date.now()
    const email = `admin-def-create-${timestamp}@tenant1.test`
    const user = await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-def-create-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Create track first
    const track = await createTestTrack(userClient, TENANT_1_ID, 'Software', 'software')

    // Create milestone definition
    const { data: definition, error } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track.id,
        order_position: 1,
        name: 'Problem Validated',
        evidence_description: '5+ customers confirmed problem',
        objective_signal: 'Letters of intent received'
      })
      .select()
      .single()

    if (definition) testDefinitionIds.add(definition.id)

    expect(error).toBeNull()
    expect(definition).toBeDefined()
    expect(definition.track_id).toBe(track.id)
    expect(definition.order_position).toBe(1)
    expect(definition.name).toBe('Problem Validated')
    expect(definition.version).toBe(1) // Default version
    expect(definition.is_active).toBe(true) // Default active
  })

  test('retrieves definitions ordered by position', async () => {
    const timestamp = Date.now()
    const email = `admin-def-retrieve-${timestamp}@tenant1.test`
    const user = await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-def-retrieve-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    const track = await createTestTrack(userClient, TENANT_1_ID, 'Software', 'software')

    // Create definitions out of order
    const { data: def3 } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track.id,
        order_position: 3,
        name: 'Third Milestone',
        evidence_description: 'Evidence 3',
        objective_signal: 'Signal 3'
      })
      .select()
      .single()

    const { data: def1 } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track.id,
        order_position: 1,
        name: 'First Milestone',
        evidence_description: 'Evidence 1',
        objective_signal: 'Signal 1'
      })
      .select()
      .single()

    const { data: def2 } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track.id,
        order_position: 2,
        name: 'Second Milestone',
        evidence_description: 'Evidence 2',
        objective_signal: 'Signal 2'
      })
      .select()
      .single()

    if (def1) testDefinitionIds.add(def1.id)
    if (def2) testDefinitionIds.add(def2.id)
    if (def3) testDefinitionIds.add(def3.id)

    // Retrieve all definitions for track, ordered
    const { data: definitions, error } = await userClient
      .from('milestone_definitions')
      .select('*')
      .eq('track_id', track.id)
      .order('order_position')

    expect(error).toBeNull()
    expect(definitions).toBeDefined()
    expect(definitions?.length).toBe(3)
    expect(definitions?.[0].name).toBe('First Milestone')
    expect(definitions?.[1].name).toBe('Second Milestone')
    expect(definitions?.[2].name).toBe('Third Milestone')
  })

  test('enforces unique order per track', async () => {
    const timestamp = Date.now()
    const email = `admin-def-unique-${timestamp}@tenant1.test`
    const user = await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-def-unique-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    const track = await createTestTrack(userClient, TENANT_1_ID, 'Software', 'software')

    // Create first definition
    const { data: def1 } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track.id,
        order_position: 1,
        name: 'First',
        evidence_description: 'Evidence',
        objective_signal: 'Signal'
      })
      .select()
      .single()

    if (def1) testDefinitionIds.add(def1.id)

    // Try to create duplicate order
    const { data: def2, error } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track.id,
        order_position: 1, // Duplicate!
        name: 'Duplicate Order',
        evidence_description: 'Evidence',
        objective_signal: 'Signal'
      })
      .select()
      .single()

    // Should fail due to unique constraint
    expect(error).not.toBeNull()
    expect(def2).toBeNull()
  })

  test('updates milestone definition', async () => {
    const timestamp = Date.now()
    const email = `admin-def-update-${timestamp}@tenant1.test`
    const user = await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-def-update-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    const track = await createTestTrack(userClient, TENANT_1_ID, 'Software', 'software')

    const { data: definition } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track.id,
        order_position: 1,
        name: 'Original Name',
        evidence_description: 'Original evidence',
        objective_signal: 'Original signal'
      })
      .select()
      .single()

    if (definition) testDefinitionIds.add(definition.id)

    // Update the definition
    const { data: updated, error } = await userClient
      .from('milestone_definitions')
      .update({
        name: 'Updated Name',
        evidence_description: 'Updated evidence'
      })
      .eq('id', definition!.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated).toBeDefined()
    expect(updated.name).toBe('Updated Name')
    expect(updated.evidence_description).toBe('Updated evidence')
    expect(updated.objective_signal).toBe('Original signal') // Unchanged
  })

  test('soft deletes milestone definition', async () => {
    const timestamp = Date.now()
    const email = `admin-def-delete-${timestamp}@tenant1.test`
    const user = await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-def-delete-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    const track = await createTestTrack(userClient, TENANT_1_ID, 'Software', 'software')

    const { data: definition } = await userClient
      .from('milestone_definitions')
      .insert({
        track_id: track.id,
        order_position: 1,
        name: 'To Delete',
        evidence_description: 'Evidence',
        objective_signal: 'Signal'
      })
      .select()
      .single()

    if (definition) testDefinitionIds.add(definition.id)

    // Soft delete by setting is_active = false
    const { error } = await userClient
      .from('milestone_definitions')
      .update({ is_active: false })
      .eq('id', definition!.id)

    expect(error).toBeNull()

    // Verify it's marked as inactive
    const { data: deleted } = await userClient
      .from('milestone_definitions')
      .select('*')
      .eq('id', definition!.id)
      .single()

    expect(deleted.is_active).toBe(false)
  })

  test('RLS prevents access to definitions from other tenant tracks', async () => {
    const timestamp = Date.now()
    const email1 = `user1-def-rls-${timestamp}@tenant1.test`
    const email2 = `user2-def-rls-${timestamp}@tenant2.test`

    const user1 = await createTestUser(email1, TENANT_1_ID, 'admin')
    const user2 = await createTestUser(email2, TENANT_2_ID, 'admin')

    // User 1 client
    const user1Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-def-rls1-${timestamp}`
        }
      }
    )

    await user1Client.auth.signInWithPassword({ email: email1, password: 'test-password-123' })

    // User 1 creates track and definition
    const track = await createTestTrack(user1Client, TENANT_1_ID, 'Software', 'software')

    const { data: definition } = await user1Client
      .from('milestone_definitions')
      .insert({
        track_id: track.id,
        order_position: 1,
        name: 'Tenant 1 Milestone',
        evidence_description: 'Evidence',
        objective_signal: 'Signal'
      })
      .select()
      .single()

    if (definition) testDefinitionIds.add(definition.id)

    // User 2 client
    const user2Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-def-rls2-${timestamp}`
        }
      }
    )

    await user2Client.auth.signInWithPassword({ email: email2, password: 'test-password-123' })

    // User 2 tries to access User 1's definition
    const { data: definitions, error } = await user2Client
      .from('milestone_definitions')
      .select('*')
      .eq('id', definition!.id)

    // Should return empty due to RLS
    expect(error).toBeNull()
    expect(definitions).toBeDefined()
    expect(definitions?.length).toBe(0)
  })
})
