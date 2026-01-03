/**
 * Apply the BYOK migration to Supabase
 * Run with: npx tsx scripts/apply-byok-migration.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qbnkdtbqabpnkoadguez.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function checkTableExists(tableName: string): Promise<boolean> {
  const { error } = await supabase.from(tableName).select('id').limit(1)
  // 42P01 = table does not exist
  return !error || error.code !== '42P01'
}

async function applyMigration() {
  console.log('🔄 BYOK Migration Check')
  console.log('=' .repeat(50))
  console.log(`Supabase URL: ${supabaseUrl}`)
  console.log('')

  // Check if user_api_keys table already exists
  const tableExists = await checkTableExists('user_api_keys')

  if (tableExists) {
    console.log('✅ Table "user_api_keys" already exists!')
    console.log('')

    // Check for sample data
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('id, provider, key_name, is_valid, created_at')
      .limit(5)

    if (error) {
      console.log('⚠️  Could not query table:', error.message)
    } else {
      console.log(`Found ${data?.length || 0} API key(s) in the table`)
      if (data && data.length > 0) {
        console.log('\nSample records:')
        data.forEach((row, i) => {
          console.log(`  ${i + 1}. ${row.key_name} (${row.provider}) - ${row.is_valid ? 'Valid' : 'Invalid'}`)
        })
      }
    }

    return
  }

  console.log('❌ Table "user_api_keys" does not exist')
  console.log('')
  console.log('📋 To apply the migration:')
  console.log('')
  console.log('Option 1: Use Supabase Dashboard')
  console.log('  1. Open: https://supabase.com/dashboard/project/qbnkdtbqabpnkoadguez/sql/new')
  console.log('  2. Copy the contents of: supabase/migrations/20250103_user_api_keys.sql')
  console.log('  3. Paste into the SQL editor and click "Run"')
  console.log('')
  console.log('Option 2: Use Supabase CLI')
  console.log('  1. Run: supabase login')
  console.log('  2. Run: supabase db push')
  console.log('')

  // Read and display the migration SQL
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250103_user_api_keys.sql')
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, 'utf-8')
    console.log('📄 Migration SQL Preview (first 1000 chars):')
    console.log('-'.repeat(50))
    console.log(sql.substring(0, 1000))
    console.log('...')
    console.log('-'.repeat(50))
  }
}

applyMigration().catch(console.error)
