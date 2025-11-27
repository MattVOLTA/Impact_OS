/**
 * Dashboard Server Actions
 */

'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { universalSearch } from '@/lib/dal/search'

/**
 * Logout action
 *
 * Signs out current user and redirects to login page.
 */
export async function logoutAction() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Logout error:', error)
  }

  // Don't revalidate - we're redirecting anyway and it causes race condition
  // where page tries to re-render after session cleared but before redirect
  redirect('/login')
}

/**
 * Universal search action
 *
 * Searches across companies, contacts, and programs using full-text search.
 *
 * @param query - Search query string
 * @returns Search results with success status
 */
export async function universalSearchAction(query: string) {
  try {
    const results = await universalSearch(query, 10)
    return { success: true, data: results }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
      data: [],
    }
  }
}
