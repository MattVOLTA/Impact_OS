/**
 * Member List Component
 *
 * Part of Issue #56: Admin User Management - Team Page
 *
 * Displays all organization members with their roles.
 * Clicking a member opens the role management dialog.
 *
 * Features:
 * - Color-coded role badges
 * - Avatar with initials
 * - Click to manage member
 * - Accessible keyboard navigation
 */

'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { RoleManagementDialog } from './role-management-dialog'
import type { OrganizationMember } from '@/lib/dal/team'

const ROLE_COLORS = {
  owner: 'bg-purple-500/10 text-purple-700 border-purple-200',
  admin: 'bg-blue-500/10 text-blue-700 border-blue-200',
  editor: 'bg-green-500/10 text-green-700 border-green-200',
  viewer: 'bg-slate-500/10 text-slate-700 border-slate-200',
} as const

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
} as const

interface MemberListProps {
  members: OrganizationMember[]
}

export function MemberList({ members }: MemberListProps) {
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null)

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0)?.toUpperCase() || ''
    const last = lastName?.charAt(0)?.toUpperCase() || ''
    return `${first}${last}` || '??'
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Active Members ({members.length})
          </h2>
        </div>

        <div className="rounded-md border bg-background divide-y">
          {members.map((member) => (
            <button
              key={member.user_id}
              onClick={() => setSelectedMember(member)}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {getInitials(member.users.first_name, member.users.last_name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {member.users.first_name} {member.users.last_name}
                </p>
                <p className="text-sm text-muted-foreground truncate">{member.users.email}</p>
              </div>

              <Badge
                variant="outline"
                className={ROLE_COLORS[member.role]}
              >
                {ROLE_LABELS[member.role]}
              </Badge>
            </button>
          ))}

          {members.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No members found
            </div>
          )}
        </div>
      </div>

      {selectedMember && (
        <RoleManagementDialog
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onSuccess={() => setSelectedMember(null)}
        />
      )}
    </>
  )
}
