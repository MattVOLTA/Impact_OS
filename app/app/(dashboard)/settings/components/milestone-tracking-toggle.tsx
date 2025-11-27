/**
 * Milestone Tracking Toggle Component
 *
 * Allows admins to enable/disable the Milestone Tracking feature
 * and manage which tracks are enabled.
 */

'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Loader2, ChevronDown, ChevronRight, Settings } from 'lucide-react'
import { enableMilestoneTrackingAction, disableMilestoneTrackingAction, updateEnabledMilestoneTracksAction } from '../actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface MilestoneTrackingToggleProps {
  isEnabled: boolean
  enabledTracks: string[]
  availableTracks: Array<{
    id: string
    name: string
    slug: string
    description?: string | null
  }>
}

export function MilestoneTrackingToggle({
  isEnabled: initialEnabled,
  enabledTracks: initialEnabledTracks,
  availableTracks
}: MilestoneTrackingToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled)
  const [enabledTracks, setEnabledTracks] = useState<string[]>(initialEnabledTracks)
  const [showTracks, setShowTracks] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleToggle = async (checked: boolean) => {
    startTransition(async () => {
      // Optimistic update
      setIsEnabled(checked)
      setShowTracks(checked)

      try {
        const result = checked
          ? await enableMilestoneTrackingAction()
          : await disableMilestoneTrackingAction()

        if (!result.success) {
          // Revert on failure
          setIsEnabled(!checked)
          setShowTracks(!checked)
          console.error(result.error)
        } else {
          router.refresh()
        }
      } catch (error) {
        setIsEnabled(!checked)
        setShowTracks(!checked)
        console.error('Failed to toggle milestone tracking:', error)
      }
    })
  }

  const handleTrackToggle = async (trackSlug: string, checked: boolean) => {
    const updatedTracks = checked
      ? [...enabledTracks, trackSlug]
      : enabledTracks.filter(t => t !== trackSlug)

    // Optimistic update
    setEnabledTracks(updatedTracks)

    startTransition(async () => {
      try {
        const result = await updateEnabledMilestoneTracksAction(updatedTracks)

        if (!result.success) {
          // Revert on failure
          setEnabledTracks(enabledTracks)
          console.error(result.error)
        } else {
          router.refresh()
        }
      } catch (error) {
        setEnabledTracks(enabledTracks)
        console.error('Failed to update enabled tracks:', error)
      }
    })
  }

  const trackDescriptions: Record<string, string> = {
    'software': 'For software/SaaS companies (6 milestones)',
    'hardware': 'For hardware/physical product companies (8 milestones)',
    'biotech-pharma': 'For biotech and pharmaceutical companies (6 milestones)',
    'medical-device': 'For medical device companies (7 milestones)'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-500" />
            </div>
            <div>
              <CardTitle>Milestone Tracking</CardTitle>
              <CardDescription>
                Track company progress through market-validated milestones
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Switch
              id="milestone-tracking-toggle"
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {isEnabled ? (
            <p>
              Milestone Tracking is <strong>enabled</strong>. Companies can be tracked through industry-specific milestone frameworks.
            </p>
          ) : (
            <p>
              Milestone Tracking is currently <strong>disabled</strong>. Enable to start tracking company progress through validated milestones.
            </p>
          )}
        </div>

        {/* Show track configuration when enabled */}
        {isEnabled && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* Manage Milestones Link */}
            <div>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings/milestone-tracking">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Milestone Definitions
                </Link>
              </Button>
            </div>

            <button
              onClick={() => setShowTracks(!showTracks)}
              className="flex items-center space-x-2 text-sm font-medium hover:text-primary transition-colors"
            >
              {showTracks ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span>Configure Enabled Tracks ({enabledTracks.length} of 4 enabled)</span>
            </button>

            {showTracks && (
              <div className="space-y-3 pl-6">
                {availableTracks.length > 0 ? (
                  availableTracks.map(track => (
                    <div key={track.id} className="flex items-center justify-between py-2">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`track-${track.slug}`}
                          className="text-sm font-medium"
                        >
                          {track.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {trackDescriptions[track.slug] || track.description}
                        </p>
                      </div>
                      <Switch
                        id={`track-${track.slug}`}
                        checked={enabledTracks.includes(track.slug)}
                        onCheckedChange={(checked) => handleTrackToggle(track.slug, checked)}
                        disabled={isPending}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No milestone tracks found. They will be created automatically when you enable this feature.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info about what happens on first enable */}
        {!isEnabled && (
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> When you enable milestone tracking, 4 predefined tracks will be automatically created:
              Software (6 milestones), Hardware (8 milestones), Biotech/Pharma (6 milestones), and Medical Device (7 milestones).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
