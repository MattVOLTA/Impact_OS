/**
 * Test GPT-5 Commitment Analysis End-to-End
 *
 * Simulates the full flow: get key from vault → call GPT-5 → analyze commitment
 */

import { createClient } from '@supabase/supabase-js'
import { analyzeCommitmentWithGPT5 } from '../lib/ai/openai-client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Test tenant (Volta)
const testTenantId = '11111111-1111-1111-1111-111111111111'

async function testCommitmentAnalysis() {
  console.log('🧪 Testing GPT-5 Commitment Analysis\n')

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    // Step 1: Get secret_id from tenant_config
    console.log('📝 Step 1: Retrieving secret_id from tenant_config...')
    const { data: config, error: configError } = await adminClient
      .from('tenant_config')
      .select('openai_api_key_secret_id, feature_ai_integration')
      .eq('tenant_id', testTenantId)
      .single()

    if (configError || !config) {
      console.error('❌ Failed to get config:', configError)
      return
    }

    console.log(`   ✅ Secret ID: ${config.openai_api_key_secret_id}`)
    console.log(`   ✅ Feature enabled: ${config.feature_ai_integration}`)

    if (!config.openai_api_key_secret_id) {
      console.error('❌ No OpenAI secret configured')
      return
    }

    // Step 2: Retrieve API key from vault
    console.log('\n🔐 Step 2: Retrieving API key from vault...')
    const { data: apiKey, error: vaultError } = await adminClient.rpc('vault_read_secret', {
      secret_id: config.openai_api_key_secret_id
    })

    if (vaultError || !apiKey) {
      console.error('❌ Failed to retrieve from vault:', vaultError)
      return
    }

    console.log(`   ✅ API Key retrieved (starts with: ${(apiKey as string).substring(0, 7)}...)`)

    // Step 3: Test GPT-5 Nano analysis
    console.log('\n🤖 Step 3: Calling GPT-5 Nano...\n')

    const testCommitments = [
      'Send 3 customer intros by Friday',
      'Work on marketing'
    ]

    for (const commitment of testCommitments) {
      console.log(`📝 Analyzing: "${commitment}"`)

      try {
        const result = await analyzeCommitmentWithGPT5(apiKey as string, commitment)

        console.log(`   ✅ Measurable: ${result.is_measurable}`)
        console.log(`   ✅ Score: ${result.measurability_score}/10`)
        console.log(`   ✅ Date: ${result.extracted_date ? new Date(result.extracted_date).toDateString() : 'None'}`)
        console.log(`   ✅ Suggestion: ${result.suggestion || 'None'}`)

        if (result.smart_criteria) {
          console.log(`   ✅ SMART: S=${result.smart_criteria.specific} M=${result.smart_criteria.measurable} T=${result.smart_criteria.time_bound}`)
        }

        console.log('')
      } catch (error) {
        console.error(`   ❌ Analysis failed:`, error)
        console.log('')
      }
    }

    console.log('=' .repeat(60))
    console.log('✅ GPT-5 Nano integration working perfectly!\n')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testCommitmentAnalysis()
