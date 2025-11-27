/**
 * Edit Contact Button
 *
 * Opens edit contact modal.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { type ContactWithCompanies } from '@/lib/dal/contacts'
import { EditContactModal } from './edit-contact-modal'

interface EditContactButtonProps {
  contact: ContactWithCompanies
}

export function EditContactButton({ contact }: EditContactButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4 mr-2" />
        Edit
      </Button>

      <EditContactModal open={open} onOpenChange={setOpen} contact={contact} />
    </>
  )
}
