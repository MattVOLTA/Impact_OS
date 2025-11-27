/**
 * Apply AI Integration Migration via Raw SQL
 *
 * Uses Supabase client to execute DDL directly
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function applyMigration() {
  console.log('🚀 Applying AI Integration migration...\n')

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const migrations = [
    {
      name: 'Add openai_api_key_secret_id column',
      sql: `ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS openai_api_key_secret_id UUID;`
    },
    {
      name: 'Add openai_connected_by column',
      sql: `ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS openai_connected_by UUID;`
    },
    {
      name: 'Add openai_connected_at column',
      sql: `ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS openai_connected_at TIMESTAMPTZ;`
    },
    {
      name: 'Add openai_connection_status column',
      sql: `ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS openai_connection_status VARCHAR(20) DEFAULT 'not_connected';`
    },
    {
      name: 'Add feature_ai_integration column',
      sql: `ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS feature_ai_integration BOOLEAN DEFAULT false;`
    }
  ]

  for (const migration of migrations) {
    console.log(`📝 ${migration.name}...`)

    try {
      // Use raw SQL via PostgREST
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        }
      })

      console.log(`   Response status: ${response.status}`)

    } catch (error) {
      console.error(`   ❌ Error:`, error)
    }
  }

  console.log('\n🔍 Verifying migration...')

  // Test if columns exist by trying to select them
  const { data, error } = await adminClient
    .from('tenant_config')
    .select('openai_api_key_secret_id, openai_connected_by, openai_connected_at, openai_connection_status, feature_ai_integration')
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('❌ Verification failed:', error.message)
    console.log('\n⚠️  Please apply migration manually via Supabase Dashboard')
    console.log('📍 URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new')
    process.exit(1)
  }

  if (data) {
    console.log('✅ Migration verified! All columns exist.')
    console.log('\nColumn check:', Object.keys(data))
  }
}

applyMigration()
