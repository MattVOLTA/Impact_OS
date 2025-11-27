/**
 * Debug Commitment Analysis Flow
 *
 * Simulates the exact flow when user types a commitment
 * to see where GPT-5 calls might be failing
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const testTenantId = '11111111-1111-1111-1111-111111111111' // Volta

async function debugCommitmentAnalysis() {
  console.log('🔍 Debugging Commitment Analysis Flow\n')
  console.log('='.repeat(70))

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    // Step 1: Check tenant_config state
    console.log('\n📋 Step 1: Checking tenant_config...')
    const { data: config, error: configError } = await adminClient
      .from('tenant_config')
      .select('feature_ai_integration, ai_features, openai_api_key_secret_id, openai_connection_status')
      .eq('tenant_id', testTenantId)
      .single()

    if (configError) {
      console.error('   ❌ Error fetching config:', configError)
      return
    }

    console.log('   Master Switch (feature_ai_integration):', config?.feature_ai_integration)
    console.log('   AI Features (JSONB):', JSON.stringify(config?.ai_features, null, 2))
    console.log('   OpenAI Connection Status:', config?.openai_connection_status)
    console.log('   Has Secret ID:', config?.openai_api_key_secret_id ? 'Yes' : 'No')

    // Step 2: Simulate isAIFeatureEnabled logic
    console.log('\n🔍 Step 2: Simulating isAIFeatureEnabled("commitment_analysis")...')

    const masterEnabled = config?.feature_ai_integration
    const aiFeatures = (config?.ai_features as Record<string, boolean>) || {}
    const subFeatureEnabled = aiFeatures.commitment_analysis

    console.log('   Master enabled:', masterEnabled)
    console.log('   Sub-feature enabled:', subFeatureEnabled)
    console.log('   Result (master AND sub-feature):', masterEnabled && subFeatureEnabled)

    if (!masterEnabled) {
      console.log('   ⚠️  MASTER SWITCH IS OFF - This is why GPT-5 isn\'t being called!')
      console.log('   Fix: Enable AI Integration master switch in Settings')
      return
    }

    if (!subFeatureEnabled) {
      console.log('   ⚠️  COMMITMENT ANALYSIS SUB-FEATURE IS OFF - This is why GPT-5 isn\'t being called!')
      console.log('   Fix: Enable "Commitment Analysis" toggle in Settings → AI Features')
      return
    }

    console.log('   ✅ Both flags enabled - GPT-5 should be called')

    // Step 3: Check API key retrieval
    console.log('\n🔑 Step 3: Checking API key retrieval...')

    if (!config?.openai_api_key_secret_id) {
      console.log('   ❌ No secret_id in tenant_config')
      console.log('   Fix: Reconnect OpenAI in Settings')
      return
    }

    console.log('   Secret ID:', config.openai_api_key_secret_id)

    const { data: apiKey, error: vaultError } = await adminClient.rpc('vault_read_secret', {
      secret_id: config.openai_api_key_secret_id
    })

    if (vaultError || !apiKey) {
      console.log('   ❌ Failed to retrieve API key from vault:', vaultError)
      return
    }

    console.log('   ✅ API Key retrieved successfully (starts with:', (apiKey as string).substring(0, 7) + '...)')

    // Step 4: Test actual GPT-5 call
    console.log('\n🤖 Step 4: Testing GPT-5 Nano call...')
    console.log('   Analyzing: "Send 3 customer intros by Friday"\n')

    const { analyzeCommitmentWithGPT5 } = await import('../lib/ai/openai-client')

    try {
      const result = await analyzeCommitmentWithGPT5(apiKey as string, 'Send 3 customer intros by Friday')

      console.log('   ✅ GPT-5 Response:')
      console.log('      Measurable:', result.is_measurable)
      console.log('      Score:', result.measurability_score + '/10')
      console.log('      Date:', result.extracted_date ? new Date(result.extracted_date).toDateString() : 'None')
      console.log('      Suggestion:', result.suggestion || 'None')
    } catch (error) {
      console.error('   ❌ GPT-5 call failed:', error)
      return
    }

    console.log('\n' + '='.repeat(70))
    console.log('✅ DIAGNOSIS: Everything is configured correctly!')
    console.log('\nIf GPT-5 is not being called in the UI:')
    console.log('1. Check browser DevTools → Console for errors')
    console.log('2. Check browser DevTools → Network tab for "openai" calls')
    console.log('3. Hard refresh the page (Cmd+Shift+R)')
    console.log('4. Verify you\'re on the Volta organization')
    console.log('5. Check that the server action is being called')

  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error)
  }
}

debugCommitmentAnalysis()
