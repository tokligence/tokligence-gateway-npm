const { createClient, createStreamingChat } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/client');
const { tools, parseToolCalls, executeToolCalls } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/agent');
const { loadKnowledge, buildSystemPrompt } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/knowledge');

async function testConfigKnowledge(endpoint, question) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Question: "${question}"`);
  console.log('='.repeat(70));

  const knowledge = loadKnowledge();
  const systemPrompt = buildSystemPrompt(knowledge);

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question }
  ];

  const client = createClient(endpoint);
  const model = endpoint.defaultModel;

  try {
    let iteration = 0;
    const maxIterations = 3;
    let shouldContinue = true;

    while (shouldContinue && iteration < maxIterations) {
      iteration++;
      console.log(`\n🔄 Iteration ${iteration}...`);

      const stream = await createStreamingChat(client, endpoint, model, messages, {
        tools: tools,
        maxTokens: 1024
      });

      let assistantMessage = '';
      const toolCalls = [];

      // For OpenAI-compatible
      if (endpoint.type !== 'anthropic') {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;

          if (delta?.content) {
            process.stdout.write(delta.content);
            assistantMessage += delta.content;
          }

          if (delta?.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              const index = toolCallDelta.index;

              if (!toolCalls[index]) {
                toolCalls[index] = {
                  id: '',
                  type: 'function',
                  function: { name: '', arguments: '' }
                };
              }

              if (toolCallDelta.id) {
                toolCalls[index].id = toolCallDelta.id;
              }
              if (toolCallDelta.function?.name) {
                toolCalls[index].function.name += toolCallDelta.function.name;
              }
              if (toolCallDelta.function?.arguments) {
                toolCalls[index].function.arguments += toolCallDelta.function.arguments;
              }
            }
          }
        }

        console.log('');

        if (toolCalls.length > 0) {
          console.log(`\n✓ Tool calls: ${toolCalls.map(tc => tc.function.name).join(', ')}`);

          const messageObj = {
            role: 'assistant',
            content: assistantMessage || null,
            tool_calls: toolCalls
          };
          messages.push(messageObj);

          const parsed = parseToolCalls(messageObj);
          const results = await executeToolCalls(parsed);

          for (const result of results) {
            messages.push(result);
          }

          shouldContinue = true;
        } else {
          shouldContinue = false;
        }

      } else {
        // Anthropic - simplified
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            process.stdout.write(event.delta.text);
            assistantMessage += event.delta.text;
          }
        }
        console.log('');
        shouldContinue = false;
      }
    }

    console.log(`\n✅ Test completed successfully`);

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

async function main() {
  const { LLMDetector } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/detector');

  console.log('🧪 Testing Comprehensive Configuration Knowledge\n');

  const detector = new LLMDetector();
  await detector.detectAll();
  const endpoints = detector.getAll();

  if (endpoints.length === 0) {
    console.log('❌ No endpoints detected');
    return;
  }

  const endpoint = endpoints[0];
  console.log(`Using: ${endpoint.name} (${endpoint.defaultModel})\n`);

  // Test configuration knowledge
  const questions = [
    'What configuration options are available for Anthropic features?',
    'How do I enable multi-port mode?',
    'Set enable_facade to true',
    'What are the available work modes?'
  ];

  for (const question of questions) {
    await testConfigKnowledge(endpoint, question);
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ All configuration knowledge tests completed');
  console.log('='.repeat(70));
}

main().catch(console.error);
