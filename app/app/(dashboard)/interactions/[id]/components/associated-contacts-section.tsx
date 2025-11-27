/**
 * Associated Contacts Section
 *
 * Displays contacts linked to this interaction.
 */

import Link from 'next/link'
import { User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type InteractionWithRelations } from '@/lib/dal/interactions'

interface AssociatedContactsSectionProps {
  interaction: InteractionWithRelations
}

export function AssociatedContactsSection({ interaction }: AssociatedContactsSectionProps) {
  const contacts = interaction.contacts || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
        <CardDescription>People involved in this interaction</CardDescription>
      </CardHeader>
      <CardContent>
        {contacts.length > 0 ? (
          <ul className="space-y-3">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="flex items-start gap-2 text-sm hover:text-primary"
                >
                  <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="hover:underline">
                      {contact.first_name} {contact.last_name}
                    </span>
                    {contact.email && (
                      <div className="text-xs text-muted-foreground mt-0.5">{contact.email}</div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No contacts associated</p>
        )}
      </CardContent>
    </Card>
  )
}
