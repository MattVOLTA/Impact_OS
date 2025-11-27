/**
 * Contact Header Card
 *
 * Full-width header showing contact photo, name, title, and contact info.
 * Matches reference design from user screenshot.
 */

'use client'

import { Mail, Phone, Linkedin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { type ContactWithCompanies } from '@/lib/dal/contacts'
import { ContactPhotoUpload } from './contact-photo-upload'
import { ContactActionsMenu } from './contact-actions-menu'

interface ContactHeaderCardProps {
  contact: ContactWithCompanies
}

export function ContactHeaderCard({ contact }: ContactHeaderCardProps) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-4">
          {/* Photo with Upload */}
          <ContactPhotoUpload contact={contact} />

          {/* Contact Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header Row - Name and Actions */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold">
                  {contact.first_name} {contact.last_name}
                </h1>
                {contact.role && (
                  <p className="text-sm text-muted-foreground mt-1">{contact.role}</p>
                )}
              </div>

              {/* Actions Menu */}
              <div className="flex-shrink-0">
                <ContactActionsMenu contact={contact} />
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-1">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-600"
                >
                  <Mail className="h-4 w-4" />
                  <span className="hover:underline">{contact.email}</span>
                </a>
              )}

              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-600"
                >
                  <Phone className="h-4 w-4" />
                  <span className="hover:underline">{contact.phone}</span>
                </a>
              )}

              {contact.linkedin_url && (
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-blue-600"
                >
                  <Linkedin className="h-4 w-4" />
                  <span className="hover:underline">LinkedIn Profile</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
