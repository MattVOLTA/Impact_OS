/**
 * Data Access Layer - Milestone Tracks
 *
 * All milestone track data access goes through this module.
 * Authentication is checked via requireAuth() before any database operation.
 *
 * See docs/architecture/auth-best-practices.md for DAL pattern explanation.
 * See Issue #71 for milestone tracking feature specification.
 */

import { requireAuth, getCurrentTenantId } from './shared'
import type {
  MilestoneTrack,
  MilestoneTrackWithDefinitions,
  CreateMilestoneTrackInput,
  UpdateMilestoneTrackInput,
  MilestoneTrackTemplate,
  TrackSlug
} from '../types/milestones'

/**
 * Get all milestone tracks for the current tenant
 *
 * RLS automatically filters by tenant_id from JWT claims.
 *
 * @param {boolean} activeOnly - If true, only return active tracks (default: true)
 * @returns {Promise<MilestoneTrack[]>} List of milestone tracks
 */
export async function getMilestoneTracks(activeOnly: boolean = true): Promise<MilestoneTrack[]> {
  const { supabase } = await requireAuth()

  let query = supabase
    .from('milestone_tracks')
    .select('*')
    .order('name')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch milestone tracks: ${error.message}`)
  }

  return data || []
}

/**
 * Get milestone tracks with their definitions
 *
 * @param {boolean} activeOnly - If true, only return active tracks (default: true)
 * @returns {Promise<MilestoneTrackWithDefinitions[]>} Tracks with definitions
 */
export async function getMilestoneTracksWithDefinitions(
  activeOnly: boolean = true
): Promise<MilestoneTrackWithDefinitions[]> {
  const { supabase } = await requireAuth()

  let query = supabase
    .from('milestone_tracks')
    .select(`
      *,
      definitions:milestone_definitions(*)
    `)
    .order('name')

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch milestone tracks with definitions: ${error.message}`)
  }

  return (data || []).map(track => ({
    ...track,
    definitions: (track.definitions || []).sort((a: any, b: any) => a.order_position - b.order_position)
  }))
}

/**
 * Get a single milestone track by ID
 *
 * @param {string} trackId - Track ID
 * @returns {Promise<MilestoneTrack>} Milestone track
 */
export async function getMilestoneTrack(trackId: string): Promise<MilestoneTrack> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('milestone_tracks')
    .select('*')
    .eq('id', trackId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch milestone track: ${error.message}`)
  }

  if (!data) {
    throw new Error('Milestone track not found')
  }

  return data
}

/**
 * Get a milestone track by slug
 *
 * @param {string} slug - Track slug
 * @returns {Promise<MilestoneTrack | null>} Milestone track or null
 */
export async function getMilestoneTrackBySlug(slug: string): Promise<MilestoneTrack | null> {
  const { supabase } = await requireAuth()

  const { data, error} = await supabase
    .from('milestone_tracks')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch milestone track by slug: ${error.message}`)
  }

  return data
}

/**
 * Create a new milestone track
 *
 * @param {CreateMilestoneTrackInput} input - Track data
 * @returns {Promise<MilestoneTrack>} Created track
 */
export async function createMilestoneTrack(
  input: CreateMilestoneTrackInput
): Promise<MilestoneTrack> {
  const { supabase, user } = await requireAuth()
  const tenantId = await getCurrentTenantId()

  const { data, error } = await supabase
    .from('milestone_tracks')
    .insert({
      tenant_id: tenantId,
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      is_active: input.is_active ?? true,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create milestone track: ${error.message}`)
  }

  return data
}

/**
 * Update a milestone track
 *
 * @param {string} trackId - Track ID
 * @param {UpdateMilestoneTrackInput} input - Updated track data
 * @returns {Promise<MilestoneTrack>} Updated track
 */
export async function updateMilestoneTrack(
  trackId: string,
  input: UpdateMilestoneTrackInput
): Promise<MilestoneTrack> {
  const { supabase, user } = await requireAuth()

  const { data, error } = await supabase
    .from('milestone_tracks')
    .update({
      ...input,
      updated_by: user.id
    })
    .eq('id', trackId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update milestone track: ${error.message}`)
  }

  return data
}

/**
 * Delete (soft delete) a milestone track
 *
 * @param {string} trackId - Track ID
 * @returns {Promise<void>}
 */
export async function deleteMilestoneTrack(trackId: string): Promise<void> {
  const { supabase, user } = await requireAuth()

  // Soft delete by setting is_active = false
  const { error } = await supabase
    .from('milestone_tracks')
    .update({
      is_active: false,
      updated_by: user.id
    })
    .eq('id', trackId)

  if (error) {
    throw new Error(`Failed to delete milestone track: ${error.message}`)
  }
}

/**
 * Get predefined milestone track templates
 *
 * These are the 4 default tracks defined in Issue #71.
 *
 * @returns {MilestoneTrackTemplate[]} Array of track templates
 */
export function getMilestoneTrackTemplates(): MilestoneTrackTemplate[] {
  return [
    {
      name: 'Software',
      slug: 'software',
      description: 'Software product milestone track',
      milestones: [
        {
          order: 1,
          name: 'Problem Validated',
          evidence_description: '5+ target customers have confirmed the problem is both urgent and unmet by existing solutions, and have demonstrated willingness to invest time in solution development',
          objective_signal: 'Customers showing commitment through actions (agreeing to future feedback sessions, providing contact info for follow-up, sharing detailed problem context)'
        },
        {
          order: 2,
          name: 'Solution Validated',
          evidence_description: '3+ target customers are actively using the product and providing feedback',
          objective_signal: 'Product deployed with target customers demonstrating it addresses the validated problem'
        },
        {
          order: 3,
          name: 'First Paying Customer',
          evidence_description: 'Customer has paid for the product',
          objective_signal: 'Invoice paid, revenue recognized'
        },
        {
          order: 4,
          name: 'Repeatable Sales with ICP',
          evidence_description: '$10K+ in revenue with at least 40% from a homogenous customer segment',
          objective_signal: 'Multiple paying customers demonstrating repeatable value proposition to an identifiable Ideal Customer Profile'
        },
        {
          order: 5,
          name: 'Early PM Fit',
          evidence_description: '$100K+ in revenue with at least 60% from a homogenous customer segment',
          objective_signal: 'Clear product-market fit emerging with a defined customer profile'
        },
        {
          order: 6,
          name: 'Product Market Fit',
          evidence_description: '$1M+ in revenue with at least 80% from a homogenous customer segment',
          objective_signal: 'Strong product-market fit with dominant customer segment driving growth'
        }
      ]
    },
    {
      name: 'Hardware',
      slug: 'hardware',
      description: 'Hardware product milestone track',
      milestones: [
        {
          order: 1,
          name: 'Problem Validated',
          evidence_description: '5+ target customers have confirmed the problem is both urgent and unmet by existing solutions, demonstrated willingness to invest time',
          objective_signal: 'Letters of intent, survey results, crowdfunding sign-ups showing verifiable interest'
        },
        {
          order: 2,
          name: 'Proof-of-Concept Built',
          evidence_description: 'Working prototype demonstrates core technology feasibility',
          objective_signal: 'Functional prototype unit exists that performs the primary function'
        },
        {
          order: 3,
          name: 'User-Validated MVP',
          evidence_description: '3+ target customers have tested the MVP in real-world conditions with positive feedback',
          objective_signal: 'Successful pilot trials or user testing with measurable satisfaction'
        },
        {
          order: 4,
          name: 'Pilot Production & First Customers',
          evidence_description: 'Small batch manufacturing run completed and first paying customers have received units',
          objective_signal: 'Limited production run (tens to hundreds of units) sold and delivered'
        },
        {
          order: 5,
          name: 'Mass Production Ready',
          evidence_description: 'Manufacturing scale-up complete, product widely available for purchase',
          objective_signal: 'Large-scale production run (thousands of units) with consistent quality, supply chain established'
        },
        {
          order: 6,
          name: 'Early Market Traction',
          evidence_description: '$100K+ in cumulative sales',
          objective_signal: 'Product generating consistent revenue, demonstrating repeatable sales process'
        },
        {
          order: 7,
          name: 'Market Validation',
          evidence_description: '$1M+ in cumulative sales',
          objective_signal: 'Strong market acceptance with established customer base'
        },
        {
          order: 8,
          name: 'Market Adoption',
          evidence_description: '$10M+ in cumulative sales',
          objective_signal: 'Significant market penetration, scalable business model proven'
        }
      ]
    },
    {
      name: 'Biotech/Pharma',
      slug: 'biotech-pharma',
      description: 'Biotech and pharmaceutical product milestone track',
      milestones: [
        {
          order: 1,
          name: 'Preclinical Validation',
          evidence_description: 'Reproducible data demonstrating therapeutic effect in relevant disease models with acceptable safety profile',
          objective_signal: 'Published preclinical data or regulatory filing (IND/CTA) accepted, demonstrating readiness for human testing'
        },
        {
          order: 2,
          name: 'Safety Validated in Humans',
          evidence_description: 'Initial human trials completed demonstrating product safety at therapeutic doses',
          objective_signal: 'First-in-human trial results showing acceptable safety profile, documented dose range established'
        },
        {
          order: 3,
          name: 'Efficacy Demonstrated',
          evidence_description: 'Clinical trial in target patient population showing statistically significant therapeutic benefit',
          objective_signal: 'Proof-of-concept trial results published or presented, demonstrating the treatment works in patients with the target condition'
        },
        {
          order: 4,
          name: 'Confirmatory Evidence',
          evidence_description: 'Large-scale clinical trial(s) confirming efficacy and safety in broader patient population',
          objective_signal: 'Pivotal trial results meeting primary endpoints, sufficient to support regulatory submission (publicly announced or published)'
        },
        {
          order: 5,
          name: 'Regulatory Approval',
          evidence_description: 'Marketing authorization obtained from at least one major regulatory authority (FDA, EMA, Health Canada, PMDA, MHRA, etc.)',
          objective_signal: 'Official approval letter/certificate issued, product legally authorized for commercial sale in that jurisdiction'
        },
        {
          order: 6,
          name: 'Commercial Launch',
          evidence_description: 'Product available to patients through healthcare system and generating revenue',
          objective_signal: 'Product prescribed/dispensed in clinical practice, $10M+ in sales or significant licensing/partnership revenue recognized'
        }
      ]
    },
    {
      name: 'Medical Device',
      slug: 'medical-device',
      description: 'Medical device milestone track',
      milestones: [
        {
          order: 1,
          name: 'Clinical Need Validated',
          evidence_description: '5+ healthcare providers or target users have confirmed the unmet clinical need and expressed interest in the solution',
          objective_signal: 'Letters of support from clinicians, healthcare facilities expressing willingness to pilot the device'
        },
        {
          order: 2,
          name: 'Prototype Validated',
          evidence_description: 'Working prototype demonstrates intended functionality and usability in simulated/lab conditions',
          objective_signal: 'Successful bench testing and risk analysis (ISO 14971) completed, design controls established'
        },
        {
          order: 3,
          name: 'Clinical Evidence Generated',
          evidence_description: 'Clinical study (or studies) completed demonstrating safety and performance in target patient population',
          objective_signal: 'Clinical trial results showing device performs as intended with acceptable risk profile (study may be smaller than pharma trials: 10-300 patients depending on risk class)'
        },
        {
          order: 4,
          name: 'Regulatory Clearance',
          evidence_description: 'Marketing authorization obtained from at least one major regulatory authority (FDA 510(k)/PMA, CE Mark, Health Canada, PMDA, MHRA, etc.)',
          objective_signal: 'Official clearance/approval issued, device legally authorized for commercial sale in that jurisdiction'
        },
        {
          order: 5,
          name: 'Reimbursement Validated',
          evidence_description: 'Payment mechanism established through insurance/public payer (e.g., CPT code assigned, DRG inclusion, or private payer coverage decisions)',
          objective_signal: 'Billing codes secured or payer contracts in place enabling healthcare providers to be reimbursed for using the device'
        },
        {
          order: 6,
          name: 'Market Adoption',
          evidence_description: 'Device in use at multiple healthcare facilities generating reimbursed revenue',
          objective_signal: '$1M+ in sales with established reimbursement, demonstrating economic viability'
        },
        {
          order: 7,
          name: 'Scaled Adoption',
          evidence_description: 'Device widely adopted across healthcare system(s)',
          objective_signal: '$10M+ in sales, demonstrating sustainable commercial viability and broad clinical acceptance'
        }
      ]
    }
  ]
}
