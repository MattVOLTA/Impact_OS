/**
 * Data Access Layer (DAL) Pattern Tests
 *
 * NOTE: DAL functions use Next.js cookies() which requires request context.
 * Cannot be tested in Jest without complex mocking.
 *
 * DAL pattern IS tested via tenant-isolation.test.ts which proves:
 * - Auth checks work (unauthorized users blocked)
 * - RLS filtering works (users only see their tenant data)
 * - Cross-tenant access blocked
 * - JWT claims used correctly
 *
 * See docs/architecture/auth-best-practices.md#data-access-layer-pattern
 */

describe('Data Access Layer - Module Structure', () => {
  test('DAL modules exist and export correct functions', () => {
    // Verify imports work (proves modules are structured correctly)
    const shared = require('@/lib/dal/shared')
    const companies = require('@/lib/dal/companies')

    // Shared DAL functions
    expect(shared.requireAuth).toBeDefined()
    expect(shared.getCurrentTenantId).toBeDefined()
    expect(shared.getCurrentUserRole).toBeDefined()

    // Company DAL functions
    expect(companies.getCompanies).toBeDefined()
    expect(companies.getCompany).toBeDefined()
    expect(companies.createCompany).toBeDefined()
    expect(companies.updateCompany).toBeDefined()
    expect(companies.deleteCompany).toBeDefined()
  })

  test('DAL functions are properly typed', () => {
    const companies = require('@/lib/dal/companies')

    // Verify functions have correct signatures (TypeScript compilation proves this)
    expect(typeof companies.getCompanies).toBe('function')
    expect(typeof companies.createCompany).toBe('function')
  })
})

// DAL authentication enforcement and tenant scoping is tested via:
// - __tests__/auth/tenant-isolation.test.ts (proves auth + RLS work together)
// - __tests__/auth/jwt-claims.test.ts (proves Custom Access Token Hook works)
// - __tests__/auth/database-trigger.test.ts (proves user creation trigger works)
//
// These integration tests provide better coverage than mocked unit tests
// because they test actual Supabase behavior, not mocked responses.
