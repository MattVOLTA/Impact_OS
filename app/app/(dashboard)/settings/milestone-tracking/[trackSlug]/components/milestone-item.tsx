/**
 * Milestone Item Component
 *
 * Sortable milestone item with drag handle and edit button.
 */

'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { GripVertical, Edit } from 'lucide-react'

interface Milestone {
  id: string
  order_position: number
  name: string
  evidence_description: string
  objective_signal: string
}

interface MilestoneItemProps {
  milestone: Milestone
  onEdit: () => void
}

export function MilestoneItem({ milestone, onEdit }: MilestoneItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-4 bg-card border rounded-lg hover:bg-muted/50 transition-colors"
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Content */}
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <h4 className="font-semibold">
            {milestone.order_position}. {milestone.name}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="flex-shrink-0"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Objective Signal:</p>
            <p className="text-sm mt-0.5 line-clamp-2">{milestone.objective_signal}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Evidence Required:</p>
            <p className="text-sm mt-0.5 line-clamp-2">{milestone.evidence_description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
