/**
 * Import meeting transcripts from Single Tenant to Multi Tenant Supabase
 *
 * This script:
 * 1. Gets Volta contact emails from Multi Tenant contact_emails table
 * 2. Finds Single Tenant meetings where speakers have those emails (excludes @voltaeffect.com)
 * 3. Imports each meeting with interactions, transcripts, and links
 * 4. Creates missing external contacts with emails in contact_emails table
 * 5. Works in batches of 50
 */

import { createClient } from '@supabase/supabase-js'

// Environment variables
const MULTI_TENANT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const MULTI_TENANT_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SINGLE_TENANT_URL = process.env.SINGLE_TENANT_SUPABASE_URL!
const SINGLE_TENANT_SERVICE_KEY = process.env.SINGLE_TENANT_SERVICE_ROLE_KEY!

const VOLTA_TENANT_ID = '11111111-1111-1111-1111-111111111111'
const BATCH_SIZE = 50

// Create clients
const mtClient = createClient(MULTI_TENANT_URL, MULTI_TENANT_SERVICE_KEY)
const stClient = createClient(SINGLE_TENANT_URL, SINGLE_TENANT_SERVICE_KEY)

interface ImportStats {
  totalMeetings: number
  importedInteractions: number
  importedTranscripts: number
  createdContacts: number
  linkedContacts: number
  linkedCompanies: number
  errors: Array<{ meeting_id: string; error: string }>
}

interface ContactEmailMap {
  [email: string]: {
    contact_id: string
    first_name: string
    last_name: string
  }
}

async function getVoltaContactEmails(): Promise<ContactEmailMap> {
  console.log('Fetching Volta contact emails from Multi Tenant...')

  const { data, error } = await mtClient
    .from('contact_emails')
    .select(`
      email,
      contact:contacts!inner(
        id,
        first_name,
        last_name,
        tenant_id
      )
    `)
    .eq('contact.tenant_id', VOLTA_TENANT_ID)

  if (error) throw error

  const emailMap: ContactEmailMap = {}
  data.forEach((row: any) => {
    emailMap[row.email.toLowerCase()] = {
      contact_id: row.contact.id,
      first_name: row.contact.first_name,
      last_name: row.contact.last_name
    }
  })

  console.log(`Found ${Object.keys(emailMap).length} contact emails`)
  return emailMap
}

async function getMeetingsWithVoltaContacts(emailMap: ContactEmailMap): Promise<any[]> {
  console.log('Fetching meetings from Single Tenant...')

  const emails = Object.keys(emailMap)

  // Get meetings where speakers contain any of the Volta contact emails (excluding @voltaeffect.com)
  const { data, error } = await stClient
    .from('meeting_transcripts')
    .select('*')
    .not('fireflies_id', 'is', null)
    .order('meeting_date', { ascending: false })

  if (error) throw error

  console.log(`Fetched ${data.length} total meetings from Single Tenant`)

  // Filter meetings that have at least one non-Volta speaker with a matching email
  const relevantMeetings = data.filter(meeting => {
    if (!meeting.speakers || !Array.isArray(meeting.speakers)) return false

    return meeting.speakers.some((speaker: any) => {
      const speakerEmail = speaker.email?.toLowerCase() ||
                          meeting.participants?.find((p: string) =>
                            p.toLowerCase().includes(speaker.name?.toLowerCase() || '')
                          )?.toLowerCase()

      if (!speakerEmail) return false
      if (speakerEmail.includes('@voltaeffect.com')) return false

      return emails.some(email => speakerEmail.includes(email))
    })
  })

  console.log(`Found ${relevantMeetings.length} meetings with Volta contacts (excluding Volta staff)`)
  return relevantMeetings
}

async function createMissingContact(
  email: string,
  name: string,
  existingMap: ContactEmailMap
): Promise<string> {
  console.log(`Creating missing contact for ${email}...`)

  // Split name
  const nameParts = name.trim().split(' ')
  const firstName = nameParts[0] || 'Unknown'
  const lastName = nameParts.slice(1).join(' ') || 'Unknown'

  // Create contact
  const { data: contact, error: contactError } = await mtClient
    .from('contacts')
    .insert({
      tenant_id: VOLTA_TENANT_ID,
      first_name: firstName,
      last_name: lastName,
      role: 'founder' // Default role
    })
    .select()
    .single()

  if (contactError) throw contactError

  // Create contact email
  const { error: emailError } = await mtClient
    .from('contact_emails')
    .insert({
      contact_id: contact.id,
      email: email,
      email_type: 'work',
      is_primary: true
    })

  if (emailError) throw emailError

  // Update the map
  existingMap[email.toLowerCase()] = {
    contact_id: contact.id,
    first_name: firstName,
    last_name: lastName
  }

  console.log(`Created contact ${firstName} ${lastName} (${contact.id})`)
  return contact.id
}

async function importMeeting(
  meeting: any,
  emailMap: ContactEmailMap,
  stats: ImportStats
): Promise<void> {
  try {
    console.log(`\nImporting meeting: ${meeting.meeting_title} (${meeting.fireflies_id})`)

    // Check if already imported
    const { data: existing } = await mtClient
      .from('interactions')
      .select('id')
      .eq('fireflies_transcript_id', meeting.fireflies_id)
      .single()

    if (existing) {
      console.log('  ⏭️  Already imported, skipping...')
      return
    }

    // Create interaction
    const { data: interaction, error: interactionError } = await mtClient
      .from('interactions')
      .insert({
        tenant_id: VOLTA_TENANT_ID,
        fireflies_transcript_id: meeting.fireflies_id,
        title: meeting.meeting_title,
        meeting_date: meeting.meeting_date,
        summary: meeting.fireflies_summary || meeting.transcript_detailed_summary,
        notes: null, // No notes from import
        duration_minutes: null, // Not available in old schema
        interaction_type: 'meeting'
      })
      .select()
      .single()

    if (interactionError) throw interactionError
    stats.importedInteractions++
    console.log(`  ✓ Created interaction ${interaction.id}`)

    // Create meeting transcript
    const { error: transcriptError } = await mtClient
      .from('meeting_transcripts')
      .insert({
        tenant_id: VOLTA_TENANT_ID,
        interaction_id: interaction.id,
        fireflies_transcript_id: meeting.fireflies_id,
        transcript: meeting.transcript,
        transcript_outline: meeting.transcript_outline,
        transcript_detailed_summary: meeting.transcript_detailed_summary,
        fireflies_summary: meeting.fireflies_summary,
        fireflies_action_items: meeting.fireflies_action_items,
        speakers: meeting.speakers,
        participants: meeting.participants,
        meeting_attendees: meeting.meeting_attendees,
        processing_status: 'completed',
        processed_at: meeting.processed_at || meeting.created_at
      })

    if (transcriptError) throw transcriptError
    stats.importedTranscripts++
    console.log(`  ✓ Created transcript`)

    // Link contacts based on speakers
    const contactIds = new Set<string>()

    if (meeting.speakers && Array.isArray(meeting.speakers)) {
      for (const speaker of meeting.speakers) {
        // Try to find email in participants
        let speakerEmail: string | null = null

        if (meeting.participants && Array.isArray(meeting.participants)) {
          for (const participant of meeting.participants) {
            const participantStr = participant.toLowerCase()
            if (participantStr.includes(speaker.name?.toLowerCase() || '___NO_MATCH___')) {
              // Extract email from participant string
              const emailMatch = participantStr.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
              if (emailMatch) {
                speakerEmail = emailMatch[0]
                break
              }
            }
          }
        }

        if (!speakerEmail) continue
        if (speakerEmail.includes('@voltaeffect.com')) continue

        const emailLower = speakerEmail.toLowerCase()
        let contactId: string

        // Check if contact exists in our map
        if (emailMap[emailLower]) {
          contactId = emailMap[emailLower].contact_id
        } else {
          // Create missing contact
          contactId = await createMissingContact(speakerEmail, speaker.name || 'Unknown', emailMap)
          stats.createdContacts++
        }

        contactIds.add(contactId)
      }
    }

    // Insert contact links
    for (const contactId of contactIds) {
      const { error: linkError } = await mtClient
        .from('interaction_contacts')
        .insert({
          interaction_id: interaction.id,
          contact_id: contactId,
          auto_matched: true,
          match_confidence: 'high'
        })

      if (linkError && !linkError.message.includes('duplicate')) {
        console.error(`  ⚠️  Error linking contact ${contactId}:`, linkError.message)
      } else if (!linkError) {
        stats.linkedContacts++
        console.log(`  ✓ Linked contact ${contactId}`)
      }
    }

    // Link company if exists
    if (meeting.company_id) {
      // Check if company exists in Multi Tenant
      const { data: company } = await mtClient
        .from('companies')
        .select('id')
        .eq('tenant_id', VOLTA_TENANT_ID)
        .limit(1)
        .single()

      if (company) {
        const { error: companyLinkError } = await mtClient
          .from('interaction_companies')
          .insert({
            interaction_id: interaction.id,
            company_id: company.id
          })

        if (companyLinkError && !companyLinkError.message.includes('duplicate')) {
          console.error(`  ⚠️  Error linking company:`, companyLinkError.message)
        } else if (!companyLinkError) {
          stats.linkedCompanies++
          console.log(`  ✓ Linked company ${company.id}`)
        }
      }
    }

    console.log(`  ✅ Successfully imported meeting`)

  } catch (error: any) {
    console.error(`  ❌ Error importing meeting ${meeting.fireflies_id}:`, error.message)
    stats.errors.push({
      meeting_id: meeting.fireflies_id,
      error: error.message
    })
  }
}

async function main() {
  console.log('='.repeat(80))
  console.log('IMPORT MEETINGS FROM SINGLE TENANT TO MULTI TENANT')
  console.log('='.repeat(80))
  console.log(`Target: Volta tenant (${VOLTA_TENANT_ID})`)
  console.log(`Batch size: ${BATCH_SIZE}`)
  console.log('')

  const stats: ImportStats = {
    totalMeetings: 0,
    importedInteractions: 0,
    importedTranscripts: 0,
    createdContacts: 0,
    linkedContacts: 0,
    linkedCompanies: 0,
    errors: []
  }

  try {
    // Step 1: Get Volta contact emails
    const emailMap = await getVoltaContactEmails()

    // Step 2: Get meetings with Volta contacts
    const meetings = await getMeetingsWithVoltaContacts(emailMap)
    stats.totalMeetings = meetings.length

    // Step 3: Import meetings in batches
    console.log(`\nImporting ${meetings.length} meetings in batches of ${BATCH_SIZE}...`)
    console.log('')

    for (let i = 0; i < meetings.length; i += BATCH_SIZE) {
      const batch = meetings.slice(i, i + BATCH_SIZE)
      console.log(`\n--- Batch ${Math.floor(i / BATCH_SIZE) + 1} (${i + 1}-${Math.min(i + BATCH_SIZE, meetings.length)} of ${meetings.length}) ---`)

      for (const meeting of batch) {
        await importMeeting(meeting, emailMap, stats)
      }

      // Small delay between batches
      if (i + BATCH_SIZE < meetings.length) {
        console.log('\nWaiting 1 second before next batch...')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }

  // Print summary
  console.log('\n' + '='.repeat(80))
  console.log('IMPORT SUMMARY')
  console.log('='.repeat(80))
  console.log(`Total meetings found:      ${stats.totalMeetings}`)
  console.log(`Interactions imported:     ${stats.importedInteractions}`)
  console.log(`Transcripts imported:      ${stats.importedTranscripts}`)
  console.log(`New contacts created:      ${stats.createdContacts}`)
  console.log(`Contacts linked:           ${stats.linkedContacts}`)
  console.log(`Companies linked:          ${stats.linkedCompanies}`)
  console.log(`Errors:                    ${stats.errors.length}`)

  if (stats.errors.length > 0) {
    console.log('\nErrors encountered:')
    stats.errors.forEach(err => {
      console.log(`  - ${err.meeting_id}: ${err.error}`)
    })
  }

  console.log('\n✅ Import complete!')
}

main()
