/**
 * Bio Section
 *
 * Displays contact biography/background text.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type Contact } from '@/lib/dal/contacts'

interface BioSectionProps {
  contact: Contact
}

export function BioSection({ contact }: BioSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bio</CardTitle>
        <CardDescription>Background and notes</CardDescription>
      </CardHeader>
      <CardContent>
        {contact.bio ? (
          <p className="text-sm whitespace-pre-wrap">{contact.bio}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No bio added yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
