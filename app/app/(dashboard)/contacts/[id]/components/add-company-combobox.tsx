/**
 * Add Company Combobox
 *
 * Searchable combobox for linking contacts to companies.
 * As user types, searches existing companies (300ms debounce).
 * Shows matches with name, city/province for context.
 * User can select company to link.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { searchCompaniesAction, linkContactAction } from '../../actions'
import { type CompanyWithIndustries } from '@/lib/dal/companies'

interface AddCompanyComboboxProps {
  contactId: string
  onCompanyAdded?: () => void
}

export function AddCompanyCombobox({ contactId, onCompanyAdded }: AddCompanyComboboxProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CompanyWithIndustries[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [linkingCompanyId, setLinkingCompanyId] = useState<string | null>(null)

  // Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true)
        const result = await searchCompaniesAction(searchQuery)
        if (result.success) {
          setSearchResults(result.companies || [])
        }
        setIsSearching(false)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSelectCompany = async (companyId: string) => {
    setLinkingCompanyId(companyId)

    try {
      const result = await linkContactAction(contactId, companyId)

      if (!result.success) {
        alert('error' in result ? result.error : 'Failed to link company')
        return
      }

      // Success
      setOpen(false)
      setSearchQuery('')
      setSearchResults([])

      if (onCompanyAdded) {
        onCompanyAdded()
      } else {
        router.refresh()
      }
    } catch (err) {
      alert('Failed to link company')
    } finally {
      setLinkingCompanyId(null)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Company
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Company</DialogTitle>
            <DialogDescription>
              Search for companies to link to this contact
            </DialogDescription>
          </DialogHeader>

          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by company name..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {isSearching
                  ? 'Searching...'
                  : searchQuery.length < 2
                  ? 'Type at least 2 characters to search'
                  : 'No companies found'}
              </CommandEmpty>

              {/* Existing Companies */}
              {searchResults.length > 0 && (
                <CommandGroup heading="Companies">
                  {searchResults.map((company) => (
                    <CommandItem
                      key={company.id}
                      value={company.id}
                      onSelect={() => handleSelectCompany(company.id)}
                      disabled={linkingCompanyId === company.id}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          linkingCompanyId === company.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">
                          {company.business_name}
                        </div>
                        {(company.city || company.province) && (
                          <div className="text-xs text-muted-foreground">
                            {[company.city, company.province].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
