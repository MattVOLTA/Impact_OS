/**
 * Company Header Card
 *
 * Horizontal header showing company logo, name, website, location, and industries.
 * Matches reference design with compact, professional layout.
 */

'use client'

import { MapPin, Calendar, Globe, MoreVertical, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { type CompanyWithIndustries } from '@/lib/dal/companies'
import { CompanyActionsMenu } from './company-actions-menu'
import { CompanyLogoUpload } from './company-logo-upload'

interface CompanyHeaderCardProps {
  company: CompanyWithIndustries
  industries: Array<{ id: string; name: string; description?: string }>
}

export function CompanyHeaderCard({ company, industries }: CompanyHeaderCardProps) {
  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-4">
          {/* Logo/Avatar with Upload */}
          <CompanyLogoUpload company={company} />

          {/* Company Name, Website, and Details */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header Row - Name and Actions */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Name and Website */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold">{company.business_name}</h1>
                    {company.description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p className="text-sm">{company.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  {company.website_url && (
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-blue-600"
                    >
                      <Globe className="h-4 w-4" />
                      <span className="hover:underline">{company.website_url}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Actions Menu - Aligned with Name */}
              <div className="flex-shrink-0">
                <CompanyActionsMenu company={company} industries={industries} />
              </div>
            </div>

            {/* Company Details - Grouped Layout */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {/* Location Group */}
              {(company.address || company.city || company.province || company.postal_code) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    {company.address && <div>{company.address}</div>}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {company.city && <span>{company.city}</span>}
                      {company.city && company.province && <span>•</span>}
                      {company.province && <span>{company.province}</span>}
                      {(company.city || company.province) && company.postal_code && <span>•</span>}
                      {company.postal_code && <span>{company.postal_code}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Established Date */}
              {company.date_established && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">Established</div>
                    <div className="mt-0.5">
                      {new Date(company.date_established).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Industries */}
              {company.industries && company.industries.length > 0 && (
                <div className="flex-1 min-w-[200px]">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Industries</div>
                  <div className="flex flex-wrap gap-1">
                    {company.industries.map((industry) => (
                      <Badge key={industry.id} variant="secondary" className="text-xs px-2 py-0.5">
                        {industry.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Information Row (if present) */}
            {(company.email || company.phone || company.business_number) && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm pt-2 border-t">
                {company.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Email:</span>
                    <a href={`mailto:${company.email}`} className="text-blue-600 hover:underline">
                      {company.email}
                    </a>
                  </div>
                )}

                {company.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Phone:</span>
                    <span>{company.phone}</span>
                  </div>
                )}

                {company.business_number && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Business #:</span>
                    <span className="font-mono text-xs">{company.business_number}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
