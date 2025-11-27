/**
 * Add Company Button and Modal
 *
 * Client Component with Dialog modal for creating companies.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AddCompanyModal } from './add-company-modal'

interface AddCompanyButtonProps {
  industries: Array<{ id: string; name: string; description?: string }>
}

export function AddCompanyButton({ industries }: AddCompanyButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        + Company
      </Button>

      <AddCompanyModal
        open={open}
        onOpenChange={setOpen}
        industries={industries}
      />
    </>
  )
}
