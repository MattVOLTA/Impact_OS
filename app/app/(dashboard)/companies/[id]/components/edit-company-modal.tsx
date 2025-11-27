/**
 * Edit Company Modal
 *
 * Client Component - Full company edit form matching reference design.
 * Includes: name, type, description, website, city, province, date, industries
 */

'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles } from 'lucide-react'
import { type CompanyWithIndustries } from '@/lib/dal/companies'
import { updateCompanyAction } from '../actions'
import { companyTypeEnum, canadianProvinceEnum, type CompanyType, type CanadianProvince } from '@/lib/schemas/company'
import { IndustryMultiSelect } from '../../components/industry-multi-select'

interface EditCompanyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: CompanyWithIndustries
  industries: Array<{ id: string; name: string; description?: string }>
}

export function EditCompanyModal({ open, onOpenChange, company, industries }: EditCompanyModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [businessName, setBusinessName] = useState(company.business_name)
  const [companyType, setCompanyType] = useState<string>(company.company_type || '')
  const [description, setDescription] = useState(company.description || '')
  const [city, setCity] = useState(company.city || '')
  const [province, setProvince] = useState<string>(company.province || '')
  const [websiteUrl, setWebsiteUrl] = useState(company.website_url || '')
  const [dateEstablished, setDateEstablished] = useState(company.date_established || '')
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<string[]>(
    company.industries?.map(i => i.id) || []
  )

  // Reset form when company changes
  useEffect(() => {
    setBusinessName(company.business_name)
    setCompanyType(company.company_type || '')
    setDescription(company.description || '')
    setCity(company.city || '')
    setProvince(company.province || '')
    setWebsiteUrl(company.website_url || '')
    setDateEstablished(company.date_established || '')
    setSelectedIndustryIds(company.industries?.map(i => i.id) || [])
  }, [company])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await updateCompanyAction(company.id, {
        business_name: businessName,
        company_type: companyType as CompanyType,
        description: description || undefined,
        city: city || undefined,
        province: province as CanadianProvince | undefined,
        website_url: websiteUrl || undefined,
        date_established: dateEstablished || undefined,
        industry_ids: selectedIndustryIds,
      })

      if (result.success) {
        onOpenChange(false)
        window.location.reload()
      } else {
        setError('error' in result ? result.error || 'Failed to update' : 'Failed to update')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Company Details</DialogTitle>
          <DialogDescription>Update company information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name</Label>
            <Input
              id="business_name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
            />
          </div>

          {/* Company Type */}
          <div className="space-y-2">
            <Label htmlFor="company_type">Company Type</Label>
            <Select value={companyType} onValueChange={setCompanyType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select company type" />
              </SelectTrigger>
              <SelectContent>
                {companyTypeEnum.options.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description with Generate button */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                title="AI generation coming soon"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Generate Description
              </Button>
            </div>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Brief description of the company..."
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website_url">Website</Label>
            <Input
              id="website_url"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* City and Province */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Province/Territory</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {canadianProvinceEnum.options.map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Established */}
          <div className="space-y-2">
            <Label htmlFor="date_established">Date Established</Label>
            <Input
              id="date_established"
              type="date"
              value={dateEstablished}
              onChange={(e) => setDateEstablished(e.target.value)}
            />
          </div>

          {/* Industries */}
          <div className="space-y-2">
            <Label>Industries</Label>
            <IndustryMultiSelect
              industries={industries}
              selectedIds={selectedIndustryIds}
              onChange={setSelectedIndustryIds}
            />
          </div>

          {error && (
            <div className="text-sm text-red-500">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
