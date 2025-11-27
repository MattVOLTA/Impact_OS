/**
 * Contacts Table Component
 *
 * Client Component for displaying contacts list with search and pagination.
 * Shows paginated contacts across all companies.
 * Uses Next.js Image component with lazy loading for optimal photo performance.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Phone } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { type ContactWithCompanies } from '@/lib/dal/contacts'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ProgramStatusBadges } from './program-status-badges'
import { updateUserPreferences } from '@/lib/dal/users'
import { debounce } from '@/lib/utils'

interface ContactsTableProps {
  contacts: ContactWithCompanies[]
  currentPage: number
  totalPages: number
  totalCount: number
  programs: Array<{ id: string; name: string }>
  initialFilters?: {
    enrollmentStatus?: string
    programId?: string
  }
}

export function ContactsTable({ contacts, currentPage, totalPages, totalCount, programs, initialFilters }: ContactsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>(
    searchParams.get('status') || initialFilters?.enrollmentStatus || 'all'
  )
  const [programId, setProgramId] = useState<string>(
    searchParams.get('program') || initialFilters?.programId || 'all'
  )

  // Sync state with URL params on mount and when params change
  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setEnrollmentStatus(searchParams.get('status') || initialFilters?.enrollmentStatus || 'all')
    setProgramId(searchParams.get('program') || initialFilters?.programId || 'all')
  }, [searchParams, initialFilters])

  // Debounced save function (500ms delay)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const savePreferences = useCallback(
    debounce(async (searchValue: string, statusValue: string, programValue: string) => {
      try {
        await updateUserPreferences('contacts', 'filters', {
          search: searchValue || undefined,
          enrollmentStatus: statusValue === 'all' ? undefined : statusValue as any,
          programId: programValue === 'all' ? undefined : programValue
        })
      } catch (error) {
        console.error('Failed to save filter preferences:', error)
      }
    }, 500),
    []
  )

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set('search', value)
    else params.delete('search')
    // Reset to page 1 when searching
    params.set('page', '1')
    router.push(`/contacts?${params.toString()}`)

    // Auto-save preference (debounced)
    savePreferences(value, enrollmentStatus, programId)
  }

  const handleStatusChange = (value: string) => {
    setEnrollmentStatus(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value !== 'all') params.set('status', value)
    else params.delete('status')
    params.set('page', '1')
    router.push(`/contacts?${params.toString()}`)

    // Auto-save preference (debounced)
    savePreferences(search, value, programId)
  }

  const handleProgramChange = (value: string) => {
    setProgramId(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') params.set('program', value)
    else params.delete('program')
    params.set('page', '1')
    router.push(`/contacts?${params.toString()}`)

    // Auto-save preference (debounced)
    savePreferences(search, enrollmentStatus, value)
  }

  // Generate letter avatar
  const getContactAvatar = (firstName: string, lastName: string) => {
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-red-500',
    ]
    const colorIndex = (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length
    return (
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-md ${colors[colorIndex]} text-white font-semibold text-sm`}
      >
        {initials}
      </div>
    )
  }


  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm bg-white"
        />

        <Select value={enrollmentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[200px] bg-white" suppressHydrationWarning>
            <SelectValue placeholder="All Contacts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contacts</SelectItem>
            <SelectItem value="active">Active in Programs</SelectItem>
            <SelectItem value="alumni">Alumni Only</SelectItem>
            <SelectItem value="not_enrolled">Not Enrolled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={programId || 'all'} onValueChange={handleProgramChange}>
          <SelectTrigger className="w-[200px] bg-white" suppressHydrationWarning>
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-background">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Companies</th>
            </tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No contacts found. Click "Add Contact" to get started.
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3">
                      {contact.photo_url ? (
                        <div className="relative h-10 w-10 flex-shrink-0">
                          <Image
                            src={contact.photo_url}
                            alt={`${contact.first_name} ${contact.last_name}`}
                            fill
                            className="rounded-md object-cover"
                            sizes="40px"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        getContactAvatar(contact.first_name, contact.last_name)
                      )}
                      <span className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {contact.phone ? (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {contact.companies && contact.companies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {contact.companies.map((company) => (
                          <Link
                            key={company.id}
                            href={`/companies/${company.id}`}
                          >
                            <Badge variant="outline" className="text-xs hover:bg-muted">
                              {company.business_name}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </div>
  )
}
