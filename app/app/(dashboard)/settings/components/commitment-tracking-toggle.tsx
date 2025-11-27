/**
 * Commitment Tracking Toggle Component
 *
 * Allows admins to enable/disable the Commitment Tracking feature.
 */

'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Goal, Loader2 } from 'lucide-react'
import { toggleCommitmentTracking } from '../actions'
import { useRouter } from 'next/navigation'

interface CommitmentTrackingToggleProps {
  isEnabled: boolean
}

export function CommitmentTrackingToggle({ isEnabled: initialEnabled }: CommitmentTrackingToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true)
    // Optimistic update
    setIsEnabled(checked)

    try {
      const result = await toggleCommitmentTracking(checked)

      if (!result.success) {
        // Revert on failure
        setIsEnabled(!checked)
        console.error(result.error)
      } else {
        router.refresh()
      }
    } catch (error) {
      setIsEnabled(!checked)
      console.error('Failed to toggle commitment tracking:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <Goal className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div>
              <CardTitle>Commitment Tracking</CardTitle>
              <CardDescription>
                Track company goals, action items, and progress.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="commitment-tracking-toggle"
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isLoading}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {isEnabled ? (
            <p>
              Commitment Tracking is <strong>enabled</strong>. Coaches can track company goals and action items.
            </p>
          ) : (
            <p>
              Commitment Tracking is currently <strong>disabled</strong>. Enable to start tracking company commitments.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
