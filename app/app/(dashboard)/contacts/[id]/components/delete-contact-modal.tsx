/**
 * Delete Contact Modal
 *
 * Confirmation dialog for deleting a contact.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { deleteContactAction } from '../actions'

interface DeleteContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  contactName: string
}

export function DeleteContactModal({ open, onOpenChange, contactId, contactName }: DeleteContactModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteContactAction(contactId)

      if (!result.success) {
        alert('error' in result ? result.error : 'Failed to delete')
        setIsDeleting(false)
        return
      }

      // Success - redirect to contacts list
      router.push('/contacts')
    } catch (err) {
      alert('Failed to delete contact')
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Contact?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{contactName}</strong>? This will remove all company
            associations and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? 'Deleting...' : 'Delete Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
