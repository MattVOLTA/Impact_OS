/**
 * Add Contact Combobox
 *
 * Searchable combobox with duplicate detection.
 * As user types, searches existing contacts (300ms debounce).
 * Shows matches with name, email, and companies for context.
 * User can select existing contact or create new.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { searchContactsAction, linkContactAction } from '../actions'
import { CreateContactModal } from './create-contact-modal'
import { type ContactWithCompanies } from '@/lib/dal/contacts'

interface AddContactComboboxProps {
  companyId: string
  onContactAdded?: () => void
}

export function AddContactCombobox({ companyId, onContactAdded }: AddContactComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ContactWithCompanies[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [linkingContactId, setLinkingContactId] = useState<string | null>(null)

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

  const handleSelectExisting = async (contactId: string) => {
    setLinkingContactId(contactId)

    try {
      const result = await linkContactAction(contactId, companyId)

      if (!result.success) {
        alert('error' in result ? result.error : 'Failed to link contact')
        return
      }

      // Success
      setOpen(false)
      setSearchQuery('')
      setSearchResults([])

      if (onContactAdded) {
        onContactAdded()
      } else {
        window.location.reload()
      }
    } catch (err) {
      alert('Failed to link contact')
    } finally {
      setLinkingContactId(null)
    }
  }

  const handleCreateNew = () => {
    setOpen(false)
    setCreateModalOpen(true)
    // searchQuery will be passed to modal to pre-populate name
  }

  const formatContactDisplay = (contact: ContactWithCompanies) => {
    const name = `${contact.first_name} ${contact.last_name}`
    const emailPart = contact.email ? ` • ${contact.email}` : ''
    const companiesPart = contact.companies && contact.companies.length > 0
      ? ` (${contact.companies.map(c => c.business_name).join(', ')})`
      : ''

    return `${name}${emailPart}${companiesPart}`
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
        Contact
      </Button>

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

              {/* Existing Contacts */}
              {searchResults.length > 0 && (
                <CommandGroup heading="Existing Contacts">
                  {searchResults.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => handleSelectExisting(contact.id)}
                      disabled={linkingContactId === contact.id}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          linkingContactId === contact.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
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
        companyId={companyId}
        onSuccess={onContactAdded}
        initialName={searchQuery}
      />
    </>
  )
}
