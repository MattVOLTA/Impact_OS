/**
 * Contacts Section
 *
 * Displays contacts linked to this company.
 * Allows adding new contacts via combobox with duplicate detection.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { getContactsForCompany } from '@/lib/dal/contacts'
import { AddContactCombobox } from '@/app/(dashboard)/contacts/components/add-contact-combobox'
import { ContactCard } from './contact-card'

interface ContactsSectionProps {
  companyId: string
}

export async function ContactsSection({ companyId }: ContactsSectionProps) {
  // Fetch contacts for this company
  const contacts = await getContactsForCompany(companyId)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>
              {contacts.length === 0
                ? 'No contacts yet'
                : `${contacts.length} contact${contacts.length === 1 ? '' : 's'}`}
            </CardDescription>
          </div>
          <AddContactCombobox companyId={companyId} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* Contact List */}
        {contacts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No contacts yet.</p>
            <p className="text-xs mt-1">Use the search above to add contacts.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} companyId={companyId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
