/**
 * Commitment Tracking Settings Section
 *
 * Wrapper for Commitment Tracking configuration.
 */

import { isFeatureEnabled } from '@/lib/dal/settings'
import { CommitmentTrackingToggle } from './commitment-tracking-toggle'

export async function CommitmentTrackingSection() {
  const isEnabled = await isFeatureEnabled('commitment_tracking')

  return (
    <div className="space-y-6">
      <CommitmentTrackingToggle isEnabled={isEnabled} />
    </div>
  )
}
