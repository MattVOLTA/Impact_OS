/**
 * Programs Table Component
 *
 * Client Component for displaying programs list with company/contact counts.
 */

'use client'

import Link from 'next/link'
import { Users, Building2 } from 'lucide-react'
import type { ProgramWithCounts } from '@/lib/dal/programs'

interface ProgramsTableProps {
  programs: (ProgramWithCounts | any)[]
}

export function ProgramsTable({ programs }: ProgramsTableProps) {
  return (
    <div className="rounded-md border bg-background">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-medium">Program Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
            <th className="px-4 py-3 text-center text-sm font-medium">Companies</th>
            <th className="px-4 py-3 text-center text-sm font-medium">Contacts</th>
          </tr>
        </thead>
        <tbody>
          {programs.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                No programs found. Click "Add Program" to get started.
              </td>
            </tr>
          ) : (
            programs.map((program) => (
              <tr
                key={program.id}
                className="border-b hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/programs/${program.id}`}
                    className="font-medium hover:underline"
                  >
                    {program.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground line-clamp-2">
                    {program.description || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{program.company_count || 0}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{program.contact_count || 0}</span>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
