/**
 * Data Access Layer for Organizations (Multi-Org Support)
 *
 * Handles user memberships across multiple organizations.
 * Part of Issue #54: Self-Service Onboarding
 */

'use server'

import { cache } from 'react'
import { requireAuth } from './shared'
import { createOrganizationSchema } from '@/lib/schemas/organization'

interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

interface OrganizationMember {
  id: string
  user_id: string
  organization_id: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  created_at: string
  updated_at: string
}

/**
 * Get all organizations the current user belongs to
 * Cached per request to avoid multiple DB calls
 */
export const getUserOrganizations = cache(async (): Promise<Organization[]> => {
  const { user, supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      organization:tenants (
        id,
        name,
        slug,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Failed to fetch organizations: ${error.message}`)
  }

  // Extract organizations from nested structure
  const organizations = data
    .map((item: any) => item.organization)
    .filter(Boolean) as Organization[]

  return organizations
})

/**
 * Get user's membership/role in a specific organization
 */
export async function getOrganizationMembership(
  organizationId: string
): Promise<OrganizationMember | null> {
  const { user, supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch membership: ${error.message}`)
  }

  return data
}

/**
 * Create new organization and make current user admin
 * Returns the created organization
 *
 * Uses admin client to bypass RLS for tenant creation
 * (chicken-and-egg: can't check membership on tenant that doesn't exist yet)
 */
export async function createOrganization(input: {
  name: string
  slug?: string
}): Promise<Organization> {
  const { user } = await requireAuth()

  // Validate input
  const validated = createOrganizationSchema.parse(input)

  // Generate slug from name if not provided
  let slug =
    validated.slug ||
    validated.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

  // Use admin client to create organization (bypasses RLS)
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

  // Try to create organization
  let { data: org, error: orgError } = await adminClient
    .from('tenants')
    .insert({
      name: validated.name,
      slug
    })
    .select()
    .single()

  // If duplicate slug, add a random suffix and retry once
  if (orgError && orgError.code === '23505' && orgError.message.includes('slug')) {
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    slug = `${slug}-${randomSuffix}`

    const retry = await adminClient
      .from('tenants')
      .insert({
        name: validated.name,
        slug
      })
      .select()
      .single()

    org = retry.data
    orgError = retry.error
  }

  if (orgError) {
    // Provide user-friendly error messages
    if (orgError.code === '23505') {
      throw new Error('An organization with this name already exists. Please choose a different name.')
    }
    throw new Error(`Failed to create organization: ${orgError.message}`)
  }

  // Add user as admin (also use admin client for consistency)
  const { error: memberError } = await adminClient
    .from('organization_members')
    .insert({
      user_id: user.id,
      organization_id: org.id,
      role: 'admin'
    })

  if (memberError) {
    // Rollback: Delete org if member creation fails
    await adminClient.from('tenants').delete().eq('id', org.id)
    throw new Error(`Failed to add user as admin: ${memberError.message}`)
  }

  // Also create tenant_config for the new org
  await adminClient.from('tenant_config').insert({
    tenant_id: org.id,
    feature_company_updates: true,
    feature_interactions: true,
    feature_fireflies: false,
    feature_advisor_profiles: true
  })

  return org
}

/**
 * Switch current active organization
 * Verifies user has access to the organization
 */
export async function switchOrganization(organizationId: string): Promise<{
  success: boolean
  organizationId: string
}> {
  const { user } = await requireAuth()

  // Verify user is member of this org
  const membership = await getOrganizationMembership(organizationId)

  if (!membership) {
    throw new Error('You are not a member of this organization')
  }

  // Return success (actual session/cookie storage handled in API route)
  return { success: true, organizationId }
}

/**
 * Delete an organization
 * Only admins can delete organizations
 * Cascades to all related data (companies, contacts, interactions, etc.)
 *
 * @param organizationId - UUID of organization to delete
 * @param confirmationText - Must be "DELETE" to confirm deletion
 */
export async function deleteOrganization(
  organizationId: string,
  confirmationText: string
): Promise<{ success: boolean }> {
  const { user } = await requireAuth()

  // Verify confirmation text
  if (confirmationText !== 'DELETE') {
    throw new Error('You must type DELETE to confirm deletion')
  }

  // Verify user is admin of this org
  const membership = await getOrganizationMembership(organizationId)

  if (!membership || membership.role !== 'admin') {
    throw new Error('Only organization admins can delete the organization')
  }

  // Use admin client to delete (bypasses RLS)
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

  // Delete organization (cascades to all related data via ON DELETE CASCADE)
  const { error } = await adminClient
    .from('tenants')
    .delete()
    .eq('id', organizationId)

  if (error) {
    throw new Error(`Failed to delete organization: ${error.message}`)
  }

  return { success: true }
}
