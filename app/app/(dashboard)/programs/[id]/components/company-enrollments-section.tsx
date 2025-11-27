/**
 * Company Enrollments Section
 *
 * Shows enrolled companies with start/end dates and active/alumni status.
 * Each row is clickable and navigates to the company details page.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus, Users as UsersIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { EnrollCompaniesModal } from './enroll-companies-modal'
import type { CompanyEnrollment } from '@/lib/dal/programs'

interface CompanyEnrollmentsSectionProps {
  programId: string
  enrollments: CompanyEnrollment[]
}

export function CompanyEnrollmentsSection({
  programId,
  enrollments
}: CompanyEnrollmentsSectionProps) {
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)

  // Determine if company is active (end_date is NULL or in the future)
  const isActive = (endDate: string | null) => {
    if (!endDate) return true
    return new Date(endDate) >= new Date()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Companies ({enrollments.length})</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => setEnrollModalOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Enroll Companies
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No companies enrolled yet.
              <br />
              Click "Enroll Companies" to add participants.
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map((enrollment) => (
                <Link
                  key={enrollment.company_id}
                  href={`/companies/${enrollment.company_id}`}
                  className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {enrollment.company?.business_name || 'Unknown Company'}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>
                        Started: {format(new Date(enrollment.start_date), 'MMM d, yyyy')}
                      </span>
                      {enrollment.end_date && (
                        <span>
                          Ended: {format(new Date(enrollment.end_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge variant={isActive(enrollment.end_date) ? 'default' : 'secondary'}>
                    {isActive(enrollment.end_date) ? 'Active' : 'Alumni'}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EnrollCompaniesModal
        programId={programId}
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
      />
    </>
  )
}
