/**
 * Tenant Isolation Tests
 *
 * These tests verify that RLS policies enforce complete tenant isolation.
 * Following TDD: These tests are written FIRST and should FAIL until auth is implemented.
 *
 * See docs/architecture/auth-best-practices.md for testing patterns.
 */

import { createClient } from '@supabase/supabase-js'

// Test tenant IDs (from CLAUDE.md test data reference)
const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'
const TENANT_2_ID = '22222222-2222-2222-2222-222222222222'

// Track test user IDs for cleanup
const testUserIds = new Set<string>()

// Admin client for cleanup (uses service role key)
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-tests-will-fail-without-real-key'
)

// Cleanup after each test
afterEach(async () => {
  // Delete test companies created during tests
  // Use service role to bypass RLS for cleanup
  await adminClient
    .from('companies')
    .delete()
    .like('business_name', '%Tenant%Test%')

  await adminClient
    .from('contacts')
    .delete()
    .eq('email', 'john@example.com')

  // Delete all test users (cascades to public.users)
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

// Helper to create test user and track for cleanup
async function createTestUser(email: string, tenantId: string) {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
    user_metadata: {
      tenant_id: tenantId,
      first_name: 'Test',
      last_name: 'User',
      role: 'editor'
    }
  })

  if (error) throw error
  if (!data.user) throw new Error('User creation failed')

  testUserIds.add(data.user.id)
  return data.user
}

describe('Tenant Isolation - RLS Enforcement', () => {
  test('RLS prevents cross-tenant company access', async () => {
    // Create two users in different tenants
    const user1 = await createTestUser('user1@tenant1.test', TENANT_1_ID)
    const user2 = await createTestUser('user2@tenant2.test', TENANT_2_ID)

    // User 1 creates a company (sign in as user1)
    const user1Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { session: session1 }, error: signInError1 } = await user1Client.auth.signInWithPassword({
      email: 'user1@tenant1.test',
      password: 'test-password-123'
    })

    expect(signInError1).toBeNull()
    expect(session1).toBeDefined()

    // Create company as user1
    // Note: Must provide tenant_id explicitly (application will get this from JWT)
    const { data: company, error: createError } = await user1Client
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: 'Tenant 1 Company'
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(company).toBeDefined()
    expect(company?.business_name).toBe('Tenant 1 Company')

    // User 2 tries to access user1's company (sign in as user2)
    const user2Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { session: session2 }, error: signInError2 } = await user2Client.auth.signInWithPassword({
      email: 'user2@tenant2.test',
      password: 'test-password-123'
    })

    expect(signInError2).toBeNull()
    expect(session2).toBeDefined()

    // Try to query user1's company
    const { data: crossTenantData, error: crossTenantError } = await user2Client
      .from('companies')
      .select('*')
      .eq('id', company!.id)
      .single()

    // RLS should block this - user2 cannot see user1's company
    expect(crossTenantData).toBeNull()
    expect(crossTenantError).toBeTruthy()
  })

  test('RLS prevents cross-tenant contact access', async () => {
    // Create two users in different tenants
    const user1 = await createTestUser('user1-contacts@tenant1.test', TENANT_1_ID)
    const user2 = await createTestUser('user2-contacts@tenant2.test', TENANT_2_ID)

    // User 1 creates a contact
    const user1Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await user1Client.auth.signInWithPassword({
      email: 'user1-contacts@tenant1.test',
      password: 'test-password-123'
    })

    const { data: contact } = await user1Client
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        role: 'founder'
      })
      .select()
      .single()

    expect(contact).toBeDefined()

    // User 2 tries to access user1's contact
    const user2Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await user2Client.auth.signInWithPassword({
      email: 'user2-contacts@tenant2.test',
      password: 'test-password-123'
    })

    const { data: crossTenantData } = await user2Client
      .from('contacts')
      .select('*')
      .eq('id', contact!.id)
      .single()

    // RLS should block this
    expect(crossTenantData).toBeNull()
  })

  test('Users can only see their own tenant data', async () => {
    const user1 = await createTestUser('user1-list@tenant1.test', TENANT_1_ID)

    const user1Client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await user1Client.auth.signInWithPassword({
      email: 'user1-list@tenant1.test',
      password: 'test-password-123'
    })

    // Query all companies - should only see Tenant 1's companies
    const { data: companies } = await user1Client
      .from('companies')
      .select('*')

    // User should see companies from Tenant 1 only
    // May include seed data from Epic #2 + test data from other tests
    expect(companies).toBeDefined()
    expect(companies!.length).toBeGreaterThan(0)

    // CRITICAL TEST: Verify ALL companies belong to Tenant 1 (RLS filtering working)
    companies!.forEach(company => {
      expect(company.tenant_id).toBe(TENANT_1_ID)
    })

    // Verify no companies from other tenants visible
    const { data: tenant2Companies } = await user1Client
      .from('companies')
      .select('*')
      .eq('tenant_id', TENANT_2_ID)

    // Should return empty (RLS blocks cross-tenant access)
    expect(tenant2Companies).toEqual([])
  })
})
