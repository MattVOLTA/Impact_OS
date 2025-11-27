/**
 * Test Date Extraction with GPT-5 Nano
 */

import { createClient } from '@supabase/supabase-js'
import { analyzeCommitmentWithGPT5 } from '../lib/ai/openai-client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const testTenantId = '11111111-1111-1111-1111-111111111111'

async function testDateExtraction() {
  console.log('🧪 Testing Date Extraction with GPT-5 Nano\n')
  console.log('Today\'s date:', new Date().toISOString().split('T')[0])
  console.log('='.repeat(70))

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Get API key
  const { data: config } = await adminClient
    .from('tenant_config')
    .select('openai_api_key_secret_id')
    .eq('tenant_id', testTenantId)
    .single()

  const { data: apiKey } = await adminClient.rpc('vault_read_secret', {
    secret_id: config!.openai_api_key_secret_id!
  })

  const testCommitments = [
    'Increase sales by 20% in the next 90 days',
    'Send 3 intros by Friday',
    'Launch MVP in 2 weeks',
    'Hire engineer by end of month',
    'Reach $10K MRR this quarter'
  ]

  for (const commitment of testCommitments) {
    console.log(`\n📝 Testing: "${commitment}"`)

    try {
      const result = await analyzeCommitmentWithGPT5(apiKey as string, commitment)

      console.log(`   Extracted Date: ${result.extracted_date}`)

      if (result.extracted_date) {
        const extractedDate = new Date(result.extracted_date)
        const today = new Date()
        const daysFromNow = Math.round((extractedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        console.log(`   Formatted: ${extractedDate.toDateString()}`)
        console.log(`   Days from now: ${daysFromNow}`)
      } else {
        console.log('   ⚠️  No date extracted')
      }

      console.log(`   Score: ${result.measurability_score}/10`)
      console.log(`   Measurable: ${result.is_measurable}`)

    } catch (error) {
      console.error(`   ❌ Error:`, error)
    }
  }

  console.log('\n' + '='.repeat(70))
}

testDateExtraction()
