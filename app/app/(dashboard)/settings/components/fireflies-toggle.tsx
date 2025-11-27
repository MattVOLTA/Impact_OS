/**
 * Fireflies Enable/Disable Toggle
 *
 * Client Component - Toggles feature_fireflies flag in tenant_config
 */

'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toggleFireflies } from '../actions'

interface FirefliesToggleProps {
  isEnabled: boolean
}

export function FirefliesToggle({ isEnabled: initialEnabled }: FirefliesToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    setIsLoading(true)

    try {
      // Call Server Action to toggle feature_fireflies
      const result = await toggleFireflies(!isEnabled)

      if (!result.success) {
        alert('error' in result ? result.error : 'Failed to update Fireflies status')
        return
      }

      setIsEnabled(!isEnabled)

      // Optionally reload to update other parts of UI
      window.location.reload()
    } catch (err) {
      console.error('Failed to toggle Fireflies:', err)
      alert('Failed to update Fireflies status. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="fireflies-enabled" className="text-sm text-muted-foreground">
        {isEnabled ? 'Enabled' : 'Disabled'}
      </Label>
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
      >
        {isLoading ? 'Updating...' : isEnabled ? 'Disable' : 'Enable'}
      </Button>
    </div>
  )
}
