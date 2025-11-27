/**
 * Invitation Callback Route (Client-side page needed)
 *
 * For inviteUserByEmail, Supabase sends tokens in hash fragment (#)
 * which server can't access. We redirect to a client page to handle it.
 *
 * Part of Issue #56: Team Management - Improved invitation flow
 */

import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Redirect to client page that can read hash fragment
  return NextResponse.redirect(new URL('/auth/invite-callback', request.url))
}
