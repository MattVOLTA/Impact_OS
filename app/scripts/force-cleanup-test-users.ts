/**
 * Force Cleanup Test Users Script
 * 
 * Deletes test user dependencies first, then users.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

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

async function forceCleanup() {
  console.log('🗑️  Force cleaning test data...')

  // Get test user IDs from public.users
  const { data: publicUsers } = await adminClient
    .from('users')
    .select('id, email')
    .or('email.like.%test%,email.like.%example%')

  if (!publicUsers || publicUsers.length === 0) {
    console.log('✅ No test users found in public.users')
    return
  }

  console.log(`📊 Found ${publicUsers.length} test users in public.users`)

  const userIds = publicUsers.map(u => u.id)

  // Delete related data first (that doesn't cascade)
  const tables = [
    'tenant_config',
    'forms',
    'form_submissions', 
    'reports',
    'report_sessions'
  ]

  for (const table of tables) {
    const { error } = await adminClient
      .from(table)
      .delete()
      .in('created_by', userIds)
    
    if (!error) {
      console.log(`✓ Cleaned ${table}`)
    }
  }

  // Now delete from public.users (should cascade to auth.users)
  const { error: deleteError } = await adminClient
    .from('users')
    .delete()
    .in('id', userIds)

  if (deleteError) {
    console.error('❌ Failed to delete from public.users:', deleteError)
    
    // Try deleting from auth.users directly
    console.log('🔄 Trying auth.users deletion...')
    let deleted = 0
    for (const userId of userIds) {
      const { error } = await adminClient.auth.admin.deleteUser(userId)
      if (!error) deleted++
    }
    console.log(`✅ Deleted ${deleted}/${userIds.length} users from auth`)
  } else {
    console.log('✅ All test users cleaned up')
  }
}

forceCleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  })
