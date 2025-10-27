#!/usr/bin/env tsx
/**
 * Screenplay Migration Script
 *
 * Parses existing screenplay_text into structured_screenplay format
 * for all episodes in the database
 */

import { createClient } from '@supabase/supabase-js'
import { parseScreenplayText } from '../lib/utils/screenplay-parser'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface Episode {
  id: string
  title: string
  episode_number: number
  screenplay_text: string | null
  structured_screenplay: any | null
}

async function migrateEpisode(episode: Episode): Promise<boolean> {
  console.log(`\n📝 Processing Episode ${episode.episode_number}: "${episode.title}"`)

  if (!episode.screenplay_text) {
    console.log('  ⏭️  No screenplay text - skipping')
    return false
  }

  if (episode.structured_screenplay) {
    console.log('  ✅ Already has structured screenplay - skipping')
    return false
  }

  console.log('  🔄 Parsing screenplay text...')

  try {
    // Parse the screenplay text
    const structured = parseScreenplayText(episode.screenplay_text)

    if (!structured || !structured.scenes || structured.scenes.length === 0) {
      console.log('  ❌ Parse failed - no scenes extracted')
      return false
    }

    console.log(`  ✨ Parsed ${structured.scenes.length} scenes`)

    // Log scene details
    structured.scenes.forEach((scene, idx) => {
      console.log(`    Scene ${idx + 1}: ${scene.location} (${scene.time_of_day} ${scene.time_period})`)
      console.log(`      - ${scene.characters.length} characters`)
      console.log(`      - ${scene.dialogue?.length || 0} dialogue blocks`)
      console.log(`      - ${scene.action?.length || 0} actions`)
    })

    // Update database
    console.log('  💾 Updating database...')

    const { error } = await supabase
      .from('episodes')
      .update({
        structured_screenplay: structured
      })
      .eq('id', episode.id)

    if (error) {
      console.error('  ❌ Database update failed:', error.message)
      return false
    }

    console.log('  ✅ Successfully migrated!')
    return true
  } catch (error: any) {
    console.error('  ❌ Migration error:', error.message)
    return false
  }
}

async function main() {
  console.log('🎬 Screenplay Migration Script')
  console.log('================================\n')

  // Fetch all episodes with screenplay text
  const { data: episodes, error } = await supabase
    .from('episodes')
    .select('id, title, episode_number, screenplay_text, structured_screenplay')
    .not('screenplay_text', 'is', null)
    .order('episode_number')

  if (error) {
    console.error('❌ Failed to fetch episodes:', error.message)
    process.exit(1)
  }

  if (!episodes || episodes.length === 0) {
    console.log('ℹ️  No episodes with screenplay text found')
    process.exit(0)
  }

  console.log(`Found ${episodes.length} episodes with screenplay text\n`)

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const episode of episodes) {
    const result = await migrateEpisode(episode as Episode)

    if (result) {
      migrated++
    } else if ((episode as Episode).structured_screenplay) {
      skipped++
    } else {
      failed++
    }
  }

  console.log('\n================================')
  console.log('📊 Migration Summary:')
  console.log(`  ✅ Migrated: ${migrated}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log('================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

// Run migration
main()
  .then(() => {
    console.log('✨ Migration complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
