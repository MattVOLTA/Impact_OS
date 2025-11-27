/**
 * Dashboard Error Boundary
 *
 * Catches errors in dashboard routes and handles auth failures
 * Redirects to login for unauthorized errors
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log error for debugging
    console.error('Dashboard error:', error)

    // Redirect to login for unauthorized errors
    if (error.message === 'Unauthorized') {
      router.push('/login')
    }

    // Redirect to onboarding if user has no organizations
    if (error.message.includes('no organization memberships')) {
      router.push('/onboarding')
    }
  }, [error, router])

  // If it's an auth error, don't show UI (redirect happening)
  if (error.message === 'Unauthorized' || error.message.includes('no organization memberships')) {
    return null
  }

  // For other errors, show error UI
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>

        <div className="flex gap-4">
          <Button onClick={reset} variant="outline" className="flex-1">
            Try again
          </Button>
          <Button onClick={() => router.push('/dashboard')} className="flex-1">
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
