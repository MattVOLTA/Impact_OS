/**
 * Team Management Security Tests
 *
 * Tests for Issue #58: Security Vulnerabilities
 * 1. TOCTOU race condition in owner demotion
 * 2. Email validation in invitation signup
 *
 * Following TDD approach:
 * - Write failing tests first
 * - Implement minimal fix
 * - Verify tests pass
 */

import { createClient } from '@supabase/supabase-js'
import { executeChangeUserRole } from '@/lib/dal/team'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Team Management Security', () => {
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const testUserIds = new Set<string>()
  let testOrgId: string

  beforeEach(async () => {
    // Create test organization
    const { data: org, error: orgError } = await adminClient
      .from('tenants')
      .insert({
        name: `Test Org Race ${Date.now()}`,
        slug: `test-race-${Date.now()}`
      })
      .select()
      .single()

    if (orgError) throw orgError
    testOrgId = org.id
  })

  afterEach(async () => {
    // Cleanup: delete test users
    for (const userId of testUserIds) {
      await adminClient.auth.admin.deleteUser(userId)
    }
    testUserIds.clear()

    // Cleanup: delete test organization (cascade will handle members)
    if (testOrgId) {
      await adminClient.from('tenants').delete().eq('id', testOrgId)
    }
  })

  describe('TOCTOU Race Condition Prevention', () => {
    test('prevents concurrent owner demotion creating zero-owner organization', async () => {
      // Setup: Create 2 owners
      const owner1 = await createTestUser('owner1@test.com', testOrgId, 'owner')
      const owner2 = await createTestUser('owner2@test.com', testOrgId, 'owner')

      testUserIds.add(owner1.id)
      testUserIds.add(owner2.id)

      // Attempt concurrent demotion
      // Both owners try to demote each other simultaneously
      const demoteOwner1 = executeChangeUserRole({
        client: adminClient,
        organizationId: testOrgId,
        actorUserId: owner2.id,
        actorRole: 'owner',
        targetUserId: owner1.id,
        newRole: 'admin'
      })

      const demoteOwner2 = executeChangeUserRole({
        client: adminClient,
        organizationId: testOrgId,
        actorUserId: owner1.id,
        actorRole: 'owner',
        targetUserId: owner2.id,
        newRole: 'admin'
      })

      // At least one should fail
      const results = await Promise.allSettled([demoteOwner1, demoteOwner2])

      const rejectedCount = results.filter(r => r.status === 'rejected').length

      // At least one must fail to prevent zero owners
      expect(rejectedCount).toBeGreaterThanOrEqual(1)

      // Verify at least one owner remains
      const { count } = await adminClient
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', testOrgId)
        .eq('role', 'owner')

      expect(count).toBeGreaterThanOrEqual(1)
    })

    test('allows sequential owner role changes when multiple owners exist', async () => {
      // Setup: Create 2 owners
      const owner1 = await createTestUser('owner1@test.com', testOrgId, 'owner')
      const owner2 = await createTestUser('owner2@test.com', testOrgId, 'owner')

      testUserIds.add(owner1.id)
      testUserIds.add(owner2.id)

      // First demotion should succeed (still 1 owner left)
      await executeChangeUserRole({
        client: adminClient,
        organizationId: testOrgId,
        actorUserId: owner1.id,
        actorRole: 'owner',
        targetUserId: owner2.id,
        newRole: 'admin'
      })

      // Verify owner2 was demoted
      const { data: member } = await adminClient
        .from('organization_members')
        .select('role')
        .eq('organization_id', testOrgId)
        .eq('user_id', owner2.id)
        .single()

      expect(member?.role).toBe('admin')

      // Verify owner1 is still owner
      const { count } = await adminClient
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', testOrgId)
        .eq('role', 'owner')

      expect(count).toBe(1)
    })
  })

  // Helper function to create test user
  async function createTestUser(email: string, orgId: string, role: 'owner' | 'admin' | 'editor' | 'viewer') {
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'User'
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    // Create organization member record
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        user_id: authData.user.id,
        organization_id: orgId,
        role
      })

    if (memberError) throw memberError

    return authData.user
  }
})
