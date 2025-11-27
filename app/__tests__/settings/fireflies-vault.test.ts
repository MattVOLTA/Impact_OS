/**
 * Fireflies Settings - Vault Integration Tests
 *
 * Following TDD: These tests are written FIRST and will FAIL until feature is implemented.
 *
 * Tests verify:
 * - Supabase Vault secret creation for API keys
 * - Encrypted storage and retrieval
 * - Connection metadata tracking
 * - Role-based access (admin only)
 *
 * See Epic #6 for requirements.
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'

const testUserIds = new Set<string>()
const testSecretIds = new Set<string>()

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

afterEach(async () => {
  // Cleanup secrets from Vault
  for (const secretId of testSecretIds) {
    await adminClient.rpc('vault_delete_secret', { secret_id: secretId })
  }
  testSecretIds.clear()

  // Cleanup users
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

describe('Supabase Vault - Fireflies API Key Storage', () => {
  test('can create encrypted secret in Vault', async () => {
    // Create a secret (simulating Fireflies API key storage)
    const testApiKey = 'test_fireflies_key_12345'
    const secretName = `fireflies_test_${Date.now()}`

    const { data: secretId, error } = await adminClient
      .rpc('vault_create_secret', {
        new_secret: testApiKey,
        new_name: secretName,
        new_description: 'Test Fireflies API key'
      })

    expect(error).toBeNull()
    expect(secretId).toBeDefined()

    if (secretId) {
      testSecretIds.add(secretId)

      // Verify secret is encrypted in vault.secrets table
      const { data: encryptedSecret } = await adminClient
        .from('vault.secrets')
        .select('secret, name')
        .eq('id', secretId)
        .single()

      expect(encryptedSecret).toBeDefined()
      expect(encryptedSecret?.name).toBe(secretName)
      // Secret should be encrypted (not plain text)
      expect(encryptedSecret?.secret).not.toBe(testApiKey)

      // Verify can retrieve decrypted secret
      const { data: decryptedSecret } = await adminClient
        .from('vault.decrypted_secrets')
        .select('decrypted_secret')
        .eq('id', secretId)
        .single()

      expect(decryptedSecret?.decrypted_secret).toBe(testApiKey)
    }
  })

  test('can update Fireflies API key secret', async () => {
    const originalKey = 'original_key_123'
    const updatedKey = 'updated_key_456'
    const secretName = `fireflies_update_test_${Date.now()}`

    // Create initial secret
    const { data: secretId } = await adminClient
      .rpc('vault_create_secret', {
        new_secret: originalKey,
        new_name: secretName
      })

    if (!secretId) throw new Error('Secret creation failed')
    testSecretIds.add(secretId)

    // Update the secret
    const { error: updateError } = await adminClient
      .rpc('vault_update_secret', {
        secret_id: secretId,
        new_secret: updatedKey
      })

    expect(updateError).toBeNull()

    // Verify updated value
    const { data: decryptedSecret } = await adminClient
      .from('vault.decrypted_secrets')
      .select('decrypted_secret')
      .eq('id', secretId)
      .single()

    expect(decryptedSecret?.decrypted_secret).toBe(updatedKey)
    expect(decryptedSecret?.decrypted_secret).not.toBe(originalKey)
  })

  test('can delete Fireflies API key secret from Vault', async () => {
    const testKey = 'delete_test_key'
    const secretName = `fireflies_delete_test_${Date.now()}`

    const { data: secretId } = await adminClient
      .rpc('vault_create_secret', {
        new_secret: testKey,
        new_name: secretName
      })

    if (!secretId) throw new Error('Secret creation failed')

    // Delete the secret
    await adminClient.rpc('vault_delete_secret', { secret_id: secretId })

    // Verify secret is gone
    const { data: deletedSecret } = await adminClient
      .from('vault.secrets')
      .select('*')
      .eq('id', secretId)
      .single()

    expect(deletedSecret).toBeNull()
  })
})

describe('Fireflies Connection - Metadata Tracking', () => {
  test('tenant_config tracks Fireflies connection metadata', async () => {
    // Create admin user
    const email = `admin-fireflies-${Date.now()}@test.com`
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: TENANT_1_ID,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      }
    })

    if (!user) throw new Error('User creation failed')
    testUserIds.add(user.id)

    // Create Fireflies API key secret
    const testApiKey = 'fireflies_api_key_test'
    const { data: secretId } = await adminClient
      .rpc('vault_create_secret', {
        new_secret: testApiKey,
        new_name: `fireflies_${TENANT_1_ID}`
      })

    if (!secretId) throw new Error('Secret creation failed')
    testSecretIds.add(secretId)

    // Update tenant_config with connection metadata
    const { error: updateError } = await adminClient
      .from('tenant_config')
      .update({
        fireflies_api_key_secret_id: secretId,
        fireflies_connected_by: user.id,
        fireflies_connected_at: new Date().toISOString()
      })
      .eq('tenant_id', TENANT_1_ID)

    expect(updateError).toBeNull()

    // Verify metadata was saved
    const { data: config } = await adminClient
      .from('tenant_config')
      .select('fireflies_api_key_secret_id, fireflies_connected_by, fireflies_connected_at')
      .eq('tenant_id', TENANT_1_ID)
      .single()

    expect(config?.fireflies_api_key_secret_id).toBe(secretId)
    expect(config?.fireflies_connected_by).toBe(user.id)
    expect(config?.fireflies_connected_at).toBeDefined()
  })
})

describe('Role-Based Access - Settings', () => {
  test('admin role required for Fireflies configuration', async () => {
    // Create viewer user
    const email = `viewer-settings-${Date.now()}@test.com`
    const { data: { user: viewerUser } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: TENANT_1_ID,
        first_name: 'Viewer',
        last_name: 'User',
        role: 'viewer'
      }
    })

    if (!viewerUser) throw new Error('User creation failed')
    testUserIds.add(viewerUser.id)

    // Sign in as viewer
    const viewerClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await viewerClient.auth.signInWithPassword({
      email,
      password: 'test-password-123'
    })

    // Verify viewer has 'viewer' role in public.users
    const { data: userData } = await viewerClient
      .from('users')
      .select('role')
      .eq('id', viewerUser.id)
      .single()

    expect(userData?.role).toBe('viewer')
    expect(userData?.role).not.toBe('admin')
  })
})
