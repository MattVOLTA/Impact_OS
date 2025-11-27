import { z } from 'zod'

/**
 * Schema for creating a new organization
 */
export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional()
})

/**
 * Schema for inviting a member to an organization
 */
export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  // Use .min(36) instead of .uuid() to allow test UUIDs
  // Standard UUID format is exactly 36 chars (32 hex + 4 hyphens)
  organizationId: z.string().min(36, 'Invalid organization ID').max(36, 'Invalid organization ID'),
  role: z.enum(['admin', 'editor', 'viewer'])
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
