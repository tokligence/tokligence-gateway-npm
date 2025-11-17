#!/usr/bin/env node

/**
 * Test Anthropic chat integration
 */

const { LLMDetector, selectEndpoint } = require('../lib/chat/detector');
const { loadKnowledge, buildSystemPrompt } = require('../lib/chat/knowledge');
const { createClient, getModel, createStreamingChat } = require('../lib/chat/client');
const { tools } = require('../lib/chat/agent');

async function testAnthropicChat() {
  console.log('🧪 Testing Anthropic Chat Integration...\n');

  // Step 1: Detect endpoints
  console.log('1️⃣ Detecting endpoints...');
  const detector = new LLMDetector();
  await detector.detectAll();

  const endpoints = detector.getAll();
  const anthropicEndpoint = endpoints.find(ep => ep.type === 'anthropic');

  if (!anthropicEndpoint) {
    console.log('❌ Anthropic not detected. Make sure TOKLIGENCE_ANTHROPIC_API_KEY is set.');
    process.exit(1);
  }

  console.log(`✅ Found Anthropic: ${anthropicEndpoint.defaultModel}\n`);

  // Step 2: Create client
  console.log('2️⃣ Creating Anthropic client...');
  const client = createClient(anthropicEndpoint);
  const model = getModel(anthropicEndpoint);
  console.log(`✅ Client created for model: ${model}\n`);

  // Step 3: Load knowledge
  console.log('3️⃣ Loading knowledge base...');
  const knowledge = await loadKnowledge();
  const systemPrompt = buildSystemPrompt(knowledge);
  console.log(`✅ Knowledge loaded (${Object.keys(knowledge.docs).length} docs)\n`);

  // Step 4: Test basic chat
  console.log('4️⃣ Testing basic chat (streaming)...');
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Hello! Can you briefly explain what Tokligence Gateway is?' }
  ];

  try {
    const stream = await createStreamingChat(
      client,
      anthropicEndpoint,
      model,
      messages,
      { temperature: 0.7, maxTokens: 500 }
    );

    console.log('Assistant: ');
    let fullResponse = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          process.stdout.write(event.delta.text);
          fullResponse += event.delta.text;
        }
      }
    }

    console.log('\n\n✅ Basic chat test passed!\n');
    console.log(`Response length: ${fullResponse.length} characters\n`);

  } catch (error) {
    console.error('❌ Chat test failed:', error.message);
    console.error(error);
    process.exit(1);
  }

  // Step 5: Test with tools (function calling)
  console.log('5️⃣ Testing function calling...');
  const toolMessages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'What is the current status of the gateway?' }
  ];

  try {
    const stream = await createStreamingChat(
      client,
      anthropicEndpoint,
      model,
      toolMessages,
      {
        temperature: 0.7,
        maxTokens: 500,
        tools
      }
    );

    console.log('Assistant (with tools): ');
    let hasToolCalls = false;

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        process.stdout.write(event.delta.text);
      }
      if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
        hasToolCalls = true;
        console.log(`\n\n🔧 Tool called: ${event.content_block.name}`);
      }
    }

    console.log('\n');

    if (hasToolCalls) {
      console.log('✅ Function calling test passed!\n');
    } else {
      console.log('ℹ️  No tool calls made (this is OK, depends on model response)\n');
    }

  } catch (error) {
    console.error('❌ Function calling test failed:', error.message);
    console.error(error);
    process.exit(1);
  }

  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  ✅ All Anthropic Tests Passed!          ║');
  console.log('╚═══════════════════════════════════════════╝\n');
}

// Run test
testAnthropicChat().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
