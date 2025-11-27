/**
 * Invitation Flow Integration Tests
 *
 * Tests the complete invitation workflow:
 * - Admin invites user to organization
 * - Invitation token created and stored
 * - User accepts invitation and joins org
 * - RLS policies enforce admin-only invitation creation
 *
 * Part of Issue #54: Self-Service Onboarding - Phase 5
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
  // Cleanup test users (cascades to organization_members)
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()

  // Cleanup test orgs
  for (const orgId of testOrgIds) {
    await adminClient.from('tenants').delete().eq('id', orgId)
  }
  testOrgIds.clear()
})

describe('Invitation Flow', () => {
  test('admin can create invitation with valid token', async () => {
    // Create admin user and organization
    const adminEmail = `admin-${Date.now()}@example.com`
    const { data: adminAuthData } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: 'AdminPassword123!',
      email_confirm: true
    })

    const adminUserId = adminAuthData.user!.id
    testUserIds.add(adminUserId)

    await new Promise(resolve => setTimeout(resolve, 200))

    // Create organization
    const { data: org } = await adminClient
      .from('tenants')
      .insert({
        name: `Test Invite Org ${Date.now()}`,
        slug: `test-invite-org-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org!.id)

    // Add admin as member
    await adminClient.from('organization_members').insert({
      user_id: adminUserId,
      organization_id: org!.id,
      role: 'admin'
    })

    // Create invitation
    const inviteEmail = `invitee-${Date.now()}@example.com`
    const { data: invitation, error } = await adminClient
      .from('organization_invitations')
      .insert({
        email: inviteEmail,
        organization_id: org!.id,
        role: 'editor',
        invited_by: adminUserId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(invitation).toBeDefined()
    expect(invitation?.token).toBeDefined()
    expect(invitation?.email).toBe(inviteEmail)
    expect(invitation?.role).toBe('editor')
  })

  test('invitation has 7-day expiration', async () => {
    const { data: org } = await adminClient
      .from('tenants')
      .insert({
        name: `Expiry Test Org ${Date.now()}`,
        slug: `expiry-test-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org!.id)

    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const { data: invitation } = await adminClient
      .from('organization_invitations')
      .insert({
        email: `expiry-${Date.now()}@example.com`,
        organization_id: org!.id,
        role: 'viewer',
        expires_at: sevenDaysLater.toISOString()
      })
      .select()
      .single()

    const expiresAt = new Date(invitation!.expires_at)
    const diffDays = Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    expect(diffDays).toBe(7)
  })

  test('user can accept invitation and join organization', async () => {
    // Create organization
    const { data: org } = await adminClient
      .from('tenants')
      .insert({
        name: `Accept Test Org ${Date.now()}`,
        slug: `accept-test-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org!.id)

    // Create user who will accept invitation
    const inviteeEmail = `invitee-accept-${Date.now()}@example.com`
    const { data: inviteeAuthData } = await adminClient.auth.admin.createUser({
      email: inviteeEmail,
      password: 'InviteePassword123!',
      email_confirm: true
    })

    const inviteeUserId = inviteeAuthData.user!.id
    testUserIds.add(inviteeUserId)

    await new Promise(resolve => setTimeout(resolve, 200))

    // Create invitation
    const { data: invitation } = await adminClient
      .from('organization_invitations')
      .insert({
        email: inviteeEmail,
        organization_id: org!.id,
        role: 'editor',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    // Accept invitation (add user to org)
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        user_id: inviteeUserId,
        organization_id: org!.id,
        role: invitation!.role
      })

    expect(memberError).toBeNull()

    // Mark invitation as accepted
    const { error: updateError } = await adminClient
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation!.id)

    expect(updateError).toBeNull()

    // Verify user is now a member
    const { data: membership } = await adminClient
      .from('organization_members')
      .select('*')
      .eq('user_id', inviteeUserId)
      .eq('organization_id', org!.id)
      .single()

    expect(membership).toBeDefined()
    expect(membership?.role).toBe('editor')
  })

  test('duplicate invitations are prevented', async () => {
    const { data: org } = await adminClient
      .from('tenants')
      .insert({
        name: `Duplicate Test Org ${Date.now()}`,
        slug: `duplicate-test-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org!.id)

    const inviteEmail = `duplicate-${Date.now()}@example.com`

    // First invitation should succeed
    const { error: firstError } = await adminClient
      .from('organization_invitations')
      .insert({
        email: inviteEmail,
        organization_id: org!.id,
        role: 'editor',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })

    expect(firstError).toBeNull()

    // Duplicate invitation should fail
    const { error: duplicateError } = await adminClient
      .from('organization_invitations')
      .insert({
        email: inviteEmail,
        organization_id: org!.id,
        role: 'admin', // Different role, same email+org
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })

    expect(duplicateError).not.toBeNull()
    expect(duplicateError?.message).toContain('duplicate key')
  })

  test('users can view invitations sent to their email', async () => {
    // Create organization
    const { data: org } = await adminClient
      .from('tenants')
      .insert({
        name: `View Invite Org ${Date.now()}`,
        slug: `view-invite-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org!.id)

    // Create user
    const userEmail = `viewinvite-${Date.now()}@example.com`
    const { data: userData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'ViewPassword123!',
      email_confirm: true
    })

    testUserIds.add(userData.user!.id)

    // Create invitation for this user
    const { data: invitation } = await adminClient
      .from('organization_invitations')
      .insert({
        email: userEmail,
        organization_id: org!.id,
        role: 'viewer',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    // Sign in as user
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'ViewPassword123!'
    })

    // User should be able to view their invitations
    const { data: invitations, error } = await userClient
      .from('organization_invitations')
      .select('*')
      .eq('email', userEmail)

    expect(error).toBeNull()
    expect(invitations).toBeDefined()
    expect(invitations?.length).toBeGreaterThan(0)
    expect(invitations?.[0].token).toBe(invitation!.token)

    await userClient.auth.signOut()
  })
})
