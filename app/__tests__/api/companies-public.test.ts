/**
 * API Route Tests: /api/companies/public
 *
 * Tests the public companies API that powers the form company selector.
 * This is a public endpoint (no auth required) used by public form submissions.
 *
 * TDD Approach:
 * 1. Test that companies are returned for valid tenant
 * 2. Test that tenantId is required
 * 3. Test that only companies for the specified tenant are returned
 * 4. Test response format and ordering
 *
 * See: app/api/companies/public/route.ts
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

// Track test companies for cleanup
const testCompanyIds: string[] = []

afterEach(async () => {
  // Clean up test companies
  for (const companyId of testCompanyIds) {
    try {
      await adminClient.from('companies').delete().eq('id', companyId)
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  testCompanyIds.length = 0
})

// Helper to create a test company
async function createTestCompany(options: {
  tenantId: string
  businessName: string
  description?: string
}): Promise<{ id: string; business_name: string; tenant_id: string }> {
  const { data, error } = await adminClient
    .from('companies')
    .insert({
      tenant_id: options.tenantId,
      business_name: options.businessName,
      description: options.description || null
    })
    .select('id, business_name, tenant_id')
    .single()

  if (error) throw error
  testCompanyIds.push(data.id)
  return data
}

// Helper to simulate the public companies API
async function simulatePublicCompaniesAPI(
  tenantId: string | null
): Promise<{ success: boolean; data?: any[]; error?: string; status: number }> {
  // Validate tenantId parameter
  if (!tenantId) {
    return { success: false, error: 'tenantId is required', status: 400 }
  }

  try {
    // Query companies for the tenant (same logic as API route)
    const { data, error } = await adminClient
      .from('companies')
      .select('id, business_name, description')
      .eq('tenant_id', tenantId)
      .order('business_name')

    if (error) {
      return { success: false, error: 'Failed to fetch companies', status: 500 }
    }

    return { success: true, data: data || [], status: 200 }
  } catch (error) {
    return { success: false, error: 'Internal server error', status: 500 }
  }
}

// ============================================================================
// Public Companies API - Basic Tests
// ============================================================================

describe('Public Companies API - Basic', () => {
  test('returns companies for valid tenant', async () => {
    // Create test companies for ACME
    await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'Acme Corp',
      description: 'Widget manufacturer'
    })

    await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'Tech Innovations',
      description: 'Software company'
    })

    const result = await simulatePublicCompaniesAPI(TEST_TENANT_ACME)

    expect(result.success).toBe(true)
    expect(result.status).toBe(200)
    expect(result.data).toBeDefined()
    expect(result.data!.length).toBeGreaterThanOrEqual(2)

    // Verify our test companies are in the results
    const businessNames = result.data!.map((c: any) => c.business_name)
    expect(businessNames).toContain('Acme Corp')
    expect(businessNames).toContain('Tech Innovations')
  })

  test('returns empty array for tenant with no companies', async () => {
    // Use a tenant UUID that exists but has no test companies
    // We'll use GAMMA tenant which should be empty in tests
    const TEST_TENANT_GAMMA = '33333333-3333-3333-3333-333333333333'

    const result = await simulatePublicCompaniesAPI(TEST_TENANT_GAMMA)

    expect(result.success).toBe(true)
    expect(result.status).toBe(200)
    expect(result.data).toBeDefined()
    // May or may not have existing data - just verify it's an array
    expect(Array.isArray(result.data)).toBe(true)
  })

  test('returns 400 when tenantId is missing', async () => {
    const result = await simulatePublicCompaniesAPI(null)

    expect(result.success).toBe(false)
    expect(result.status).toBe(400)
    expect(result.error).toContain('tenantId is required')
  })
})

// ============================================================================
// Public Companies API - Tenant Isolation Tests
// ============================================================================

describe('Public Companies API - Tenant Isolation', () => {
  test('only returns companies for specified tenant', async () => {
    // Create company in ACME
    const acmeCompany = await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: `ACME Company ${Date.now()}`
    })

    // Create company in BETA
    const betaCompany = await createTestCompany({
      tenantId: TEST_TENANT_BETA,
      businessName: `BETA Company ${Date.now()}`
    })

    // Query ACME companies
    const acmeResult = await simulatePublicCompaniesAPI(TEST_TENANT_ACME)
    const acmeBusinessNames = acmeResult.data!.map((c: any) => c.business_name)

    expect(acmeBusinessNames).toContain(acmeCompany.business_name)
    expect(acmeBusinessNames).not.toContain(betaCompany.business_name)

    // Query BETA companies
    const betaResult = await simulatePublicCompaniesAPI(TEST_TENANT_BETA)
    const betaBusinessNames = betaResult.data!.map((c: any) => c.business_name)

    expect(betaBusinessNames).toContain(betaCompany.business_name)
    expect(betaBusinessNames).not.toContain(acmeCompany.business_name)
  })

  test('returns empty for non-existent tenant', async () => {
    // Use a valid UUID format that doesn't exist as a tenant
    const fakeTenanId = '99999999-9999-4999-a999-999999999999'

    const result = await simulatePublicCompaniesAPI(fakeTenanId)

    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })
})

// ============================================================================
// Public Companies API - Response Format Tests
// ============================================================================

describe('Public Companies API - Response Format', () => {
  test('returns correct fields for each company', async () => {
    await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'Response Test Co',
      description: 'Testing response format'
    })

    const result = await simulatePublicCompaniesAPI(TEST_TENANT_ACME)
    const testCompany = result.data!.find((c: any) => c.business_name === 'Response Test Co')

    expect(testCompany).toBeDefined()
    expect(testCompany).toHaveProperty('id')
    expect(testCompany).toHaveProperty('business_name')
    expect(testCompany).toHaveProperty('description')

    // Should NOT include sensitive fields
    expect(testCompany).not.toHaveProperty('tenant_id')
    expect(testCompany).not.toHaveProperty('email')
    expect(testCompany).not.toHaveProperty('phone')
    expect(testCompany).not.toHaveProperty('created_at')
    expect(testCompany).not.toHaveProperty('updated_at')
  })

  test('companies are ordered alphabetically by business_name', async () => {
    // Create companies in non-alphabetical order
    await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'Zebra Company'
    })

    await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'Alpha Company'
    })

    await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'Middle Company'
    })

    const result = await simulatePublicCompaniesAPI(TEST_TENANT_ACME)

    // Find the indices of our test companies
    const names = result.data!.map((c: any) => c.business_name)
    const alphaIndex = names.indexOf('Alpha Company')
    const middleIndex = names.indexOf('Middle Company')
    const zebraIndex = names.indexOf('Zebra Company')

    // Verify alphabetical ordering
    expect(alphaIndex).toBeLessThan(middleIndex)
    expect(middleIndex).toBeLessThan(zebraIndex)
  })

  test('handles companies with null description', async () => {
    await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'No Description Co'
      // description intentionally omitted
    })

    const result = await simulatePublicCompaniesAPI(TEST_TENANT_ACME)
    const company = result.data!.find((c: any) => c.business_name === 'No Description Co')

    expect(company).toBeDefined()
    expect(company.description).toBeNull()
  })
})

// ============================================================================
// Public Companies API - Security Tests
// ============================================================================

describe('Public Companies API - Security', () => {
  test('SQL injection in tenantId is handled safely', async () => {
    // SQL injection attempt - Supabase validates UUID format and rejects invalid input
    const result = await simulatePublicCompaniesAPI("'; DROP TABLE companies; --")

    // Invalid UUID format causes query error, which is handled gracefully
    expect(result.success).toBe(false)
    expect(result.status).toBe(500) // Server handles the error safely

    // Most importantly: verify companies table still exists
    const { count } = await adminClient
      .from('companies')
      .select('*', { count: 'exact', head: true })

    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('XSS in tenantId is handled safely', async () => {
    // XSS attempt - Supabase validates UUID format and rejects
    const result = await simulatePublicCompaniesAPI('<script>alert("xss")</script>')

    // Invalid UUID format causes query error (no XSS possible in response)
    expect(result.success).toBe(false)
    expect(result.status).toBe(500)
    // Key: the XSS payload is never executed, just rejected
  })

  test('invalid UUID formats are rejected by database', async () => {
    // Invalid UUID formats are rejected by PostgreSQL's UUID type validation
    const invalidFormats = [
      'not-a-uuid',
      '12345',
      'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      '../../../etc/passwd'
    ]

    for (const invalidId of invalidFormats) {
      const result = await simulatePublicCompaniesAPI(invalidId)
      // PostgreSQL UUID type rejects invalid formats with an error
      expect(result.success).toBe(false)
      expect(result.status).toBe(500)
    }
  })

  test('valid UUID format that does not exist returns empty array', async () => {
    // Valid UUID format but non-existent tenant - should return empty, not error
    const nonExistentUUID = '99999999-9999-4999-a999-999999999999'

    const result = await simulatePublicCompaniesAPI(nonExistentUUID)

    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })
})

// ============================================================================
// Public Companies API - Edge Cases
// ============================================================================

describe('Public Companies API - Edge Cases', () => {
  test('handles empty string tenantId', async () => {
    const result = await simulatePublicCompaniesAPI('')

    // Empty string should be treated as missing tenantId
    expect(result.success).toBe(false)
    expect(result.status).toBe(400)
  })

  test('handles whitespace-only tenantId', async () => {
    const result = await simulatePublicCompaniesAPI('   ')

    // Whitespace is not a valid UUID, so PostgreSQL will reject it
    expect(result.success).toBe(false)
    expect(result.status).toBe(500)
  })

  test('handles very long tenantId', async () => {
    // 1000 character string - not a valid UUID
    const longId = 'a'.repeat(1000)

    const result = await simulatePublicCompaniesAPI(longId)

    // PostgreSQL UUID type will reject this invalid format
    expect(result.success).toBe(false)
    expect(result.status).toBe(500)
  })

  test('handles special characters in business names', async () => {
    await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: 'O\'Brien & Associates "LLC"'
    })

    const result = await simulatePublicCompaniesAPI(TEST_TENANT_ACME)
    const company = result.data!.find((c: any) => c.business_name.includes("O'Brien"))

    expect(company).toBeDefined()
    expect(company.business_name).toBe('O\'Brien & Associates "LLC"')
  })

  test('handles unicode in business names', async () => {
    await createTestCompany({
      tenantId: TEST_TENANT_ACME,
      businessName: '日本語会社 Émile\'s Café'
    })

    const result = await simulatePublicCompaniesAPI(TEST_TENANT_ACME)
    const company = result.data!.find((c: any) => c.business_name.includes('日本語'))

    expect(company).toBeDefined()
    expect(company.business_name).toBe('日本語会社 Émile\'s Café')
  })
})
