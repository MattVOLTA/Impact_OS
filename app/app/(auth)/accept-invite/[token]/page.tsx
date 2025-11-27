/**
 * Accept Invitation Page
 *
 * Allows users to accept organization invitations via email link
 * Handles both authenticated and unauthenticated users
 *
 * Part of Issue #54: Self-Service Onboarding - Phase 5
 */

import { getInvitationByToken } from '@/lib/dal/invitations'
import { requireAuth } from '@/lib/dal/shared'
import { redirect } from 'next/navigation'
import { AcceptInviteForm } from './accept-invite-form'
import { AcceptInviteSignup } from './accept-invite-signup'

export default async function AcceptInvitePage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invitation = await getInvitationByToken(token)

  // Invalid token
  if (!invitation) {
    redirect('/login?error=invalid-invitation')
  }

  // Already accepted
  if (invitation.accepted_at) {
    redirect('/login?error=invitation-already-used')
  }

  // Expired
  if (new Date(invitation.expires_at) < new Date()) {
    redirect('/login?error=invitation-expired')
  }

  // Check if user is authenticated
  let isAuthenticated = false
  try {
    await requireAuth()
    isAuthenticated = true
  } catch (error) {
    // User is not authenticated
    isAuthenticated = false
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">You've been invited!</h1>
          <p className="text-muted-foreground">
            Join <span className="font-semibold">{invitation.organization.name}</span> as{' '}
            <span className="font-semibold">{invitation.role}</span>
          </p>
        </div>

        {isAuthenticated ? (
          <AcceptInviteForm invitation={invitation} />
        ) : (
          <AcceptInviteSignup invitation={invitation} />
        )}
      </div>
    </div>
  )
}
