/**
 * Delete Email Modal
 *
 * Confirmation dialog for deleting an email address.
 */

'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle } from 'lucide-react'
import { deleteContactEmailAction } from '../../actions'

interface DeleteEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emailId: string
  contactId: string
  isPrimary: boolean
  onSuccess?: () => void
}

export function DeleteEmailModal({
  open,
  onOpenChange,
  emailId,
  contactId,
  isPrimary,
  onSuccess
}: DeleteEmailModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await deleteContactEmailAction(emailId, contactId)

      if (!result.success) {
        setError(result.error || 'Failed to delete email')
        return
      }

      // Success - close modal
      onOpenChange(false)

      // Callback or reload
      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Email</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this email address?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning if deleting primary */}
          {isPrimary && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">This is the primary email</p>
                <p className="text-xs mt-1">
                  Consider setting another email as primary before deleting this one.
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>

          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Deleting...' : 'Delete Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
