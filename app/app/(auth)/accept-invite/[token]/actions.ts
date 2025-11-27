/**
 * Accept Invitation Actions
 *
 * Special signup flow for invited users:
 * - Validates email matches invitation (SECURITY FIX Issue #58)
 * - Creates account
 * - Auto-confirms email (bypasses confirmation)
 * - Returns user data so client can sign in
 *
 * Part of Issue #56: Team Management
 */

'use server'

import { createClient } from '@supabase/supabase-js'
import { invitationSignupSchema } from '@/lib/schemas/auth'

export async function signupFromInvitation(input: unknown) {
  try {
    // Validate input (includes invitation token)
    const validated = invitationSignupSchema.parse(input)

    // Use admin client to create user with auto-confirmed email
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // SECURITY FIX (Issue #58): Validate email matches invitation
    const { data: invitation, error: inviteError } = await adminClient
      .from('organization_invitations')
      .select('id, email, expires_at, accepted_at, organization_id, role')
      .eq('id', validated.invitationToken)
      .single()

    if (inviteError || !invitation) {
      return { success: false, error: 'Invalid invitation token' }
    }

    // Check if invitation email matches signup email (case-insensitive)
    if (invitation.email.toLowerCase() !== validated.email.toLowerCase()) {
      return { success: false, error: 'Email does not match invitation' }
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return { success: false, error: 'Invitation has expired' }
    }

    // Check if invitation has already been accepted
    if (invitation.accepted_at) {
      return { success: false, error: 'Invitation has already been used' }
    }

    // Create user with email_confirm: true (auto-confirms)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true, // ✅ Skip email confirmation for invited users
      user_metadata: {
        first_name: validated.firstName,
        last_name: validated.lastName
      }
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'User creation failed' }
    }

    // handle_new_user() trigger will create public.users record

    // Create organization_members record for the new user
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        user_id: authData.user.id,
        organization_id: invitation.organization_id,
        role: invitation.role
      })

    if (memberError) {
      // Rollback: delete the created user
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: 'Failed to add user to organization' }
    }

    // Mark invitation as accepted
    await adminClient
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', validated.invitationToken)

    return {
      success: true,
      user: authData.user,
      email: validated.email // Return for client-side sign-in
    }
  } catch (error) {
    // Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> }
      return { success: false, error: zodError.issues[0]?.message || 'Validation failed' }
    }

    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'An unexpected error occurred' }
  }
}
