import { z } from 'zod'

// --- Types ---

export interface Commitment {
  id: string
  company_id: string
  title: string
  description: string | null
  status: 'open' | 'completed' | 'cancelled' | 'not_completed'
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  created_by_user_id: string | null
}

// --- Schemas ---

export const createCommitmentSchema = z.object({
  company_id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  due_date: z.string().datetime().optional(),
})

export type CreateCommitmentInput = z.infer<typeof createCommitmentSchema>

export const updateCommitmentSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['open', 'completed', 'cancelled', 'not_completed']).optional(),
  due_date: z.string().datetime().optional().nullable(),
  completed_at: z.string().datetime().optional().nullable(),
})

export type UpdateCommitmentInput = z.infer<typeof updateCommitmentSchema>

// --- AI Analysis Schema ---

/**
 * Schema for GPT-5 Nano commitment analysis
 * Uses structured outputs to guarantee valid JSON
 */
export const commitmentAnalysisSchema = z.object({
  extracted_date: z.string().datetime().nullable(),
  is_measurable: z.boolean(),
  measurability_score: z.number().min(0).max(10),
  suggestion: z.string().nullable(),
  is_duplicate: z.boolean(),
  smart_criteria: z.object({
    specific: z.boolean(),
    measurable: z.boolean(),
    achievable: z.boolean(),
    relevant: z.boolean(),
    time_bound: z.boolean()
  })
})

export type CommitmentAnalysis = z.infer<typeof commitmentAnalysisSchema>
