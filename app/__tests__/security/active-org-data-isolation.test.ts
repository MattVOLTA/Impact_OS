/**
 * Active Organization Data Isolation Tests
 *
 * CRITICAL: These tests verify that users ONLY see data from their ACTIVE organization
 *
 * Current Bug: Users see data from ALL organizations they belong to
 * Expected: Users see data ONLY from currently active organization
 *
 * Part of Issue #55: Fix Multi-Organization Data Isolation Bug
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
const testCompanyIds = new Set<string>()

afterEach(async () => {
  // Cleanup
  for (const companyId of testCompanyIds) {
    await adminClient.from('companies').delete().eq('id', companyId)
  }
  testCompanyIds.clear()

  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()

  for (const orgId of testOrgIds) {
    await adminClient.from('tenants').delete().eq('id', orgId)
  }
  testOrgIds.clear()
})

describe('Active Organization Data Isolation - Companies', () => {
  test('user sees ONLY active organization companies (not all memberships)', async () => {
    // Create user
    const userEmail = `active-org-test-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    const userId = authData.user!.id
    testUserIds.add(userId)

    await new Promise(resolve => setTimeout(resolve, 200))

    // Create TWO organizations
    const { data: orgA } = await adminClient.from('tenants').insert({
      name: `Org A ${Date.now()}`,
      slug: `org-a-${Date.now()}`
    }).select().single()

    const { data: orgB } = await adminClient.from('tenants').insert({
      name: `Org B ${Date.now()}`,
      slug: `org-b-${Date.now()}`
    }).select().single()

    testOrgIds.add(orgA!.id)
    testOrgIds.add(orgB!.id)

    // Add user to BOTH organizations
    await adminClient.from('organization_members').insert([
      { user_id: userId, organization_id: orgA!.id, role: 'admin' },
      { user_id: userId, organization_id: orgB!.id, role: 'admin' }
    ])

    // Create companies in BOTH orgs
    const { data: companyA } = await adminClient.from('companies').insert({
      tenant_id: orgA!.id,
      business_name: `Company in Org A - ${Date.now()}`
    }).select().single()

    const { data: companyB } = await adminClient.from('companies').insert({
      tenant_id: orgB!.id,
      business_name: `Company in Org B - ${Date.now()}`
    }).select().single()

    testCompanyIds.add(companyA!.id)
    testCompanyIds.add(companyB!.id)

    // Sign in as user
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'TestPassword123!'
    })

    // Set active org to A using admin client (to set the session)
    await adminClient.from('user_sessions').upsert({
      user_id: userId,
      active_organization_id: orgA!.id
    })

    // Query companies as user - should ONLY see Org A
    const { data: companiesWhenOrgA } = await userClient
      .from('companies')
      .select('*')

    // CRITICAL ASSERTIONS
    expect(companiesWhenOrgA).toBeDefined()
    expect(companiesWhenOrgA!.length).toBe(1) // Should see exactly 1 company
    expect(companiesWhenOrgA![0].id).toBe(companyA!.id) // Should be Org A's company
    expect(companiesWhenOrgA![0].tenant_id).toBe(orgA!.id)

    // CRITICAL: Should NOT see Org B's company
    const foundOrgBCompany = companiesWhenOrgA!.find(c => c.id === companyB!.id)
    expect(foundOrgBCompany).toBeUndefined()

    // Switch to Org B
    await adminClient.from('user_sessions').update({
      active_organization_id: orgB!.id,
      last_switched_at: new Date().toISOString()
    }).eq('user_id', userId)

    // Query companies again - should ONLY see Org B now
    const { data: companiesWhenOrgB } = await userClient
      .from('companies')
      .select('*')

    expect(companiesWhenOrgB).toBeDefined()
    expect(companiesWhenOrgB!.length).toBe(1) // Should see exactly 1 company
    expect(companiesWhenOrgB![0].id).toBe(companyB!.id) // Should be Org B's company
    expect(companiesWhenOrgB![0].tenant_id).toBe(orgB!.id)

    // CRITICAL: Should NOT see Org A's company anymore
    const foundOrgACompany = companiesWhenOrgB!.find(c => c.id === companyA!.id)
    expect(foundOrgACompany).toBeUndefined()

    await userClient.auth.signOut()
  })
})
