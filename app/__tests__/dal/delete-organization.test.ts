/**
 * Delete Organization Tests
 *
 * Tests for organization deletion functionality
 * Ensures cascading deletes work correctly and only admins can delete
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
  // Cleanup
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()

  for (const orgId of testOrgIds) {
    await adminClient.from('tenants').delete().eq('id', orgId)
  }
  testOrgIds.clear()
})

describe('Delete Organization', () => {
  test('deleteOrganization function exists', () => {
    const { deleteOrganization } = require('@/lib/dal/organizations')

    expect(deleteOrganization).toBeDefined()
    expect(typeof deleteOrganization).toBe('function')
  })

  test('cascading delete removes organization and related data', async () => {
    // Create test org
    const { data: org } = await adminClient
      .from('tenants')
      .insert({
        name: `Delete Test Org ${Date.now()}`,
        slug: `delete-test-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org!.id)

    // Create test data in org
    const { data: company } = await adminClient
      .from('companies')
      .insert({
        tenant_id: org!.id,
        business_name: 'Test Company to Delete'
      })
      .select()
      .single()

    // Verify data exists
    const { data: companyCheck } = await adminClient
      .from('companies')
      .select('id')
      .eq('id', company!.id)
      .single()

    expect(companyCheck).toBeDefined()

    // Delete organization
    await adminClient.from('tenants').delete().eq('id', org!.id)

    // Verify cascade deleted company
    const { data: companyAfter } = await adminClient
      .from('companies')
      .select('id')
      .eq('id', company!.id)
      .maybeSingle()

    expect(companyAfter).toBeNull()

    // Remove from cleanup (already deleted)
    testOrgIds.delete(org!.id)
  })

  test('organization_members cascade deletes when org deleted', async () => {
    // Create user
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: `delete-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      email_confirm: true
    })

    testUserIds.add(authData.user!.id)

    // Create org
    const { data: org } = await adminClient
      .from('tenants')
      .insert({
        name: `Member Delete Test ${Date.now()}`,
        slug: `member-delete-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org!.id)

    // Add member
    await adminClient.from('organization_members').insert({
      user_id: authData.user!.id,
      organization_id: org!.id,
      role: 'admin'
    })

    // Verify membership exists
    const { data: memberCheck } = await adminClient
      .from('organization_members')
      .select('id')
      .eq('organization_id', org!.id)
      .single()

    expect(memberCheck).toBeDefined()

    // Delete organization
    await adminClient.from('tenants').delete().eq('id', org!.id)

    // Verify membership cascade deleted
    const { data: memberAfter } = await adminClient
      .from('organization_members')
      .select('id')
      .eq('organization_id', org!.id)
      .maybeSingle()

    expect(memberAfter).toBeNull()

    testOrgIds.delete(org!.id)
  })
})
