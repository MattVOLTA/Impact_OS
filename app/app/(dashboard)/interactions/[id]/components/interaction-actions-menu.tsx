/**
 * Interaction Actions Menu
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
import { type InteractionWithRelations } from '@/lib/dal/interactions'
import { EditInteractionModal } from './edit-interaction-modal'
import { DeleteInteractionDialog } from './delete-interaction-dialog'

interface InteractionActionsMenuProps {
  interaction: InteractionWithRelations
}

export function InteractionActionsMenu({ interaction }: InteractionActionsMenuProps) {
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
      <EditInteractionModal
        interaction={interaction}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteInteractionDialog
        interactionId={interaction.id}
        interactionName={interaction.title || 'this interaction'}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
