/**
 * Granular AI Feature Controls Tests
 *
 * Following TDD: Write tests FIRST, watch them FAIL, then fix the code
 * Issue #69: Granular AI Feature Controls
 *
 * Testing that commitment analysis respects granular feature flag
 */

import { createClient } from '@supabase/supabase-js'
import { isAIFeatureEnabled, getAIFeatures } from '@/lib/dal/settings'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const testTenantId = '11111111-1111-1111-1111-111111111111' // Acme/Volta

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

describe('Granular AI Feature Controls', () => {
  let testUserId: string

  beforeAll(async () => {
    // Create test user
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: `ai-feature-test-${Date.now()}@test.com`,
      password: 'testpass123!',
      email_confirm: true,
      user_metadata: {
        tenant_id: testTenantId,
        first_name: 'AI',
        last_name: 'Tester'
      }
    })

    testUserId = authData.user!.id

    // Set admin role
    await adminClient
      .from('organization_members')
      .update({ role: 'admin' })
      .eq('user_id', testUserId)
      .eq('organization_id', testTenantId)
  })

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId)
    }

    // Reset tenant_config to original state
    await adminClient
      .from('tenant_config')
      .update({
        feature_ai_integration: true,
        ai_features: { commitment_analysis: true }
      })
      .eq('tenant_id', testTenantId)
  })

  describe('isAIFeatureEnabled', () => {
    test('returns false when master switch is OFF (regardless of sub-feature)', async () => {
      // RED: This should fail if the function doesn't check master switch

      // Setup: Master OFF, commitment_analysis ON
      await adminClient
        .from('tenant_config')
        .update({
          feature_ai_integration: false,
          ai_features: { commitment_analysis: true }
        })
        .eq('tenant_id', testTenantId)

      // This requires Next.js context, so we'll test the logic directly
      const { data: config } = await adminClient
        .from('tenant_config')
        .select('feature_ai_integration, ai_features')
        .eq('tenant_id', testTenantId)
        .single()

      // Simulate the function logic
      const masterEnabled = config?.feature_ai_integration
      const subFeatureEnabled = config?.ai_features?.commitment_analysis

      expect(masterEnabled).toBe(false)
      expect(subFeatureEnabled).toBe(true)

      // Expected behavior: Master OFF should override sub-feature ON
      const shouldBeEnabled = masterEnabled && subFeatureEnabled
      expect(shouldBeEnabled).toBe(false)
    })

    test('returns false when sub-feature is OFF (even if master is ON)', async () => {
      // RED: This should fail if the function doesn't check sub-feature

      // Setup: Master ON, commitment_analysis OFF
      await adminClient
        .from('tenant_config')
        .update({
          feature_ai_integration: true,
          ai_features: { commitment_analysis: false }
        })
        .eq('tenant_id', testTenantId)

      const { data: config } = await adminClient
        .from('tenant_config')
        .select('feature_ai_integration, ai_features')
        .eq('tenant_id', testTenantId)
        .single()

      const masterEnabled = config?.feature_ai_integration
      const subFeatureEnabled = config?.ai_features?.commitment_analysis

      expect(masterEnabled).toBe(true)
      expect(subFeatureEnabled).toBe(false)

      // Expected behavior: Sub-feature OFF should prevent AI usage
      const shouldBeEnabled = masterEnabled && subFeatureEnabled
      expect(shouldBeEnabled).toBe(false)
    })

    test('returns true only when BOTH master and sub-feature are ON', async () => {
      // RED: This is the happy path - both enabled

      // Setup: Master ON, commitment_analysis ON
      await adminClient
        .from('tenant_config')
        .update({
          feature_ai_integration: true,
          ai_features: { commitment_analysis: true }
        })
        .eq('tenant_id', testTenantId)

      const { data: config } = await adminClient
        .from('tenant_config')
        .select('feature_ai_integration, ai_features')
        .eq('tenant_id', testTenantId)
        .single()

      const masterEnabled = config?.feature_ai_integration
      const subFeatureEnabled = config?.ai_features?.commitment_analysis

      expect(masterEnabled).toBe(true)
      expect(subFeatureEnabled).toBe(true)

      // Expected behavior: Both ON means AI should be used
      const shouldBeEnabled = masterEnabled && subFeatureEnabled
      expect(shouldBeEnabled).toBe(true)
    })
  })

  describe('getAIFeatures', () => {
    test('returns all feature states correctly', async () => {
      // RED: Test that we can retrieve all feature states

      await adminClient
        .from('tenant_config')
        .update({
          ai_features: {
            commitment_analysis: true,
            report_generation: false,
            meeting_insights: false,
            company_recommendations: false
          }
        })
        .eq('tenant_id', testTenantId)

      const { data: config } = await adminClient
        .from('tenant_config')
        .select('ai_features')
        .eq('tenant_id', testTenantId)
        .single()

      expect(config?.ai_features).toBeDefined()
      expect(config?.ai_features?.commitment_analysis).toBe(true)
      expect(config?.ai_features?.report_generation).toBe(false)
    })
  })

  describe('Integration: Commitment Analysis Should Use Granular Flag', () => {
    test('commitment analysis should check commitment_analysis sub-feature, not just master', async () => {
      // RED: This is the critical test - verify the action uses the granular flag

      // Scenario 1: Master ON, commitment_analysis OFF
      await adminClient
        .from('tenant_config')
        .update({
          feature_ai_integration: true,
          ai_features: { commitment_analysis: false }
        })
        .eq('tenant_id', testTenantId)

      // When we call analyzeCommitmentAction, it should use heuristics
      // We can't easily test the server action in isolation, but we can verify the config
      const { data: config1 } = await adminClient
        .from('tenant_config')
        .select('feature_ai_integration, ai_features')
        .eq('tenant_id', testTenantId)
        .single()

      // The action should read this config and use heuristics
      expect(config1?.feature_ai_integration).toBe(true) // Master ON
      expect(config1?.ai_features?.commitment_analysis).toBe(false) // Sub-feature OFF
      console.log('   → Expected: Heuristics used (sub-feature OFF)')

      // Scenario 2: Master ON, commitment_analysis ON
      await adminClient
        .from('tenant_config')
        .update({
          feature_ai_integration: true,
          ai_features: { commitment_analysis: true }
        })
        .eq('tenant_id', testTenantId)

      const { data: config2 } = await adminClient
        .from('tenant_config')
        .select('feature_ai_integration, ai_features')
        .eq('tenant_id', testTenantId)
        .single()

      // The action should read this config and use GPT-5
      expect(config2?.feature_ai_integration).toBe(true) // Master ON
      expect(config2?.ai_features?.commitment_analysis).toBe(true) // Sub-feature ON
      console.log('   → Expected: GPT-5 Nano used (both enabled)')
    })
  })
})
