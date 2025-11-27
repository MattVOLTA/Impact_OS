/**
 * Add Email Modal
 *
 * Form for adding a new email address to a contact.
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { addContactEmailAction } from '../../actions'

interface AddEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  hasExistingPrimary: boolean
  onSuccess?: () => void
}

export function AddEmailModal({
  open,
  onOpenChange,
  contactId,
  hasExistingPrimary,
  onSuccess
}: AddEmailModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [email, setEmail] = useState('')
  const [emailType, setEmailType] = useState<'work' | 'personal' | 'other' | ''>('')
  const [isPrimary, setIsPrimary] = useState(!hasExistingPrimary) // Auto-check if no primary exists

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await addContactEmailAction(
        contactId,
        email,
        emailType || undefined,
        isPrimary
      )

      if (!result.success) {
        setError(result.error || 'Failed to add email')
        return
      }

      // Success - reset form and close
      setEmail('')
      setEmailType('')
      setIsPrimary(!hasExistingPrimary)
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
          <DialogTitle>Add Email</DialogTitle>
          <DialogDescription>
            Add a new email address for this contact
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          {/* Email Type */}
          <div className="space-y-2">
            <Label htmlFor="email_type">Email Type</Label>
            <Select value={emailType} onValueChange={(value) => setEmailType(value as any)}>
              <SelectTrigger id="email_type">
                <SelectValue placeholder="Select type (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Primary Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_primary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
              disabled={!hasExistingPrimary} // Auto-primary if no primary exists
            />
            <Label htmlFor="is_primary" className="text-sm font-normal cursor-pointer">
              Set as primary email
              {!hasExistingPrimary && (
                <span className="text-muted-foreground ml-1">(first email is automatically primary)</span>
              )}
            </Label>
          </div>

          {/* Warning if setting as primary */}
          {isPrimary && hasExistingPrimary && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
              This will replace the current primary email
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Adding...' : 'Add Email'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
