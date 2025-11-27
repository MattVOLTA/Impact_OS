/**
 * Import Meeting Transcripts from Single Tenant to Multi Tenant
 *
 * This script imports meeting transcripts from the Single Tenant Supabase instance
 * to the Multi Tenant instance for the Volta tenant.
 *
 * Usage: npm run import-transcripts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const VOLTA_TENANT_ID = '11111111-1111-1111-1111-111111111111'
const BATCH_SIZE = 50

// Multi Tenant connection
const mtClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Single Tenant connection - will use from .env.local
const stClient = createClient(
  process.env.SINGLE_TENANT_SUPABASE_URL!,
  process.env.SINGLE_TENANT_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface EmailContactMapping {
  email: string
  mt_contact_id: string
  first_name: string
  last_name: string
}

interface Speaker {
  id: number
  name: string
  person_id?: string
}

interface STMeeting {
  id: string
  fireflies_id: string
  meeting_title: string
  meeting_date: string
  fireflies_summary: string
  transcript_detailed_summary: string
  fireflies_action_items: string
  speakers: Speaker[]
  participants: any
  meeting_attendees: any
}

async function main() {
  console.log('🚀 Starting transcript import from Single Tenant to Multi Tenant...')
  console.log(`Target: Volta tenant (${VOLTA_TENANT_ID})`)

  // Step 1: Get all Multi Tenant contact emails for matching
  console.log('\n📧 Step 1: Fetching Multi Tenant contact emails...')
  const { data: mtContactEmails, error: mtError } = await mtClient
    .from('contact_emails')
    .select(`
      email,
      contact_id,
      contacts!inner(first_name, last_name, tenant_id)
    `)
    .eq('contacts.tenant_id', VOLTA_TENANT_ID)

  if (mtError) {
    console.error('Error fetching MT contacts:', mtError)
    throw mtError
  }

  // Build email to contact ID mapping (exclude voltaeffect.com)
  const emailToContact = new Map<string, EmailContactMapping>()
  mtContactEmails?.forEach((record: any) => {
    if (!record.email.includes('@voltaeffect.com')) {
      emailToContact.set(record.email.toLowerCase(), {
        email: record.email,
        mt_contact_id: record.contact_id,
        first_name: record.contacts.first_name,
        last_name: record.contacts.last_name
      })
    }
  })

  console.log(`   ✓ Found ${emailToContact.size} external contact emails in Multi Tenant`)

  // Step 2: Get matching people from Single Tenant
  console.log('\n🔍 Step 2: Finding matching people in Single Tenant...')
  const emailList = Array.from(emailToContact.keys())

  const { data: stPeople, error: stPeopleError } = await stClient
    .from('emails')
    .select('email, people_id, is_primary')
    .in('email', emailList)
    .eq('is_primary', true)

  if (stPeopleError) {
    console.error('Error fetching ST people:', stPeopleError)
    throw stPeopleError
  }

  // Build person_id to email mapping
  const personIdToEmail = new Map<string, string>()
  stPeople?.forEach(p => {
    personIdToEmail.set(p.people_id, p.email.toLowerCase())
  })

  console.log(`   ✓ Found ${personIdToEmail.size} matching people in Single Tenant`)

  // Step 3: Get ALL meeting IDs where these people are speakers
  console.log('\n📝 Step 3: Finding meetings with matched contacts...')

  // We need to query all meetings and filter by speakers in memory
  // because Supabase doesn't support complex JSONB queries well
  let allMatchedMeetingIds: string[] = []
  let offset = 0
  const queryLimit = 1000

  while (true) {
    const { data: meetingBatch, error: batchError } = await stClient
      .from('meeting_transcripts')
      .select('id, speakers, meeting_date')
      .not('fireflies_id', 'is', null)
      .order('meeting_date', { ascending: false })
      .range(offset, offset + queryLimit - 1)

    if (batchError) throw batchError
    if (!meetingBatch || meetingBatch.length === 0) break

    // Filter meetings where at least one speaker matches our contacts
    const matched = meetingBatch.filter(m => {
      const speakers = m.speakers as Speaker[]
      if (!speakers) return false
      return speakers.some(s => s.person_id && personIdToEmail.has(s.person_id))
    })

    allMatchedMeetingIds.push(...matched.map(m => m.id))

    console.log(`   Processed ${offset + meetingBatch.length} meetings, found ${allMatchedMeetingIds.length} matches so far...`)

    if (meetingBatch.length < queryLimit) break
    offset += queryLimit
  }

  console.log(`   ✓ Found ${allMatchedMeetingIds.length} meetings to import`)

  // Step 4: Import in batches
  console.log('\n💾 Step 4: Importing interactions and transcripts...')
  let imported = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < allMatchedMeetingIds.length; i += BATCH_SIZE) {
    const batchIds = allMatchedMeetingIds.slice(i, i + BATCH_SIZE)

    console.log(`\n   Batch ${Math.floor(i / BATCH_SIZE) + 1}: Processing ${batchIds.length} meetings...`)

    // Fetch meeting metadata (without large text fields first)
    const { data: metadataBatch, error: metaError } = await stClient
      .from('meeting_transcripts')
      .select(`
        id,
        fireflies_id,
        meeting_title,
        meeting_date,
        fireflies_summary,
        transcript_detailed_summary,
        speakers,
        participants,
        meeting_attendees
      `)
      .in('id', batchIds)

    if (metaError) {
      console.error(`Error fetching batch metadata:`, metaError)
      errors += batchIds.length
      continue
    }

    // Process each meeting
    for (const meeting of metadataBatch || []) {
      try {
        // Create interaction
        const { data: interaction, error: intError } = await mtClient
          .from('interactions')
          .insert({
            tenant_id: VOLTA_TENANT_ID,
            title: meeting.meeting_title,
            meeting_date: meeting.meeting_date,
            interaction_type: 'meeting',
            fireflies_transcript_id: meeting.fireflies_id,
            summary: meeting.transcript_detailed_summary || meeting.fireflies_summary || ''
          })
          .select('id')
          .single()

        if (intError) {
          console.error(`   ✗ Error creating interaction for ${meeting.meeting_title}:`, intError.message)
          errors++
          continue
        }

        // Now fetch the full transcript data for this single meeting
        const { data: fullMeeting, error: fullError } = await stClient
          .from('meeting_transcripts')
          .select('transcript, transcript_outline, transcript_detailed_summary, fireflies_action_items')
          .eq('id', meeting.id)
          .single()

        // Create meeting_transcript with full data
        const { error: transcriptError } = await mtClient
          .from('meeting_transcripts')
          .insert({
            tenant_id: VOLTA_TENANT_ID,
            interaction_id: interaction.id,
            fireflies_transcript_id: meeting.fireflies_id,
            transcript: fullMeeting?.transcript || null,
            transcript_outline: fullMeeting?.transcript_outline || null,
            transcript_detailed_summary: fullMeeting?.transcript_detailed_summary || null,
            fireflies_summary: meeting.fireflies_summary,
            fireflies_action_items: fullMeeting?.fireflies_action_items || null,
            speakers: meeting.speakers,
            participants: meeting.participants,
            meeting_attendees: meeting.meeting_attendees,
            processing_status: 'completed',
            processed_at: new Date().toISOString()
          })

        if (transcriptError) {
          console.error(`   ✗ Error creating transcript:`, transcriptError.message)
          // Don't fail the whole import, continue
        }

        // Link contacts
        const speakers = meeting.speakers as Speaker[]
        const speakerPersonIds = speakers.filter(s => s.person_id).map(s => s.person_id!)

        // Find emails for these speakers
        const { data: speakerEmails } = await stClient
          .from('emails')
          .select('email, people_id')
          .in('people_id', speakerPersonIds)
          .eq('is_primary', true)

        // Create contact links
        const contactLinks: any[] = []
        const uniqueContacts = new Set<string>()

        speakerEmails?.forEach(se => {
          const mapping = emailToContact.get(se.email.toLowerCase())
          if (mapping && !uniqueContacts.has(mapping.mt_contact_id)) {
            uniqueContacts.add(mapping.mt_contact_id)
            contactLinks.push({
              interaction_id: interaction.id,
              contact_id: mapping.mt_contact_id,
              auto_matched: true,
              match_confidence: 'high'
            })
          }
        })

        if (contactLinks.length > 0) {
          const { error: linkError } = await mtClient
            .from('interaction_contacts')
            .insert(contactLinks)

          if (linkError) {
            console.error(`   ✗ Error linking contacts:`, linkError.message)
          }
        }

        // Get company associations for these contacts
        const contactIds = Array.from(uniqueContacts)
        if (contactIds.length > 0) {
          const { data: companyLinks } = await mtClient
            .from('company_contacts')
            .select('company_id')
            .in('contact_id', contactIds)

          const uniqueCompanies = new Set(companyLinks?.map(c => c.company_id) || [])
          if (uniqueCompanies.size > 0) {
            const companyInserts = Array.from(uniqueCompanies).map(companyId => ({
              interaction_id: interaction.id,
              company_id: companyId
            }))

            await mtClient.from('interaction_companies').insert(companyInserts)
          }
        }

        imported++
        if (imported % 10 === 0) {
          console.log(`   Progress: ${imported}/${metadataBatch.length} in this batch`)
        }

      } catch (error) {
        console.error(`   ✗ Error importing meeting ${meeting.id}:`, error)
        errors++
      }
    }
  }

  console.log(`\n✅ Import complete!`)
  console.log(`   - ${imported} interactions imported`)
  console.log(`   - ${imported} meeting transcripts imported`)
  console.log(`   - ${skipped} meetings skipped`)
  console.log(`   - ${errors} errors`)

  // Final verification
  const { count: intCount } = await mtClient
    .from('interactions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', VOLTA_TENANT_ID)

  const { count: transCount } = await mtClient
    .from('meeting_transcripts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', VOLTA_TENANT_ID)

  console.log(`\n📊 Final counts:`)
  console.log(`   - ${intCount} interactions in Volta tenant`)
  console.log(`   - ${transCount} meeting transcripts in Volta tenant`)
}

main().catch((error) => {
  console.error('\n❌ Import failed:', error)
  process.exit(1)
})
