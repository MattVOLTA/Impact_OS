/**
 * Invitation Signup Security Tests
 *
 * Tests for Issue #58: Email Validation Vulnerability
 *
 * Following TDD approach:
 * - Write failing tests first
 * - Implement minimal fix
 * - Verify tests pass
 */

import { createClient } from '@supabase/supabase-js'
import { signupFromInvitation } from '@/app/(auth)/accept-invite/[token]/actions'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Invitation Signup Security', () => {
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const testUserIds = new Set<string>()
  let testOrgId: string
  let inviterUserId: string

  beforeEach(async () => {
    // Create test organization
    const { data: org, error: orgError } = await adminClient
      .from('tenants')
      .insert({
        name: `Test Org Invite ${Date.now()}`,
        slug: `test-invite-${Date.now()}`
      })
      .select()
      .single()

    if (orgError) throw orgError
    testOrgId = org.id

    // Create inviter user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: `inviter-${Date.now()}@test.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Inviter',
        last_name: 'User'
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    inviterUserId = authData.user.id
    testUserIds.add(inviterUserId)

    // Create organization member for inviter
    await adminClient.from('organization_members').insert({
      user_id: inviterUserId,
      organization_id: testOrgId,
      role: 'owner'
    })
  })

  afterEach(async () => {
    // Cleanup: delete test users
    for (const userId of testUserIds) {
      await adminClient.auth.admin.deleteUser(userId)
    }
    testUserIds.clear()

    // Cleanup: delete test organization
    if (testOrgId) {
      await adminClient.from('tenants').delete().eq('id', testOrgId)
    }
  })

  describe('Email Validation', () => {
    test('rejects signup when email does not match invitation', async () => {
      // Create invitation for specific email
      const invitedEmail = `invited-${Date.now()}@test.com`
      const differentEmail = `different-${Date.now()}@test.com`

      const { data: invitation, error: inviteError } = await adminClient
        .from('organization_invitations')
        .insert({
          organization_id: testOrgId,
          email: invitedEmail,
          role: 'editor',
          invited_by: inviterUserId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      // Attempt signup with different email
      const result = await signupFromInvitation({
        email: differentEmail,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        invitationToken: invitation.id
      })

      // Should fail
      expect(result.success).toBe(false)
      expect(result.error).toContain('Email does not match invitation')
    })

    test('accepts signup when email matches invitation', async () => {
      // Create invitation
      const invitedEmail = `invited-${Date.now()}@test.com`

      const { data: invitation, error: inviteError } = await adminClient
        .from('organization_invitations')
        .insert({
          organization_id: testOrgId,
          email: invitedEmail,
          role: 'editor',
          invited_by: inviterUserId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      // Attempt signup with matching email
      const result = await signupFromInvitation({
        email: invitedEmail,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        invitationToken: invitation.id
      })

      // Should succeed
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()

      // Track user for cleanup
      if (result.user) {
        testUserIds.add(result.user.id)
      }
    })

    test('rejects signup with expired invitation', async () => {
      // Create expired invitation
      const invitedEmail = `invited-${Date.now()}@test.com`

      const { data: invitation, error: inviteError } = await adminClient
        .from('organization_invitations')
        .insert({
          organization_id: testOrgId,
          email: invitedEmail,
          role: 'editor',
          invited_by: inviterUserId,
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      // Attempt signup with expired invitation
      const result = await signupFromInvitation({
        email: invitedEmail,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        invitationToken: invitation.id
      })

      // Should fail
      expect(result.success).toBe(false)
      expect(result.error).toContain('expired')
    })

    test('rejects signup with already accepted invitation', async () => {
      // Create invitation and mark as accepted
      const invitedEmail = `invited-${Date.now()}@test.com`

      const { data: invitation, error: inviteError } = await adminClient
        .from('organization_invitations')
        .insert({
          organization_id: testOrgId,
          email: invitedEmail,
          role: 'editor',
          invited_by: inviterUserId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          accepted_at: new Date().toISOString()
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      // Attempt signup with already accepted invitation
      const result = await signupFromInvitation({
        email: invitedEmail,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        invitationToken: invitation.id
      })

      // Should fail
      expect(result.success).toBe(false)
      expect(result.error).toContain('already')
    })
  })
})
