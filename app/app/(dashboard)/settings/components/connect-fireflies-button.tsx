/**
 * Connect Fireflies Button & Dialog
 *
 * Client Component - Opens dialog to enter Fireflies API key
 * Tests connection before saving to Vault
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { saveFirefliesKey } from '../actions'

export function ConnectFirefliesButton() {
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your Fireflies API key')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Call Server Action to test connection and save to Vault
      const result = await saveFirefliesKey(apiKey)

      if (!result.success) {
        setError('error' in result ? result.error || 'Failed to connect' : 'Failed to connect')
        return
      }

      // Close dialog on success
      setOpen(false)
      setApiKey('')

      // Refresh the page to show new connection status
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Fireflies')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button suppressHydrationWarning>Connect Fireflies</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Fireflies</DialogTitle>
          <DialogDescription>
            Enter your Fireflies API key to enable automatic meeting transcript capture.
            Your API key will be encrypted and stored securely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">Fireflies API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your Fireflies API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              You can find your API key in your Fireflies account settings.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Testing Connection...' : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
