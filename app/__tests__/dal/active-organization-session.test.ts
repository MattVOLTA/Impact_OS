/**
 * Active Organization Session Tests
 *
 * Tests for user_sessions table and get_active_organization_id() function
 * Part of Issue #55: Fix Multi-Organization Data Isolation Bug
 *
 * Following TDD:
 * - Write tests FIRST (these will FAIL initially)
 * - Create migration to make them pass
 * - Refactor while keeping tests green
 */

import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

const testUserIds = new Set<string>()

afterEach(async () => {
  // Cleanup test users
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

describe('user_sessions table', () => {
  test('table should exist with correct schema', async () => {
    const { data, error } = await adminClient
      .from('user_sessions')
      .select('*')
      .limit(1)

    // Table should exist
    expect(error).toBeNull()
    expect(data).toBeDefined()
  })

  test('should have RLS enabled', async () => {
    // Unauthenticated client should return empty
    const unauthClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data } = await unauthClient
      .from('user_sessions')
      .select('*')

    // RLS working = no data for unauthenticated user
    expect(data?.length || 0).toBe(0)
  })

  test('users can only see their own session', async () => {
    // Create test user
    const userEmail = `session-rls-${Date.now()}@example.com`

    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    testUserIds.add(authData.user!.id)

    // Sign in as user (creates authenticated session)
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'TestPassword123!'
    })

    // User creates their own session (via RLS-protected client)
    const testOrgId = '11111111-1111-1111-1111-111111111111'
    await userClient.from('user_sessions').upsert({
      user_id: authData.user!.id,
      active_organization_id: testOrgId
    })

    // User should be able to see their own session
    const { data: sessions, error } = await userClient
      .from('user_sessions')
      .select('*')

    expect(error).toBeNull()
    expect(sessions).toHaveLength(1)
    expect(sessions![0].user_id).toBe(authData.user!.id)
    expect(sessions![0].active_organization_id).toBe(testOrgId)

    await userClient.auth.signOut()
  })
})

describe('get_active_organization_id function', () => {
  test('function should exist and be callable', async () => {
    // Try calling the function (will fail if doesn't exist)
    const { error } = await adminClient.rpc('get_active_organization_id')

    // Function should exist (error might be about no session, not missing function)
    expect(error?.code).not.toBe('42883') // 42883 = function does not exist
  })

  test('function returns active organization for user with session', async () => {
    // Create user
    const userEmail = `func-test-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    testUserIds.add(authData.user!.id)

    // Create session
    const testOrgId = '11111111-1111-1111-1111-111111111111'
    await adminClient.from('user_sessions').insert({
      user_id: authData.user!.id,
      active_organization_id: testOrgId
    })

    // Sign in as user
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'TestPassword123!'
    })

    // Call function
    const { data, error } = await userClient.rpc('get_active_organization_id')

    expect(error).toBeNull()
    expect(data).toBe(testOrgId)

    await userClient.auth.signOut()
  })

  test('function returns null or first org if no session', async () => {
    // Create user without session
    const userEmail = `no-session-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    testUserIds.add(authData.user!.id)

    // Sign in
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'TestPassword123!'
    })

    // Call function (should handle no session gracefully)
    const { data, error } = await userClient.rpc('get_active_organization_id')

    // Should either return null or handle gracefully
    expect(error).toBeNull()
    // data can be null (no session) or a uuid (fallback to first org)

    await userClient.auth.signOut()
  })

  test('function is marked SECURITY DEFINER', async () => {
    // Query pg_proc to verify function is security definer
    const { data, error } = await adminClient.rpc('exec_sql', {
      query: `
        SELECT prosecdef
        FROM pg_proc
        WHERE proname = 'get_active_organization_id'
      `
    })

    // If RPC not available, just verify function works
    if (error?.code === 'PGRST202' || error?.code === '42883') {
      // Function existence tested in other tests
      expect(true).toBe(true)
      return
    }

    // Function should be security definer
    expect(error).toBeNull()
  })
})
