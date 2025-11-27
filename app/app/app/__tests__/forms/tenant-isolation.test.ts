/**
 * Forms Tenant Isolation Tests (CRITICAL SECURITY)
 *
 * These tests verify that tenants cannot access each other's data.
 * This is a SECURITY REQUIREMENT - all tests must pass at 100%.
 *
 * Tests follow TDD principles:
 * 1. Write test first (RED)
 * 2. Implement RLS policies (GREEN)
 * 3. Refactor if needed
 *
 * Coverage:
 * - Forms: Tenant A cannot see/modify Tenant B forms
 * - Submissions: Tenant A cannot see/modify Tenant B submissions
 * - Reminders: Tenant A cannot see/modify Tenant B reminders
 */

import { createClient } from '@supabase/supabase-js'
import {
  TENANT_A_ID,
  TENANT_B_ID,
  createAdminClient,
  createTestUser,
  signInTestUser,
  deleteTestUser,
  createAuthenticatedClient,
  ensureTestCompaniesExist,
  ensureTestContactsExist,
  waitForTrigger
} from '../test-utils'

describe('Forms Tenant Isolation (CRITICAL SECURITY)', () => {
  let supabaseAdmin: ReturnType<typeof createClient>
  let tenantAUserId: string
  let tenantAEmail: string
  let tenantBUserId: string
  let tenantBEmail: string
  let tenantAFormId: string
  let tenantBFormId: string

  beforeAll(async () => {
    supabaseAdmin = createAdminClient()

    // Ensure test data exists for companies and contacts
    await ensureTestCompaniesExist()
    await ensureTestContactsExist()
  })

  beforeEach(async () => {
    // Create test users for both tenants
    const tenantAUser = await createTestUser(TENANT_A_ID, 'tenant-a')
    const tenantBUser = await createTestUser(TENANT_B_ID, 'tenant-b')

    tenantAUserId = tenantAUser.userId
    tenantAEmail = tenantAUser.email
    tenantBUserId = tenantBUser.userId
    tenantBEmail = tenantBUser.email

    // Create test forms for both tenants (using admin client to bypass RLS)
    const { data: tenantAForm } = await supabaseAdmin
      .from('forms')
      .insert({
        tenant_id: TENANT_A_ID,
        title: 'Tenant A Form',
        form_data: { sections: [] },
        created_by: tenantAUserId
      })
      .select()
      .single()

    const { data: tenantBForm } = await supabaseAdmin
      .from('forms')
      .insert({
        tenant_id: TENANT_B_ID,
        title: 'Tenant B Form',
        form_data: { sections: [] },
        created_by: tenantBUserId
      })
      .select()
      .single()

    tenantAFormId = tenantAForm!.id
    tenantBFormId = tenantBForm!.id
  })

  afterEach(async () => {
    // Clean up test users (cascades to forms via FK)
    if (tenantAUserId) {
      await supabaseAdmin.auth.admin.deleteUser(tenantAUserId)
    }
    if (tenantBUserId) {
      await supabaseAdmin.auth.admin.deleteUser(tenantBUserId)
    }
  })

  describe('Forms table isolation', () => {
    test('Tenant A cannot read Tenant B forms', async () => {
      // Sign in as Tenant A
      const { accessToken } = await signInTestUser(tenantAEmail)
      const tenantAClient = createAuthenticatedClient(accessToken)

      // Try to read Tenant B's form
      const { data, error } = await tenantAClient
        .from('forms')
        .select('*')
        .eq('id', tenantBFormId)
        .single()

      // Should not return data (RLS blocks it)
      expect(data).toBeNull()
      expect(error).not.toBeNull()
    })

    test('Tenant A cannot update Tenant B forms', async () => {
      // Sign in as Tenant A
      const { accessToken } = await signInTestUser(tenantAEmail)
      const tenantAClient = createAuthenticatedClient(accessToken)

      // Try to update Tenant B's form
      const { error } = await tenantAClient
        .from('forms')
        .update({ title: 'Hacked Title' })
        .eq('id', tenantBFormId)

      // Should be blocked by RLS (error will be null, but no rows affected)
      // Verify the form was NOT actually updated
      const { data: unchangedForm } = await supabaseAdmin
        .from('forms')
        .select('title')
        .eq('id', tenantBFormId)
        .single()

      expect(unchangedForm?.title).toBe('Tenant B Form')
      expect(unchangedForm?.title).not.toBe('Hacked Title')
    })

    test('Tenant A cannot delete Tenant B forms', async () => {
      // Sign in as Tenant A
      const { accessToken } = await signInTestUser(tenantAEmail)
      const tenantAClient = createAuthenticatedClient(accessToken)

      // Try to delete Tenant B's form
      const { error } = await tenantAClient
        .from('forms')
        .delete()
        .eq('id', tenantBFormId)

      // Should be blocked by RLS (error will be null, but no rows affected)
      // Verify the form was NOT actually deleted
      const { data: stillExists } = await supabaseAdmin
        .from('forms')
        .select('id')
        .eq('id', tenantBFormId)
        .single()

      expect(stillExists).not.toBeNull()
      expect(stillExists?.id).toBe(tenantBFormId)
    })

    test('Tenant A can read their own forms', async () => {
      // Sign in as Tenant A
      const { accessToken } = await signInTestUser(tenantAEmail)
      const tenantAClient = createAuthenticatedClient(accessToken)

      // Read Tenant A's own form
      const { data, error } = await tenantAClient
        .from('forms')
        .select('*')
        .eq('id', tenantAFormId)
        .single()

      // Should succeed
      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data.id).toBe(tenantAFormId)
      expect(data.tenant_id).toBe(TENANT_A_ID)
    })
  })

  describe('Form submissions table isolation', () => {
    let tenantASubmissionId: string
    let tenantBSubmissionId: string
    let companyAId: string
    let companyBId: string

    beforeEach(async () => {
      // Create test companies (using admin client)
      const { data: companyA } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('tenant_id', TENANT_A_ID)
        .limit(1)
        .single()

      const { data: companyB } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('tenant_id', TENANT_B_ID)
        .limit(1)
        .single()

      companyAId = companyA!.id
      companyBId = companyB!.id

      // Create test submissions
      const { data: submissionA } = await supabaseAdmin
        .from('form_submissions')
        .insert({
          form_id: tenantAFormId,
          tenant_id: TENANT_A_ID,
          company_id: companyAId,
          form_snapshot: {
            title: 'Test Form',
            version: 1,
            questions: []
          },
          submission_data: { test: 'data' },
          status: 'draft',
          submitted_by: tenantAUserId
        })
        .select()
        .single()

      const { data: submissionB } = await supabaseAdmin
        .from('form_submissions')
        .insert({
          form_id: tenantBFormId,
          tenant_id: TENANT_B_ID,
          company_id: companyBId,
          form_snapshot: {
            title: 'Test Form',
            version: 1,
            questions: []
          },
          submission_data: { test: 'data' },
          status: 'draft',
          submitted_by: tenantBUserId
        })
        .select()
        .single()

      tenantASubmissionId = submissionA!.id
      tenantBSubmissionId = submissionB!.id
    })

    test('Tenant A cannot read Tenant B submissions', async () => {
      // Sign in as Tenant A
      const { accessToken } = await signInTestUser(tenantAEmail)
      const tenantAClient = createAuthenticatedClient(accessToken)

      // Try to read Tenant B's submission
      const { data, error } = await tenantAClient
        .from('form_submissions')
        .select('*')
        .eq('id', tenantBSubmissionId)
        .single()

      // Should be blocked by RLS
      expect(data).toBeNull()
      expect(error).not.toBeNull()
    })

    test('Tenant A can read their own submissions', async () => {
      // Sign in as Tenant A
      const { accessToken } = await signInTestUser(tenantAEmail)
      const tenantAClient = createAuthenticatedClient(accessToken)

      // Read Tenant A's own submission
      const { data, error } = await tenantAClient
        .from('form_submissions')
        .select('*')
        .eq('id', tenantASubmissionId)
        .single()

      // Should succeed
      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data.id).toBe(tenantASubmissionId)
      expect(data.tenant_id).toBe(TENANT_A_ID)
    })
  })

  describe('Update form reminders table isolation', () => {
    let tenantAReminderId: string
    let tenantBReminderId: string
    let companyAId: string
    let companyBId: string
    let contactAId: string
    let contactBId: string

    beforeEach(async () => {
      // Get test companies and contacts
      const { data: companyA } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('tenant_id', TENANT_A_ID)
        .limit(1)
        .single()

      const { data: companyB } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('tenant_id', TENANT_B_ID)
        .limit(1)
        .single()

      const { data: contactA } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('tenant_id', TENANT_A_ID)
        .limit(1)
        .single()

      const { data: contactB } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('tenant_id', TENANT_B_ID)
        .limit(1)
        .single()

      companyAId = companyA!.id
      companyBId = companyB!.id
      contactAId = contactA!.id
      contactBId = contactB!.id

      // Create test reminders
      const { data: reminderA } = await supabaseAdmin
        .from('update_form_reminders')
        .insert({
          tenant_id: TENANT_A_ID,
          form_id: tenantAFormId,
          company_id: companyAId,
          contact_id: contactAId,
          due_date: '2026-12-31'
        })
        .select()
        .single()

      const { data: reminderB } = await supabaseAdmin
        .from('update_form_reminders')
        .insert({
          tenant_id: TENANT_B_ID,
          form_id: tenantBFormId,
          company_id: companyBId,
          contact_id: contactBId,
          due_date: '2026-12-31'
        })
        .select()
        .single()

      tenantAReminderId = reminderA!.id
      tenantBReminderId = reminderB!.id
    })

    test('Tenant A cannot read Tenant B reminders', async () => {
      // Sign in as Tenant A
      const { accessToken } = await signInTestUser(tenantAEmail)
      const tenantAClient = createAuthenticatedClient(accessToken)

      // Try to read Tenant B's reminder
      const { data, error } = await tenantAClient
        .from('update_form_reminders')
        .select('*')
        .eq('id', tenantBReminderId)
        .single()

      // Should be blocked by RLS
      expect(data).toBeNull()
      expect(error).not.toBeNull()
    })

    test('Tenant A can read their own reminders', async () => {
      // Sign in as Tenant A
      const { accessToken } = await signInTestUser(tenantAEmail)
      const tenantAClient = createAuthenticatedClient(accessToken)

      // Read Tenant A's own reminder
      const { data, error } = await tenantAClient
        .from('update_form_reminders')
        .select('*')
        .eq('id', tenantAReminderId)
        .single()

      // Should succeed
      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data.id).toBe(tenantAReminderId)
      expect(data.tenant_id).toBe(TENANT_A_ID)
    })
  })
})
