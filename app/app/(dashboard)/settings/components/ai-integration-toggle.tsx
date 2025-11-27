/**
 * AI Integration Toggle Component
 *
 * Allows admins to enable/disable the AI Integration feature.
 */

'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toggleAIIntegration } from '../actions'
import { useRouter } from 'next/navigation'

interface AIIntegrationToggleProps {
  isEnabled: boolean
}

export function AIIntegrationToggle({ isEnabled: initialEnabled }: AIIntegrationToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true)
    // Optimistic update
    setIsEnabled(checked)

    try {
      const result = await toggleAIIntegration(checked)

      if (!result.success) {
        // Revert on failure
        setIsEnabled(!checked)
        console.error(result.error)
      } else {
        router.refresh()
      }
    } catch (error) {
      setIsEnabled(!checked)
      console.error('Failed to toggle AI integration:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="ai-integration-toggle" className="text-sm font-normal">
          {isEnabled ? (
            <span>
              AI Integration is <strong>enabled</strong>. AI-powered features are available.
            </span>
          ) : (
            <span>
              AI Integration is currently <strong>disabled</strong>.
            </span>
          )}
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Switch
          id="ai-integration-toggle"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
      </div>
    </div>
  )
}
