/**
 * Company Type Filter Component
 *
 * Dropdown to filter companies by their type:
 * - Startup, Investment Fund, Government, University,
 *   Service Provider, Large Corporation, Non-Profit
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const COMPANY_TYPES = [
  'Startup',
  'Investment Fund',
  'Government',
  'University',
  'Service Provider',
  'Large Corporation',
  'Non-Profit',
] as const

interface CompanyTypeFilterProps {
  value: string
  onChange: (value: string) => void
}

export function CompanyTypeFilter({ value, onChange }: CompanyTypeFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px] bg-white">
        <SelectValue placeholder="All Types" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Types</SelectItem>
        {COMPANY_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
