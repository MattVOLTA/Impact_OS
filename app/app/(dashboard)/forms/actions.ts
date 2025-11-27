/**
 * Forms Server Actions
 *
 * All form-related server actions for create, update, publish, delete operations
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  getForms,
  getForm,
  createForm,
  updateForm,
  publishForm,
  getFormVersions
} from '@/lib/dal/forms'
import {
  CreateFormInput,
  UpdateFormInput,
  createFormSchema,
  updateFormSchema
} from '@/lib/schemas/form'

/**
 * Load all forms for the current tenant
 */
export async function loadFormsAction(programId?: string) {
  try {
    const forms = await getForms(programId)
    return { success: true, data: forms }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      redirect('/login')
    }
    console.error('Load forms error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load forms'
    }
  }
}

/**
 * Load a single form by ID
 */
export async function loadFormAction(formId: string) {
  try {
    const form = await getForm(formId)
    if (!form) {
      return { success: false, error: 'Form not found' }
    }
    return { success: true, data: form }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      redirect('/login')
    }
    console.error('Load form error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load form'
    }
  }
}

/**
 * Create a new form
 */
export async function createFormAction(input: CreateFormInput) {
  try {
    // Validate input
    const validatedInput = createFormSchema.parse(input)

    const form = await createForm(validatedInput)

    revalidatePath('/forms')
    return { success: true, data: form }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      redirect('/login')
    }
    console.error('Create form error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create form'
    }
  }
}

/**
 * Update a form (creates new version if published + structural change)
 */
export async function updateFormAction(
  formId: string,
  updates: UpdateFormInput,
  isStructuralChange: boolean = false
) {
  try {
    // Validate input
    const validatedUpdates = updateFormSchema.parse(updates)

    const form = await updateForm(formId, validatedUpdates, isStructuralChange)

    revalidatePath('/forms')
    revalidatePath(`/forms/${formId}`)
    return { success: true, data: form }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      redirect('/login')
    }
    console.error('Update form error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update form'
    }
  }
}

/**
 * Publish a form
 */
export async function publishFormAction(formId: string) {
  try {
    const form = await publishForm(formId)

    revalidatePath('/forms')
    revalidatePath(`/forms/${formId}`)
    return { success: true, data: form }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      redirect('/login')
    }
    console.error('Publish form error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish form'
    }
  }
}

/**
 * Load version history for a form
 */
export async function loadFormVersionsAction(formId: string) {
  try {
    const versions = await getFormVersions(formId)
    return { success: true, data: versions }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      redirect('/login')
    }
    console.error('Load form versions error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load form versions'
    }
  }
}
