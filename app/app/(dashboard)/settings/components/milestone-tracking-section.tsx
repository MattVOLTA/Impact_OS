/**
 * Milestone Tracking Settings Section
 *
 * Wrapper for Milestone Tracking configuration.
 * Server Component that fetches settings and renders client components.
 */

import { getMilestoneTrackingSettings } from '@/lib/dal/settings'
import { getMilestoneTracks } from '@/lib/dal/milestone-tracks'
import { MilestoneTrackingToggle } from './milestone-tracking-toggle'

export async function MilestoneTrackingSection() {
  const settings = await getMilestoneTrackingSettings()

  // If enabled, get the available tracks
  let availableTracks: Array<{ id: string; name: string; slug: string; description?: string | null }> = []
  if (settings.enabled) {
    availableTracks = await getMilestoneTracks(false) // Get all tracks, active or not
  }

  return (
    <div className="space-y-6">
      <MilestoneTrackingToggle
        isEnabled={settings.enabled}
        enabledTracks={settings.enabledTracks}
        availableTracks={availableTracks}
      />
    </div>
  )
}
