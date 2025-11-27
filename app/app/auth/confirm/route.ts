/**
 * Email Confirmation Route
 *
 * Handles email confirmation callback from Supabase Auth
 * This is the route that users land on when they click the confirmation link in their email
 *
 * Part of Issue #54: Self-Service Onboarding
 *
 * IMPORTANT: This route handler must properly pass cookies from Supabase auth
 * to the redirect response. Without this, the session cookies set by verifyOtp()
 * won't be sent to the browser, causing "not authenticated" errors on first load.
 *
 * SECURITY: The 'next' parameter is validated to prevent open redirect attacks (CWE-601)
 * See Issue #81 for details.
 */

import { type EmailOtpType } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { getSafeRedirectUrl } from '@/lib/utils/safe-redirect'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  // Validate 'next' parameter to prevent open redirect attacks
  const next = getSafeRedirectUrl(searchParams.get('next'), '/onboarding')

  // Validate required parameters
  if (!token_hash || !type) {
    return NextResponse.redirect(new URL('/login?error=invalid-confirmation-link', request.url))
  }

  // Create a response that we'll use for the redirect
  // This allows us to attach cookies set by Supabase auth
  const redirectUrl = new URL(next, request.url)
  let response = NextResponse.redirect(redirectUrl)

  // Create Supabase client that writes cookies to the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Set cookies on the redirect response so browser receives them
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Verify email with token - this will set session cookies via setAll
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash
  })

  if (error) {
    console.error('Email confirmation error:', error)
    return NextResponse.redirect(new URL('/login?error=confirmation-failed', request.url))
  }

  // Return redirect response with session cookies attached
  return response
}
