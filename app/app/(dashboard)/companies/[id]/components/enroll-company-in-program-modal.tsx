/**
 * Enroll Company in Program Modal
 *
 * Allows enrolling a single company in a program with dates.
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
import { enrollCompanyAction, getAllProgramsAction, getContactsByCompanyAction } from '../../../programs/actions'

interface EnrollCompanyInProgramModalProps {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EnrollCompanyInProgramModal({
  companyId,
  open,
  onOpenChange
}: EnrollCompanyInProgramModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [programs, setPrograms] = useState<Array<{ id: string; name: string }>>([])
  const [associatedContacts, setAssociatedContacts] = useState<Array<{ id: string; first_name: string; last_name: string; role?: string }>>([])

  // Form state
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isOngoing, setIsOngoing] = useState(true)
  const [enrollContacts, setEnrollContacts] = useState(true) // Checked by default
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])

  // Load programs and contacts when modal opens
  useEffect(() => {
    if (open) {
      loadPrograms()
      loadAssociatedContacts()
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

  const loadAssociatedContacts = async () => {
    try {
      const result = await getContactsByCompanyAction(companyId)
      if (result.success && result.data) {
        setAssociatedContacts(result.data)
        // Select all by default
        setSelectedContactIds(result.data.map((c: any) => c.id))
      }
    } catch (err) {
      console.error('Failed to load contacts:', err)
    }
  }

  const toggleContact = (contactId: string) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
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
      const result = await enrollCompanyAction(
        selectedProgramId,
        companyId,
        startDate.toISOString().split('T')[0],
        isOngoing ? null : endDate?.toISOString().split('T')[0],
        enrollContacts ? selectedContactIds : undefined // Pass selected contacts
      )

      if (result.success) {
        // Reset form
        setSelectedProgramId('')
        setStartDate(undefined)
        setEndDate(undefined)
        setIsOngoing(true)
        setEnrollContacts(true)
        setSelectedContactIds([])
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to enroll company')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Calculate total entities being enrolled
  const totalEnrolling = 1 + (enrollContacts ? selectedContactIds.length : 0)
  const buttonText = loading
    ? 'Enrolling...'
    : totalEnrolling === 1
    ? 'Enroll Company'
    : `Enroll Company + ${selectedContactIds.length} Contact${selectedContactIds.length === 1 ? '' : 's'}`

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
              id="ongoing-company"
              checked={isOngoing}
              onChange={(e) => {
                setIsOngoing(e.target.checked)
                if (e.target.checked) {
                  setEndDate(undefined)
                }
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="ongoing-company" className="text-sm font-normal">
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

          {/* Associated Contacts (if any) */}
          {associatedContacts.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enroll-contacts"
                  checked={enrollContacts}
                  onChange={(e) => {
                    setEnrollContacts(e.target.checked)
                    if (!e.target.checked) {
                      setSelectedContactIds([])
                    } else {
                      // Re-select all
                      setSelectedContactIds(associatedContacts.map(c => c.id))
                    }
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="enroll-contacts" className="text-sm font-medium">
                  Also enroll associated contacts with same dates
                </Label>
              </div>

              {enrollContacts && (
                <div className="ml-6 space-y-2 max-h-32 overflow-y-auto">
                  {associatedContacts.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`contact-${contact.id}`}
                        checked={selectedContactIds.includes(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`contact-${contact.id}`} className="text-sm font-normal">
                        {contact.first_name} {contact.last_name}
                        {contact.role && (
                          <span className="text-muted-foreground ml-2">({contact.role})</span>
                        )}
                      </Label>
                    </div>
                  ))}
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
