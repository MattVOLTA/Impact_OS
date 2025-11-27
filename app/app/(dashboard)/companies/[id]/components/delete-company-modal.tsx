/**
 * Delete Company Modal
 *
 * Confirmation dialog for deleting a company.
 * Extracted from DeleteCompanyButton to work with actions menu.
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
import { deleteCompanyAction } from '../actions'

interface DeleteCompanyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  companyName: string
}

export function DeleteCompanyModal({ open, onOpenChange, companyId, companyName }: DeleteCompanyModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await deleteCompanyAction(companyId)

      if (!result.success) {
        setError('error' in result ? result.error || 'Failed to delete' : 'Failed to delete')
        return
      }

      // Success: redirect to companies list
      router.push('/companies')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete company')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Company?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{companyName}</strong>? This will also remove all
            associated contacts and interactions. This action cannot be undone.
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
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Deleting...' : 'Delete Company'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
