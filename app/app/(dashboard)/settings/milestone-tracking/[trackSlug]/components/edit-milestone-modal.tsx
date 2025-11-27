/**
 * Edit Milestone Modal
 *
 * Modal for editing an existing milestone's name, evidence, and objective signal.
 */

'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Trash2 } from 'lucide-react'
import { updateMilestoneDefinitionAction, deleteMilestoneDefinitionAction } from '../../../actions'

interface Milestone {
  id: string
  name: string
  evidence_description: string
  objective_signal: string
  version: number
}

interface EditMilestoneModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  milestone: Milestone
  trackId: string
}

export function EditMilestoneModal({
  open,
  onOpenChange,
  milestone,
  trackId
}: EditMilestoneModalProps) {
  const [name, setName] = useState(milestone.name)
  const [evidenceDescription, setEvidenceDescription] = useState(milestone.evidence_description)
  const [objectiveSignal, setObjectiveSignal] = useState(milestone.objective_signal)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Reset form when milestone changes
  useEffect(() => {
    setName(milestone.name)
    setEvidenceDescription(milestone.evidence_description)
    setObjectiveSignal(milestone.objective_signal)
  }, [milestone])

  const handleSubmit = async () => {
    if (!name.trim()) return

    startTransition(async () => {
      const result = await updateMilestoneDefinitionAction(milestone.id, {
        name: name.trim(),
        evidence_description: evidenceDescription.trim(),
        objective_signal: objectiveSignal.trim()
      })

      if (result.success) {
        onOpenChange(false)
        router.refresh()
      } else {
        console.error(result.error)
      }
    })
  }

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteMilestoneDefinitionAction(milestone.id)

      if (result.success) {
        setDeleteDialogOpen(false)
        onOpenChange(false)
        router.refresh()
      } else {
        console.error(result.error)
      }
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
            <DialogDescription>
              Update the milestone name, evidence, and objective signal. Changes will increment the version number.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Milestone Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Problem Validated"
                maxLength={100}
              />
            </div>

            {/* Objective Signal */}
            <div className="space-y-2">
              <Label htmlFor="objective">Objective Signal *</Label>
              <Textarea
                id="objective"
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
              <Label htmlFor="evidence">Evidence Required *</Label>
              <Textarea
                id="evidence"
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                placeholder="What evidence must be present?"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Describe what concrete evidence is needed to validate this milestone
              </p>
            </div>

            {/* Version Info */}
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-xs text-muted-foreground">
                Current version: v{milestone.version}. Saving will create v{milestone.version + 1}.
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete &quot;{milestone.name}&quot;. Historical data will be preserved,
              but this milestone will no longer be available for new companies.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Milestone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
