/**
 * Enroll Contacts Modal
 *
 * Similar to EnrollCompaniesModal but for contacts.
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
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { MultiSelectComboboxContacts } from './multi-select-combobox-contacts'
import { bulkEnrollContactsAction } from '../../actions'

interface EnrollContactsModalProps {
  programId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EnrollContactsModal({
  programId,
  open,
  onOpenChange
}: EnrollContactsModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isOngoing, setIsOngoing] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedContactIds.length === 0) {
      setError('Please select at least one contact')
      return
    }

    if (!startDate) {
      setError('Please select a start date')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await bulkEnrollContactsAction(
        programId,
        selectedContactIds,
        startDate.toISOString().split('T')[0],
        isOngoing ? null : endDate?.toISOString().split('T')[0]
      )

      if (result.success) {
        setSelectedContactIds([])
        setStartDate(undefined)
        setEndDate(undefined)
        setIsOngoing(true)
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to enroll contacts')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Enroll Contacts</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>
              Select Contacts <span className="text-destructive">*</span>
            </Label>
            <MultiSelectComboboxContacts
              selectedValues={selectedContactIds}
              onValuesChange={setSelectedContactIds}
            />
          </div>

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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ongoing-contacts"
              checked={isOngoing}
              onChange={(e) => {
                setIsOngoing(e.target.checked)
                if (e.target.checked) setEndDate(undefined)
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="ongoing-contacts" className="text-sm font-normal">
              Program is ongoing (no end date)
            </Label>
          </div>

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
              {loading ? 'Enrolling...' : `Enroll ${selectedContactIds.length} ${selectedContactIds.length === 1 ? 'Contact' : 'Contacts'}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
