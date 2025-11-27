/**
 * Add Milestone Modal
 *
 * Modal for adding a new milestone to a track.
 */

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { createMilestoneDefinitionAction } from '../../../actions'

interface AddMilestoneModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trackId: string
  nextOrderPosition: number
}

export function AddMilestoneModal({
  open,
  onOpenChange,
  trackId,
  nextOrderPosition
}: AddMilestoneModalProps) {
  const [name, setName] = useState('')
  const [evidenceDescription, setEvidenceDescription] = useState('')
  const [objectiveSignal, setObjectiveSignal] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const resetForm = () => {
    setName('')
    setEvidenceDescription('')
    setObjectiveSignal('')
  }

  const handleSubmit = async () => {
    if (!name.trim() || !evidenceDescription.trim() || !objectiveSignal.trim()) {
      return
    }

    startTransition(async () => {
      const result = await createMilestoneDefinitionAction(trackId, {
        name: name.trim(),
        evidence_description: evidenceDescription.trim(),
        objective_signal: objectiveSignal.trim(),
        order_position: nextOrderPosition
      })

      if (result.success) {
        resetForm()
        onOpenChange(false)
        router.refresh()
      } else {
        console.error(result.error)
      }
    })
  }

  const handleClose = (open: boolean) => {
    if (!open && !isPending) {
      resetForm()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Milestone</DialogTitle>
          <DialogDescription>
            Create a new milestone for this track. It will be added at position {nextOrderPosition}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="new-name">Milestone Name *</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Problem Validated"
              maxLength={100}
            />
          </div>

          {/* Objective Signal */}
          <div className="space-y-2">
            <Label htmlFor="new-objective">Objective Signal *</Label>
            <Textarea
              id="new-objective"
              value={objectiveSignal}
              onChange={(e) => setObjectiveSignal(e.target.value)}
              placeholder="What market signal indicates this milestone is achieved?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Describe what objective, observable signal demonstrates achievement
            </p>
          </div>

          {/* Evidence Description */}
          <div className="space-y-2">
            <Label htmlFor="new-evidence">Evidence Required *</Label>
            <Textarea
              id="new-evidence"
              value={evidenceDescription}
              onChange={(e) => setEvidenceDescription(e.target.value)}
              placeholder="What evidence must be present?"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Describe what concrete evidence is needed to validate this milestone
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !evidenceDescription.trim() || !objectiveSignal.trim() || isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Milestone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
