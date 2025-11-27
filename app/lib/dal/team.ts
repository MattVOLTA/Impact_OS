/**
 * Team Management Data Access Layer
 *
 * Part of Issue #56: Admin User Management - Team Page
 *
 * Following DAL pattern:
 * - All auth checks centralized here
 * - Permission validation server-side
 * - Audit logging for all actions
 * - Multi-org isolation via RLS
 *
 * Architecture:
 * - Core business logic functions (testable, no Next.js deps)
 * - DAL wrapper functions (require Next.js context)
 *
 * See docs/architecture/auth-best-practices.md for patterns
 */

import { requireAuth, getCurrentOrganizationId, getCurrentUserRole } from './shared'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type OrganizationMember = {
  user_id: string
  role: UserRole
  created_at: string
  users: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

async function requireAdminOrOwner(): Promise<{
  userId: string
  role: 'admin' | 'owner'
  orgId: string
}> {
  const { user } = await requireAuth()
  const role = await getCurrentUserRole()
  const orgId = await getCurrentOrganizationId()

  if (role !== 'admin' && role !== 'owner') {
    throw new Error('Only admins and owners can manage team members')
  }

  return { userId: user.id, role, orgId }
}

async function requireOwner(): Promise<{ userId: string; orgId: string }> {
  const { user } = await requireAuth()
  const role = await getCurrentUserRole()
  const orgId = await getCurrentOrganizationId()

  if (role !== 'owner') {
    throw new Error('Only owners can perform this action')
  }

  return { userId: user.id, orgId }
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

async function logAuditEvent(params: {
  organizationId: string
  actorUserId: string
  action: string
  targetUserId?: string
  targetEmail?: string
  metadata?: Record<string, any>
}): Promise<void> {
  // Create admin client to bypass RLS (audit logs are append-only via service role)
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

  const { error } = await adminClient.from('organization_audit_log').insert({
    organization_id: params.organizationId,
    actor_user_id: params.actorUserId,
    action: params.action,
    target_user_id: params.targetUserId,
    target_email: params.targetEmail,
    metadata: params.metadata || {}
  })

  if (error) {
    console.error('Failed to log audit event:', error)
    // Don't throw - audit logging failure shouldn't block operations
  }
}

// ============================================================================
// CORE BUSINESS LOGIC (Testable - No Next.js dependencies)
// ============================================================================

/**
 * Core: Fetch organization members
 * Testable function - accepts client and org ID
 *
 * Note: Uses admin client internally to fetch user details (bypasses RLS on users table)
 */
export async function fetchOrganizationMembers(
  client: SupabaseClient,
  organizationId: string
): Promise<OrganizationMember[]> {
  // First get organization members
  const { data: members, error: membersError } = await client
    .from('organization_members')
    .select('user_id, role, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })

  if (membersError) {
    throw membersError
  }

  if (!members || members.length === 0) {
    return []
  }

  // Get user details using admin client (bypasses RLS on users table)
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

  const userIds = members.map(m => m.user_id)
  const { data: users, error: usersError } = await adminClient
    .from('users')
    .select('id, email, first_name, last_name')
    .in('id', userIds)

  if (usersError) {
    throw usersError
  }

  // Combine the data
  const usersMap = new Map(users?.map(u => [u.id, u]) || [])

  return members.map(member => ({
    user_id: member.user_id,
    role: member.role as UserRole,
    created_at: member.created_at,
    users: usersMap.get(member.user_id) || {
      id: member.user_id,
      email: '',
      first_name: null,
      last_name: null
    }
  }))
}

/**
 * Core: Change user role with business rule validation
 * Testable function - accepts client, org ID, actor info, and target info
 *
 * SECURITY FIX (Issue #58): Uses database function with SELECT FOR UPDATE
 * to prevent TOCTOU race condition in concurrent owner demotions.
 */
export async function executeChangeUserRole(params: {
  client: SupabaseClient
  organizationId: string
  actorUserId: string
  actorRole: UserRole
  targetUserId: string
  newRole: UserRole
}): Promise<void> {
  // Call database function with SELECT FOR UPDATE locking
  // This prevents race conditions where concurrent demotions could create zero-owner orgs
  const { data, error } = await params.client.rpc('safe_change_user_role', {
    p_organization_id: params.organizationId,
    p_actor_user_id: params.actorUserId,
    p_actor_role: params.actorRole,
    p_target_user_id: params.targetUserId,
    p_new_role: params.newRole
  })

  if (error) {
    throw error
  }

  // Check if the function returned an error
  const result = data as { success: boolean; error?: string; old_role?: string; new_role?: string }
  if (!result.success) {
    throw new Error(result.error || 'Role change failed')
  }

  // Log audit event
  await logAuditEvent({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: 'role_changed',
    targetUserId: params.targetUserId,
    metadata: {
      old_role: result.old_role,
      new_role: result.new_role
    }
  })
}

/**
 * Core: Remove member with business rule validation
 * Testable function - accepts client, org ID, actor info, and target info
 */
export async function executeRemoveMember(params: {
  client: SupabaseClient
  organizationId: string
  actorUserId: string
  actorRole: UserRole
  targetUserId: string
}): Promise<void> {
  // Business rule: Can't remove yourself
  if (params.targetUserId === params.actorUserId) {
    throw new Error('You cannot remove yourself from the organization')
  }

  // Get member info for audit log and permission checks
  const { data: member, error: fetchError } = await params.client
    .from('organization_members')
    .select('role')
    .eq('organization_id', params.organizationId)
    .eq('user_id', params.targetUserId)
    .single()

  if (fetchError || !member) {
    throw new Error('User is not a member of this organization')
  }

  // Get user email for audit log
  const { data: userData } = await params.client
    .from('users')
    .select('email')
    .eq('id', params.targetUserId)
    .single()

  // Business rule: Only owners can remove owners
  if (member.role === 'owner' && params.actorRole !== 'owner') {
    throw new Error('Only owners can remove other owners')
  }

  // Business rule: Can't remove last owner
  if (member.role === 'owner') {
    const { count } = await params.client
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', params.organizationId)
      .eq('role', 'owner')

    if (count === 1) {
      throw new Error('Cannot remove the last owner')
    }
  }

  // Remove member (CASCADE will handle user_sessions)
  const { error: deleteError } = await params.client
    .from('organization_members')
    .delete()
    .eq('organization_id', params.organizationId)
    .eq('user_id', params.targetUserId)

  if (deleteError) {
    throw deleteError
  }

  // Log audit event
  await logAuditEvent({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    action: 'member_removed',
    targetUserId: params.targetUserId,
    metadata: {
      removed_role: member.role,
      removed_email: userData?.email || 'unknown'
    }
  })
}

// ============================================================================
// DAL WRAPPER FUNCTIONS (Require Next.js request context)
// ============================================================================

/**
 * Get all members for current organization
 *
 * @throws {Error} If user is not admin or owner
 * @returns {Promise<OrganizationMember[]>} List of organization members
 */
export async function getOrganizationMembers(): Promise<OrganizationMember[]> {
  await requireAdminOrOwner() // Permission check
  const { supabase } = await requireAuth()
  const orgId = await getCurrentOrganizationId()

  return fetchOrganizationMembers(supabase, orgId)
}

/**
 * Change a user's role in the organization (DAL wrapper)
 *
 * Business rules enforced:
 * - User cannot change their own role
 * - Only owners can promote to owner
 * - Only owners can change owner roles
 * - Cannot demote last owner
 *
 * @param params.targetUserId - User whose role to change
 * @param params.newRole - New role to assign
 * @throws {Error} If business rules violated
 */
export async function changeUserRole(params: {
  targetUserId: string
  newRole: UserRole
}): Promise<void> {
  const { userId, role, orgId } = await requireAdminOrOwner()

  // Create admin client for bypassing RLS on updates
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

  await executeChangeUserRole({
    client: adminClient,
    organizationId: orgId,
    actorUserId: userId,
    actorRole: role,
    targetUserId: params.targetUserId,
    newRole: params.newRole
  })
}

/**
 * Remove a member from the organization (DAL wrapper)
 *
 * Business rules enforced:
 * - User cannot remove themselves
 * - Only owners can remove owners
 * - Cannot remove last owner
 *
 * @param targetUserId - User to remove
 * @throws {Error} If business rules violated
 */
export async function removeMember(targetUserId: string): Promise<void> {
  const { userId, role, orgId } = await requireAdminOrOwner()

  // Create admin client
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

  await executeRemoveMember({
    client: adminClient,
    organizationId: orgId,
    actorUserId: userId,
    actorRole: role,
    targetUserId
  })
}

// ============================================================================
// INVITATION MANAGEMENT
// ============================================================================

export type PendingInvitation = {
  id: string
  email: string
  role: UserRole
  expires_at: string
  created_at: string
  invited_by: string
  inviter: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

/**
 * Get pending invitations for current organization
 *
 * @throws {Error} If user is not admin or owner
 * @returns {Promise<PendingInvitation[]>} List of pending invitations
 */
export async function getPendingInvitations(): Promise<PendingInvitation[]> {
  await requireAdminOrOwner()
  const { supabase } = await requireAuth()
  const orgId = await getCurrentOrganizationId()

  // Create admin client to fetch inviter details (bypasses RLS on users table)
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

  const { data: invitations, error } = await supabase
    .from('organization_invitations')
    .select('id, email, role, expires_at, created_at, invited_by')
    .eq('organization_id', orgId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  if (!invitations || invitations.length === 0) {
    return []
  }

  // Fetch inviter details
  const inviterIds = [...new Set(invitations.map(i => i.invited_by))]
  const { data: inviters } = await adminClient
    .from('users')
    .select('id, email, first_name, last_name')
    .in('id', inviterIds)

  const invitersMap = new Map(inviters?.map(u => [u.id, u]) || [])

  return invitations.map(inv => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as UserRole,
    expires_at: inv.expires_at,
    created_at: inv.created_at,
    invited_by: inv.invited_by,
    inviter: invitersMap.get(inv.invited_by) || {
      first_name: null,
      last_name: null,
      email: 'Unknown'
    }
  }))
}
