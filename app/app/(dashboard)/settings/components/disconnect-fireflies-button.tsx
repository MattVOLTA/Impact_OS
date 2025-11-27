/**
 * Disconnect Fireflies Button & Dialog
 *
 * Client Component - Shows confirmation dialog before disconnecting
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
import { Loader2 } from 'lucide-react'
import { disconnectFireflies } from '../actions'

export function DisconnectFirefliesButton() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDisconnect = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Call Server Action to disconnect and delete from Vault
      const result = await disconnectFireflies()

      if (!result.success) {
        setError('error' in result ? result.error || 'Failed to disconnect' : 'Failed to disconnect')
        return
      }

      // Close dialog
      setOpen(false)

      // Refresh the page to show updated status
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Fireflies')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" suppressHydrationWarning>Disconnect</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Fireflies?</DialogTitle>
          <DialogDescription>
            Are you sure you want to disconnect your Fireflies connection? This will have to be re-added by an admin.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-sm text-red-500">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
