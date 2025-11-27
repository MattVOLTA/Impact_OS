/**
 * API Route Test Helpers
 *
 * Shared utilities for testing API routes following TDD principles.
 * Provides helper functions for:
 * - Creating test users with specific tenant memberships
 * - Managing authenticated requests
 * - Cleaning up test data
 * - Test tenant constants
 */

import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Test Constants
// ============================================================================

// Test tenant IDs (from CLAUDE.md)
export const TEST_TENANT_ACME = '11111111-1111-1111-1111-111111111111'
export const TEST_TENANT_BETA = '22222222-2222-2222-2222-222222222222'
export const TEST_TENANT_GAMMA = '33333333-3333-3333-3333-333333333333'

// Admin client for test setup/cleanup (uses service role key)
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-tests-will-fail-without-real-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

// ============================================================================
// Test User Management
// ============================================================================

// Track test user IDs for cleanup
const testUserIds = new Set<string>()
const testDataIds: Record<string, Set<string>> = {}

/**
 * Create a test user with specific tenant membership
 */
export async function createTestUser(
  email: string,
  tenantId: string,
  options?: {
    role?: 'owner' | 'admin' | 'editor' | 'viewer'
    firstName?: string
    lastName?: string
  }
): Promise<{ id: string; email: string }> {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
    user_metadata: {
      tenant_id: tenantId,
      first_name: options?.firstName || 'Test',
      last_name: options?.lastName || 'User',
      role: options?.role || 'editor'
    }
  })

  if (error) throw error
  if (!data.user) throw new Error('User creation failed')

  testUserIds.add(data.user.id)
  return { id: data.user.id, email: data.user.email! }
}

/**
 * Get an authenticated Supabase client for a test user
 */
export async function getAuthenticatedClient(email: string, password = 'test-password-123') {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  })

  if (error) throw error
  return { client, session: data.session }
}

/**
 * Get auth headers (Bearer token) for a test user
 */
export async function getAuthHeaders(email: string, password = 'test-password-123'): Promise<Record<string, string>> {
  const { session } = await getAuthenticatedClient(email, password)

  if (!session?.access_token) {
    throw new Error('Failed to get access token')
  }

  return {
    Authorization: `Bearer ${session.access_token}`
  }
}

// ============================================================================
// Test Data Management
// ============================================================================

/**
 * Track test data for cleanup
 */
export function trackTestData(table: string, id: string) {
  if (!testDataIds[table]) {
    testDataIds[table] = new Set()
  }
  testDataIds[table].add(id)
}

/**
 * Create a test form (for forms/submit tests)
 */
export async function createTestForm(options: {
  tenantId: string
  isPublished?: boolean
  title?: string
  createdBy?: string
}): Promise<{ id: string; tenant_id: string }> {
  const { data, error } = await adminClient
    .from('forms')
    .insert({
      tenant_id: options.tenantId,
      title: options.title || `Test Form ${Date.now()}`,
      description: 'Test form created by API tests',
      is_published: options.isPublished ?? true,
      version: 1,
      valid_from: new Date().toISOString(),
      form_data: {
        sections: [
          {
            id: '00000000-0000-0000-0000-000000000001',
            title: 'Test Section',
            isExpanded: true,
            questions: [
              {
                id: '00000000-0000-0000-0000-000000000002',
                type: 'text',
                text: 'Test Question',
                required: false,
                layout: 'full'
              }
            ]
          }
        ]
      },
      created_by: options.createdBy || null // Allow null for tests
    })
    .select('id, tenant_id')
    .single()

  if (error) throw error
  trackTestData('forms', data.id)
  return data
}

/**
 * Create a test company (for forms/submit tests)
 */
export async function createTestCompany(options: {
  tenantId: string
  businessName?: string
}): Promise<{ id: string; tenant_id: string }> {
  const { data, error } = await adminClient
    .from('companies')
    .insert({
      tenant_id: options.tenantId,
      business_name: options.businessName || `Test Company ${Date.now()}`
    })
    .select('id, tenant_id')
    .single()

  if (error) throw error
  trackTestData('companies', data.id)
  return data
}

/**
 * Create a test report (for reports/download tests)
 */
export async function createTestReport(options: {
  tenantId: string
  createdBy: string
  title?: string
  content?: string
}): Promise<{ id: string; tenant_id: string }> {
  // First create a report session
  const { data: session, error: sessionError } = await adminClient
    .from('report_sessions')
    .insert({
      tenant_id: options.tenantId,
      created_by: options.createdBy,
      conversation: []
    })
    .select('id')
    .single()

  if (sessionError) throw sessionError
  trackTestData('report_sessions', session.id)

  // Then create the report
  const { data, error } = await adminClient
    .from('reports')
    .insert({
      session_id: session.id,
      tenant_id: options.tenantId,
      created_by: options.createdBy,
      report_type: 'custom',
      title: options.title || `Test Report ${Date.now()}`,
      content: options.content || '# Test Report\n\nThis is a test report.',
      metadata: {}
    })
    .select('id, tenant_id')
    .single()

  if (error) throw error
  trackTestData('reports', data.id)
  return data
}

/**
 * Set user's active organization in user_sessions table
 */
export async function setActiveOrganization(userId: string, organizationId: string) {
  const { error } = await adminClient
    .from('user_sessions')
    .upsert({
      user_id: userId,
      active_organization_id: organizationId,
      last_switched_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })

  if (error) throw error
}

/**
 * Add user as member of an organization
 */
export async function addOrganizationMember(
  userId: string,
  organizationId: string,
  role: 'owner' | 'admin' | 'editor' | 'viewer' = 'editor'
) {
  const { error } = await adminClient
    .from('organization_members')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      role
    })

  if (error && !error.message.includes('duplicate')) throw error
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Clean up all test users created during tests
 */
export async function cleanupTestUsers() {
  for (const userId of testUserIds) {
    try {
      // First delete user_sessions (no RLS needed since we use admin)
      await adminClient
        .from('user_sessions')
        .delete()
        .eq('user_id', userId)

      // Then delete auth user (cascades to public.users)
      await adminClient.auth.admin.deleteUser(userId)
    } catch (e) {
      console.warn(`Failed to cleanup user ${userId}:`, e)
    }
  }
  testUserIds.clear()
}

/**
 * Clean up all tracked test data
 */
export async function cleanupTestData() {
  // Clean up in order to respect foreign key constraints
  const cleanupOrder = [
    'form_submissions',
    'reports',
    'report_sessions',
    'forms',
    'companies'
  ]

  for (const table of cleanupOrder) {
    if (testDataIds[table]?.size > 0) {
      try {
        await adminClient
          .from(table)
          .delete()
          .in('id', Array.from(testDataIds[table]))
        testDataIds[table].clear()
      } catch (e) {
        console.warn(`Failed to cleanup ${table}:`, e)
      }
    }
  }
}

/**
 * Full cleanup - call this in afterEach/afterAll
 */
export async function cleanupAll() {
  await cleanupTestData()
  await cleanupTestUsers()
}

// ============================================================================
// Request Helpers
// ============================================================================

/**
 * Get the base URL for API requests (for local testing)
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Make an authenticated API request
 */
export async function makeAuthenticatedRequest(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: any
    email: string
    password?: string
  }
): Promise<Response> {
  const headers = await getAuthHeaders(options.email, options.password)

  return fetch(`${getBaseUrl()}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })
}

/**
 * Make an unauthenticated API request
 */
export async function makeUnauthenticatedRequest(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: any
  }
): Promise<Response> {
  return fetch(`${getBaseUrl()}${path}`, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    body: options?.body ? JSON.stringify(options.body) : undefined
  })
}
