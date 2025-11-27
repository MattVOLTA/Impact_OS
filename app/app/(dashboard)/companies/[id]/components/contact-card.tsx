/**
 * Contact Card
 *
 * Displays individual contact with email, phone, and unlink action.
 * Contact name links to contact details page.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type Contact } from '@/lib/dal/contacts'
import { unlinkContactAction } from '@/app/(dashboard)/contacts/actions'

interface ContactCardProps {
  contact: Contact
  companyId: string
}

export function ContactCard({ contact, companyId }: ContactCardProps) {
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)

  const handleUnlink = async () => {
    setIsUnlinking(true)

    try {
      const result = await unlinkContactAction(contact.id, companyId)

      if (!result.success) {
        alert('error' in result ? result.error : 'Failed to remove contact')
        return
      }

      // Success - reload to show updated list
      window.location.reload()
    } catch (err) {
      alert('Failed to remove contact')
    } finally {
      setIsUnlinking(false)
    }
  }

  return (
    <>
      <div className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex-1 min-w-0">
          <Link
            href={`/contacts/${contact.id}`}
            className="font-medium hover:underline"
          >
            {contact.first_name} {contact.last_name}
          </Link>

          {contact.email && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Mail className="h-3 w-3" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}

          {contact.phone && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Phone className="h-3 w-3" />
              <span>{contact.phone}</span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-8 w-8"
          onClick={() => setUnlinkDialogOpen(true)}
          title="Remove from company"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Unlink Confirmation Dialog */}
      <Dialog open={unlinkDialogOpen} onOpenChange={setUnlinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Contact?</DialogTitle>
            <DialogDescription>
              Remove <strong>{contact.first_name} {contact.last_name}</strong> from this company?
              The contact will not be deleted and can be added back later.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnlinkDialogOpen(false)}
              disabled={isUnlinking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlink}
              disabled={isUnlinking}
            >
              {isUnlinking ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
