import { z } from 'zod'

/**
 * Schema for user signup
 */
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required')
})

/**
 * Schema for invitation-based signup
 * SECURITY (Issue #58): Includes invitation token for email validation
 */
export const invitationSignupSchema = signupSchema.extend({
  invitationToken: z.string().uuid('Invalid invitation token')
})

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export type SignupInput = z.infer<typeof signupSchema>
export type InvitationSignupInput = z.infer<typeof invitationSignupSchema>
export type LoginInput = z.infer<typeof loginSchema>
