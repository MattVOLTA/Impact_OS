/**
 * Forms List Page
 *
 * Server Component that fetches forms via DAL with pagination.
 * Auth is automatic (DAL checks, RLS filters by tenant).
 * Uses server-side pagination for performance with large datasets.
 *
 * See docs/architecture/auth-best-practices.md for Server Component patterns.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormsTable } from './components/forms-table'
import { getFormsPaginated } from '@/lib/dal/forms'

export const metadata: Metadata = {
  title: 'Forms',
}

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>
}) {
  // Await searchParams (Next.js 16+ requirement)
  const params = await searchParams

  // Parse pagination params
  const currentPage = Number(params.page) || 1
  const pageSize = 50
  const status = (params.status as 'all' | 'published' | 'draft') || 'all'

  // DAL handles auth check - if user not authenticated, will throw
  // RLS automatically filters forms by tenant_id from JWT
  const { forms, totalCount } = await getFormsPaginated({
    search: params.search,
    page: currentPage,
    pageSize,
    status
  })

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Forms</h1>
        <Button asChild>
          <Link href="/forms/new">
            <Plus className="h-4 w-4 mr-2" />
            New Form
          </Link>
        </Button>
      </div>

      {/* Forms Table */}
      <FormsTable
        forms={forms}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        initialStatus={status}
      />
    </div>
  )
}
