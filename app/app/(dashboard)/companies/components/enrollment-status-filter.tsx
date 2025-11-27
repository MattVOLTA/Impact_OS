/**
 * Enrollment Status Filter Component
 *
 * Dropdown to filter companies by their program enrollment status:
 * - All Companies (default)
 * - Active in Programs
 * - Alumni Only
 * - Not Enrolled
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EnrollmentStatusFilterProps {
  value: string
  onChange: (value: string) => void
}

export function EnrollmentStatusFilter({ value, onChange }: EnrollmentStatusFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px] bg-white">
        <SelectValue placeholder="All Companies" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Companies</SelectItem>
        <SelectItem value="active">Active in Programs</SelectItem>
        <SelectItem value="alumni">Alumni Only</SelectItem>
        <SelectItem value="not_enrolled">Not Enrolled</SelectItem>
      </SelectContent>
    </Select>
  )
}
