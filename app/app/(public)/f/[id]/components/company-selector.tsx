/**
 * Company Selector Component
 *
 * Allows user to select which company they're submitting for
 * Shows companies from the form's tenant only
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Building2 } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface CompanySelectorProps {
  tenantId: string
  onCompanySelect: (companyId: string) => void
}

interface Company {
  id: string
  business_name: string
  description?: string
}

export function CompanySelector({ tenantId, onCompanySelect }: CompanySelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)

  useEffect(() => {
    // Fetch companies for this tenant
    const fetchCompanies = async () => {
      try {
        const response = await fetch(`/api/companies/public?tenantId=${tenantId}`)
        const result = await response.json()

        if (result.success) {
          setCompanies(result.data)
        }
      } catch (error) {
        console.error('Failed to load companies:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCompanies()
  }, [tenantId])

  const handleContinue = () => {
    if (selectedCompany) {
      onCompanySelect(selectedCompany.id)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="border rounded-lg p-8 bg-card">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Select Your Company</h2>
          <p className="text-muted-foreground">
            Choose the company you're submitting this update for
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Company</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedCompany ? selectedCompany.business_name : 'Select company...'}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search companies..." />
                  <CommandList>
                    <CommandEmpty>
                      {loading ? 'Loading companies...' : 'No companies found.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {companies.map((company) => (
                        <CommandItem
                          key={company.id}
                          value={company.business_name}
                          onSelect={() => {
                            setSelectedCompany(company)
                            setOpen(false)
                          }}
                        >
                          {company.business_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!selectedCompany}
            size="lg"
            className="w-full"
          >
            Continue to Form
          </Button>
        </div>
      </div>
    </div>
  )
}
