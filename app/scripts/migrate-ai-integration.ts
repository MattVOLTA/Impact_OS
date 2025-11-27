/**
 * Migration Script: AI Integration Columns
 *
 * Adds OpenAI API key storage columns to tenant_config table
 * Issue #66: AI Integration - Secure OpenAI API Key Storage
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🚀 Starting AI Integration migration...\n')

  try {
    // Step 1: Add columns
    console.log('📝 Adding columns to tenant_config...')

    const { error: alterError } = await adminClient.rpc('exec_sql', {
      sql: `
        ALTER TABLE tenant_config
          ADD COLUMN IF NOT EXISTS openai_api_key_secret_id UUID,
          ADD COLUMN IF NOT EXISTS openai_connected_by UUID,
          ADD COLUMN IF NOT EXISTS openai_connected_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS openai_connection_status VARCHAR(20) DEFAULT 'not_connected',
          ADD COLUMN IF NOT EXISTS feature_ai_integration BOOLEAN DEFAULT false;
      `
    })

    if (alterError) {
      console.error('❌ Failed to add columns:', alterError)
      process.exit(1)
    }

    console.log('✅ Columns added successfully')

    // Step 2: Add check constraint
    console.log('\n📝 Adding check constraint...')

    const { error: constraintError } = await adminClient.rpc('exec_sql', {
      sql: `
        ALTER TABLE tenant_config DROP CONSTRAINT IF EXISTS openai_connection_status_check;
        ALTER TABLE tenant_config ADD CONSTRAINT openai_connection_status_check
          CHECK (openai_connection_status IN ('not_connected', 'connected', 'connection_failed'));
      `
    })

    if (constraintError) {
      console.error('❌ Failed to add constraint:', constraintError)
      process.exit(1)
    }

    console.log('✅ Constraint added successfully')

    // Step 3: Verify migration
    console.log('\n🔍 Verifying migration...')

    const { data: columns, error: verifyError } = await adminClient
      .from('tenant_config')
      .select('*')
      .limit(1)
      .single()

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError)
      process.exit(1)
    }

    // Check if new columns exist
    const expectedColumns = [
      'openai_api_key_secret_id',
      'openai_connected_by',
      'openai_connected_at',
      'openai_connection_status',
      'feature_ai_integration'
    ]

    const missingColumns = expectedColumns.filter(col => !(col in columns))

    if (missingColumns.length > 0) {
      console.error('❌ Missing columns:', missingColumns.join(', '))
      process.exit(1)
    }

    console.log('✅ All columns verified')

    console.log('\n✨ Migration completed successfully!\n')
    console.log('New columns added to tenant_config:')
    expectedColumns.forEach(col => console.log(`  • ${col}`))

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
