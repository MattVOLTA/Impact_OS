/**
 * Add Contact Button
 *
 * Opens combobox with duplicate detection (no company auto-link from contacts page).
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AddContactComboboxStandalone } from './add-contact-combobox-standalone'

export function AddContactButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Contact
      </Button>

      <AddContactComboboxStandalone open={open} onOpenChange={setOpen} />
    </>
  )
}
