/**
 * Enroll Contact in Program Modal
 *
 * Same as company version but for contacts.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { enrollContactAction, getAllProgramsAction } from '../../../programs/actions'

interface EnrollContactInProgramModalProps {
  contactId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EnrollContactInProgramModal({
  contactId,
  open,
  onOpenChange
}: EnrollContactInProgramModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [programs, setPrograms] = useState<Array<{ id: string; name: string }>>([])

  // Form state
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isOngoing, setIsOngoing] = useState(true)

  // Load programs when modal opens
  useEffect(() => {
    if (open) {
      loadPrograms()
    }
  }, [open])

  const loadPrograms = async () => {
    try {
      const result = await getAllProgramsAction()
      if (result.success && result.data) {
        setPrograms(result.data)
      }
    } catch (err) {
      console.error('Failed to load programs:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProgramId) {
      setError('Please select a program')
      return
    }

    if (!startDate) {
      setError('Please select a start date')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await enrollContactAction(
        selectedProgramId,
        contactId,
        startDate.toISOString().split('T')[0],
        isOngoing ? null : endDate?.toISOString().split('T')[0]
      )

      if (result.success) {
        // Reset form
        setSelectedProgramId('')
        setStartDate(undefined)
        setEndDate(undefined)
        setIsOngoing(true)
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to enroll contact')
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
          <DialogTitle>Enroll in Program</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Program Selection */}
          <div className="space-y-2">
            <Label>
              Select Program <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId} required>
              <SelectTrigger>
                <SelectValue placeholder="Choose a program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Pick start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Ongoing Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ongoing-contact-enroll"
              checked={isOngoing}
              onChange={(e) => {
                setIsOngoing(e.target.checked)
                if (e.target.checked) {
                  setEndDate(undefined)
                }
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="ongoing-contact-enroll" className="text-sm font-normal">
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
                    disabled={(date) => startDate ? date < startDate : false}
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
