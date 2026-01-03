#!/usr/bin/env tsx
/**
 * Fix Double-Serialized JSON Migration Script
 *
 * Fixes videos where `detailed_breakdown` and `agent_discussion` were
 * accidentally double JSON.stringify()'d, resulting in stringified JSON
 * stored in JSON columns instead of actual JSON objects.
 *
 * Run with: npx tsx scripts/fix-double-serialized-json.ts
 * Dry run:  npx tsx scripts/fix-double-serialized-json.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const isDryRun = process.argv.includes('--dry-run')

interface Video {
  id: string
  title: string
  detailed_breakdown: any
  agent_discussion: any
}

/**
 * Checks if a value is a double-serialized JSON string.
 * Double-serialized JSON looks like: '"{\\"key\\":\\"value\\"}"'
 * When parsed once, it's still a string containing JSON.
 */
function isDoubleSerialized(value: any): boolean {
  if (typeof value !== 'string') {
    return false
  }

  try {
    const parsed = JSON.parse(value)
    // If parsing a string returns an object or array, it was double-serialized
    return typeof parsed === 'object' && parsed !== null
  } catch {
    return false
  }
}

/**
 * Fixes a double-serialized value by parsing it once.
 */
function fixDoubleSerialized(value: any): any {
  if (!isDoubleSerialized(value)) {
    return value
  }
  return JSON.parse(value)
}

async function fixVideo(video: Video): Promise<{ fixed: boolean; fields: string[] }> {
  const fixedFields: string[] = []
  const updates: Record<string, any> = {}

  // Check detailed_breakdown
  if (isDoubleSerialized(video.detailed_breakdown)) {
    const fixed = fixDoubleSerialized(video.detailed_breakdown)
    updates.detailed_breakdown = fixed
    fixedFields.push('detailed_breakdown')
    console.log(`    📋 detailed_breakdown: string → object`)
  }

  // Check agent_discussion
  if (isDoubleSerialized(video.agent_discussion)) {
    const fixed = fixDoubleSerialized(video.agent_discussion)
    updates.agent_discussion = fixed
    fixedFields.push('agent_discussion')
    console.log(`    💬 agent_discussion: string → object`)
  }

  if (fixedFields.length === 0) {
    return { fixed: false, fields: [] }
  }

  if (!isDryRun) {
    const { error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', video.id)

    if (error) {
      console.error(`    ❌ Failed to update: ${error.message}`)
      return { fixed: false, fields: [] }
    }
  }

  return { fixed: true, fields: fixedFields }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Fix Double-Serialized JSON Migration')
  console.log('═══════════════════════════════════════════════════════════')

  if (isDryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made\n')
  } else {
    console.log('\n⚡ LIVE MODE - Changes will be applied\n')
  }

  // Fetch all videos that might have the issue
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title, detailed_breakdown, agent_discussion')
    .not('detailed_breakdown', 'is', null)

  if (error) {
    console.error('Failed to fetch videos:', error.message)
    process.exit(1)
  }

  if (!videos || videos.length === 0) {
    console.log('No videos with detailed_breakdown found.')
    return
  }

  console.log(`Found ${videos.length} videos to check\n`)

  let totalFixed = 0
  let totalFieldsFixed = 0
  const fixedVideos: { title: string; fields: string[] }[] = []

  for (const video of videos) {
    console.log(`\n🎬 Checking: "${video.title}"`)

    const { fixed, fields } = await fixVideo(video)

    if (fixed) {
      totalFixed++
      totalFieldsFixed += fields.length
      fixedVideos.push({ title: video.title, fields })
      console.log(`    ✅ ${isDryRun ? 'Would fix' : 'Fixed'} ${fields.length} field(s)`)
    } else {
      console.log(`    ⏭️  No issues found`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  Summary')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`\n📊 Results:`)
  console.log(`   Videos checked:  ${videos.length}`)
  console.log(`   Videos ${isDryRun ? 'needing fix' : 'fixed'}:   ${totalFixed}`)
  console.log(`   Fields ${isDryRun ? 'needing fix' : 'fixed'}:   ${totalFieldsFixed}`)

  if (fixedVideos.length > 0) {
    console.log(`\n📝 ${isDryRun ? 'Videos that would be fixed' : 'Fixed videos'}:`)
    fixedVideos.forEach(({ title, fields }) => {
      console.log(`   • "${title}" - ${fields.join(', ')}`)
    })
  }

  if (isDryRun && totalFixed > 0) {
    console.log('\n💡 Run without --dry-run to apply fixes')
  }

  console.log('')
}

main().catch(console.error)
