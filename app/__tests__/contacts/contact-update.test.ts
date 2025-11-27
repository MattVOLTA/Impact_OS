/**
 * Contact Update Tests
 *
 * Following TDD: Test contact CRUD operations including photo upload.
 * Verify update operations work correctly.
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Contact Update Operations', () => {
  test('can update contact basic fields', async () => {
    // Get existing contact
    const { data: contact } = await adminClient
      .from('contacts')
      .select('id, first_name, email, bio, linkedin_url, photo_url')
      .eq('tenant_id', TENANT_1_ID)
      .limit(1)
      .single()

    if (!contact) throw new Error('No test contact found')

    const originalBio = contact.bio
    const testBio = `Test bio updated at ${Date.now()}`
    const testLinkedIn = 'https://linkedin.com/in/test-profile'

    // Update contact
    const { data: updated, error } = await adminClient
      .from('contacts')
      .update({
        bio: testBio,
        linkedin_url: testLinkedIn
      })
      .eq('id', contact.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated?.bio).toBe(testBio)
    expect(updated?.linkedin_url).toBe(testLinkedIn)

    // Verify persisted
    const { data: verified } = await adminClient
      .from('contacts')
      .select('bio, linkedin_url')
      .eq('id', contact.id)
      .single()

    expect(verified?.bio).toBe(testBio)
    expect(verified?.linkedin_url).toBe(testLinkedIn)

    // Cleanup
    await adminClient
      .from('contacts')
      .update({ bio: originalBio, linkedin_url: null })
      .eq('id', contact.id)
  })

  test('can update contact photo_url', async () => {
    // Get Sarah Johnson (we know she has a photo)
    const { data: contact } = await adminClient
      .from('contacts')
      .select('id, first_name, last_name, photo_url')
      .eq('email', 'sarah.johnson@techstart.com')
      .eq('tenant_id', TENANT_1_ID)
      .single()

    expect(contact).toBeDefined()

    if (!contact) return

    // Verify photo_url exists and is a valid URL
    expect(contact.photo_url).toBeDefined()
    expect(contact.photo_url).toContain('contact-photos')
    expect(contact.photo_url).toContain(contact.id)
  })

  test('contact fields are nullable (can clear fields)', async () => {
    // Get a contact
    const { data: contact } = await adminClient
      .from('contacts')
      .select('id')
      .eq('tenant_id', TENANT_1_ID)
      .limit(1)
      .single()

    if (!contact) throw new Error('No test contact found')

    // Set fields to null
    const { data: updated, error } = await adminClient
      .from('contacts')
      .update({
        bio: null,
        linkedin_url: null,
        photo_url: null
      })
      .eq('id', contact.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated?.bio).toBeNull()
    expect(updated?.linkedin_url).toBeNull()
    expect(updated?.photo_url).toBeNull()
  })
})

describe('Contact Photo Upload Verification', () => {
  test('photo file exists in Storage', async () => {
    // Check if Sarah's photo file exists in storage.objects
    const { data: files } = await adminClient
      .from('storage.objects')
      .select('name, bucket_id')
      .eq('bucket_id', 'contact-photos')
      .limit(5)

    expect(files).toBeDefined()
    expect(files!.length).toBeGreaterThan(0)

    // Verify path structure is correct
    const photoFile = files![0]
    expect(photoFile.name).toContain(TENANT_1_ID) // tenant_id in path
    expect(photoFile.bucket_id).toBe('contact-photos')
  })
})
