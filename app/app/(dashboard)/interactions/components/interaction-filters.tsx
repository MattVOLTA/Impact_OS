/**
 * Interaction Filters
 *
 * Filter controls for the interactions list view.
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export function InteractionFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')

  const handleFilter = () => {
    const params = new URLSearchParams()

    if (search) params.set('search', search)

    router.push(`/interactions?${params.toString()}`)
  }

  const handleClear = () => {
    setSearch('')
    router.push('/interactions')
  }

  const hasFilters = search !== ''

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          {/* Search */}
          <div className="flex-1">
            <Label htmlFor="search-filter">Search</Label>
            <Input
              id="search-filter"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
              className="mt-2"
            />
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <Button onClick={handleFilter}>
              Apply Filters
            </Button>
            {hasFilters && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleClear}
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
