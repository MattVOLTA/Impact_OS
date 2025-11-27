/**
 * Multi-Select Combobox for Contacts
 *
 * Similar to companies version but for contacts.
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
import { searchContactsForEnrollment } from '../../actions'

interface MultiSelectComboboxContactsProps {
  selectedValues: string[]
  onValuesChange: (values: string[]) => void
}

export function MultiSelectComboboxContacts({
  selectedValues,
  onValuesChange
}: MultiSelectComboboxContactsProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string; last_name: string }>>([])
  const [selectedContacts, setSelectedContacts] = useState<Array<{ id: string; first_name: string; last_name: string }>>([])

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const result = await searchContactsForEnrollment(searchQuery)
        if (result.success && result.data) {
          setContacts(result.data)
        }
      } catch (error) {
        console.error('Failed to load contacts:', error)
      }
    }

    const debounce = setTimeout(loadContacts, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  useEffect(() => {
    const loadSelected = async () => {
      if (selectedValues.length === 0) {
        setSelectedContacts([])
        return
      }

      const result = await searchContactsForEnrollment('')
      if (result.success && result.data) {
        const selected = result.data.filter(c => selectedValues.includes(c.id))
        setSelectedContacts(selected)
      }
    }

    loadSelected()
  }, [selectedValues])

  const handleSelect = (contact: { id: string; first_name: string; last_name: string }) => {
    if (selectedValues.includes(contact.id)) {
      onValuesChange(selectedValues.filter(id => id !== contact.id))
    } else {
      onValuesChange([...selectedValues, contact.id])
    }
  }

  const handleRemove = (contactId: string) => {
    onValuesChange(selectedValues.filter(id => id !== contactId))
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
                ? 'Search for contacts...'
                : `${selectedValues.length} ${selectedValues.length === 1 ? 'contact' : 'contacts'} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search contacts..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {searchQuery ? 'No contacts found.' : 'Start typing to search...'}
              </CommandEmpty>
              <CommandGroup>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.id}
                    onSelect={() => handleSelect(contact)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedValues.includes(contact.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {contact.first_name} {contact.last_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedContacts.map((contact) => (
            <Badge key={contact.id} variant="secondary" className="gap-1">
              {contact.first_name} {contact.last_name}
              <button
                type="button"
                onClick={() => handleRemove(contact.id)}
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
