/**
 * Associated Companies Section
 *
 * Shows companies this contact is linked to.
 * Same pattern as contacts on company page (reversed).
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { type ContactWithCompanies } from '@/lib/dal/contacts'
import { CompanyCard } from './company-card'
import { AddCompanyCombobox } from './add-company-combobox'

interface AssociatedCompaniesSectionProps {
  contact: ContactWithCompanies
}

export function AssociatedCompaniesSection({ contact }: AssociatedCompaniesSectionProps) {
  const companies = contact.companies || []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Associated Companies</CardTitle>
            <CardDescription>
              {companies.length === 0
                ? 'Not associated with any companies'
                : `${companies.length} ${companies.length === 1 ? 'company' : 'companies'}`}
            </CardDescription>
          </div>
          <AddCompanyCombobox contactId={contact.id} />
        </div>
      </CardHeader>
      <CardContent>
        {companies.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Not linked to any companies yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} contactId={contact.id} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
