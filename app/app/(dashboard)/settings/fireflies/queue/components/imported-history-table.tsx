/**
 * Imported History Table Component (Tab 2)
 *
 * Displays successfully imported meetings with:
 * - Import timestamp
 * - Link to created interaction
 * - Read-only view (audit trail)
 */

'use client'

import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface ImportedMeeting {
  id: string
  fireflies_transcript_id: string
  title: string
  meeting_date: string
  duration_seconds: number
  imported_at: string
  imported_to_interaction_id: string
  interactions?: {
    id: string
    title: string
    meeting_date: string
  }
}

interface ImportedHistoryTableProps {
  meetings: ImportedMeeting[]
}

export function ImportedHistoryTable({ meetings }: ImportedHistoryTableProps) {
  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium">No imported meetings yet</h3>
          <p className="text-sm text-muted-foreground">
            Import meetings from the Pending Review tab to see them here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          This is your audit trail of successfully imported meetings. Click "View Interaction" to see the full meeting details.
        </p>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Meeting</TableHead>
              <TableHead>Meeting Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Interaction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings.map(meeting => (
              <TableRow key={meeting.id}>
                <TableCell>
                  <div className="font-medium">{meeting.title}</div>
                </TableCell>
                <TableCell suppressHydrationWarning>
                  {format(new Date(meeting.meeting_date), 'PPp')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {Math.floor(meeting.duration_seconds / 60)} min
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {meeting.imported_to_interaction_id && (
                    <Link href={`/interactions/${meeting.imported_to_interaction_id}`}>
                      <Button variant="outline" size="sm">
                        View Interaction
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Showing {meetings.length} imported meeting{meetings.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
