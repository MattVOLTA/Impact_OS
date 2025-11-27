/**
 * AI Feature Toggle Component
 *
 * Individual toggle for specific AI-powered features
 * Issue #69: Granular AI Feature Controls
 */

'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { toggleAIFeature } from '../actions'
import { useRouter } from 'next/navigation'

interface AIFeatureToggleProps {
  feature: string
  label: string
  description: string
  enabled: boolean
  isAdmin: boolean
  comingSoon?: boolean
  disabledReason?: string
}

export function AIFeatureToggle({
  feature,
  label,
  description,
  enabled: initialEnabled,
  isAdmin,
  comingSoon,
  disabledReason
}: AIFeatureToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleToggle = async (checked: boolean) => {
    if (comingSoon || disabledReason) return

    setIsLoading(true)
    setEnabled(checked)

    try {
      const result = await toggleAIFeature(feature, checked)

      if (!result.success) {
        setEnabled(!checked)
        console.error(result.error)
      } else {
        // Force full page refresh to clear all caches
        window.location.reload()
      }
    } catch (error) {
      setEnabled(!checked)
      console.error('Failed to toggle feature:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Label htmlFor={`ai-feature-${feature}`} className="text-sm font-medium cursor-pointer">
            {label}
          </Label>
          {comingSoon && (
            <Badge variant="outline" className="text-xs">
              Coming Soon
            </Badge>
          )}
          {disabledReason && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Requires {disabledReason}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="flex items-center space-x-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Switch
          id={`ai-feature-${feature}`}
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={isLoading || !isAdmin || comingSoon || !!disabledReason}
        />
      </div>
    </div>
  )
}
