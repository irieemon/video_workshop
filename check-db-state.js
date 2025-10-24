// Check actual database state for series_characters columns
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseState() {
  console.log('🔍 Checking database state...\n');

  // Query 1: Check column types from information_schema
  console.log('1️⃣ Checking column types from information_schema:');
  const { data: columnTypes, error: columnError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'series_characters'
        AND column_name IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template')
      ORDER BY column_name;
    `
  });

  if (columnError) {
    console.error('❌ Column check error:', columnError);
  } else {
    console.log(columnTypes || 'No custom RPC function available');
  }

  // Query 2: Check trigger function source
  console.log('\n2️⃣ Checking trigger function source:');
  const { data: triggerSource, error: triggerError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        p.prosrc
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'update_character_sora_template';
    `
  });

  if (triggerError) {
    console.error('❌ Trigger check error:', triggerError);
  } else {
    console.log(triggerSource || 'No custom RPC function available');
  }

  // Query 3: Direct column type check using pg_attribute
  console.log('\n3️⃣ Checking column types directly from pg_attribute:');
  const { data: directTypes, error: directError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        attname AS column_name,
        format_type(atttypid, atttypmod) AS data_type
      FROM pg_attribute
      WHERE attrelid = 'public.series_characters'::regclass
        AND attname IN ('visual_fingerprint', 'voice_profile', 'sora_prompt_template')
        AND NOT attisdropped
      ORDER BY attname;
    `
  });

  if (directError) {
    console.error('❌ Direct check error:', directError);
  } else {
    console.log(directTypes || 'No custom RPC function available');
  }

  console.log('\n✅ Check complete');
}

checkDatabaseState().catch(console.error);
