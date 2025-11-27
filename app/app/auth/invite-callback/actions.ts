/**
 * Invitation Callback Server Actions
 *
 * Handles auto-joining user to organization after they accept invite
 * Part of Issue #56: Team Management - Improved invitation flow
 */

'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function completeInviteSignup(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get pending invitation from user metadata
    const pendingInvitationId = user.user_metadata?.pending_invitation_id
    const pendingOrgId = user.user_metadata?.pending_organization_id
    const pendingRole = user.user_metadata?.pending_role

    if (!pendingInvitationId || !pendingOrgId || !pendingRole) {
      console.error('Missing invitation metadata:', user.user_metadata)
      return { success: false, error: 'No pending invitation found' }
    }

    // Use admin client for auto-join logic
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Add user to organization
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        user_id: user.id,
        organization_id: pendingOrgId,
        role: pendingRole
      })

    if (memberError) {
      console.error('Failed to add member:', memberError)
      return { success: false, error: 'Failed to join organization' }
    }

    // Mark invitation as accepted
    await adminClient
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', pendingInvitationId)

    // Set active organization session
    await adminClient
      .from('user_sessions')
      .upsert({
        user_id: user.id,
        active_organization_id: pendingOrgId
      })

    // Clear pending invitation from user metadata
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        pending_invitation_id: null,
        pending_organization_id: null,
        pending_role: null
      }
    })

    console.log('User auto-joined organization:', {
      userId: user.id,
      orgId: pendingOrgId,
      role: pendingRole
    })

    return { success: true }
  } catch (error) {
    console.error('completeInviteSignup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred'
    }
  }
}
