/**
 * Form Publishing & Versioning Tests
 *
 * RED PHASE - These tests should FAIL because functions don't exist yet
 *
 * Tests verify:
 * 1. publishForm() sets is_published = true, published_at timestamp
 * 2. updateForm() detects structural vs cosmetic changes
 * 3. Structural changes create new version (close old, create new)
 * 4. Cosmetic changes update in-place (no new version)
 * 5. Version numbers increment correctly
 * 6. Temporal validity timestamps set correctly
 * 7. original_form_id links versions together
 *
 * Following TDD principles:
 * - Write test first (RED)
 * - Implement minimal code to pass (GREEN)
 * - Refactor if needed
 */

import { createClient } from '@supabase/supabase-js'

// Import DAL functions (will fail initially for new functions)
import {
  createForm,
  publishForm,
  updateForm,
  getFormVersions,
  getForm
} from '@/lib/dal/forms'
import { CreateFormInput, UpdateFormInput } from '@/lib/schemas/form'

describe('Form Publishing & Versioning', () => {
  let supabaseAdmin: ReturnType<typeof createClient>
  let testUserId: string
  let testFormId: string

  const TENANT_A_ID = '11111111-1111-1111-1111-111111111111'

  beforeAll(() => {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  })

  beforeEach(async () => {
    // Create test user
    const { data: testUser } = await supabaseAdmin.auth.admin.createUser({
      email: `test-versioning-${Date.now()}@test.com`,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: TENANT_A_ID,
        first_name: 'Test',
        last_name: 'User'
      }
    })

    testUserId = testUser.user!.id
    await new Promise(resolve => setTimeout(resolve, 100))

    // Create a test form
    const { data: form } = await supabaseAdmin
      .from('forms')
      .insert({
        tenant_id: TENANT_A_ID,
        title: 'Test Form for Versioning',
        form_data: {
          sections: [
            {
              id: '00000000-0000-0000-0000-000000000001',
              title: 'Original Section',
              isExpanded: true,
              questions: [
                {
                  id: '00000000-0000-0000-0000-000000000002',
                  type: 'text',
                  text: 'Original question',
                  required: true,
                  layout: 'full'
                }
              ]
            }
          ]
        },
        created_by: testUserId
      })
      .select()
      .single()

    testFormId = form!.id
  })

  afterEach(async () => {
    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId)
    }
  })

  describe('publishForm()', () => {
    test('sets is_published to true', async () => {
      const published = await publishForm(testFormId)

      expect(published.is_published).toBe(true)
    })

    test('sets published_at timestamp', async () => {
      const beforePublish = new Date()
      const published = await publishForm(testFormId)
      const afterPublish = new Date()

      expect(published.published_at).not.toBeNull()
      const publishedAt = new Date(published.published_at!)
      expect(publishedAt).toBeInstanceOf(Date)
      expect(publishedAt.getTime()).toBeGreaterThanOrEqual(beforePublish.getTime())
      expect(publishedAt.getTime()).toBeLessThanOrEqual(afterPublish.getTime())
    })

    test('does not change version number', async () => {
      const published = await publishForm(testFormId)

      expect(published.version).toBe(1)
    })

    test('does not change valid_until (remains NULL)', async () => {
      const published = await publishForm(testFormId)

      expect(published.valid_until).toBeNull()
    })

    test('throws error if form not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      await expect(publishForm(nonExistentId)).rejects.toThrow()
    })

    test('can publish an already published form (idempotent)', async () => {
      // Publish once
      await publishForm(testFormId)

      // Publish again - should not error
      const published = await publishForm(testFormId)

      expect(published.is_published).toBe(true)
    })
  })

  describe('updateForm() - Cosmetic Changes', () => {
    test('updates title in-place (no new version)', async () => {
      // Publish first
      await publishForm(testFormId)

      const updates: UpdateFormInput = {
        title: 'Updated Title'
      }

      const updated = await updateForm(testFormId, updates, false)

      expect(updated.id).toBe(testFormId) // Same ID
      expect(updated.title).toBe('Updated Title')
      expect(updated.version).toBe(1) // Version unchanged
      expect(updated.valid_until).toBeNull() // Still current
    })

    test('updates description in-place (no new version)', async () => {
      await publishForm(testFormId)

      const updates: UpdateFormInput = {
        description: 'Updated description'
      }

      const updated = await updateForm(testFormId, updates, false)

      expect(updated.id).toBe(testFormId)
      expect(updated.description).toBe('Updated description')
      expect(updated.version).toBe(1)
    })

    test('updates success message in-place (no new version)', async () => {
      await publishForm(testFormId)

      const updates: UpdateFormInput = {
        success_message: 'Custom success message'
      }

      const updated = await updateForm(testFormId, updates, false)

      expect(updated.id).toBe(testFormId)
      expect(updated.success_message).toBe('Custom success message')
      expect(updated.version).toBe(1)
    })

    test('allows cosmetic updates to unpublished forms', async () => {
      // Don't publish - update draft
      const updates: UpdateFormInput = {
        title: 'Draft Title Update'
      }

      const updated = await updateForm(testFormId, updates, false)

      expect(updated.title).toBe('Draft Title Update')
      expect(updated.is_published).toBe(false)
      expect(updated.version).toBe(1)
    })
  })

  describe('updateForm() - Structural Changes', () => {
    test('creates new version when updating published form structure', async () => {
      // Publish first
      await publishForm(testFormId)

      const beforeUpdate = new Date()

      const updates: UpdateFormInput = {
        form_data: {
          sections: [
            {
              id: '00000000-0000-0000-0000-000000000003',
              title: 'New Section',
              isExpanded: true,
              questions: []
            }
          ]
        }
      }

      const updated = await updateForm(testFormId, updates, true) // true = structural change

      const afterUpdate = new Date()

      // Should be a new version
      expect(updated.id).not.toBe(testFormId) // Different ID
      expect(updated.version).toBe(2) // Incremented
      expect(updated.original_form_id).toBe(testFormId) // Links to original
      expect(updated.valid_until).toBeNull() // New version is current

      // Check old version was closed
      const oldVersion = await supabaseAdmin
        .from('forms')
        .select('*')
        .eq('id', testFormId)
        .single()

      expect(oldVersion.data!.valid_until).not.toBeNull()
      const validUntil = new Date(oldVersion.data!.valid_until)
      expect(validUntil.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
      expect(validUntil.getTime()).toBeLessThanOrEqual(afterUpdate.getTime())
    })

    test('sets valid_from on new version', async () => {
      await publishForm(testFormId)

      const beforeUpdate = new Date()

      const updates: UpdateFormInput = {
        form_data: { sections: [] }
      }

      const updated = await updateForm(testFormId, updates, true)

      const afterUpdate = new Date()

      const validFrom = new Date(updated.valid_from)
      expect(validFrom.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
      expect(validFrom.getTime()).toBeLessThanOrEqual(afterUpdate.getTime())
    })

    test('copies all properties to new version', async () => {
      await publishForm(testFormId)

      const updates: UpdateFormInput = {
        form_data: { sections: [] }
      }

      const updated = await updateForm(testFormId, updates, true)

      // Should preserve original properties
      expect(updated.title).toBe('Test Form for Versioning')
      expect(updated.tenant_id).toBe(TENANT_A_ID)
      expect(updated.is_published).toBe(true)
      expect(updated.published_at).not.toBeNull()
    })

    test('allows structural updates to unpublished forms (no versioning)', async () => {
      // Don't publish - update draft
      const updates: UpdateFormInput = {
        form_data: {
          sections: [
            {
              id: '00000000-0000-0000-0000-000000000004',
              title: 'Draft Section Update',
              isExpanded: true,
              questions: []
            }
          ]
        }
      }

      const updated = await updateForm(testFormId, updates, true)

      // Should update in-place (not create new version)
      expect(updated.id).toBe(testFormId)
      expect(updated.version).toBe(1)
      expect(updated.is_published).toBe(false)
      expect(updated.form_data.sections[0].title).toBe('Draft Section Update')
    })
  })

  describe('Version History', () => {
    test('getFormVersions() returns all versions ordered by version desc', async () => {
      await publishForm(testFormId)

      // Create version 2
      await updateForm(testFormId, { form_data: { sections: [] } }, true)

      // Create version 3
      const v2 = await getForm(testFormId) // Get current version
      await updateForm(v2!.id, { form_data: { sections: [] } }, true)

      const versions = await getFormVersions(testFormId)

      expect(versions.length).toBe(3)
      expect(versions[0].version).toBe(3) // Newest first
      expect(versions[1].version).toBe(2)
      expect(versions[2].version).toBe(1)
    })

    test('all versions have same original_form_id', async () => {
      await publishForm(testFormId)

      await updateForm(testFormId, { form_data: { sections: [] } }, true)

      const versions = await getFormVersions(testFormId)

      // v1 has original_form_id = null (it IS the original)
      expect(versions.find(v => v.version === 1)!.original_form_id).toBeNull()

      // v2+ have original_form_id = v1.id
      expect(versions.find(v => v.version === 2)!.original_form_id).toBe(testFormId)
    })

    test('only current version has valid_until = NULL', async () => {
      await publishForm(testFormId)

      await updateForm(testFormId, { form_data: { sections: [] } }, true)

      const versions = await getFormVersions(testFormId)

      const currentVersions = versions.filter(v => v.valid_until === null)
      expect(currentVersions.length).toBe(1)
      expect(currentVersions[0].version).toBe(2) // Latest version
    })

    test('historical versions have valid_until timestamp', async () => {
      await publishForm(testFormId)

      await updateForm(testFormId, { form_data: { sections: [] } }, true)

      const versions = await getFormVersions(testFormId)

      const v1 = versions.find(v => v.version === 1)!
      expect(v1.valid_until).not.toBeNull()
    })
  })

  describe('Version Number Incrementing', () => {
    test('version increments sequentially', async () => {
      await publishForm(testFormId)

      const v2 = await updateForm(testFormId, { form_data: { sections: [] } }, true)
      expect(v2.version).toBe(2)

      const v3 = await updateForm(v2.id, { form_data: { sections: [] } }, true)
      expect(v3.version).toBe(3)

      const v4 = await updateForm(v3.id, { form_data: { sections: [] } }, true)
      expect(v4.version).toBe(4)
    })
  })
})
