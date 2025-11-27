/**
 * Logout Tests
 *
 * Verify logout functionality works correctly.
 */

import { createClient } from '@supabase/supabase-js'

const testUserIds = new Set<string>()

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

afterEach(async () => {
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

describe('Logout Functionality', () => {
  test('user can sign out', async () => {
    const email = `logout-test-${Date.now()}@test.com`

    // Create and sign in user
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: '11111111-1111-1111-1111-111111111111',
        first_name: 'Logout',
        last_name: 'Test'
      }
    })

    if (!user) throw new Error('User creation failed')
    testUserIds.add(user.id)

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Sign in
    const { data: { session: signInSession }, error: signInError } = await userClient.auth.signInWithPassword({
      email,
      password: 'test-password-123'
    })

    expect(signInError).toBeNull()
    expect(signInSession).toBeDefined()

    // Sign out
    const { error: signOutError } = await userClient.auth.signOut()

    expect(signOutError).toBeNull()

    // Verify session is gone
    const { data: { session: afterLogoutSession } } = await userClient.auth.getSession()

    expect(afterLogoutSession).toBeNull()
  })

  test('logged out user cannot access protected data', async () => {
    const email = `logout-access-${Date.now()}@test.com`

    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: '11111111-1111-1111-1111-111111111111',
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

    // Sign in
    await userClient.auth.signInWithPassword({
      email,
      password: 'test-password-123'
    })

    // Verify can access data while logged in
    const { data: companiesWhileLoggedIn } = await userClient
      .from('companies')
      .select('*')

    expect(companiesWhileLoggedIn).toBeDefined()

    // Sign out
    await userClient.auth.signOut()

    // Try to access data after logout - should be blocked
    const { data: companiesAfterLogout, error } = await userClient
      .from('companies')
      .select('*')

    // Should be empty or error because no auth
    expect(companiesAfterLogout).toEqual([])
  })
})
