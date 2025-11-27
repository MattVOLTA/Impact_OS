/**
 * Edit Company Button & Dialog
 *
 * Client Component - Opens dialog to edit company information.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { type CompanyWithIndustries } from '@/lib/dal/companies'
import { EditCompanyModal } from './edit-company-modal'

interface EditCompanyButtonProps {
  company: CompanyWithIndustries
  industries: Array<{ id: string; name: string; description?: string }>
}

export function EditCompanyButton({ company, industries }: EditCompanyButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4 mr-2" />
        Edit
      </Button>

      <EditCompanyModal open={open} onOpenChange={setOpen} company={company} industries={industries} />
    </>
  )
}
