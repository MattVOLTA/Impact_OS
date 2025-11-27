/**
 * Programs Section - Company Detail
 *
 * Shows programs this company is enrolled in.
 * Follows same pattern as ContactsSection and InteractionsSection.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, Plus, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { format } from 'date-fns'
import { EnrollCompanyInProgramModal } from './enroll-company-in-program-modal'
import { EditEnrollmentDatesModal } from './edit-enrollment-dates-modal'
import { unenrollCompanyAction } from '../../../programs/actions'
import { useRouter } from 'next/navigation'

interface ProgramEnrollment {
  program_id: string
  company_id: string
  start_date: string
  end_date: string | null
  created_at: string
  program: {
    id: string
    name: string
    description: string | null
  }
}

interface ProgramsSectionProps {
  companyId: string
  enrollments: ProgramEnrollment[]
}

export function ProgramsSection({ companyId, enrollments }: ProgramsSectionProps) {
  const router = useRouter()
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [unenrollDialogOpen, setUnenrollDialogOpen] = useState(false)
  const [selectedEnrollment, setSelectedEnrollment] = useState<ProgramEnrollment | null>(null)

  const isActive = (endDate: string | null) => {
    if (!endDate) return true
    return new Date(endDate) >= new Date()
  }

  const handleUnenrollClick = (enrollment: ProgramEnrollment) => {
    setSelectedEnrollment(enrollment)
    setUnenrollDialogOpen(true)
  }

  const handleUnenrollConfirm = async () => {
    if (!selectedEnrollment) return

    const result = await unenrollCompanyAction(selectedEnrollment.program_id, companyId)
    if (result.success) {
      setUnenrollDialogOpen(false)
      router.refresh()
    }
  }

  const handleEditDates = (enrollment: ProgramEnrollment) => {
    setSelectedEnrollment(enrollment)
    setEditModalOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Programs ({enrollments.length})</CardTitle>
            </div>
            <Button size="sm" onClick={() => setEnrollModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Enroll
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No program enrollments yet.
              <br />
              Click "Enroll" to add this company to a program.
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.program_id}
                  className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <Link
                      href={`/programs/${enrollment.program_id}`}
                      className="font-medium hover:underline"
                    >
                      {enrollment.program.name}
                    </Link>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(enrollment.start_date), 'MMM d, yyyy')}
                      </span>
                      <span>→</span>
                      {enrollment.end_date ? (
                        <span>
                          {format(new Date(enrollment.end_date), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">
                          Ongoing
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isActive(enrollment.end_date) ? 'default' : 'secondary'}>
                      {isActive(enrollment.end_date) ? 'Active' : 'Alumni'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditDates(enrollment)}>
                          Edit Dates
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleUnenrollClick(enrollment)}
                          className="text-destructive"
                        >
                          Unenroll
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EnrollCompanyInProgramModal
        companyId={companyId}
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
      />

      {selectedEnrollment && (
        <>
          <EditEnrollmentDatesModal
            type="company"
            entityId={companyId}
            programId={selectedEnrollment.program_id}
            programName={selectedEnrollment.program.name}
            currentStartDate={selectedEnrollment.start_date}
            currentEndDate={selectedEnrollment.end_date}
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
          />

          <AlertDialog open={unenrollDialogOpen} onOpenChange={setUnenrollDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unenroll from Program?</AlertDialogTitle>
                <AlertDialogDescription>
                  Remove this company from <span className="font-semibold">{selectedEnrollment.program.name}</span>?
                  <br /><br />
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleUnenrollConfirm}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Unenroll
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  )
}
