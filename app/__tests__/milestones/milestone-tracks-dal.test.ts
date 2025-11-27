/**
 * Milestone Tracks DAL Tests
 *
 * TDD: These tests are written FIRST and should FAIL until implementation.
 * Following strict TDD cycle: RED → GREEN → REFACTOR
 *
 * Tests verify:
 * - CRUD operations for milestone tracks
 * - Tenant isolation (RLS enforcement)
 * - Seeding default tracks
 */

import { createClient } from '@supabase/supabase-js'

// Test tenant IDs
const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'
const TENANT_2_ID = '22222222-2222-2222-2222-222222222222'

// Track test IDs for cleanup
const testUserIds = new Set<string>()
const testTrackIds = new Set<string>()

// Admin client for setup/cleanup
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cleanup after each test
afterEach(async () => {
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

  if (memberError) {
    console.error('Failed to create organization member:', memberError)
    throw memberError
  }

  const { error: sessionError } = await adminClient.from('user_sessions').insert({
    user_id: data.user.id,
    active_organization_id: tenantId
  })

  if (sessionError) {
    console.error('Failed to create user session:', sessionError)
    throw sessionError
  }

  testUserIds.add(data.user.id)
  return data.user
}

describe('Milestone Tracks DAL - TDD RED Phase', () => {
  test('creates milestone track for tenant', async () => {
    // Setup: Create admin user for Tenant 1
    const email = `admin-create-${Date.now()}@tenant1.test`
    const user = await createTestUser(email, TENANT_1_ID, 'admin')

    // Sign in as user with unique storage key to avoid session conflicts
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-create-${Date.now()}`
        }
      }
    )

    await userClient.auth.signInWithPassword({
      email,
      password: 'test-password-123'
    })

    // Test: Create a milestone track
    const { data: track, error } = await userClient
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Software',
        slug: 'software',
        description: 'Software milestone track',
        is_active: true
      })
      .select()
      .single()

    // Track for cleanup
    if (track) testTrackIds.add(track.id)

    // Assert: Track created successfully
    expect(error).toBeNull()
    expect(track).toBeDefined()
    expect(track.name).toBe('Software')
    expect(track.slug).toBe('software')
    expect(track.tenant_id).toBe(TENANT_1_ID)
    expect(track.is_active).toBe(true)
  })

  test('retrieves all tracks for tenant', async () => {
    // Setup: Create admin user and two tracks
    const email = `admin-retrieve-${Date.now()}@tenant1.test`
    const user = await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-retrieve-${Date.now()}`
        }
      }
    )

    await userClient.auth.signInWithPassword({
      email,
      password: 'test-password-123'
    })

    // Create two tracks
    const { data: track1, error: error1 } = await userClient
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Software',
        slug: 'software'
      })
      .select()
      .single()

    expect(error1).toBeNull()
    expect(track1).toBeDefined()

    const { data: track2, error: error2 } = await userClient
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Hardware',
        slug: 'hardware'
      })
      .select()
      .single()

    expect(error2).toBeNull()
    expect(track2).toBeDefined()

    if (track1) testTrackIds.add(track1.id)
    if (track2) testTrackIds.add(track2.id)

    // Test: Get all tracks
    const { data: tracks, error } = await userClient
      .from('milestone_tracks')
      .select('*')
      .eq('tenant_id', TENANT_1_ID)
      .order('name')

    // Assert: Both tracks retrieved
    expect(error).toBeNull()
    expect(tracks).toBeDefined()
    expect(tracks?.length).toBeGreaterThanOrEqual(2)

    const trackNames = tracks?.map(t => t.name) || []
    expect(trackNames).toContain('Software')
    expect(trackNames).toContain('Hardware')
  })

  test('RLS prevents cross-tenant track access', async () => {
    // Setup: Create users in two different tenants
    const timestamp = Date.now()
    const email1 = `user1-rls-${timestamp}@tenant1.test`
    const email2 = `user2-rls-${timestamp}@tenant2.test`
    const user1 = await createTestUser(email1, TENANT_1_ID, 'admin')
    const user2 = await createTestUser(email2, TENANT_2_ID, 'admin')

    // User 1 creates a track
    const user1Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-rls1-${timestamp}`
        }
      }
    )

    await user1Client.auth.signInWithPassword({
      email: email1,
      password: 'test-password-123'
    })

    const { data: track } = await user1Client
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Software',
        slug: 'software'
      })
      .select()
      .single()

    if (track) testTrackIds.add(track.id)

    // User 2 tries to access User 1's track
    const user2Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-rls2-${timestamp}`
        }
      }
    )

    await user2Client.auth.signInWithPassword({
      email: email2,
      password: 'test-password-123'
    })

    const { data: tracks, error } = await user2Client
      .from('milestone_tracks')
      .select('*')
      .eq('id', track!.id)

    // Assert: User 2 cannot see User 1's track
    expect(error).toBeNull() // Query succeeds but returns empty
    expect(tracks).toBeDefined()
    expect(tracks?.length).toBe(0) // RLS filters it out
  })

  test('updates milestone track', async () => {
    // Setup: Create user and track
    const timestamp = Date.now()
    const email = `admin-update-${timestamp}@tenant1.test`
    const user = await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-update-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({
      email,
      password: 'test-password-123'
    })

    const { data: track, error: createError } = await userClient
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Software',
        slug: 'software',
        is_active: true
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(track).toBeDefined()
    if (track) testTrackIds.add(track.id)

    // Test: Update track
    const { data: updated, error } = await userClient
      .from('milestone_tracks')
      .update({
        description: 'Updated description',
        is_active: false
      })
      .eq('id', track!.id)
      .select()
      .single()

    // Assert: Track updated
    expect(error).toBeNull()
    expect(updated).toBeDefined()
    expect(updated.description).toBe('Updated description')
    expect(updated.is_active).toBe(false)
    expect(updated.name).toBe('Software') // Unchanged
  })

  test('enforces unique slug per tenant', async () => {
    // Setup: Create user and track
    const timestamp = Date.now()
    const email = `admin-unique-${timestamp}@tenant1.test`
    const user = await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-unique-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({
      email,
      password: 'test-password-123'
    })

    // Create first track
    const { data: track1, error: createError1 } = await userClient
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Software',
        slug: 'software'
      })
      .select()
      .single()

    expect(createError1).toBeNull()
    expect(track1).toBeDefined()
    if (track1) testTrackIds.add(track1.id)

    // Test: Try to create duplicate slug
    const { data: track2, error } = await userClient
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        name: 'Software V2',
        slug: 'software' // Duplicate!
      })
      .select()
      .single()

    // Assert: Constraint violation (could be unique constraint or RLS blocking the duplicate)
    expect(error).not.toBeNull()
    expect(track2).toBeNull()
  })
})
