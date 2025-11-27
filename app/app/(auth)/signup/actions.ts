/**
 * Signup Server Actions
 *
 * Handles user signup for multi-org platform
 * Part of Issue #54: Self-Service Onboarding
 * Updated for Issue #74: Multi-Environment Support
 */

'use server'

import { createClient } from '@/utils/supabase/server'
import { signupSchema } from '@/lib/schemas/auth'
import { redirect } from 'next/navigation'
import { getAuthConfirmUrl } from '@/lib/utils/url'

export async function signupAction(input: unknown) {
  try {
    // Validate input with Zod schema
    const validated = signupSchema.parse(input)

    const supabase = await createClient()

    // Create auth user with environment-aware email redirect
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          first_name: validated.firstName,
          last_name: validated.lastName
        },
        emailRedirectTo: getAuthConfirmUrl()
      }
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'User creation failed' }
    }

    // handle_new_user() trigger will create public.users record

    return { success: true, user: authData.user }
  } catch (error) {
    // Zod validation errors
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }

    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Signup and redirect to onboarding
 */
export async function signupAndRedirectAction(input: unknown) {
  const result = await signupAction(input)

  if (!result.success) {
    return result
  }

  // Redirect to onboarding flow
  redirect('/onboarding')
}
