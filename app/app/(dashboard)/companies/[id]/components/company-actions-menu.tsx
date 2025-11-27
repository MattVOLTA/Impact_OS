/**
 * Company Actions Menu
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
import { type CompanyWithIndustries } from '@/lib/dal/companies'
import { EditCompanyModal } from './edit-company-modal'
import { DeleteCompanyModal } from './delete-company-modal'

interface CompanyActionsMenuProps {
  company: CompanyWithIndustries
  industries: Array<{ id: string; name: string; description?: string }>
}

export function CompanyActionsMenu({ company, industries }: CompanyActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
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
      <EditCompanyModal open={editOpen} onOpenChange={setEditOpen} company={company} industries={industries} />
      <DeleteCompanyModal open={deleteOpen} onOpenChange={setDeleteOpen} companyId={company.id} companyName={company.business_name} />
    </>
  )
}
