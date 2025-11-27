/**
 * Set Milestone Modal
 *
 * Modal for selecting and setting a company's current milestone.
 * Loads available milestones from enabled tracks.
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
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Loader2, Target, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react'
import { setCompanyMilestoneAction, getAvailableMilestonesAction } from '../actions'
import { type CompanyMilestoneWithDetails } from '@/lib/types/milestones'

interface Track {
  id: string
  name: string
  slug: string
  definitions?: Array<{
    id: string
    name: string
    order_position: number
    evidence_description: string
    objective_signal: string
  }>
}

interface SetMilestoneModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  currentMilestone: CompanyMilestoneWithDetails | null
}

export function SetMilestoneModal({
  open,
  onOpenChange,
  companyId,
  currentMilestone
}: SetMilestoneModalProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>('')
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [availableTracks, setAvailableTracks] = useState<Track[]>([])
  const [showPreviousMilestones, setShowPreviousMilestones] = useState(false)
  const [previousMilestones, setPreviousMilestones] = useState<{
    [key: string]: { verified: boolean; completedDate: string }
  }>({})
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Load available milestones when modal opens
  useEffect(() => {
    if (open) {
      loadAvailableMilestones()
      if (currentMilestone) {
        setSelectedMilestoneId(currentMilestone.milestone_definition_id)
        setNotes(currentMilestone.notes || '')
        // Set track if we have milestone definition
        if (currentMilestone.milestone_definition) {
          setSelectedTrackId((currentMilestone.milestone_definition as any).track_id)
        }
      }
    }
  }, [open, currentMilestone])

  const loadAvailableMilestones = async () => {
    setLoading(true)
    try {
      const result = await getAvailableMilestonesAction()
      if (result.success && result.data) {
        setAvailableTracks(result.data)
        // Auto-select track if only one available OR if no current milestone
        if (result.data.length === 1) {
          // Only one track enabled - auto-select it
          setSelectedTrackId(result.data[0].id)
        } else if (!currentMilestone && result.data.length > 0) {
          // Multiple tracks but no current milestone - auto-select first
          setSelectedTrackId(result.data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load milestones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedMilestoneId) return

    startTransition(async () => {
      // Collect previous milestones that were marked
      const previousMilestonesData = Object.entries(previousMilestones)
        .filter(([_, data]) => data.verified)
        .map(([milestone_id, data]) => ({
          milestone_id,
          completed_at: data.completedDate || undefined,
          is_verified: true
        }))

      // Set the current milestone with previous milestone data
      const result = await setCompanyMilestoneAction(
        companyId,
        selectedMilestoneId,
        {
          status: 'working_towards',
          notes,
          previousMilestones: previousMilestonesData.length > 0 ? previousMilestonesData : undefined
        }
      )

      if (result.success) {
        onOpenChange(false)
        router.refresh()
      } else {
        console.error(result.error)
      }
    })
  }

  // Get previous milestones (those with lower order_position than selected)
  const getPreviousMilestones = () => {
    if (!selectedTrackId || !selectedMilestoneId) return []

    const track = availableTracks.find(t => t.id === selectedTrackId)
    const selectedMilestone = track?.definitions?.find(m => m.id === selectedMilestoneId)

    if (!selectedMilestone) return []

    return (
      track?.definitions?.filter(m => m.order_position < selectedMilestone.order_position) || []
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Set Current Milestone</DialogTitle>
          <DialogDescription>
            Select which milestone this company is currently working towards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {availableTracks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No milestone tracks available. Please enable milestone tracking in Settings.
                  </p>
                </div>
              ) : (
                <>
                  {/* Track Selection - Only show if multiple tracks enabled */}
                  {availableTracks.length > 1 && (
                    <div className="space-y-2">
                      <Label htmlFor="track">Milestone Track</Label>
                      <Select
                        value={selectedTrackId}
                        onValueChange={(value) => {
                          setSelectedTrackId(value)
                          setSelectedMilestoneId('') // Reset milestone when track changes
                        }}
                      >
                        <SelectTrigger id="track">
                          <SelectValue placeholder="Select track..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTracks.map(track => (
                            <SelectItem key={track.id} value={track.id}>
                              {track.name} ({track.definitions?.length || 0} milestones)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Show track name if only one track (no dropdown needed) */}
                  {availableTracks.length === 1 && (
                    <div className="space-y-2">
                      <Label>Milestone Track</Label>
                      <div className="px-3 py-2 bg-muted rounded-md">
                        <p className="text-sm font-medium">{availableTracks[0].name}</p>
                        <p className="text-xs text-muted-foreground">
                          {availableTracks[0].definitions?.length || 0} milestones available
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Milestone Selection - Prominent Radio List */}
                  {selectedTrackId && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-base font-semibold">
                          Select which milestone the company is currently working towards:
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Choose the milestone that best represents where this company is in their journey.
                        </p>
                      </div>

                      <RadioGroup
                        value={selectedMilestoneId}
                        onValueChange={setSelectedMilestoneId}
                        className="space-y-3"
                      >
                        {availableTracks
                          .find(t => t.id === selectedTrackId)
                          ?.definitions?.map((milestone, index) => {
                            const isSelected = selectedMilestoneId === milestone.id
                            return (
                              <Label
                                key={milestone.id}
                                htmlFor={`milestone-${milestone.id}`}
                                className={`flex items-start gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                }`}
                              >
                                {/* Column 1: Radio Button */}
                                <div className="pt-1">
                                  <RadioGroupItem
                                    value={milestone.id}
                                    id={`milestone-${milestone.id}`}
                                  />
                                </div>

                                {/* Column 2: Content */}
                                <div className="flex-1 space-y-3">
                                  {/* Title */}
                                  <div className="flex items-center gap-2">
                                    <span className={`text-base ${isSelected ? 'font-bold' : 'font-semibold'}`}>
                                      {milestone.order_position}. {milestone.name}
                                    </span>
                                    {isSelected && (
                                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                                    )}
                                  </div>

                                  {/* Objective Signal */}
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      Objective Signal:
                                    </p>
                                    <p className="text-sm leading-relaxed text-foreground">
                                      {milestone.objective_signal}
                                    </p>
                                  </div>

                                  {/* Evidence Required */}
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      Evidence Required:
                                    </p>
                                    <p className="text-sm leading-relaxed text-foreground">
                                      {milestone.evidence_description}
                                    </p>
                                  </div>
                                </div>
                              </Label>
                            )
                          })}
                      </RadioGroup>
                    </div>
                  )}
                </>
              )}

              {/* Previous Milestones - Optional marking */}
              {selectedMilestoneId && getPreviousMilestones().length > 0 && (
                <div className="space-y-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowPreviousMilestones(!showPreviousMilestones)}
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                  >
                    {showPreviousMilestones ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span>Mark Previous Milestones as Completed (optional)</span>
                  </button>

                  {showPreviousMilestones && (
                    <div className="space-y-3 pl-6 pt-2">
                      <p className="text-xs text-muted-foreground">
                        Check any previous milestones that have already been achieved and optionally add completion dates.
                      </p>
                      {getPreviousMilestones().map(milestone => (
                        <div key={milestone.id} className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`prev-${milestone.id}`}
                              checked={previousMilestones[milestone.id]?.verified || false}
                              onCheckedChange={(checked) => {
                                setPreviousMilestones(prev => ({
                                  ...prev,
                                  [milestone.id]: {
                                    verified: checked as boolean,
                                    completedDate: prev[milestone.id]?.completedDate || ''
                                  }
                                }))
                              }}
                            />
                            <Label htmlFor={`prev-${milestone.id}`} className="text-sm cursor-pointer">
                              {milestone.order_position}. {milestone.name}
                            </Label>
                          </div>
                          {previousMilestones[milestone.id]?.verified && (
                            <div className="ml-6">
                              <Label htmlFor={`date-${milestone.id}`} className="text-xs text-muted-foreground">
                                Completed on (optional)
                              </Label>
                              <Input
                                id={`date-${milestone.id}`}
                                type="date"
                                value={previousMilestones[milestone.id]?.completedDate || ''}
                                onChange={(e) => {
                                  setPreviousMilestones(prev => ({
                                    ...prev,
                                    [milestone.id]: {
                                      ...prev[milestone.id],
                                      completedDate: e.target.value
                                    }
                                  }))
                                }}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notes - Only show if milestone selected */}
              {selectedMilestoneId && (
                <div className="space-y-2 pt-3 border-t">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes about this milestone..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedMilestoneId || isPending || loading}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Milestone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
