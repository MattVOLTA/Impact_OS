/**
 * Contacts Server Actions
 *
 * Actions for creating, updating, deleting contacts and managing company links.
 */

'use server'

import { revalidatePath } from 'next/cache'
import {
  createContact,
  updateContact,
  deleteContact,
  linkContactToCompany,
  unlinkContactFromCompany,
  searchContacts,
  addContactEmail,
  updateContactEmail,
  deleteContactEmail,
  setPrimaryEmail
} from '@/lib/dal/contacts'
import { getCompanies } from '@/lib/dal/companies'
import {
  createContactSchema,
  type CreateContactInput,
  addEmailSchema,
  updateEmailSchema,
  type AddEmailInput,
  type UpdateEmailInput
} from '@/lib/schemas/contact'

/**
 * Create a new contact and optionally link to a company
 *
 * @param data - Contact data
 * @param companyId - Optional company to link to
 * @returns Success/failure with contact
 */
export async function createContactAction(data: CreateContactInput, companyId?: string) {
  try {
    // Validate input
    const validated = createContactSchema.parse(data)

    // Create contact
    const contact = await createContact({
      first_name: validated.first_name,
      last_name: validated.last_name,
      email: validated.email || null,
      phone: validated.phone || null
    })

    // Link to company if provided
    if (companyId) {
      await linkContactToCompany(contact.id, companyId)
    }

    // Revalidate relevant pages
    revalidatePath('/contacts')
    if (companyId) {
      revalidatePath(`/companies/${companyId}`)
    }

    return {
      success: true,
      contact
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create contact'
    }
  }
}

/**
 * Search contacts by name (for duplicate detection)
 *
 * @param query - Search string
 * @returns Array of matching contacts
 */
export async function searchContactsAction(query: string) {
  try {
    if (!query || query.trim().length < 2) {
      return { success: true, contacts: [] }
    }

    const contacts = await searchContacts(query.trim())

    return {
      success: true,
      contacts
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search contacts',
      contacts: []
    }
  }
}

/**
 * Link existing contact to a company
 *
 * @param contactId - Contact UUID
 * @param companyId - Company UUID
 * @returns Success/failure
 */
export async function linkContactAction(contactId: string, companyId: string) {
  try {
    await linkContactToCompany(contactId, companyId)

    revalidatePath(`/companies/${companyId}`)
    revalidatePath('/contacts')

    return {
      success: true,
      message: 'Contact linked successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to link contact'
    }
  }
}

/**
 * Unlink contact from company
 *
 * @param contactId - Contact UUID
 * @param companyId - Company UUID
 * @returns Success/failure
 */
export async function unlinkContactAction(contactId: string, companyId: string) {
  try {
    await unlinkContactFromCompany(contactId, companyId)

    revalidatePath(`/companies/${companyId}`)
    revalidatePath('/contacts')

    return {
      success: true,
      message: 'Contact removed from company'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove contact'
    }
  }
}

/**
 * Delete a contact
 *
 * @param contactId - Contact UUID
 * @returns Success/failure
 */
export async function deleteContactAction(contactId: string) {
  try {
    await deleteContact(contactId)

    revalidatePath('/contacts')
    // Note: Company pages will be revalidated when user navigates back

    return {
      success: true,
      message: 'Contact deleted successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete contact'
    }
  }
}

/**
 * Search companies by name (for linking to contacts)
 *
 * @param query - Search string
 * @returns Array of matching companies
 */
export async function searchCompaniesAction(query: string) {
  try {
    if (!query || query.trim().length < 2) {
      return { success: true, companies: [] }
    }

    const companies = await getCompanies(query.trim())

    return {
      success: true,
      companies
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search companies',
      companies: []
    }
  }
}

/**
 * Add email to contact
 *
 * @param contactId - Contact UUID
 * @param email - Email address
 * @param emailType - Type of email (work/personal/other)
 * @param isPrimary - Whether this is the primary email
 * @returns Success/failure with email record
 */
export async function addContactEmailAction(
  contactId: string,
  email: string,
  emailType?: 'work' | 'personal' | 'other',
  isPrimary: boolean = false
) {
  try {
    const validated = addEmailSchema.parse({ email, email_type: emailType, is_primary: isPrimary })
    const emailRecord = await addContactEmail(
      contactId,
      validated.email,
      validated.is_primary,
      validated.email_type || undefined
    )

    revalidatePath(`/contacts/${contactId}`)
    revalidatePath('/contacts')

    return { success: true, email: emailRecord }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add email'
    }
  }
}

/**
 * Update contact email
 *
 * @param emailId - Email UUID
 * @param contactId - Contact UUID (for revalidation)
 * @param data - Fields to update
 * @returns Success/failure with updated email
 */
export async function updateContactEmailAction(
  emailId: string,
  contactId: string,
  data: { email?: string; email_type?: 'work' | 'personal' | 'other'; is_primary?: boolean }
) {
  try {
    const validated = updateEmailSchema.parse(data)
    const emailRecord = await updateContactEmail(emailId, validated)

    revalidatePath(`/contacts/${contactId}`)
    revalidatePath('/contacts')

    return { success: true, email: emailRecord }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update email'
    }
  }
}

/**
 * Delete contact email
 *
 * @param emailId - Email UUID
 * @param contactId - Contact UUID (for revalidation)
 * @returns Success/failure
 */
export async function deleteContactEmailAction(emailId: string, contactId: string) {
  try {
    await deleteContactEmail(emailId)

    revalidatePath(`/contacts/${contactId}`)
    revalidatePath('/contacts')

    return { success: true, message: 'Email deleted successfully' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete email'
    }
  }
}

/**
 * Set primary email for contact
 *
 * @param emailId - Email UUID to set as primary
 * @param contactId - Contact UUID (for revalidation)
 * @returns Success/failure
 */
export async function setPrimaryEmailAction(emailId: string, contactId: string) {
  try {
    await setPrimaryEmail(emailId)

    revalidatePath(`/contacts/${contactId}`)
    revalidatePath('/contacts')

    return { success: true, message: 'Primary email updated' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set primary email'
    }
  }
}
