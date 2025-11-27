/**
 * Accept Invitation Form
 *
 * Shows invitation details and allows user to accept/decline
 * Part of Issue #54: Self-Service Onboarding - Phase 5
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvitation } from '@/lib/dal/invitations'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Building, Mail, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AcceptInviteFormProps {
  invitation: {
    token: string
    email: string
    role: string
    organization: {
      name: string
      slug: string
    }
  }
}

export function AcceptInviteForm({ invitation }: AcceptInviteFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)

  async function handleAccept() {
    setError(null)
    setIsAccepting(true)

    try {
      const result = await acceptInvitation(invitation.token)

      // Switch to new organization and redirect to dashboard
      router.push(`/api/switch-org/${result.organizationId}`)
    } catch (err) {
      // If unauthorized, redirect to login with invitation token
      if (err instanceof Error && err.message === 'Unauthorized') {
        router.push(`/login?invite_token=${invitation.token}`)
        return
      }

      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
      setIsAccepting(false)
    }
  }

  function handleDecline() {
    router.push('/dashboard')
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}

      {/* Invitation details */}
      <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center gap-3">
          <Building className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Organization</p>
            <p className="text-sm text-muted-foreground">{invitation.organization.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{invitation.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <UserCheck className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Role</p>
            <Badge variant="secondary" className="capitalize">
              {invitation.role}
            </Badge>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={handleDecline}
          disabled={isAccepting}
          className="flex-1"
        >
          Decline
        </Button>
        <Button onClick={handleAccept} disabled={isAccepting} className="flex-1">
          {isAccepting ? 'Accepting...' : 'Accept Invitation'}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        By accepting, you'll join {invitation.organization.name} and can access their data
      </p>
    </div>
  )
}
