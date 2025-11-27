/**
 * Server Actions - Interactions
 *
 * All interaction mutations go through server actions for type safety and consistency.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createInteraction,
  updateInteraction,
  deleteInteraction,
  type Interaction
} from '@/lib/dal/interactions'
import { getContacts } from '@/lib/dal/contacts'
import { getCompanies } from '@/lib/dal/companies'
import type { CreateInteractionInput, UpdateInteractionInput } from '@/lib/schemas/interaction'

/**
 * Create a new interaction
 *
 * @param {CreateInteractionInput} data - Interaction data
 * @returns {Promise<{success: boolean, interaction?: Interaction, error?: string}>}
 */
export async function createInteractionAction(data: CreateInteractionInput) {
  try {
    const interaction = await createInteraction(data)

    // Revalidate relevant pages
    revalidatePath('/interactions')
    if (data.company_ids && data.company_ids.length > 0) {
      data.company_ids.forEach(id => revalidatePath(`/companies/${id}`))
    }
    if (data.contact_ids && data.contact_ids.length > 0) {
      data.contact_ids.forEach(id => revalidatePath(`/contacts/${id}`))
    }

    return {
      success: true,
      interaction
    }
  } catch (error) {
    console.error('Failed to create interaction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create interaction'
    }
  }
}

/**
 * Update an existing interaction
 *
 * @param {string} interactionId - Interaction UUID
 * @param {UpdateInteractionInput} data - Updated interaction data
 * @returns {Promise<{success: boolean, interaction?: Interaction, error?: string}>}
 */
export async function updateInteractionAction(
  interactionId: string,
  data: UpdateInteractionInput
) {
  try {
    const interaction = await updateInteraction(interactionId, data)

    // Revalidate relevant pages
    revalidatePath('/interactions')
    revalidatePath(`/interactions/${interactionId}`)
    if (data.company_ids) {
      data.company_ids.forEach(id => revalidatePath(`/companies/${id}`))
    }
    if (data.contact_ids) {
      data.contact_ids.forEach(id => revalidatePath(`/contacts/${id}`))
    }

    return {
      success: true,
      interaction
    }
  } catch (error) {
    console.error('Failed to update interaction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update interaction'
    }
  }
}

/**
 * Delete an interaction
 *
 * @param {string} interactionId - Interaction UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteInteractionAction(interactionId: string) {
  try {
    await deleteInteraction(interactionId)

    // Revalidate pages
    revalidatePath('/interactions')

    return {
      success: true
    }
  } catch (error) {
    console.error('Failed to delete interaction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete interaction'
    }
  }
}

/**
 * Search contacts for interaction association
 *
 * Used by contact combobox in add/edit interaction modals.
 * Includes company associations for context.
 *
 * @param {string} query - Search query
 * @returns {Promise<Array<{id: string, label: string, email?: string, companies?: string}>>}
 */
export async function searchContactsForInteractionAction(query: string) {
  try {
    const contacts = await getContacts(query)

    return contacts.map(contact => ({
      id: contact.id,
      label: `${contact.first_name} ${contact.last_name}`,
      email: contact.email || undefined,
      companies: contact.companies?.map(c => c.business_name).join(', ') || undefined
    }))
  } catch (error) {
    console.error('Failed to search contacts:', error)
    return []
  }
}

/**
 * Search companies for interaction association
 *
 * Used by company combobox in add/edit interaction modals.
 *
 * @param {string} query - Search query
 * @returns {Promise<Array<{id: string, label: string}>>}
 */
export async function searchCompaniesForInteractionAction(query: string) {
  try {
    const companies = await getCompanies(query)

    return companies.map(company => ({
      id: company.id,
      label: company.business_name
    }))
  } catch (error) {
    console.error('Failed to search companies:', error)
    return []
  }
}
