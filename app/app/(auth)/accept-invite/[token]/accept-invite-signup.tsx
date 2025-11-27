/**
 * Accept Invitation - Signup Component
 *
 * Streamlined signup form for invited users:
 * - Email pre-filled (from invitation)
 * - Only needs password (not full signup form)
 * - Auto-accepts invitation after account creation
 * - Skips onboarding, goes straight to dashboard
 *
 * Part of Issue #56: Improved invitation flow
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Building, Mail, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { signupFromInvitation } from './actions'
import { acceptInvitation } from '@/lib/dal/invitations'
import { createClient } from '@/utils/supabase/client'

const inviteSignupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type InviteSignupInput = z.infer<typeof inviteSignupSchema>

interface AcceptInviteSignupProps {
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

export function AcceptInviteSignup({ invitation }: AcceptInviteSignupProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<InviteSignupInput>({
    resolver: zodResolver(inviteSignupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: ''
    }
  })

  async function onSubmit(values: InviteSignupInput) {
    setError(null)
    setIsLoading(true)

    try {
      // Step 1: Create account with auto-confirmed email (for invited users)
      const signupResult = await signupFromInvitation({
        email: invitation.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName
      })

      if (!signupResult.success) {
        setError(signupResult.error || 'Failed to create account')
        setIsLoading(false)
        return
      }

      // Step 2: Sign in (email is auto-confirmed so this will work)
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: values.password
      })

      if (signInError) {
        console.error('Sign-in error:', signInError)
        setError(`Sign-in failed: ${signInError.message}. Please try logging in manually.`)
        setIsLoading(false)
        return
      }

      // Give the session a moment to propagate
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 3: Auto-accept the invitation (now we have a session)
      const acceptResult = await acceptInvitation(invitation.token)

      // Step 4: Switch to new organization and redirect to dashboard
      router.push(`/api/switch-org/${acceptResult.organizationId}`)
    } catch (err) {
      console.error('Invitation signup error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Invitation details - Show first, before any errors */}
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

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}

      {/* Simplified signup form */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={invitation.email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            This email is from your invitation
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              {...form.register('firstName')}
            />
            {form.formState.errors.firstName && (
              <p className="text-sm text-red-600">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              {...form.register('lastName')}
            />
            {form.formState.errors.lastName && (
              <p className="text-sm text-red-600">
                {form.formState.errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Create Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter a secure password"
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-red-600">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            {...form.register('confirmPassword')}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-red-600">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : `Join ${invitation.organization.name}`}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        By joining, you'll have {invitation.role} access to {invitation.organization.name}
      </p>
    </div>
  )
}
