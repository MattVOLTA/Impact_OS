/**
 * Fireflies Queue Table Component
 *
 * Displays staged meetings with:
 * - Smart badges (matched contacts, active support)
 * - Bulk selection and import
 * - Individual actions (view details, exclude)
 */

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, Users, X, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { importSelectedMeetings, excludeStagedMeeting } from '../../../actions'
import { MeetingDetailsDialog } from './meeting-details-dialog'

interface StagedMeeting {
  id: string
  fireflies_transcript_id: string
  title: string
  meeting_date: string
  duration_seconds: number
  participants: string[]
  matched_emails: string[]
  match_type: 'active_support' | 'known_contact' | 'no_match'
  organizer_email?: string
  host_email?: string
}

interface QueueTableProps {
  meetings: StagedMeeting[]
}

export function QueueTable({ meetings }: QueueTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isImporting, setIsImporting] = useState(false)
  const [excludingId, setExcludingId] = useState<string | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<StagedMeeting | null>(null)
  const [localMeetings, setLocalMeetings] = useState(meetings)

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleAll = () => {
    if (selectedIds.size === localMeetings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(localMeetings.map(m => m.id)))
    }
  }

  const selectAllMatched = () => {
    const matchedIds = localMeetings
      .filter(m => m.match_type === 'known_contact' || m.match_type === 'active_support')
      .map(m => m.id)
    setSelectedIds(new Set(matchedIds))
  }

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one meeting to import')
      return
    }

    setIsImporting(true)

    try {
      const result = await importSelectedMeetings(Array.from(selectedIds))

      if (result.success) {
        toast.success(result.message)

        // Remove imported meetings from local state
        const importedIds = new Set(
          result.results?.filter((r: any) => r.success).map((r: any) => r.meetingId) || []
        )
        setLocalMeetings(localMeetings.filter(m => !importedIds.has(m.id)))
        setSelectedIds(new Set())

        // Show errors for failed imports
        const failed = result.results?.filter((r: any) => !r.success) || []
        if (failed.length > 0) {
          failed.forEach((f: any) => {
            toast.error(`Failed to import: ${f.error}`)
          })
        }
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to import meetings')
    } finally {
      setIsImporting(false)
    }
  }

  const handleExclude = async (meetingId: string, title: string) => {
    setExcludingId(meetingId)

    try {
      const result = await excludeStagedMeeting(meetingId)

      if (result.success) {
        toast.success(`Excluded: ${title}`)

        // Remove from local state
        setLocalMeetings(localMeetings.filter(m => m.id !== meetingId))

        // Remove from selection if selected
        const newSelected = new Set(selectedIds)
        newSelected.delete(meetingId)
        setSelectedIds(newSelected)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to exclude meeting')
    } finally {
      setExcludingId(null)
    }
  }

  const handleViewDetails = (meeting: StagedMeeting) => {
    setSelectedMeeting(meeting)
    setDetailsDialogOpen(true)
  }

  if (localMeetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium">No meetings in queue</h3>
          <p className="text-sm text-muted-foreground">
            Run a sync to fetch new meetings from Fireflies
          </p>
        </div>
      </div>
    )
  }

  const matchedCount = localMeetings.filter(
    m => m.match_type === 'known_contact' || m.match_type === 'active_support'
  ).length

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={selectAllMatched}
          disabled={matchedCount === 0}
        >
          Select All Matched ({matchedCount})
        </Button>
        <Button
          onClick={handleImport}
          disabled={selectedIds.size === 0 || isImporting}
          size="sm"
        >
          {isImporting
            ? `Importing ${selectedIds.size}...`
            : `Import Selected (${selectedIds.size})`}
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === localMeetings.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Meeting</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Match Status</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localMeetings.map(meeting => (
              <TableRow key={meeting.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(meeting.id)}
                    onCheckedChange={() => toggleSelection(meeting.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{meeting.title}</div>
                  {meeting.matched_emails.length > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <Users className="inline h-3 w-3 mr-1" />
                      {meeting.matched_emails.length} matched contact
                      {meeting.matched_emails.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </TableCell>
                <TableCell suppressHydrationWarning>
                  {format(new Date(meeting.meeting_date), 'PPp')}
                </TableCell>
                <TableCell>
                  <MatchBadge matchType={meeting.match_type} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {Math.floor(meeting.duration_seconds / 60)} min
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(meeting)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExclude(meeting.id, meeting.title)}
                      disabled={excludingId === meeting.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Meeting Details Dialog */}
      {selectedMeeting && (
        <MeetingDetailsDialog
          meeting={selectedMeeting}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}
    </div>
  )
}

function MatchBadge({ matchType }: { matchType: 'active_support' | 'known_contact' | 'no_match' }) {
  const styles = {
    active_support: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    known_contact: 'bg-green-500/10 text-green-600 border-green-500/20',
    no_match: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  }

  const labels = {
    active_support: '🟡 Active Support',
    known_contact: '🟢 Known Contact',
    no_match: '⚪ No Match',
  }

  return (
    <Badge variant="outline" className={styles[matchType]}>
      {labels[matchType]}
    </Badge>
  )
}
