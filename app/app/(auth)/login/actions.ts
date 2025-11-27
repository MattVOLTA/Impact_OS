/**
 * Login Server Action
 *
 * SECURITY: The 'next' parameter is validated to prevent open redirect attacks (CWE-601)
 * See Issue #81 for details.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getSafeRedirectUrl } from '@/lib/utils/safe-redirect'

export async function loginAction(formData: FormData, next?: string) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')

  // Redirect to 'next' param if provided and valid, otherwise dashboard
  // Validation prevents open redirect attacks
  redirect(getSafeRedirectUrl(next || null, '/dashboard'))
}
