/**
 * Fireflies Controls
 *
 * Client Component wrapper to avoid hydration errors with Dialog components.
 * Shows admin controls vs. non-admin view based on role.
 */

'use client'

import { ConnectFirefliesButton } from './connect-fireflies-button'
import { DisconnectFirefliesButton } from './disconnect-fireflies-button'
import { FirefliesToggle } from './fireflies-toggle'

interface FirefliesControlsProps {
  isAdmin: boolean
  isConnected: boolean
  isEnabled: boolean
}

export function FirefliesControls({ isAdmin, isConnected, isEnabled }: FirefliesControlsProps) {
  // Admin Controls
  if (isAdmin) {
    return (
      <div className="flex items-center gap-2">
        {!isConnected ? (
          <ConnectFirefliesButton />
        ) : (
          <DisconnectFirefliesButton />
        )}
      </div>
    )
  }

  // Non-admin View
  if (isConnected) {
    return (
      <div className="text-sm text-muted-foreground">
        Fireflies integration is {isEnabled ? 'enabled' : 'disabled'}.
        Contact your administrator to modify settings.
      </div>
    )
  }

  return (
    <div className="text-sm text-muted-foreground">
      Fireflies is not connected. Contact your administrator to set up the integration.
    </div>
  )
}
