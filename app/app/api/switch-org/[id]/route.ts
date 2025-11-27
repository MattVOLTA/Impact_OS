/**
 * Switch Organization API Route
 *
 * Handles switching active organization for authenticated user
 * Stores selection in HTTP-only cookie
 *
 * Part of Issue #54: Self-Service Onboarding
 */

import { NextRequest, NextResponse } from 'next/server'
import { switchOrganization } from '@/lib/dal/organizations'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params

    // Verify user has access to this org
    const result = await switchOrganization(organizationId)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to switch organization' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update user_sessions table (source of truth for RLS)
    // This is what get_active_organization_id() function reads
    await supabase
      .from('user_sessions')
      .upsert({
        user_id: user.id,
        active_organization_id: organizationId,
        last_switched_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    // Also update cookie for server-side convenience (getCurrentOrganizationId optimization)
    const cookieStore = await cookies()
    cookieStore.set('active_organization_id', organizationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    })

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred'

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
