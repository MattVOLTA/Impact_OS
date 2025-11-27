/**
 * Associated Companies Section
 *
 * Displays companies linked to this interaction.
 * Matches the pattern from contacts and companies detail pages.
 */

import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type InteractionWithRelations } from '@/lib/dal/interactions'

interface AssociatedCompaniesSectionProps {
  interaction: InteractionWithRelations
}

export function AssociatedCompaniesSection({ interaction }: AssociatedCompaniesSectionProps) {
  const companies = interaction.companies || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Companies</CardTitle>
        <CardDescription>Associated portfolio companies</CardDescription>
      </CardHeader>
      <CardContent>
        {companies.length > 0 ? (
          <ul className="space-y-2">
            {companies.map((company) => (
              <li key={company.id}>
                <Link
                  href={`/companies/${company.id}`}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="hover:underline">{company.business_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No companies associated</p>
        )}
      </CardContent>
    </Card>
  )
}
