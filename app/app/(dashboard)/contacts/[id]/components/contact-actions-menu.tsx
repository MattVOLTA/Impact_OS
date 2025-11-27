/**
 * Contact Actions Menu
 *
 * Dropdown menu for Edit and Delete actions.
 * Menu items are simple text/icons, not buttons.
 */

'use client'

import { useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type ContactWithCompanies } from '@/lib/dal/contacts'
import { EditContactModal } from './edit-contact-modal'
import { DeleteContactModal } from './delete-contact-modal'

interface ContactActionsMenuProps {
  contact: ContactWithCompanies
}

export function ContactActionsMenu({ contact }: ContactActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      {/* TODO: Fix hydration mismatch - Issue #37
          Radix UI generates different IDs on server vs client.
          Quick fix: Add suppressHydrationWarning to Button below.
          Better fix: Use client-only rendering pattern. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" suppressHydrationWarning>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      <EditContactModal open={editOpen} onOpenChange={setEditOpen} contact={contact} />
      <DeleteContactModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        contactId={contact.id}
        contactName={`${contact.first_name} ${contact.last_name}`}
      />
    </>
  )
}
