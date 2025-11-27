/**
 * Multi-Select Combobox
 *
 * Reusable searchable multi-select component for contacts and companies.
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
  CommandItem
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'

interface Option {
  id: string
  label: string
  email?: string
  companies?: string
}

interface MultiSelectComboboxProps {
  placeholder?: string
  selectedValues: string[]
  onValuesChange: (values: string[]) => void
  searchFunction: (query: string) => Promise<Option[]>
}

export function MultiSelectCombobox({
  placeholder = 'Search...',
  selectedValues,
  onValuesChange,
  searchFunction
}: MultiSelectComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [options, setOptions] = useState<Option[]>([])
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Search for options when query changes
  useEffect(() => {
    const searchOptions = async () => {
      if (searchQuery.length === 0) {
        setOptions([])
        return
      }

      setIsLoading(true)
      try {
        const results = await searchFunction(searchQuery)
        setOptions(results)
      } catch (error) {
        console.error('Search failed:', error)
        setOptions([])
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(searchOptions, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, searchFunction])

  // Fetch full details for selected IDs on mount
  useEffect(() => {
    const fetchSelectedOptions = async () => {
      if (selectedValues.length === 0) {
        setSelectedOptions([])
        return
      }

      try {
        // Use search function with empty query to get all options
        // Then filter to selected IDs
        // Note: This is a workaround - ideally we'd have a getByIds function
        const allOptions = await searchFunction('')
        const selected = allOptions.filter(opt => selectedValues.includes(opt.id))
        setSelectedOptions(selected)
      } catch (error) {
        console.error('Failed to fetch selected options:', error)
      }
    }

    fetchSelectedOptions()
  }, [selectedValues, searchFunction])

  const handleSelect = (option: Option) => {
    const isSelected = selectedValues.includes(option.id)

    if (isSelected) {
      // Remove from selection
      onValuesChange(selectedValues.filter(id => id !== option.id))
      setSelectedOptions(selectedOptions.filter(opt => opt.id !== option.id))
    } else {
      // Add to selection
      onValuesChange([...selectedValues, option.id])
      setSelectedOptions([...selectedOptions, option])
    }
  }

  const handleRemove = (optionId: string) => {
    onValuesChange(selectedValues.filter(id => id !== optionId))
    setSelectedOptions(selectedOptions.filter(opt => opt.id !== optionId))
  }

  return (
    <div className="space-y-2">
      {/* Selected Items */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map(option => (
            <Badge key={option.id} variant="secondary" className="gap-1">
              <span>{option.label}</span>
              <button
                type="button"
                onClick={() => handleRemove(option.id)}
                className="ml-1 rounded-full hover:bg-secondary-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
          <Command shouldFilter={false} className="w-full">
            <CommandInput
              placeholder={placeholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandEmpty>
              {isLoading ? 'Searching...' : searchQuery.length === 0 ? 'Type to search' : 'No results found'}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              {options.map(option => {
                const isSelected = selectedValues.includes(option.id)
                return (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span>{option.label}</span>
                      {option.email && (
                        <span className="text-xs text-muted-foreground">
                          {option.email}
                        </span>
                      )}
                      {option.companies && (
                        <span className="text-xs text-muted-foreground">
                          {option.companies}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
