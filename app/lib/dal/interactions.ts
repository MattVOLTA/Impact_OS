/**
 * Data Access Layer - Interactions
 *
 * All interaction data access goes through this module.
 * Authentication is checked via requireAuth() before any database operation.
 *
 * Note: Current schema is Fireflies-specific (meetings only).
 * See docs/architecture/auth-best-practices.md for DAL pattern explanation.
 */

import { requireAuth } from './shared'

/**
 * Match confidence levels for auto-matched contacts
 * Database constraint: match_confidence = ANY (ARRAY['high', 'medium', 'low'])
 */
export type MatchConfidence = 'high' | 'medium' | 'low'

/**
 * Interaction type enum
 * Database constraint: interaction_type = ANY (ARRAY['meeting', 'email', 'call'])
 */
export type InteractionType = 'meeting' | 'email' | 'call'

/**
 * Interaction record (meetings, emails, calls)
 * Note: Full transcript data now stored in separate meeting_transcripts table
 */
export interface Interaction {
  id: string
  tenant_id: string
  interaction_type: InteractionType
  fireflies_transcript_id?: string | null
  title?: string | null
  summary?: string | null
  meeting_date?: string | null // ISO timestamp
  duration_minutes?: number | null
  audio_url?: string | null
  video_url?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

/**
 * Meeting transcript data (stored separately for performance)
 * Linked to interactions via interaction_id or fireflies_transcript_id
 */
export interface MeetingTranscript {
  id: string
  tenant_id: string
  interaction_id?: string | null
  fireflies_transcript_id?: string | null

  // Transcript content
  transcript?: string | null
  transcript_outline?: string | null
  transcript_detailed_summary?: string | null

  // Fireflies metadata
  fireflies_summary?: string | null
  fireflies_action_items?: string | null

  // Participant data
  speakers?: Record<string, any> | null
  participants?: Record<string, any> | null
  meeting_attendees?: Record<string, any> | null

  // Processing status
  processing_status?: string | null
  processing_error?: string | null
  processed_at?: string | null

  created_at: string
  updated_at: string
}

/**
 * Interaction with related contacts, companies, and optionally transcript
 */
export interface InteractionWithRelations extends Interaction {
  contacts?: Array<{
    id: string
    first_name: string
    last_name: string
    email?: string | null
    auto_matched?: boolean
    match_confidence?: MatchConfidence | null
  }>
  companies?: Array<{
    id: string
    business_name: string
  }>
  meeting_transcript?: MeetingTranscript | null
}

/**
 * Input for creating a new interaction
 */
export interface CreateInteractionInput {
  title: string
  interaction_type?: InteractionType
  meeting_date?: Date
  summary?: string | null
  contact_ids: string[]
  company_ids?: string[]
  fireflies_transcript_id?: string | null
}

/**
 * Input for updating an existing interaction
 */
export interface UpdateInteractionInput {
  title?: string
  interaction_type?: InteractionType
  meeting_date?: Date
  summary?: string | null
  contact_ids?: string[]
  company_ids?: string[]
}

/**
 * Filters for querying interactions
 */
export interface InteractionFilters {
  company_id?: string
  contact_id?: string
  date_from?: Date
  date_to?: Date
  search_query?: string
  limit?: number
  offset?: number
}

/**
 * Get a single interaction by ID with related contacts and companies
 *
 * RLS ensures user can only access interactions in their tenant.
 *
 * @param {string} interactionId - Interaction UUID
 * @returns {Promise<InteractionWithRelations | null>} Interaction with relations or null
 */
export async function getInteraction(
  interactionId: string
): Promise<InteractionWithRelations | null> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('interactions')
    .select(`
      *,
      interaction_contacts (
        auto_matched,
        match_confidence,
        contact:contacts (
          id,
          first_name,
          last_name,
          email
        )
      ),
      interaction_companies (
        company:companies (
          id,
          business_name
        )
      )
    `)
    .eq('id', interactionId)
    .single()

  if (error) {
    return null
  }

  // Transform data to flatten relations
  return {
    ...data,
    contacts: data.interaction_contacts?.map((ic: any) => ({
      ...ic.contact,
      auto_matched: ic.auto_matched,
      match_confidence: ic.match_confidence
    })) || [],
    companies: data.interaction_companies?.map((ic: any) => ic.company) || []
  }
}

/**
 * Get all interactions for the current tenant with optional filtering
 *
 * RLS automatically filters by tenant_id from JWT claims.
 *
 * @param {InteractionFilters} filters - Optional filters
 * @returns {Promise<InteractionWithRelations[]>} List of interactions with relations
 */
export async function getInteractions(
  filters?: InteractionFilters
): Promise<InteractionWithRelations[]> {
  const { supabase } = await requireAuth()

  let query = supabase
    .from('interactions')
    .select(`
      *,
      interaction_contacts (
        auto_matched,
        match_confidence,
        contact:contacts (
          id,
          first_name,
          last_name,
          email
        )
      ),
      interaction_companies (
        company:companies (
          id,
          business_name
        )
      )
    `)
    .order('meeting_date', { ascending: false, nullsFirst: false })

  // Apply filters
  if (filters?.date_from) {
    query = query.gte('meeting_date', filters.date_from.toISOString())
  }

  if (filters?.date_to) {
    query = query.lte('meeting_date', filters.date_to.toISOString())
  }

  if (filters?.search_query) {
    query = query.ilike('title', `%${filters.search_query}%`)
  }

  // Pagination
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch interactions: ${error.message}`)
  }

  // Transform data to flatten relations
  return (data || []).map(interaction => ({
    ...interaction,
    contacts: interaction.interaction_contacts?.map((ic: any) => ({
      ...ic.contact,
      auto_matched: ic.auto_matched,
      match_confidence: ic.match_confidence
    })) || [],
    companies: interaction.interaction_companies?.map((ic: any) => ic.company) || []
  }))
}

/**
 * Get paginated interactions for current tenant with optional search
 *
 * Search filters ALL records in database BEFORE pagination.
 * Returns total count of filtered results for pagination UI.
 *
 * @param params - Pagination parameters
 * @returns Object with interactions array and total count
 */
export async function getInteractionsPaginated({
  search,
  page = 1,
  pageSize = 50
}: {
  search?: string
  page?: number
  pageSize?: number
}): Promise<{ interactions: InteractionWithRelations[], totalCount: number }> {
  const { supabase } = await requireAuth()

  // Calculate range
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('interactions')
    .select(`
      *,
      interaction_contacts (
        auto_matched,
        match_confidence,
        contact:contacts (
          id,
          first_name,
          last_name,
          email
        )
      ),
      interaction_companies (
        company:companies (
          id,
          business_name
        )
      )
    `, { count: 'exact' })
    .order('meeting_date', { ascending: false, nullsFirst: false })

  // Apply search filter BEFORE pagination
  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  // Apply pagination
  const { data, error, count } = await query.range(from, to)

  if (error) {
    throw new Error(`Failed to fetch interactions: ${error.message}`)
  }

  // Transform data to flatten relations
  const interactions = (data || []).map(interaction => ({
    ...interaction,
    contacts: interaction.interaction_contacts?.map((ic: any) => ({
      ...ic.contact,
      auto_matched: ic.auto_matched,
      match_confidence: ic.match_confidence
    })) || [],
    companies: interaction.interaction_companies?.map((ic: any) => ic.company) || []
  }))

  return {
    interactions,
    totalCount: count || 0
  }
}

/**
 * Get interactions by company ID
 *
 * RLS ensures user can only access interactions in their tenant.
 *
 * @param {string} companyId - Company UUID
 * @returns {Promise<InteractionWithRelations[]>} List of interactions for the company
 */
export async function getInteractionsByCompany(
  companyId: string
): Promise<InteractionWithRelations[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('interactions')
    .select(`
      *,
      interaction_contacts (
        auto_matched,
        match_confidence,
        contact:contacts (
          id,
          first_name,
          last_name,
          email
        )
      ),
      interaction_companies!inner (
        company:companies (
          id,
          business_name
        )
      )
    `)
    .eq('interaction_companies.company_id', companyId)
    .order('meeting_date', { ascending: false, nullsFirst: false })

  if (error) {
    throw new Error(`Failed to fetch company interactions: ${error.message}`)
  }

  return (data || []).map(interaction => ({
    ...interaction,
    contacts: interaction.interaction_contacts?.map((ic: any) => ({
      ...ic.contact,
      auto_matched: ic.auto_matched,
      match_confidence: ic.match_confidence
    })) || [],
    companies: interaction.interaction_companies?.map((ic: any) => ic.company) || []
  }))
}

/**
 * Get interactions by contact ID
 *
 * RLS ensures user can only access interactions in their tenant.
 *
 * @param {string} contactId - Contact UUID
 * @returns {Promise<InteractionWithRelations[]>} List of interactions involving the contact
 */
export async function getInteractionsByContact(
  contactId: string
): Promise<InteractionWithRelations[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('interactions')
    .select(`
      *,
      interaction_contacts!inner (
        auto_matched,
        match_confidence,
        contact:contacts (
          id,
          first_name,
          last_name,
          email
        )
      ),
      interaction_companies (
        company:companies (
          id,
          business_name
        )
      )
    `)
    .eq('interaction_contacts.contact_id', contactId)
    .order('meeting_date', { ascending: false, nullsFirst: false })

  if (error) {
    throw new Error(`Failed to fetch contact interactions: ${error.message}`)
  }

  return (data || []).map(interaction => ({
    ...interaction,
    contacts: interaction.interaction_contacts?.map((ic: any) => ({
      ...ic.contact,
      auto_matched: ic.auto_matched,
      match_confidence: ic.match_confidence
    })) || [],
    companies: interaction.interaction_companies?.map((ic: any) => ic.company) || []
  }))
}

/**
 * Get recent interactions (for dashboard/overview)
 *
 * @param {number} limit - Number of recent interactions to fetch
 * @returns {Promise<InteractionWithRelations[]>} Recent interactions
 */
export async function getRecentInteractions(
  limit: number = 10
): Promise<InteractionWithRelations[]> {
  return getInteractions({ limit, offset: 0 })
}

/**
 * Create a new interaction with contact and company associations
 *
 * RLS automatically sets tenant_id from JWT claims.
 *
 * @param {CreateInteractionInput} input - Interaction data
 * @returns {Promise<Interaction>} Created interaction
 */
export async function createInteraction(
  input: CreateInteractionInput
): Promise<Interaction> {
  const { contact_ids, company_ids, ...interactionData } = input

  const { supabase } = await requireAuth()

  // Get tenant_id from current user (required for RLS with_check policy)
  const { getCurrentTenantId } = await import('./shared')
  const tenant_id = await getCurrentTenantId()

  // Prepare interaction data
  const insertData: any = {
    tenant_id, // Explicitly set tenant_id for RLS
    title: interactionData.title,
    interaction_type: interactionData.interaction_type || 'meeting',
    summary: interactionData.summary,
    fireflies_transcript_id: interactionData.fireflies_transcript_id
  }

  if (interactionData.meeting_date) {
    insertData.meeting_date = interactionData.meeting_date.toISOString()
  }

  // Create interaction
  const { data: interaction, error } = await supabase
    .from('interactions')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create interaction: ${error.message}`)
  }

  // Associate contacts (required - at least one)
  if (contact_ids && contact_ids.length > 0) {
    const contactAssociations = contact_ids.map(contact_id => ({
      interaction_id: interaction.id,
      contact_id
    }))

    const { error: contactError } = await supabase
      .from('interaction_contacts')
      .insert(contactAssociations)

    if (contactError) {
      // Rollback: delete the interaction
      await supabase.from('interactions').delete().eq('id', interaction.id)
      throw new Error(`Failed to associate contacts: ${contactError.message}`)
    }
  }

  // Associate companies (optional)
  if (company_ids && company_ids.length > 0) {
    const companyAssociations = company_ids.map(company_id => ({
      interaction_id: interaction.id,
      company_id
    }))

    const { error: companyError } = await supabase
      .from('interaction_companies')
      .insert(companyAssociations)

    if (companyError) {
      // Log error but don't fail - interaction was created successfully
      console.error('Failed to associate companies:', companyError)
    }
  }

  return interaction as Interaction
}

/**
 * Update an interaction and optionally update associations
 *
 * RLS ensures user can only update interactions in their tenant.
 *
 * @param {string} interactionId - Interaction UUID
 * @param {UpdateInteractionInput} updates - Fields to update
 * @returns {Promise<Interaction>} Updated interaction
 */
export async function updateInteraction(
  interactionId: string,
  updates: UpdateInteractionInput
): Promise<Interaction> {
  const { contact_ids, company_ids, ...interactionData } = updates

  const { supabase } = await requireAuth()

  // Prepare update data
  const updateData: any = {}
  if (interactionData.title !== undefined) updateData.title = interactionData.title
  if (interactionData.interaction_type !== undefined) updateData.interaction_type = interactionData.interaction_type
  if (interactionData.summary !== undefined) updateData.summary = interactionData.summary
  if (interactionData.meeting_date) {
    updateData.meeting_date = interactionData.meeting_date.toISOString()
  }

  // Update interaction
  const { data: interaction, error } = await supabase
    .from('interactions')
    .update(updateData)
    .eq('id', interactionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update interaction: ${error.message}`)
  }

  // Update contact associations if provided
  if (contact_ids !== undefined) {
    // Delete existing associations
    await supabase
      .from('interaction_contacts')
      .delete()
      .eq('interaction_id', interactionId)

    // Insert new associations
    if (contact_ids.length > 0) {
      const contactAssociations = contact_ids.map(contact_id => ({
        interaction_id: interactionId,
        contact_id
      }))

      const { error: contactError } = await supabase
        .from('interaction_contacts')
        .insert(contactAssociations)

      if (contactError) {
        console.error('Failed to update contact associations:', contactError)
      }
    }
  }

  // Update company associations if provided
  if (company_ids !== undefined) {
    // Delete existing associations
    await supabase
      .from('interaction_companies')
      .delete()
      .eq('interaction_id', interactionId)

    // Insert new associations
    if (company_ids.length > 0) {
      const companyAssociations = company_ids.map(company_id => ({
        interaction_id: interactionId,
        company_id
      }))

      const { error: companyError } = await supabase
        .from('interaction_companies')
        .insert(companyAssociations)

      if (companyError) {
        console.error('Failed to update company associations:', companyError)
      }
    }
  }

  return interaction as Interaction
}

/**
 * Delete an interaction
 *
 * RLS ensures user can only delete interactions in their tenant.
 * Cascading deletes will remove related records (interaction_contacts, interaction_companies).
 *
 * @param {string} interactionId - Interaction UUID
 * @returns {Promise<void>}
 */
export async function deleteInteraction(interactionId: string): Promise<void> {
  const { supabase } = await requireAuth()

  const { error } = await supabase
    .from('interactions')
    .delete()
    .eq('id', interactionId)

  if (error) {
    throw new Error(`Failed to delete interaction: ${error.message}`)
  }
}
