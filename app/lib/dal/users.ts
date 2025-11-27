/**
 * Data Access Layer - User Preferences
 *
 * Following DAL pattern with requireAuth() and React cache().
 */

'use server'

import { cache } from 'react'
import { requireAuth } from './shared'
import type { FilterPreferences, UserPreferences } from '@/lib/types/user-preferences'

/**
 * Get user preferences from database
 * Cached per request to avoid multiple DB calls
 */
export const getUserPreferences = cache(async (): Promise<UserPreferences> => {
  const { user, supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('users')
    .select('preferences')
    .eq('id', user.id)
    .single()

  if (error || !data || !data.preferences) {
    return { filters: { companies: {}, contacts: {} } }
  }

  return (data.preferences as UserPreferences) || { filters: { companies: {}, contacts: {} } }
})

/**
 * Update user preferences in database
 * Merges with existing preferences
 */
export async function updateUserPreferences(
  page: 'companies' | 'contacts',
  filterType: 'filters',
  preferences: FilterPreferences
): Promise<UserPreferences> {
  const { user, supabase } = await requireAuth()

  // Fetch current preferences to merge
  const current = await getUserPreferences()

  const updated: UserPreferences = {
    ...current,
    [filterType]: {
      ...current[filterType],
      [page]: preferences
    }
  }

  const { error } = await supabase
    .from('users')
    .update({ preferences: updated })
    .eq('id', user.id)

  if (error) {
    throw new Error(`Failed to update preferences: ${error.message}`)
  }

  return updated
}
