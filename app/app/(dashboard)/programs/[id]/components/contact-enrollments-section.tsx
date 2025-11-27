/**
 * Contact Enrollments Section
 *
 * Shows enrolled contacts with start/end dates and active/alumni status.
 * Each row is clickable and navigates to the contact details page.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { EnrollContactsModal } from './enroll-contacts-modal'
import type { ContactEnrollment } from '@/lib/dal/programs'

interface ContactEnrollmentsSectionProps {
  programId: string
  enrollments: ContactEnrollment[]
}

export function ContactEnrollmentsSection({
  programId,
  enrollments
}: ContactEnrollmentsSectionProps) {
  const [enrollModalOpen, setEnrollModalOpen] = useState(false)

  // Determine if contact is active
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
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Contacts ({enrollments.length})</CardTitle>
            </div>
            <Button
              size="sm"
              onClick={() => setEnrollModalOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Enroll Contacts
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No contacts enrolled yet.
              <br />
              Click "Enroll Contacts" to add participants.
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map((enrollment) => (
                <Link
                  key={enrollment.contact_id}
                  href={`/contacts/${enrollment.contact_id}`}
                  className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {enrollment.contact?.first_name} {enrollment.contact?.last_name}
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

      <EnrollContactsModal
        programId={programId}
        open={enrollModalOpen}
        onOpenChange={setEnrollModalOpen}
      />
    </>
  )
}
