/**
 * Interactions List Page
 *
 * Displays all interactions for the current tenant with filtering, search, and pagination.
 * Uses server-side pagination for performance with large datasets.
 * FEATURE GATED: Only accessible if feature_interactions is enabled
 */

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getInteractionsPaginated } from '@/lib/dal/interactions'
import { isFeatureEnabled } from '@/lib/dal/settings'
import { InteractionsTable } from './components/interactions-table'
import { AddInteractionButton } from './components/add-interaction-button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageSquare } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Interactions',
}

interface InteractionsPageProps {
  searchParams: Promise<{
    search?: string
    page?: string
  }>
}

export default async function InteractionsPage({ searchParams }: InteractionsPageProps) {
  // Check if interactions feature is enabled
  const interactionsEnabled = await isFeatureEnabled('interactions')

  if (!interactionsEnabled) {
    redirect('/dashboard?error=feature-disabled')
  }
  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Interactions</h1>
        <AddInteractionButton />
      </div>

      {/* Table */}
      <Suspense fallback={<InteractionsTableSkeleton />}>
        <InteractionsTableAsync searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function InteractionsTableAsync({ searchParams }: InteractionsPageProps) {
  // Await searchParams (Next.js 16+ requirement)
  const params = await searchParams
  const currentPage = Number(params?.page) || 1
  const pageSize = 50

  // Fetch paginated interactions
  const { interactions, totalCount } = await getInteractionsPaginated({
    search: params?.search,
    page: currentPage,
    pageSize
  })

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <InteractionsTable
      interactions={interactions}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
      hasSearch={!!params?.search}
    />
  )
}

function InteractionsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
