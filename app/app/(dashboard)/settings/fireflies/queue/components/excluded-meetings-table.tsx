/**
 * Excluded Meetings Table Component (Tab 3)
 *
 * Displays meetings user decided not to import with:
 * - Exclusion timestamp
 * - Undo action (reversible - moves back to pending)
 */

'use client'

import { useState } from 'react'
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
import { Clock, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { undoExclusion } from '../../../actions'

interface ExcludedMeeting {
  id: string
  fireflies_transcript_id: string
  title: string
  meeting_date: string
  duration_seconds: number
  excluded_at: string
  excluded_by_user_id: string
}

interface ExcludedMeetingsTableProps {
  meetings: ExcludedMeeting[]
}

export function ExcludedMeetingsTable({ meetings }: ExcludedMeetingsTableProps) {
  const [localMeetings, setLocalMeetings] = useState(meetings)
  const [undoingId, setUndoingId] = useState<string | null>(null)

  const handleUndo = async (meetingId: string, title: string) => {
    setUndoingId(meetingId)

    try {
      const result = await undoExclusion(meetingId)

      if (result.success) {
        toast.success(`Restored to pending: ${title}`)

        // Remove from local state
        setLocalMeetings(localMeetings.filter(m => m.id !== meetingId))

        // Refresh page to update tab counts
        setTimeout(() => window.location.reload(), 500)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to undo exclusion')
    } finally {
      setUndoingId(null)
    }
  }

  if (localMeetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium">No excluded meetings</h3>
          <p className="text-sm text-muted-foreground">
            Meetings you exclude will appear here. You can undo exclusions if needed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
        <p className="text-sm text-orange-900 dark:text-orange-100">
          These meetings were excluded from import. You can undo any exclusion to move the meeting back to Pending Review.
        </p>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Meeting</TableHead>
              <TableHead>Meeting Date</TableHead>
              <TableHead>Excluded At</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localMeetings.map(meeting => (
              <TableRow key={meeting.id}>
                <TableCell>
                  <div className="font-medium">{meeting.title}</div>
                </TableCell>
                <TableCell suppressHydrationWarning>
                  {format(new Date(meeting.meeting_date), 'PPp')}
                </TableCell>
                <TableCell suppressHydrationWarning>
                  {format(new Date(meeting.excluded_at), 'PPp')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {Math.floor(meeting.duration_seconds / 60)} min
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUndo(meeting.id, meeting.title)}
                    disabled={undoingId === meeting.id}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Undo Exclusion
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        Showing {localMeetings.length} excluded meeting{localMeetings.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
