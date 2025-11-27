/**
 * AI Integration Vault Tests
 *
 * Tests for OpenAI API key storage in Supabase Vault
 * Issue #66: AI Integration - Secure OpenAI API Key Storage
 *
 * Following TDD: Write tests FIRST, watch them FAIL, then implement
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client for vault operations
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Test data
const testTenantId = '11111111-1111-1111-1111-111111111111' // Acme Accelerator
const testApiKey = 'sk-test-1234567890abcdef'

describe('AI Integration - Vault Operations', () => {
  let createdSecretIds: string[] = []

  afterEach(async () => {
    // Cleanup: Delete all test secrets
    for (const secretId of createdSecretIds) {
      try {
        await adminClient.rpc('vault_delete_secret', { secret_id: secretId })
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    createdSecretIds = []
  })

  describe('vault_create_secret', () => {
    test('stores OpenAI API key encrypted in vault', async () => {
      // RED: This test should fail because we haven't implemented anything yet
      const secretName = `openai_${testTenantId}`

      const { data: secretId, error } = await adminClient.rpc('vault_create_secret', {
        new_secret: testApiKey,
        new_name: secretName,
        new_description: `OpenAI API key for tenant ${testTenantId}`
      })

      expect(error).toBeNull()
      expect(secretId).toBeTruthy()
      expect(typeof secretId).toBe('string')

      if (secretId) {
        createdSecretIds.push(secretId)
      }
    })

    test('returns secret ID that can be used to retrieve key', async () => {
      // RED: Create secret, then verify we can read it back
      const secretName = `openai_${testTenantId}_test2`

      const { data: secretId, error: createError } = await adminClient.rpc('vault_create_secret', {
        new_secret: testApiKey,
        new_name: secretName,
        new_description: 'Test key'
      })

      expect(createError).toBeNull()
      expect(secretId).toBeTruthy()

      if (secretId) {
        createdSecretIds.push(secretId)

        // Now try to read it back
        const { data: retrievedKey, error: readError } = await adminClient.rpc('vault_read_secret', {
          secret_id: secretId
        })

        expect(readError).toBeNull()
        expect(retrievedKey).toBe(testApiKey)
      }
    })
  })

  describe('vault_read_secret', () => {
    test('retrieves OpenAI API key by secret ID', async () => {
      // RED: Create a secret first, then read it
      const secretName = `openai_${testTenantId}_read_test`

      const { data: secretId } = await adminClient.rpc('vault_create_secret', {
        new_secret: testApiKey,
        new_name: secretName,
        new_description: 'Read test'
      })

      createdSecretIds.push(secretId)

      const { data: retrievedKey, error } = await adminClient.rpc('vault_read_secret', {
        secret_id: secretId
      })

      expect(error).toBeNull()
      expect(retrievedKey).toBe(testApiKey)
    })

    test('returns null for non-existent secret ID', async () => {
      // RED: Try to read a secret that doesn't exist
      const fakeSecretId = '00000000-0000-0000-0000-000000000000'

      const { data, error } = await adminClient.rpc('vault_read_secret', {
        secret_id: fakeSecretId
      })

      // Should either return null or error (depending on vault implementation)
      expect(data === null || error !== null).toBe(true)
    })
  })

  describe('vault_delete_secret', () => {
    test('deletes OpenAI API key from vault', async () => {
      // RED: Create, delete, then verify it's gone
      const secretName = `openai_${testTenantId}_delete_test`

      const { data: secretId } = await adminClient.rpc('vault_create_secret', {
        new_secret: testApiKey,
        new_name: secretName,
        new_description: 'Delete test'
      })

      expect(secretId).toBeTruthy()

      // Delete the secret
      const { error: deleteError } = await adminClient.rpc('vault_delete_secret', {
        secret_id: secretId
      })

      expect(deleteError).toBeNull()

      // Verify it's gone
      const { data: retrievedKey } = await adminClient.rpc('vault_read_secret', {
        secret_id: secretId
      })

      expect(retrievedKey).toBeNull()
    })
  })

  describe('tenant_config integration', () => {
    test('can store secret ID in tenant_config', async () => {
      // RED: Create secret, store ID in tenant_config
      const secretName = `openai_${testTenantId}_config_test`

      const { data: secretId } = await adminClient.rpc('vault_create_secret', {
        new_secret: testApiKey,
        new_name: secretName,
        new_description: 'Config test'
      })

      createdSecretIds.push(secretId)

      // Store secret ID in tenant_config
      const { error: updateError } = await adminClient
        .from('tenant_config')
        .update({
          openai_api_key_secret_id: secretId,
          openai_connection_status: 'connected',
          openai_connected_at: new Date().toISOString()
        })
        .eq('tenant_id', testTenantId)

      expect(updateError).toBeNull()

      // Verify it was stored
      const { data: config, error: selectError } = await adminClient
        .from('tenant_config')
        .select('openai_api_key_secret_id, openai_connection_status')
        .eq('tenant_id', testTenantId)
        .single()

      expect(selectError).toBeNull()
      expect(config?.openai_api_key_secret_id).toBe(secretId)
      expect(config?.openai_connection_status).toBe('connected')

      // Cleanup: Clear the config
      await adminClient
        .from('tenant_config')
        .update({
          openai_api_key_secret_id: null,
          openai_connection_status: 'not_connected',
          openai_connected_at: null
        })
        .eq('tenant_id', testTenantId)
    })

    test('can retrieve API key using secret ID from tenant_config', async () => {
      // RED: Full workflow - save to vault, store ID in config, retrieve using config
      const secretName = `openai_${testTenantId}_retrieval_test`

      // 1. Create secret in vault
      const { data: secretId } = await adminClient.rpc('vault_create_secret', {
        new_secret: testApiKey,
        new_name: secretName,
        new_description: 'Retrieval test'
      })

      createdSecretIds.push(secretId)

      // 2. Store ID in tenant_config
      await adminClient
        .from('tenant_config')
        .update({ openai_api_key_secret_id: secretId })
        .eq('tenant_id', testTenantId)

      // 3. Retrieve config
      const { data: config } = await adminClient
        .from('tenant_config')
        .select('openai_api_key_secret_id')
        .eq('tenant_id', testTenantId)
        .single()

      expect(config?.openai_api_key_secret_id).toBe(secretId)

      // 4. Use secret ID to retrieve API key from vault
      const { data: retrievedKey, error } = await adminClient.rpc('vault_read_secret', {
        secret_id: config!.openai_api_key_secret_id!
      })

      expect(error).toBeNull()
      expect(retrievedKey).toBe(testApiKey)

      // Cleanup
      await adminClient
        .from('tenant_config')
        .update({ openai_api_key_secret_id: null })
        .eq('tenant_id', testTenantId)
    })
  })
})
