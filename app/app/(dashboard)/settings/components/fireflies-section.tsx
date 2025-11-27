/**
 * Fireflies Integration Section
 *
 * Shows Fireflies connection status and controls.
 * Admin: Can connect/disconnect and toggle feature
 * Non-admin: View-only mode
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getFirefliesConnection, getFirefliesSyncConfig } from '@/lib/dal/settings'
import { FirefliesControls } from './fireflies-controls'
import { FirefliesSyncConfig } from './fireflies-sync-config'

interface FirefliesSectionProps {
  isAdmin: boolean
}

export async function FirefliesSection({ isAdmin }: FirefliesSectionProps) {
  const connection = await getFirefliesConnection()
  const syncConfig = await getFirefliesSyncConfig()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Fireflies Integration
              <StatusBadge status={connection.status} />
            </CardTitle>
            <CardDescription>
              Automatically capture meeting transcripts via daily sync
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
        <FirefliesControls
          isAdmin={isAdmin}
          isConnected={connection.isConnected}
          isEnabled={connection.isEnabled}
        />

        {/* Sync Configuration (only show if connected) */}
        {connection.isConnected && (
          <>
            <Separator />
            <FirefliesSyncConfig config={syncConfig} isAdmin={isAdmin} />
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
