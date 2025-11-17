#!/usr/bin/env node

/**
 * Test OpenAI chat integration
 */

const { LLMDetector, selectEndpoint } = require('../lib/chat/detector');
const { loadKnowledge, buildSystemPrompt } = require('../lib/chat/knowledge');
const { createClient, getModel, createStreamingChat } = require('../lib/chat/client');
const { tools } = require('../lib/chat/agent');

async function testOpenAIChat() {
  console.log('🧪 Testing OpenAI Chat Integration...\n');

  // Step 1: Detect endpoints
  console.log('1️⃣ Detecting endpoints...');
  const detector = new LLMDetector();
  await detector.detectAll();

  const endpoints = detector.getAll();
  const openaiEndpoint = endpoints.find(ep => ep.type === 'openai');

  if (!openaiEndpoint) {
    console.log('❌ OpenAI not detected. Make sure TOKLIGENCE_OPENAI_API_KEY is set.');
    process.exit(1);
  }

  console.log(`✅ Found OpenAI: ${openaiEndpoint.defaultModel}\n`);

  // Step 2: Create client
  console.log('2️⃣ Creating OpenAI client...');
  const client = createClient(openaiEndpoint);
  const model = getModel(openaiEndpoint);
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
    { role: 'user', content: 'Hello! Can you briefly explain what Tokligence Gateway is in 2-3 sentences?' }
  ];

  try {
    const stream = await createStreamingChat(
      client,
      openaiEndpoint,
      model,
      messages,
      { temperature: 0.7, maxTokens: 300 }
    );

    console.log('Assistant: ');
    let fullResponse = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        process.stdout.write(delta.content);
        fullResponse += delta.content;
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
    { role: 'user', content: 'What is the current status of the gateway? Please use the available tool to check.' }
  ];

  try {
    const stream = await createStreamingChat(
      client,
      openaiEndpoint,
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
    const toolCalls = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        process.stdout.write(delta.content);
      }

      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          const index = toolCallDelta.index;
          if (!toolCalls[index]) {
            toolCalls[index] = {
              id: toolCallDelta.id || '',
              type: 'function',
              function: {
                name: toolCallDelta.function?.name || '',
                arguments: ''
              }
            };
          }
          if (toolCallDelta.function?.name) {
            toolCalls[index].function.name += toolCallDelta.function.name;
          }
          if (toolCallDelta.function?.arguments) {
            toolCalls[index].function.arguments += toolCallDelta.function.arguments;
          }
        }
        hasToolCalls = true;
      }
    }

    console.log('\n');

    if (hasToolCalls && toolCalls.length > 0) {
      console.log(`🔧 Tool called: ${toolCalls[0].function.name}`);
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
  console.log('║  ✅ All OpenAI Tests Passed!             ║');
  console.log('╚═══════════════════════════════════════════╝\n');
}

// Run test
testOpenAIChat().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
