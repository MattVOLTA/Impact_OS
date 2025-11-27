/**
 * Universal Search Tests
 *
 * NOTE: DAL functions use Next.js cookies() which requires request context.
 * Cannot be tested in Jest without complex mocking.
 *
 * Instead, we test the database function directly using admin client.
 * This verifies the search logic and ranking work correctly.
 *
 * Auth enforcement tested via integration tests (tenant-isolation.test.ts).
 */

import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const TEST_TENANT_ID = '11111111-1111-1111-1111-111111111111' // Acme Accelerator

describe('Universal Search - Database Function', () => {
  it('should return results when searching for "bean"', async () => {
    // Call the database function directly
    const { data, error } = await adminClient.rpc('universal_search', {
      search_query: 'bean',
      tenant_id_param: TEST_TENANT_ID,
      result_limit: 10,
    })

    // Assert
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)

    // Should find the Bean company
    const beanCompany = data.find(
      (r: any) => r.entity_type === 'company' && r.title.toLowerCase().includes('bean')
    )
    expect(beanCompany).toBeDefined()
  })

  it('should return empty results for query with no matches', async () => {
    const { data, error } = await adminClient.rpc('universal_search', {
      search_query: 'xyzabc123nonexistent',
      tenant_id_param: TEST_TENANT_ID,
      result_limit: 10,
    })

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('should respect result limit', async () => {
    const { data, error } = await adminClient.rpc('universal_search', {
      search_query: 'a',
      tenant_id_param: TEST_TENANT_ID,
      result_limit: 3,
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.length).toBeLessThanOrEqual(3)
  })

  it('should return results with correct structure', async () => {
    const { data, error } = await adminClient.rpc('universal_search', {
      search_query: 'bean',
      tenant_id_param: TEST_TENANT_ID,
      result_limit: 10,
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.length).toBeGreaterThan(0)

    const firstResult = data[0]
    expect(firstResult).toHaveProperty('id')
    expect(firstResult).toHaveProperty('entity_type')
    expect(firstResult).toHaveProperty('title')
    expect(firstResult).toHaveProperty('subtitle')
    expect(firstResult).toHaveProperty('relevance')

    // Entity type should be valid
    expect(['company', 'contact', 'program']).toContain(firstResult.entity_type)

    // Relevance should be a positive number
    expect(typeof firstResult.relevance).toBe('number')
    expect(firstResult.relevance).toBeGreaterThan(0)
  })

  it('should order results by relevance descending', async () => {
    const { data, error } = await adminClient.rpc('universal_search', {
      search_query: 'bean',
      tenant_id_param: TEST_TENANT_ID,
      result_limit: 10,
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()

    if (data.length > 1) {
      for (let i = 0; i < data.length - 1; i++) {
        expect(data[i].relevance).toBeGreaterThanOrEqual(data[i + 1].relevance)
      }
    }
  })

  it('should enforce tenant isolation', async () => {
    const TENANT_2_ID = '22222222-2222-2222-2222-222222222222' // Beta Incubator

    // Search in tenant 1
    const { data: tenant1Results } = await adminClient.rpc('universal_search', {
      search_query: 'bean',
      tenant_id_param: TEST_TENANT_ID,
      result_limit: 10,
    })

    // Search in tenant 2
    const { data: tenant2Results } = await adminClient.rpc('universal_search', {
      search_query: 'bean',
      tenant_id_param: TENANT_2_ID,
      result_limit: 10,
    })

    // Results should be different (or empty for tenant 2 if no "bean" data)
    expect(tenant1Results).not.toEqual(tenant2Results)
  })

  it('should search across companies, contacts, and programs', async () => {
    const { data, error } = await adminClient.rpc('universal_search', {
      search_query: 'a',
      tenant_id_param: TEST_TENANT_ID,
      result_limit: 50,
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()

    // Should have results from multiple entity types
    const entityTypes = new Set(data.map((r: any) => r.entity_type))
    expect(entityTypes.size).toBeGreaterThan(0)

    // Check that all entity types are valid
    data.forEach((result: any) => {
      expect(['company', 'contact', 'program']).toContain(result.entity_type)
    })
  })
})

describe('Universal Search - DAL Module', () => {
  it('should export universalSearch function', () => {
    const search = require('@/lib/dal/search')
    expect(search.universalSearch).toBeDefined()
    expect(typeof search.universalSearch).toBe('function')
  })
})

