/**
 * Milestone Editor Component
 *
 * Client component for managing milestones with drag-and-drop reordering.
 * Uses @dnd-kit for accessible drag-and-drop.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { MilestoneItem } from './milestone-item'
import { EditMilestoneModal } from './edit-milestone-modal'
import { AddMilestoneModal } from './add-milestone-modal'
import { reorderMilestoneDefinitionsAction } from '../../../actions'

interface Milestone {
  id: string
  order_position: number
  name: string
  evidence_description: string
  objective_signal: string
  version: number
  is_active: boolean
}

interface Track {
  id: string
  name: string
  slug: string
}

interface MilestoneEditorProps {
  track: Track
  milestones: Milestone[]
}

export function MilestoneEditor({ track, milestones: initialMilestones }: MilestoneEditorProps) {
  const [milestones, setMilestones] = useState(initialMilestones)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const router = useRouter()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = milestones.findIndex(m => m.id === active.id)
    const newIndex = milestones.findIndex(m => m.id === over.id)

    // Optimistic update
    const reordered = arrayMove(milestones, oldIndex, newIndex)
    setMilestones(reordered)

    // Server update
    const milestoneIds = reordered.map(m => m.id)
    const result = await reorderMilestoneDefinitionsAction(track.id, milestoneIds)

    if (!result.success) {
      // Revert on failure
      setMilestones(milestones)
      console.error(result.error)
    } else {
      router.refresh()
    }
  }

  const activeMilestones = milestones.filter(m => m.is_active)

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Active Milestones ({activeMilestones.length})</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Drag to reorder, click to edit
              </p>
            </div>
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>

          {activeMilestones.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-4">
                No milestones in this track yet.
              </p>
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Milestone
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeMilestones.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {activeMilestones.map((milestone) => (
                    <MilestoneItem
                      key={milestone.id}
                      milestone={milestone}
                      onEdit={() => setEditingMilestone(milestone)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {editingMilestone && (
        <EditMilestoneModal
          open={!!editingMilestone}
          onOpenChange={(open) => !open && setEditingMilestone(null)}
          milestone={editingMilestone}
          trackId={track.id}
        />
      )}

      {/* Add Modal */}
      <AddMilestoneModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        trackId={track.id}
        nextOrderPosition={activeMilestones.length + 1}
      />
    </>
  )
}
