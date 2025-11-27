/**
 * Companies List Page
 *
 * Server Component that fetches companies via DAL with pagination.
 * Auth is automatic (DAL checks, RLS filters by tenant).
 * Uses server-side pagination for performance with large datasets.
 *
 * See docs/architecture/auth-best-practices.md for Server Component patterns.
 */

import type { Metadata } from 'next'
import { getCompaniesPaginated, getIndustries } from '@/lib/dal/companies'
import { getPrograms } from '@/lib/dal/programs'
import { getUserPreferences } from '@/lib/dal/users'
import { CompaniesTable } from './components/companies-table'
import { AddCompanyButton } from './components/add-company-button'

export const metadata: Metadata = {
  title: 'Companies',
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string; program?: string; type?: string }>
}) {
  // Await searchParams (Next.js 16+ requirement)
  const params = await searchParams

  // Load saved preferences (cached per request)
  const userPrefs = await getUserPreferences()
  const savedFilters = userPrefs?.filters?.companies || {}

  // URL params override saved preferences
  const currentPage = Number(params.page) || 1
  const pageSize = 50
  const enrollmentStatus = (params.status as 'all' | 'active' | 'alumni' | 'not_enrolled') ||
    (savedFilters?.enrollmentStatus as 'all' | 'active' | 'alumni' | 'not_enrolled') ||
    'all'
  const programId = params.program || savedFilters?.programId || undefined
  const companyType = params.type || savedFilters?.companyType || undefined

  // DAL handles auth check - if user not authenticated, will throw
  // RLS automatically filters companies by tenant_id from JWT
  const { companies, totalCount } = await getCompaniesPaginated({
    search: params.search,
    page: currentPage,
    pageSize,
    enrollmentStatus,
    programId,
    companyType
  })
  const industries = await getIndustries()
  const programs = await getPrograms()

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <AddCompanyButton industries={industries} />
      </div>

      <CompaniesTable
        companies={companies}
        industries={industries}
        programs={programs}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        initialFilters={{
          enrollmentStatus,
          programId,
          companyType
        }}
      />
    </div>
  )
}
