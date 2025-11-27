/**
 * Tests for DAL pagination functionality
 *
 * Tests the paginated data access layer functions for contacts, companies, and interactions.
 * These tests verify:
 * - Basic pagination (correct number of records per page)
 * - Page boundaries (first/last page offsets)
 * - Search + pagination (filtered results paginate correctly)
 * - Total count accuracy (reflects filtered results)
 * - Empty results handling
 * - Tenant isolation (RLS respected)
 * - Cross-page search (can find records on any page)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('DAL Pagination', () => {
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const testUserIds = new Set<string>()

  // Test tenant IDs (using existing synthetic tenants)
  const acmeTenantId = '11111111-1111-1111-1111-111111111111'
  const betaTenantId = '22222222-2222-2222-2222-222222222222'

  let acmeUserId: string
  let betaUserId: string

  beforeAll(async () => {
    // Create test users for both tenants
    const { data: acmeAuth, error: acmeError } = await adminClient.auth.admin.createUser({
      email: `pagination-acme-${Date.now()}@test.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        tenant_id: acmeTenantId,
        first_name: 'Acme',
        last_name: 'Pagination'
      }
    })

    if (acmeError || !acmeAuth.user) {
      throw new Error('Failed to create Acme test user')
    }
    acmeUserId = acmeAuth.user.id
    testUserIds.add(acmeUserId)

    const { data: betaAuth, error: betaError } = await adminClient.auth.admin.createUser({
      email: `pagination-beta-${Date.now()}@test.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        tenant_id: betaTenantId,
        first_name: 'Beta',
        last_name: 'Pagination'
      }
    })

    if (betaError || !betaAuth.user) {
      throw new Error('Failed to create Beta test user')
    }
    betaUserId = betaAuth.user.id
    testUserIds.add(betaUserId)

    // Create test data for Acme tenant (60 contacts for pagination testing)
    const contactsToCreate = []
    for (let i = 1; i <= 60; i++) {
      contactsToCreate.push({
        tenant_id: acmeTenantId,
        first_name: `Contact${i}`,
        last_name: `Test`,
        phone: `555-000${i.toString().padStart(2, '0')}`
      })
    }

    await adminClient.from('contacts').insert(contactsToCreate)

    // Create test companies for Acme tenant (40 companies)
    const companiesToCreate = []
    for (let i = 1; i <= 40; i++) {
      companiesToCreate.push({
        tenant_id: acmeTenantId,
        business_name: `Company ${i} Test`,
        email: `company${i}@test.com`
      })
    }

    await adminClient.from('companies').insert(companiesToCreate)

    // Create test interactions for Acme tenant (30 interactions)
    const interactionsToCreate = []
    for (let i = 1; i <= 30; i++) {
      interactionsToCreate.push({
        tenant_id: acmeTenantId,
        title: `Meeting ${i} Test`,
        interaction_type: 'meeting',
        meeting_date: new Date(2024, 0, i).toISOString(),
        summary: `Test meeting ${i} summary`
      })
    }

    await adminClient.from('interactions').insert(interactionsToCreate)
  })

  afterAll(async () => {
    // Clean up test data (CASCADE will delete related records)
    await adminClient.from('contacts').delete().eq('tenant_id', acmeTenantId).ilike('last_name', 'Test')
    await adminClient.from('companies').delete().eq('tenant_id', acmeTenantId).ilike('business_name', '%Test')
    await adminClient.from('interactions').delete().eq('tenant_id', acmeTenantId).ilike('title', '%Test')

    // Delete test users
    for (const userId of testUserIds) {
      await adminClient.auth.admin.deleteUser(userId)
    }
    testUserIds.clear()
  })

  describe('Contacts Pagination', () => {
    test('returns correct number of records per page', async () => {
      const { getContactsPaginated } = await import('../../lib/dal/contacts')

      // Mock authentication
      process.env.TEST_USER_ID = acmeUserId

      const result = await getContactsPaginated({
        page: 1,
        pageSize: 20
      })

      expect(result.contacts).toHaveLength(20)
      expect(result.totalCount).toBeGreaterThanOrEqual(60)
    })

    test('page boundaries work correctly', async () => {
      const { getContactsPaginated } = await import('../../lib/dal/contacts')
      process.env.TEST_USER_ID = acmeUserId

      // First page
      const page1 = await getContactsPaginated({ page: 1, pageSize: 20 })
      expect(page1.contacts).toHaveLength(20)

      // Second page
      const page2 = await getContactsPaginated({ page: 2, pageSize: 20 })
      expect(page2.contacts).toHaveLength(20)

      // Last page (should have remaining records)
      const totalPages = Math.ceil(page1.totalCount / 20)
      const lastPage = await getContactsPaginated({ page: totalPages, pageSize: 20 })
      expect(lastPage.contacts.length).toBeLessThanOrEqual(20)

      // Verify no overlap between pages
      const page1Ids = page1.contacts.map(c => c.id)
      const page2Ids = page2.contacts.map(c => c.id)
      const overlap = page1Ids.filter(id => page2Ids.includes(id))
      expect(overlap).toHaveLength(0)
    })

    test('search + pagination works correctly', async () => {
      const { getContactsPaginated } = await import('../../lib/dal/contacts')
      process.env.TEST_USER_ID = acmeUserId

      const result = await getContactsPaginated({
        search: 'Contact1',
        page: 1,
        pageSize: 10
      })

      // Should find Contact1, Contact10, Contact11...Contact19 = 11 total
      expect(result.totalCount).toBeGreaterThanOrEqual(11)
      expect(result.contacts.length).toBeLessThanOrEqual(10)

      // Verify all results match search
      result.contacts.forEach(contact => {
        expect(contact.first_name).toContain('Contact1')
      })
    })

    test('total count reflects filtered results', async () => {
      const { getContactsPaginated } = await import('../../lib/dal/contacts')
      process.env.TEST_USER_ID = acmeUserId

      // All contacts
      const allResult = await getContactsPaginated({ page: 1, pageSize: 100 })
      expect(allResult.totalCount).toBeGreaterThanOrEqual(60)

      // Filtered contacts
      const filteredResult = await getContactsPaginated({
        search: 'Contact5',
        page: 1,
        pageSize: 100
      })

      // Should find Contact5, Contact50, Contact51...Contact59 = 11 total
      expect(filteredResult.totalCount).toBeLessThan(allResult.totalCount)
      expect(filteredResult.totalCount).toBeGreaterThanOrEqual(11)
    })

    test('handles empty results', async () => {
      const { getContactsPaginated } = await import('../../lib/dal/contacts')
      process.env.TEST_USER_ID = acmeUserId

      const result = await getContactsPaginated({
        search: 'NonExistentContact999',
        page: 1,
        pageSize: 20
      })

      expect(result.contacts).toHaveLength(0)
      expect(result.totalCount).toBe(0)
    })

    test('respects tenant isolation', async () => {
      const { getContactsPaginated } = await import('../../lib/dal/contacts')

      // Acme tenant should see their contacts
      process.env.TEST_USER_ID = acmeUserId
      const acmeResult = await getContactsPaginated({ page: 1, pageSize: 100 })
      expect(acmeResult.totalCount).toBeGreaterThanOrEqual(60)

      // Beta tenant should NOT see Acme's test contacts
      process.env.TEST_USER_ID = betaUserId
      const betaResult = await getContactsPaginated({
        search: 'Test',
        page: 1,
        pageSize: 100
      })
      expect(betaResult.totalCount).toBe(0)
    })

    test('can find records on any page when searching', async () => {
      const { getContactsPaginated } = await import('../../lib/dal/contacts')
      process.env.TEST_USER_ID = acmeUserId

      // Search for a contact that would be on page 3 if not filtered
      const result = await getContactsPaginated({
        search: 'Contact50',
        page: 1,
        pageSize: 20
      })

      // Should find Contact50, Contact51...Contact59
      expect(result.totalCount).toBeGreaterThanOrEqual(10)
      expect(result.contacts.some(c => c.first_name === 'Contact50')).toBe(true)
    })
  })

  describe('Companies Pagination', () => {
    test('returns correct number of records per page', async () => {
      const { getCompaniesPaginated } = await import('../../lib/dal/companies')
      process.env.TEST_USER_ID = acmeUserId

      const result = await getCompaniesPaginated({
        page: 1,
        pageSize: 15
      })

      expect(result.companies).toHaveLength(15)
      expect(result.totalCount).toBeGreaterThanOrEqual(40)
    })

    test('search + pagination works correctly', async () => {
      const { getCompaniesPaginated } = await import('../../lib/dal/companies')
      process.env.TEST_USER_ID = acmeUserId

      const result = await getCompaniesPaginated({
        search: 'Company 1',
        page: 1,
        pageSize: 10
      })

      // Should find Company 1, Company 10, Company 11...Company 19 = 11 total
      expect(result.totalCount).toBeGreaterThanOrEqual(11)

      // Verify all results match search
      result.companies.forEach(company => {
        expect(company.business_name).toContain('Company 1')
      })
    })

    test('respects tenant isolation', async () => {
      const { getCompaniesPaginated } = await import('../../lib/dal/companies')

      // Acme tenant should see their companies
      process.env.TEST_USER_ID = acmeUserId
      const acmeResult = await getCompaniesPaginated({ page: 1, pageSize: 100 })
      expect(acmeResult.totalCount).toBeGreaterThanOrEqual(40)

      // Beta tenant should NOT see Acme's test companies
      process.env.TEST_USER_ID = betaUserId
      const betaResult = await getCompaniesPaginated({
        search: 'Test',
        page: 1,
        pageSize: 100
      })
      expect(betaResult.totalCount).toBe(0)
    })
  })

  describe('Interactions Pagination', () => {
    test('returns correct number of records per page', async () => {
      const { getInteractionsPaginated } = await import('../../lib/dal/interactions')
      process.env.TEST_USER_ID = acmeUserId

      const result = await getInteractionsPaginated({
        page: 1,
        pageSize: 10
      })

      expect(result.interactions).toHaveLength(10)
      expect(result.totalCount).toBeGreaterThanOrEqual(30)
    })

    test('search + pagination works correctly', async () => {
      const { getInteractionsPaginated } = await import('../../lib/dal/interactions')
      process.env.TEST_USER_ID = acmeUserId

      const result = await getInteractionsPaginated({
        search: 'Meeting 1',
        page: 1,
        pageSize: 10
      })

      // Should find Meeting 1, Meeting 10, Meeting 11...Meeting 19 = 11 total
      expect(result.totalCount).toBeGreaterThanOrEqual(11)

      // Verify all results match search
      result.interactions.forEach(interaction => {
        expect(interaction.title).toContain('Meeting 1')
      })
    })

    test('respects tenant isolation', async () => {
      const { getInteractionsPaginated } = await import('../../lib/dal/interactions')

      // Acme tenant should see their interactions
      process.env.TEST_USER_ID = acmeUserId
      const acmeResult = await getInteractionsPaginated({ page: 1, pageSize: 100 })
      expect(acmeResult.totalCount).toBeGreaterThanOrEqual(30)

      // Beta tenant should NOT see Acme's test interactions
      process.env.TEST_USER_ID = betaUserId
      const betaResult = await getInteractionsPaginated({
        search: 'Test',
        page: 1,
        pageSize: 100
      })
      expect(betaResult.totalCount).toBe(0)
    })
  })
})
