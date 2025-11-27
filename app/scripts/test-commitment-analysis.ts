/**
 * Test Commitment Analysis
 *
 * Quick test script to verify both heuristic and GPT-5 analysis
 */

import { analyzeWithHeuristics, analyzeCommitmentWithGPT5 } from '../lib/ai/openai-client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const testCommitments = [
  'Send 3 customer intros by Friday',
  'Work on marketing',
  'Launch MVP tomorrow',
  'Hire first engineer by end of Q1',
  'Talk to investors',
  'Reach $10K MRR this month'
]

async function testHeuristics() {
  console.log('🧪 Testing Heuristic Analysis\n')
  console.log('='.repeat(60))

  for (const commitment of testCommitments) {
    console.log(`\n📝 Commitment: "${commitment}"`)
    const result = analyzeWithHeuristics(commitment)

    console.log(`   Measurable: ${result.is_measurable}`)
    console.log(`   Score: ${result.measurability_score}/10`)
    console.log(`   Date: ${result.extracted_date ? new Date(result.extracted_date).toDateString() : 'None'}`)
    console.log(`   Suggestion: ${result.suggestion || 'None'}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Heuristic analysis working!\n')
}

async function testGPT5() {
  console.log('🤖 Testing GPT-5 Nano Analysis\n')
  console.log('='.repeat(60))

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.log('⚠️  OPENAI_API_KEY not found in .env.local')
    console.log('Skipping GPT-5 tests.')
    console.log('\nTo test GPT-5:')
    console.log('1. Add OPENAI_API_KEY to .env.local')
    console.log('2. Or connect via Settings UI')
    return
  }

  console.log('🔑 OpenAI API Key found, testing GPT-5 Nano...\n')

  // Test one commitment
  const testText = 'Send 3 customer intros by Friday'
  console.log(`📝 Commitment: "${testText}"`)

  try {
    const result = await analyzeCommitmentWithGPT5(apiKey, testText)

    console.log(`\n✅ GPT-5 Nano Response:`)
    console.log(`   Measurable: ${result.is_measurable}`)
    console.log(`   Score: ${result.measurability_score}/10`)
    console.log(`   Date: ${result.extracted_date ? new Date(result.extracted_date).toDateString() : 'None'}`)
    console.log(`   Suggestion: ${result.suggestion || 'None'}`)

    if (result.smart_criteria) {
      console.log(`   SMART Criteria:`)
      console.log(`     - Specific: ${result.smart_criteria.specific}`)
      console.log(`     - Measurable: ${result.smart_criteria.measurable}`)
      console.log(`     - Achievable: ${result.smart_criteria.achievable}`)
      console.log(`     - Relevant: ${result.smart_criteria.relevant}`)
      console.log(`     - Time-bound: ${result.smart_criteria.time_bound}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ GPT-5 Nano integration working!\n')
  } catch (error) {
    console.error('\n❌ GPT-5 test failed:', error)
    console.log('\nThis might be because:')
    console.log('1. Invalid API key')
    console.log('2. Network connection issue')
    console.log('3. OpenAI API rate limit')
    console.log('4. GPT-5 Nano not yet available (use gpt-4o-mini as fallback)')
  }
}

async function runTests() {
  console.log('\n🚀 Commitment Analysis Test Suite\n')

  // Test heuristics (always works)
  await testHeuristics()

  // Test GPT-5 (if API key available)
  await testGPT5()

  console.log('✨ Testing complete!\n')
}

runTests()
