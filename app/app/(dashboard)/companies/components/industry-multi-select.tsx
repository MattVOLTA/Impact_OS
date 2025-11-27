/**
 * Industry Multi-Select Combobox
 *
 * Searchable multi-select for selecting industries.
 * Adapted from shadcn/ui Combobox pattern for multiple selections.
 */

'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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

interface Industry {
  id: string
  name: string
  description?: string
}

interface IndustryMultiSelectProps {
  industries: Industry[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  placeholder?: string
}

export function IndustryMultiSelect({
  industries,
  selectedIds,
  onChange,
  placeholder = 'Select industries...'
}: IndustryMultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedIndustries = industries.filter(ind => selectedIds.includes(ind.id))

  const toggleIndustry = (industryId: string) => {
    const newSelection = selectedIds.includes(industryId)
      ? selectedIds.filter(id => id !== industryId)
      : [...selectedIds, industryId]

    onChange(newSelection)
  }

  const removeIndustry = (industryId: string) => {
    onChange(selectedIds.filter(id => id !== industryId))
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
            {selectedIndustries.length === 0
              ? placeholder
              : `${selectedIndustries.length} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search industries..." />
            <CommandList>
              <CommandEmpty>No industry found.</CommandEmpty>
              <CommandGroup>
                {industries.map((industry) => (
                  <CommandItem
                    key={industry.id}
                    value={industry.name}
                    onSelect={() => toggleIndustry(industry.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedIds.includes(industry.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span>{industry.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected industries tags */}
      {selectedIndustries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIndustries.map((industry) => (
            <div
              key={industry.id}
              className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm"
            >
              <span>{industry.name}</span>
              <button
                type="button"
                onClick={() => removeIndustry(industry.id)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
