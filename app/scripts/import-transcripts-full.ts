/**
 * Import ALL Meeting Transcripts from Fireflies
 *
 * Full import of all meetings from Fireflies with external contacts.
 *
 * Usage: npm run import:transcripts:full
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const VOLTA_TENANT_ID = '11111111-1111-1111-1111-111111111111'
const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql'

// Multi Tenant connection
const mtClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Fireflies GraphQL query helper
async function queryFireflies(query: string, variables: any = {}) {
  const response = await fetch(FIREFLIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.FIREFLIES_API_KEY}`
    },
    body: JSON.stringify({ query, variables })
  })

  if (!response.ok) {
    throw new Error(`Fireflies API error: ${response.statusText}`)
  }

  const result = await response.json()
  if (result.errors) {
    throw new Error(`Fireflies GraphQL error: ${JSON.stringify(result.errors)}`)
  }

  return result.data
}

interface EmailContactMapping {
  email: string
  mt_contact_id: string
  first_name: string
  last_name: string
}

interface FirefliesTranscript {
  id: string
  title: string
  date: string
  duration: number
  organizer_email: string
  participants: string[]
  transcript: {
    sentences: Array<{
      text: string
      speaker_name: string
      speaker_id: number
      start_time: number
      end_time: number
    }>
  }
  summary: {
    keywords: string[]
    action_items: string[]
    outline: string
    shorthand_bullet: string
    overview: string
    bullet_gist: string
    notes: string  // Full detailed markdown summary - what Fireflies displays!
  }
}

async function main() {
  console.log('🚀 FULL IMPORT: Importing ALL transcripts from Fireflies...')
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
    console.error('❌ Error fetching MT contacts:', mtError)
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

  // Step 2: Query Fireflies for recent transcripts
  console.log('\n🔥 Step 2: Querying Fireflies for transcripts...')
  const emailList = Array.from(emailToContact.keys())

  // Query Fireflies GraphQL for recent transcripts (max 50 per query)
  // We'll query by date range and filter by participants in memory
  const transcriptsQuery = `
    query GetTranscripts($limit: Int!, $skip: Int!) {
      transcripts(limit: $limit, skip: $skip) {
        id
        title
        date
        duration
        organizer_email
        participants
        transcript_url
        audio_url
        video_url
        summary {
          keywords
          action_items
          outline
          shorthand_bullet
          overview
          bullet_gist
          notes
        }
      }
    }
  `

  console.log(`   Querying Fireflies for transcripts (will fetch up to 1000)...`)
  let allTranscripts: any[] = []

  // Fetch transcripts in batches of 50 with proper pagination
  for (let batchNum = 0; batchNum < 20; batchNum++) {
    const transcriptsData = await queryFireflies(transcriptsQuery, {
      limit: 50,
      skip: batchNum * 50  // Proper pagination!
    })

    const batch = transcriptsData.transcripts || []
    allTranscripts.push(...batch)

    console.log(`   Fetched batch ${batchNum + 1}: ${batch.length} transcripts (offset ${batchNum * 50})`)

    if (batch.length < 50) break // No more transcripts
  }

  console.log(`   ✓ Total transcripts fetched: ${allTranscripts.length}`)

  // Filter out meetings that only have @voltaeffect.com participants
  const externalTranscripts = allTranscripts.filter((t: any) => {
    const participants = t.participants || []
    return participants.some((email: string) =>
      !email.includes('@voltaeffect.com') && emailToContact.has(email.toLowerCase())
    )
  })

  console.log(`   ✓ Found ${externalTranscripts.length} transcripts with external contacts`)
  console.log(`   📋 Will import ALL ${externalTranscripts.length} transcripts`)

  // Step 3: Import all meetings
  console.log('\n💾 Step 3: Importing all interactions and transcripts...')
  let imported = 0
  let skipped = 0
  let errors = 0
  const importedIds: string[] = []

  for (const ffTranscript of externalTranscripts) {
    try {
      console.log(`\n   📄 Processing: "${ffTranscript.title}"`)

      // Check if this transcript already exists
      const { data: existing } = await mtClient
        .from('interactions')
        .select('id')
        .eq('tenant_id', VOLTA_TENANT_ID)
        .eq('fireflies_transcript_id', ffTranscript.id)
        .single()

      if (existing) {
        console.log(`      ⏭️  Skipping - already imported`)
        skipped++
        continue
      }

      // Fetch full transcript data from Fireflies
      const transcriptQuery = `
        query GetTranscript($transcriptId: String!) {
          transcript(id: $transcriptId) {
            id
            title
            date
            duration
            organizer_email
            participants
            sentences {
              text
              speaker_name
              speaker_id
              start_time
              end_time
            }
            summary {
              keywords
              action_items
              outline
              shorthand_bullet
              overview
              bullet_gist
            }
          }
        }
      `

      const fullData = await queryFireflies(transcriptQuery, {
        transcriptId: ffTranscript.id
      })

      const fullTranscript = fullData.transcript

      // Convert sentences to verbatim transcript format
      const verbatimTranscript = fullTranscript.sentences
        ?.map((s: any) => `${s.speaker_name}: ${s.text}`)
        .join('\n') || ''

      console.log(`      - Transcript: ${verbatimTranscript.length} chars`)
      console.log(`      - Shorthand: ${fullTranscript.summary?.shorthand_bullet?.length || 0} chars`)
      console.log(`      - Overview: ${fullTranscript.summary?.overview?.length || 0} chars`)

      // Convert Unix timestamp (milliseconds) to ISO date string
      const meetingDate = fullTranscript.date
        ? new Date(parseInt(fullTranscript.date)).toISOString()
        : null

      // Create interaction - Use shorthand_bullet for rich formatted summary
      const { data: interaction, error: intError} = await mtClient
        .from('interactions')
        .insert({
          tenant_id: VOLTA_TENANT_ID,
          title: fullTranscript.title,
          meeting_date: meetingDate,
          interaction_type: 'meeting',
          fireflies_transcript_id: fullTranscript.id,
          summary: fullTranscript.summary?.shorthand_bullet || fullTranscript.summary?.overview || '',
          duration_minutes: Math.round(fullTranscript.duration || 0)
        })
        .select('id')
        .single()

      if (intError) {
        console.error(`      ❌ Error creating interaction:`, intError.message)
        errors++
        continue
      }

      console.log(`      ✓ Interaction created: ${interaction.id}`)
      importedIds.push(interaction.id)

      // Build speakers JSONB from sentences
      const speakersMap = new Map<number, string>()
      fullTranscript.sentences?.forEach((s: any) => {
        speakersMap.set(s.speaker_id, s.speaker_name)
      })
      const speakers = Array.from(speakersMap.entries()).map(([id, name]) => ({
        id,
        name
      }))

      // Create meeting_transcript
      const { error: transcriptError } = await mtClient
        .from('meeting_transcripts')
        .insert({
          tenant_id: VOLTA_TENANT_ID,
          interaction_id: interaction.id,
          fireflies_transcript_id: fullTranscript.id,
          transcript: verbatimTranscript,
          transcript_outline: fullTranscript.summary?.outline || null,
          transcript_detailed_summary: fullTranscript.summary?.shorthand_bullet || null,  // Use shorthand_bullet
          fireflies_summary: fullTranscript.summary?.overview || null,
          fireflies_action_items: typeof fullTranscript.summary?.action_items === 'string'
            ? fullTranscript.summary.action_items
            : (Array.isArray(fullTranscript.summary?.action_items)
              ? fullTranscript.summary.action_items.join('\n')
              : null),
          speakers: speakers,
          participants: fullTranscript.participants || [],
          meeting_attendees: fullTranscript.participants || [],
          processing_status: 'completed',
          processed_at: new Date().toISOString()
        })

      if (transcriptError) {
        console.error(`      ❌ Error creating transcript:`, transcriptError.message)
        throw transcriptError // Stop so we can see the error
      } else {
        console.log(`      ✓ Transcript created with ${verbatimTranscript.length} chars`)
      }

      // Link contacts based on participant emails
      const participants = fullTranscript.participants || []
      const contactLinks: any[] = []
      const uniqueContacts = new Set<string>()

      participants.forEach((email: string) => {
        const mapping = emailToContact.get(email.toLowerCase())
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
          console.error(`      ❌ Error linking contacts:`, linkError.message)
        } else {
          console.log(`      ✓ Linked ${contactLinks.length} contact(s)`)
        }
      }

      // Get company associations
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

          const { error: compError } = await mtClient
            .from('interaction_companies')
            .insert(companyInserts)

          if (compError) {
            console.error(`      ❌ Error linking companies:`, compError.message)
          } else {
            console.log(`      ✓ Linked ${uniqueCompanies.size} company/companies`)
          }
        }
      }

      imported++

      // Progress reporting
      if ((imported + skipped) % 10 === 0) {
        console.log(`\n   📊 Progress: ${imported} imported, ${skipped} skipped, ${errors} errors`)
      }

    } catch (error: any) {
      console.error(`   ❌ Error importing transcript ${ffTranscript.id}:`, error.message)
      errors++
    }
  }

  console.log(`\n✅ FULL IMPORT COMPLETE!`)
  console.log(`   - ${imported} new interactions imported`)
  console.log(`   - ${skipped} already existed (skipped)`)
  console.log(`   - ${errors} errors`)

  // Verification
  console.log('\n📊 Verifying import...')
  for (const intId of importedIds) {
    const { data: intData } = await mtClient
      .from('interactions')
      .select(`
        id,
        title,
        meeting_date,
        fireflies_transcript_id,
        interaction_contacts(count),
        interaction_companies(count),
        meeting_transcripts:meeting_transcripts(
          id,
          transcript
        )
      `)
      .eq('id', intId)
      .single()

    if (intData) {
      console.log(`   ✓ ${intData.title}`)
      console.log(`      - Contacts linked: ${(intData.interaction_contacts as any)?.[0]?.count || 0}`)
      console.log(`      - Companies linked: ${(intData.interaction_companies as any)?.[0]?.count || 0}`)
      console.log(`      - Has transcript: ${intData.meeting_transcripts && intData.meeting_transcripts.length > 0 && intData.meeting_transcripts[0].transcript ? 'Yes' : 'No'}`)
    }
  }

  const { count: intCount } = await mtClient
    .from('interactions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', VOLTA_TENANT_ID)

  const { count: transCount } = await mtClient
    .from('meeting_transcripts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', VOLTA_TENANT_ID)

  console.log(`\n📈 Total in Volta tenant:`)
  console.log(`   - ${intCount} interactions`)
  console.log(`   - ${transCount} meeting transcripts`)
  console.log(`\n✅ Full import complete! All transcripts with external contacts have been imported.`)
}

main().catch((error) => {
  console.error('\n❌ Full import failed:', error)
  process.exit(1)
})
