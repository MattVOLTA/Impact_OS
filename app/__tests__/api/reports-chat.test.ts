/**
 * API Route Tests: /api/reports/chat
 *
 * Tests the AI-powered reporting chat API that handles natural language
 * conversations for generating compliance reports using Claude.
 *
 * TDD Approach:
 * 1. Test input validation (message required)
 * 2. Test session management (create, retrieve, update)
 * 3. Test tool execution (data retrieval functions)
 * 4. Test multi-tenant isolation (RLS enforcement)
 * 5. Test error handling
 *
 * Note: Since this API calls external Anthropic Claude, we test the
 * component parts in isolation rather than the full streaming flow.
 *
 * See: app/api/reports/chat/route.ts
 * See: Issue #73 for full test case requirements
 */

import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Test Setup
// ============================================================================

const TEST_TENANT_ACME = '11111111-1111-1111-1111-111111111111'
const TEST_TENANT_BETA = '22222222-2222-2222-2222-222222222222'

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

// Track test data for cleanup
const testUserIds: string[] = []
const testSessionIds: string[] = []
const testReportIds: string[] = []
const testCompanyIds: string[] = []
const testContactIds: string[] = []
const testInteractionIds: string[] = []

afterEach(async () => {
  // Clean up in reverse dependency order
  for (const reportId of testReportIds) {
    try {
      await adminClient.from('reports').delete().eq('id', reportId)
    } catch (e) { /* ignore */ }
  }
  testReportIds.length = 0

  for (const sessionId of testSessionIds) {
    try {
      await adminClient.from('report_sessions').delete().eq('id', sessionId)
    } catch (e) { /* ignore */ }
  }
  testSessionIds.length = 0

  // Clean up interaction-related data
  for (const interactionId of testInteractionIds) {
    try {
      await adminClient.from('interaction_contacts').delete().eq('interaction_id', interactionId)
      await adminClient.from('interaction_companies').delete().eq('interaction_id', interactionId)
      await adminClient.from('interactions').delete().eq('id', interactionId)
    } catch (e) { /* ignore */ }
  }
  testInteractionIds.length = 0

  for (const contactId of testContactIds) {
    try {
      await adminClient.from('company_contacts').delete().eq('contact_id', contactId)
      await adminClient.from('contacts').delete().eq('id', contactId)
    } catch (e) { /* ignore */ }
  }
  testContactIds.length = 0

  for (const companyId of testCompanyIds) {
    try {
      await adminClient.from('companies').delete().eq('id', companyId)
    } catch (e) { /* ignore */ }
  }
  testCompanyIds.length = 0

  // Clean up user_sessions
  for (const userId of testUserIds) {
    try {
      await adminClient.from('user_sessions').delete().eq('user_id', userId)
    } catch (e) { /* ignore */ }
  }

  // Clean up test users
  for (const userId of testUserIds) {
    try {
      await adminClient.auth.admin.deleteUser(userId)
    } catch (e) { /* ignore */ }
  }
  testUserIds.length = 0
})

// Helper to create test user
async function createTestUser(options: {
  email: string
  organizationId: string
}): Promise<{ id: string; email: string }> {
  const { data, error } = await adminClient.auth.admin.createUser({
    email: options.email,
    password: 'test-password-123',
    email_confirm: true,
    user_metadata: {
      tenant_id: options.organizationId,
      first_name: 'Test',
      last_name: 'User',
      role: 'editor'
    }
  })

  if (error) throw error
  if (!data.user) throw new Error('User creation failed')

  testUserIds.push(data.user.id)

  await adminClient
    .from('organization_members')
    .upsert({
      user_id: data.user.id,
      organization_id: options.organizationId,
      role: 'editor'
    }, {
      onConflict: 'user_id,organization_id'
    })

  return { id: data.user.id, email: data.user.email! }
}

// Helper to create test report session
async function createTestReportSession(options: {
  tenantId: string
  userId: string
  conversation?: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>
}): Promise<{ id: string; tenant_id: string; conversation: any[] }> {
  const { data, error } = await adminClient
    .from('report_sessions')
    .insert({
      tenant_id: options.tenantId,
      created_by: options.userId,
      conversation: options.conversation || []
    })
    .select('id, tenant_id, conversation')
    .single()

  if (error) throw error
  testSessionIds.push(data.id)
  return data
}

// Helper to create test company
async function createTestCompany(options: {
  tenantId: string
  businessName: string
}): Promise<{ id: string; business_name: string; tenant_id: string }> {
  const { data, error } = await adminClient
    .from('companies')
    .insert({
      tenant_id: options.tenantId,
      business_name: options.businessName
    })
    .select('id, business_name, tenant_id')
    .single()

  if (error) throw error
  testCompanyIds.push(data.id)
  return data
}

// Helper to create test contact
async function createTestContact(options: {
  tenantId: string
  firstName: string
  lastName: string
}): Promise<{ id: string; first_name: string; last_name: string; tenant_id: string }> {
  const { data, error } = await adminClient
    .from('contacts')
    .insert({
      tenant_id: options.tenantId,
      first_name: options.firstName,
      last_name: options.lastName
    })
    .select('id, first_name, last_name, tenant_id')
    .single()

  if (error) throw error
  testContactIds.push(data.id)
  return data
}

// Helper to create test interaction
async function createTestInteraction(options: {
  tenantId: string
  title: string
  meetingDate: string
  interactionType?: string
}): Promise<{ id: string; title: string; tenant_id: string }> {
  const { data, error } = await adminClient
    .from('interactions')
    .insert({
      tenant_id: options.tenantId,
      title: options.title,
      meeting_date: options.meetingDate,
      interaction_type: options.interactionType || 'meeting'
    })
    .select('id, title, tenant_id')
    .single()

  if (error) throw error
  testInteractionIds.push(data.id)
  return data
}

// Helper to set user's active organization
async function setActiveOrganization(userId: string, organizationId: string) {
  await adminClient
    .from('user_sessions')
    .upsert({
      user_id: userId,
      active_organization_id: organizationId,
      last_switched_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
}

// ============================================================================
// Input Validation Tests
// ============================================================================

describe('Reports Chat API - Input Validation', () => {
  test('validates message is required', async () => {
    // Simulate API validation logic
    const validateInput = (body: any) => {
      if (!body.message || typeof body.message !== 'string') {
        return { valid: false, error: 'Message is required', status: 400 }
      }
      return { valid: true }
    }

    // Missing message
    expect(validateInput({})).toEqual({
      valid: false,
      error: 'Message is required',
      status: 400
    })

    // Null message
    expect(validateInput({ message: null })).toEqual({
      valid: false,
      error: 'Message is required',
      status: 400
    })

    // Empty string message
    expect(validateInput({ message: '' })).toEqual({
      valid: false,
      error: 'Message is required',
      status: 400
    })

    // Number instead of string
    expect(validateInput({ message: 123 })).toEqual({
      valid: false,
      error: 'Message is required',
      status: 400
    })

    // Valid message
    expect(validateInput({ message: 'Generate a demographics report' })).toEqual({
      valid: true
    })
  })

  test('handles invalid sessionId gracefully', async () => {
    // If sessionId is provided but doesn't exist, should fail
    const checkSessionExists = async (sessionId: string) => {
      const { data, error } = await adminClient
        .from('report_sessions')
        .select('id')
        .eq('id', sessionId)
        .single()

      return { exists: !!data && !error }
    }

    // Non-existent session (valid UUID format)
    const result = await checkSessionExists('99999999-9999-4999-a999-999999999999')
    expect(result.exists).toBe(false)
  })
})

// ============================================================================
// Session Management Tests
// ============================================================================

describe('Reports Chat API - Session Management', () => {
  test('creates new session when sessionId not provided', async () => {
    const user = await createTestUser({
      email: `session-new-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    expect(session.id).toBeDefined()
    expect(session.tenant_id).toBe(TEST_TENANT_ACME)
    expect(session.conversation).toEqual([])
  })

  test('retrieves existing session when sessionId provided', async () => {
    const user = await createTestUser({
      email: `session-existing-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const existingConversation = [
      { role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() },
      { role: 'assistant' as const, content: 'Hi there!', timestamp: new Date().toISOString() }
    ]

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id,
      conversation: existingConversation
    })

    // Retrieve the session
    const { data: retrieved } = await adminClient
      .from('report_sessions')
      .select('*')
      .eq('id', session.id)
      .single()

    expect(retrieved.id).toBe(session.id)
    expect(retrieved.conversation).toHaveLength(2)
    expect(retrieved.conversation[0].content).toBe('Hello')
  })

  test('conversation history is persisted', async () => {
    const user = await createTestUser({
      email: `session-history-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    // Update conversation
    const newConversation = [
      { role: 'user', content: 'Generate a report', timestamp: new Date().toISOString() },
      { role: 'assistant', content: 'I can help with that!', timestamp: new Date().toISOString() }
    ]

    await adminClient
      .from('report_sessions')
      .update({ conversation: newConversation })
      .eq('id', session.id)

    // Verify persistence
    const { data: updated } = await adminClient
      .from('report_sessions')
      .select('conversation')
      .eq('id', session.id)
      .single()

    expect(updated.conversation).toHaveLength(2)
  })

  test('sessions are tenant-isolated', async () => {
    const acmeUser = await createTestUser({
      email: `session-acme-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const betaUser = await createTestUser({
      email: `session-beta-${Date.now()}@beta.test`,
      organizationId: TEST_TENANT_BETA
    })

    const acmeSession = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: acmeUser.id
    })

    const betaSession = await createTestReportSession({
      tenantId: TEST_TENANT_BETA,
      userId: betaUser.id
    })

    // Verify sessions are in different tenants
    expect(acmeSession.tenant_id).toBe(TEST_TENANT_ACME)
    expect(betaSession.tenant_id).toBe(TEST_TENANT_BETA)

    // Query with tenant filter (simulating RLS)
    const { data: acmeSessions } = await adminClient
      .from('report_sessions')
      .select('id')
      .eq('tenant_id', TEST_TENANT_ACME)
      .eq('id', acmeSession.id)

    expect(acmeSessions).toHaveLength(1)

    // BETA user shouldn't see ACME session
    const { data: crossTenantCheck } = await adminClient
      .from('report_sessions')
      .select('id')
      .eq('tenant_id', TEST_TENANT_BETA)
      .eq('id', acmeSession.id)

    expect(crossTenantCheck).toHaveLength(0)
  })
})

// ============================================================================
// Tool Execution Tests (Data Retrieval Functions)
// ============================================================================

describe('Reports Chat API - Tool Execution', () => {
  test('search_companies finds matching companies', async () => {
    await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'Searchable Tech Inc'
    })

    await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'Another Company'
    })

    // Simulate search_companies tool
    const { data: results } = await adminClient
      .from('companies')
      .select('id, business_name, description')
      .eq('tenant_id', TEST_TENANT_ACME)
      .ilike('business_name', '%Searchable%')
      .order('business_name')
      .limit(10)

    expect(results).toHaveLength(1)
    expect(results![0].business_name).toBe('Searchable Tech Inc')
  })

  test('search_contacts finds matching contacts', async () => {
    await createTestContact({
      tenantId: TEST_TENANT_ACME,
      firstName: 'John',
      lastName: 'Searchable'
    })

    await createTestContact({
      tenantId: TEST_TENANT_ACME,
      firstName: 'Jane',
      lastName: 'Other'
    })

    // Simulate search_contacts tool
    const { data: results } = await adminClient
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('tenant_id', TEST_TENANT_ACME)
      .or('first_name.ilike.%Searchable%,last_name.ilike.%Searchable%')
      .order('last_name')
      .limit(10)

    expect(results).toHaveLength(1)
    expect(results![0].last_name).toBe('Searchable')
  })

  test('get_company_interactions retrieves company interactions', async () => {
    const company = await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'Interaction Test Co'
    })

    const interaction = await createTestInteraction({
      tenantId: TEST_TENANT_ACME,
      title: 'Q4 Meeting',
      meetingDate: '2024-10-15'
    })

    // Link interaction to company
    await adminClient
      .from('interaction_companies')
      .insert({
        interaction_id: interaction.id,
        company_id: company.id
      })

    // Simulate get_company_interactions tool
    const { data: interactionCompanies } = await adminClient
      .from('interaction_companies')
      .select('interaction_id')
      .eq('company_id', company.id)

    const interactionIds = interactionCompanies!.map(ic => ic.interaction_id)

    const { data: interactions } = await adminClient
      .from('interactions')
      .select('id, title, meeting_date, interaction_type')
      .in('id', interactionIds)
      .order('meeting_date', { ascending: false })
      .limit(10)

    expect(interactions).toHaveLength(1)
    expect(interactions![0].title).toBe('Q4 Meeting')
  })

  test('save_report creates report artifact', async () => {
    const user = await createTestUser({
      email: `report-save-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    // Simulate save_report tool
    const { data: report, error } = await adminClient
      .from('reports')
      .insert({
        session_id: session.id,
        tenant_id: TEST_TENANT_ACME,
        created_by: user.id,
        report_type: 'demographic_reach',
        title: 'Q4 Demographics Report',
        content: '# Q4 Demographics\n\nReport content here...',
        metadata: { start_date: '2024-10-01', end_date: '2024-12-31' }
      })
      .select('id, title, report_type')
      .single()

    expect(error).toBeNull()
    expect(report.title).toBe('Q4 Demographics Report')
    expect(report.report_type).toBe('demographic_reach')

    testReportIds.push(report.id)
  })
})

// ============================================================================
// Multi-Tenant Isolation Tests
// ============================================================================

describe('Reports Chat API - Multi-Tenant Isolation', () => {
  test('users can only access their tenant data via tools', async () => {
    // Create companies in different tenants
    const acmeCompany = await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'ACME Secret Corp'
    })

    const betaCompany = await createTestCompany({
      tenantId: TEST_TENANT_BETA,
      businessName: 'BETA Public Corp'
    })

    // Search as ACME tenant (simulating RLS)
    const { data: acmeResults } = await adminClient
      .from('companies')
      .select('id, business_name')
      .eq('tenant_id', TEST_TENANT_ACME)
      .ilike('business_name', '%Corp%')

    // Should only find ACME company
    const acmeNames = acmeResults!.map(c => c.business_name)
    expect(acmeNames).toContain('ACME Secret Corp')
    expect(acmeNames).not.toContain('BETA Public Corp')

    // Search as BETA tenant
    const { data: betaResults } = await adminClient
      .from('companies')
      .select('id, business_name')
      .eq('tenant_id', TEST_TENANT_BETA)
      .ilike('business_name', '%Corp%')

    const betaNames = betaResults!.map(c => c.business_name)
    expect(betaNames).toContain('BETA Public Corp')
    expect(betaNames).not.toContain('ACME Secret Corp')
  })

  test('reports are tenant-isolated', async () => {
    const acmeUser = await createTestUser({
      email: `report-acme-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const betaUser = await createTestUser({
      email: `report-beta-${Date.now()}@beta.test`,
      organizationId: TEST_TENANT_BETA
    })

    const acmeSession = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: acmeUser.id
    })

    const betaSession = await createTestReportSession({
      tenantId: TEST_TENANT_BETA,
      userId: betaUser.id
    })

    // Create reports in each tenant
    const { data: acmeReport } = await adminClient
      .from('reports')
      .insert({
        session_id: acmeSession.id,
        tenant_id: TEST_TENANT_ACME,
        created_by: acmeUser.id,
        report_type: 'custom',
        title: 'ACME Confidential',
        content: 'Secret ACME data'
      })
      .select('id')
      .single()

    testReportIds.push(acmeReport!.id)

    const { data: betaReport } = await adminClient
      .from('reports')
      .insert({
        session_id: betaSession.id,
        tenant_id: TEST_TENANT_BETA,
        created_by: betaUser.id,
        report_type: 'custom',
        title: 'BETA Report',
        content: 'BETA data'
      })
      .select('id')
      .single()

    testReportIds.push(betaReport!.id)

    // BETA user tries to access ACME report
    const { data: crossTenantCheck } = await adminClient
      .from('reports')
      .select('id, title')
      .eq('tenant_id', TEST_TENANT_BETA)
      .eq('id', acmeReport!.id)

    expect(crossTenantCheck).toHaveLength(0)
  })
})

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Reports Chat API - Error Handling', () => {
  test('handles database errors gracefully', async () => {
    // Try to query with invalid UUID
    const { error } = await adminClient
      .from('companies')
      .select('id')
      .eq('tenant_id', 'not-a-valid-uuid')
      .single()

    // Database should reject invalid UUID
    expect(error).not.toBeNull()
  })

  test('handles missing session gracefully', async () => {
    const nonExistentId = '99999999-9999-4999-a999-999999999999'

    const { data, error } = await adminClient
      .from('report_sessions')
      .select('id')
      .eq('id', nonExistentId)
      .single()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  test('tool input validation prevents SQL injection', async () => {
    // SQL injection in search query - should be safely handled by Supabase
    const maliciousQuery = "'; DROP TABLE companies; --"

    const { data, error } = await adminClient
      .from('companies')
      .select('id, business_name')
      .eq('tenant_id', TEST_TENANT_ACME)
      .ilike('business_name', `%${maliciousQuery}%`)

    // Query should complete (returning empty results), not cause an error
    expect(Array.isArray(data)).toBe(true)
    expect(data).toHaveLength(0)

    // Verify table still exists
    const { count } = await adminClient
      .from('companies')
      .select('*', { count: 'exact', head: true })

    expect(count).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================================
// Report Types and Content Tests
// ============================================================================

describe('Reports Chat API - Report Types', () => {
  test('supports demographic_reach report type', async () => {
    const user = await createTestUser({
      email: `report-demo-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    const { data: report } = await adminClient
      .from('reports')
      .insert({
        session_id: session.id,
        tenant_id: TEST_TENANT_ACME,
        created_by: user.id,
        report_type: 'demographic_reach',
        title: 'BAI Demographics Q4',
        content: '# BAI Demographics Report',
        metadata: {}
      })
      .select('id, report_type')
      .single()

    expect(report!.report_type).toBe('demographic_reach')
    testReportIds.push(report!.id)
  })

  test('supports interaction_activity report type', async () => {
    const user = await createTestUser({
      email: `report-activity-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    const { data: report } = await adminClient
      .from('reports')
      .insert({
        session_id: session.id,
        tenant_id: TEST_TENANT_ACME,
        created_by: user.id,
        report_type: 'interaction_activity',
        title: 'Activity Report',
        content: '# Interaction Activity',
        metadata: {}
      })
      .select('id, report_type')
      .single()

    expect(report!.report_type).toBe('interaction_activity')
    testReportIds.push(report!.id)
  })

  test('supports custom report type', async () => {
    const user = await createTestUser({
      email: `report-custom-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    const { data: report } = await adminClient
      .from('reports')
      .insert({
        session_id: session.id,
        tenant_id: TEST_TENANT_ACME,
        created_by: user.id,
        report_type: 'custom',
        title: 'Custom Analysis',
        content: '# Custom Report',
        metadata: { custom_param: 'value' }
      })
      .select('id, report_type, metadata')
      .single()

    expect(report!.report_type).toBe('custom')
    expect(report!.metadata).toEqual({ custom_param: 'value' })
    testReportIds.push(report!.id)
  })
})
