/**
 * Company Detail Page Server Actions
 *
 * Actions for editing, deleting companies, and managing logos.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'
import { deleteCompany, updateCompany } from '@/lib/dal/companies'
import { updateCommitmentProgress } from '@/lib/dal/commitment-tracking'
import { getCurrentTenantId } from '@/lib/dal/shared'
import { type UpdateCompanyInput } from '@/lib/schemas/company'
import { type UpdateCommitmentProgressInput } from '@/lib/schemas/commitment-tracking'
import { createCommitment, updateCommitment } from '@/lib/dal/commitments'
import { type CreateCommitmentInput, type UpdateCommitmentInput } from '@/lib/schemas/commitments'

/**
 * Delete a commitment
 */
export async function deleteCommitmentAction(id: string) {
  try {
    const { requireAuth } = await import('@/lib/dal/shared')
    
    const { supabase } = await requireAuth()
    
    const { data, error } = await supabase
      .from('commitments')
      .delete()
      .eq('id', id)
      .select('company_id')
      .single()

    if (error) throw new Error(error.message)

    if (data) {
      revalidatePath(`/companies/${data.company_id}`) 
      revalidatePath(`/companies/${data.company_id}/commitments`)
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete commitment' }
  }
}

/**
 * Create commitment
 */
export async function createCommitmentAction(input: CreateCommitmentInput) {
  try {
    const result = await createCommitment(input)
    revalidatePath(`/companies/${input.company_id}/commitments`)
    revalidatePath(`/companies/${input.company_id}`)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create commitment' }
  }
}

/**
 * Update commitment
 */
export async function updateCommitmentAction(id: string, input: UpdateCommitmentInput) {
  try {
    const result = await updateCommitment(id, input)
    revalidatePath(`/companies/${result.company_id}`) 
    revalidatePath(`/companies/${result.company_id}/commitments`)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update commitment' }
  }
}

/**
 * Delete a company
 *
 * @param companyId - Company UUID to delete
 * @returns Success/failure
 */
export async function deleteCompanyAction(companyId: string) {
  try {
    await deleteCompany(companyId)

    // Revalidate companies list
    revalidatePath('/companies')

    return {
      success: true,
      message: 'Company deleted successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete company'
    }
  }
}

/**
 * Update a company
 *
 * @param companyId - Company UUID to update
 * @param updates - Fields to update
 * @returns Success/failure with updated company
 */
export async function updateCompanyAction(companyId: string, updates: UpdateCompanyInput) {
  try {
    const company = await updateCompany(companyId, updates)

    // Revalidate both list and detail page
    revalidatePath('/companies')
    revalidatePath(`/companies/${companyId}`)

    return {
      success: true,
      company
    }
  } catch (error) {
    // Handle Zod validation errors with user-friendly messages
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]
      const fieldName = firstIssue.path.join('.')
      return {
        success: false,
        error: `${fieldName}: ${firstIssue.message}`
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update company'
    }
  }
}

/**
 * Update company commitment progress
 */
export async function updateCommitmentProgressAction(input: UpdateCommitmentProgressInput) {
  try {
    const result = await updateCommitmentProgress(input)

    revalidatePath(`/companies/${input.company_id}`)

    return {
      success: true,
      data: result
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update commitment progress'
    }
  }
}

/**
 * Upload company logo to Storage and update company record
 *
 * @param companyId - Company UUID
 * @param formData - FormData containing the file
 * @returns Success/failure with logo URL
 */
export async function uploadCompanyLogoAction(companyId: string, formData: FormData) {
  try {
    const file = formData.get('file') as File

    if (!file) {
      return { success: false, error: 'No file provided' }
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 5MB' }
    }

    const tenantId = await getCurrentTenantId()

    // Create storage client with service role (bypass RLS until Custom Access Token Hook enabled)
    const storageClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Upload to storage
    const fileExt = file.name.split('.').pop()
    const filePath = `${tenantId}/${companyId}/logo.${fileExt}`

    const { error: uploadError } = await storageClient.storage
      .from('company-logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Replace if exists
        contentType: file.type
      })

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }

    // Get public URL
    const { data: urlData } = storageClient.storage
      .from('company-logos')
      .getPublicUrl(filePath)

    // Update company record with logo URL
    await updateCompany(companyId, {
      logo_url: urlData.publicUrl
    })

    // Revalidate pages
    revalidatePath('/companies')
    revalidatePath(`/companies/${companyId}`)

    return {
      success: true,
      logo_url: urlData.publicUrl
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload logo'
    }
  }
}

/**
 * Delete company logo from Storage and clear company record
 *
 * @param companyId - Company UUID
 * @returns Success/failure
 */
export async function deleteCompanyLogoAction(companyId: string) {
  try {
    const tenantId = await getCurrentTenantId()

    const storageClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Delete from storage (try all common extensions)
    const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
    for (const ext of extensions) {
      const path = `${tenantId}/${companyId}/logo.${ext}`
      await storageClient.storage.from('company-logos').remove([path])
    }

    // Clear company logo_url
    await updateCompany(companyId, {
      logo_url: null
    })

    // Revalidate pages
    revalidatePath('/companies')
    revalidatePath(`/companies/${companyId}`)

    return {
      success: true,
      message: 'Logo deleted successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete logo'
    }
  }
}

/**
 * Analyze commitment text using GPT-5 Nano or heuristics
 *
 * Uses GPT-5 Nano when AI Integration is enabled and OpenAI is connected.
 * Falls back to simple heuristics if AI unavailable (graceful degradation).
 *
 * Issue #68: AI-Powered Commitment Validation
 */
export async function analyzeCommitmentAction(text: string) {
  try {
    // Check if AI Commitment Analysis feature is enabled (granular control)
    // Issue #69: Granular AI Feature Controls
    const { isAIFeatureEnabled, getOpenAIKeyFromVault } = await import('@/lib/dal/settings')
    const commitmentAnalysisEnabled = await isAIFeatureEnabled('commitment_analysis')

    if (!commitmentAnalysisEnabled) {
      // Feature disabled - return null (no analysis shown)
      return {
        success: true,
        data: null
      }
    }

    // Get OpenAI API key from vault
    const apiKey = await getOpenAIKeyFromVault()

    if (!apiKey) {
      // OpenAI not configured, fall back to heuristics
      const { analyzeWithHeuristics } = await import('@/lib/ai/openai-client')
      return {
        success: true,
        data: analyzeWithHeuristics(text)
      }
    }

    // Call GPT-5 Nano for AI-powered analysis
    const { analyzeCommitmentWithCache } = await import('@/lib/ai/openai-client')
    const analysis = await analyzeCommitmentWithCache(apiKey, text)

    return {
      success: true,
      data: analysis
    }
  } catch (error) {
    // Graceful fallback on any error (network, API, etc.)
    console.error('GPT-5 Nano analysis failed, falling back to heuristics:', error)

    const { analyzeWithHeuristics } = await import('@/lib/ai/openai-client')
    return {
      success: true,
      data: analyzeWithHeuristics(text)
    }
  }
}

/**
 * Get available milestones for setting company milestone
 *
 * Fetches all enabled milestone tracks with their definitions.
 *
 * @returns Array of tracks with milestones
 */
export async function getAvailableMilestonesAction() {
  try {
    const { getMilestoneTrackingSettings } = await import('@/lib/dal/settings')
    const { getMilestoneTracksWithDefinitions } = await import('@/lib/dal/milestone-tracks')

    const settings = await getMilestoneTrackingSettings()

    if (!settings.enabled) {
      return {
        success: true,
        data: []
      }
    }

    const tracks = await getMilestoneTracksWithDefinitions(true)

    // Filter to only enabled tracks
    const enabledTracks = tracks.filter(track =>
      settings.enabledTracks.includes(track.slug)
    )

    return {
      success: true,
      data: enabledTracks
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch available milestones',
      data: []
    }
  }
}

/**
 * Set company's current milestone
 *
 * Updates or creates a company_milestone record and creates history entry.
 *
 * @param companyId - Company ID
 * @param milestoneDefinitionId - Milestone definition ID
 * @param options - Optional metadata (completed_at, is_verified, notes)
 * @returns Success/failure
 */
export async function setCompanyMilestoneAction(
  companyId: string,
  milestoneDefinitionId: string,
  options?: {
    status?: 'working_towards' | 'completed' | 'not_verified'
    completed_at?: string
    is_verified?: boolean
    notes?: string
    previousMilestones?: Array<{
      milestone_id: string
      completed_at?: string
      is_verified: boolean
    }>
  }
) {
  try {
    const { requireAuth, getCurrentUserRole } = await import('@/lib/dal/shared')
    const { user } = await requireAuth()

    // Check permissions - editors and admins can update milestones
    const role = await getCurrentUserRole()
    if (role !== 'admin' && role !== 'editor') {
      return {
        success: false,
        error: 'Only editors and admins can update company milestones'
      }
    }

    const { setCompanyMilestone, createMilestoneHistoryEntry } = await import('@/lib/dal/company-milestones')
    const { getCompanyCurrentMilestone } = await import('@/lib/dal/company-milestones')

    const currentMilestone = await getCompanyCurrentMilestone(companyId)

    // Step 1: Create company_milestone records for any previous milestones marked as completed
    if (options?.previousMilestones && options.previousMilestones.length > 0) {
      for (const prevMilestone of options.previousMilestones) {
        if (prevMilestone.is_verified) {
          await setCompanyMilestone(companyId, {
            milestone_definition_id: prevMilestone.milestone_id,
            status: 'completed',
            completed_at: prevMilestone.completed_at,
            is_verified: true
          })
        }
      }
    }

    // Step 2: Set the current milestone
    await setCompanyMilestone(companyId, {
      milestone_definition_id: milestoneDefinitionId,
      status: options?.status || 'working_towards',
      completed_at: options?.completed_at,
      is_verified: options?.is_verified,
      notes: options?.notes
    })

    // Step 3: Create history entries for the progression
    if (options?.previousMilestones && options.previousMilestones.length > 0) {
      const completedPrevious = options.previousMilestones.filter(p => p.is_verified)

      // Create history chain
      let previousId: string | null = currentMilestone?.milestone_definition_id || null

      for (const prevMilestone of completedPrevious) {
        await createMilestoneHistoryEntry(
          companyId,
          previousId,
          prevMilestone.milestone_id,
          {
            status: 'completed',
            completed_at: prevMilestone.completed_at,
            is_verified: true
          }
        )
        previousId = prevMilestone.milestone_id
      }

      // Final entry: last completed → current
      await createMilestoneHistoryEntry(
        companyId,
        previousId,
        milestoneDefinitionId,
        {
          status: options?.status || 'working_towards',
          notes: options?.notes
        }
      )
    } else {
      // No previous milestones - just create history for current
      // ALWAYS create history entry (even for first milestone)
      await createMilestoneHistoryEntry(
        companyId,
        currentMilestone?.milestone_definition_id || null,
        milestoneDefinitionId,
        {
          status: options?.status || 'working_towards',
          completed_at: options?.completed_at,
          is_verified: options?.is_verified,
          notes: options?.notes
        }
      )
    }

    revalidatePath(`/companies/${companyId}`)

    return {
      success: true,
      message: 'Company milestone updated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update company milestone'
    }
  }
}
