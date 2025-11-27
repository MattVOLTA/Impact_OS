/**
 * Multi-Organization Isolation Tests
 *
 * Tests that verify multi-org support works correctly:
 * - Users can belong to multiple organizations
 * - Data access is scoped to current organization
 * - RLS policies enforce multi-org isolation
 * - Users cannot access data from orgs they don't belong to
 *
 * Part of Issue #54: Self-Service Onboarding
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

describe('Multi-Organization Support', () => {
  test('user can belong to multiple organizations', async () => {
    // Create test user
    const testEmail = `test-multiorg-${Date.now()}@example.com`
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    expect(authError).toBeNull()
    expect(authData.user).toBeDefined()

    const userId = authData.user!.id
    testUserIds.add(userId)

    // Wait for handle_new_user trigger
    await new Promise(resolve => setTimeout(resolve, 200))

    // Create two test organizations
    const { data: org1, error: org1Error } = await adminClient
      .from('tenants')
      .insert({
        name: `Test Org 1 ${Date.now()}`,
        slug: `test-org-1-${Date.now()}`
      })
      .select()
      .single()

    expect(org1Error).toBeNull()
    expect(org1).toBeDefined()
    testOrgIds.add(org1!.id)

    const { data: org2, error: org2Error } = await adminClient
      .from('tenants')
      .insert({
        name: `Test Org 2 ${Date.now()}`,
        slug: `test-org-2-${Date.now()}`
      })
      .select()
      .single()

    expect(org2Error).toBeNull()
    expect(org2).toBeDefined()
    testOrgIds.add(org2!.id)

    // Add user to both organizations with different roles
    const { error: member1Error } = await adminClient
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: org1!.id,
        role: 'admin'
      })

    expect(member1Error).toBeNull()

    const { error: member2Error } = await adminClient
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: org2!.id,
        role: 'editor'
      })

    expect(member2Error).toBeNull()

    // Verify user can query their memberships
    const { data: memberships, error: queryError } = await adminClient
      .from('organization_members')
      .select('*, organization:tenants(name)')
      .eq('user_id', userId)

    expect(queryError).toBeNull()
    expect(memberships).toHaveLength(2)
    expect(memberships?.map(m => m.role).sort()).toEqual(['admin', 'editor'])
  })

  test('user can access data from orgs they belong to via RLS', async () => {
    // Create user and organization
    const testEmail = `test-access-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    const userId = authData.user!.id
    testUserIds.add(userId)

    await new Promise(resolve => setTimeout(resolve, 200))

    // Create organization
    const { data: org } = await adminClient
      .from('tenants')
      .insert({
        name: `Test Access Org ${Date.now()}`,
        slug: `test-access-org-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org!.id)

    // Add user as member
    await adminClient
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: org!.id,
        role: 'editor'
      })

    // Create test company in this org
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({
        tenant_id: org!.id,
        business_name: `Test Company ${Date.now()}`
      })
      .select()
      .single()

    expect(companyError).toBeNull()
    expect(company).toBeDefined()

    // Sign in as user
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: testEmail,
      password: 'TestPassword123!'
    })

    // User should be able to query companies in their org
    const { data: companies, error: queryError } = await userClient
      .from('companies')
      .select('*')
      .eq('tenant_id', org!.id)

    expect(queryError).toBeNull()
    expect(companies).toBeDefined()
    expect(companies?.length).toBeGreaterThan(0)

    // Cleanup company
    await adminClient.from('companies').delete().eq('id', company!.id)
    await userClient.auth.signOut()
  })

  test('user cannot access data from orgs they do NOT belong to', async () => {
    // Create user
    const testEmail = `test-noaccess-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    const userId = authData.user!.id
    testUserIds.add(userId)

    await new Promise(resolve => setTimeout(resolve, 200))

    // Create two organizations
    const { data: org1 } = await adminClient
      .from('tenants')
      .insert({
        name: `Test No Access 1 ${Date.now()}`,
        slug: `test-no-access-1-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org1!.id)

    const { data: org2 } = await adminClient
      .from('tenants')
      .insert({
        name: `Test No Access 2 ${Date.now()}`,
        slug: `test-no-access-2-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org2!.id)

    // Add user ONLY to org1
    await adminClient
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: org1!.id,
        role: 'editor'
      })

    // Create test company in org2 (user is NOT a member)
    const { data: company } = await adminClient
      .from('companies')
      .insert({
        tenant_id: org2!.id,
        business_name: `Test Blocked Company ${Date.now()}`
      })
      .select()
      .single()

    // Sign in as user
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: testEmail,
      password: 'TestPassword123!'
    })

    // User should NOT be able to query companies in org2
    const { data: companies } = await userClient
      .from('companies')
      .select('*')
      .eq('tenant_id', org2!.id)

    // RLS should block access - empty result
    expect(companies || []).toHaveLength(0)

    // Cleanup
    await adminClient.from('companies').delete().eq('id', company!.id)
    await userClient.auth.signOut()
  })

  test('RLS policies updated for multi-org access', async () => {
    // Create user and add to TWO organizations
    const testEmail = `test-multiorg-rls-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    const userId = authData.user!.id
    testUserIds.add(userId)

    await new Promise(resolve => setTimeout(resolve, 200))

    // Create two organizations
    const { data: org1 } = await adminClient
      .from('tenants')
      .insert({
        name: `Multi RLS Org 1 ${Date.now()}`,
        slug: `multi-rls-1-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org1!.id)

    const { data: org2 } = await adminClient
      .from('tenants')
      .insert({
        name: `Multi RLS Org 2 ${Date.now()}`,
        slug: `multi-rls-2-${Date.now()}`
      })
      .select()
      .single()

    testOrgIds.add(org2!.id)

    // Add user to BOTH organizations
    await adminClient.from('organization_members').insert([
      { user_id: userId, organization_id: org1!.id, role: 'admin' },
      { user_id: userId, organization_id: org2!.id, role: 'editor' }
    ])

    // Create companies in both orgs
    const { data: company1 } = await adminClient
      .from('companies')
      .insert({
        tenant_id: org1!.id,
        business_name: `Company in Org 1 ${Date.now()}`
      })
      .select()
      .single()

    const { data: company2 } = await adminClient
      .from('companies')
      .insert({
        tenant_id: org2!.id,
        business_name: `Company in Org 2 ${Date.now()}`
      })
      .select()
      .single()

    // Sign in as user
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: testEmail,
      password: 'TestPassword123!'
    })

    // User should be able to query companies from BOTH orgs
    const { data: allCompanies } = await userClient
      .from('companies')
      .select('*')
      .in('tenant_id', [org1!.id, org2!.id])

    // Should see companies from both orgs (multi-org RLS working)
    expect(allCompanies || []).toHaveLength(2)

    // Cleanup
    await adminClient.from('companies').delete().in('id', [company1!.id, company2!.id])
    await userClient.auth.signOut()
  })
})
