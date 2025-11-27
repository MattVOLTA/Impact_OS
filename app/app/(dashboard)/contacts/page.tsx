/**
 * Contacts List Page
 *
 * Server Component that displays all contacts with search and pagination.
 * Uses server-side pagination for performance with large datasets.
 */

import type { Metadata } from 'next'
import { getContactsPaginated } from '@/lib/dal/contacts'
import { getPrograms } from '@/lib/dal/programs'
import { getUserPreferences } from '@/lib/dal/users'
import { ContactsTable } from './components/contacts-table'
import { AddContactButton } from './components/add-contact-button'

export const metadata: Metadata = {
  title: 'Contacts',
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string; program?: string }>
}) {
  // Await searchParams (Next.js 16+ requirement)
  const params = await searchParams

  // Load saved preferences (cached per request)
  const userPrefs = await getUserPreferences()
  const savedFilters = userPrefs?.filters?.contacts || {}

  // URL params override saved preferences
  const currentPage = Number(params.page) || 1
  const pageSize = 50
  const enrollmentStatus = (params.status as 'all' | 'active' | 'alumni' | 'not_enrolled') ||
    (savedFilters?.enrollmentStatus as 'all' | 'active' | 'alumni' | 'not_enrolled') ||
    'all'
  const programId = params.program || savedFilters?.programId

  // Fetch programs for filter dropdown
  const programs = await getPrograms()

  // Fetch paginated contacts with enrollment filters
  const { contacts, totalCount } = await getContactsPaginated({
    search: params.search,
    page: currentPage,
    pageSize,
    programId,
    enrollmentStatus
  })

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <AddContactButton />
      </div>

      <ContactsTable
        contacts={contacts}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        programs={programs as Array<{ id: string; name: string }>}
        initialFilters={{
          enrollmentStatus,
          programId
        }}
      />
    </div>
  )
}
