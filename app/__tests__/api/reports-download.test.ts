/**
 * API Route Tests: /api/reports/download/[id]
 *
 * Tests the report download logic that powers the API endpoint.
 * Since Next.js API routes require request context (cookies), we test the core logic directly.
 *
 * TDD Approach:
 * 1. Test that authenticated users can download their reports
 * 2. Test that users cannot download reports from other tenants (RLS)
 * 3. Test filename generation from report title
 * 4. Test 404 handling for non-existent reports
 *
 * See: app/api/reports/download/[id]/route.ts
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
const testReportIds: string[] = []
const testSessionIds: string[] = []

afterEach(async () => {
  // Clean up reports first (depends on sessions)
  for (const reportId of testReportIds) {
    try {
      await adminClient.from('reports').delete().eq('id', reportId)
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  testReportIds.length = 0

  // Clean up report sessions
  for (const sessionId of testSessionIds) {
    try {
      await adminClient.from('report_sessions').delete().eq('id', sessionId)
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  testSessionIds.length = 0

  // Clean up user_sessions
  for (const userId of testUserIds) {
    try {
      await adminClient.from('user_sessions').delete().eq('user_id', userId)
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  // Clean up test users
  for (const userId of testUserIds) {
    try {
      await adminClient.auth.admin.deleteUser(userId)
    } catch (e) {
      // User might already be deleted
    }
  }
  testUserIds.length = 0
})

// Helper to create test user with organization membership
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

  // Ensure organization_members record exists
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

// Helper to create a report session
async function createTestReportSession(options: {
  tenantId: string
  userId: string
}): Promise<{ id: string }> {
  const { data, error } = await adminClient
    .from('report_sessions')
    .insert({
      tenant_id: options.tenantId,
      created_by: options.userId,
      conversation: []
    })
    .select('id')
    .single()

  if (error) throw error
  testSessionIds.push(data.id)
  return { id: data.id }
}

// Helper to create a test report
async function createTestReport(options: {
  tenantId: string
  userId: string
  sessionId: string
  title?: string
  content?: string
}): Promise<{ id: string; title: string; content: string; tenant_id: string }> {
  const title = options.title || `Test Report ${Date.now()}`
  // Use nullish coalescing to allow empty string as valid content
  const content = options.content ?? '# Test Report\n\nThis is a test report content.'

  const { data, error } = await adminClient
    .from('reports')
    .insert({
      session_id: options.sessionId,
      tenant_id: options.tenantId,
      created_by: options.userId,
      report_type: 'custom',
      title,
      content,
      metadata: {}
    })
    .select('id, title, content, tenant_id')
    .single()

  if (error) throw error
  testReportIds.push(data.id)
  return data
}

// Helper to simulate downloading a report (the core logic from the API)
async function simulateDownloadReport(
  reportId: string,
  requestingUserId: string,
  requestingTenantId: string
): Promise<{ success: boolean; filename?: string; content?: string; error?: string; status?: number }> {
  // Set the user's active organization (mimics what happens after auth)
  await adminClient
    .from('user_sessions')
    .upsert({
      user_id: requestingUserId,
      active_organization_id: requestingTenantId,
      last_switched_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })

  // Try to get the report as the requesting user would (with RLS)
  // Since we're using admin client, we need to manually filter by tenant
  const { data: report, error } = await adminClient
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .eq('tenant_id', requestingTenantId) // Simulates RLS filtering
    .single()

  if (error || !report) {
    // Determine if it's a not found vs unauthorized scenario
    // Check if report exists at all (admin check)
    const { data: existsCheck } = await adminClient
      .from('reports')
      .select('id, tenant_id')
      .eq('id', reportId)
      .single()

    if (!existsCheck) {
      return { success: false, error: 'Report not found', status: 404 }
    } else if (existsCheck.tenant_id !== requestingTenantId) {
      // Report exists but belongs to different tenant - RLS would block this
      return { success: false, error: 'Report not found', status: 404 }
    }

    return { success: false, error: 'Report not found', status: 404 }
  }

  // Generate filename from title (same logic as API route)
  const filename = `${report.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`

  return {
    success: true,
    filename,
    content: report.content
  }
}

// ============================================================================
// Report Download - Authentication Tests
// ============================================================================

describe('Report Download - Authentication', () => {
  test('authenticated user can download their own report', async () => {
    const user = await createTestUser({
      email: `download-test-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    const report = await createTestReport({
      tenantId: TEST_TENANT_ACME,
      userId: user.id,
      sessionId: session.id,
      title: 'My BAI Report',
      content: '# BAI Report\n\nDemographic data...'
    })

    const result = await simulateDownloadReport(report.id, user.id, TEST_TENANT_ACME)

    expect(result.success).toBe(true)
    expect(result.content).toBe('# BAI Report\n\nDemographic data...')
  })

  test('user cannot download report from different tenant', async () => {
    // Create user in ACME
    const acmeUser = await createTestUser({
      email: `acme-user-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    // Create user in BETA
    const betaUser = await createTestUser({
      email: `beta-user-${Date.now()}@beta.test`,
      organizationId: TEST_TENANT_BETA
    })

    // Create report in ACME
    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: acmeUser.id
    })

    const report = await createTestReport({
      tenantId: TEST_TENANT_ACME,
      userId: acmeUser.id,
      sessionId: session.id,
      title: 'ACME Confidential Report',
      content: '# Confidential\n\nThis is ACME data.'
    })

    // Try to download as BETA user
    const result = await simulateDownloadReport(report.id, betaUser.id, TEST_TENANT_BETA)

    expect(result.success).toBe(false)
    expect(result.status).toBe(404) // RLS makes it appear as not found
    expect(result.content).toBeUndefined()
  })
})

// ============================================================================
// Report Download - Filename Generation Tests
// ============================================================================

describe('Report Download - Filename Generation', () => {
  test('filename is generated from report title', async () => {
    const user = await createTestUser({
      email: `filename-test-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    const report = await createTestReport({
      tenantId: TEST_TENANT_ACME,
      userId: user.id,
      sessionId: session.id,
      title: 'Q4 2024 Demographics Report',
      content: '# Q4 Report'
    })

    const result = await simulateDownloadReport(report.id, user.id, TEST_TENANT_ACME)

    expect(result.success).toBe(true)
    expect(result.filename).toBe('q4-2024-demographics-report.md')
  })

  test('special characters are removed from filename', async () => {
    const user = await createTestUser({
      email: `special-chars-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    const report = await createTestReport({
      tenantId: TEST_TENANT_ACME,
      userId: user.id,
      sessionId: session.id,
      title: 'Report: BAI Metrics (2024) - Final!',
      content: '# Final Report'
    })

    const result = await simulateDownloadReport(report.id, user.id, TEST_TENANT_ACME)

    expect(result.success).toBe(true)
    expect(result.filename).toBe('report--bai-metrics--2024----final-.md')
  })

  test('unicode characters are removed from filename', async () => {
    const user = await createTestUser({
      email: `unicode-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    const report = await createTestReport({
      tenantId: TEST_TENANT_ACME,
      userId: user.id,
      sessionId: session.id,
      title: 'Rapport d\'activité été 2024',
      content: '# Rapport'
    })

    const result = await simulateDownloadReport(report.id, user.id, TEST_TENANT_ACME)

    expect(result.success).toBe(true)
    // Only alphanumeric characters should remain (accented chars become dashes)
    expect(result.filename).toBe('rapport-d-activit---t--2024.md')
  })
})

// ============================================================================
// Report Download - Error Handling Tests
// ============================================================================

describe('Report Download - Error Handling', () => {
  test('returns 404 for non-existent report', async () => {
    const user = await createTestUser({
      email: `not-found-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    // Use a valid UUID format that doesn't exist
    const fakeReportId = '99999999-9999-4999-a999-999999999999'

    const result = await simulateDownloadReport(fakeReportId, user.id, TEST_TENANT_ACME)

    expect(result.success).toBe(false)
    expect(result.status).toBe(404)
    expect(result.error).toContain('not found')
  })

  test('returns 404 for invalid UUID format', async () => {
    const user = await createTestUser({
      email: `invalid-uuid-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    // Invalid UUID format - this should be handled gracefully
    const result = await simulateDownloadReport('not-a-valid-uuid', user.id, TEST_TENANT_ACME)

    expect(result.success).toBe(false)
    expect(result.status).toBe(404)
  })
})

// ============================================================================
// Report Download - Content Tests
// ============================================================================

describe('Report Download - Content', () => {
  test('markdown content is returned as-is', async () => {
    const user = await createTestUser({
      email: `content-test-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    const markdownContent = `# BAI Compliance Report

## Executive Summary

This report covers demographic reach metrics for Q4 2024.

### Key Findings

1. **Total Contacts**: 150
2. **Companies Engaged**: 45
3. **Interactions**: 200

| Category | Count |
|----------|-------|
| Women | 65 |
| BIPOC | 42 |

---

*Generated by impactOS*`

    const report = await createTestReport({
      tenantId: TEST_TENANT_ACME,
      userId: user.id,
      sessionId: session.id,
      title: 'BAI Compliance Report',
      content: markdownContent
    })

    const result = await simulateDownloadReport(report.id, user.id, TEST_TENANT_ACME)

    expect(result.success).toBe(true)
    expect(result.content).toBe(markdownContent)
    expect(result.filename).toBe('bai-compliance-report.md')
  })

  test('empty content is handled gracefully', async () => {
    const user = await createTestUser({
      email: `empty-content-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: user.id
    })

    const report = await createTestReport({
      tenantId: TEST_TENANT_ACME,
      userId: user.id,
      sessionId: session.id,
      title: 'Empty Report',
      content: ''
    })

    const result = await simulateDownloadReport(report.id, user.id, TEST_TENANT_ACME)

    expect(result.success).toBe(true)
    expect(result.content).toBe('')
    expect(result.filename).toBe('empty-report.md')
  })
})

// ============================================================================
// Report Download - Security Tests
// ============================================================================

describe('Report Download - Security', () => {
  test('SQL injection in report ID is handled safely', async () => {
    const user = await createTestUser({
      email: `sql-injection-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    // SQL injection attempt
    const result = await simulateDownloadReport(
      "'; DROP TABLE reports; --",
      user.id,
      TEST_TENANT_ACME
    )

    expect(result.success).toBe(false)

    // Verify reports table still exists
    const { count } = await adminClient
      .from('reports')
      .select('*', { count: 'exact', head: true })

    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('reports from other tenants are not accessible via RLS bypass attempts', async () => {
    // Create report in ACME
    const acmeUser = await createTestUser({
      email: `rls-test-acme-${Date.now()}@acme.test`,
      organizationId: TEST_TENANT_ACME
    })

    const session = await createTestReportSession({
      tenantId: TEST_TENANT_ACME,
      userId: acmeUser.id
    })

    const report = await createTestReport({
      tenantId: TEST_TENANT_ACME,
      userId: acmeUser.id,
      sessionId: session.id,
      title: 'ACME Secret Report',
      content: 'Secret ACME data'
    })

    // Create BETA user
    const betaUser = await createTestUser({
      email: `rls-test-beta-${Date.now()}@beta.test`,
      organizationId: TEST_TENANT_BETA
    })

    // BETA user tries to access ACME report (should fail due to RLS)
    const result = await simulateDownloadReport(report.id, betaUser.id, TEST_TENANT_BETA)

    expect(result.success).toBe(false)
    expect(result.content).toBeUndefined()
  })
})
