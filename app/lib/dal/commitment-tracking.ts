/**
 * Data Access Layer - Commitment Tracking
 *
 * Handles access to commitment tracks, definitions, and company progress.
 * Enforces tenant isolation and feature flag checks.
 */

import { requireAuth, getCurrentOrganizationId } from './shared'
import { getTenantConfig } from './settings'
export * from '@/lib/schemas/commitment-tracking'
import {
  createCommitmentTrackSchema,
  createCommitmentDefinitionSchema,
  updateCommitmentProgressSchema,
  type CreateCommitmentTrackInput,
  type CreateCommitmentDefinitionInput,
  type UpdateCommitmentProgressInput,
  type CommitmentTrack,
  type CommitmentDefinition,
  type CompanyCommitmentProgress
} from '@/lib/schemas/commitment-tracking'

/**
 * Check if commitment tracking feature is enabled for current tenant
 */
async function ensureFeatureEnabled() {
  const config = await getTenantConfig()
  if (!config?.feature_commitment_tracking) {
    throw new Error('Commitment Tracking feature is disabled for this organization')
  }
}

/**
 * Get all commitment tracks accessible to the current tenant
 * Includes System Standard tracks (tenant_id is NULL) and Tenant's custom tracks
 */
export async function getCommitmentTracks(): Promise<CommitmentTrack[]> {
  await ensureFeatureEnabled()
  const { supabase } = await requireAuth()
  const tenantId = await getCurrentOrganizationId()

  const { data, error } = await supabase
    .from('commitment_tracks')
    .select('*')
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .order('title')

  if (error) throw new Error(`Failed to fetch commitment tracks: ${error.message}`)
  return data || []
}

/**
 * Create a custom commitment track for the current tenant
 */
export async function createCommitmentTrack(input: CreateCommitmentTrackInput): Promise<CommitmentTrack> {
  await ensureFeatureEnabled()
  const { supabase } = await requireAuth()
  const tenantId = await getCurrentOrganizationId()

  const validated = createCommitmentTrackSchema.parse(input)

  const { data, error } = await supabase
    .from('commitment_tracks')
    .insert({
      tenant_id: tenantId,
      title: validated.title,
      description: validated.description,
      is_system_standard: false // Always false for user-created tracks
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create commitment track: ${error.message}`)
  return data
}

/**
 * Get definitions for a specific track
 */
export async function getCommitmentDefinitions(trackId: string): Promise<CommitmentDefinition[]> {
  await ensureFeatureEnabled()
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('commitment_definitions')
    .select('*')
    .eq('track_id', trackId)
    .order('order_index')

  if (error) throw new Error(`Failed to fetch commitment definitions: ${error.message}`)
  return data || []
}

/**
 * Create a commitment definition (step)
 */
export async function createCommitmentDefinition(input: CreateCommitmentDefinitionInput): Promise<CommitmentDefinition> {
  await ensureFeatureEnabled()
  const { supabase } = await requireAuth()

  const validated = createCommitmentDefinitionSchema.parse(input)

  const { data, error } = await supabase
    .from('commitment_definitions')
    .insert(validated)
    .select()
    .single()

  if (error) throw new Error(`Failed to create commitment definition: ${error.message}`)
  return data
}

/**
 * Get commitment progress for a company
 * Returns all logged commitments
 */
export async function getCompanyCommitmentProgress(companyId: string): Promise<CompanyCommitmentProgress[]> {
  await ensureFeatureEnabled()
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('company_commitments_progress')
    .select('*')
    .eq('company_id', companyId)
    .order('achieved_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch company commitment progress: ${error.message}`)
  return data || []
}

/**
 * Update/Log commitment progress
 */
export async function updateCommitmentProgress(input: UpdateCommitmentProgressInput): Promise<CompanyCommitmentProgress> {
  await ensureFeatureEnabled()
  const { supabase, user } = await requireAuth()
  const tenantId = await getCurrentOrganizationId()

  const validated = updateCommitmentProgressSchema.parse(input)

  // Upsert based on company_id + commitment_id
  // Check if exists
  const { data: existing } = await supabase
    .from('company_commitments_progress')
    .select('id')
    .eq('company_id', validated.company_id)
    .eq('commitment_id', validated.commitment_id)
    .single()

  let result
  if (existing) {
    const { data, error } = await supabase
      .from('company_commitments_progress')
      .update({
        status: validated.status,
        achieved_at: validated.achieved_at || new Date().toISOString(),
        verified_by_user_id: user.id,
        evidence_note: validated.evidence_note,
        evidence_url: validated.evidence_url
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    result = data
  } else {
    const { data, error } = await supabase
      .from('company_commitments_progress')
      .insert({
        tenant_id: tenantId,
        company_id: validated.company_id,
        commitment_id: validated.commitment_id,
        status: validated.status,
        achieved_at: validated.achieved_at || new Date().toISOString(),
        verified_by_user_id: user.id,
        evidence_note: validated.evidence_note,
        evidence_url: validated.evidence_url
      })
      .select()
      .single()
    if (error) throw error
    result = data
  }

  return result
}
