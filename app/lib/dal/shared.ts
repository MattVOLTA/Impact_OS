/**
 * Data Access Layer - Shared Auth Utilities
 *
 * See docs/architecture/auth-best-practices.md for patterns and rationale.
 * See docs/architecture/adr/001-use-dal-pattern-for-auth.md for decision context.
 */

import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'
import { type User } from '@supabase/supabase-js'

/**
 * Centralized authentication check for all data access operations.
 *
 * CRITICAL: This is the ONLY place where authentication should be checked.
 * Components should NEVER call getUser() directly.
 *
 * Cached for the lifetime of the request to prevent multiple auth calls.
 * Performance: 1 auth call per request vs N calls = 5-10x improvement
 *
 * @throws {Error} 'Unauthorized' if user is not authenticated
 * @returns {Promise<{user: User, supabase: SupabaseClient}>} Authenticated user and client
 */
export const requireAuth = cache(async () => {
  const supabase = await createClient()

  // IMPORTANT: Use getUser() not getSession() on server
  // getSession() can be spoofed, getUser() validates with Auth server
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return { user, supabase }
})

/**
 * Get current tenant ID from authenticated user's JWT claims
 *
 * Requires Custom Access Token Hook to be enabled in Supabase Dashboard.
 * See CLAUDE.md for setup instructions.
 *
 * FALLBACK: If tenant_id not in JWT (hook not enabled), queries database.
 * This is slower but allows development before hook is enabled.
 *
 * @throws {Error} If tenant_id not found in JWT claims or database
 * @returns {Promise<string>} Current tenant UUID
 */
export async function getCurrentTenantId(): Promise<string> {
  const { user, supabase } = await requireAuth()

  // Primary: Tenant ID from JWT claims (fast - requires Custom Access Token Hook)
  let tenantId = user.app_metadata?.tenant_id || user.user_metadata?.tenant_id

  // Fallback: Query database if not in JWT (slower - hook not enabled yet)
  // Note: This requires bypassing RLS because the users table RLS policy
  // requires tenant_id in JWT, which creates a circular dependency.
  if (!tenantId) {
    // Use admin client to bypass RLS for this lookup
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
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      throw new Error(`Tenant ID not found. Please ensure Custom Access Token Hook is enabled in Supabase Dashboard. User: ${user.email}`)
    }

    tenantId = data.tenant_id
  }

  return tenantId
}

/**
 * Get current user's role from organization_members for ACTIVE organization
 *
 * FIXED (Issue #56): Now reads from organization_members.role for active org
 * instead of legacy users.role (single-org model)
 *
 * Multi-org users can have different roles in different organizations.
 * This function returns the role for the currently active organization.
 *
 * Uses service role to bypass RLS for reliable role checking.
 *
 * @throws {Error} If user has no role in active organization
 * @returns {Promise<'owner' | 'admin' | 'editor' | 'viewer'>} User role in active organization
 */
export async function getCurrentUserRole(): Promise<'owner' | 'admin' | 'editor' | 'viewer'> {
  const { user } = await requireAuth()
  const organizationId = await getCurrentOrganizationId()

  // Use admin client to bypass RLS (ensures reliable role checking)
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
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .single()

  if (error || !data) {
    console.error('Failed to get user role:', {
      userId: user.id,
      email: user.email,
      organizationId,
      error
    })
    throw new Error(
      `User has no role in active organization. User: ${user.email}, Org: ${organizationId}`
    )
  }

  return data.role as 'owner' | 'admin' | 'editor' | 'viewer'
}

/**
 * Get current user's information (name, email, role)
 *
 * @returns {Promise<{id: string, email: string, firstName: string, lastName: string, role: string}>} User info
 */
export async function getCurrentUser() {
  const { user, supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('users')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  if (error || !data) {
    // Return minimal info from auth.users
    return {
      id: user.id,
      email: user.email || '',
      firstName: '',
      lastName: '',
      role: 'viewer'
    }
  }

  return {
    id: user.id,
    email: user.email || '',
    firstName: data.first_name || '',
    lastName: data.last_name || '',
    role: data.role || 'viewer'
  }
}

/**
 * Get current active organization ID (multi-org support)
 *
 * Reads from user_sessions table (source of truth for RLS)
 * Cookie used as performance optimization (verified against session table)
 *
 * Part of Issue #55: Fixed to match what RLS policies see
 *
 * @throws {Error} If user has no organization memberships
 * @returns {Promise<string>} Current organization UUID
 */
export async function getCurrentOrganizationId(): Promise<string> {
  const { user, supabase } = await requireAuth()

  // Try cookie first (performance optimization)
  const cookieStore = await import('next/headers').then(m => m.cookies())
  const cookieValue = (await cookieStore).get('active_organization_id')

  if (cookieValue?.value) {
    // Verify cookie matches session table (trust but verify)
    const { data: session } = await supabase
      .from('user_sessions')
      .select('active_organization_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (session?.active_organization_id === cookieValue.value) {
      // Cookie matches session - return it
      return cookieValue.value
    }
  }

  // Cookie doesn't exist or doesn't match - read from session table (authoritative)
  const { data: session } = await supabase
    .from('user_sessions')
    .select('active_organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (session?.active_organization_id) {
    return session.active_organization_id
  }

  // No session found - get first organization user belongs to and initialize session
  const { getUserOrganizations } = await import('./organizations')
  const orgs = await getUserOrganizations()

  if (orgs.length === 0) {
    throw new Error('User has no organization memberships. Please create or join an organization.')
  }

  // Initialize session with first org
  const firstOrgId = orgs[0].id

  await supabase
    .from('user_sessions')
    .upsert({
      user_id: user.id,
      active_organization_id: firstOrgId
    })

  return firstOrgId
}
