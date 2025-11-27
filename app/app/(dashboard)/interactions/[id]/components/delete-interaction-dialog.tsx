/**
 * Delete Interaction Dialog
 *
 * Confirmation dialog for deleting an interaction.
 */

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteInteractionAction } from '../../actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'

interface DeleteInteractionDialogProps {
  interactionId: string
  interactionName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteInteractionDialog({
  interactionId,
  interactionName,
  open,
  onOpenChange
}: DeleteInteractionDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setError(null)

    startTransition(async () => {
      const result = await deleteInteractionAction(interactionId)

      if (result && !result.success) {
        setError(result.error || 'Failed to delete interaction')
      } else {
        // Navigate back to the previous page (company, contact, or interactions list)
        router.back()
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Interaction?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{interactionName}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
