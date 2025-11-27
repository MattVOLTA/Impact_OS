/**
 * Team Management Server Actions
 *
 * Part of Issue #56: Admin User Management - Team Page
 *
 * Server Actions provide type-safe server-side mutations with:
 * - Automatic revalidation
 * - Progressive enhancement
 * - No API route boilerplate
 *
 * Following best practices:
 * - 'use server' directive
 * - Delegate to DAL layer
 * - Revalidate affected paths
 * - Return success/error objects
 */

'use server'

import {
  changeUserRole as changeUserRoleDAL,
  removeMember as removeMemberDAL,
  type UserRole
} from '@/lib/dal/team'
import { getCurrentOrganizationId } from '@/lib/dal/shared'
import { inviteUserToOrganization } from '@/lib/dal/invitations'
import { revalidatePath } from 'next/cache'

/**
 * Change a user's role in the organization
 *
 * @param params.targetUserId - User whose role to change
 * @param params.newRole - New role to assign
 * @returns Success or error message
 */
export async function changeUserRole(params: {
  targetUserId: string
  newRole: UserRole
}): Promise<{ success: boolean; error?: string }> {
  try {
    await changeUserRoleDAL(params)
    revalidatePath('/team')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change user role'
    }
  }
}

/**
 * Remove a member from the organization
 *
 * @param targetUserId - User to remove
 * @returns Success or error message
 */
export async function removeMember(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await removeMemberDAL(targetUserId)
    revalidatePath('/team')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove member'
    }
  }
}

/**
 * Invite a new member to the organization
 *
 * @param params.email - Email address to invite
 * @param params.role - Role to assign
 * @returns Success or error message
 */
export async function inviteMember(params: {
  email: string
  role: 'admin' | 'editor' | 'viewer'
}): Promise<{ success: boolean; error?: string }> {
  try {
    const organizationId = await getCurrentOrganizationId()

    // Debug: Log the actual value being passed
    console.log('inviteMember: organizationId =', organizationId, 'type =', typeof organizationId)

    // Validate before passing to DAL
    if (!organizationId || typeof organizationId !== 'string') {
      throw new Error(`Invalid organization ID returned: ${organizationId}`)
    }

    // Additional check: Is it a valid UUID format?
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    if (!uuidRegex.test(organizationId)) {
      throw new Error(`Organization ID is not a valid UUID: ${organizationId}`)
    }

    await inviteUserToOrganization({
      email: params.email,
      organizationId,
      role: params.role
    })

    revalidatePath('/team')
    return { success: true }
  } catch (error) {
    // Log full error for debugging
    console.error('inviteMember error:', error)

    // Handle Zod validation errors (format nicely for users)
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string; path: any[] }> }
      const firstError = zodError.issues[0]
      console.log('Zod validation failed:', firstError)
      return {
        success: false,
        error: firstError?.message || 'Validation failed'
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invitation'
    }
  }
}
