/**
 * Apply AI Integration Migration via Supabase REST API
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
  },
  {
    name: 'Add check constraint',
    sql: `
      DO $$
      BEGIN
        ALTER TABLE tenant_config DROP CONSTRAINT IF EXISTS openai_connection_status_check;
        ALTER TABLE tenant_config ADD CONSTRAINT openai_connection_status_check
          CHECK (openai_connection_status IN ('not_connected', 'connected', 'connection_failed'));
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END $$;
    `
  },
  {
    name: 'Add foreign key for openai_connected_by',
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'tenant_config_openai_connected_by_fkey'
        ) THEN
          ALTER TABLE tenant_config
            ADD CONSTRAINT tenant_config_openai_connected_by_fkey
            FOREIGN KEY (openai_connected_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `
  }
]

async function executeSQLInternal(sql: string): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  }

  return response.json()
}

async function executeSQL(sql: string): Promise<void> {
  // Use pg_query if exec_sql not available
  const response = await fetch(`${SUPABASE_URL}/rest/v1/?${encodeURIComponent(sql)}`, {
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    }
  })

  if (!response.ok && response.status !== 404) {
    const text = await response.text()
    console.log('Response:', text)
  }
}

async function applyMigrations() {
  console.log('🚀 Applying AI Integration migrations...\n')

  console.log('⚠️  Note: This script requires direct database access.')
  console.log('Please copy and paste the following SQL into Supabase SQL Editor:\n')
  console.log('https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new\n')
  console.log('---\n')

  const fullSQL = migrations.map(m => `-- ${m.name}\n${m.sql}`).join('\n\n')
  console.log(fullSQL)

  console.log('\n---\n')
  console.log('After running the SQL, run: npm test __tests__/settings/ai-integration-vault.test.ts')
}

applyMigrations()
