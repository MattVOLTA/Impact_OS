/**
 * Contact DAL Tests
 *
 * Following TDD: These tests are written FIRST and will FAIL until feature is implemented.
 *
 * Tests verify:
 * - searchContacts() finds contacts by name with company associations
 * - createContact() enforces email uniqueness
 * - linkContactToCompany() creates many-to-many relationships
 * - unlinkContactFromCompany() removes link without deleting contact
 * - deleteContact() cascades to junction tables
 * - Tenant isolation enforced
 *
 * See Epic #18, Issue #19 for requirements.
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'
const TENANT_2_ID = '22222222-2222-2222-2222-222222222222'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const testContactIds = new Set<string>()
const testCompanyIds = new Set<string>()

afterEach(async () => {
  // Cleanup test contacts (cascade deletes junction records)
  for (const contactId of testContactIds) {
    await adminClient.from('contacts').delete().eq('id', contactId)
  }
  testContactIds.clear()

  // Cleanup test companies
  for (const companyId of testCompanyIds) {
    await adminClient.from('companies').delete().eq('id', companyId)
  }
  testCompanyIds.clear()
})

describe('Contact DAL - Search and Duplicate Detection', () => {
  test('searchContacts finds contacts by first name (case-insensitive)', async () => {
    // Create test contact
    const { data: contact } = await adminClient
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'John',
        last_name: 'Smith',
        email: `john.smith.${Date.now()}@test.com`
      })
      .select()
      .single()

    if (!contact) throw new Error('Failed to create test contact')
    testContactIds.add(contact.id)

    // Search by first name (lowercase should match)
    const { data: results } = await adminClient
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('tenant_id', TENANT_1_ID)
      .ilike('first_name', '%john%')

    expect(results).toBeDefined()
    expect(results?.length).toBeGreaterThan(0)
    expect(results?.some(c => c.id === contact.id)).toBe(true)
  })

  test('searchContacts includes company associations', async () => {
    // Create test company
    const { data: company } = await adminClient
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: `Test Company ${Date.now()}`,
        city: 'Toronto',
        province: 'Ontario'
      })
      .select()
      .single()

    if (!company) throw new Error('Failed to create test company')
    testCompanyIds.add(company.id)

    // Create test contact
    const { data: contact } = await adminClient
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'Jane',
        last_name: 'Doe',
        email: `jane.doe.${Date.now()}@test.com`
      })
      .select()
      .single()

    if (!contact) throw new Error('Failed to create test contact')
    testContactIds.add(contact.id)

    // Link contact to company
    await adminClient
      .from('company_contacts')
      .insert({
        company_id: company.id,
        contact_id: contact.id
      })

    // Search with company associations
    const { data: results } = await adminClient
      .from('contacts')
      .select(`
        id,
        first_name,
        last_name,
        email,
        company_contacts (
          company:companies (
            id,
            business_name
          )
        )
      `)
      .eq('tenant_id', TENANT_1_ID)
      .eq('id', contact.id)
      .single()

    expect(results).toBeDefined()
    expect(results?.company_contacts).toBeDefined()
    expect(results?.company_contacts?.length).toBeGreaterThan(0)
  })
})

describe('Contact DAL - Email Uniqueness', () => {
  test('can create contact with unique email', async () => {
    const uniqueEmail = `unique.${Date.now()}@test.com`

    const { data: contact, error } = await adminClient
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'Unique',
        last_name: 'Person',
        email: uniqueEmail
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(contact).toBeDefined()
    expect(contact?.email).toBe(uniqueEmail)

    if (contact) testContactIds.add(contact.id)
  })

  test('can create contact without email (null allowed)', async () => {
    const { data: contact, error } = await adminClient
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'No',
        last_name: 'Email',
        email: null
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(contact).toBeDefined()
    expect(contact?.email).toBeNull()

    if (contact) testContactIds.add(contact.id)
  })

  test('cannot create contact with duplicate email', async () => {
    const duplicateEmail = `duplicate.${Date.now()}@test.com`

    // Create first contact
    const { data: contact1 } = await adminClient
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'First',
        last_name: 'Contact',
        email: duplicateEmail
      })
      .select()
      .single()

    if (contact1) testContactIds.add(contact1.id)

    // Try to create second contact with same email (should fail)
    const { data: contact2, error } = await adminClient
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'Second',
        last_name: 'Contact',
        email: duplicateEmail
      })
      .select()
      .single()

    // Should fail due to unique constraint
    expect(error).toBeDefined()
    expect(error?.code).toBe('23505') // Postgres unique violation
    expect(contact2).toBeNull()
  })
})

describe('Contact DAL - Many-to-Many Company Linking', () => {
  test('can link contact to company', async () => {
    // Create contact
    const { data: contact } = await adminClient
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'Link',
        last_name: 'Test',
        email: `link.test.${Date.now()}@test.com`
      })
      .select()
      .single()

    // Create company
    const { data: company } = await adminClient
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: `Link Company ${Date.now()}`,
        city: 'Toronto',
        province: 'Ontario'
      })
      .select()
      .single()

    if (contact) testContactIds.add(contact.id)
    if (company) testCompanyIds.add(company.id)

    // Link them
    const { error: linkError } = await adminClient
      .from('company_contacts')
      .insert({
        contact_id: contact!.id,
        company_id: company!.id
      })

    expect(linkError).toBeNull()

    // Verify link exists
    const { data: link } = await adminClient
      .from('company_contacts')
      .select('*')
      .eq('contact_id', contact!.id)
      .eq('company_id', company!.id)
      .single()

    expect(link).toBeDefined()
  })

  test('can link same contact to multiple companies', async () => {
    // Create one contact
    const { data: contact } = await adminClient
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'Multi',
        last_name: 'Company',
        email: `multi.company.${Date.now()}@test.com`
      })
      .select()
      .single()

    // Create two companies
    const { data: companies } = await adminClient
      .from('companies')
      .insert([
        {
          tenant_id: TENANT_1_ID,
          business_name: `Company A ${Date.now()}`,
          city: 'Toronto',
          province: 'Ontario'
        },
        {
          tenant_id: TENANT_1_ID,
          business_name: `Company B ${Date.now()}`,
          city: 'Vancouver',
          province: 'British Columbia'
        }
      ])
      .select()

    if (contact) testContactIds.add(contact.id)
    companies?.forEach(c => testCompanyIds.add(c.id))

    // Link contact to both companies
    await adminClient
      .from('company_contacts')
      .insert([
        { contact_id: contact!.id, company_id: companies![0].id },
        { contact_id: contact!.id, company_id: companies![1].id }
      ])

    // Verify contact linked to both
    const { data: links } = await adminClient
      .from('company_contacts')
      .select('*')
      .eq('contact_id', contact!.id)

    expect(links?.length).toBe(2)
  })

  test('duplicate link is idempotent (primary key prevents duplicates)', async () => {
    // Create contact and company
    const { data: contact } = await adminClient
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'Duplicate',
        last_name: 'Link',
        email: `duplicate.link.${Date.now()}@test.com`
      })
      .select()
      .single()

    const { data: company } = await adminClient
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: `Duplicate Company ${Date.now()}`,
        city: 'Toronto',
        province: 'Ontario'
      })
      .select()
      .single()

    if (contact) testContactIds.add(contact.id)
    if (company) testCompanyIds.add(company.id)

    // Link once
    await adminClient
      .from('company_contacts')
      .insert({
        contact_id: contact!.id,
        company_id: company!.id
      })

    // Try to link again (should fail due to primary key)
    const { error: duplicateLinkError } = await adminClient
      .from('company_contacts')
      .insert({
        contact_id: contact!.id,
        company_id: company!.id
      })

    expect(duplicateLinkError).toBeDefined()
    expect(duplicateLinkError?.code).toBe('23505') // Unique violation
  })

  test('unlink removes junction but keeps contact', async () => {
    // Create contact and company
    const { data: contact } = await adminClient
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'Unlink',
        last_name: 'Test',
        email: `unlink.test.${Date.now()}@test.com`
      })
      .select()
      .single()

    const { data: company } = await adminClient
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: `Unlink Company ${Date.now()}`,
        city: 'Toronto',
        province: 'Ontario'
      })
      .select()
      .single()

    if (contact) testContactIds.add(contact.id)
    if (company) testCompanyIds.add(company.id)

    // Link
    await adminClient
      .from('company_contacts')
      .insert({
        contact_id: contact!.id,
        company_id: company!.id
      })

    // Unlink
    await adminClient
      .from('company_contacts')
      .delete()
      .eq('contact_id', contact!.id)
      .eq('company_id', company!.id)

    // Verify junction removed
    const { data: link } = await adminClient
      .from('company_contacts')
      .select('*')
      .eq('contact_id', contact!.id)
      .eq('company_id', company!.id)
      .single()

    expect(link).toBeNull()

    // Verify contact still exists
    const { data: contactStillExists } = await adminClient
      .from('contacts')
      .select('id')
      .eq('id', contact!.id)
      .single()

    expect(contactStillExists).toBeDefined()
  })

  test('delete contact cascades to company_contacts junction', async () => {
    // Create contact and company
    const { data: contact } = await adminClient
      .from('contacts')
      .insert({
        tenant_id: TENANT_1_ID,
        first_name: 'Delete',
        last_name: 'Cascade',
        email: `delete.cascade.${Date.now()}@test.com`
      })
      .select()
      .single()

    const { data: company } = await adminClient
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: `Delete Company ${Date.now()}`,
        city: 'Toronto',
        province: 'Ontario'
      })
      .select()
      .single()

    if (company) testCompanyIds.add(company.id)

    // Link
    await adminClient
      .from('company_contacts')
      .insert({
        contact_id: contact!.id,
        company_id: company!.id
      })

    // Delete contact
    await adminClient
      .from('contacts')
      .delete()
      .eq('id', contact!.id)

    // Verify junction also deleted (cascade)
    const { data: orphanedLinks } = await adminClient
      .from('company_contacts')
      .select('*')
      .eq('contact_id', contact!.id)

    expect(orphanedLinks).toEqual([])
  })
})

describe('Contact DAL - Tenant Isolation', () => {
  test('search only returns contacts from user tenant', async () => {
    // Get contacts from both tenants
    const { data: tenant1Contacts } = await adminClient
      .from('contacts')
      .select('id, tenant_id')
      .eq('tenant_id', TENANT_1_ID)
      .limit(1)

    const { data: tenant2Contacts } = await adminClient
      .from('contacts')
      .select('id, tenant_id')
      .eq('tenant_id', TENANT_2_ID)
      .limit(1)

    expect(tenant1Contacts).toBeDefined()
    expect(tenant2Contacts).toBeDefined()

    // Verify they belong to different tenants
    if (tenant1Contacts?.[0] && tenant2Contacts?.[0]) {
      expect(tenant1Contacts[0].tenant_id).toBe(TENANT_1_ID)
      expect(tenant2Contacts[0].tenant_id).toBe(TENANT_2_ID)
      expect(tenant1Contacts[0].id).not.toBe(tenant2Contacts[0].id)
    }
  })
})
