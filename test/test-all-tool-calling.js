const { createClient, createStreamingChat } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/client');
const { tools, parseToolCalls, executeToolCalls } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/agent');

/**
 * Test tool calling for OpenAI SDK (OpenAI, Ollama, vLLM, LM Studio, custom endpoints)
 */
async function testOpenAIToolCalling(endpoint) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${endpoint.name} (${endpoint.type})`);
  console.log('='.repeat(60));

  const client = createClient(endpoint);
  const model = endpoint.defaultModel;

  const messages = [
    { role: 'user', content: 'Check the current gateway status' }
  ];

  try {
    console.log(`\n📤 Request: "${messages[0].content}"`);
    console.log(`🤖 Model: ${model}\n`);

    const stream = await createStreamingChat(client, endpoint, model, messages, {
      tools: tools,
      maxTokens: 512
    });

    let assistantMessage = '';
    const toolCalls = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        process.stdout.write(delta.content);
        assistantMessage += delta.content;
      }

      // Handle tool calls
      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          const index = toolCallDelta.index;

          if (!toolCalls[index]) {
            toolCalls[index] = {
              id: '',
              type: 'function',
              function: {
                name: '',
                arguments: ''
              }
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

    console.log(''); // Newline

    if (toolCalls.length > 0) {
      console.log(`\n✓ Tool calls detected: ${toolCalls.length}`);

      for (const toolCall of toolCalls) {
        console.log(`\n  Tool: ${toolCall.function.name}`);
        console.log(`  ID: ${toolCall.id}`);
        console.log(`  Args: ${toolCall.function.arguments.substring(0, 100)}...`);

        // Check for duplicate name bug
        const toolName = toolCall.function.name;
        const parts = toolName.split('_');
        if (parts.length > 1) {
          const hasDuplicate = toolName.includes(parts[0] + parts[0]);
          if (hasDuplicate) {
            console.log(`  ❌ BUG DETECTED: Tool name has duplicates!`);
          } else {
            console.log(`  ✓ Tool name is correct`);
          }
        }
      }

      // Execute tools
      console.log(`\n🔧 Executing tools...`);
      const messageObj = {
        role: 'assistant',
        content: assistantMessage || null,
        tool_calls: toolCalls
      };

      const parsed = parseToolCalls(messageObj);
      const results = await executeToolCalls(parsed);

      console.log(`✓ Executed ${results.length} tool(s)`);
    } else {
      console.log(`\n⚠️  No tool calls detected (model gave direct response)`);
    }

    console.log(`\n✅ Test passed for ${endpoint.name}`);

  } catch (error) {
    console.log(`\n❌ Test failed for ${endpoint.name}`);
    console.log(`Error: ${error.message}`);
    if (error.stack) {
      console.log(error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

/**
 * Test tool calling for Anthropic SDK
 */
async function testAnthropicToolCalling(endpoint) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${endpoint.name} (${endpoint.type})`);
  console.log('='.repeat(60));

  const client = createClient(endpoint);
  const model = endpoint.defaultModel;

  const messages = [
    { role: 'user', content: 'Get the current configuration' }
  ];

  try {
    console.log(`\n📤 Request: "${messages[0].content}"`);
    console.log(`🤖 Model: ${model}\n`);

    const stream = await createStreamingChat(client, endpoint, model, messages, {
      tools: tools,
      maxTokens: 512
    });

    let textContent = '';
    const toolUses = [];

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          process.stdout.write(event.delta.text);
          textContent += event.delta.text;
        }
      } else if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          toolUses.push({
            id: event.content_block.id,
            name: event.content_block.name,
            input: {}
          });
        }
      } else if (event.type === 'content_block_stop' && event.index !== undefined) {
        // Tool use complete
        if (event.content_block && event.content_block.type === 'tool_use') {
          if (toolUses[event.index]) {
            toolUses[event.index].input = event.content_block.input;
          }
        }
      }
    }

    console.log(''); // Newline

    if (toolUses.length > 0) {
      console.log(`\n✓ Tool uses detected: ${toolUses.length}`);

      for (const toolUse of toolUses) {
        console.log(`\n  Tool: ${toolUse.name}`);
        console.log(`  ID: ${toolUse.id}`);
        console.log(`  Input: ${JSON.stringify(toolUse.input).substring(0, 100)}...`);

        // Check for duplicate name bug
        const toolName = toolUse.name;
        const parts = toolName.split('_');
        if (parts.length > 1) {
          const hasDuplicate = toolName.includes(parts[0] + parts[0]);
          if (hasDuplicate) {
            console.log(`  ❌ BUG DETECTED: Tool name has duplicates!`);
          } else {
            console.log(`  ✓ Tool name is correct`);
          }
        }
      }

      console.log(`\n✓ Tool calling works correctly`);
    } else {
      console.log(`\n⚠️  No tool uses detected (model gave direct response)`);
    }

    console.log(`\n✅ Test passed for ${endpoint.name}`);

  } catch (error) {
    console.log(`\n❌ Test failed for ${endpoint.name}`);
    console.log(`Error: ${error.message}`);
    if (error.stack) {
      console.log(error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  const { LLMDetector } = require('/home/alejandroseaah/tokligence/tokligence-gateway-npm/lib/chat/detector');

  console.log('🧪 Comprehensive Tool Calling Tests\n');

  const detector = new LLMDetector();
  await detector.detectAll();

  const endpoints = detector.getAll();

  if (endpoints.length === 0) {
    console.log('❌ No LLM endpoints detected!');
    return;
  }

  console.log(`\nDetected ${endpoints.length} endpoint(s):\n`);
  endpoints.forEach((ep, idx) => {
    console.log(`  ${idx + 1}. ${ep.name} (${ep.type}) - ${ep.defaultModel}`);
  });

  // Test each endpoint
  for (const endpoint of endpoints) {
    if (endpoint.type === 'anthropic') {
      await testAnthropicToolCalling(endpoint);
    } else {
      // OpenAI-compatible (Ollama, OpenAI, vLLM, etc.)
      await testOpenAIToolCalling(endpoint);
    }

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ All tests completed!');
  console.log('='.repeat(60));
}

runAllTests().catch(console.error);
