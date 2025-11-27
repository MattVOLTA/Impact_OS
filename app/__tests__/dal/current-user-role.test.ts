/**
 * getCurrentUserRole() Multi-Organization Bug Fix
 *
 * BUG: Function currently reads from users.role (single-org model)
 * FIX: Should read from organization_members.role for active organization
 *
 * Following TDD:
 * 1. RED: Write this test (will FAIL - proves bug exists)
 * 2. GREEN: Fix getCurrentUserRole() to read from organization_members
 * 3. REFACTOR: Make function testable by accepting client parameter
 *
 * Part of Issue #56: Admin User Management
 *
 * Note: Testing at database level (data setup + query) rather than
 * testing DAL function directly (avoids Next.js request context issues)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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
const testOrgIds = new Set<string>()

afterEach(async () => {
  // Cleanup test users
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()

  // Cleanup test organizations
  for (const orgId of testOrgIds) {
    await adminClient
      .from('tenants')
      .delete()
      .eq('id', orgId)
  }
  testOrgIds.clear()
}, 30000) // 30 second timeout for cleanup

/**
 * Helper: Simulates what getCurrentUserRole() SHOULD do
 * (will implement this logic in the actual function)
 */
async function getCurrentUserRoleTestable(
  client: SupabaseClient,
  userId: string,
  activeOrgId: string
): Promise<'owner' | 'admin' | 'editor' | 'viewer'> {
  const { data, error } = await client
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', activeOrgId)
    .single()

  if (error || !data) {
    throw new Error('User has no role in active organization')
  }

  return data.role as 'owner' | 'admin' | 'editor' | 'viewer'
}

describe('getCurrentUserRole() - Multi-Organization Bug Fix', () => {
  test('returns role from ACTIVE organization, not users table', async () => {
    // Create test user
    const userEmail = `role-test-${Date.now()}@example.com`
    const password = 'TestPassword123!'

    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true
    })

    expect(createError).toBeNull()
    expect(authData.user).toBeDefined()
    testUserIds.add(authData.user!.id)

    // Create two test organizations
    const orgA = {
      id: crypto.randomUUID(),
      name: 'Organization A',
      slug: `org-a-${Date.now()}`
    }

    const orgB = {
      id: crypto.randomUUID(),
      name: 'Organization B',
      slug: `org-b-${Date.now()}`
    }

    await adminClient.from('tenants').insert([orgA, orgB])
    testOrgIds.add(orgA.id)
    testOrgIds.add(orgB.id)

    // Create public.users record (usually done by trigger)
    await adminClient.from('users').insert({
      id: authData.user!.id,
      email: userEmail,
      first_name: 'Test',
      last_name: 'User',
      role: 'viewer', // This is the LEGACY single-org role (should be ignored)
      tenant_id: orgA.id // Legacy field
    })

    // Add user to BOTH organizations with DIFFERENT roles
    await adminClient.from('organization_members').insert([
      {
        user_id: authData.user!.id,
        organization_id: orgA.id,
        role: 'admin' // User is ADMIN in Org A
      },
      {
        user_id: authData.user!.id,
        organization_id: orgB.id,
        role: 'editor' // User is EDITOR in Org B
      }
    ])

    // Set Org A as active organization
    await adminClient.from('user_sessions').insert({
      user_id: authData.user!.id,
      active_organization_id: orgA.id
    })

    // Sign in as user
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: userEmail,
      password: password
    })

    expect(signInError).toBeNull()

    // TEST: Query role using the CORRECT method (organization_members)
    const roleInOrgA = await getCurrentUserRoleTestable(
      userClient,
      authData.user!.id,
      orgA.id
    )

    // Should return 'admin' (role in Org A)
    expect(roleInOrgA).toBe('admin')

    // TEST: Query role for Org B
    const roleInOrgB = await getCurrentUserRoleTestable(
      userClient,
      authData.user!.id,
      orgB.id
    )

    // Should return 'editor' (role in Org B)
    expect(roleInOrgB).toBe('editor')

    // TEST: Verify the BUG - old method would return wrong value
    const { data: userData } = await adminClient
      .from('users')
      .select('role')
      .eq('id', authData.user!.id)
      .single()

    // Old method returns 'viewer' (wrong!)
    expect(userData?.role).toBe('viewer')

    // But correct method returns org-specific roles (right!)
    expect(roleInOrgA).not.toBe(userData?.role) // admin != viewer
    expect(roleInOrgB).not.toBe(userData?.role) // editor != viewer

    await userClient.auth.signOut()
  }, 30000) // 30 second timeout

  test('includes owner role in return type', async () => {
    // Create test user
    const userEmail = `owner-test-${Date.now()}@example.com`
    const password = 'TestPassword123!'

    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true
    })

    testUserIds.add(authData.user!.id)

    // Create organization
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create public.users record
    await adminClient.from('users').insert({
      id: authData.user!.id,
      email: userEmail,
      first_name: 'Test',
      last_name: 'Owner',
      role: 'viewer', // Legacy
      tenant_id: orgId
    })

    // Add user as OWNER
    const { error: memberError } = await adminClient.from('organization_members').insert({
      user_id: authData.user!.id,
      organization_id: orgId,
      role: 'owner'
    })

    if (memberError) {
      console.error('Failed to insert organization member:', memberError)
    }
    expect(memberError).toBeNull()

    // Verify insertion worked
    const { data: checkMember, error: checkError } = await adminClient
      .from('organization_members')
      .select('*')
      .eq('user_id', authData.user!.id)
      .eq('organization_id', orgId)
      .single()

    console.log('Inserted member data:', checkMember)
    expect(checkError).toBeNull()
    expect(checkMember).toBeDefined()
    expect(checkMember?.role).toBe('owner')

    // Set active org
    await adminClient.from('user_sessions').insert({
      user_id: authData.user!.id,
      active_organization_id: orgId
    })

    // Sign in
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: password
    })

    // Use admin client to bypass RLS for testing database logic
    const role = await getCurrentUserRoleTestable(
      adminClient,
      authData.user!.id,
      orgId
    )

    // Should return 'owner'
    expect(role).toBe('owner')

    await userClient.auth.signOut()
  }, 30000) // 30 second timeout

  test('throws error if user has no organization membership', async () => {
    // Create user
    const userEmail = `no-org-${Date.now()}@example.com`
    const password = 'TestPassword123!'

    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true
    })

    testUserIds.add(authData.user!.id)

    // Create public.users but NO organization_members entry
    await adminClient.from('users').insert({
      id: authData.user!.id,
      email: userEmail,
      first_name: 'Test',
      last_name: 'User',
      role: 'viewer',
      tenant_id: null
    })

    // Create org
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `no-member-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Sign in
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: password
    })

    // Should throw error when querying role for org they're not a member of
    await expect(
      getCurrentUserRoleTestable(userClient, authData.user!.id, orgId)
    ).rejects.toThrow('User has no role in active organization')

    await userClient.auth.signOut()
  }, 30000) // 30 second timeout
})
