/**
 * Contact Emails CRUD Tests
 *
 * Tests for email management operations on contacts.
 * Following TDD: These tests should FAIL initially, then PASS after implementation.
 */

import { createClient } from '@supabase/supabase-js'
import {
  createContact,
  addContactEmail,
  updateContactEmail,
  deleteContactEmail,
  setPrimaryEmail,
  getContact
} from '@/lib/dal/contacts'

// Test setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminClient = createClient(supabaseUrl, supabaseServiceKey)

// Track test user IDs for cleanup
const testUserIds = new Set<string>()
const testContactIds = new Set<string>()

// Helper: Create test user and contact
async function createTestContact(firstName: string, lastName: string, tenantId: string = '11111111-1111-1111-1111-111111111111') {
  // Create auth user
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
    password: 'test-password-123',
    email_confirm: true,
    user_metadata: {
      tenant_id: tenantId,
      first_name: firstName,
      last_name: lastName
    }
  })

  if (authError) throw authError
  testUserIds.add(authUser.user.id)

  // Create contact
  const { data: contact, error: contactError } = await adminClient
    .from('contacts')
    .insert({
      tenant_id: tenantId,
      first_name: firstName,
      last_name: lastName
    })
    .select()
    .single()

  if (contactError) throw contactError
  testContactIds.add(contact.id)

  return contact
}

// Cleanup after each test
afterEach(async () => {
  // Delete test contacts
  for (const contactId of testContactIds) {
    await adminClient.from('contacts').delete().eq('id', contactId)
  }
  testContactIds.clear()

  // Delete test users
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

describe('addContactEmail', () => {
  it('should add email to contact successfully', async () => {
    const contact = await createTestContact('John', 'Doe')

    const { data: email, error } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'john@example.com',
        is_primary: true,
        email_type: 'work'
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(email.email).toBe('john@example.com')
    expect(email.is_primary).toBe(true)
    expect(email.email_type).toBe('work')
  })

  it('should enforce only one primary email per contact', async () => {
    const contact = await createTestContact('Jane', 'Smith')

    // Add first primary email
    await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'jane1@example.com',
        is_primary: true
      })

    // Try to add second primary email - should fail due to unique index
    const { error } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'jane2@example.com',
        is_primary: true
      })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23505') // Unique constraint violation
  })

  it('should prevent duplicate emails for same contact', async () => {
    const contact = await createTestContact('Bob', 'Jones')

    // Add first email
    await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'bob@example.com',
        is_primary: true
      })

    // Try to add duplicate email
    const { error } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'bob@example.com',
        is_primary: false
      })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23505') // Unique constraint violation
  })

  it('should allow same email for different contacts', async () => {
    const contact1 = await createTestContact('Alice', 'Williams')
    const contact2 = await createTestContact('Alice', 'Johnson')

    // Add same email to both contacts (different people, same email)
    const { error: error1 } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact1.id,
        email: 'alice@company.com',
        is_primary: true
      })

    const { error: error2 } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact2.id,
        email: 'alice@company.com',
        is_primary: true
      })

    // Both should succeed - different contacts
    expect(error1).toBeNull()
    expect(error2).toBeNull()
  })
})

describe('updateContactEmail', () => {
  it('should update email address', async () => {
    const contact = await createTestContact('Alice', 'Williams')

    const { data: email } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'alice@old.com',
        is_primary: true
      })
      .select()
      .single()

    const { data: updated, error } = await adminClient
      .from('contact_emails')
      .update({ email: 'alice@new.com' })
      .eq('id', email.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated.email).toBe('alice@new.com')
  })

  it('should update email type', async () => {
    const contact = await createTestContact('Tom', 'Brown')

    const { data: email } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'tom@example.com',
        is_primary: true,
        email_type: 'work'
      })
      .select()
      .single()

    const { data: updated, error } = await adminClient
      .from('contact_emails')
      .update({ email_type: 'personal' })
      .eq('id', email.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated.email_type).toBe('personal')
  })
})

describe('setPrimaryEmail', () => {
  it('should allow changing primary email', async () => {
    const contact = await createTestContact('Sarah', 'Davis')

    // Add two emails
    const { data: email1 } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'sarah1@example.com',
        is_primary: true
      })
      .select()
      .single()

    const { data: email2 } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'sarah2@example.com',
        is_primary: false
      })
      .select()
      .single()

    // Unset email1, set email2 as primary
    await adminClient
      .from('contact_emails')
      .update({ is_primary: false })
      .eq('id', email1.id)

    const { error } = await adminClient
      .from('contact_emails')
      .update({ is_primary: true })
      .eq('id', email2.id)

    expect(error).toBeNull()

    // Verify only email2 is primary
    const { data: emails } = await adminClient
      .from('contact_emails')
      .select('*')
      .eq('contact_id', contact.id)

    const primary = emails?.filter(e => e.is_primary)
    expect(primary).toHaveLength(1)
    expect(primary?.[0].id).toBe(email2.id)
  })
})

describe('deleteContactEmail', () => {
  it('should delete email successfully', async () => {
    const contact = await createTestContact('Mike', 'Wilson')

    const { data: email } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'mike@example.com',
        is_primary: true
      })
      .select()
      .single()

    const { error } = await adminClient
      .from('contact_emails')
      .delete()
      .eq('id', email.id)

    expect(error).toBeNull()

    // Verify email is deleted
    const { data: remaining } = await adminClient
      .from('contact_emails')
      .select('*')
      .eq('contact_id', contact.id)

    expect(remaining).toHaveLength(0)
  })

  it('should cascade delete emails when contact is deleted', async () => {
    const contact = await createTestContact('Delete', 'Test')

    // Add email
    await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'delete@example.com',
        is_primary: true
      })

    // Delete contact
    await adminClient
      .from('contacts')
      .delete()
      .eq('id', contact.id)

    // Verify email is also deleted (CASCADE)
    const { data: emails } = await adminClient
      .from('contact_emails')
      .select('*')
      .eq('contact_id', contact.id)

    expect(emails).toHaveLength(0)
  })
})

describe('Email validation', () => {
  it('should enforce valid email format', async () => {
    const contact = await createTestContact('Format', 'Test')

    const { error } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'invalid-email',
        is_primary: true
      })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514') // Check constraint violation
  })

  it('should enforce valid email_type values', async () => {
    const contact = await createTestContact('Type', 'Test')

    const { error } = await adminClient
      .from('contact_emails')
      .insert({
        contact_id: contact.id,
        email: 'test@example.com',
        email_type: 'invalid_type' as any, // Force invalid type
        is_primary: true
      })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('23514') // Check constraint violation
  })
})
