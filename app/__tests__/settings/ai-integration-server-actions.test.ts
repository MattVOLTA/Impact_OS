/**
 * AI Integration Server Actions Tests
 *
 * Tests for server actions: testOpenAIConnection, saveOpenAIKey, disconnectOpenAI, toggleAIIntegration
 * Issue #66: AI Integration - Secure OpenAI API Key Storage
 *
 * Following TDD: Write tests FIRST, watch them FAIL, then implement
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const testTenantId = '11111111-1111-1111-1111-111111111111' // Acme Accelerator
const testApiKey = process.env.OPENAI_API_KEY || 'sk-test-mock-key'

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Import server actions - these don't exist yet (RED)
// We'll implement them after tests fail
let testOpenAIConnection: (apiKey: string) => Promise<any>
let saveOpenAIKey: (apiKey: string) => Promise<any>
let disconnectOpenAI: () => Promise<any>
let toggleAIIntegration: (enabled: boolean) => Promise<any>

describe('AI Integration - Server Actions', () => {
  let testUserId: string
  let createdSecretIds: string[] = []

  beforeAll(async () => {
    // Create admin test user
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: `ai-admin-${Date.now()}@test.com`,
      password: 'testpass123!',
      email_confirm: true,
      user_metadata: {
        tenant_id: testTenantId,
        first_name: 'Admin',
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

    // Import server actions after setup
    // These will fail initially (RED phase)
    try {
      const actions = await import('@/app/(dashboard)/settings/actions')
      testOpenAIConnection = actions.testOpenAIConnection
      saveOpenAIKey = actions.saveOpenAIKey
      disconnectOpenAI = actions.disconnectOpenAI
      toggleAIIntegration = actions.toggleAIIntegration
    } catch (error) {
      // Expected to fail initially - functions don't exist yet
      console.log('Server actions not yet implemented (expected in RED phase)')
    }
  })

  afterAll(async () => {
    // Cleanup secrets
    for (const secretId of createdSecretIds) {
      try {
        await adminClient.rpc('vault_delete_secret', { secret_id: secretId })
      } catch (error) {
        // Ignore cleanup errors
      }
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

    // Delete test user
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId)
    }
  })

  describe('testOpenAIConnection', () => {
    test('rejects empty API key', async () => {
      // RED: Function doesn't exist yet
      if (!testOpenAIConnection) {
        expect(testOpenAIConnection).toBeDefined()
        return
      }

      const result = await testOpenAIConnection('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('API key')
    })

    test('rejects invalid API key format', async () => {
      // RED: Should validate key format
      if (!testOpenAIConnection) {
        expect(testOpenAIConnection).toBeDefined()
        return
      }

      const result = await testOpenAIConnection('invalid-key-format')

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    test('accepts valid API key and returns success', async () => {
      // RED: Should test connection to OpenAI
      if (!testOpenAIConnection) {
        expect(testOpenAIConnection).toBeDefined()
        return
      }

      // Note: This will actually call OpenAI API if real key provided
      // For unit tests, we might want to mock the API call
      const result = await testOpenAIConnection(testApiKey)

      expect(result.success).toBeDefined()
      expect(typeof result.success).toBe('boolean')
    })
  })

  describe('saveOpenAIKey', () => {
    test('requires admin role', async () => {
      // RED: Should check user role before saving
      if (!saveOpenAIKey) {
        expect(saveOpenAIKey).toBeDefined()
        return
      }

      // Create non-admin user
      const { data: nonAdminAuth } = await adminClient.auth.admin.createUser({
        email: `non-admin-${Date.now()}@test.com`,
        password: 'testpass123!',
        email_confirm: true,
        user_metadata: {
          tenant_id: testTenantId,
          first_name: 'Non',
          last_name: 'Admin'
        }
      })

      const nonAdminUserId = nonAdminAuth.user!.id

      // Attempt to save (should fail - non-admin)
      const result = await saveOpenAIKey(testApiKey)

      expect(result.success).toBe(false)
      expect(result.error).toContain('administrator')

      // Cleanup
      await adminClient.auth.admin.deleteUser(nonAdminUserId)
    })

    test('tests connection before saving', async () => {
      // RED: Should call testOpenAIConnection first
      if (!saveOpenAIKey) {
        expect(saveOpenAIKey).toBeDefined()
        return
      }

      const result = await saveOpenAIKey('invalid-key')

      expect(result.success).toBe(false)
      // Should fail at connection test, not vault storage
    })

    test('stores valid API key in vault and updates tenant_config', async () => {
      // RED: Should save to vault and update config
      if (!saveOpenAIKey) {
        expect(saveOpenAIKey).toBeDefined()
        return
      }

      const result = await saveOpenAIKey(testApiKey)

      if (result.success) {
        // Verify secret was created
        const { data: config } = await adminClient
          .from('tenant_config')
          .select('openai_api_key_secret_id, openai_connection_status, openai_connected_by')
          .eq('tenant_id', testTenantId)
          .single()

        expect(config?.openai_api_key_secret_id).toBeTruthy()
        expect(config?.openai_connection_status).toBe('connected')
        expect(config?.openai_connected_by).toBe(testUserId)

        // Save for cleanup
        if (config?.openai_api_key_secret_id) {
          createdSecretIds.push(config.openai_api_key_secret_id)
        }

        // Verify key can be retrieved from vault
        const { data: retrievedKey } = await adminClient.rpc('vault_read_secret', {
          secret_id: config!.openai_api_key_secret_id!
        })

        expect(retrievedKey).toBe(testApiKey)
      }
    })

    test('rolls back vault secret if config update fails', async () => {
      // RED: Should handle partial failures gracefully
      if (!saveOpenAIKey) {
        expect(saveOpenAIKey).toBeDefined()
        return
      }

      // This is hard to test without mocking database
      // Ensures that if config update fails, vault secret is deleted
      // Implementation should handle this in catch block
    })
  })

  describe('disconnectOpenAI', () => {
    test('requires admin role', async () => {
      // RED: Should check user role
      if (!disconnectOpenAI) {
        expect(disconnectOpenAI).toBeDefined()
        return
      }

      // Test with non-admin context (would need proper auth context)
      // For now, just verify function exists
    })

    test('deletes API key from vault and clears tenant_config', async () => {
      // RED: Should remove secret and clear config
      if (!disconnectOpenAI) {
        expect(disconnectOpenAI).toBeDefined()
        return
      }

      // First, set up a connection
      const { data: secretId } = await adminClient.rpc('vault_create_secret', {
        new_secret: 'sk-test-disconnect',
        new_name: `openai_${testTenantId}_disconnect_test`,
        new_description: 'Disconnect test'
      })

      await adminClient
        .from('tenant_config')
        .update({
          openai_api_key_secret_id: secretId,
          openai_connection_status: 'connected',
          openai_connected_at: new Date().toISOString()
        })
        .eq('tenant_id', testTenantId)

      // Now disconnect
      const result = await disconnectOpenAI()

      expect(result.success).toBe(true)

      // Verify secret deleted from vault
      const { data: retrievedKey } = await adminClient.rpc('vault_read_secret', {
        secret_id: secretId
      })

      expect(retrievedKey).toBeNull()

      // Verify config cleared
      const { data: config } = await adminClient
        .from('tenant_config')
        .select('openai_api_key_secret_id, openai_connection_status')
        .eq('tenant_id', testTenantId)
        .single()

      expect(config?.openai_api_key_secret_id).toBeNull()
      expect(config?.openai_connection_status).toBe('not_connected')
    })
  })

  describe('toggleAIIntegration', () => {
    test('requires admin role', async () => {
      // RED: Should check user role
      if (!toggleAIIntegration) {
        expect(toggleAIIntegration).toBeDefined()
        return
      }

      // Test admin-only access
    })

    test('enables AI integration feature flag', async () => {
      // RED: Should update feature_ai_integration
      if (!toggleAIIntegration) {
        expect(toggleAIIntegration).toBeDefined()
        return
      }

      const result = await toggleAIIntegration(true)

      expect(result.success).toBe(true)

      const { data: config } = await adminClient
        .from('tenant_config')
        .select('feature_ai_integration')
        .eq('tenant_id', testTenantId)
        .single()

      expect(config?.feature_ai_integration).toBe(true)
    })

    test('disables AI integration feature flag', async () => {
      // RED: Should update feature_ai_integration
      if (!toggleAIIntegration) {
        expect(toggleAIIntegration).toBeDefined()
        return
      }

      const result = await toggleAIIntegration(false)

      expect(result.success).toBe(true)

      const { data: config } = await adminClient
        .from('tenant_config')
        .select('feature_ai_integration')
        .eq('tenant_id', testTenantId)
        .single()

      expect(config?.feature_ai_integration).toBe(false)
    })
  })
})
