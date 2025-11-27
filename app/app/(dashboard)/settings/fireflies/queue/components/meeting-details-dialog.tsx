/**
 * Meeting Details Dialog
 *
 * Shows detailed information about a staged meeting:
 * - Participants (with match status)
 * - Duration, organizer, host
 * - Matched contacts and companies
 */

'use client'

import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, Users, Mail, Calendar } from 'lucide-react'

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

interface MeetingDetailsDialogProps {
  meeting: StagedMeeting
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MeetingDetailsDialog({ meeting, open, onOpenChange }: MeetingDetailsDialogProps) {
  const matchedEmailsSet = new Set(meeting.matched_emails)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{meeting.title}</DialogTitle>
          <DialogDescription suppressHydrationWarning>
            {format(new Date(meeting.meeting_date), 'PPPP')} at{' '}
            {format(new Date(meeting.meeting_date), 'p')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meeting Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Duration:</span>
              <span>{Math.floor(meeting.duration_seconds / 60)} minutes</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Participants:</span>
              <span>{meeting.participants.length}</span>
            </div>
          </div>

          {meeting.organizer_email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Organizer:</span>
              <span>{meeting.organizer_email}</span>
            </div>
          )}

          <Separator />

          {/* Match Status */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              Match Status
              <MatchBadge matchType={meeting.match_type} />
            </h4>
            <p className="text-sm text-muted-foreground">
              {meeting.matched_emails.length} of {meeting.participants.length} participant
              {meeting.participants.length !== 1 ? 's' : ''} matched to contacts in your organization
            </p>
          </div>

          <Separator />

          {/* Participants List */}
          <div>
            <h4 className="font-medium mb-3">Participants</h4>
            <div className="space-y-2">
              {meeting.participants.map(email => {
                const isMatched = matchedEmailsSet.has(email)
                return (
                  <div
                    key={email}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{email}</span>
                    </div>
                    {isMatched ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        Matched
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-500/10 text-gray-600">
                        New Contact
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Fireflies ID */}
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Fireflies ID:</span> {meeting.fireflies_transcript_id}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MatchBadge({ matchType }: { matchType: 'active_support' | 'known_contact' | 'no_match' }) {
  const styles = {
    active_support: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    known_contact: 'bg-green-500/10 text-green-600 border-green-500/20',
    no_match: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  }

  const labels = {
    active_support: 'Active Support',
    known_contact: 'Known Contact',
    no_match: 'No Match',
  }

  return (
    <Badge variant="outline" className={styles[matchType]}>
      {labels[matchType]}
    </Badge>
  )
}
