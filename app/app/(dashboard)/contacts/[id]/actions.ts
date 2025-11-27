/**
 * Contact Detail Page Server Actions
 *
 * Actions for editing, deleting contacts, and managing photos.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { updateContact, deleteContact } from '@/lib/dal/contacts'
import { getCurrentTenantId } from '@/lib/dal/shared'
import { type UpdateContactInput } from '@/lib/schemas/contact'

/**
 * Update a contact
 *
 * @param contactId - Contact UUID
 * @param updates - Fields to update
 * @returns Success/failure
 */
export async function updateContactAction(contactId: string, updates: UpdateContactInput) {
  try {
    const contact = await updateContact(contactId, updates)

    revalidatePath('/contacts')
    revalidatePath(`/contacts/${contactId}`)

    return {
      success: true,
      contact
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update contact'
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
 * Upload contact photo to Storage and update contact record
 *
 * @param contactId - Contact UUID
 * @param formData - FormData containing the file
 * @returns Success/failure with photo URL
 */
export async function uploadContactPhotoAction(contactId: string, formData: FormData) {
  try {
    const file = formData.get('file') as File

    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 5MB' }
    }

    const tenantId = await getCurrentTenantId()

    const storageClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const fileExt = file.name.split('.').pop()
    const filePath = `${tenantId}/${contactId}/photo.${fileExt}`

    const { error: uploadError } = await storageClient.storage
      .from('contact-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      })

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    const { data: urlData } = storageClient.storage
      .from('contact-photos')
      .getPublicUrl(filePath)

    await updateContact(contactId, {
      photo_url: urlData.publicUrl
    })

    revalidatePath('/contacts')
    revalidatePath(`/contacts/${contactId}`)

    return {
      success: true,
      photo_url: urlData.publicUrl
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload photo'
    }
  }
}

/**
 * Delete contact photo from Storage and clear contact record
 *
 * @param contactId - Contact UUID
 * @returns Success/failure
 */
export async function deleteContactPhotoAction(contactId: string) {
  try {
    const tenantId = await getCurrentTenantId()

    const storageClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
    for (const ext of extensions) {
      const path = `${tenantId}/${contactId}/photo.${ext}`
      await storageClient.storage.from('contact-photos').remove([path])
    }

    await updateContact(contactId, {
      photo_url: null
    })

    revalidatePath('/contacts')
    revalidatePath(`/contacts/${contactId}`)

    return {
      success: true,
      message: 'Photo deleted successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete photo'
    }
  }
}
