/**
 * Program Filter Component
 *
 * Dropdown to filter companies by specific program enrollment.
 * Shows all programs for the current tenant.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Program {
  id: string
  name: string
  description: string | null
}

interface ProgramFilterProps {
  programs: Program[]
  value: string
  onChange: (value: string) => void
}

export function ProgramFilter({ programs, value, onChange }: ProgramFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px] bg-white">
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
  )
}
