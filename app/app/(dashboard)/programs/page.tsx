/**
 * Programs List Page
 *
 * Server Component that fetches programs via DAL.
 * Auth is automatic (DAL checks, RLS filters by tenant).
 *
 * See docs/architecture/auth-best-practices.md for Server Component patterns.
 */

import type { Metadata } from 'next'
import { getPrograms } from '@/lib/dal/programs'
import { ProgramsTable } from './components/programs-table'
import { AddProgramButton } from './components/add-program-button'

export const metadata: Metadata = {
  title: 'Programs',
}

export default async function ProgramsPage() {
  // DAL handles auth check - if user not authenticated, will throw
  // RLS automatically filters programs by tenant_id from JWT
  const programs = await getPrograms(true) // Include counts

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Programs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage programs and track company/contact participation
          </p>
        </div>
        <AddProgramButton />
      </div>

      <ProgramsTable programs={programs} />
    </div>
  )
}
