#!/usr/bin/env tsx
/**
 * Performance test script for AI roundtable
 * Measures actual execution time of agent orchestration
 */

import 'dotenv/config'
import { streamAgentRoundtable } from '../lib/ai/agent-orchestrator-stream'

interface PerformanceMetrics {
  totalTime: number
  round1Time: number
  debateTime: number
  synthesisTime: number
  eventCounts: Record<string, number>
  timestamps: Array<{ event: string; timestamp: number }>
}

async function testRoundtablePerformance(): Promise<PerformanceMetrics> {
  const metrics: PerformanceMetrics = {
    totalTime: 0,
    round1Time: 0,
    debateTime: 0,
    synthesisTime: 0,
    eventCounts: {},
    timestamps: [],
  }

  const startTime = Date.now()
  let round1StartTime = 0
  let debateStartTime = 0
  let synthesisStartTime = 0

  const sendEvent = (type: string, data: any) => {
    const timestamp = Date.now() - startTime
    metrics.timestamps.push({ event: type, timestamp })
    metrics.eventCounts[type] = (metrics.eventCounts[type] || 0) + 1

    // Track phase timings
    if (type === 'status' && data.stage === 'round1_start') {
      round1StartTime = Date.now()
    } else if (type === 'status' && data.stage === 'round1_complete') {
      metrics.round1Time = Date.now() - round1StartTime
    } else if (type === 'status' && data.stage === 'round2_start') {
      debateStartTime = Date.now()
    } else if (type === 'debate_complete') {
      metrics.debateTime = Date.now() - debateStartTime
    } else if (type === 'synthesis_start') {
      synthesisStartTime = Date.now()
    } else if (type === 'synthesis_complete') {
      metrics.synthesisTime = Date.now() - synthesisStartTime
    }

    // Log progress
    console.log(`[${timestamp}ms] ${type}:`, data.message || data.stage || '')
  }

  try {
    const result = await streamAgentRoundtable(
      {
        brief: 'A mysterious figure walks through a neon-lit cyberpunk city at night',
        platform: 'Instagram',
        userId: 'test-user',
      },
      sendEvent
    )

    metrics.totalTime = Date.now() - startTime

    console.log('\n========== PERFORMANCE METRICS ==========')
    console.log(`Total Time: ${metrics.totalTime}ms (${(metrics.totalTime / 1000).toFixed(2)}s)`)
    console.log(`Round 1 Time: ${metrics.round1Time}ms (${(metrics.round1Time / 1000).toFixed(2)}s)`)
    console.log(`Debate Time: ${metrics.debateTime}ms (${(metrics.debateTime / 1000).toFixed(2)}s)`)
    console.log(`Synthesis Time: ${metrics.synthesisTime}ms (${(metrics.synthesisTime / 1000).toFixed(2)}s)`)
    console.log('\nEvent Counts:')
    Object.entries(metrics.eventCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([event, count]) => {
        console.log(`  ${event}: ${count}`)
      })

    console.log('\n========== BOTTLENECK ANALYSIS ==========')
    const round1Percentage = (metrics.round1Time / metrics.totalTime) * 100
    const debatePercentage = (metrics.debateTime / metrics.totalTime) * 100
    const synthesisPercentage = (metrics.synthesisTime / metrics.totalTime) * 100

    console.log(`Round 1: ${round1Percentage.toFixed(1)}% of total time`)
    console.log(`Debate: ${debatePercentage.toFixed(1)}% of total time`)
    console.log(`Synthesis: ${synthesisPercentage.toFixed(1)}% of total time`)

    return metrics
  } catch (error) {
    console.error('Performance test failed:', error)
    throw error
  }
}

// Run the test
testRoundtablePerformance()
  .then(() => {
    console.log('\n✅ Performance test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Performance test failed:', error)
    process.exit(1)
  })
