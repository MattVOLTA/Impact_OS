/**
 * Accept Invitation - Unauthenticated User View
 *
 * Shows login/signup options for users who aren't logged in
 * After authentication, they'll be redirected back to accept the invitation
 *
 * Part of Issue #54: Self-Service Onboarding - Phase 5
 */

'use client'

import { Building, Mail, UserCheck, LogIn, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface AcceptInviteUnauthenticatedProps {
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

export function AcceptInviteUnauthenticated({
  invitation
}: AcceptInviteUnauthenticatedProps) {
  return (
    <div className="space-y-6">
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

      {/* Authentication required message */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm font-medium text-blue-900">
          Sign in or create an account to accept this invitation
        </p>
      </div>

      {/* Action buttons */}
      <div>
        <Link href={`/login?next=/accept-invite/${invitation.token}`}>
          <Button className="w-full" size="lg">
            <LogIn className="mr-2 h-4 w-4" />
            Sign in to accept
          </Button>
        </Link>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gray-50 px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Link href={`/signup?email=${encodeURIComponent(invitation.email)}&next=/accept-invite/${invitation.token}`}>
          <Button variant="outline" className="w-full" size="lg">
            <UserPlus className="mr-2 h-4 w-4" />
            Create account to accept
          </Button>
        </Link>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        After signing in, you'll automatically join {invitation.organization.name}
      </p>
    </div>
  )
}
