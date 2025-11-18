const { createClient, createStreamingChat } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/client');
const { tools, parseToolCalls, executeToolCalls } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/agent');
const { loadKnowledge, buildSystemPrompt } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/knowledge');

async function testConfigAction(endpoint, instruction) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Instruction: "${instruction}"`);
  console.log('='.repeat(70));

  const knowledge = loadKnowledge();
  const systemPrompt = buildSystemPrompt(knowledge);

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: instruction }
  ];

  const client = createClient(endpoint);
  const model = endpoint.defaultModel;

  try {
    let iteration = 0;
    const maxIterations = 5;
    let shouldContinue = true;

    while (shouldContinue && iteration < maxIterations) {
      iteration++;
      console.log(`\n🔄 Iteration ${iteration}`);

      const stream = await createStreamingChat(client, endpoint, model, messages, {
        tools: tools,
        maxTokens: 1024
      });

      let assistantMessage = '';
      const toolCalls = [];

      // Handle OpenAI-compatible streaming
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

          // Check finish reason
          if (chunk.choices[0]?.finish_reason === 'stop') {
            shouldContinue = false;
          } else if (chunk.choices[0]?.finish_reason === 'tool_calls') {
            shouldContinue = true;
          }
        }

        console.log('');

        // Handle tool calls
        if (toolCalls.length > 0) {
          console.log(`\n🔧 Tool calls: ${toolCalls.map(tc => tc.function.name).join(', ')}`);

          const messageObj = {
            role: 'assistant',
            content: assistantMessage || null,
            tool_calls: toolCalls
          };
          messages.push(messageObj);

          // Execute tools
          const parsed = parseToolCalls(messageObj);
          const results = await executeToolCalls(parsed);

          // Add tool results to messages
          for (const result of results) {
            messages.push(result);
          }

          shouldContinue = true;
        } else {
          if (assistantMessage) {
            console.log(`\n📝 Final response: ${assistantMessage.substring(0, 200)}...`);
          }
          shouldContinue = false;
        }

      } else {
        // Anthropic - simplified for testing
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

    if (iteration >= maxIterations) {
      console.log(`\n⚠️  Reached max iterations (${maxIterations})`);
    }

    console.log(`\n✅ Action completed\n`);

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}\n`);
  }
}

async function main() {
  const { LLMDetector } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/detector');

  console.log('🧪 Testing Configuration Actions\n');

  const detector = new LLMDetector();
  await detector.detectAll();
  const endpoints = detector.getAll();

  if (endpoints.length === 0) {
    console.log('❌ No endpoints detected');
    return;
  }

  // Use first endpoint
  const endpoint = endpoints[0];
  console.log(`Using: ${endpoint.name} (${endpoint.defaultModel})\n`);

  // Test configuration actions
  const instructions = [
    'Show me the current configuration',
    'Get the port setting',
    'Set the port to 9000',
    'Check the gateway status'
  ];

  for (const instruction of instructions) {
    await testConfigAction(endpoint, instruction);
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('='.repeat(70));
  console.log('✅ All configuration action tests completed');
  console.log('='.repeat(70));
}

main().catch(console.error);
