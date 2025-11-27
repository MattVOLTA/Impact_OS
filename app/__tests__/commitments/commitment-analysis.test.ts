/**
 * Commitment Analysis Tests
 *
 * Tests for GPT-5 Nano commitment validation and heuristic fallback
 * Issue #68: AI-Powered Commitment Validation
 */

import { createClient } from '@supabase/supabase-js'
import { analyzeWithHeuristics } from '@/lib/ai/openai-client'
import { getOpenAIKeyFromVault, isFeatureEnabled } from '@/lib/dal/settings'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const testTenantId = '11111111-1111-1111-1111-111111111111' // Acme Accelerator

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

describe('Commitment Analysis', () => {
  let testUserId: string

  beforeAll(async () => {
    // Create admin test user
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: `commitment-test-${Date.now()}@test.com`,
      password: 'testpass123!',
      email_confirm: true,
      user_metadata: {
        tenant_id: testTenantId,
        first_name: 'Test',
        last_name: 'User'
      }
    })

    testUserId = authData.user!.id

    // Set user role to admin
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
  })

  describe('analyzeWithHeuristics', () => {
    test('extracts date when text contains "friday"', () => {
      const result = analyzeWithHeuristics('Send 3 intros by Friday')

      expect(result.extracted_date).toBeTruthy()
      expect(result.is_measurable).toBe(true) // Contains number
      expect(result.measurability_score).toBe(7)
    })

    test('extracts date when text contains "tomorrow"', () => {
      const result = analyzeWithHeuristics('Launch MVP tomorrow')

      expect(result.extracted_date).toBeTruthy()
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const extractedDate = new Date(result.extracted_date!)

      expect(extractedDate.getDate()).toBe(tomorrow.getDate())
    })

    test('identifies measurable commitment with numbers', () => {
      const result = analyzeWithHeuristics('Send 5 customer intros')

      expect(result.is_measurable).toBe(true)
      expect(result.measurability_score).toBe(7)
      expect(result.suggestion).toBeNull()
    })

    test('identifies non-measurable commitment without numbers', () => {
      const result = analyzeWithHeuristics('Work on marketing')

      expect(result.is_measurable).toBe(false)
      expect(result.measurability_score).toBe(3)
      expect(result.suggestion).toBeTruthy()
      expect(result.suggestion).toContain('number')
    })

    test('returns SMART criteria breakdown', () => {
      const result = analyzeWithHeuristics('Send 3 intros by Friday')

      expect(result.smart_criteria).toBeDefined()
      expect(result.smart_criteria?.measurable).toBe(true)
      expect(result.smart_criteria?.time_bound).toBe(true)
    })
  })

  describe('getOpenAIKeyFromVault', () => {
    test.skip('returns null when no API key configured', async () => {
      // Skip: Requires Next.js request context
      // Test manually or in E2E tests

      // Ensure OpenAI not configured for test tenant
      await adminClient
        .from('tenant_config')
        .update({ openai_api_key_secret_id: null })
        .eq('tenant_id', testTenantId)

      const apiKey = await getOpenAIKeyFromVault()

      expect(apiKey).toBeNull()
    })

    test('retrieves API key from vault when configured', async () => {
      // This test requires actual vault secret setup
      // Skip if not configured
      const { data: config } = await adminClient
        .from('tenant_config')
        .select('openai_api_key_secret_id')
        .eq('tenant_id', testTenantId)
        .single()

      if (!config?.openai_api_key_secret_id) {
        console.log('Skipping vault retrieval test - no secret configured')
        return
      }

      const apiKey = await getOpenAIKeyFromVault()

      expect(apiKey).toBeTruthy()
      expect(typeof apiKey).toBe('string')
      // API key should start with 'sk-'
      expect(apiKey?.startsWith('sk-')).toBe(true)
    })
  })

  describe('isFeatureEnabled - ai_integration', () => {
    test.skip('returns false when AI Integration disabled', async () => {
      // Skip: Requires Next.js request context
      // Test manually or in E2E tests

      // Ensure feature disabled
      await adminClient
        .from('tenant_config')
        .update({ feature_ai_integration: false })
        .eq('tenant_id', testTenantId)

      const enabled = await isFeatureEnabled('ai_integration')

      expect(enabled).toBe(false)
    })

    test.skip('returns true when AI Integration enabled', async () => {
      // Skip: Requires Next.js request context
      // Test manually or in E2E tests

      // Enable feature
      await adminClient
        .from('tenant_config')
        .update({ feature_ai_integration: true })
        .eq('tenant_id', testTenantId)

      const enabled = await isFeatureEnabled('ai_integration')

      expect(enabled).toBe(true)

      // Cleanup: disable again
      await adminClient
        .from('tenant_config')
        .update({ feature_ai_integration: false })
        .eq('tenant_id', testTenantId)
    })
  })
})

/**
 * Integration Tests
 *
 * These tests require:
 * 1. AI Integration enabled
 * 2. Valid OpenAI API key in vault
 * 3. Internet connection to OpenAI API
 *
 * Run separately: npm test -- --testNamePattern="GPT-5 Integration"
 */
describe('GPT-5 Integration (requires OpenAI setup)', () => {
  test.skip('analyzes commitment with GPT-5 Nano when AI enabled', async () => {
    // This is an integration test requiring real OpenAI API key
    // Enable by removing .skip and ensuring:
    // 1. AI Integration enabled
    // 2. OpenAI API key in vault
    // 3. feature_ai_integration = true

    const { analyzeCommitmentAction } = await import('@/app/(dashboard)/companies/[id]/actions')

    const result = await analyzeCommitmentAction('Send 3 customer intros by Friday')

    expect(result.success).toBe(true)
    expect(result.data?.is_measurable).toBe(true)
    expect(result.data?.extracted_date).toBeTruthy()
    expect(result.data?.measurability_score).toBeGreaterThanOrEqual(7)
  })

  test.skip('provides suggestions for non-measurable commitments', async () => {
    const { analyzeCommitmentAction } = await import('@/app/(dashboard)/companies/[id]/actions')

    const result = await analyzeCommitmentAction('Work on marketing')

    expect(result.success).toBe(true)
    expect(result.data?.is_measurable).toBe(false)
    expect(result.data?.measurability_score).toBeLessThan(7)
    expect(result.data?.suggestion).toBeTruthy()
  })
})
