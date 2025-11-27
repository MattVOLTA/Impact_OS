/**
 * Pending Invitations List Component
 *
 * Part of Issue #56: Admin User Management - Team Page
 *
 * Displays pending email invitations with ability to resend or cancel.
 * Shows expiration countdown for each invitation.
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, Clock } from 'lucide-react'
import type { PendingInvitation } from '@/lib/dal/team'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

const ROLE_COLORS = {
  owner: 'bg-purple-500/10 text-purple-700 border-purple-200',
  admin: 'bg-blue-500/10 text-blue-700 border-blue-200',
  editor: 'bg-green-500/10 text-green-700 border-green-200',
  viewer: 'bg-slate-500/10 text-slate-700 border-slate-200',
} as const

interface PendingInvitationsListProps {
  invitations: PendingInvitation[]
}

export function PendingInvitationsList({ invitations }: PendingInvitationsListProps) {
  if (invitations.length === 0) {
    return null
  }

  const getExpiresIn = (expiresAt: string) => {
    try {
      return formatDistanceToNow(new Date(expiresAt), { addSuffix: true }).replace('about ', '')
    } catch {
      return 'Unknown'
    }
  }

  const getInvitedBy = (inviter: PendingInvitation['inviter']) => {
    if (inviter.first_name && inviter.last_name) {
      return `${inviter.first_name} ${inviter.last_name}`
    }
    return inviter.email
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Pending Invitations ({invitations.length})
        </h2>
      </div>

      <div className="rounded-md border bg-background divide-y">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="p-4 flex items-center gap-4"
          >
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
              <Mail className="h-5 w-5 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{invitation.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  Invited by {getInvitedBy(invitation.inviter)}
                </p>
                <span className="text-muted-foreground/30">•</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Expires {getExpiresIn(invitation.expires_at)}
                </div>
              </div>
            </div>

            <Badge
              variant="outline"
              className={ROLE_COLORS[invitation.role]}
            >
              {invitation.role}
            </Badge>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Implement resend
                  toast.info('Resend invitation (coming soon)')
                }}
              >
                Resend
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // TODO: Implement cancel
                  toast.info('Cancel invitation (coming soon)')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
