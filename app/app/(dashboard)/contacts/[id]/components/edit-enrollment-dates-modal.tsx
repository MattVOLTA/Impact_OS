/**
 * Edit Enrollment Dates Modal
 *
 * Same as company version (reusable for both companies and contacts).
 */

'use client'

import { useState } from 'react'
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
import { updateCompanyEnrollmentAction, updateContactEnrollmentAction } from '../../../programs/actions'

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

  // Form state
  const [startDate, setStartDate] = useState<Date>(parseISO(currentStartDate))
  const [endDate, setEndDate] = useState<Date | undefined>(
    currentEndDate ? parseISO(currentEndDate) : undefined
  )
  const [isOngoing, setIsOngoing] = useState(!currentEndDate)

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
            isOngoing ? null : endDate?.toISOString().split('T')[0]
          )
        : await updateContactEnrollmentAction(
            programId,
            entityId,
            startDate.toISOString().split('T')[0],
            isOngoing ? null : endDate?.toISOString().split('T')[0]
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
              id="ongoing-edit-contact"
              checked={isOngoing}
              onChange={(e) => {
                setIsOngoing(e.target.checked)
                if (e.target.checked) {
                  setEndDate(undefined)
                }
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="ongoing-edit-contact" className="text-sm font-normal">
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
              {loading ? 'Enrolling...' : 'Enroll in Program'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
