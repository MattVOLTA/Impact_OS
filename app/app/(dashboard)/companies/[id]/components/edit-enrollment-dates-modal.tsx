/**
 * Edit Enrollment Dates Modal
 *
 * Reusable modal for editing enrollment dates (works for both companies and contacts).
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  updateCompanyEnrollmentAction,
  updateContactEnrollmentAction,
  getEnrolledContactsByCompanyAction,
  getEnrolledCompaniesByContactAction
} from '../../../programs/actions'

interface EditEnrollmentDatesModalProps {
  type: 'company' | 'contact'
  entityId: string
  programId: string
  programName: string
  currentStartDate: string
  currentEndDate: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditEnrollmentDatesModal({
  type,
  entityId,
  programId,
  programName,
  currentStartDate,
  currentEndDate,
  open,
  onOpenChange
}: EditEnrollmentDatesModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enrolledEntities, setEnrolledEntities] = useState<any[]>([])

  // Form state
  const [startDate, setStartDate] = useState<Date>(parseISO(currentStartDate))
  const [endDate, setEndDate] = useState<Date | undefined>(
    currentEndDate ? parseISO(currentEndDate) : undefined
  )
  const [isOngoing, setIsOngoing] = useState(!currentEndDate)
  const [propagateToEntities, setPropagateToEntities] = useState(true) // Checked by default
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([])

  // Load enrolled entities when modal opens and user sets end date
  useEffect(() => {
    if (open && !isOngoing) {
      loadEnrolledEntities()
    }
  }, [open, isOngoing])

  const loadEnrolledEntities = async () => {
    try {
      const result = type === 'company'
        ? await getEnrolledContactsByCompanyAction(programId, entityId)
        : await getEnrolledCompaniesByContactAction(programId, entityId)

      if (result.success && result.data) {
        setEnrolledEntities(result.data)
        // Select all by default
        setSelectedEntityIds(result.data.map((e: any) =>
          type === 'company' ? e.contact.id : e.company.id
        ))
      }
    } catch (err) {
      console.error('Failed to load enrolled entities:', err)
    }
  }

  const toggleEntity = (id: string) => {
    setSelectedEntityIds(prev =>
      prev.includes(id)
        ? prev.filter(entityId => entityId !== id)
        : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate) {
      setError('Please select a start date')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = type === 'company'
        ? await updateCompanyEnrollmentAction(
            programId,
            entityId,
            startDate.toISOString().split('T')[0],
            isOngoing ? null : endDate?.toISOString().split('T')[0],
            propagateToEntities ? selectedEntityIds : undefined // Pass selected contacts
          )
        : await updateContactEnrollmentAction(
            programId,
            entityId,
            startDate.toISOString().split('T')[0],
            isOngoing ? null : endDate?.toISOString().split('T')[0],
            propagateToEntities ? selectedEntityIds : undefined // Pass selected companies
          )

      if (result.success) {
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to update enrollment dates')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Calculate button text
  const totalUpdating = 1 + (propagateToEntities && !isOngoing ? selectedEntityIds.length : 0)
  const entityType = type === 'company' ? 'Company' : 'Contact'
  const relatedType = type === 'company' ? 'Contact' : 'Company'
  const buttonText = loading
    ? 'Saving...'
    : totalUpdating === 1
    ? 'Save Changes'
    : `Save for ${entityType} + ${selectedEntityIds.length} ${relatedType}${selectedEntityIds.length === 1 ? '' : type === 'company' ? 's' : 'ies'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Enrollment Dates</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Editing enrollment for: <span className="font-medium text-foreground">{programName}</span>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Ongoing Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ongoing-edit"
              checked={isOngoing}
              onChange={(e) => {
                setIsOngoing(e.target.checked)
                if (e.target.checked) {
                  setEndDate(undefined)
                }
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="ongoing-edit" className="text-sm font-normal">
              Still active in program (no end date)
            </Label>
          </div>

          {/* End Date (conditional) */}
          {!isOngoing && (
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Pick end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Propagate to Associated Entities (when setting end date) */}
          {!isOngoing && enrolledEntities.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="propagate-dates"
                  checked={propagateToEntities}
                  onChange={(e) => {
                    setPropagateToEntities(e.target.checked)
                    if (!e.target.checked) {
                      setSelectedEntityIds([])
                    } else {
                      // Re-select all
                      setSelectedEntityIds(enrolledEntities.map(e =>
                        type === 'company' ? e.contact.id : e.company.id
                      ))
                    }
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="propagate-dates" className="text-sm font-medium">
                  Also set end date for enrolled {type === 'company' ? 'contacts' : 'companies'} from this {type}
                </Label>
              </div>

              {propagateToEntities && (
                <div className="ml-6 space-y-2 max-h-32 overflow-y-auto">
                  {enrolledEntities.map((entity) => {
                    const id = type === 'company' ? entity.contact.id : entity.company.id
                    const displayName = type === 'company'
                      ? `${entity.contact.first_name} ${entity.contact.last_name}`
                      : entity.company.business_name

                    return (
                      <div key={id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`entity-${id}`}
                          checked={selectedEntityIds.includes(id)}
                          onChange={() => toggleEntity(id)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor={`entity-${id}`} className="text-sm font-normal text-muted-foreground">
                          {displayName}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {buttonText}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
