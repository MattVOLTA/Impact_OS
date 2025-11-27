/**
 * Team Management Page
 *
 * Part of Issue #56: Admin User Management - Team Page
 *
 * Server Component that fetches members and invitations.
 * Only accessible to admins and owners (enforced by DAL).
 *
 * Features:
 * - View all organization members with roles
 * - Manage member roles (promote/demote)
 * - View pending invitations
 * - Invite new members
 */

import type { Metadata } from 'next'
import { getOrganizationMembers, getPendingInvitations } from '@/lib/dal/team'
import { MemberList } from './components/member-list'
import { PendingInvitationsList } from './components/pending-invitations-list'
import { InviteMemberButton } from './components/invite-member-button'

export const metadata: Metadata = {
  title: 'Team',
}

export default async function TeamPage() {
  // DAL handles auth check - only admins/owners can access
  // If user is not admin/owner, DAL will throw error
  const [members, invitations] = await Promise.all([
    getOrganizationMembers(),
    getPendingInvitations()
  ])

  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage members and their roles in your organization
          </p>
        </div>
        <InviteMemberButton />
      </div>

      <div className="space-y-6">
        <MemberList members={members} />
        {invitations.length > 0 && (
          <PendingInvitationsList invitations={invitations} />
        )}
      </div>
    </div>
  )
}
