/**
 * Fireflies Import Queue Page (Three-Tab Workflow)
 *
 * Three-tab interface for managing Fireflies meetings:
 * 1. Pending Review - Meetings awaiting user decision
 * 2. Imported - Successfully imported meetings (audit trail)
 * 3. Excluded - Meetings user decided not to import (reversible)
 */

import type { Metadata } from 'next'
import { getCurrentUserRole } from '@/lib/dal/shared'
import {
  getPendingMeetings,
  getImportedMeetings,
  getExcludedMeetings
} from '../../actions'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { PendingQueueTable } from './components/pending-queue-table'
import { ImportedHistoryTable } from './components/imported-history-table'
import { ExcludedMeetingsTable } from './components/excluded-meetings-table'

export const metadata: Metadata = {
  title: 'Meeting Transcript Queue',
}

export default async function FirefliesQueuePage() {
  // Require admin access
  const userRole = await getCurrentUserRole()
  if (userRole !== 'admin') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            Only administrators can manage Fireflies imports
          </p>
        </div>
      </div>
    )
  }

  // Fetch meetings by status
  const [pendingMeetings, importedMeetings, excludedMeetings] = await Promise.all([
    getPendingMeetings(),
    getImportedMeetings(),
    getExcludedMeetings()
  ])

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Meeting Transcript Queue</h1>
      </div>

      {/* Three-Tab Interface */}
      <Tabs defaultValue="pending" className="flex-1">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pending">
            Pending Review ({pendingMeetings.length})
          </TabsTrigger>
          <TabsTrigger value="imported">
            Imported ({importedMeetings.length})
          </TabsTrigger>
          <TabsTrigger value="excluded">
            Excluded ({excludedMeetings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <PendingQueueTable meetings={pendingMeetings} />
        </TabsContent>

        <TabsContent value="imported" className="mt-6">
          <ImportedHistoryTable meetings={importedMeetings} />
        </TabsContent>

        <TabsContent value="excluded" className="mt-6">
          <ExcludedMeetingsTable meetings={excludedMeetings} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
