#!/usr/bin/env node

/**
 * Test script for LLM detector
 */

const { LLMDetector, selectEndpoint } = require('../lib/chat/detector');
const { loadKnowledge } = require('../lib/chat/knowledge');

async function testDetector() {
  console.log('🔍 Testing LLM Detector...\n');

  // Test detector
  const detector = new LLMDetector();
  await detector.detectAll();

  const endpoints = detector.getAll();

  console.log(`\n✅ Detection complete. Found ${endpoints.length} endpoint(s):\n`);

  endpoints.forEach((ep, idx) => {
    console.log(`${idx + 1}. ${ep.name}`);
    console.log(`   Type: ${ep.type}`);
    console.log(`   BaseURL: ${ep.baseURL}`);
    console.log(`   Priority: ${ep.priority}`);
    console.log(`   Free: ${ep.free ? 'Yes' : 'No'}`);
    console.log(`   Local: ${ep.local ? 'Yes' : 'No'}`);
    if (ep.models && ep.models.length > 0) {
      console.log(`   Models: ${ep.models.join(', ')}`);
    }
    console.log('');
  });

  if (endpoints.length === 0) {
    console.log('❌ No endpoints detected');
    console.log('\nTo test the chat feature, please configure at least one LLM:');
    console.log('  • Install Ollama: https://ollama.ai');
    console.log('  • Or set TOKLIGENCE_OPENAI_API_KEY=sk-...');
    return false;
  }

  return true;
}

async function testKnowledge() {
  console.log('\n📚 Testing Knowledge Loader...\n');

  const knowledge = await loadKnowledge();

  console.log('Knowledge base loaded:');
  console.log(`  Docs: ${Object.keys(knowledge.docs).length}`);
  console.log(`  Links: ${Object.keys(knowledge.links).length}`);
  console.log(`  Version: ${knowledge.meta.version || 'unknown'}`);
  console.log('');

  if (Object.keys(knowledge.docs).length === 0) {
    console.log('⚠️  No documentation found. Run: npm run sync-docs');
  } else {
    console.log('Available docs:');
    Object.keys(knowledge.docs).forEach(doc => {
      console.log(`  - ${doc}`);
    });
  }

  console.log('');
  return true;
}

async function main() {
  try {
    console.log('========================================');
    console.log('  Chat Feature Tests');
    console.log('========================================\n');

    const detectorOk = await testDetector();
    const knowledgeOk = await testKnowledge();

    console.log('========================================');
    console.log('  Test Summary');
    console.log('========================================\n');

    console.log(`Detector: ${detectorOk ? '✅ PASS' : '❌ FAIL (no endpoints)'}`);
    console.log(`Knowledge: ${knowledgeOk ? '✅ PASS' : '❌ FAIL'}`);

    if (detectorOk) {
      console.log('\n✅ Chat feature is ready to use!');
      console.log('\nTo test interactively, run:');
      console.log('  tgw chat');
    } else {
      console.log('\n⚠️  Chat feature needs LLM configuration');
    }

    console.log('');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
