/**
 * JWT Claims Tests
 *
 * Verify that Custom Access Token Hook adds tenant_id to JWT claims.
 */

import { createClient } from '@supabase/supabase-js'
import { jwtDecode } from 'jwt-decode'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'

const testUserIds = new Set<string>()

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

afterEach(async () => {
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

describe('JWT Claims - Custom Access Token Hook', () => {
  test('JWT contains tenant_id claim after login', async () => {
    const email = `jwt-test-${Date.now()}@test.com`

    // Create user with tenant_id in metadata
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: TENANT_1_ID,
        first_name: 'JWT',
        last_name: 'Test'
      }
    })

    if (!user) throw new Error('User creation failed')
    testUserIds.add(user.id)

    // Sign in to get session with JWT
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { session }, error } = await userClient.auth.signInWithPassword({
      email,
      password: 'test-password-123'
    })

    expect(error).toBeNull()
    expect(session).toBeDefined()
    expect(session?.access_token).toBeDefined()

    // Decode JWT and check for tenant_id claim
    if (session?.access_token) {
      const decoded = jwtDecode<any>(session.access_token)

      console.log('JWT Claims:', JSON.stringify(decoded, null, 2))

      // Custom Access Token Hook should add tenant_id to claims
      expect(decoded.tenant_id).toBe(TENANT_1_ID)
    }
  })
})
