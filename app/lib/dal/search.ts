import { requireAuth, getCurrentTenantId } from './shared'

export interface UniversalSearchResult {
  id: string
  entity_type: 'company' | 'contact' | 'program'
  title: string
  subtitle: string
  relevance: number
}

/**
 * Performs a universal search across companies, contacts, and programs
 * using full-text search with relevance ranking.
 *
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of search results with entity type and relevance
 */
export async function universalSearch(
  query: string,
  limit: number = 10
): Promise<UniversalSearchResult[]> {
  // Return empty array for empty or whitespace queries
  if (!query || query.trim().length === 0) {
    return []
  }

  const { supabase } = await requireAuth()
  const tenantId = await getCurrentTenantId()

  const { data, error } = await supabase.rpc('universal_search', {
    search_query: query.trim(),
    tenant_id_param: tenantId,
    result_limit: limit,
  })

  if (error) {
    throw error
  }

  return data || []
}
