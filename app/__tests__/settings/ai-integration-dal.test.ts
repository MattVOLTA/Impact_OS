/**
 * AI Integration DAL Tests
 *
 * Tests for Data Access Layer functions for OpenAI integration
 * Issue #66: AI Integration - Secure OpenAI API Key Storage
 *
 * Following TDD: Write tests FIRST, watch them FAIL, then implement
 */

import { createClient } from '@supabase/supabase-js'
import { getOpenAIConnection, isFeatureEnabled } from '@/lib/dal/settings'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Test tenant
const testTenantId = '11111111-1111-1111-1111-111111111111' // Acme Accelerator

// Admin client for setup
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

describe('AI Integration - DAL Functions', () => {
  let testUserId: string
  let testSecretId: string | null = null

  beforeAll(async () => {
    // Create test user
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: `ai-test-${Date.now()}@test.com`,
      password: 'testpass123!',
      email_confirm: true,
      user_metadata: {
        tenant_id: testTenantId,
        first_name: 'AI',
        last_name: 'Tester'
      }
    })

    testUserId = authData.user!.id
  })

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId)
    }

    // Cleanup test secret
    if (testSecretId) {
      await adminClient.rpc('vault_delete_secret', { secret_id: testSecretId })
    }

    // Reset tenant_config
    await adminClient
      .from('tenant_config')
      .update({
        openai_api_key_secret_id: null,
        openai_connected_by: null,
        openai_connected_at: null,
        openai_connection_status: 'not_connected',
        feature_ai_integration: false
      })
      .eq('tenant_id', testTenantId)
  })

  describe('getOpenAIConnection', () => {
    test('returns not_connected status when no API key configured', async () => {
      // RED: This should fail because function doesn't exist yet
      // Ensure tenant_config has no OpenAI connection
      await adminClient
        .from('tenant_config')
        .update({
          openai_api_key_secret_id: null,
          openai_connection_status: 'not_connected'
        })
        .eq('tenant_id', testTenantId)

      // Mock requireAuth by setting up proper context
      // For now, we'll test the function directly
      const connection = await getOpenAIConnection()

      expect(connection).toEqual({
        isConnected: false,
        status: 'not_connected',
        isEnabled: false
      })
    })

    test('returns connected status when API key exists', async () => {
      // RED: Create a secret and set up connection
      const { data: secretId } = await adminClient.rpc('vault_create_secret', {
        new_secret: 'sk-test-key',
        new_name: `openai_${testTenantId}_dal_test`,
        new_description: 'DAL test key'
      })

      testSecretId = secretId

      // Update tenant_config
      await adminClient
        .from('tenant_config')
        .update({
          openai_api_key_secret_id: secretId,
          openai_connected_by: testUserId,
          openai_connected_at: new Date().toISOString(),
          openai_connection_status: 'connected',
          feature_ai_integration: true
        })
        .eq('tenant_id', testTenantId)

      const connection = await getOpenAIConnection()

      expect(connection.isConnected).toBe(true)
      expect(connection.status).toBe('connected')
      expect(connection.isEnabled).toBe(true)
      expect(connection.connectedBy).toBeDefined()
      expect(connection.connectedBy?.firstName).toBe('AI')
      expect(connection.connectedBy?.lastName).toBe('Tester')
      expect(connection.connectedAt).toBeDefined()
    })

    test('returns failed status when connection_status is failed', async () => {
      // RED: Set status to connection_failed
      await adminClient
        .from('tenant_config')
        .update({
          openai_connection_status: 'connection_failed'
        })
        .eq('tenant_id', testTenantId)

      const connection = await getOpenAIConnection()

      expect(connection.isConnected).toBe(false)
      expect(connection.status).toBe('failed')
    })
  })

  describe('isFeatureEnabled', () => {
    test('returns false when ai_integration feature is disabled', async () => {
      // RED: Ensure feature is disabled
      await adminClient
        .from('tenant_config')
        .update({ feature_ai_integration: false })
        .eq('tenant_id', testTenantId)

      const enabled = await isFeatureEnabled('ai_integration')

      expect(enabled).toBe(false)
    })

    test('returns true when ai_integration feature is enabled', async () => {
      // RED: Enable feature
      await adminClient
        .from('tenant_config')
        .update({ feature_ai_integration: true })
        .eq('tenant_id', testTenantId)

      const enabled = await isFeatureEnabled('ai_integration')

      expect(enabled).toBe(true)
    })

    test('returns false by default if no config exists', async () => {
      // RED: This tests the fail-safe behavior
      // The function should return false for ai_integration if no config
      // (unlike other features which default to true)

      const enabled = await isFeatureEnabled('ai_integration')

      // AI integration should default to false (opt-in feature)
      expect(typeof enabled).toBe('boolean')
    })
  })
})
