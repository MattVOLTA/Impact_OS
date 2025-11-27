/**
 * Add Interaction Button
 *
 * Opens the Add Interaction modal.
 */

'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddInteractionModal } from './add-interaction-modal'
import { useState } from 'react'

interface AddInteractionButtonProps {
  companyId?: string
  contactId?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function AddInteractionButton({
  companyId,
  contactId,
  variant = 'default',
  size = 'default'
}: AddInteractionButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Interaction
      </Button>

      <AddInteractionModal
        open={open}
        onOpenChange={setOpen}
        defaultCompanyId={companyId}
        defaultContactId={contactId}
      />
    </>
  )
}
