/**
 * Database Trigger Tests
 *
 * These tests verify that handle_new_user() trigger creates public.users
 * when a user signs up via Supabase Auth.
 *
 * Following TDD: Written FIRST. Should PASS because trigger was implemented in Epic #2.
 * If these fail, the trigger is not working correctly.
 *
 * See docs/architecture/auth-best-practices.md#database-trigger-tests
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'

// Track test users for cleanup
const testUserIds = new Set<string>()

// Admin client for cleanup
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key'
)

afterEach(async () => {
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

describe('Database Trigger - handle_new_user()', () => {
  test('signup creates public.users record with tenant_id', async () => {
    const email = `trigger-test-${Date.now()}@test.com`

    // Sign up with tenant_id in metadata
    const { data: { user }, error: signUpError } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: TENANT_1_ID,
        first_name: 'Trigger',
        last_name: 'Test',
        role: 'editor'
      }
    })

    expect(signUpError).toBeNull()
    expect(user).toBeDefined()

    if (user) {
      testUserIds.add(user.id)

      // Verify public.users record was created by trigger
      const { data: publicUser, error: queryError } = await adminClient
        .from('users')
        .select('tenant_id, first_name, last_name, role, email')
        .eq('id', user.id)
        .single()

      expect(queryError).toBeNull()
      expect(publicUser).toBeDefined()
      expect(publicUser?.tenant_id).toBe(TENANT_1_ID)
      expect(publicUser?.first_name).toBe('Trigger')
      expect(publicUser?.last_name).toBe('Test')
      expect(publicUser?.role).toBe('editor')
      expect(publicUser?.email).toBe(email)
    }
  })

  test('signup without tenant_id in metadata creates user with null tenant_id', async () => {
    const email = `no-tenant-${Date.now()}@test.com`

    // Sign up WITHOUT tenant_id
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        first_name: 'No',
        last_name: 'Tenant'
      }
    })

    if (user) {
      testUserIds.add(user.id)

      // Public.users record should exist but tenant_id will be null
      const { data: publicUser } = await adminClient
        .from('users')
        .select('tenant_id, first_name')
        .eq('id', user.id)
        .single()

      expect(publicUser).toBeDefined()
      expect(publicUser?.tenant_id).toBeNull()
      expect(publicUser?.first_name).toBe('No')
    }
  })

  test('trigger sets default role to viewer if not specified', async () => {
    const email = `default-role-${Date.now()}@test.com`

    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: TENANT_1_ID,
        first_name: 'Default',
        last_name: 'Role'
        // NO role specified
      }
    })

    if (user) {
      testUserIds.add(user.id)

      const { data: publicUser } = await adminClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      // Should default to 'viewer'
      expect(publicUser?.role).toBe('viewer')
    }
  })
})
