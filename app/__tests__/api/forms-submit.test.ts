/**
 * API Route Tests: /api/forms/submit
 *
 * Tests the form submission logic that powers the public API endpoint.
 * Since Next.js API routes require request context, we test the core logic directly.
 *
 * TDD Approach:
 * 1. Test validation schema (what requests are accepted/rejected)
 * 2. Test database operations (what happens when submissions are created)
 * 3. Test security (tenant isolation, input sanitization)
 *
 * See: app/api/forms/submit/route.ts
 * See: Issue #73 for full test case requirements
 */

import { createClient } from '@supabase/supabase-js'
import { submitFormSchema } from '@/lib/schemas/form'

// ============================================================================
// Test Setup
// ============================================================================

const TEST_TENANT_ACME = '11111111-1111-1111-1111-111111111111'

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
const testFormIds: string[] = []
const testSubmissionIds: string[] = []
const testCompanyIds: string[] = []

// Placeholder company ID for anonymous-like submissions
let testCompanyId: string

// Create a test company before all tests
beforeAll(async () => {
  const { data, error } = await adminClient
    .from('companies')
    .insert({
      tenant_id: TEST_TENANT_ACME,
      business_name: `API Test Company ${Date.now()}`
    })
    .select('id')
    .single()

  if (error) throw error
  testCompanyId = data.id
  testCompanyIds.push(data.id)
})

afterAll(async () => {
  // Clean up companies after all tests
  if (testCompanyIds.length > 0) {
    await adminClient
      .from('companies')
      .delete()
      .in('id', testCompanyIds)
  }
})

afterEach(async () => {
  // Clean up submissions first (FK constraint)
  if (testSubmissionIds.length > 0) {
    await adminClient
      .from('form_submissions')
      .delete()
      .in('id', testSubmissionIds)
    testSubmissionIds.length = 0
  }

  // Clean up forms
  if (testFormIds.length > 0) {
    await adminClient
      .from('forms')
      .delete()
      .in('id', testFormIds)
    testFormIds.length = 0
  }
})

// Helper to create test form
async function createTestForm(options: {
  isPublished?: boolean
  title?: string
}) {
  const { data, error } = await adminClient
    .from('forms')
    .insert({
      tenant_id: TEST_TENANT_ACME,
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
      created_by: null
    })
    .select('id, tenant_id, title, form_data, version')
    .single()

  if (error) throw error
  testFormIds.push(data.id)
  return data
}

// Helper to simulate form submission (mirrors route.ts logic)
async function simulateFormSubmission(payload: {
  formId: string
  companyId: string  // Required by current schema
  submissionData: Record<string, any>
}) {
  // Step 1: Validate input (matches route.ts lines 17-24)
  const validation = submitFormSchema.safeParse(payload)
  if (!validation.success) {
    return {
      status: 400,
      body: { success: false, error: 'Invalid submission data', details: validation.error }
    }
  }

  const { formId, companyId, submissionData } = validation.data

  // Step 2: Get form (must be published) - mirrors route.ts lines 43-55
  const { data: form, error: formError } = await adminClient
    .from('forms')
    .select('*')
    .eq('id', formId)
    .eq('is_published', true)
    .single()

  if (formError || !form) {
    return {
      status: 404,
      body: { success: false, error: 'Form not found or not published' }
    }
  }

  // Step 3: Create snapshot - mirrors route.ts lines 58-68
  const snapshot = {
    title: form.title,
    version: form.version,
    questions: form.form_data.sections.flatMap((s: any) =>
      s.questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        type: q.type
      }))
    )
  }

  // Step 4: Create submission - mirrors route.ts lines 71-84
  const { data: submission, error: submissionError } = await adminClient
    .from('form_submissions')
    .insert({
      form_id: formId,
      tenant_id: form.tenant_id,
      company_id: companyId,
      form_snapshot: snapshot,
      submission_data: submissionData,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: null
    })
    .select()
    .single()

  if (submissionError) {
    return {
      status: 500,
      body: { success: false, error: 'Failed to submit form' }
    }
  }

  testSubmissionIds.push(submission.id)
  return {
    status: 200,
    body: { success: true, data: { submissionId: submission.id } }
  }
}

// ============================================================================
// Validation Schema Tests
// ============================================================================

describe('Form Submission Schema Validation', () => {
  // Valid UUIDs must follow RFC 4122 format:
  // - Version (3rd section) must start with 1-8
  // - Variant (4th section) must start with 8, 9, a, or b
  const VALID_UUID_1 = '12345678-1234-4234-a234-123456789012'
  const VALID_UUID_2 = '12345678-1234-4234-a234-123456789013'

  test('valid payload passes validation', () => {
    const payload = {
      formId: VALID_UUID_1,
      companyId: VALID_UUID_2,
      submissionData: { question1: 'answer1' }
    }

    const result = submitFormSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  test('companyId is required (UUID format)', () => {
    // Note: Current schema requires companyId. For anonymous submissions,
    // a placeholder UUID or schema update may be needed.
    const payload = {
      formId: VALID_UUID_1,
      companyId: null,
      submissionData: {}
    }

    const result = submitFormSchema.safeParse(payload)
    // Current behavior: null fails validation (companyId required)
    expect(result.success).toBe(false)
  })

  test('valid companyId UUID passes validation', () => {
    const payload = {
      formId: VALID_UUID_1,
      companyId: VALID_UUID_2,
      submissionData: {}
    }

    const result = submitFormSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  test('missing formId fails validation', () => {
    const payload = {
      companyId: VALID_UUID_2,
      submissionData: {}
    }

    const result = submitFormSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  test('invalid UUID format for formId fails validation', () => {
    const payload = {
      formId: 'not-a-uuid',
      companyId: VALID_UUID_2,
      submissionData: {}
    }

    const result = submitFormSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  test('missing submissionData fails validation', () => {
    const payload = {
      formId: VALID_UUID_1,
      companyId: VALID_UUID_2
    }

    const result = submitFormSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  test('SQL injection in formId is rejected by UUID validation', () => {
    const payload = {
      formId: "'; DROP TABLE forms; --",
      companyId: VALID_UUID_2,
      submissionData: {}
    }

    const result = submitFormSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Form Submission Logic Tests
// ============================================================================

describe('Form Submission Logic', () => {
  describe('Happy Path', () => {
    test('valid submission creates record with correct data', async () => {
      const form = await createTestForm({ isPublished: true, title: 'Test Published Form' })

      const result = await simulateFormSubmission({
        formId: form.id,
        companyId: testCompanyId,
        submissionData: { '00000000-0000-0000-0000-000000000002': 'Test answer' }
      })

      expect(result.status).toBe(200)
      expect(result.body.success).toBe(true)
      expect(result.body.data?.submissionId).toBeDefined()

      // Verify submission in database
      const { data: submission } = await adminClient
        .from('form_submissions')
        .select('*')
        .eq('id', result.body.data.submissionId)
        .single()

      expect(submission.form_id).toBe(form.id)
      expect(submission.tenant_id).toBe(TEST_TENANT_ACME)
      expect(submission.status).toBe('submitted')
    })

    test('submission creates correct form snapshot', async () => {
      const form = await createTestForm({
        isPublished: true,
        title: 'Snapshot Test Form'
      })

      const result = await simulateFormSubmission({
        formId: form.id,
        companyId: testCompanyId,
        submissionData: {}
      })

      expect(result.status).toBe(200)

      // Verify snapshot structure
      const { data: submission } = await adminClient
        .from('form_submissions')
        .select('form_snapshot')
        .eq('id', result.body.data.submissionId)
        .single()

      expect(submission.form_snapshot.title).toBe('Snapshot Test Form')
      expect(submission.form_snapshot.version).toBe(1)
      expect(submission.form_snapshot.questions).toHaveLength(1)
      expect(submission.form_snapshot.questions[0].id).toBe('00000000-0000-0000-0000-000000000002')
    })
  })

  describe('Form Lookup', () => {
    test('non-existent formId returns 404', async () => {
      // Use a valid UUID format but one that doesn't exist
      const result = await simulateFormSubmission({
        formId: '99999999-9999-4999-a999-999999999999',
        companyId: testCompanyId,
        submissionData: {}
      })

      expect(result.status).toBe(404)
      expect(result.body.success).toBe(false)
      expect(result.body.error).toContain('not found')
    })

    test('unpublished form returns 404', async () => {
      const form = await createTestForm({ isPublished: false })

      const result = await simulateFormSubmission({
        formId: form.id,
        companyId: testCompanyId,
        submissionData: {}
      })

      expect(result.status).toBe(404)
      expect(result.body.success).toBe(false)
    })
  })

  describe('Security', () => {
    test('submission inherits tenant_id from form', async () => {
      const form = await createTestForm({ isPublished: true })

      const result = await simulateFormSubmission({
        formId: form.id,
        companyId: testCompanyId,
        submissionData: { test: 'value' }
      })

      expect(result.status).toBe(200)

      const { data: submission } = await adminClient
        .from('form_submissions')
        .select('tenant_id')
        .eq('id', result.body.data.submissionId)
        .single()

      expect(submission.tenant_id).toBe(TEST_TENANT_ACME)
    })

    test('SQL injection in submissionData is stored safely', async () => {
      const form = await createTestForm({ isPublished: true })

      const maliciousData = {
        'question': "'; DROP TABLE users; --"
      }

      const result = await simulateFormSubmission({
        formId: form.id,
        companyId: testCompanyId,
        submissionData: maliciousData
      })

      expect(result.status).toBe(200)

      // Verify data was stored as-is (not executed)
      const { data: submission } = await adminClient
        .from('form_submissions')
        .select('submission_data')
        .eq('id', result.body.data.submissionId)
        .single()

      expect(submission.submission_data.question).toBe("'; DROP TABLE users; --")

      // Verify users table still exists
      const { count } = await adminClient
        .from('users')
        .select('*', { count: 'exact', head: true })

      expect(count).toBeGreaterThan(0)
    })

    test('XSS attempt in submissionData is stored as-is', async () => {
      const form = await createTestForm({ isPublished: true })

      const xssPayload = {
        'question': '<script>alert("xss")</script>'
      }

      const result = await simulateFormSubmission({
        formId: form.id,
        companyId: testCompanyId,
        submissionData: xssPayload
      })

      expect(result.status).toBe(200)

      const { data: submission } = await adminClient
        .from('form_submissions')
        .select('submission_data')
        .eq('id', result.body.data.submissionId)
        .single()

      // Data stored as-is (frontend handles sanitization on display)
      expect(submission.submission_data.question).toBe('<script>alert("xss")</script>')
    })
  })

  describe('Edge Cases', () => {
    test('empty submissionData is accepted', async () => {
      const form = await createTestForm({ isPublished: true })

      const result = await simulateFormSubmission({
        formId: form.id,
        companyId: testCompanyId,
        submissionData: {}
      })

      expect(result.status).toBe(200)
    })

    test('submission with valid companyId links to company', async () => {
      const form = await createTestForm({ isPublished: true })

      const result = await simulateFormSubmission({
        formId: form.id,
        companyId: testCompanyId,
        submissionData: { test: 'company-linked' }
      })

      expect(result.status).toBe(200)

      const { data: submission } = await adminClient
        .from('form_submissions')
        .select('company_id, submitted_by')
        .eq('id', result.body.data.submissionId)
        .single()

      expect(submission.company_id).toBe(testCompanyId)
      expect(submission.submitted_by).toBeNull() // No auth, so null
    })

    test('large payload is handled correctly', async () => {
      const form = await createTestForm({ isPublished: true })

      // Generate large but reasonable submission (100KB)
      const largeData: Record<string, string> = {}
      for (let i = 0; i < 100; i++) {
        largeData[`question-${i}`] = 'A'.repeat(1000)
      }

      const result = await simulateFormSubmission({
        formId: form.id,
        companyId: testCompanyId,
        submissionData: largeData
      })

      expect(result.status).toBe(200)
    })
  })
})

// ============================================================================
// RLS Verification
// ============================================================================

describe('Form Submissions - RLS Verification', () => {
  test('submissions are created with correct tenant_id', async () => {
    const form = await createTestForm({ isPublished: true })

    const result = await simulateFormSubmission({
      formId: form.id,
      companyId: testCompanyId,
      submissionData: { test: 'value' }
    })

    expect(result.status).toBe(200)

    const { data: submission } = await adminClient
      .from('form_submissions')
      .select('tenant_id')
      .eq('id', result.body.data.submissionId)
      .single()

    // Tenant ID should match the form's tenant
    expect(submission.tenant_id).toBe(TEST_TENANT_ACME)
  })

  test('users from different tenants cannot see submissions', async () => {
    const form = await createTestForm({ isPublished: true })
    const testEmail = `rls-test-${Date.now()}@tenant2.test`

    const result = await simulateFormSubmission({
      formId: form.id,
      companyId: testCompanyId,
      submissionData: { test: 'secret' }
    })

    expect(result.status).toBe(200)

    // Create user in different tenant
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: '22222222-2222-2222-2222-222222222222'
      }
    })

    try {
      // Sign in as the other tenant user
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      await userClient.auth.signInWithPassword({
        email: testEmail,
        password: 'test-password-123'
      })

      // Try to query the submission
      const { data: submissions } = await userClient
        .from('form_submissions')
        .select('*')
        .eq('id', result.body.data.submissionId)

      // RLS should block access
      expect(submissions).toEqual([])
    } finally {
      // Cleanup test user
      if (authData.user) {
        await adminClient.auth.admin.deleteUser(authData.user.id)
      }
    }
  })
})
