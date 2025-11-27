/**
 * Edit Contact Modal
 *
 * Form for editing contact with all fields including bio, LinkedIn, and email management.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  Star,
  StarOff,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  Mail,
  Check,
  X
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type ContactWithCompanies, type ContactEmail } from '@/lib/dal/contacts'
import { updateContactAction } from '../actions'
import { addContactEmailAction } from '../../actions'
import { EditEmailModal } from './edit-email-modal'
import { DeleteEmailModal } from './delete-email-modal'

interface EditContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: ContactWithCompanies
}

export function EditContactModal({ open, onOpenChange, contact }: EditContactModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [firstName, setFirstName] = useState(contact.first_name)
  const [lastName, setLastName] = useState(contact.last_name)
  const [title, setTitle] = useState(contact.title || '')
  const [phone, setPhone] = useState(contact.phone || '')
  const [linkedinUrl, setLinkedinUrl] = useState(contact.linkedin_url || '')
  const [bio, setBio] = useState(contact.bio || '')

  // Email management state
  const [showAddEmailForm, setShowAddEmailForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newEmailType, setNewEmailType] = useState<'work' | 'personal' | 'other'>('work')
  const [newEmailIsPrimary, setNewEmailIsPrimary] = useState(false)
  const [savingNewEmail, setSavingNewEmail] = useState(false)
  const [editingEmail, setEditingEmail] = useState<ContactEmail | null>(null)
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null)

  // Reset form when contact changes
  useEffect(() => {
    setFirstName(contact.first_name)
    setLastName(contact.last_name)
    setTitle(contact.title || '')
    setPhone(contact.phone || '')
    setLinkedinUrl(contact.linkedin_url || '')
    setBio(contact.bio || '')
  }, [contact])

  // Email helper functions
  const emails = contact.emails || []
  const sortedEmails = [...emails].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return 0
  })

  const getEmailTypeBadgeVariant = (type?: string | null) => {
    switch (type) {
      case 'work':
        return 'default' as const
      case 'personal':
        return 'secondary' as const
      case 'other':
        return 'outline' as const
      default:
        return 'outline' as const
    }
  }

  const getEmailTypeLabel = (type?: string | null) => {
    if (!type) return null
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const handleAddEmailClick = () => {
    setShowAddEmailForm(true)
    setNewEmail('')
    setNewEmailType('work')
    setNewEmailIsPrimary(emails.length === 0) // Auto-set primary if no emails exist
  }

  const handleCancelNewEmail = () => {
    setShowAddEmailForm(false)
    setNewEmail('')
    setNewEmailType('work')
    setNewEmailIsPrimary(false)
  }

  const handleSaveNewEmail = async () => {
    if (!newEmail.trim()) return

    setSavingNewEmail(true)
    try {
      const result = await addContactEmailAction(
        contact.id,
        newEmail.trim(),
        newEmailType,
        newEmailIsPrimary
      )

      if (result.success) {
        setShowAddEmailForm(false)
        setNewEmail('')
        setNewEmailType('work')
        setNewEmailIsPrimary(false)
        window.location.reload() // Refresh to show new email
      } else {
        setError(result.error || 'Failed to add email')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add email')
    } finally {
      setSavingNewEmail(false)
    }
  }

  const handleNewEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveNewEmail()
    } else if (e.key === 'Escape') {
      handleCancelNewEmail()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await updateContactAction(contact.id, {
        first_name: firstName,
        last_name: lastName,
        title: title || undefined,
        phone: phone || undefined,
        linkedin_url: linkedinUrl || undefined,
        bio: bio || undefined
      })

      if (!result.success) {
        setError('error' in result ? result.error || 'Failed to update' : 'Failed to update')
        return
      }

      onOpenChange(false)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>Update contact information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
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

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title/Role</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="CEO, Founder, Co-Founder, Advisor, etc."
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          {/* LinkedIn */}
          <div className="space-y-2">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Background information about this contact..."
            />
          </div>

          {/* Email Management Section */}
          <Separator className="my-6" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Email Addresses</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage contact email addresses for Fireflies integration
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddEmailClick}
                disabled={showAddEmailForm}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Email
              </Button>
            </div>

            {emails.length === 0 && !showAddEmailForm ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg">
                <Mail className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No email addresses added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Inline Add Email Form */}
                {showAddEmailForm && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                    <div className="pt-0.5">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={handleNewEmailKeyDown}
                        disabled={savingNewEmail}
                        autoFocus
                        className="col-span-6"
                      />
                      <Select
                        value={newEmailType}
                        onValueChange={(value: 'work' | 'personal' | 'other') => setNewEmailType(value)}
                        disabled={savingNewEmail}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="work">Work</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="col-span-3 flex items-center gap-1">
                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newEmailIsPrimary}
                            onChange={(e) => setNewEmailIsPrimary(e.target.checked)}
                            disabled={savingNewEmail}
                            className="rounded"
                          />
                          <span>Primary</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleSaveNewEmail}
                        disabled={savingNewEmail || !newEmail.trim()}
                        title="Save (Enter)"
                      >
                        {savingNewEmail ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelNewEmail}
                        disabled={savingNewEmail}
                        title="Cancel (Esc)"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Existing Emails */}
                {sortedEmails.map((email) => (
                  <div
                    key={email.id}
                    className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Primary Indicator */}
                      <div className="pt-0.5">
                        {email.is_primary ? (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <StarOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* Email Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{email.email}</p>

                        <div className="flex items-center gap-2 mt-1">
                          {/* Email Type Badge */}
                          {email.email_type && (
                            <Badge variant={getEmailTypeBadgeVariant(email.email_type)} className="text-xs">
                              {getEmailTypeLabel(email.email_type)}
                            </Badge>
                          )}

                          {/* Verified Badge */}
                          {email.is_verified && (
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}

                          {/* Primary Badge */}
                          {email.is_primary && (
                            <Badge variant="default" className="text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingEmail(email)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingEmailId(email.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Email Management Modals */}
      {editingEmail && (
        <EditEmailModal
          open={!!editingEmail}
          onOpenChange={(open) => !open && setEditingEmail(null)}
          email={editingEmail}
          contactId={contact.id}
        />
      )}

      {deletingEmailId && (
        <DeleteEmailModal
          open={!!deletingEmailId}
          onOpenChange={(open) => !open && setDeletingEmailId(null)}
          emailId={deletingEmailId}
          contactId={contact.id}
          isPrimary={emails.find(e => e.id === deletingEmailId)?.is_primary || false}
        />
      )}
    </Dialog>
  )
}
