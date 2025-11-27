/**
 * Data Access Layer - Milestone Definitions
 *
 * All milestone definition data access goes through this module.
 * Authentication is checked via requireAuth() before any database operation.
 *
 * See docs/architecture/auth-best-practices.md for DAL pattern explanation.
 * See Issue #71 for milestone tracking feature specification.
 */

import { requireAuth } from './shared'
import type {
  MilestoneDefinition,
  MilestoneDefinitionWithTrack,
  CreateMilestoneDefinitionInput,
  UpdateMilestoneDefinitionInput
} from '../types/milestones'

/**
 * Get all milestone definitions for a track
 *
 * @param {string} trackId - Track ID
 * @param {boolean} activeOnly - If true, only return active definitions (default: true)
 * @returns {Promise<MilestoneDefinition[]>} List of milestone definitions ordered by position
 */
export async function getMilestoneDefinitions(
  trackId: string,
  activeOnly: boolean = true
): Promise<MilestoneDefinition[]> {
  const { supabase } = await requireAuth()

  let query = supabase
    .from('milestone_definitions')
    .select('*')
    .eq('track_id', trackId)
    .order('order_position')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch milestone definitions: ${error.message}`)
  }

  return data || []
}

/**
 * Get a single milestone definition by ID
 *
 * @param {string} definitionId - Definition ID
 * @returns {Promise<MilestoneDefinition>} Milestone definition
 */
export async function getMilestoneDefinition(definitionId: string): Promise<MilestoneDefinition> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('milestone_definitions')
    .select('*')
    .eq('id', definitionId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch milestone definition: ${error.message}`)
  }

  if (!data) {
    throw new Error('Milestone definition not found')
  }

  return data
}

/**
 * Get milestone definition with track details
 *
 * @param {string} definitionId - Definition ID
 * @returns {Promise<MilestoneDefinitionWithTrack>} Definition with track
 */
export async function getMilestoneDefinitionWithTrack(
  definitionId: string
): Promise<MilestoneDefinitionWithTrack> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('milestone_definitions')
    .select(`
      *,
      track:milestone_tracks(*)
    `)
    .eq('id', definitionId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch milestone definition with track: ${error.message}`)
  }

  if (!data) {
    throw new Error('Milestone definition not found')
  }

  return data
}

/**
 * Create a new milestone definition
 *
 * @param {CreateMilestoneDefinitionInput} input - Definition data
 * @returns {Promise<MilestoneDefinition>} Created definition
 */
export async function createMilestoneDefinition(
  input: CreateMilestoneDefinitionInput
): Promise<MilestoneDefinition> {
  const { supabase, user } = await requireAuth()

  const { data, error } = await supabase
    .from('milestone_definitions')
    .insert({
      track_id: input.track_id,
      order_position: input.order_position,
      name: input.name,
      evidence_description: input.evidence_description,
      objective_signal: input.objective_signal,
      version: 1,
      is_active: true,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create milestone definition: ${error.message}`)
  }

  return data
}

/**
 * Update a milestone definition
 *
 * When updating critical fields (name, evidence, signal), increment version
 *
 * @param {string} definitionId - Definition ID
 * @param {UpdateMilestoneDefinitionInput} input - Updated definition data
 * @param {boolean} incrementVersion - Whether to increment version (default: false)
 * @returns {Promise<MilestoneDefinition>} Updated definition
 */
export async function updateMilestoneDefinition(
  definitionId: string,
  input: UpdateMilestoneDefinitionInput,
  incrementVersion: boolean = false
): Promise<MilestoneDefinition> {
  const { supabase, user } = await requireAuth()

  // If incrementing version, fetch current version first
  let versionUpdate = {}
  if (incrementVersion) {
    const current = await getMilestoneDefinition(definitionId)
    versionUpdate = { version: current.version + 1 }
  }

  const { data, error } = await supabase
    .from('milestone_definitions')
    .update({
      ...input,
      ...versionUpdate,
      updated_by: user.id
    })
    .eq('id', definitionId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update milestone definition: ${error.message}`)
  }

  return data
}

/**
 * Soft delete a milestone definition
 *
 * Sets is_active = false to preserve historical data
 *
 * @param {string} definitionId - Definition ID
 * @returns {Promise<void>}
 */
export async function deleteMilestoneDefinition(definitionId: string): Promise<void> {
  const { supabase, user } = await requireAuth()

  const { error } = await supabase
    .from('milestone_definitions')
    .update({
      is_active: false,
      updated_by: user.id
    })
    .eq('id', definitionId)

  if (error) {
    throw new Error(`Failed to delete milestone definition: ${error.message}`)
  }
}

/**
 * Reorder milestones for a track
 *
 * Updates order_position for multiple definitions.
 * Uses temporary positions to avoid unique constraint conflicts.
 *
 * @param {string} trackId - Track ID
 * @param {string[]} definitionIds - Array of definition IDs in desired order
 * @returns {Promise<MilestoneDefinition[]>} Updated definitions
 */
export async function reorderMilestoneDefinitions(
  trackId: string,
  definitionIds: string[]
): Promise<MilestoneDefinition[]> {
  const { supabase, user } = await requireAuth()

  // Step 1: Move all to temporary positions (1000+) to avoid conflicts
  await Promise.all(
    definitionIds.map((id, index) =>
      supabase
        .from('milestone_definitions')
        .update({
          order_position: 1000 + index,
          updated_by: user.id
        })
        .eq('id', id)
        .eq('track_id', trackId)
    )
  )

  // Step 2: Set final positions (1, 2, 3, ...)
  const finalUpdates = definitionIds.map(async (id, index) => {
    const { data, error } = await supabase
      .from('milestone_definitions')
      .update({
        order_position: index + 1,
        updated_by: user.id
      })
      .eq('id', id)
      .eq('track_id', trackId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to reorder milestone ${id}: ${error.message}`)
    }

    return data
  })

  const results = await Promise.all(finalUpdates)
  return results.sort((a, b) => a.order_position - b.order_position)
}

/**
 * Bulk create milestone definitions from template
 *
 * Used when seeding predefined tracks
 *
 * @param {string} trackId - Track ID
 * @param {Array} milestones - Array of milestone data
 * @returns {Promise<MilestoneDefinition[]>} Created definitions
 */
export async function bulkCreateMilestoneDefinitions(
  trackId: string,
  milestones: Array<{
    order: number
    name: string
    evidence_description: string
    objective_signal: string
  }>
): Promise<MilestoneDefinition[]> {
  const { supabase, user } = await requireAuth()

  const insertData = milestones.map(m => ({
    track_id: trackId,
    order_position: m.order,
    name: m.name,
    evidence_description: m.evidence_description,
    objective_signal: m.objective_signal,
    version: 1,
    is_active: true,
    created_by: user.id
  }))

  const { data, error } = await supabase
    .from('milestone_definitions')
    .insert(insertData)
    .select()

  if (error) {
    throw new Error(`Failed to bulk create milestone definitions: ${error.message}`)
  }

  return (data || []).sort((a, b) => a.order_position - b.order_position)
}
