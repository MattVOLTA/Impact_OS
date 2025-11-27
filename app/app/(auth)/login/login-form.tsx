/**
 * Login Form Component
 *
 * Client Component with login form and Server Action
 * Shows error messages from URL params (email confirmation errors, etc.)
 */

'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { loginAction } from './actions'

// Error message mapping
const ERROR_MESSAGES: Record<string, string> = {
  'invalid-confirmation-link': 'Invalid confirmation link. Please request a new one.',
  'confirmation-failed': 'Email confirmation failed. Please try again or contact support.',
  'invalid-invitation': 'Invalid invitation link.',
  'invitation-already-used': 'This invitation has already been used.',
  'invitation-expired': 'This invitation has expired. Please request a new one.',
  'authentication-required': 'Please sign in to continue.'
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Show error from URL params on mount
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(ERROR_MESSAGES[errorParam] || 'An error occurred. Please try again.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    // Get 'next' parameter from URL if present
    const next = searchParams.get('next') || undefined

    const result = await loginAction(formData, next)

    if (!result.success) {
      setError(result.error || 'Login failed')
      setLoading(false)
    }
    // If successful, redirect happens in Server Action (no error shown)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
