/**
 * Data Access Layer - Company Milestones
 *
 * All company milestone data access goes through this module.
 * Authentication is checked via requireAuth() before any database operation.
 *
 * See docs/architecture/auth-best-practices.md for DAL pattern explanation.
 * See Issue #71 for milestone tracking feature specification.
 */

import { requireAuth } from './shared'
import type {
  CompanyMilestone,
  CompanyMilestoneWithDetails,
  SetCompanyMilestoneInput,
  UpdateCompanyMilestoneInput,
  MilestoneHistory
} from '../types/milestones'

/**
 * Get all milestones for a company
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<CompanyMilestone[]>} List of company milestones
 */
export async function getCompanyMilestones(companyId: string): Promise<CompanyMilestone[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('company_milestones')
    .select('*')
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`Failed to fetch company milestones: ${error.message}`)
  }

  return data || []
}

/**
 * Get company's current milestone (working_towards status)
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<CompanyMilestoneWithDetails | null>} Current milestone or null
 */
export async function getCompanyCurrentMilestone(
  companyId: string
): Promise<CompanyMilestoneWithDetails | null> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('company_milestones')
    .select(`
      *,
      milestone_definition:milestone_definitions(
        *,
        track:milestone_tracks(*)
      ),
      company:companies(id, business_name)
    `)
    .eq('company_id', companyId)
    .eq('status', 'working_towards')
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch company current milestone: ${error.message}`)
  }

  return data
}

/**
 * Get all milestones for a company with details
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<CompanyMilestoneWithDetails[]>} Milestones with details
 */
export async function getCompanyMilestonesWithDetails(
  companyId: string
): Promise<CompanyMilestoneWithDetails[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('company_milestones')
    .select(`
      *,
      milestone_definition:milestone_definitions(
        *,
        track:milestone_tracks(*)
      ),
      company:companies(id, business_name)
    `)
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`Failed to fetch company milestones with details: ${error.message}`)
  }

  return data || []
}

/**
 * Set company's current milestone
 *
 * If company already has a milestone with this definition, updates it.
 * Otherwise creates a new record.
 * Creates history entry if changing from another milestone.
 *
 * @param {string} companyId - Company ID
 * @param {SetCompanyMilestoneInput} input - Milestone data
 * @returns {Promise<CompanyMilestone>} Company milestone record
 */
export async function setCompanyMilestone(
  companyId: string,
  input: SetCompanyMilestoneInput
): Promise<CompanyMilestone> {
  const { supabase, user } = await requireAuth()

  // Check if record already exists for this company-milestone combination
  const { data: existing } = await supabase
    .from('company_milestones')
    .select('*')
    .eq('company_id', companyId)
    .eq('milestone_definition_id', input.milestone_definition_id)
    .maybeSingle()

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('company_milestones')
      .update({
        status: input.status,
        completed_at: input.completed_at || null,
        is_verified: input.is_verified ?? null,
        notes: input.notes || null,
        updated_by: user.id
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update company milestone: ${error.message}`)
    }

    return data
  }

  // Create new record
  const { data, error } = await supabase
    .from('company_milestones')
    .insert({
      company_id: companyId,
      milestone_definition_id: input.milestone_definition_id,
      status: input.status,
      completed_at: input.completed_at || null,
      is_verified: input.is_verified ?? null,
      notes: input.notes || null,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create company milestone: ${error.message}`)
  }

  return data
}

/**
 * Update company milestone status
 *
 * @param {string} companyMilestoneId - Company milestone ID
 * @param {UpdateCompanyMilestoneInput} input - Updated data
 * @returns {Promise<CompanyMilestone>} Updated milestone
 */
export async function updateCompanyMilestone(
  companyMilestoneId: string,
  input: UpdateCompanyMilestoneInput
): Promise<CompanyMilestone> {
  const { supabase, user } = await requireAuth()

  const { data, error } = await supabase
    .from('company_milestones')
    .update({
      ...input,
      updated_by: user.id
    })
    .eq('id', companyMilestoneId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update company milestone: ${error.message}`)
  }

  return data
}

/**
 * Get milestone history for a company
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<MilestoneHistory[]>} Milestone change history
 */
export async function getCompanyMilestoneHistory(companyId: string): Promise<MilestoneHistory[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('milestone_history')
    .select('*')
    .eq('company_id', companyId)
    .order('changed_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch milestone history: ${error.message}`)
  }

  return data || []
}

/**
 * Get milestone history with full milestone details and user info
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<any[]>} Enriched milestone history
 */
export async function getCompanyMilestoneHistoryWithDetails(companyId: string): Promise<any[]> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('milestone_history')
    .select(`
      *,
      from_milestone:milestone_definitions!milestone_history_from_milestone_id_fkey(
        name,
        order_position
      ),
      to_milestone:milestone_definitions!milestone_history_to_milestone_id_fkey(
        name,
        order_position
      ),
      user:users!milestone_history_changed_by_fkey(
        first_name,
        last_name
      )
    `)
    .eq('company_id', companyId)
    .order('changed_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch milestone history with details: ${error.message}`)
  }

  return data || []
}

/**
 * Create milestone history entry
 *
 * Called when a company moves from one milestone to another
 *
 * @param {string} companyId - Company ID
 * @param {string | null} fromMilestoneId - Previous milestone ID (null if first milestone)
 * @param {string} toMilestoneId - New milestone ID
 * @param {Record<string, any>} metadata - Additional metadata (verification, notes, etc.)
 * @returns {Promise<MilestoneHistory>} History entry
 */
export async function createMilestoneHistoryEntry(
  companyId: string,
  fromMilestoneId: string | null,
  toMilestoneId: string,
  metadata: Record<string, any> = {}
): Promise<MilestoneHistory> {
  const { supabase, user } = await requireAuth()

  const { data, error } = await supabase
    .from('milestone_history')
    .insert({
      company_id: companyId,
      from_milestone_id: fromMilestoneId,
      to_milestone_id: toMilestoneId,
      changed_by: user.id,
      metadata
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create milestone history entry: ${error.message}`)
  }

  return data
}
