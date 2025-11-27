/**
 * Edit Email Modal
 *
 * Form for editing an existing email address.
 */

'use client'

import { useState, useEffect } from 'react'
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
import { type ContactEmail } from '@/lib/dal/contacts'
import { updateContactEmailAction, setPrimaryEmailAction } from '../../actions'

interface EditEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: ContactEmail
  contactId: string
  onSuccess?: () => void
}

export function EditEmailModal({
  open,
  onOpenChange,
  email,
  contactId,
  onSuccess
}: EditEmailModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [emailAddress, setEmailAddress] = useState(email.email)
  const [emailType, setEmailType] = useState<string>(email.email_type || '')
  const [isPrimary, setIsPrimary] = useState(email.is_primary)

  // Reset form when email changes
  useEffect(() => {
    setEmailAddress(email.email)
    setEmailType(email.email_type || '')
    setIsPrimary(email.is_primary)
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Build update data
      const updateData: {
        email?: string
        email_type?: 'work' | 'personal' | 'other'
        is_primary?: boolean
      } = {}

      if (emailAddress !== email.email) {
        updateData.email = emailAddress
      }

      if (emailType !== email.email_type) {
        updateData.email_type = emailType ? (emailType as 'work' | 'personal' | 'other') : undefined
      }

      // Handle primary status change
      if (isPrimary && !email.is_primary) {
        // Setting as primary - use setPrimaryEmailAction
        const result = await setPrimaryEmailAction(email.id, contactId)
        if (!result.success) {
          setError(result.error || 'Failed to set as primary')
          return
        }
      }

      // Update other fields if changed
      if (Object.keys(updateData).length > 0) {
        const result = await updateContactEmailAction(email.id, contactId, updateData)

        if (!result.success) {
          setError(result.error || 'Failed to update email')
          return
        }
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
          <DialogTitle>Edit Email</DialogTitle>
          <DialogDescription>
            Update email address, type, or primary status
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              required
            />
          </div>

          {/* Email Type */}
          <div className="space-y-2">
            <Label htmlFor="email_type">Email Type</Label>
            <Select value={emailType} onValueChange={setEmailType}>
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
          {!email.is_primary && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
              />
              <Label htmlFor="is_primary" className="text-sm font-normal cursor-pointer">
                Set as primary email
              </Label>
            </div>
          )}

          {/* Info if already primary */}
          {email.is_primary && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded-md">
              This is currently the primary email. To change it, set another email as primary.
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
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
