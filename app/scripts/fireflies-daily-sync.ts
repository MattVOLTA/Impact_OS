/**
 * Fireflies Daily Sync Script (Simplified - No Filters)
 *
 * Fetches ALL meetings from Fireflies and adds them to the staging queue.
 * No automatic filtering - user reviews everything in the queue.
 *
 * How it works:
 * 1. Fetch ALL meetings from Fireflies API (lightweight metadata only)
 * 2. Stage meetings in fireflies_staged_meetings table with import_status='pending'
 * 3. Skip duplicates (already staged or imported)
 * 4. Match participants to contacts for smart badges
 * 5. Update last_sync_at timestamp
 *
 * Stage 2 (import) happens separately via Settings UI when user manually selects meetings.
 */

import { createClient } from '@supabase/supabase-js'
import { createFirefliesClient } from '../lib/fireflies/client'
import 'dotenv/config'

interface TenantConfig {
  tenant_id: string
  tenant_name: string
  fireflies_sync_start_date: string | null
  fireflies_last_sync_at: string | null
  fireflies_api_key_secret_id: string
}

interface SyncStats {
  tenant: string
  fetched: number
  staged: number
  skipped: number
  errors: number
}

/**
 * Main sync function
 */
async function main() {
  console.log('🔥 Fireflies Sync Started')
  console.log('Timestamp:', new Date().toISOString())

  // Initialize Supabase client (service role for admin operations)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all tenants with Fireflies enabled
  const tenants = await getTenantsWithFirefliesEnabled(supabase)

  if (tenants.length === 0) {
    console.log('ℹ️  No tenants with Fireflies enabled found')
    return
  }

  console.log(`\n📊 Found ${tenants.length} tenant(s) with Fireflies enabled`)

  const allStats: SyncStats[] = []

  // Process each tenant
  for (const tenant of tenants) {
    try {
      const stats = await processTenant(tenant, supabase)
      allStats.push(stats)
    } catch (error) {
      console.error(`❌ Error processing tenant ${tenant.tenant_name}:`, error)
      allStats.push({
        tenant: tenant.tenant_name,
        fetched: 0,
        staged: 0,
        skipped: 0,
        errors: 1
      })
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📈 SYNC SUMMARY')
  console.log('='.repeat(60))

  allStats.forEach(stats => {
    console.log(`\n${stats.tenant}:`)
    console.log(`  Fetched:  ${stats.fetched}`)
    console.log(`  Staged:   ${stats.staged}`)
    console.log(`  Skipped:  ${stats.skipped}`)
    console.log(`  Errors:   ${stats.errors}`)
  })

  const totals = allStats.reduce(
    (acc, s) => ({
      fetched: acc.fetched + s.fetched,
      staged: acc.staged + s.staged,
      skipped: acc.skipped + s.skipped,
      errors: acc.errors + s.errors
    }),
    { fetched: 0, staged: 0, skipped: 0, errors: 0 }
  )

  console.log('\n' + '-'.repeat(60))
  console.log('TOTALS:')
  console.log(`  Fetched:  ${totals.fetched}`)
  console.log(`  Staged:   ${totals.staged}`)
  console.log(`  Skipped:  ${totals.skipped}`)
  console.log(`  Errors:   ${totals.errors}`)
  console.log('='.repeat(60))

  console.log('\n✅ Sync Complete')
}

/**
 * Get all tenants with Fireflies enabled
 */
async function getTenantsWithFirefliesEnabled(supabase: any): Promise<TenantConfig[]> {
  const { data, error } = await supabase
    .from('tenant_config')
    .select(
      `
      tenant_id,
      fireflies_sync_start_date,
      fireflies_last_sync_at,
      fireflies_api_key_secret_id,
      feature_fireflies,
      tenants:tenant_id (name)
    `
    )
    .eq('feature_fireflies', true)
    .not('fireflies_api_key_secret_id', 'is', null)

  if (error) {
    throw new Error(`Failed to fetch tenants: ${error.message}`)
  }

  return data
    .filter((row: any) => row.tenants)
    .map((row: any) => ({
      tenant_id: row.tenant_id,
      tenant_name: row.tenants.name,
      fireflies_sync_start_date: row.fireflies_sync_start_date,
      fireflies_last_sync_at: row.fireflies_last_sync_at,
      fireflies_api_key_secret_id: row.fireflies_api_key_secret_id
    }))
}

/**
 * Process a single tenant - fetch and stage ALL meetings
 */
async function processTenant(
  tenant: TenantConfig,
  supabase: any
): Promise<SyncStats> {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`🏢 Processing: ${tenant.tenant_name}`)
  console.log('─'.repeat(60))

  const stats: SyncStats = {
    tenant: tenant.tenant_name,
    fetched: 0,
    staged: 0,
    skipped: 0,
    errors: 0
  }

  // Retrieve API key from Vault
  const { data: apiKey, error: vaultError } = await supabase
    .rpc('vault_read_secret', { secret_id: tenant.fireflies_api_key_secret_id })

  if (vaultError || !apiKey) {
    console.error('❌ Failed to retrieve API key from Vault:', vaultError)
    throw new Error('Failed to retrieve Fireflies API key from Vault')
  }

  // Initialize Fireflies client with tenant-specific API key
  const firefliesClient = createFirefliesClient(apiKey)

  // Determine date range
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const syncStartDate = tenant.fireflies_sync_start_date
    ? new Date(tenant.fireflies_sync_start_date)
    : ninetyDaysAgo

  // Start from last sync OR sync start date (whichever is more recent)
  const fromDate = tenant.fireflies_last_sync_at
    ? new Date(tenant.fireflies_last_sync_at)
    : syncStartDate

  const toDate = new Date()

  console.log(`📅 Sync start date: ${syncStartDate.toISOString()}`)
  console.log(`📅 Fetching meetings from ${fromDate.toISOString()} to ${toDate.toISOString()}`)

  // Fetch ALL meetings from Fireflies (lightweight metadata only)
  const meetings = await firefliesClient.fetchMeetingsByDateRange(fromDate, toDate)
  stats.fetched = meetings.length

  console.log(`✅ Fetched ${meetings.length} meeting(s)`)

  if (meetings.length === 0) {
    console.log('ℹ️  No new meetings to process')
    await updateLastSync(supabase, tenant.tenant_id)
    return stats
  }

  // Stage ALL meetings (only skip duplicates)
  for (const meeting of meetings) {
    try {
      // Skip if already staged or imported (duplicate prevention)
      const alreadyExists = await checkIfMeetingExists(supabase, tenant.tenant_id, meeting.id)

      if (alreadyExists) {
        console.log(`⏩ Skipping (already exists): ${meeting.title}`)
        stats.skipped++
        continue
      }

      // Match participants to contacts (for smart badges)
      const matchedEmails = await matchParticipantsToContacts(
        supabase,
        tenant.tenant_id,
        meeting.participants
      )

      const matchType = matchedEmails.length > 0 ? 'known_contact' : 'no_match'

      // Stage the meeting (no filtering, no exclusions)
      await stageMeeting(supabase, {
        tenant_id: tenant.tenant_id,
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

      stats.staged++
      console.log(`✅ Staged: ${meeting.title} (match: ${matchType})`)
    } catch (error) {
      console.error(`❌ Error staging meeting ${meeting.title}:`, error)
      stats.errors++
    }
  }

  // Update last sync timestamp
  await updateLastSync(supabase, tenant.tenant_id)

  console.log(`\n✅ Tenant processing complete`)
  return stats
}

/**
 * Check if meeting already exists (staged or imported)
 */
async function checkIfMeetingExists(
  supabase: any,
  tenantId: string,
  transcriptId: string
): Promise<boolean> {
  // Check staged meetings
  const { data: staged } = await supabase
    .from('fireflies_staged_meetings')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('fireflies_transcript_id', transcriptId)
    .single()

  if (staged) return true

  // Check imported interactions
  const { data: imported } = await supabase
    .from('interactions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('fireflies_transcript_id', transcriptId)
    .single()

  return !!imported
}

/**
 * Match participants to existing contacts
 */
async function matchParticipantsToContacts(
  supabase: any,
  tenantId: string,
  participants: string[]
): Promise<string[]> {
  if (participants.length === 0) return []

  const { data } = await supabase
    .from('contact_emails')
    .select('email, contacts!inner(tenant_id)')
    .eq('contacts.tenant_id', tenantId)
    .in('email', participants)

  return data?.map((c: any) => c.email) || []
}

/**
 * Stage a meeting (simplified - no filtering)
 */
async function stageMeeting(supabase: any, meeting: any) {
  const { error } = await supabase.from('fireflies_staged_meetings').insert({
    tenant_id: meeting.tenant_id,
    fireflies_transcript_id: meeting.fireflies_transcript_id,
    title: meeting.title,
    meeting_date: meeting.meeting_date,
    duration_seconds: meeting.duration_seconds,
    organizer_email: meeting.organizer_email,
    host_email: meeting.host_email,
    participants: meeting.participants,
    match_type: meeting.match_type,
    matched_emails: meeting.matched_emails,
    import_status: meeting.import_status,
    staged_at: meeting.staged_at
  })

  if (error) {
    throw new Error(`Failed to stage meeting: ${error.message}`)
  }
}

/**
 * Update last sync timestamp
 */
async function updateLastSync(supabase: any, tenantId: string) {
  const { error } = await supabase
    .from('tenant_config')
    .update({ fireflies_last_sync_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('Failed to update last sync timestamp:', error)
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error)
  process.exit(1)
})
