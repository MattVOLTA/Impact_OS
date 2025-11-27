/**
 * Data Access Layer for Organization Invitations
 *
 * Handles email invitations for joining organizations
 * Part of Issue #54: Self-Service Onboarding - Phase 5
 */

'use server'

import { requireAuth } from './shared'
import { getOrganizationMembership } from './organizations'
import { inviteMemberSchema } from '@/lib/schemas/organization'

interface Invitation {
  id: string
  email: string
  organization_id: string
  role: 'admin' | 'editor' | 'viewer'
  token: string
  expires_at: string
  invited_by: string | null
  accepted_at: string | null
  created_at: string
}

interface InvitationWithOrg extends Invitation {
  organization: {
    id: string
    name: string
    slug: string
  }
}

/**
 * Invite a user to join an organization
 *
 * Sends custom email with invitation link
 * User clicks link → Streamlined signup (just password) → Auto-accepts → Joined!
 *
 * Part of Issue #56: Team Management
 */
export async function inviteUserToOrganization(input: {
  email: string
  organizationId: string
  role: 'admin' | 'editor' | 'viewer'
}): Promise<Invitation> {
  const { user, supabase } = await requireAuth()

  // Validate input
  const validated = inviteMemberSchema.parse(input)

  // Verify current user is admin or owner of this org
  const membership = await getOrganizationMembership(validated.organizationId)

  if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
    throw new Error('Only organization admins and owners can invite members')
  }

  // Check if user already exists and is member
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', validated.email)
    .maybeSingle()

  if (existingUser) {
    // Check if already a member
    const { data: existingMembership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', existingUser.id)
      .eq('organization_id', validated.organizationId)
      .maybeSingle()

    if (existingMembership) {
      throw new Error('User is already a member of this organization')
    }
  }

  // Create invitation
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .insert({
      email: validated.email,
      organization_id: validated.organizationId,
      role: validated.role,
      expires_at: expiresAt.toISOString(),
      invited_by: user.id
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`)
  }

  // Send invitation email via Resend
  try {
    const { sendInvitationEmail } = await import('@/lib/email/resend')

    // Get org name
    const { data: org } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', validated.organizationId)
      .single()

    // Get inviter name
    const { data: currentUser } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    const inviterName = currentUser
      ? `${currentUser.first_name} ${currentUser.last_name}`.trim()
      : user.email || 'A team member'

    await sendInvitationEmail({
      to: validated.email,
      organizationName: org?.name || 'the organization',
      inviterName,
      role: validated.role,
      inviteToken: invitation.token
    })

    console.log('Invitation email sent:', validated.email)
  } catch (emailError) {
    console.error('Failed to send invitation email:', emailError)
    // Don't throw - invitation is created, admin can manually share link
  }

  return invitation as Invitation
}

/**
 * Get invitation by token (for accept-invite page)
 */
export async function getInvitationByToken(
  token: string
): Promise<InvitationWithOrg | null> {
  // Use admin client to bypass RLS (invitation may be for unauthenticated user)
  const { createClient } = await import('@supabase/supabase-js')
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

  const { data, error } = await adminClient
    .from('organization_invitations')
    .select(
      `
      *,
      organization:tenants (
        id,
        name,
        slug
      )
    `
    )
    .eq('token', token)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch invitation: ${error.message}`)
  }

  return data as InvitationWithOrg | null
}

/**
 * Accept an invitation and join the organization
 */
export async function acceptInvitation(token: string): Promise<{
  success: boolean
  organizationId: string
}> {
  const { user, supabase } = await requireAuth()

  // Get invitation (admin client to bypass RLS)
  const invitation = await getInvitationByToken(token)

  if (!invitation) {
    throw new Error('Invalid invitation token')
  }

  // Verify not expired
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('Invitation has expired')
  }

  // Verify not already accepted
  if (invitation.accepted_at) {
    throw new Error('Invitation has already been used')
  }

  // Verify email matches logged-in user
  if (invitation.email !== user.email) {
    throw new Error('This invitation is for a different email address')
  }

  // Use admin client to add user to organization (bypasses RLS)
  // This is safe because we validated the invitation token server-side
  const { createClient } = await import('@supabase/supabase-js')
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

  // Add user to organization
  const { error: memberError } = await adminClient
    .from('organization_members')
    .insert({
      user_id: user.id,
      organization_id: invitation.organization_id,
      role: invitation.role
    })

  if (memberError) {
    throw new Error(`Failed to join organization: ${memberError.message}`)
  }

  // Mark invitation as accepted (use same admin client)
  const { error: updateError } = await adminClient
    .from('organization_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  if (updateError) {
    console.error('Failed to mark invitation as accepted:', updateError)
    // Don't throw - user is already added to org
  }

  // Create user session for the new organization (use admin client)
  await adminClient
    .from('user_sessions')
    .upsert({
      user_id: user.id,
      active_organization_id: invitation.organization_id
    })

  return {
    success: true,
    organizationId: invitation.organization_id
  }
}

/**
 * Get current organization ID (used in invitation flow)
 */
export async function getCurrentOrganizationId(): Promise<string> {
  const { getCurrentOrganizationId: getOrgId } = await import('./shared')
  return getOrgId()
}

/**
 * Get pending invitations for current organization
 * Only admins can view organization invitations
 */
export async function getPendingInvitations(
  organizationId: string
): Promise<Invitation[]> {
  const { supabase } = await requireAuth()

  // Verify user is admin
  const membership = await getOrganizationMembership(organizationId)

  if (!membership || membership.role !== 'admin') {
    throw new Error('Only organization admins can view invitations')
  }

  // Use admin client to bypass RLS
  const { createClient } = await import('@supabase/supabase-js')
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

  const { data, error } = await adminClient
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch invitations: ${error.message}`)
  }

  return data as Invitation[]
}
