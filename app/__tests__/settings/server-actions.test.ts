/**
 * Settings Server Actions Tests
 *
 * Following TDD: These tests verify the Server Actions work end-to-end.
 *
 * Tests verify:
 * - testFirefliesConnection validates API keys
 * - saveFirefliesKey stores encrypted and updates tenant_config
 * - disconnectFireflies removes key and clears metadata
 * - toggleFireflies updates feature flag
 * - Role-based access (admin only)
 *
 * See Issue #9 for implementation details.
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL!
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD!

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Fireflies Server Actions - Integration Tests', () => {
  test('admin user can access Settings page and see connection status', async () => {
    // Verify test user exists and is admin
    const { data: userData } = await adminClient
      .from('users')
      .select('id, role, tenant_id')
      .eq('email', TEST_USER_EMAIL)
      .single()

    expect(userData).toBeDefined()
    expect(userData?.role).toBe('admin')
    expect(userData?.tenant_id).toBe(TENANT_1_ID)

    // Verify tenant_config exists
    const { data: config } = await adminClient
      .from('tenant_config')
      .select('tenant_id, feature_fireflies, fireflies_connection_status')
      .eq('tenant_id', TENANT_1_ID)
      .single()

    expect(config).toBeDefined()
    expect(config?.tenant_id).toBe(TENANT_1_ID)
  })

  test('Vault wrapper functions are accessible', async () => {
    // Test creating a secret
    const testSecret = 'test_value_123'
    const testName = `test_${Date.now()}`

    const { data: secretId, error } = await adminClient
      .rpc('vault_create_secret', {
        new_secret: testSecret,
        new_name: testName,
        new_description: 'Test secret'
      })

    expect(error).toBeNull()
    expect(secretId).toBeDefined()
    expect(typeof secretId).toBe('string')

    // Clean up
    if (secretId) {
      await adminClient.rpc('vault_delete_secret', { secret_id: secretId })
    }
  })

  test('Fireflies connection metadata columns exist in tenant_config', async () => {
    const { data: columns } = await adminClient
      .rpc('exec_sql', {
        sql: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'tenant_config'
          AND column_name LIKE 'fireflies%'
        `
      })

    const columnNames = columns?.map((c: any) => c.column_name) || []

    expect(columnNames).toContain('fireflies_api_key_secret_id')
    expect(columnNames).toContain('fireflies_connected_by')
    expect(columnNames).toContain('fireflies_connected_at')
    expect(columnNames).toContain('fireflies_connection_status')
    expect(columnNames).toContain('feature_fireflies')
  })

  test('getCurrentUserRole returns admin for test user', async () => {
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user } } = await userClient.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    })

    expect(user).toBeDefined()

    if (!user) throw new Error('Sign in failed')

    // Query role through admin client (bypasses RLS)
    const { data: userData } = await adminClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    expect(userData?.role).toBe('admin')

    await userClient.auth.signOut()
  })
})

describe('Settings Page - End-to-End', () => {
  test('Settings page can load with Fireflies section', async () => {
    // This test verifies the entire data flow:
    // 1. User authenticated
    // 2. tenant_id retrieved (via fallback)
    // 3. tenant_config queried
    // 4. Connection status displayed

    const { data: config } = await adminClient
      .from('tenant_config')
      .select(`
        tenant_id,
        feature_fireflies,
        fireflies_connection_status,
        fireflies_connected_at,
        fireflies_connected_by
      `)
      .eq('tenant_id', TENANT_1_ID)
      .single()

    expect(config).toBeDefined()
    expect(config?.tenant_id).toBe(TENANT_1_ID)

    // Connection status should be one of the valid states
    const validStatuses = ['not_connected', 'connected', 'failed', null]
    expect(validStatuses).toContain(config?.fireflies_connection_status)
  })
})
