/**
 * Cleanup Test Users Script
 *
 * Deletes test users created during test runs.
 * Run with: npx tsx scripts/cleanup-test-users.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function cleanupTestUsers() {
  console.log('🔍 Finding test users...')

  // Get all test users
  const { data: authUsers, error: listError } = await adminClient.auth.admin.listUsers()

  if (listError) {
    console.error('❌ Error listing users:', listError)
    return
  }

  const testUsers = authUsers.users.filter(
    (u) => u.email?.includes('test') || u.email?.includes('example')
  )

  console.log(`📊 Found ${testUsers.length} test users to delete`)

  if (testUsers.length === 0) {
    console.log('✅ No test users to clean up')
    return
  }

  // Delete each test user
  let deleted = 0
  let failed = 0

  for (const user of testUsers) {
    const { error } = await adminClient.auth.admin.deleteUser(user.id)
    if (error) {
      console.error(`❌ Failed to delete ${user.email}:`, error.message)
      failed++
    } else {
      deleted++
      if (deleted % 10 === 0) {
        console.log(`⏳ Deleted ${deleted}/${testUsers.length} users...`)
      }
    }
  }

  console.log(`✅ Cleanup complete: ${deleted} deleted, ${failed} failed`)
}

cleanupTestUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  })
