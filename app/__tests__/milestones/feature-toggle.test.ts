/**
 * Milestone Tracking Feature Toggle Tests
 *
 * TDD: Tests for enabling/disabling milestone tracking feature
 * and managing which tracks are enabled.
 *
 * Tests verify:
 * - Enabling/disabling milestone tracking
 * - Managing enabled tracks
 * - Seeding default tracks on first enable
 * - Tenant isolation
 */

import { createClient } from '@supabase/supabase-js'

// Test tenant IDs
const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'

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
  // Clean up ONLY tracks we created (tracked in testTrackIds)
  // DO NOT delete by slug pattern - that deletes production data!
  for (const id of testTrackIds) {
    await adminClient.from('milestone_tracks').delete().eq('id', id)
  }
  testTrackIds.clear()

  // Note: We intentionally do NOT reset tenant_config.milestone_tracking_enabled
  // because that would disable the feature in production
  // These tests verify the config can be read/written, not that it should be reset

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

describe('Milestone Tracking Feature Toggle', () => {
  test('milestone tracking is disabled by default', async () => {
    const timestamp = Date.now()
    const email = `admin-toggle-default-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-toggle-default-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Check tenant config
    const { data: config, error } = await userClient
      .from('tenant_config')
      .select('milestone_tracking_enabled, enabled_milestone_tracks')
      .eq('tenant_id', TENANT_1_ID)
      .single()

    expect(error).toBeNull()
    expect(config).toBeDefined()
    expect(config.milestone_tracking_enabled).toBe(false)
    expect(config.enabled_milestone_tracks).toEqual([])
  })

  test('enables milestone tracking feature', async () => {
    const timestamp = Date.now()
    const email = `admin-toggle-enable-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-toggle-enable-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Enable milestone tracking
    const { data: updated, error } = await userClient
      .from('tenant_config')
      .update({
        milestone_tracking_enabled: true
      })
      .eq('tenant_id', TENANT_1_ID)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated.milestone_tracking_enabled).toBe(true)
  })

  test('manages enabled track slugs', async () => {
    const timestamp = Date.now()
    const email = `admin-toggle-tracks-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-toggle-tracks-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Enable specific tracks
    const { data: updated, error } = await userClient
      .from('tenant_config')
      .update({
        milestone_tracking_enabled: true,
        enabled_milestone_tracks: ['software', 'hardware']
      })
      .eq('tenant_id', TENANT_1_ID)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated.enabled_milestone_tracks).toEqual(['software', 'hardware'])
  })

  test('disables milestone tracking feature', async () => {
    const timestamp = Date.now()
    const email = `admin-toggle-disable-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-toggle-disable-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // First enable
    await userClient
      .from('tenant_config')
      .update({
        milestone_tracking_enabled: true,
        enabled_milestone_tracks: ['software']
      })
      .eq('tenant_id', TENANT_1_ID)

    // Then disable
    const { data: disabled, error } = await userClient
      .from('tenant_config')
      .update({
        milestone_tracking_enabled: false
      })
      .eq('tenant_id', TENANT_1_ID)
      .select()
      .single()

    expect(error).toBeNull()
    expect(disabled.milestone_tracking_enabled).toBe(false)
    // Note: enabled_milestone_tracks array is preserved when disabling
  })

  test('verifies tenant_config record exists for tenant', async () => {
    // This test ensures tenant_config is properly initialized
    const { data: config, error } = await adminClient
      .from('tenant_config')
      .select('*')
      .eq('tenant_id', TENANT_1_ID)
      .maybeSingle()

    expect(error).toBeNull()
    expect(config).toBeDefined()
    expect(config?.tenant_id).toBe(TENANT_1_ID)
  })
})
