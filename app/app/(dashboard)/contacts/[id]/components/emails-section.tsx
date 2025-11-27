/**
 * Emails Section Component
 *
 * Displays and manages multiple email addresses for a contact.
 * Allows add/edit/delete operations and setting primary email.
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Star, StarOff, Pencil, Trash2, Plus, CheckCircle2 } from 'lucide-react'
import { type ContactEmail } from '@/lib/dal/contacts'
import { AddEmailModal } from './add-email-modal'
import { EditEmailModal } from './edit-email-modal'
import { DeleteEmailModal } from './delete-email-modal'

interface EmailsSectionProps {
  contactId: string
  emails: ContactEmail[]
}

export function EmailsSection({ contactId, emails }: EmailsSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEmail, setEditingEmail] = useState<ContactEmail | null>(null)
  const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null)

  const sortedEmails = [...emails].sort((a, b) => {
    // Primary emails first
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return 0
  })

  const getEmailTypeBadgeVariant = (type?: string | null) => {
    switch (type) {
      case 'work':
        return 'default'
      case 'personal':
        return 'secondary'
      case 'other':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const getEmailTypeLabel = (type?: string | null) => {
    if (!type) return null
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Emails</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No email addresses added yet</p>
              <p className="text-xs mt-1">Add an email to enable Fireflies integration</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedEmails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Primary Indicator */}
                    <div className="pt-0.5">
                      {email.is_primary ? (
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Email Details */}
                    <div className="flex-1 min-w-0">
                      <a
                        href={`mailto:${email.email}`}
                        className="text-sm font-medium hover:underline block truncate"
                      >
                        {email.email}
                      </a>

                      <div className="flex items-center gap-2 mt-1">
                        {/* Email Type Badge */}
                        {email.email_type && (
                          <Badge variant={getEmailTypeBadgeVariant(email.email_type)} className="text-xs">
                            {getEmailTypeLabel(email.email_type)}
                          </Badge>
                        )}

                        {/* Verified Badge */}
                        {email.is_verified && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}

                        {/* Primary Badge */}
                        {email.is_primary && (
                          <Badge variant="default" className="text-xs">
                            Primary
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!email.is_primary && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingEmail(email)}
                        title="Set as primary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingEmail(email)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingEmailId(email.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddEmailModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        contactId={contactId}
        hasExistingPrimary={emails.some(e => e.is_primary)}
      />

      {editingEmail && (
        <EditEmailModal
          open={!!editingEmail}
          onOpenChange={(open) => !open && setEditingEmail(null)}
          email={editingEmail}
          contactId={contactId}
        />
      )}

      {deletingEmailId && (
        <DeleteEmailModal
          open={!!deletingEmailId}
          onOpenChange={(open) => !open && setDeletingEmailId(null)}
          emailId={deletingEmailId}
          contactId={contactId}
          isPrimary={emails.find(e => e.id === deletingEmailId)?.is_primary || false}
        />
      )}
    </>
  )
}
