const { createClient, createStreamingChat } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/client');
const { tools, parseToolCalls, executeToolCalls } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/agent');
const { loadKnowledge, buildSystemPrompt } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/knowledge');

async function testQA(endpoint, question) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Endpoint: ${endpoint.name}`);
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
      console.log(`\n📤 Iteration ${iteration}...`);

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
        // Anthropic
        let hasToolUse = false;
        const content = [];

        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            if (event.delta.type === 'text_delta') {
              process.stdout.write(event.delta.text);
              assistantMessage += event.delta.text;
            }
          } else if (event.type === 'content_block_start') {
            if (event.content_block.type === 'tool_use') {
              hasToolUse = true;
            }
          } else if (event.type === 'message_stop') {
            // Get full message from event
            if (event.message) {
              content.push(...event.message.content);
            }
          }
        }

        console.log('');

        if (hasToolUse) {
          console.log(`\n✓ Anthropic tool use detected`);
          shouldContinue = true;
          // In real implementation, would handle tool execution here
        } else {
          shouldContinue = false;
        }
      }
    }

    console.log(`\n✅ Q&A completed successfully`);

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

async function main() {
  const { LLMDetector } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/detector');

  console.log('🧪 Testing Chat Q&A with Knowledge Base\n');

  const detector = new LLMDetector();
  await detector.detectAll();
  const endpoints = detector.getAll();

  if (endpoints.length === 0) {
    console.log('❌ No endpoints detected');
    return;
  }

  // Test questions
  const questions = [
    'What is Tokligence Gateway?',
    'How do I install Tokligence Gateway?',
    'What providers does the gateway support?'
  ];

  // Test with first available endpoint
  const endpoint = endpoints[0];
  console.log(`\nUsing: ${endpoint.name} (${endpoint.defaultModel})\n`);

  for (const question of questions) {
    await testQA(endpoint, question);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ All Q&A tests completed');
  console.log('='.repeat(70));
}

main().catch(console.error);
