/**
 * Data Access Layer - Commitments
 *
 * Handles access to company commitments (goals/action items).
 * Enforces tenant isolation.
 */

import { requireAuth, getCurrentOrganizationId } from './shared'
import { getTenantConfig } from './settings'
export { 
  type Commitment,
  type CreateCommitmentInput, 
  type UpdateCommitmentInput,
  createCommitmentSchema, 
  updateCommitmentSchema 
} from '@/lib/schemas/commitments'
import { 
  createCommitmentSchema, 
  updateCommitmentSchema,
  type CreateCommitmentInput,
  type UpdateCommitmentInput,
  type Commitment
} from '@/lib/schemas/commitments'

// --- Functions ---

/**
 * Get active commitments for a company (status = open)
 */
export async function getCompanyCommitments(companyId: string, status: 'open' | 'completed' | 'all' = 'open'): Promise<Commitment[]> {
  const { supabase } = await requireAuth()

  let query = supabase
    .from('commitments')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch commitments: ${error.message}`)
  return data || []
}

/**
 * Get a single commitment details
 */
export async function getCommitment(id: string): Promise<Commitment | null> {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('commitments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

/**
 * Create a new commitment
 */
export async function createCommitment(input: CreateCommitmentInput): Promise<Commitment> {
  const { supabase, user } = await requireAuth()
  const tenantId = await getCurrentOrganizationId()
  
  const validated = createCommitmentSchema.parse(input)

  const { data, error } = await supabase
    .from('commitments')
    .insert({
      tenant_id: tenantId,
      company_id: validated.company_id,
      title: validated.title,
      description: validated.description,
      due_date: validated.due_date,
      status: 'open',
      created_by_user_id: user.id
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create commitment: ${error.message}`)
  return data
}

/**
 * Update a commitment
 */
export async function updateCommitment(id: string, updates: UpdateCommitmentInput): Promise<Commitment> {
  const { supabase } = await requireAuth()
  
  const validated = updateCommitmentSchema.parse(updates)
  
  const updateData: any = { ...validated }
  
  // Auto-set completed_at if status changes to completed
  if (validated.status === 'completed') {
    updateData.completed_at = new Date().toISOString()
  } else if (validated.status === 'open') {
    updateData.completed_at = null
  }

  const { data, error } = await supabase
    .from('commitments')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update commitment: ${error.message}`)
  return data
}

