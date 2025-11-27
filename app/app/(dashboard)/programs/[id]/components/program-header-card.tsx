/**
 * Program Header Card Component
 *
 * Displays program name and description with edit/delete actions.
 * Uses ellipsis menu pattern matching company/contact headers.
 */

'use client'

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { EditProgramModal } from './edit-program-modal'
import { DeleteProgramDialog } from './delete-program-dialog'
import type { Program } from '@/lib/dal/programs'

interface ProgramHeaderCardProps {
  program: Program
}

export function ProgramHeaderCard({ program }: ProgramHeaderCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-2xl">{program.name}</CardTitle>
              {program.description && (
                <CardDescription className="text-base">
                  {program.description}
                </CardDescription>
              )}
            </div>
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
          </div>
        </CardHeader>
      </Card>

      <EditProgramModal
        program={program}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <DeleteProgramDialog
        programId={program.id}
        programName={program.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
