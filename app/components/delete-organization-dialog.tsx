/**
 * Delete Organization Dialog
 *
 * Destructive confirmation dialog for deleting an organization
 * Requires typing "DELETE" to confirm
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { Trash2, AlertTriangle } from 'lucide-react'
import { deleteOrganization } from '@/lib/dal/organizations'
import { toast } from 'sonner'

interface DeleteOrganizationDialogProps {
  organizationId: string
  organizationName: string
}

export function DeleteOrganizationDialog({
  organizationId,
  organizationName
}: DeleteOrganizationDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isConfirmed = confirmText === 'DELETE'

  async function handleDelete() {
    if (!isConfirmed) return

    setError(null)
    setIsDeleting(true)

    try {
      await deleteOrganization(organizationId, confirmText)

      toast.success('Organization deleted', {
        description: 'Redirecting to login...'
      })

      // Close dialog
      setOpen(false)

      // Redirect to login (user has no org now)
      window.location.href = '/login'
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete organization'
      setError(errorMessage)
      toast.error('Failed to delete organization', {
        description: errorMessage
      })
      setIsDeleting(false)
    }
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset state when closing
      setConfirmText('')
      setError(null)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Organization
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Organization
          </AlertDialogTitle>
          <AlertDialogDescription>
            You are about to permanently delete{' '}
            <span className="font-semibold">{organizationName}</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="font-semibold text-destructive">
            This action cannot be undone. All data will be permanently deleted:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>All companies and contacts</li>
            <li>All interactions and meeting transcripts</li>
            <li>All forms and submissions</li>
            <li>All programs and enrollments</li>
            <li>All reports and analytics</li>
            <li>All team member access</li>
          </ul>
        </div>

        {error && (
          <Alert variant="destructive">
            <p className="text-sm">{error}</p>
          </Alert>
        )}

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
              autoComplete="off"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Organization'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
