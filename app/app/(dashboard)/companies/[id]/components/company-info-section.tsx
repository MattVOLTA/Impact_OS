/**
 * Company Info Section
 *
 * Displays company information with edit/delete controls.
 * Shows all company fields in a card layout.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type CompanyWithIndustries } from '@/lib/dal/companies'
import { EditCompanyButton } from './edit-company-button'
import { DeleteCompanyButton } from './delete-company-button'

interface CompanyInfoSectionProps {
  company: CompanyWithIndustries
  industries: Array<{ id: string; name: string; description?: string }>
}

export function CompanyInfoSection({ company, industries }: CompanyInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Basic details and contact information</CardDescription>
          </div>
          <div className="flex gap-2">
            <EditCompanyButton company={company} industries={industries} />
            <DeleteCompanyButton companyId={company.id} companyName={company.business_name} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Description */}
        {company.description && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">{company.description}</p>
          </div>
        )}

        {/* Company Details Grid - Compact Layout */}
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          {company.city && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">City</dt>
              <dd className="mt-0.5">{company.city}</dd>
            </div>
          )}

          {company.province && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Province</dt>
              <dd className="mt-0.5">{company.province}</dd>
            </div>
          )}

          {company.date_established && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Established</dt>
              <dd className="mt-0.5">{new Date(company.date_established).toLocaleDateString()}</dd>
            </div>
          )}

          {company.website_url && (
            <div className="col-span-2 md:col-span-3">
              <dt className="text-xs font-medium text-muted-foreground">Website</dt>
              <dd className="mt-0.5">
                <a
                  href={company.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {company.website_url}
                </a>
              </dd>
            </div>
          )}

          {company.email && (
            <div className="col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">Email</dt>
              <dd className="mt-0.5">
                <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
                  {company.email}
                </a>
              </dd>
            </div>
          )}

          {company.phone && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Phone</dt>
              <dd className="mt-0.5">{company.phone}</dd>
            </div>
          )}

          {company.postal_code && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">Postal Code</dt>
              <dd className="mt-0.5">{company.postal_code}</dd>
            </div>
          )}

          {company.business_number && (
            <div className="col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">Business Number</dt>
              <dd className="mt-0.5">{company.business_number}</dd>
            </div>
          )}

          {company.address && (
            <div className="col-span-2 md:col-span-3">
              <dt className="text-xs font-medium text-muted-foreground">Address</dt>
              <dd className="mt-0.5">{company.address}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  )
}
