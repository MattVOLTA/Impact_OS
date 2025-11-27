/**
 * Test Utilities for Forms Testing
 *
 * Provides utilities to mock Next.js request context and authentication
 * for testing DAL functions that depend on cookies() and requireAuth()
 */

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Test tenant IDs (from CLAUDE.md)
export const TENANT_A_ID = '11111111-1111-1111-1111-111111111111' // Acme Accelerator
export const TENANT_B_ID = '22222222-2222-2222-2222-222222222222' // Beta Incubator
export const TENANT_C_ID = '33333333-3333-3333-3333-333333333333' // Gamma Ventures

/**
 * Create admin Supabase client (bypasses RLS)
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Create authenticated Supabase client for a specific user
 */
export function createAuthenticatedClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  )
}

/**
 * Create a test user for a specific tenant
 */
export async function createTestUser(tenantId: string, emailPrefix?: string) {
  const adminClient = createAdminClient()

  const email = `${emailPrefix || 'test'}-${Date.now()}@test.com`

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
    user_metadata: {
      tenant_id: tenantId,
      first_name: 'Test',
      last_name: 'User'
    }
  })

  if (error) throw error

  // Wait for trigger to create public.users record
  await new Promise(resolve => setTimeout(resolve, 150))

  return {
    userId: data.user.id,
    email,
    tenantId
  }
}

/**
 * Sign in as a test user and get access token
 */
export async function signInTestUser(email: string, password: string = 'test-password-123') {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error

  return {
    accessToken: data.session!.access_token,
    user: data.user
  }
}

/**
 * Delete a test user (admin operation)
 */
export async function deleteTestUser(userId: string) {
  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(userId)
}

/**
 * Mock Next.js cookies for testing
 *
 * This is needed because DAL functions call cookies() which requires Next.js request context
 */
export function mockNextCookies(cookieData: Record<string, string> = {}) {
  const cookieStore = {
    get: jest.fn((name: string) => ({
      name,
      value: cookieData[name] || ''
    })),
    getAll: jest.fn(() =>
      Object.entries(cookieData).map(([name, value]) => ({ name, value }))
    ),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn((name: string) => name in cookieData)
  }

  // Mock the cookies() function from next/headers
  jest.spyOn(require('next/headers'), 'cookies').mockResolvedValue(cookieStore)

  return cookieStore
}

/**
 * Setup test environment with authenticated user context
 *
 * Use this in beforeEach to set up a full test environment with:
 * - Admin client
 * - Test user
 * - Authenticated client
 * - Mocked Next.js context
 */
export async function setupAuthenticatedTestEnvironment(tenantId: string) {
  const adminClient = createAdminClient()

  // Create test user
  const { userId, email } = await createTestUser(tenantId)

  // Sign in to get access token
  const { accessToken, user } = await signInTestUser(email)

  // Create authenticated client
  const authenticatedClient = createAuthenticatedClient(accessToken)

  // Mock Next.js cookies with the session
  mockNextCookies({
    'sb-access-token': accessToken,
    'sb-refresh-token': 'mock-refresh-token'
  })

  return {
    adminClient,
    authenticatedClient,
    userId,
    email,
    accessToken,
    user,
    cleanup: async () => {
      await deleteTestUser(userId)
      jest.restoreAllMocks()
    }
  }
}

/**
 * Wait for database trigger to complete
 */
export async function waitForTrigger(ms: number = 150) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Create test form data with sections and questions
 */
export function createTestFormData() {
  return {
    sections: [
      {
        id: '00000000-0000-0000-0000-000000000001',
        title: 'Test Section',
        isExpanded: true,
        questions: [
          {
            id: '00000000-0000-0000-0000-000000000002',
            type: 'text' as const,
            text: 'What is your company name?',
            required: true,
            layout: 'full' as const
          },
          {
            id: '00000000-0000-0000-0000-000000000003',
            type: 'number' as const,
            text: 'How many employees do you have?',
            required: false,
            layout: 'half' as const,
            validation: {
              min: 0,
              max: 10000
            }
          }
        ]
      }
    ]
  }
}

/**
 * Ensure test companies exist for both tenants
 *
 * Some tests need companies to create submissions/reminders
 */
export async function ensureTestCompaniesExist() {
  const adminClient = createAdminClient()

  // Check if Tenant A has companies
  const { data: tenantACompanies } = await adminClient
    .from('companies')
    .select('id')
    .eq('tenant_id', TENANT_A_ID)
    .limit(1)

  if (!tenantACompanies || tenantACompanies.length === 0) {
    // Create test company for Tenant A
    await adminClient.from('companies').insert({
      tenant_id: TENANT_A_ID,
      business_name: 'Test Company A',
      email: 'test-a@example.com'
    })
  }

  // Check if Tenant B has companies
  const { data: tenantBCompanies } = await adminClient
    .from('companies')
    .select('id')
    .eq('tenant_id', TENANT_B_ID)
    .limit(1)

  if (!tenantBCompanies || tenantBCompanies.length === 0) {
    // Create test company for Tenant B
    await adminClient.from('companies').insert({
      tenant_id: TENANT_B_ID,
      business_name: 'Test Company B',
      email: 'test-b@example.com'
    })
  }

  // Wait for insert to complete
  await waitForTrigger(100)
}

/**
 * Ensure test contacts exist for both tenants
 */
export async function ensureTestContactsExist() {
  const adminClient = createAdminClient()

  // Check if Tenant A has contacts
  const { data: tenantAContacts } = await adminClient
    .from('contacts')
    .select('id')
    .eq('tenant_id', TENANT_A_ID)
    .limit(1)

  if (!tenantAContacts || tenantAContacts.length === 0) {
    await adminClient.from('contacts').insert({
      tenant_id: TENANT_A_ID,
      first_name: 'Test',
      last_name: 'Contact A',
      email: 'contact-a@example.com'
    })
  }

  // Check if Tenant B has contacts
  const { data: tenantBContacts } = await adminClient
    .from('contacts')
    .select('id')
    .eq('tenant_id', TENANT_B_ID)
    .limit(1)

  if (!tenantBContacts || tenantBContacts.length === 0) {
    await adminClient.from('contacts').insert({
      tenant_id: TENANT_B_ID,
      first_name: 'Test',
      last_name: 'Contact B',
      email: 'contact-b@example.com'
    })
  }

  await waitForTrigger(100)
}
