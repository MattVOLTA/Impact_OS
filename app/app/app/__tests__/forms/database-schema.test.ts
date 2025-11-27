/**
 * Forms Database Schema Tests
 *
 * RED PHASE - These tests should FAIL because the tables don't exist yet
 *
 * Tests verify:
 * 1. forms table exists with correct structure
 * 2. form_submissions table exists with correct structure
 * 3. update_form_reminders table exists with correct structure
 * 4. RLS policies are enabled and enforced
 * 5. Indexes exist for performance
 * 6. Temporal versioning queries work correctly
 */

import { createClient } from '@supabase/supabase-js'

describe('Forms Table Schema', () => {
  let supabaseAdmin: ReturnType<typeof createClient>

  beforeAll(() => {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  })

  describe('forms table structure', () => {
    test('forms table exists', async () => {
      const { data, error } = await supabaseAdmin
        .from('forms')
        .select('*')
        .limit(0)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    test('forms table has correct columns', async () => {
      // Query information_schema to verify column structure
      const { data, error } = await supabaseAdmin
        .rpc('get_table_columns', { table_name: 'forms' })
        .select('column_name, data_type, is_nullable')

      expect(error).toBeNull()

      const columns = data?.map((col: any) => col.column_name) || []

      // Required columns
      expect(columns).toContain('id')
      expect(columns).toContain('tenant_id')
      expect(columns).toContain('title')
      expect(columns).toContain('description')
      expect(columns).toContain('form_data')
      expect(columns).toContain('version')
      expect(columns).toContain('valid_from')
      expect(columns).toContain('valid_until')
      expect(columns).toContain('original_form_id')
      expect(columns).toContain('is_published')
      expect(columns).toContain('published_at')
      expect(columns).toContain('program_id')
      expect(columns).toContain('update_frequency')
      expect(columns).toContain('reminder_frequency')
      expect(columns).toContain('success_message')
      expect(columns).toContain('email_notifications')
      expect(columns).toContain('created_at')
      expect(columns).toContain('updated_at')
      expect(columns).toContain('created_by')
    })

    test('forms table has RLS enabled', async () => {
      // Verify RLS by checking if policies exist
      const { data, error } = await supabaseAdmin
        .rpc('get_policies', { table_name: 'forms' })

      expect(error).toBeNull()
      expect(data?.length).toBeGreaterThan(0)
    })

    test('forms table has tenant_id foreign key to tenants', async () => {
      const { data, error } = await supabaseAdmin
        .rpc('get_foreign_keys', { table_name: 'forms' })

      expect(error).toBeNull()

      const tenantFK = data?.find((fk: any) =>
        fk.column_name === 'tenant_id' && fk.foreign_table_name === 'tenants'
      )

      expect(tenantFK).toBeDefined()
    })

    test('forms table has created_by foreign key to users', async () => {
      const { data, error } = await supabaseAdmin
        .rpc('get_foreign_keys', { table_name: 'forms' })

      expect(error).toBeNull()

      const userFK = data?.find((fk: any) =>
        fk.column_name === 'created_by' && fk.foreign_table_name === 'users'
      )

      expect(userFK).toBeDefined()
    })

    test('forms table has program_id foreign key to programs', async () => {
      const { data, error } = await supabaseAdmin
        .rpc('get_foreign_keys', { table_name: 'forms' })

      expect(error).toBeNull()

      const programFK = data?.find((fk: any) =>
        fk.column_name === 'program_id' && fk.foreign_table_name === 'programs'
      )

      expect(programFK).toBeDefined()
    })
  })

  describe('forms table indexes', () => {
    test('has index on tenant_id', async () => {
      const { data, error } = await supabaseAdmin
        .rpc('get_indexes', { table_name: 'forms' })

      expect(error).toBeNull()

      const tenantIndex = data?.find((idx: any) =>
        idx.column_names.includes('tenant_id')
      )

      expect(tenantIndex).toBeDefined()
    })

    test('has index on program_id', async () => {
      const { data, error } = await supabaseAdmin
        .rpc('get_indexes', { table_name: 'forms' })

      expect(error).toBeNull()

      const programIndex = data?.find((idx: any) =>
        idx.column_names.includes('program_id')
      )

      expect(programIndex).toBeDefined()
    })

    test('has temporal validity index', async () => {
      const { data, error } = await supabaseAdmin
        .rpc('get_indexes', { table_name: 'forms' })

      expect(error).toBeNull()

      const temporalIndex = data?.find((idx: any) =>
        idx.column_names.includes('valid_from') &&
        idx.column_names.includes('valid_until')
      )

      expect(temporalIndex).toBeDefined()
    })

    test('has unique index for active versions', async () => {
      const { data, error } = await supabaseAdmin
        .rpc('get_indexes', { table_name: 'forms' })

      expect(error).toBeNull()

      const uniqueActiveIndex = data?.find((idx: any) =>
        idx.is_unique === true &&
        idx.index_name.includes('active_version')
      )

      expect(uniqueActiveIndex).toBeDefined()
    })
  })

  describe('form_submissions table structure', () => {
    test('form_submissions table exists', async () => {
      const { data, error } = await supabaseAdmin
        .from('form_submissions')
        .select('*')
        .limit(0)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    test('form_submissions table has correct columns', async () => {
      const { data, error } = await supabaseAdmin
        .rpc('get_table_columns', { table_name: 'form_submissions' })
        .select('column_name')

      expect(error).toBeNull()

      const columns = data?.map((col: any) => col.column_name) || []

      expect(columns).toContain('id')
      expect(columns).toContain('form_id')
      expect(columns).toContain('tenant_id')
      expect(columns).toContain('company_id')
      expect(columns).toContain('form_snapshot')
      expect(columns).toContain('submission_data')
      expect(columns).toContain('status')
      expect(columns).toContain('submitted_at')
      expect(columns).toContain('submitted_by')
      expect(columns).toContain('created_at')
      expect(columns).toContain('updated_at')
    })

    test('form_submissions table has RLS enabled', async () => {
      // Verify RLS by checking if policies exist
      const { data, error} = await supabaseAdmin
        .rpc('get_policies', { table_name: 'form_submissions' })

      expect(error).toBeNull()
      expect(data?.length).toBeGreaterThan(0)
    })

    test('form_submissions has status check constraint', async () => {
      const { data, error } = await supabaseAdmin
        .rpc('get_check_constraints', { table_name: 'form_submissions' })

      expect(error).toBeNull()

      const statusConstraint = data?.find((con: any) =>
        con.constraint_definition.includes('draft') &&
        con.constraint_definition.includes('submitted')
      )

      expect(statusConstraint).toBeDefined()
    })
  })

  describe('update_form_reminders table structure', () => {
    test('update_form_reminders table exists', async () => {
      const { data, error } = await supabaseAdmin
        .from('update_form_reminders')
        .select('*')
        .limit(0)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    test('update_form_reminders table has correct columns', async () => {
      const { data, error } = await supabaseAdmin
        .rpc('get_table_columns', { table_name: 'update_form_reminders' })
        .select('column_name')

      expect(error).toBeNull()

      const columns = data?.map((col: any) => col.column_name) || []

      expect(columns).toContain('id')
      expect(columns).toContain('tenant_id')
      expect(columns).toContain('form_id')
      expect(columns).toContain('company_id')
      expect(columns).toContain('contact_id')
      expect(columns).toContain('due_date')
      expect(columns).toContain('sent_at')
      expect(columns).toContain('email_opened')
      expect(columns).toContain('email_opened_at')
      expect(columns).toContain('form_submitted')
      expect(columns).toContain('form_submitted_at')
      expect(columns).toContain('reminder_count')
      expect(columns).toContain('created_at')
      expect(columns).toContain('updated_at')
    })

    test('update_form_reminders table has RLS enabled', async () => {
      // Verify RLS by checking if policies exist
      const { data, error } = await supabaseAdmin
        .rpc('get_policies', { table_name: 'update_form_reminders' })

      expect(error).toBeNull()
      expect(data?.length).toBeGreaterThan(0)
    })
  })

  describe('temporal versioning queries', () => {
    test('can query current versions with valid_until IS NULL', async () => {
      const { error } = await supabaseAdmin
        .from('forms')
        .select('*')
        .is('valid_until', null)

      expect(error).toBeNull()
    })

    test('can query historical versions with valid_until IS NOT NULL', async () => {
      const { error } = await supabaseAdmin
        .from('forms')
        .select('*')
        .not('valid_until', 'is', null)

      expect(error).toBeNull()
    })

    test('can query all versions for a specific form using original_form_id', async () => {
      // This tests the query pattern for version history
      // Use a valid UUID format
      const testId = '00000000-0000-0000-0000-000000000000'
      const { error } = await supabaseAdmin
        .from('forms')
        .select('*')
        .or(`id.eq.${testId},original_form_id.eq.${testId}`)
        .order('version', { ascending: false })

      // Should not error even with fake ID
      expect(error).toBeNull()
    })
  })
})

describe('Forms RLS Policies', () => {
  let supabaseAdmin: ReturnType<typeof createClient>

  beforeAll(() => {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  })

  test('forms table has tenant isolation RLS policy', async () => {
    const { data, error } = await supabaseAdmin
      .rpc('get_policies', { table_name: 'forms' })

    expect(error).toBeNull()

    const tenantPolicy = data?.find((policy: any) =>
      policy.policy_definition.includes('tenant_id') &&
      policy.policy_definition.includes('auth.jwt()')
    )

    expect(tenantPolicy).toBeDefined()
  })

  test('form_submissions table has tenant isolation RLS policy', async () => {
    const { data, error } = await supabaseAdmin
      .rpc('get_policies', { table_name: 'form_submissions' })

    expect(error).toBeNull()

    const tenantPolicy = data?.find((policy: any) =>
      policy.policy_definition.includes('tenant_id') &&
      policy.policy_definition.includes('auth.jwt()')
    )

    expect(tenantPolicy).toBeDefined()
  })

  test('update_form_reminders table has tenant isolation RLS policy', async () => {
    const { data, error } = await supabaseAdmin
      .rpc('get_policies', { table_name: 'update_form_reminders' })

    expect(error).toBeNull()

    const tenantPolicy = data?.find((policy: any) =>
      policy.policy_definition.includes('tenant_id') &&
      policy.policy_definition.includes('auth.jwt()')
    )

    expect(tenantPolicy).toBeDefined()
  })
})

describe('Backward Compatibility', () => {
  let supabaseAdmin: ReturnType<typeof createClient>

  beforeAll(() => {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  })

  test('company_updates table has form_submission_id column', async () => {
    const { data, error } = await supabaseAdmin
      .rpc('get_table_columns', { table_name: 'company_updates' })
      .select('column_name')

    expect(error).toBeNull()

    const columns = data?.map((col: any) => col.column_name) || []

    expect(columns).toContain('form_submission_id')
  })

  test('company_updates has foreign key to form_submissions', async () => {
    const { data, error } = await supabaseAdmin
      .rpc('get_foreign_keys', { table_name: 'company_updates' })

    expect(error).toBeNull()

    const submissionFK = data?.find((fk: any) =>
      fk.column_name === 'form_submission_id' &&
      fk.foreign_table_name === 'form_submissions'
    )

    expect(submissionFK).toBeDefined()
  })
})
