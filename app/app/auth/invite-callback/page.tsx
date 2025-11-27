/**
 * Invitation Callback Page (Client-side)
 *
 * Handles Supabase inviteUserByEmail tokens from hash fragment
 * Auto-joins user to organization after authentication
 *
 * Flow:
 * 1. User clicks invite link in email
 * 2. Supabase redirects to /auth/callback/invite (server route)
 * 3. Server redirects here (client page can read hash)
 * 4. Client reads tokens from hash and establishes session
 * 5. Server action auto-joins user to organization
 * 6. Redirect to dashboard
 *
 * Part of Issue #56: Team Management - Improved invitation flow
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { completeInviteSignup } from './actions'

export default function InviteCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    async function handleInviteCallback() {
      try {
        const supabase = createClient()

        // Check if we have a session (Supabase SDK handles hash automatically)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          console.error('No session after invite:', sessionError)
          setStatus('error')
          setErrorMessage('Failed to establish session')
          return
        }

        console.log('Session established, user metadata:', session.user.user_metadata)

        // Call server action to auto-join organization
        const result = await completeInviteSignup()

        if (result.success) {
          setStatus('success')
          // Redirect to dashboard (they're now a member!)
          setTimeout(() => router.push('/dashboard'), 1000)
        } else {
          setStatus('error')
          setErrorMessage(result.error || 'Failed to join organization')
        }
      } catch (error) {
        console.error('Invite callback error:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'An error occurred')
      }
    }

    handleInviteCallback()
  }, [router])

  if (status === 'processing') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="text-lg font-medium">Completing your invitation...</p>
          <p className="text-sm text-gray-500">This will only take a moment</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <div className="text-red-500 text-4xl">✗</div>
          <h1 className="text-2xl font-bold">Invitation Failed</h1>
          <p className="text-gray-600">{errorMessage}</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-green-500 text-4xl">✓</div>
        <h1 className="text-2xl font-bold">Welcome!</h1>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
