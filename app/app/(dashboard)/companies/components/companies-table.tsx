/**
 * Companies Table Component
 *
 * Client Component for displaying companies list with search and pagination.
 * Uses Next.js Image component with lazy loading for optimal logo performance.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { useRouter, useSearchParams } from 'next/navigation'
import type { CompanyWithIndustries } from '@/lib/dal/companies'
import { EnrollmentStatusFilter } from './enrollment-status-filter'
import { ProgramFilter } from './program-filter'
import { CompanyTypeFilter } from './company-type-filter'
import { updateUserPreferences } from '@/lib/dal/users'
import { debounce } from '@/lib/utils'

interface Program {
  id: string
  name: string
  description: string | null
}

interface CompaniesTableProps {
  companies: CompanyWithIndustries[]
  industries: Array<{ id: string; name: string }>
  programs: Program[]
  currentPage: number
  totalPages: number
  totalCount: number
  initialFilters?: {
    enrollmentStatus?: string
    programId?: string
    companyType?: string
  }
}

export function CompaniesTable({ companies, programs, currentPage, totalPages, totalCount, initialFilters }: CompaniesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [enrollmentStatus, setEnrollmentStatus] = useState(
    searchParams.get('status') || initialFilters?.enrollmentStatus || 'all'
  )
  const [programId, setProgramId] = useState(
    searchParams.get('program') || initialFilters?.programId || 'all'
  )
  const [companyType, setCompanyType] = useState(
    searchParams.get('type') || initialFilters?.companyType || 'all'
  )

  // Sync state with URL params on mount and when params change
  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setEnrollmentStatus(searchParams.get('status') || initialFilters?.enrollmentStatus || 'all')
    setProgramId(searchParams.get('program') || initialFilters?.programId || 'all')
    setCompanyType(searchParams.get('type') || initialFilters?.companyType || 'all')
  }, [searchParams, initialFilters])

  // Debounced save function (500ms delay)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const savePreferences = useCallback(
    debounce(async (searchValue: string, statusValue: string, programValue: string, typeValue: string) => {
      try {
        await updateUserPreferences('companies', 'filters', {
          search: searchValue || undefined,
          enrollmentStatus: statusValue === 'all' ? undefined : statusValue as any,
          programId: programValue === 'all' ? undefined : programValue,
          companyType: typeValue === 'all' ? undefined : typeValue as any
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
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    // Reset to page 1 when searching
    params.set('page', '1')
    router.push(`/companies?${params.toString()}`)

    // Auto-save preference (debounced)
    savePreferences(value, enrollmentStatus, programId, companyType)
  }

  const handleEnrollmentStatusChange = (value: string) => {
    setEnrollmentStatus(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value !== 'all') {
      params.set('status', value)
    } else {
      params.delete('status')
    }
    // Reset to page 1 when changing filter
    params.set('page', '1')
    router.push(`/companies?${params.toString()}`)

    // Auto-save preference (debounced)
    savePreferences(search, value, programId, companyType)
  }

  const handleProgramChange = (value: string) => {
    setProgramId(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value !== 'all') {
      params.set('program', value)
    } else {
      params.delete('program')
    }
    // Reset to page 1 when changing filter
    params.set('page', '1')
    router.push(`/companies?${params.toString()}`)

    // Auto-save preference (debounced)
    savePreferences(search, enrollmentStatus, value, companyType)
  }

  const handleCompanyTypeChange = (value: string) => {
    setCompanyType(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value !== 'all') {
      params.set('type', value)
    } else {
      params.delete('type')
    }
    // Reset to page 1 when changing filter
    params.set('page', '1')
    router.push(`/companies?${params.toString()}`)

    // Auto-save preference (debounced)
    savePreferences(search, enrollmentStatus, programId, value)
  }

  // Generate letter avatar for company
  const getCompanyAvatar = (name: string) => {
    const letter = name.charAt(0).toUpperCase()
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500',
      'bg-pink-500', 'bg-yellow-500', 'bg-red-500'
    ]
    const colorIndex = letter.charCodeAt(0) % colors.length
    return (
      <div className={`flex h-10 w-10 items-center justify-center rounded-md ${colors[colorIndex]} text-white font-semibold`}>
        {letter}
      </div>
    )
  }


  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm bg-white"
        />
        <EnrollmentStatusFilter
          value={enrollmentStatus}
          onChange={handleEnrollmentStatusChange}
        />
        <ProgramFilter
          programs={programs}
          value={programId}
          onChange={handleProgramChange}
        />
        <CompanyTypeFilter
          value={companyType}
          onChange={handleCompanyTypeChange}
        />
      </div>

      <div className="rounded-md border bg-background">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Company Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Website</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Industry</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No companies found. Click "Add Company" to get started.
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr
                  key={company.id}
                  className="border-b hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <Link href={`/companies/${company.id}`} className="flex items-center gap-3">
                      {company.logo_url ? (
                        <div className="h-10 w-10 flex-shrink-0 rounded-md bg-muted/30 border border-border flex items-center justify-center p-1">
                          <Image
                            src={company.logo_url}
                            alt={`${company.business_name} logo`}
                            width={32}
                            height={32}
                            className="object-contain max-h-full max-w-full"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        getCompanyAvatar(company.business_name)
                      )}
                      <span className="font-medium">{company.business_name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {company.website_url ? (
                      <a
                        href={company.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {company.website_url}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {company.industries && company.industries.length > 0 ? (
                      <span className="text-muted-foreground">
                        {company.industries.map(i => i.name).join(', ')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {company.city && company.province
                      ? `${company.city}, ${company.province}`
                      : company.city || company.province || '-'}
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
