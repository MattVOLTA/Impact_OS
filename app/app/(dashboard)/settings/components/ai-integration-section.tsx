/**
 * AI Integration Section
 *
 * Shows OpenAI connection status and controls.
 * Admin: Can connect/disconnect and toggle feature
 * Non-admin: View-only mode
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getOpenAIConnection, getAIFeatures, isFeatureEnabled } from '@/lib/dal/settings'
import { AIIntegrationControls } from './ai-integration-controls'
import { AIIntegrationToggle } from './ai-integration-toggle'
import { AIFeaturesList } from './ai-features-list'

interface AIIntegrationSectionProps {
  isAdmin: boolean
}

export async function AIIntegrationSection({ isAdmin }: AIIntegrationSectionProps) {
  const connection = await getOpenAIConnection()
  const aiFeatures = await getAIFeatures()
  const commitmentTrackingEnabled = await isFeatureEnabled('commitment_tracking')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              AI Integration
              <StatusBadge status={connection.status} />
            </CardTitle>
            <CardDescription>
              Securely store OpenAI API key for AI-powered features
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        {connection.isConnected && connection.connectedBy && (
          <div className="text-sm text-muted-foreground">
            Connected by {connection.connectedBy.firstName} {connection.connectedBy.lastName}
            {connection.connectedAt && (
              <> on {new Date(connection.connectedAt).toLocaleDateString()}</>
            )}
          </div>
        )}

        {/* Admin/Non-admin Controls */}
        <AIIntegrationControls
          isAdmin={isAdmin}
          isConnected={connection.isConnected}
          isEnabled={connection.isEnabled}
        />

        {/* Master Feature Toggle (only show if connected) */}
        {connection.isConnected && isAdmin && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Master Switch</h4>
              <AIIntegrationToggle isEnabled={connection.isEnabled} />
            </div>
          </>
        )}

        {/* Granular AI Features (only show if master enabled) */}
        {connection.isConnected && connection.isEnabled && isAdmin && (
          <>
            <Separator />
            <AIFeaturesList
              features={aiFeatures}
              isAdmin={isAdmin}
              commitmentTrackingEnabled={commitmentTrackingEnabled}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: 'not_connected' | 'connected' | 'failed' }) {
  const styles = {
    connected: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
    failed: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
    not_connected: 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20',
  }

  const labels = {
    connected: 'Connected',
    failed: 'Failed',
    not_connected: 'Not Connected',
  }

  return (
    <Badge variant="outline" className={styles[status]}>
      {labels[status]}
    </Badge>
  )
}
