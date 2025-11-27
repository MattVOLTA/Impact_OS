/**
 * Settings Server Actions
 *
 * Server-side actions for Fireflies integration configuration.
 * All actions require authentication and check user roles.
 *
 * See Issue #9 for implementation details.
 */

'use server'

import { createClient } from '@supabase/supabase-js'
import { requireAuth, getCurrentTenantId, getCurrentUserRole } from '@/lib/dal/shared'

/**
 * Test Fireflies API connection with provided API key
 *
 * Calls Fireflies GraphQL API to validate the key works.
 * Does NOT save the key - this is just a test.
 *
 * @param apiKey - Fireflies API key to test
 * @returns Success/failure + user info from Fireflies
 */
export async function testFirefliesConnection(apiKey: string) {
  // Verify user is authenticated and is admin
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can configure Fireflies integration'
    }
  }

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      error: 'API key is required'
    }
  }

  try {
    // Call Fireflies GraphQL API
    const response = await fetch('https://api.fireflies.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: `
          query {
            user {
              name
              email
              integrations
            }
          }
        `
      })
    })

    if (!response.ok) {
      return {
        success: false,
        error: `Fireflies API error: ${response.statusText}`
      }
    }

    const result = await response.json()

    if (result.errors) {
      return {
        success: false,
        error: result.errors[0]?.message || 'Invalid API key'
      }
    }

    if (!result.data?.user) {
      return {
        success: false,
        error: 'Could not fetch user information from Fireflies'
      }
    }

    return {
      success: true,
      user: result.data.user
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to Fireflies'
    }
  }
}

/**
 * Save Fireflies API key to Vault and update tenant_config
 *
 * Tests the connection first, then stores the key encrypted in Vault.
 * Updates tenant_config with secret_id and connection metadata.
 *
 * @param apiKey - Fireflies API key to save
 * @returns Success/failure
 */
export async function saveFirefliesKey(apiKey: string) {
  // Verify admin
  const { user } = await requireAuth()
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can configure Fireflies integration'
    }
  }

  // Test connection first
  const testResult = await testFirefliesConnection(apiKey)
  if (!testResult.success) {
    return testResult
  }

  const tenantId = await getCurrentTenantId()

  try {
    // Create admin client for Vault operations (requires service role)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Store API key in Vault using wrapper function
    const secretName = `fireflies_${tenantId}`
    const { data: secretId, error: vaultError } = await adminClient
      .rpc('vault_create_secret', {
        new_secret: apiKey,
        new_name: secretName,
        new_description: `Fireflies API key for tenant ${tenantId}`
      })

    if (vaultError || !secretId) {
      console.error('Vault error:', vaultError)
      return {
        success: false,
        error: `Failed to store API key: ${vaultError?.message || 'Unknown error'}`
      }
    }

    // Update tenant_config with connection metadata
    const { error: configError } = await adminClient
      .from('tenant_config')
      .update({
        fireflies_api_key_secret_id: secretId,
        fireflies_connected_by: user.id,
        fireflies_connected_at: new Date().toISOString(),
        fireflies_connection_status: 'connected'
      })
      .eq('tenant_id', tenantId)

    if (configError) {
      // Rollback: delete the secret we just created
      await adminClient.rpc('vault.delete_secret', { secret_id: secretId })

      return {
        success: false,
        error: `Failed to save connection metadata: ${configError.message}`
      }
    }

    return {
      success: true,
      message: 'Fireflies connected successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save API key'
    }
  }
}

/**
 * Disconnect Fireflies integration
 *
 * Deletes API key from Vault and clears tenant_config metadata.
 *
 * @returns Success/failure
 */
export async function disconnectFireflies() {
  // Verify admin
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can disconnect Fireflies'
    }
  }

  const tenantId = await getCurrentTenantId()

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get current secret_id
    const { data: config } = await adminClient
      .from('tenant_config')
      .select('fireflies_api_key_secret_id')
      .eq('tenant_id', tenantId)
      .single()

    const secretId = config?.fireflies_api_key_secret_id

    // Delete from Vault if exists
    if (secretId) {
      await adminClient.rpc('vault_delete_secret', { secret_id: secretId })
    }

    // Clear tenant_config
    const { error: configError } = await adminClient
      .from('tenant_config')
      .update({
        fireflies_api_key_secret_id: null,
        fireflies_connected_by: null,
        fireflies_connected_at: null,
        fireflies_connection_status: 'not_connected'
      })
      .eq('tenant_id', tenantId)

    if (configError) {
      return {
        success: false,
        error: `Failed to disconnect: ${configError.message}`
      }
    }

    return {
      success: true,
      message: 'Fireflies disconnected successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect Fireflies'
    }
  }
}

/**
 * Toggle Fireflies integration on/off
 *
 * Updates feature_fireflies flag in tenant_config.
 * Does not disconnect - just enables/disables the feature.
 *
 * @param enabled - True to enable, false to disable
 * @returns Success/failure
 */
export async function toggleFireflies(enabled: boolean) {
  // Verify admin
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can toggle Fireflies'
    }
  }

  const tenantId = await getCurrentTenantId()

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await adminClient
      .from('tenant_config')
      .update({ feature_fireflies: enabled })
      .eq('tenant_id', tenantId)

    if (error) {
      return {
        success: false,
        error: `Failed to toggle Fireflies: ${error.message}`
      }
    }

    return {
      success: true,
      message: `Fireflies ${enabled ? 'enabled' : 'disabled'} successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle Fireflies'
    }
  }
}

/**
 * Toggle Commitment Tracking feature on/off
 *
 * Updates feature_commitment_tracking flag in tenant_config.
 * Business Rule: When disabled, automatically disables commitment_analysis AI feature.
 *
 * @param enabled - True to enable, false to disable
 * @returns Success/failure
 */
export async function toggleCommitmentTracking(enabled: boolean) {
  // Verify admin
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can toggle Commitment Tracking'
    }
  }

  const tenantId = await getCurrentTenantId()

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Business Rule: When disabling commitment tracking, also disable commitment_analysis
    let updateData: any = { feature_commitment_tracking: enabled }

    if (!enabled) {
      // Get current ai_features to update
      const { data: config } = await adminClient
        .from('tenant_config')
        .select('ai_features')
        .eq('tenant_id', tenantId)
        .single()

      const aiFeatures = (config?.ai_features as Record<string, boolean>) || {}
      aiFeatures.commitment_analysis = false
      updateData.ai_features = aiFeatures
    }

    const { error } = await adminClient
      .from('tenant_config')
      .update(updateData)
      .eq('tenant_id', tenantId)

    if (error) {
      return {
        success: false,
        error: `Failed to toggle commitment tracking: ${error.message}`
      }
    }

    const message = enabled
      ? 'Commitment Tracking enabled successfully'
      : 'Commitment Tracking disabled successfully (commitment analysis also disabled)'

    return {
      success: true,
      message
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle commitment tracking'
    }
  }
}

/**
 * Update Fireflies sync dates (simplified - no filters)
 *
 * Updates only the sync start date and optionally resets last sync timestamp.
 * All filtering logic removed - user reviews ALL meetings in queue.
 *
 * @param config - Sync configuration
 * @returns Success/failure
 */
export async function updateFirefliesSyncDates(config: {
  syncStartDate: string | null
  resetLastSync?: boolean
}) {
  // Verify admin
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can update sync configuration'
    }
  }

  const tenantId = await getCurrentTenantId()

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const updateData: any = {
      fireflies_sync_start_date: config.syncStartDate
    }

    // Reset last sync if requested
    if (config.resetLastSync) {
      updateData.fireflies_last_sync_at = null
    }

    const { error } = await adminClient
      .from('tenant_config')
      .update(updateData)
      .eq('tenant_id', tenantId)

    if (error) {
      return {
        success: false,
        error: `Failed to update sync configuration: ${error.message}`
      }
    }

    // Revalidate the settings page to show fresh data
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/settings')

    return {
      success: true,
      message: config.resetLastSync
        ? 'Last sync reset - next sync will start from sync start date'
        : 'Sync configuration updated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update sync configuration'
    }
  }
}

/**
 * Trigger manual Fireflies sync
 *
 * Runs the sync script for current tenant only.
 *
 * @returns Success/failure with count of meetings staged
 */
export async function triggerManualSync() {
  // Verify admin
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can trigger manual sync'
    }
  }

  const tenantId = await getCurrentTenantId()

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get tenant config
    const { data: config } = await adminClient
      .from('tenant_config')
      .select('fireflies_sync_start_date, fireflies_last_sync_at, fireflies_api_key_secret_id')
      .eq('tenant_id', tenantId)
      .single()

    if (!config?.fireflies_api_key_secret_id) {
      return {
        success: false,
        error: 'Fireflies API key not configured. Please connect Fireflies first.'
      }
    }

    // Retrieve API key from Vault using RPC wrapper function
    const { data: apiKey, error: vaultError } = await adminClient
      .rpc('vault_read_secret', { secret_id: config.fireflies_api_key_secret_id })

    if (vaultError || !apiKey) {
      return {
        success: false,
        error: `Failed to retrieve Fireflies API key from Vault: ${vaultError?.message || 'Unknown error'}`
      }
    }

    // Determine date range (use last sync or start date or 90 days ago)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const fromDate = config.fireflies_last_sync_at
      ? new Date(config.fireflies_last_sync_at)
      : config.fireflies_sync_start_date
      ? new Date(config.fireflies_sync_start_date)
      : ninetyDaysAgo

    const toDate = new Date()

    // Import Fireflies client dynamically with API key from Vault
    const { createFirefliesClient } = await import('@/lib/fireflies/client')
    const firefliesClient = createFirefliesClient(apiKey as string)

    // Fetch meetings
    const meetings = await firefliesClient.fetchMeetingsByDateRange(fromDate, toDate)

    // Stage ALL meetings (no filtering - user reviews in queue)
    let stagedCount = 0
    let skippedCount = 0

    console.log(`Processing ${meetings.length} meetings...`)

    for (const meeting of meetings) {
      console.log(`\nChecking meeting: ${meeting.title}`)
      console.log(`  Date: ${meeting.date}`)
      console.log(`  Participants: ${meeting.participants.join(', ')}`)

      // Check if already staged or imported (duplicate prevention only)
      const { data: existing } = await adminClient
        .from('fireflies_staged_meetings')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('fireflies_transcript_id', meeting.id)
        .single()

      if (existing) {
        console.log(`  ⏩ Skipped: Already staged`)
        skippedCount++
        continue
      }

      const { data: imported } = await adminClient
        .from('interactions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('fireflies_transcript_id', meeting.id)
        .single()

      if (imported) {
        console.log(`  ⏩ Skipped: Already imported`)
        skippedCount++
        continue
      }

      // Match participants to contacts (for smart badges, not filtering)
      const { data: matchedContacts } = await adminClient
        .from('contact_emails')
        .select('email, contacts!inner(tenant_id)')
        .eq('contacts.tenant_id', tenantId)
        .in('email', meeting.participants)

      const matchedEmails = matchedContacts?.map(c => c.email) || []
      const matchType = matchedEmails.length > 0 ? 'known_contact' : 'no_match'

      console.log(`  ✅ Staging meeting (matched ${matchedEmails.length} contacts)`)

      // Stage the meeting
      const { error: stageError } = await adminClient.from('fireflies_staged_meetings').insert({
        tenant_id: tenantId,
        fireflies_transcript_id: meeting.id,
        title: meeting.title,
        meeting_date: meeting.date,
        duration_seconds: Math.round(meeting.duration), // Round to integer
        organizer_email: meeting.organizer,
        host_email: meeting.host,
        participants: meeting.participants,
        match_type: matchType,
        matched_emails: matchedEmails,
        import_status: 'pending',
        staged_at: new Date()
      })

      if (stageError) {
        console.error(`  ❌ Error staging meeting:`, stageError)
      } else {
        console.log(`  ✅ Successfully staged`)
        stagedCount++
      }
    }

    console.log(`\n📊 Staging Summary:`)
    console.log(`  Total fetched: ${meetings.length}`)
    console.log(`  Successfully staged: ${stagedCount}`)
    console.log(`  Skipped (duplicates): ${skippedCount}`)

    // Update last sync timestamp
    if (meetings.length > 0) {
      await adminClient
        .from('tenant_config')
        .update({ fireflies_last_sync_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
    }

    return {
      success: true,
      message: stagedCount > 0
        ? `Synced ${stagedCount} meeting${stagedCount !== 1 ? 's' : ''} to review queue`
        : `No new meetings to sync (checked ${meetings.length} meetings)`,
      stagedCount
    }
  } catch (error) {
    console.error('Manual sync error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync meetings'
    }
  }
}

/**
 * Get pending meetings (awaiting review)
 *
 * @returns List of meetings with status = 'pending'
 */
export async function getPendingMeetings() {
  const { user } = await requireAuth()
  const tenantId = await getCurrentTenantId()

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminClient
    .from('fireflies_staged_meetings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('import_status', 'pending')
    .order('meeting_date', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch pending meetings: ${error.message}`)
  }

  // Enrich with contact names for matched emails
  const enrichedData = await Promise.all(
    (data || []).map(async (meeting) => {
      if (meeting.matched_emails && Array.isArray(meeting.matched_emails) && meeting.matched_emails.length > 0) {
        const { data: contacts } = await adminClient
          .from('contact_emails')
          .select('email, contacts!inner(id, first_name, last_name, tenant_id)')
          .eq('contacts.tenant_id', tenantId)
          .in('email', meeting.matched_emails)

        const contactNames = contacts?.map(c => {
          // Handle potential array or single object from join
          const contact = Array.isArray(c.contacts) ? c.contacts[0] : c.contacts
          return {
            email: c.email,
            name: contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown'
          }
        }) || []

        return { ...meeting, matched_contact_names: contactNames }
      }
      return { ...meeting, matched_contact_names: [] }
    })
  )

  return enrichedData
}

/**
 * Get imported meetings (successfully imported)
 *
 * @returns List of meetings with status = 'imported'
 */
export async function getImportedMeetings() {
  const { user } = await requireAuth()
  const tenantId = await getCurrentTenantId()

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminClient
    .from('fireflies_staged_meetings')
    .select(`
      *,
      interactions (
        id,
        title,
        meeting_date
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('import_status', 'imported')
    .order('imported_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch imported meetings: ${error.message}`)
  }

  return data || []
}

/**
 * Get excluded meetings (user decided not to import)
 *
 * @returns List of meetings with status = 'excluded'
 */
export async function getExcludedMeetings() {
  const { user } = await requireAuth()
  const tenantId = await getCurrentTenantId()

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminClient
    .from('fireflies_staged_meetings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('import_status', 'excluded')
    .order('excluded_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch excluded meetings: ${error.message}`)
  }

  return data || []
}

/**
 * Get staged meetings for review (legacy - use getPendingMeetings instead)
 *
 * @deprecated Use getPendingMeetings, getImportedMeetings, or getExcludedMeetings
 * @returns List of staged meetings with match metadata
 */
export async function getStagedMeetings() {
  return getPendingMeetings()
}

/**
 * Import selected meetings from staging queue
 *
 * Stage 2: Fetch full transcripts and create interactions
 *
 * @param meetingIds - Array of fireflies_staged_meetings IDs
 * @returns Results with success/error per meeting
 */
export async function importSelectedMeetings(meetingIds: string[]) {
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can import meetings'
    }
  }

  const tenantId = await getCurrentTenantId()

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { createFirefliesClient } = await import('@/lib/fireflies/client')
  const firefliesClient = createFirefliesClient()

  const results = []

  for (const meetingId of meetingIds) {
    try {
      // Get staged meeting
      const { data: staged } = await adminClient
        .from('fireflies_staged_meetings')
        .select('*')
        .eq('id', meetingId)
        .eq('tenant_id', tenantId)
        .single()

      if (!staged) {
        results.push({
          success: false,
          meetingId,
          error: 'Meeting not found in queue'
        })
        continue
      }

      // Fetch full transcript (heavy operation)
      const fullTranscript = await firefliesClient.fetchFullTranscript(
        staged.fireflies_transcript_id
      )

      // Create interaction
      const { data: interaction, error: interactionError } = await adminClient
        .from('interactions')
        .insert({
          tenant_id: tenantId,
          fireflies_transcript_id: staged.fireflies_transcript_id,
          title: fullTranscript.title,
          meeting_date: fullTranscript.date,
          duration_minutes: Math.floor(fullTranscript.duration / 60),
          summary: fullTranscript.summary,
          interaction_type: 'meeting'
        })
        .select()
        .single()

      if (interactionError || !interaction) {
        throw new Error(interactionError?.message || 'Failed to create interaction')
      }

      // Create meeting transcript
      await adminClient.from('meeting_transcripts').insert({
        tenant_id: tenantId,
        interaction_id: interaction.id,
        fireflies_transcript_id: staged.fireflies_transcript_id,
        transcript: fullTranscript.transcript,
        transcript_outline: fullTranscript.outline,
        fireflies_summary: fullTranscript.summary,
        fireflies_action_items: fullTranscript.actionItems,
        speakers: fullTranscript.speakers,
        participants: fullTranscript.participants,
        processing_status: 'completed'
      })

      // Link to matched contacts
      if (staged.matched_emails && Array.isArray(staged.matched_emails)) {
        const { data: contacts } = await adminClient
          .from('contact_emails')
          .select('email, contacts!inner(id, tenant_id)')
          .eq('contacts.tenant_id', tenantId)
          .in('email', staged.matched_emails)

        if (contacts && contacts.length > 0) {
          await adminClient.from('interaction_contacts').insert(
            contacts.map(c => ({
              interaction_id: interaction.id,
              // Handle array type from join
              contact_id: Array.isArray(c.contacts) ? c.contacts[0].id : (c.contacts as any).id,
              auto_matched: true,
              match_confidence: 'high'
            }))
          )

          // Link to companies via contacts
          const { data: companyContacts } = await adminClient
            .from('company_contacts')
            .select('company_id')
            // Handle array type from join
            .in('contact_id', contacts.map(c => Array.isArray(c.contacts) ? c.contacts[0].id : (c.contacts as any).id))

          if (companyContacts && companyContacts.length > 0) {
            const uniqueCompanyIds = [...new Set(companyContacts.map(cc => cc.company_id))]
            await adminClient.from('interaction_companies').insert(
              uniqueCompanyIds.map(companyId => ({
                interaction_id: interaction.id,
                company_id: companyId
              }))
            )
          }
        }
      }

      // Mark as imported
      await adminClient
        .from('fireflies_staged_meetings')
        .update({
          import_status: 'imported',
          imported_at: new Date().toISOString(),
          imported_to_interaction_id: interaction.id
        })
        .eq('id', meetingId)

      results.push({
        success: true,
        meetingId,
        title: staged.title
      })
    } catch (error) {
      results.push({
        success: false,
        meetingId,
        error: error instanceof Error ? error.message : 'Import failed'
      })
    }
  }

  const successCount = results.filter(r => r.success).length

  return {
    success: true,
    message: `Imported ${successCount} of ${meetingIds.length} meeting${meetingIds.length !== 1 ? 's' : ''}`,
    results
  }
}

/**
 * Exclude a meeting from import
 *
 * Updates meeting status to 'excluded' (keeps in database for audit trail)
 *
 * @param stagedMeetingId - ID of staged meeting to exclude
 * @returns Success/failure
 */
export async function excludeStagedMeeting(stagedMeetingId: string) {
  const { user } = await requireAuth()
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can exclude meetings'
    }
  }

  const tenantId = await getCurrentTenantId()

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update status to excluded
    const { error } = await adminClient
      .from('fireflies_staged_meetings')
      .update({
        import_status: 'excluded',
        excluded_at: new Date().toISOString(),
        excluded_by_user_id: user.id
      })
      .eq('id', stagedMeetingId)
      .eq('tenant_id', tenantId)

    if (error) {
      throw error
    }

    return {
      success: true,
      message: 'Meeting excluded from import'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to exclude meeting'
    }
  }
}

/**
 * Exclude multiple meetings (bulk operation)
 *
 * @param meetingIds - Array of staged meeting IDs to exclude
 * @returns Success/failure with count
 */
export async function excludeSelectedMeetings(meetingIds: string[]) {
  const { user } = await requireAuth()
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can exclude meetings'
    }
  }

  const tenantId = await getCurrentTenantId()

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update all to excluded
    const { error } = await adminClient
      .from('fireflies_staged_meetings')
      .update({
        import_status: 'excluded',
        excluded_at: new Date().toISOString(),
        excluded_by_user_id: user.id
      })
      .in('id', meetingIds)
      .eq('tenant_id', tenantId)

    if (error) {
      throw error
    }

    return {
      success: true,
      message: `Excluded ${meetingIds.length} meeting${meetingIds.length !== 1 ? 's' : ''}`,
      count: meetingIds.length
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to exclude meetings'
    }
  }
}

/**
 * Undo exclusion (move back to pending)
 *
 * @param meetingId - ID of excluded meeting to restore
 * @returns Success/failure
 */
export async function undoExclusion(meetingId: string) {
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can undo exclusions'
    }
  }

  const tenantId = await getCurrentTenantId()

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Move back to pending
    const { error } = await adminClient
      .from('fireflies_staged_meetings')
      .update({
        import_status: 'pending',
        excluded_at: null,
        excluded_by_user_id: null
      })
      .eq('id', meetingId)
      .eq('tenant_id', tenantId)

    if (error) {
      throw error
    }

    return {
      success: true,
      message: 'Meeting moved back to pending'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to undo exclusion'
    }
  }
}

/**
 * Test OpenAI API connection with provided API key
 *
 * Calls OpenAI API to validate the key works.
 * Does NOT save the key - this is just a test.
 *
 * @param apiKey - OpenAI API key to test
 * @returns Success/failure + model info from OpenAI
 */
export async function testOpenAIConnection(apiKey: string) {
  // Verify user is authenticated and is admin
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can configure AI integration'
    }
  }

  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      error: 'API key is required'
    }
  }

  try {
    // Call OpenAI API to validate key
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid API key'
        }
      }
      return {
        success: false,
        error: `OpenAI API error: ${response.statusText}`
      }
    }

    const result = await response.json()

    if (!result.data || !Array.isArray(result.data)) {
      return {
        success: false,
        error: 'Unexpected response from OpenAI API'
      }
    }

    return {
      success: true,
      message: 'Connection successful',
      models: result.data.length
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to OpenAI'
    }
  }
}

/**
 * Save OpenAI API key to Vault and update tenant_config
 *
 * Tests the connection first, then stores the key encrypted in Vault.
 * Updates tenant_config with secret_id and connection metadata.
 *
 * @param apiKey - OpenAI API key to save
 * @returns Success/failure
 */
export async function saveOpenAIKey(apiKey: string) {
  // Verify admin
  const { user } = await requireAuth()
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can configure AI integration'
    }
  }

  // Test connection first
  const testResult = await testOpenAIConnection(apiKey)
  if (!testResult.success) {
    return testResult
  }

  const tenantId = await getCurrentTenantId()

  try {
    // Create admin client for Vault operations (requires service role)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Store API key in Vault using wrapper function
    const secretName = `openai_${tenantId}`
    const { data: secretId, error: vaultError } = await adminClient
      .rpc('vault_create_secret', {
        new_secret: apiKey,
        new_name: secretName,
        new_description: `OpenAI API key for tenant ${tenantId}`
      })

    if (vaultError || !secretId) {
      console.error('Vault error:', vaultError)
      return {
        success: false,
        error: `Failed to store API key: ${vaultError?.message || 'Unknown error'}`
      }
    }

    // Update tenant_config with connection metadata
    const { error: configError } = await adminClient
      .from('tenant_config')
      .update({
        openai_api_key_secret_id: secretId,
        openai_connected_by: user.id,
        openai_connected_at: new Date().toISOString(),
        openai_connection_status: 'connected'
      })
      .eq('tenant_id', tenantId)

    if (configError) {
      // Rollback: delete the secret we just created
      await adminClient.rpc('vault_delete_secret', { secret_id: secretId })

      return {
        success: false,
        error: `Failed to save connection metadata: ${configError.message}`
      }
    }

    return {
      success: true,
      message: 'OpenAI connected successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save API key'
    }
  }
}

/**
 * Disconnect OpenAI integration
 *
 * Deletes API key from Vault and clears tenant_config metadata.
 *
 * @returns Success/failure
 */
export async function disconnectOpenAI() {
  // Verify admin
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can disconnect OpenAI'
    }
  }

  const tenantId = await getCurrentTenantId()

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get current secret_id
    const { data: config } = await adminClient
      .from('tenant_config')
      .select('openai_api_key_secret_id')
      .eq('tenant_id', tenantId)
      .single()

    const secretId = config?.openai_api_key_secret_id

    // Delete from Vault if exists
    if (secretId) {
      await adminClient.rpc('vault_delete_secret', { secret_id: secretId })
    }

    // Clear tenant_config
    const { error: configError } = await adminClient
      .from('tenant_config')
      .update({
        openai_api_key_secret_id: null,
        openai_connected_by: null,
        openai_connected_at: null,
        openai_connection_status: 'not_connected'
      })
      .eq('tenant_id', tenantId)

    if (configError) {
      return {
        success: false,
        error: `Failed to disconnect: ${configError.message}`
      }
    }

    return {
      success: true,
      message: 'OpenAI disconnected successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disconnect OpenAI'
    }
  }
}

/**
 * Toggle AI Integration on/off
 *
 * Updates feature_ai_integration flag in tenant_config.
 * Does not disconnect - just enables/disables the feature.
 *
 * @param enabled - True to enable, false to disable
 * @returns Success/failure
 */
export async function toggleAIIntegration(enabled: boolean) {
  // Verify admin
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can toggle AI Integration'
    }
  }

  const tenantId = await getCurrentTenantId()

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await adminClient
      .from('tenant_config')
      .update({ feature_ai_integration: enabled })
      .eq('tenant_id', tenantId)

    if (error) {
      return {
        success: false,
        error: `Failed to toggle AI Integration: ${error.message}`
      }
    }

    return {
      success: true,
      message: `AI Integration ${enabled ? 'enabled' : 'disabled'} successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle AI Integration'
    }
  }
}

/**
 * Toggle specific AI feature on/off
 *
 * Updates ai_features JSONB field in tenant_config.
 * Requires master AI Integration switch to be ON.
 *
 * Issue #69: Granular AI Feature Controls
 *
 * @param feature - Specific AI feature to toggle
 * @param enabled - True to enable, false to disable
 * @returns Success/failure
 */
export async function toggleAIFeature(
  feature: string,
  enabled: boolean
) {
  // Verify admin
  const role = await getCurrentUserRole()
  if (role !== 'admin') {
    return {
      success: false,
      error: 'Only administrators can toggle AI features'
    }
  }

  const tenantId = await getCurrentTenantId()

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get current config
    const { data: config, error: configError } = await adminClient
      .from('tenant_config')
      .select('ai_features, feature_ai_integration')
      .eq('tenant_id', tenantId)
      .single()

    if (configError || !config) {
      return {
        success: false,
        error: 'Failed to fetch configuration'
      }
    }

    // Ensure master switch is ON
    if (!config.feature_ai_integration) {
      return {
        success: false,
        error: 'AI Integration must be enabled first. Please enable the master switch.'
      }
    }

    // Update JSONB field
    const aiFeatures = (config.ai_features as Record<string, boolean>) || {}
    aiFeatures[feature] = enabled

    const { error: updateError } = await adminClient
      .from('tenant_config')
      .update({ ai_features: aiFeatures })
      .eq('tenant_id', tenantId)

    if (updateError) {
      return {
        success: false,
        error: `Failed to toggle feature: ${updateError.message}`
      }
    }

    // Revalidate all pages that might use AI features
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/settings')
    revalidatePath('/companies', 'layout') // Revalidate all company pages

    const featureName = feature.replace(/_/g, ' ')
    return {
      success: true,
      message: `${featureName} ${enabled ? 'enabled' : 'disabled'} successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle feature'
    }
  }
}

/**
 * Enable milestone tracking and seed default tracks
 *
 * Server action for enabling milestone tracking feature.
 * Seeds the 4 predefined tracks on first enable.
 *
 * @returns Success/failure with details
 */
export async function enableMilestoneTrackingAction() {
  try {
    // Verify user is authenticated and is admin
    const role = await getCurrentUserRole()
    if (role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can enable milestone tracking'
      }
    }

    // Import DAL functions
    const { enableMilestoneTracking } = await import('@/lib/dal/settings')
    const { seedMilestoneTracksIfNeeded } = await import('@/lib/dal/seed-milestones')

    // Enable the feature
    await enableMilestoneTracking()

    // Seed tracks if not already seeded
    const seedResult = await seedMilestoneTracksIfNeeded()

    // Revalidate relevant pages
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/settings')
    revalidatePath('/settings/milestone-tracking')
    revalidatePath('/companies', 'layout')

    if (seedResult.alreadySeeded) {
      return {
        success: true,
        message: 'Milestone tracking enabled successfully (tracks already existed)'
      }
    }

    const { result } = seedResult
    if (!result?.success) {
      return {
        success: false,
        error: `Milestone tracking enabled but seeding failed: ${result?.errors?.join(', ')}`
      }
    }

    return {
      success: true,
      message: `Milestone tracking enabled. Created ${result.tracksCreated} tracks with ${result.milestonesCreated} milestones.`,
      data: {
        tracksCreated: result.tracksCreated,
        milestonesCreated: result.milestonesCreated
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to enable milestone tracking'
    }
  }
}

/**
 * Disable milestone tracking
 *
 * Server action for disabling milestone tracking feature.
 * Does not delete existing data, only hides the feature.
 *
 * @returns Success/failure
 */
export async function disableMilestoneTrackingAction() {
  try {
    // Verify user is authenticated and is admin
    const role = await getCurrentUserRole()
    if (role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can disable milestone tracking'
      }
    }

    const { disableMilestoneTracking } = await import('@/lib/dal/settings')
    await disableMilestoneTracking()

    // Revalidate relevant pages
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/settings')
    revalidatePath('/settings/milestone-tracking')
    revalidatePath('/companies', 'layout')

    return {
      success: true,
      message: 'Milestone tracking disabled successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to disable milestone tracking'
    }
  }
}

/**
 * Update which milestone tracks are enabled
 *
 * @param trackSlugs - Array of track slugs to enable
 * @returns Success/failure
 */
export async function updateEnabledMilestoneTracksAction(trackSlugs: string[]) {
  try {
    // Verify user is authenticated and is admin
    const role = await getCurrentUserRole()
    if (role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can configure milestone tracks'
      }
    }

    const { updateEnabledMilestoneTracks } = await import('@/lib/dal/settings')
    await updateEnabledMilestoneTracks(trackSlugs)

    // Revalidate relevant pages
    const { revalidatePath } = await import('next/cache')
    revalidatePath('/settings')
    revalidatePath('/settings/milestone-tracking')
    revalidatePath('/companies', 'layout')

    return {
      success: true,
      message: 'Enabled tracks updated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update enabled tracks'
    }
  }
}

/**
 * Create a new milestone definition
 *
 * @param trackId - Track ID
 * @param data - Milestone data
 * @returns Success/failure
 */
export async function createMilestoneDefinitionAction(
  trackId: string,
  data: {
    name: string
    evidence_description: string
    objective_signal: string
    order_position: number
  }
) {
  try {
    const role = await getCurrentUserRole()
    if (role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can create milestones'
      }
    }

    const { createMilestoneDefinition } = await import('@/lib/dal/milestone-definitions')

    await createMilestoneDefinition({
      track_id: trackId,
      name: data.name,
      evidence_description: data.evidence_description,
      objective_signal: data.objective_signal,
      order_position: data.order_position
    })

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/settings/milestone-tracking')

    return {
      success: true,
      message: 'Milestone created successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create milestone'
    }
  }
}

/**
 * Update a milestone definition
 *
 * @param milestoneId - Milestone ID
 * @param data - Updated milestone data
 * @returns Success/failure
 */
export async function updateMilestoneDefinitionAction(
  milestoneId: string,
  data: {
    name?: string
    evidence_description?: string
    objective_signal?: string
  }
) {
  try {
    const role = await getCurrentUserRole()
    if (role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can update milestones'
      }
    }

    const { updateMilestoneDefinition } = await import('@/lib/dal/milestone-definitions')

    // Update with version increment for significant changes
    await updateMilestoneDefinition(milestoneId, data, true)

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/settings/milestone-tracking')
    revalidatePath('/companies', 'layout')

    return {
      success: true,
      message: 'Milestone updated successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update milestone'
    }
  }
}

/**
 * Delete (soft delete) a milestone definition
 *
 * @param milestoneId - Milestone ID
 * @returns Success/failure
 */
export async function deleteMilestoneDefinitionAction(milestoneId: string) {
  try {
    const role = await getCurrentUserRole()
    if (role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can delete milestones'
      }
    }

    const { deleteMilestoneDefinition } = await import('@/lib/dal/milestone-definitions')

    await deleteMilestoneDefinition(milestoneId)

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/settings/milestone-tracking')
    revalidatePath('/companies', 'layout')

    return {
      success: true,
      message: 'Milestone deleted successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete milestone'
    }
  }
}

/**
 * Reorder milestone definitions
 *
 * @param trackId - Track ID
 * @param milestoneIds - Array of milestone IDs in desired order
 * @returns Success/failure
 */
export async function reorderMilestoneDefinitionsAction(
  trackId: string,
  milestoneIds: string[]
) {
  try {
    const role = await getCurrentUserRole()
    if (role !== 'admin') {
      return {
        success: false,
        error: 'Only administrators can reorder milestones'
      }
    }

    const { reorderMilestoneDefinitions } = await import('@/lib/dal/milestone-definitions')

    await reorderMilestoneDefinitions(trackId, milestoneIds)

    const { revalidatePath } = await import('next/cache')
    revalidatePath('/settings/milestone-tracking')

    return {
      success: true,
      message: 'Milestones reordered successfully'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reorder milestones'
    }
  }
}
