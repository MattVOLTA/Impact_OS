/**
 * Add Contact Combobox (Standalone)
 *
 * Version for Contacts page - no company auto-linking.
 * Shows duplicate detection but creates standalone contact.
 */

'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { searchContactsAction } from '../actions'
import { CreateContactModal } from './create-contact-modal'
import { type ContactWithCompanies } from '@/lib/dal/contacts'

interface AddContactComboboxStandaloneProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddContactComboboxStandalone({ open, onOpenChange }: AddContactComboboxStandaloneProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ContactWithCompanies[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true)
        const result = await searchContactsAction(searchQuery)
        if (result.success) {
          setSearchResults(result.contacts || [])
        }
        setIsSearching(false)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleCreateNew = () => {
    onOpenChange(false)
    setCreateModalOpen(true)
    // searchQuery will be passed to modal
  }

  const handleClose = () => {
    onOpenChange(false)
    setSearchQuery('')
    setSearchResults([])
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Search for existing contacts or create new
            </DialogDescription>
          </DialogHeader>

          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {isSearching
                  ? 'Searching...'
                  : searchQuery.length < 2
                  ? 'Type at least 2 characters to search'
                  : 'No existing contacts found'}
              </CommandEmpty>

              {/* Existing Contacts - Show as warning */}
              {searchResults.length > 0 && (
                <CommandGroup heading="Existing Contacts (already in system)">
                  {searchResults.map((contact) => (
                    <CommandItem key={contact.id} disabled className="opacity-60">
                      <Check className="mr-2 h-4 w-4 opacity-0" />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </div>
                        {contact.email && (
                          <div className="text-xs text-muted-foreground">{contact.email}</div>
                        )}
                        {contact.companies && contact.companies.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {contact.companies.map((c) => c.business_name).join(', ')}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Create New */}
              <CommandGroup>
                <CommandItem onSelect={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  <div>
                    <div className="font-medium">Create new contact</div>
                    {searchQuery && searchResults.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Create anyway (different person)
                      </div>
                    )}
                  </div>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Create Contact Modal */}
      <CreateContactModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        initialName={searchQuery}
      />
    </>
  )
}
