/**
 * Seed Milestone Tracks
 *
 * Seeds the 4 predefined milestone tracks with all their milestone definitions.
 * This function is called when milestone tracking is first enabled for a tenant.
 *
 * See Issue #71 for complete track and milestone specifications.
 */

import { requireAuth } from './shared'
import { getMilestoneTrackTemplates } from './milestone-tracks'
import { bulkCreateMilestoneDefinitions } from './milestone-definitions'
import { createMilestoneTrack } from './milestone-tracks'

/**
 * Seed all predefined milestone tracks for current tenant
 *
 * Creates the 4 default tracks (Software, Hardware, Biotech/Pharma, Medical Device)
 * with all their milestone definitions.
 *
 * @returns {Promise<{ success: boolean, tracksCreated: number, milestonesCreated: number }>}
 */
export async function seedMilestoneTracks(): Promise<{
  success: boolean
  tracksCreated: number
  milestonesCreated: number
  errors?: string[]
}> {
  await requireAuth()

  const templates = getMilestoneTrackTemplates()
  const errors: string[] = []
  let tracksCreated = 0
  let milestonesCreated = 0

  for (const template of templates) {
    try {
      // Create the track
      const track = await createMilestoneTrack({
        name: template.name,
        slug: template.slug,
        description: template.description,
        is_active: true
      })

      tracksCreated++

      // Create all milestones for this track
      const milestones = await bulkCreateMilestoneDefinitions(
        track.id,
        template.milestones
      )

      milestonesCreated += milestones.length
    } catch (error) {
      errors.push(`Failed to seed track ${template.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    success: errors.length === 0,
    tracksCreated,
    milestonesCreated,
    errors: errors.length > 0 ? errors : undefined
  }
}

/**
 * Check if milestone tracks have already been seeded for current tenant
 *
 * @returns {Promise<boolean>} True if tracks exist, false otherwise
 */
export async function areMilestoneTracksSeeded(): Promise<boolean> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('milestone_tracks')
    .select('id')
    .in('slug', ['software', 'hardware', 'biotech-pharma', 'medical-device'])
    .limit(1)

  if (error) {
    throw new Error(`Failed to check if tracks are seeded: ${error.message}`)
  }

  return (data?.length || 0) > 0
}

/**
 * Seed milestone tracks if not already seeded
 *
 * Safe version that checks first before seeding.
 *
 * @returns {Promise<{ alreadySeeded: boolean, result?: any }>}
 */
export async function seedMilestoneTracksIfNeeded(): Promise<{
  alreadySeeded: boolean
  result?: {
    success: boolean
    tracksCreated: number
    milestonesCreated: number
    errors?: string[]
  }
}> {
  const alreadySeeded = await areMilestoneTracksSeeded()

  if (alreadySeeded) {
    return { alreadySeeded: true }
  }

  const result = await seedMilestoneTracks()

  return {
    alreadySeeded: false,
    result
  }
}
