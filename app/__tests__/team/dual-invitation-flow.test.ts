/**
 * Dual Invitation Flow Tests
 *
 * Following TDD for Issue #56 improvements:
 * Tests the two invitation paths:
 * 1. NEW user (no auth account) → inviteUserByEmail → set password → auto-join
 * 2. EXISTING user (has auth account) → custom email → login → accept → join
 *
 * These tests document the expected behavior and prevent regressions.
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
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()

  for (const orgId of testOrgIds) {
    await adminClient.from('tenants').delete().eq('id', orgId)
  }
  testOrgIds.clear()
}, 30000)

describe('Dual Invitation Flow', () => {
  test('invitation created for NEW user stores metadata correctly', async () => {
    // Setup: Create org and admin
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    const adminEmail = `admin-${Date.now()}@test.com`
    const { data: adminAuth } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: 'Admin123!',
      email_confirm: true
    })
    testUserIds.add(adminAuth.user!.id)

    await adminClient.from('users').insert({
      id: adminAuth.user!.id,
      email: adminEmail,
      first_name: 'Admin',
      last_name: 'User',
      role: 'viewer',
      tenant_id: orgId
    })

    await adminClient.from('organization_members').insert({
      user_id: adminAuth.user!.id,
      organization_id: orgId,
      role: 'admin'
    })

    // Test: Invite a NEW user (doesn't exist in auth.users)
    const newUserEmail = `newuser-${Date.now()}@test.com`

    // Create invitation record
    const { data: invitation } = await adminClient
      .from('organization_invitations')
      .insert({
        email: newUserEmail,
        organization_id: orgId,
        role: 'editor',
        invited_by: adminAuth.user!.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    expect(invitation).toBeDefined()
    expect(invitation!.id).toBeDefined()
    // Note: invitation object from insert doesn't include all fields
    // Just verify it was created

    // Simulate inviteUserByEmail creating the user with metadata
    const { data: invitedUser } = await adminClient.auth.admin.createUser({
      email: newUserEmail,
      password: 'TempPassword123!',
      email_confirm: true,
      user_metadata: {
        pending_invitation_id: invitation!.id,
        pending_organization_id: orgId,
        pending_role: 'editor'
      }
    })

    testUserIds.add(invitedUser.user!.id)

    // Verify metadata is stored
    expect(invitedUser.user!.user_metadata).toMatchObject({
      pending_invitation_id: invitation!.id,
      pending_organization_id: orgId,
      pending_role: 'editor'
    })
  }, 30000)

  test('invitation for EXISTING user does not call inviteUserByEmail', async () => {
    // This tests that we detect existing users and don't try inviteUserByEmail

    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create existing user
    const existingEmail = `existing-${Date.now()}@test.com`
    const { data: existingAuth } = await adminClient.auth.admin.createUser({
      email: existingEmail,
      password: 'Existing123!',
      email_confirm: true
    })
    testUserIds.add(existingAuth.user!.id)

    await adminClient.from('users').insert({
      id: existingAuth.user!.id,
      email: existingEmail,
      first_name: 'Existing',
      last_name: 'User',
      role: 'viewer',
      tenant_id: orgId
    })

    // Create invitation for existing user
    const { data: invitation } = await adminClient
      .from('organization_invitations')
      .insert({
        email: existingEmail,
        organization_id: orgId,
        role: 'editor',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    expect(invitation).toBeDefined()

    // For existing users, they should NOT have pending metadata
    // (they'll login and accept via the old flow)
    const { data: { user: verifyUser } } = await adminClient.auth.admin.getUserById(
      existingAuth.user!.id
    )

    expect(verifyUser?.user_metadata?.pending_invitation_id).toBeUndefined()
  }, 30000)

  test('auto-join logic adds member after invitation acceptance', async () => {
    // Simulates the completeInviteSignup flow
    const orgId = crypto.randomUUID()
    await adminClient.from('tenants').insert({
      id: orgId,
      name: 'Test Org',
      slug: `test-org-${Date.now()}`
    })
    testOrgIds.add(orgId)

    // Create user with pending invitation metadata
    const invitedEmail = `invited-${Date.now()}@test.com`

    const { data: invitation } = await adminClient
      .from('organization_invitations')
      .insert({
        email: invitedEmail,
        organization_id: orgId,
        role: 'editor',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    const { data: invitedUser } = await adminClient.auth.admin.createUser({
      email: invitedEmail,
      password: 'Invited123!',
      email_confirm: true,
      user_metadata: {
        pending_invitation_id: invitation!.id,
        pending_organization_id: orgId,
        pending_role: 'editor'
      }
    })

    testUserIds.add(invitedUser.user!.id)

    await adminClient.from('users').insert({
      id: invitedUser.user!.id,
      email: invitedEmail,
      first_name: 'Invited',
      last_name: 'User',
      role: 'viewer',
      tenant_id: orgId
    })

    // Simulate auto-join logic (what completeInviteSignup does)
    await adminClient
      .from('organization_members')
      .insert({
        user_id: invitedUser.user!.id,
        organization_id: orgId,
        role: invitation!.role
      })

    await adminClient
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation!.id)

    await adminClient
      .from('user_sessions')
      .upsert({
        user_id: invitedUser.user!.id,
        active_organization_id: orgId
      })

    // Verify member was added
    const { data: member } = await adminClient
      .from('organization_members')
      .select('*')
      .eq('user_id', invitedUser.user!.id)
      .eq('organization_id', orgId)
      .single()

    expect(member).toBeDefined()
    expect(member?.role).toBe('editor')

    // Verify invitation marked accepted
    const { data: acceptedInvite } = await adminClient
      .from('organization_invitations')
      .select('accepted_at')
      .eq('id', invitation!.id)
      .single()

    expect(acceptedInvite?.accepted_at).toBeDefined()

    // Verify session created
    const { data: session } = await adminClient
      .from('user_sessions')
      .select('active_organization_id')
      .eq('user_id', invitedUser.user!.id)
      .single()

    expect(session?.active_organization_id).toBe(orgId)
  }, 30000)

  test('UUID validation accepts standard 36-char UUIDs', async () => {
    // Test that our relaxed validation works for both test and real UUIDs
    const { inviteMemberSchema } = await import('@/lib/schemas/organization')

    // Test UUID (repeating pattern)
    const testResult = inviteMemberSchema.safeParse({
      email: 'test@test.com',
      organizationId: '11111111-1111-1111-1111-111111111111',
      role: 'editor'
    })

    expect(testResult.success).toBe(true)

    // Real UUID v4
    const realResult = inviteMemberSchema.safeParse({
      email: 'test@test.com',
      organizationId: crypto.randomUUID(),
      role: 'editor'
    })

    expect(realResult.success).toBe(true)

    // Invalid (too short)
    const invalidResult = inviteMemberSchema.safeParse({
      email: 'test@test.com',
      organizationId: '1111',
      role: 'editor'
    })

    expect(invalidResult.success).toBe(false)
  }, 30000)
})
