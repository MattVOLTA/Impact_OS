/**
 * Delete Program Dialog
 *
 * Confirmation dialog for deleting programs.
 * Warns about cascade delete of enrollments.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { deleteProgramAction } from '../../actions'

interface DeleteProgramDialogProps {
  programId: string
  programName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteProgramDialog({
  programId,
  programName,
  open,
  onOpenChange
}: DeleteProgramDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)

    try {
      const result = await deleteProgramAction(programId)

      if (result.success) {
        toast.success('Program deleted successfully')
        onOpenChange(false)
        router.push('/programs')
      } else {
        // Handle error returned from action
        const errorMessage = result.error || 'Failed to delete program'
        toast.error('Failed to delete program', {
          description: errorMessage
        })
      }
    } catch (err) {
      // Handle unexpected errors
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      console.error('Failed to delete program:', err)
      toast.error('Failed to delete program', {
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Program?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span className="font-semibold">{programName}</span>?
            <br /><br />
            This will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Remove all company and contact enrollments</li>
              <li>Unlink any associated forms (forms will not be deleted)</li>
            </ul>
            <br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete Program'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
