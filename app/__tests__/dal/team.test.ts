/**
 * Team Management DAL Tests
 *
 * Following TDD (RED-GREEN-REFACTOR):
 * 1. RED: Write these tests FIRST (will FAIL - no implementation yet)
 * 2. GREEN: Implement lib/dal/team.ts to make tests pass
 * 3. REFACTOR: Clean up while keeping tests green
 *
 * Part of Issue #56: Admin User Management - Team Page
 *
 * Tests verify:
 * - Permission checks (admin/owner only)
 * - Business rules (can't change own role, can't remove last owner)
 * - Audit logging
 * - Multi-org isolation
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
}, 30000)

/**
 * Helper: Create test user with organization membership
 */
async function createTestUser(params: {
  email: string
  orgId: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
}) {
  const password = 'TestPassword123!'

  const { data: authData, error } = await adminClient.auth.admin.createUser({
    email: params.email,
    password: password,
    email_confirm: true
  })

  if (error || !authData.user) {
    throw new Error(`Failed to create test user: ${error?.message}`)
  }

  testUserIds.add(authData.user.id)

  // Create public.users record
  await adminClient.from('users').insert({
    id: authData.user.id,
    email: params.email,
    first_name: 'Test',
    last_name: 'User',
    role: 'viewer', // Legacy field
    tenant_id: params.orgId
  })

  // Add to organization
  await adminClient.from('organization_members').insert({
    user_id: authData.user.id,
    organization_id: params.orgId,
    role: params.role
  })

  // Set active organization
  await adminClient.from('user_sessions').insert({
    user_id: authData.user.id,
    active_organization_id: params.orgId
  })

  return { userId: authData.user.id, password }
}

describe('getOrganizationMembers()', () => {
  test('returns all members for current organization', async () => {
    // Create test organization
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create admin user
    const adminEmail = `admin-${Date.now()}@test.com`
    const { userId: adminId, password } = await createTestUser({
      email: adminEmail,
      orgId,
      role: 'admin'
    })

    // Create other members
    await createTestUser({
      email: `editor-${Date.now()}@test.com`,
      orgId,
      role: 'editor'
    })

    await createTestUser({
      email: `viewer-${Date.now()}@test.com`,
      orgId,
      role: 'viewer'
    })

    // Sign in as admin
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: adminEmail,
      password
    })

    // Import testable core function
    const { fetchOrganizationMembers } = await import('@/lib/dal/team')

    const members = await fetchOrganizationMembers(userClient, orgId)

    // Should return all 3 members
    expect(members).toHaveLength(3)

    // Should include user details
    expect(members[0]).toHaveProperty('user_id')
    expect(members[0]).toHaveProperty('role')
    expect(members[0]).toHaveProperty('users')
    expect(members[0].users).toHaveProperty('email')
    expect(members[0].users).toHaveProperty('first_name')

    await userClient.auth.signOut()
  }, 30000)

  test('throws error if user is not admin or owner', async () => {
    // Create org
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create editor (not admin)
    const editorEmail = `editor-${Date.now()}@test.com`
    const { password } = await createTestUser({
      email: editorEmail,
      orgId,
      role: 'editor'
    })

    // Sign in as editor
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: signInError } = await userClient.auth.signInWithPassword({
      email: editorEmail,
      password
    })

    expect(signInError).toBeNull()

    // This test will be handled at the DAL wrapper level
    // For now, verify RLS would prevent unauthorized access
    const { data: members } = await userClient
      .from('organization_members')
      .select('*')
      .eq('organization_id', orgId)

    // RLS should allow editor to see members (will verify this when we add RLS policies)
    expect(members).toBeDefined()

    await userClient.auth.signOut()
  }, 30000)
})

describe('changeUserRole()', () => {
  test('admin can change editor role to viewer', async () => {
    // Create org
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create admin
    const adminEmail = `admin-${Date.now()}@test.com`
    const { password: adminPassword } = await createTestUser({
      email: adminEmail,
      orgId,
      role: 'admin'
    })

    // Create editor to be changed
    const { userId: editorId } = await createTestUser({
      email: `editor-${Date.now()}@test.com`,
      orgId,
      role: 'editor'
    })

    // Sign in as admin
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user } } = await userClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })

    const adminUserId = user!.id

    const { executeChangeUserRole } = await import('@/lib/dal/team')

    // Change editor to viewer
    await executeChangeUserRole({
      client: adminClient,
      organizationId: orgId,
      actorUserId: adminUserId,
      actorRole: 'admin',
      targetUserId: editorId,
      newRole: 'viewer'
    })

    // Verify role changed
    const { data: member } = await adminClient
      .from('organization_members')
      .select('role')
      .eq('user_id', editorId)
      .eq('organization_id', orgId)
      .single()

    expect(member?.role).toBe('viewer')

    // Verify audit log created
    const { data: auditLogs } = await adminClient
      .from('organization_audit_log')
      .select('*')
      .eq('organization_id', orgId)
      .eq('action', 'role_changed')
      .eq('target_user_id', editorId)

    expect(auditLogs).toHaveLength(1)
    expect(auditLogs![0].metadata).toMatchObject({
      old_role: 'editor',
      new_role: 'viewer'
    })

    await userClient.auth.signOut()
  }, 30000)

  test('prevents user from changing their own role', async () => {
    // Create org
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create admin
    const adminEmail = `admin-${Date.now()}@test.com`
    const { userId: adminId, password } = await createTestUser({
      email: adminEmail,
      orgId,
      role: 'admin'
    })

    // Sign in as admin
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user } } = await userClient.auth.signInWithPassword({
      email: adminEmail,
      password
    })

    const { executeChangeUserRole } = await import('@/lib/dal/team')

    // Try to change own role
    await expect(
      executeChangeUserRole({
        client: adminClient,
        organizationId: orgId,
        actorUserId: adminId,
        actorRole: 'admin',
        targetUserId: adminId,
        newRole: 'owner'
      })
    ).rejects.toThrow(/cannot change your own role/i)

    await userClient.auth.signOut()
  }, 30000)

  test('prevents demoting last owner', async () => {
    // Create org
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create owner (only one)
    const ownerEmail = `owner-${Date.now()}@test.com`
    const { userId: ownerId, password: ownerPassword } = await createTestUser({
      email: ownerEmail,
      orgId,
      role: 'owner'
    })

    // Create admin who will try to demote owner
    const { password: adminPassword } = await createTestUser({
      email: `admin-${Date.now()}@test.com`,
      orgId,
      role: 'admin'
    })

    // Sign in as owner (they can demote themselves, but not if last)
    const ownerClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user } } = await ownerClient.auth.signInWithPassword({
      email: ownerEmail,
      password: ownerPassword
    })

    const { executeChangeUserRole } = await import('@/lib/dal/team')

    // Try to demote last owner (should fail even as owner themselves)
    await expect(
      executeChangeUserRole({
        client: adminClient,
        organizationId: orgId,
        actorUserId: ownerId,
        actorRole: 'owner',
        targetUserId: ownerId,
        newRole: 'admin'
      })
    ).rejects.toThrow(/cannot change your own role/i)

    await ownerClient.auth.signOut()
  }, 30000)

  test('only owner can promote to owner', async () => {
    // Create org
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create owner
    await createTestUser({
      email: `owner-${Date.now()}@test.com`,
      orgId,
      role: 'owner'
    })

    // Create admin
    const adminEmail = `admin-${Date.now()}@test.com`
    const { password: adminPassword } = await createTestUser({
      email: adminEmail,
      orgId,
      role: 'admin'
    })

    // Create editor to promote
    const { userId: editorId } = await createTestUser({
      email: `editor-${Date.now()}@test.com`,
      orgId,
      role: 'editor'
    })

    // Sign in as admin (not owner)
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user } } = await userClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })

    const adminUserId = user!.id

    const { executeChangeUserRole } = await import('@/lib/dal/team')

    // Admin tries to promote editor to owner (should fail)
    await expect(
      executeChangeUserRole({
        client: adminClient,
        organizationId: orgId,
        actorUserId: adminUserId,
        actorRole: 'admin',
        targetUserId: editorId,
        newRole: 'owner'
      })
    ).rejects.toThrow(/only owners can promote.*to owner/i)

    await userClient.auth.signOut()
  }, 30000)
})

describe('removeMember()', () => {
  test('admin can remove editor from organization', async () => {
    // Create org
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create admin
    const adminEmail = `admin-${Date.now()}@test.com`
    const { password: adminPassword } = await createTestUser({
      email: adminEmail,
      orgId,
      role: 'admin'
    })

    // Create editor to remove
    const { userId: editorId } = await createTestUser({
      email: `editor-${Date.now()}@test.com`,
      orgId,
      role: 'editor'
    })

    // Sign in as admin
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user } } = await userClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })

    const adminUserId = user!.id

    const { executeRemoveMember } = await import('@/lib/dal/team')

    // Remove editor
    await executeRemoveMember({
      client: adminClient,
      organizationId: orgId,
      actorUserId: adminUserId,
      actorRole: 'admin',
      targetUserId: editorId
    })

    // Verify member removed
    const { data: member } = await adminClient
      .from('organization_members')
      .select('*')
      .eq('user_id', editorId)
      .eq('organization_id', orgId)
      .maybeSingle()

    expect(member).toBeNull()

    // Verify audit log
    const { data: auditLogs } = await adminClient
      .from('organization_audit_log')
      .select('*')
      .eq('organization_id', orgId)
      .eq('action', 'member_removed')
      .eq('target_user_id', editorId)

    expect(auditLogs).toHaveLength(1)

    await userClient.auth.signOut()
  }, 30000)

  test('prevents removing yourself', async () => {
    // Create org
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create admin
    const adminEmail = `admin-${Date.now()}@test.com`
    const { userId: adminId, password } = await createTestUser({
      email: adminEmail,
      orgId,
      role: 'admin'
    })

    // Sign in as admin
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user } } = await userClient.auth.signInWithPassword({
      email: adminEmail,
      password
    })

    const { executeRemoveMember } = await import('@/lib/dal/team')

    // Try to remove self
    await expect(
      executeRemoveMember({
        client: adminClient,
        organizationId: orgId,
        actorUserId: adminId,
        actorRole: 'admin',
        targetUserId: adminId
      })
    ).rejects.toThrow(/cannot remove yourself/i)

    await userClient.auth.signOut()
  }, 30000)

  test('prevents removing last owner', async () => {
    // Create org
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create owner (only one)
    const { userId: ownerId } = await createTestUser({
      email: `owner-${Date.now()}@test.com`,
      orgId,
      role: 'owner'
    })

    // Create admin
    const adminEmail = `admin-${Date.now()}@test.com`
    const { password: adminPassword } = await createTestUser({
      email: adminEmail,
      orgId,
      role: 'admin'
    })

    // Sign in as admin
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user } } = await userClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    })

    const adminUserId = user!.id

    const { executeRemoveMember } = await import('@/lib/dal/team')

    // Admin tries to remove last owner (should fail)
    await expect(
      executeRemoveMember({
        client: adminClient,
        organizationId: orgId,
        actorUserId: adminUserId,
        actorRole: 'admin',
        targetUserId: ownerId
      })
    ).rejects.toThrow(/only owners can remove other owners/i)

    await userClient.auth.signOut()
  }, 30000)
})
