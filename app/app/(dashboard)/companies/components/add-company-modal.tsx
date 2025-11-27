/**
 * Add Company Modal
 *
 * Client Component with form for creating companies.
 * Uses Server Actions for mutation.
 */

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IndustryMultiSelect } from './industry-multi-select'
import { createCompanyAction } from '../actions'
import { canadianProvinceEnum, companyTypeEnum } from '@/lib/schemas/company'

interface AddCompanyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  industries: Array<{ id: string; name: string; description?: string }>
}

export function AddCompanyModal({ open, onOpenChange, industries }: AddCompanyModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [businessName, setBusinessName] = useState('')
  const [companyType, setCompanyType] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('business_name', businessName)
      formData.append('company_type', companyType)
      formData.append('city', city)
      formData.append('province', province)
      if (websiteUrl) formData.append('website_url', websiteUrl)
      selectedIndustryIds.forEach(id => formData.append('industry_ids', id))

      const result = await createCompanyAction(formData)

      if (result.success) {
        // Reset form
        setBusinessName('')
        setCompanyType('')
        setCity('')
        setProvince('')
        setWebsiteUrl('')
        setSelectedIndustryIds([])
        onOpenChange(false)
      } else {
        setError(result.error || 'Failed to create company')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Company</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="business_name">
              Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="business_name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Enter company name"
              required
            />
          </div>

          {/* Company Type */}
          <div className="space-y-2">
            <Label htmlFor="company_type">
              Company Type <span className="text-destructive">*</span>
            </Label>
            <Select value={companyType} onValueChange={setCompanyType} required>
              <SelectTrigger id="company_type">
                <SelectValue placeholder="Select type" />
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

          {/* Industry Multi-Select */}
          <div className="space-y-2">
            <Label>Industry (optional)</Label>
            <IndustryMultiSelect
              industries={industries}
              selectedIds={selectedIndustryIds}
              onChange={setSelectedIndustryIds}
              placeholder="Select industries..."
            />
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">
              City <span className="text-destructive">*</span>
            </Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city"
              required
            />
          </div>

          {/* Province */}
          <div className="space-y-2">
            <Label htmlFor="province">
              Province <span className="text-destructive">*</span>
            </Label>
            <Select value={province} onValueChange={setProvince} required>
              <SelectTrigger id="province">
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

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="website_url">Website (optional)</Label>
            <Input
              id="website_url"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Company'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
