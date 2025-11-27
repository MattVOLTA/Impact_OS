'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Building2, User, FolderKanban } from 'lucide-react'
import { debounce } from 'lodash'
import { universalSearchAction } from '@/app/(dashboard)/actions'

interface SearchResult {
  id: string
  entity_type: 'company' | 'contact' | 'program'
  title: string
  subtitle: string
}

const ENTITY_CONFIG = {
  company: {
    icon: Building2,
    label: 'Company',
    getUrl: (id: string) => `/companies/${id}`,
  },
  contact: {
    icon: User,
    label: 'Contact',
    getUrl: (id: string) => `/contacts/${id}`,
  },
  program: {
    icon: FolderKanban,
    label: 'Program',
    getUrl: (id: string) => `/programs/${id}`,
  },
}

export function UniversalSearchDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Command+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Debounced search
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await universalSearchAction(searchQuery)
        if (response.success && response.data) {
          setResults(response.data)
        } else {
          setResults([])
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 350),
    []
  )

  useEffect(() => {
    performSearch(query)
  }, [query, performSearch])

  const handleSelect = (value: string) => {
    // Value is the full title, but we need to find the result by matching it
    const result = results.find((r) => r.title === value)
    if (result) {
      const config = ENTITY_CONFIG[result.entity_type]
      setOpen(false)
      setQuery('')
      router.push(config.getUrl(result.id))
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search companies, contacts, programs..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="py-6 text-center text-sm">Searching...</div>
        )}
        {!isLoading && query && results.length === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {!isLoading && results.length > 0 && (
          <CommandGroup heading={`Results (${results.length})`}>
            {results.map((result) => {
              const config = ENTITY_CONFIG[result.entity_type]
              const Icon = config.icon

              return (
                <CommandItem
                  key={`${result.entity_type}-${result.id}`}
                  value={result.title}
                  onSelect={handleSelect}
                  className="flex items-center gap-2 py-3"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{result.title}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {result.subtitle}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {config.label}
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
