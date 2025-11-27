/**
 * Enroll Companies Modal
 *
 * Allows bulk enrollment of companies with shared dates.
 * Supports both cohort-based (with end date) and continuous intake (no end date).
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { MultiSelectCombobox } from './multi-select-combobox-companies'
import { bulkEnrollCompaniesAction } from '../../actions'

interface EnrollCompaniesModalProps {
  programId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EnrollCompaniesModal({
  programId,
  open,
  onOpenChange
}: EnrollCompaniesModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isOngoing, setIsOngoing] = useState(true) // Default to ongoing

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedCompanyIds.length === 0) {
      setError('Please select at least one company')
      return
    }

    if (!startDate) {
      setError('Please select a start date')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await bulkEnrollCompaniesAction(
        programId,
        selectedCompanyIds,
        startDate.toISOString().split('T')[0],
        isOngoing ? null : endDate?.toISOString().split('T')[0]
      )

      if (result.success) {
        // Reset form
        setSelectedCompanyIds([])
        setStartDate(undefined)
        setEndDate(undefined)
        setIsOngoing(true)
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to enroll companies')
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
          <DialogTitle>Enroll Companies</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Company Selection */}
          <div className="space-y-2">
            <Label>
              Select Companies <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              For cohort-based programs, select all companies. For continuous intake, add them individually.
            </p>
            <MultiSelectCombobox
              selectedValues={selectedCompanyIds}
              onValuesChange={setSelectedCompanyIds}
            />
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
              id="ongoing"
              checked={isOngoing}
              onChange={(e) => {
                setIsOngoing(e.target.checked)
                if (e.target.checked) {
                  setEndDate(undefined)
                }
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="ongoing" className="text-sm font-normal">
              Program is ongoing (no end date)
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
              {loading ? 'Enrolling...' : `Enroll ${selectedCompanyIds.length} ${selectedCompanyIds.length === 1 ? 'Company' : 'Companies'}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
