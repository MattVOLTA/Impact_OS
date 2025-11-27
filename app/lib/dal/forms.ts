/**
 * Forms Data Access Layer
 *
 * All form-related data access goes through these functions.
 * Follows DAL pattern: requireAuth() → validate → query → return
 *
 * Uses authenticated client so RLS policies apply automatically.
 * Tenant isolation enforced via get_active_organization_id() function in RLS policies.
 *
 * See docs/architecture/auth-best-practices.md for patterns.
 */

import { requireAuth, getCurrentTenantId } from './shared'
import {
  createFormSchema,
  CreateFormInput,
  UpdateFormInput,
  type Form
} from '@/lib/schemas/form'
import { createClient } from '@supabase/supabase-js'

/**
 * Get paginated forms for the authenticated user's tenant
 *
 * Returns only current versions (valid_until IS NULL)
 * Supports search, status filter, and pagination.
 *
 * Uses authenticated client so RLS policies apply.
 * Tenant isolation enforced via get_active_organization_id() in RLS.
 *
 * @param options - Pagination and filter options
 * @returns Paginated forms with total count
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getFormsPaginated({
  search,
  page = 1,
  pageSize = 50,
  status
}: {
  search?: string
  page?: number
  pageSize?: number
  status?: 'all' | 'published' | 'draft'
}): Promise<{ forms: Form[], totalCount: number }> {
  const { supabase } = await requireAuth()

  // Calculate range
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Build base query
  let query = supabase
    .from('forms')
    .select('*', { count: 'exact' })
    .is('valid_until', null) // Only current versions
    .order('created_at', { ascending: false })

  // Apply search filter
  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('is_published', status === 'published')
  }

  // Apply pagination
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching forms:', error)
    throw new Error(`Failed to fetch forms: ${error.message}`)
  }

  return {
    forms: (data || []) as Form[],
    totalCount: count || 0
  }
}

/**
 * Get all forms for the authenticated user's tenant
 *
 * Returns only current versions (valid_until IS NULL)
 * Optionally filter by program_id
 *
 * Uses authenticated client so RLS policies apply.
 * Tenant isolation enforced via get_active_organization_id() in RLS.
 *
 * @param programId - Optional program ID to filter by
 * @returns Array of forms
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getForms(programId?: string): Promise<Form[]> {
  const { supabase } = await requireAuth()
  // RLS handles tenant filtering via get_active_organization_id()

  let query = supabase
    .from('forms')
    .select('*')
    .is('valid_until', null) // Only current versions
    .order('created_at', { ascending: false })

  if (programId) {
    query = query.eq('program_id', programId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching forms:', error)
    throw new Error(`Failed to fetch forms: ${error.message}`)
  }

  return (data || []) as Form[]
}

/**
 * Get a single form by ID
 *
 * Returns null if form not found or belongs to different tenant (RLS blocks it)
 *
 * Uses authenticated client so RLS policies apply.
 * Tenant isolation enforced via get_active_organization_id() in RLS.
 *
 * @param formId - UUID of the form
 * @returns Form object or null
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getForm(formId: string): Promise<Form | null> {
  const { supabase } = await requireAuth()
  // RLS handles tenant filtering via get_active_organization_id()

  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', formId)
    .single()

  if (error) {
    // PGRST116 = row not found (expected for non-existent or cross-tenant access)
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching form:', error)
    throw new Error(`Failed to fetch form: ${error.message}`)
  }

  return data as Form
}

/**
 * Create a new form
 *
 * Automatically sets tenant_id from authenticated user
 * Sets version to 1, valid_from to NOW(), valid_until to NULL
 * Sets is_published to false, created_by to current user
 *
 * Uses authenticated client so RLS policies apply.
 * Explicit tenant_id required for INSERT (RLS with_check policy).
 *
 * @param input - Form creation data
 * @returns Created form
 * @throws {Error} 'Unauthorized' if not authenticated
 * @throws {Error} Validation error if input invalid
 */
export async function createForm(input: CreateFormInput): Promise<Form> {
  const { supabase, user } = await requireAuth()
  const tenantId = await getCurrentTenantId() // Explicit tenant_id for INSERT

  // Validate input
  const validatedInput = createFormSchema.parse(input)

  const { data, error } = await supabase
    .from('forms')
    .insert({
      tenant_id: tenantId,
      title: validatedInput.title,
      description: validatedInput.description,
      form_data: validatedInput.form_data,
      program_id: validatedInput.program_id,
      update_frequency: validatedInput.update_frequency,
      reminder_frequency: validatedInput.reminder_frequency,
      success_message: validatedInput.success_message || 'Thank you for your submission!',
      email_notifications: validatedInput.email_notifications || {
        enabled: false,
        recipients: []
      },
      version: 1,
      valid_from: new Date().toISOString(),
      valid_until: null,
      is_published: false,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating form:', error)
    throw new Error(`Failed to create form: ${error.message}`)
  }

  return data as Form
}

/**
 * Get all versions of a form (including historical)
 *
 * Returns all versions ordered by version number descending (newest first)
 *
 * Uses authenticated client so RLS policies apply.
 * Tenant isolation enforced via get_active_organization_id() in RLS.
 *
 * @param formId - UUID of the original form or any version
 * @returns Array of form versions
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getFormVersions(formId: string): Promise<Form[]> {
  const { supabase } = await requireAuth()
  // RLS handles tenant filtering via get_active_organization_id()

  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .or(`id.eq.${formId},original_form_id.eq.${formId}`)
    .order('version', { ascending: false })

  if (error) {
    console.error('Error fetching form versions:', error)
    throw new Error(`Failed to fetch form versions: ${error.message}`)
  }

  return (data || []) as Form[]
}

/**
 * Get the current active version of a form
 *
 * Returns the version where valid_until IS NULL
 *
 * Uses authenticated client so RLS policies apply.
 * Tenant isolation enforced via get_active_organization_id() in RLS.
 *
 * @param originalFormId - UUID of the original form
 * @returns Current version or null
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function getCurrentFormVersion(originalFormId: string): Promise<Form | null> {
  const { supabase } = await requireAuth()
  // RLS handles tenant filtering via get_active_organization_id()

  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .or(`id.eq.${originalFormId},original_form_id.eq.${originalFormId}`)
    .is('valid_until', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching current form version:', error)
    throw new Error(`Failed to fetch current form version: ${error.message}`)
  }

  return data as Form
}

/**
 * Publish a form
 *
 * Sets is_published = true and published_at = NOW()
 * Does not create a new version
 *
 * Uses authenticated client so RLS policies apply.
 * Tenant isolation enforced via get_active_organization_id() in RLS.
 *
 * @param formId - UUID of the form to publish
 * @returns Published form
 * @throws {Error} 'Unauthorized' if not authenticated
 * @throws {Error} If form not found
 */
export async function publishForm(formId: string): Promise<Form> {
  const { supabase } = await requireAuth()
  // RLS handles tenant filtering via get_active_organization_id()

  const { data, error } = await supabase
    .from('forms')
    .update({
      is_published: true,
      published_at: new Date().toISOString()
    })
    .eq('id', formId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Form not found')
    }
    console.error('Error publishing form:', error)
    throw new Error(`Failed to publish form: ${error.message}`)
  }

  return data as Form
}

/**
 * Update a form
 *
 * Behavior depends on whether form is published and if change is structural:
 * - Unpublished: Update in-place (no versioning)
 * - Published + cosmetic change: Update in-place (no versioning)
 * - Published + structural change: Create new version
 *
 * Structural changes: Add/remove/reorder sections/questions, change types, validation, conditional logic
 * Cosmetic changes: Update title, description, question text, help text, success message
 *
 * Uses authenticated client so RLS policies apply.
 * Tenant isolation enforced via get_active_organization_id() in RLS.
 *
 * @param formId - UUID of the form to update
 * @param updates - Partial form data to update
 * @param isStructuralChange - Whether this is a structural change
 * @returns Updated or new version of form
 * @throws {Error} 'Unauthorized' if not authenticated
 */
export async function updateForm(
  formId: string,
  updates: UpdateFormInput,
  isStructuralChange: boolean
): Promise<Form> {
  const { supabase, user } = await requireAuth()
  // RLS handles tenant filtering via get_active_organization_id()

  // Get current form
  const { data: current, error: fetchError } = await supabase
    .from('forms')
    .select('*')
    .eq('id', formId)
    .single()

  if (fetchError || !current) {
    throw new Error('Form not found')
  }

  // If unpublished OR cosmetic change, update in-place
  if (!current.is_published || !isStructuralChange) {
    const { data, error } = await supabase
      .from('forms')
      .update({
        title: updates.title ?? current.title,
        description: updates.description ?? current.description,
        form_data: updates.form_data ?? current.form_data,
        success_message: updates.success_message ?? current.success_message,
        email_notifications: updates.email_notifications ?? current.email_notifications,
        update_frequency: updates.update_frequency ?? current.update_frequency,
        reminder_frequency: updates.reminder_frequency ?? current.reminder_frequency,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId)
      .select()
      .single()

    if (error) {
      console.error('Error updating form:', error)
      throw new Error(`Failed to update form: ${error.message}`)
    }

    return data as Form
  }

  // Published + structural change → Create new version
  const now = new Date().toISOString()

  // Close current version
  await supabase
    .from('forms')
    .update({ valid_until: now })
    .eq('id', formId)

  // Create new version
  const { data: newVersion, error } = await supabase
    .from('forms')
    .insert({
      tenant_id: current.tenant_id,
      title: updates.title ?? current.title,
      description: updates.description ?? current.description,
      form_data: updates.form_data ?? current.form_data,
      program_id: current.program_id,
      update_frequency: updates.update_frequency ?? current.update_frequency,
      reminder_frequency: updates.reminder_frequency ?? current.reminder_frequency,
      success_message: updates.success_message ?? current.success_message,
      email_notifications: updates.email_notifications ?? current.email_notifications,
      version: current.version + 1,
      original_form_id: current.original_form_id || current.id,
      is_published: current.is_published,
      published_at: current.published_at,
      valid_from: now,
      valid_until: null,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating new form version:', error)
    throw new Error(`Failed to create new form version: ${error.message}`)
  }

  return newVersion as Form
}

/**
 * Get a published form for public access (no authentication required)
 *
 * This is used for the public form submission page at /f/[id]
 *
 * LEGITIMATELY uses admin client to bypass RLS (cross-tenant access required).
 * Security: Only returns published forms (is_published = true).
 * Use case: Public form submissions need access to forms across all tenants.
 *
 * @param formId - UUID of the form
 * @returns Published form or null
 */
export async function getPublicForm(formId: string): Promise<Form | null> {
  // Use admin client to bypass RLS (we want to access ANY tenant's published form)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', formId)
    .eq('is_published', true) // CRITICAL: Only published forms
    .is('valid_until', null) // Only current version
    .single()

  if (error) {
    // PGRST116 = row not found (expected for non-existent or unpublished)
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching public form:', error)
    throw new Error(`Failed to fetch public form: ${error.message}`)
  }

  return data as Form
}
