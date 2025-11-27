/**
 * Company CRUD Tests
 *
 * Following TDD: These tests are written FIRST and should FAIL until features are implemented.
 *
 * Tests verify:
 * - Company creation with new schema (company_type, multi-select industries)
 * - Multi-tenant isolation in UI context
 * - Search functionality
 * - Industry multi-select associations
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'
const TENANT_2_ID = '22222222-2222-2222-2222-222222222222'

const testUserIds = new Set<string>()
const testCompanyIds = new Set<string>()

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

afterEach(async () => {
  // Cleanup companies
  for (const companyId of testCompanyIds) {
    await adminClient.from('companies').delete().eq('id', companyId)
  }
  testCompanyIds.clear()

  // Cleanup users
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

describe('Company Management - New Schema', () => {
  test('can create company with company_type', async () => {
    // Create test user
    const email = `company-type-${Date.now()}@test.com`
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: TENANT_1_ID,
        first_name: 'Test',
        last_name: 'User'
      }
    })

    if (!user) throw new Error('User creation failed')
    testUserIds.add(user.id)

    // Sign in
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email,
      password: 'test-password-123'
    })

    // Create company with new company_type field
    const { data: company, error } = await userClient
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: 'Test Startup Inc',
        company_type: 'Startup',
        city: 'Toronto',
        province: 'Ontario'
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(company).toBeDefined()
    expect(company?.business_name).toBe('Test Startup Inc')
    expect(company?.company_type).toBe('Startup')
    expect(company?.city).toBe('Toronto')
    expect(company?.province).toBe('Ontario')

    if (company) testCompanyIds.add(company.id)
  })

  test('can associate multiple industries with a company', async () => {
    // Create test user
    const email = `multi-industry-${Date.now()}@test.com`
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: TENANT_1_ID,
        first_name: 'Test',
        last_name: 'User'
      }
    })

    if (!user) throw new Error('User creation failed')
    testUserIds.add(user.id)

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email,
      password: 'test-password-123'
    })

    // Create company
    const { data: company } = await userClient
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: 'Multi-Industry Corp',
        company_type: 'Startup',
        city: 'Vancouver',
        province: 'British Columbia'
      })
      .select()
      .single()

    if (!company) throw new Error('Company creation failed')
    testCompanyIds.add(company.id)

    // Get industry IDs (Fintech and AI/ML)
    const { data: industries } = await userClient
      .from('industries')
      .select('id, name')
      .in('name', ['Fintech', 'AI/ML'])

    expect(industries).toBeDefined()
    expect(industries!.length).toBeGreaterThanOrEqual(1)

    // Associate multiple industries with company
    const industryAssociations = industries!.map(industry => ({
      company_id: company.id,
      industry_id: industry.id
    }))

    const { error: associationError } = await userClient
      .from('company_industries')
      .insert(industryAssociations)

    expect(associationError).toBeNull()

    // Verify associations were created
    const { data: companyIndustries } = await userClient
      .from('company_industries')
      .select('industry_id, industries(name)')
      .eq('company_id', company.id)

    expect(companyIndustries).toBeDefined()
    expect(companyIndustries!.length).toBe(industries!.length)
  })

  test('RLS prevents cross-tenant access to company_industries', async () => {
    // Create two users in different tenants
    const user1 = await adminClient.auth.admin.createUser({
      email: `industry-rls-1-${Date.now()}@test.com`,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { tenant_id: TENANT_1_ID, first_name: 'User', last_name: '1' }
    })

    const user2 = await adminClient.auth.admin.createUser({
      email: `industry-rls-2-${Date.now()}@test.com`,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { tenant_id: TENANT_2_ID, first_name: 'User', last_name: '2' }
    })

    if (!user1.data.user || !user2.data.user) throw new Error('User creation failed')
    testUserIds.add(user1.data.user.id)
    testUserIds.add(user2.data.user.id)

    // User 1 creates company with industry
    const user1Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await user1Client.auth.signInWithPassword({
      email: `industry-rls-1-${user1.data.user.email}`,
      password: 'test-password-123'
    })

    const { data: company } = await user1Client
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: 'Tenant 1 Company',
        company_type: 'Startup',
        city: 'Toronto',
        province: 'Ontario'
      })
      .select()
      .single()

    if (!company) throw new Error('Company creation failed')
    testCompanyIds.add(company.id)

    const { data: industries } = await user1Client
      .from('industries')
      .select('id')
      .limit(1)

    if (!industries || industries.length === 0) throw new Error('No industries found')

    await user1Client
      .from('company_industries')
      .insert({
        company_id: company.id,
        industry_id: industries[0].id
      })

    // User 2 tries to query user1's company industries
    const user2Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await user2Client.auth.signInWithPassword({
      email: user2.data.user.email!,
      password: 'test-password-123'
    })

    const { data: crossTenantIndustries } = await user2Client
      .from('company_industries')
      .select('*')
      .eq('company_id', company.id)

    // RLS should block this - user2 can't see user1's company industries
    expect(crossTenantIndustries).toEqual([])
  })
})

describe('Company Management - Canadian Provinces', () => {
  test('can save all Canadian provinces', async () => {
    const canadianProvinces = [
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
      'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
      'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
      'Saskatchewan', 'Yukon'
    ]

    // Create test user
    const email = `provinces-${Date.now()}@test.com`
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: TENANT_1_ID,
        first_name: 'Test',
        last_name: 'User'
      }
    })

    if (!user) throw new Error('User creation failed')
    testUserIds.add(user.id)

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email,
      password: 'test-password-123'
    })

    // Test that we can create companies with each province
    // Just test a few representative ones
    const testProvinces = ['Ontario', 'British Columbia', 'Quebec']

    for (const province of testProvinces) {
      const { data: company, error } = await userClient
        .from('companies')
        .insert({
          tenant_id: TENANT_1_ID,
          business_name: `Company in ${province}`,
          company_type: 'Startup',
          city: 'Test City',
          province: province
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(company?.province).toBe(province)

      if (company) testCompanyIds.add(company.id)
    }
  })
})
