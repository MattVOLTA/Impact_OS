/**
 * Test Single Tenant connection and verify data availability
 */

import { createClient } from '@supabase/supabase-js'

const SINGLE_TENANT_URL = process.env.SINGLE_TENANT_SUPABASE_URL!
const SINGLE_TENANT_SERVICE_KEY = process.env.SINGLE_TENANT_SERVICE_ROLE_KEY!

if (!SINGLE_TENANT_URL || !SINGLE_TENANT_SERVICE_KEY) {
  console.error('❌ Missing Single Tenant credentials in .env.local:')
  console.error('   - SINGLE_TENANT_SUPABASE_URL')
  console.error('   - SINGLE_TENANT_SERVICE_ROLE_KEY')
  process.exit(1)
}

const stClient = createClient(SINGLE_TENANT_URL, SINGLE_TENANT_SERVICE_KEY)

async function main() {
  console.log('Testing Single Tenant connection...\n')

  try {
    // Test connection and count meetings
    const { data, error, count } = await stClient
      .from('meeting_transcripts')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    console.log(`✅ Connection successful!`)
    console.log(`📊 Total meetings: ${count}`)

    // Get sample meeting
    const { data: sample } = await stClient
      .from('meeting_transcripts')
      .select('id, meeting_title, meeting_date, fireflies_id, speakers, participants')
      .not('fireflies_id', 'is', null)
      .limit(1)
      .single()

    if (sample) {
      console.log(`\n📝 Sample meeting:`)
      console.log(`   Title: ${sample.meeting_title}`)
      console.log(`   Date: ${sample.meeting_date}`)
      console.log(`   Fireflies ID: ${sample.fireflies_id}`)
      console.log(`   Speakers: ${sample.speakers?.length || 0}`)
      console.log(`   Participants: ${sample.participants?.length || 0}`)
    }

  } catch (error: any) {
    console.error('❌ Connection failed:', error.message)
    process.exit(1)
  }
}

main()
