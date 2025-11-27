import { z } from 'zod'

// --- Interfaces ---

export interface CommitmentTrack {
  id: string
  tenant_id: string | null
  title: string
  description: string | null
  is_system_standard: boolean
  created_at: string
}

export interface CommitmentDefinition {
  id: string
  track_id: string
  title: string
  description: string | null
  order_index: number
  created_at: string
}

export interface CompanyCommitmentProgress {
  id: string
  company_id: string
  commitment_id: string
  status: 'pending' | 'achieved'
  achieved_at: string | null
  logged_at: string
  verified_by_user_id: string | null
  evidence_note: string | null
  evidence_url: string | null
}

// --- Schemas ---

export const createCommitmentTrackSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  is_system_standard: z.boolean().optional().default(false)
})

export type CreateCommitmentTrackInput = z.infer<typeof createCommitmentTrackSchema>

export const createCommitmentDefinitionSchema = z.object({
  track_id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  order_index: z.number().int().min(0)
})

export type CreateCommitmentDefinitionInput = z.infer<typeof createCommitmentDefinitionSchema>

export const updateCommitmentProgressSchema = z.object({
  company_id: z.string().uuid(),
  commitment_id: z.string().uuid(),
  status: z.enum(['pending', 'achieved']),
  achieved_at: z.string().datetime().optional(), // Optional override, defaults to now
  evidence_note: z.string().optional(),
  evidence_url: z.string().url().optional().or(z.literal(''))
})

export type UpdateCommitmentProgressInput = z.infer<typeof updateCommitmentProgressSchema>
