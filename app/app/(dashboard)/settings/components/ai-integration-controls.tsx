/**
 * AI Integration Controls
 *
 * Client Component wrapper to avoid hydration errors with Dialog components.
 * Shows admin controls vs. non-admin view based on role.
 */

'use client'

import { ConnectOpenAIButton } from './connect-openai-button'
import { DisconnectOpenAIButton } from './disconnect-openai-button'

interface AIIntegrationControlsProps {
  isAdmin: boolean
  isConnected: boolean
  isEnabled: boolean
}

export function AIIntegrationControls({ isAdmin, isConnected, isEnabled }: AIIntegrationControlsProps) {
  // Admin Controls
  if (isAdmin) {
    return (
      <div className="flex items-center gap-2">
        {!isConnected ? (
          <ConnectOpenAIButton />
        ) : (
          <DisconnectOpenAIButton />
        )}
      </div>
    )
  }

  // Non-admin View
  if (isConnected) {
    return (
      <div className="text-sm text-muted-foreground">
        AI Integration is {isEnabled ? 'enabled' : 'disabled'}.
        Contact your administrator to modify settings.
      </div>
    )
  }

  return (
    <div className="text-sm text-muted-foreground">
      OpenAI is not connected. Contact your administrator to set up the integration.
    </div>
  )
}
