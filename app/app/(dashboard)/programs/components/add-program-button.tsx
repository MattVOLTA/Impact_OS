/**
 * Add Program Button and Modal
 *
 * Client Component with Dialog modal for creating programs.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreateProgramModal } from './create-program-modal'

export function AddProgramButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        + Program
      </Button>

      <CreateProgramModal
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
