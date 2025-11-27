/**
 * Create Contact Modal
 *
 * Form for creating new contacts with email validation.
 * Can be used from company page (auto-links) or contacts page (no auto-link).
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
import { Loader2 } from 'lucide-react'
import { createContactAction, addContactEmailAction } from '../actions'

interface CreateContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId?: string // Optional - if provided, auto-links contact to company
  onSuccess?: () => void
  initialName?: string // Optional - pre-populate from search query
}

export function CreateContactModal({ open, onOpenChange, companyId, onSuccess, initialName }: CreateContactModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parse initial name into first/last (simple split on space)
  const parseInitialName = (name?: string) => {
    if (!name) return { first: '', last: '' }
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return { first: parts[0], last: '' }
    return { first: parts[0], last: parts.slice(1).join(' ') }
  }

  const initialParsed = parseInitialName(initialName)

  // Form state
  const [firstName, setFirstName] = useState(initialParsed.first)
  const [lastName, setLastName] = useState(initialParsed.last)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Update form when initialName changes
  useEffect(() => {
    if (open && initialName) {
      const parsed = parseInitialName(initialName)
      setFirstName(parsed.first)
      setLastName(parsed.last)
    }
  }, [open, initialName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await createContactAction(
        {
          first_name: firstName,
          last_name: lastName,
          phone: phone || undefined
        },
        companyId
      )

      if (!result.success) {
        setError('error' in result ? result.error || 'Failed to create contact' : 'Failed to create contact')
        return
      }

      // Add email to contact_emails table if provided
      if (email && result.contact) {
        const emailResult = await addContactEmailAction(
          result.contact.id,
          email,
          undefined, // email_type not specified during creation
          true // First email is always primary
        )

        if (!emailResult.success) {
          // Contact created but email failed - show warning
          setError(`Contact created, but failed to add email: ${emailResult.error}`)
          // Still close modal and show success (contact was created)
        }
      }

      // Success - reset form and close
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      onOpenChange(false)

      // Callback for parent to refresh
      if (onSuccess) {
        onSuccess()
      } else {
        // Reload page to show new contact
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
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            Create a new contact. You can add demographics later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional, but recommended for Fireflies"
            />
            <p className="text-xs text-muted-foreground">
              Email is needed for automatic meeting capture via Fireflies
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
            />
          </div>

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
              {loading ? 'Creating...' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
