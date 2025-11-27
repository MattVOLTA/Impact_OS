/**
 * Multi-Select Combobox for Companies
 *
 * Searchable multi-select for enrolling multiple companies.
 * Fetches companies via server action.
 */

'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { searchCompaniesForEnrollment } from '../../actions'

interface MultiSelectComboboxProps {
  selectedValues: string[]
  onValuesChange: (values: string[]) => void
}

export function MultiSelectCombobox({
  selectedValues,
  onValuesChange
}: MultiSelectComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [companies, setCompanies] = useState<Array<{ id: string; business_name: string }>>([])
  const [selectedCompanies, setSelectedCompanies] = useState<Array<{ id: string; business_name: string }>>([])

  // Load companies when search changes
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const result = await searchCompaniesForEnrollment(searchQuery)
        if (result.success && result.data) {
          setCompanies(result.data)
        }
      } catch (error) {
        console.error('Failed to load companies:', error)
      }
    }

    const debounce = setTimeout(loadCompanies, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  // Update selected companies when IDs change
  useEffect(() => {
    const loadSelected = async () => {
      if (selectedValues.length === 0) {
        setSelectedCompanies([])
        return
      }

      const result = await searchCompaniesForEnrollment('')
      if (result.success && result.data) {
        const selected = result.data.filter(c => selectedValues.includes(c.id))
        setSelectedCompanies(selected)
      }
    }

    loadSelected()
  }, [selectedValues])

  const handleSelect = (company: { id: string; business_name: string }) => {
    if (selectedValues.includes(company.id)) {
      // Remove
      onValuesChange(selectedValues.filter(id => id !== company.id))
    } else {
      // Add
      onValuesChange([...selectedValues, company.id])
    }
  }

  const handleRemove = (companyId: string) => {
    onValuesChange(selectedValues.filter(id => id !== companyId))
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">
              {selectedValues.length === 0
                ? 'Search for companies...'
                : `${selectedValues.length} ${selectedValues.length === 1 ? 'company' : 'companies'} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search companies..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {searchQuery ? 'No companies found.' : 'Start typing to search...'}
              </CommandEmpty>
              <CommandGroup>
                {companies.map((company) => (
                  <CommandItem
                    key={company.id}
                    value={company.id}
                    onSelect={() => handleSelect(company)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedValues.includes(company.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {company.business_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected companies */}
      {selectedCompanies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCompanies.map((company) => (
            <Badge key={company.id} variant="secondary" className="gap-1">
              {company.business_name}
              <button
                type="button"
                onClick={() => handleRemove(company.id)}
                className="ml-1 hover:bg-muted rounded-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
