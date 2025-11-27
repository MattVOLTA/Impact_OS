/**
 * Tests for Company Program Enrollment Filtering
 *
 * Tests Phase 1 implementation: DAL with program enrollment data
 * Validates filtering by enrollment status and program ID
 */

import { createClient } from '@supabase/supabase-js'
import { getCompaniesPaginated } from '@/lib/dal/companies'
import { createProgram, enrollCompany } from '@/lib/dal/programs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Track test users for cleanup
const testUserIds = new Set<string>()

// Helper to create test user and get auth client
async function createTestUser(email: string, tenantId: string) {
  const password = 'testpassword123'

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      tenant_id: tenantId,
      first_name: 'Test',
      last_name: 'User'
    }
  })

  if (authError) throw authError
  testUserIds.add(authData.user.id)

  // Sign in to get session
  const { data: sessionData, error: sessionError } = await adminClient.auth.signInWithPassword({
    email,
    password
  })

  if (sessionError) throw sessionError

  return {
    userId: authData.user.id,
    accessToken: sessionData.session.access_token
  }
}

// Cleanup after each test
afterEach(async () => {
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

describe('Company Program Enrollment Filtering', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111' // Acme tenant

  describe('Program Counts', () => {
    it('should return companies with program enrollment counts', async () => {
      // This test uses existing data from the seed
      const { accessToken } = await createTestUser('test-counts@example.com', tenantId)

      // Mock cookies for Next.js
      global.cookies = jest.fn(() => ({
        get: jest.fn(() => ({
          name: 'sb-access-token',
          value: accessToken
        }))
      })) as any

      const result = await getCompaniesPaginated({
        page: 1,
        pageSize: 10
      })

      expect(result.companies).toBeDefined()
      expect(result.totalCount).toBeGreaterThan(0)

      // Check that program counts are included
      result.companies.forEach(company => {
        expect(company).toHaveProperty('active_programs_count')
        expect(company).toHaveProperty('alumni_programs_count')
        expect(typeof company.active_programs_count).toBe('number')
        expect(typeof company.alumni_programs_count).toBe('number')
      })
    })

    it('should correctly count active vs alumni programs', async () => {
      const { accessToken } = await createTestUser('test-active-alumni@example.com', tenantId)

      global.cookies = jest.fn(() => ({
        get: jest.fn(() => ({
          name: 'sb-access-token',
          value: accessToken
        }))
      })) as any

      // Create a test company
      const { data: company, error: companyError } = await adminClient
        .from('companies')
        .insert({
          tenant_id: tenantId,
          business_name: 'Test Company for Counts'
        })
        .select()
        .single()

      expect(companyError).toBeNull()
      expect(company).toBeDefined()

      // Create two programs
      const { data: program1 } = await adminClient
        .from('programs')
        .insert({
          tenant_id: tenantId,
          name: 'Active Program'
        })
        .select()
        .single()

      const { data: program2 } = await adminClient
        .from('programs')
        .insert({
          tenant_id: tenantId,
          name: 'Alumni Program'
        })
        .select()
        .single()

      // Enroll in active program (no end date)
      await adminClient
        .from('company_program_enrollments')
        .insert({
          company_id: company.id,
          program_id: program1.id,
          start_date: '2024-01-01',
          end_date: null // Active
        })

      // Enroll in alumni program (past end date)
      await adminClient
        .from('company_program_enrollments')
        .insert({
          company_id: company.id,
          program_id: program2.id,
          start_date: '2023-01-01',
          end_date: '2023-12-31' // Alumni
        })

      // Fetch companies
      const result = await getCompaniesPaginated({
        page: 1,
        pageSize: 50,
        search: 'Test Company for Counts'
      })

      const testCompany = result.companies.find(c => c.id === company.id)
      expect(testCompany).toBeDefined()
      expect(testCompany!.active_programs_count).toBe(1)
      expect(testCompany!.alumni_programs_count).toBe(1)

      // Cleanup
      await adminClient.from('company_program_enrollments').delete().eq('company_id', company.id)
      await adminClient.from('programs').delete().eq('id', program1.id)
      await adminClient.from('programs').delete().eq('id', program2.id)
      await adminClient.from('companies').delete().eq('id', company.id)
    })
  })

  describe('Enrollment Status Filtering', () => {
    it('should filter companies by active enrollment status', async () => {
      const { accessToken } = await createTestUser('test-filter-active@example.com', tenantId)

      global.cookies = jest.fn(() => ({
        get: jest.fn(() => ({
          name: 'sb-access-token',
          value: accessToken
        }))
      })) as any

      const result = await getCompaniesPaginated({
        page: 1,
        pageSize: 50,
        enrollmentStatus: 'active'
      })

      expect(result.companies).toBeDefined()

      // All returned companies should have at least one active enrollment
      result.companies.forEach(company => {
        expect(company.active_programs_count).toBeGreaterThan(0)
      })
    })

    it('should filter companies by alumni enrollment status', async () => {
      const { accessToken } = await createTestUser('test-filter-alumni@example.com', tenantId)

      global.cookies = jest.fn(() => ({
        get: jest.fn(() => ({
          name: 'sb-access-token',
          value: accessToken
        }))
      })) as any

      const result = await getCompaniesPaginated({
        page: 1,
        pageSize: 50,
        enrollmentStatus: 'alumni'
      })

      expect(result.companies).toBeDefined()

      // All returned companies should have alumni but NO active enrollments
      result.companies.forEach(company => {
        expect(company.active_programs_count).toBe(0)
        expect(company.alumni_programs_count).toBeGreaterThan(0)
      })
    })

    it('should filter companies by not enrolled status', async () => {
      const { accessToken } = await createTestUser('test-filter-not-enrolled@example.com', tenantId)

      global.cookies = jest.fn(() => ({
        get: jest.fn(() => ({
          name: 'sb-access-token',
          value: accessToken
        }))
      })) as any

      const result = await getCompaniesPaginated({
        page: 1,
        pageSize: 50,
        enrollmentStatus: 'not_enrolled'
      })

      expect(result.companies).toBeDefined()

      // All returned companies should have NO enrollments
      result.companies.forEach(company => {
        expect(company.active_programs_count).toBe(0)
        expect(company.alumni_programs_count).toBe(0)
      })
    })
  })

  describe('Program ID Filtering', () => {
    it('should filter companies by specific program', async () => {
      const { accessToken } = await createTestUser('test-filter-program@example.com', tenantId)

      global.cookies = jest.fn(() => ({
        get: jest.fn(() => ({
          name: 'sb-access-token',
          value: accessToken
        }))
      })) as any

      // Get first program from database
      const { data: programs } = await adminClient
        .from('programs')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1)

      if (!programs || programs.length === 0) {
        console.log('Skipping test - no programs available')
        return
      }

      const programId = programs[0].id

      const result = await getCompaniesPaginated({
        page: 1,
        pageSize: 50,
        programId
      })

      expect(result.companies).toBeDefined()

      // Verify all returned companies are enrolled in this program
      for (const company of result.companies) {
        const { data: enrollment } = await adminClient
          .from('company_program_enrollments')
          .select('*')
          .eq('company_id', company.id)
          .eq('program_id', programId)
          .maybeSingle()

        expect(enrollment).toBeDefined()
      }
    })
  })

  describe('Combined Filtering', () => {
    it('should filter by both program ID and active status', async () => {
      const { accessToken } = await createTestUser('test-combined@example.com', tenantId)

      global.cookies = jest.fn(() => ({
        get: jest.fn(() => ({
          name: 'sb-access-token',
          value: accessToken
        }))
      })) as any

      // Get first program
      const { data: programs } = await adminClient
        .from('programs')
        .select('id')
        .eq('tenant_id', tenantId)
        .limit(1)

      if (!programs || programs.length === 0) {
        console.log('Skipping test - no programs available')
        return
      }

      const programId = programs[0].id

      const result = await getCompaniesPaginated({
        page: 1,
        pageSize: 50,
        programId,
        enrollmentStatus: 'active'
      })

      expect(result.companies).toBeDefined()

      // Verify companies are actively enrolled in this specific program
      const today = new Date().toISOString().split('T')[0]

      for (const company of result.companies) {
        const { data: enrollment } = await adminClient
          .from('company_program_enrollments')
          .select('*')
          .eq('company_id', company.id)
          .eq('program_id', programId)
          .maybeSingle()

        expect(enrollment).toBeDefined()

        // Check enrollment is active
        const isActive = !enrollment!.end_date || enrollment!.end_date >= today
        expect(isActive).toBe(true)
      }
    })

    it('should combine search with enrollment status filter', async () => {
      const { accessToken } = await createTestUser('test-search-filter@example.com', tenantId)

      global.cookies = jest.fn(() => ({
        get: jest.fn(() => ({
          name: 'sb-access-token',
          value: accessToken
        }))
      })) as any

      const result = await getCompaniesPaginated({
        page: 1,
        pageSize: 50,
        search: 'Tech',
        enrollmentStatus: 'active'
      })

      expect(result.companies).toBeDefined()

      // Verify companies match search AND have active enrollments
      result.companies.forEach(company => {
        expect(company.business_name.toLowerCase()).toContain('tech')
        expect(company.active_programs_count).toBeGreaterThan(0)
      })
    })
  })

  describe('Pagination with Filters', () => {
    it('should correctly paginate filtered results', async () => {
      const { accessToken } = await createTestUser('test-pagination@example.com', tenantId)

      global.cookies = jest.fn(() => ({
        get: jest.fn(() => ({
          name: 'sb-access-token',
          value: accessToken
        }))
      })) as any

      // Get page 1
      const page1 = await getCompaniesPaginated({
        page: 1,
        pageSize: 2,
        enrollmentStatus: 'all'
      })

      // Get page 2
      const page2 = await getCompaniesPaginated({
        page: 2,
        pageSize: 2,
        enrollmentStatus: 'all'
      })

      expect(page1.companies).toHaveLength(2)
      expect(page2.companies.length).toBeGreaterThanOrEqual(0)

      // Verify no overlap
      const page1Ids = page1.companies.map(c => c.id)
      const page2Ids = page2.companies.map(c => c.id)

      page2Ids.forEach(id => {
        expect(page1Ids).not.toContain(id)
      })
    })
  })

  describe('Tenant Isolation', () => {
    it('should only return companies for authenticated tenant', async () => {
      const tenantId1 = '11111111-1111-1111-1111-111111111111' // Acme
      const tenantId2 = '22222222-2222-2222-2222-222222222222' // Beta

      const { accessToken: token1 } = await createTestUser('test-tenant1@example.com', tenantId1)

      global.cookies = jest.fn(() => ({
        get: jest.fn(() => ({
          name: 'sb-access-token',
          value: token1
        }))
      })) as any

      const result1 = await getCompaniesPaginated({ page: 1, pageSize: 50 })

      // Verify all companies belong to tenant1
      result1.companies.forEach(company => {
        expect(company.tenant_id).toBe(tenantId1)
      })

      // Now test with tenant2
      const { accessToken: token2 } = await createTestUser('test-tenant2@example.com', tenantId2)

      global.cookies = jest.fn(() => ({
        get: jest.fn(() => ({
          name: 'sb-access-token',
          value: token2
        }))
      })) as any

      const result2 = await getCompaniesPaginated({ page: 1, pageSize: 50 })

      // Verify all companies belong to tenant2
      result2.companies.forEach(company => {
        expect(company.tenant_id).toBe(tenantId2)
      })

      // Verify no overlap
      const ids1 = result1.companies.map(c => c.id)
      const ids2 = result2.companies.map(c => c.id)

      ids2.forEach(id => {
        expect(ids1).not.toContain(id)
      })
    })
  })
})
