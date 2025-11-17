const readline = require('readline');
const chalk = require('chalk');
const { LLMDetector, selectEndpoint } = require('./detector');
const { loadKnowledge, checkForUpdates, buildSystemPrompt } = require('./knowledge');
const { createClient, getModel, createStreamingChat } = require('./client');
const { tools, parseToolCalls, executeToolCalls, getPlatformInfo } = require('./agent');

/**
 * Main chat interface
 *
 * Interactive CLI chat for helping users configure and use Tokligence Gateway
 */
class ChatSession {
  constructor(endpoint, client, model, knowledge) {
    this.endpoint = endpoint;
    this.client = client;
    this.model = model;
    this.knowledge = knowledge;
    this.messages = [];
    this.conversationHistory = [];

    // Initialize system prompt
    const systemPrompt = buildSystemPrompt(knowledge);
    this.messages.push({
      role: 'system',
      content: systemPrompt
    });
  }

  /**
   * Start the interactive chat loop
   */
  async start() {
    const platformInfo = getPlatformInfo();

    console.log(chalk.cyan('\n╔═══════════════════════════════════════════╗'));
    console.log(chalk.cyan('║   🤖 Tokligence Gateway Assistant        ║'));
    console.log(chalk.cyan('╚═══════════════════════════════════════════╝\n'));

    console.log(`Using: ${chalk.green(this.endpoint.name)}`);
    console.log(`Model: ${chalk.green(this.model)}`);
    console.log(`Platform: ${chalk.blue(platformInfo.platform)}\n`);

    // Check for documentation updates (async, non-blocking)
    this.checkUpdatesAsync();

    console.log(chalk.gray('Type your questions or requests. Type "exit" or "quit" to end the session.\n'));

    // Create readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.yellow('You: ')
    });

    rl.prompt();

    rl.on('line', async (input) => {
      const userInput = input.trim();

      // Check for exit commands
      if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
        console.log(chalk.gray('\nGoodbye! 👋\n'));
        rl.close();
        return;
      }

      // Skip empty input
      if (!userInput) {
        rl.prompt();
        return;
      }

      // Add user message
      this.messages.push({
        role: 'user',
        content: userInput
      });

      // Get AI response
      await this.getResponse(rl);

      rl.prompt();
    });

    rl.on('close', () => {
      process.exit(0);
    });
  }

  /**
   * Get AI response with tool calling support
   */
  async getResponse(rl) {
    try {
      console.log(chalk.cyan('\nAssistant: '));

      let shouldContinue = true;
      let iterationCount = 0;
      const maxIterations = 5; // Prevent infinite loops

      while (shouldContinue && iterationCount < maxIterations) {
        iterationCount++;

        // Create streaming chat completion
        const stream = await createStreamingChat(
          this.client,
          this.endpoint,
          this.model,
          this.messages,
          {
            tools,
            temperature: 0.7,
            maxTokens: 2048
          }
        );

        let assistantMessage = '';
        let toolCalls = [];

        // Process stream based on endpoint type
        if (this.endpoint.type === 'google') {
          // Google Gemini streaming format
          for await (const chunk of stream.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              process.stdout.write(chunkText);
              assistantMessage += chunkText;
            }

            // Handle function calls
            if (chunk.functionCalls) {
              for (const fc of chunk.functionCalls) {
                toolCalls.push({
                  id: `google_${Date.now()}_${toolCalls.length}`,
                  type: 'function',
                  function: {
                    name: fc.name,
                    arguments: JSON.stringify(fc.args)
                  }
                });
              }
            }
          }

          shouldContinue = toolCalls.length > 0;
        } else if (this.endpoint.type === 'anthropic') {
          // Anthropic streaming format
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                process.stdout.write(event.delta.text);
                assistantMessage += event.delta.text;
              }
            } else if (event.type === 'content_block_start') {
              if (event.content_block.type === 'tool_use') {
                toolCalls.push({
                  id: event.content_block.id,
                  type: 'function',
                  function: {
                    name: event.content_block.name,
                    arguments: ''
                  }
                });
              }
            } else if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
              // Accumulate tool arguments
              const lastTool = toolCalls[toolCalls.length - 1];
              if (lastTool) {
                lastTool.function.arguments += event.delta.partial_json;
              }
            } else if (event.type === 'message_stop') {
              shouldContinue = toolCalls.length > 0;
            }
          }
        } else {
          // OpenAI streaming format
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              // Stream text content to user
              process.stdout.write(delta.content);
              assistantMessage += delta.content;
            }

            // Handle tool calls
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
            }

            // Check if done
            if (chunk.choices[0]?.finish_reason === 'stop') {
              shouldContinue = false;
            } else if (chunk.choices[0]?.finish_reason === 'tool_calls') {
              shouldContinue = true;
            }
          }
        }

        console.log(''); // New line after streaming

        // Build assistant message object
        const messageObj = {
          role: 'assistant',
          content: assistantMessage || null
        };

        if (toolCalls.length > 0) {
          messageObj.tool_calls = toolCalls;
        }

        this.messages.push(messageObj);

        // Execute tool calls if present
        if (toolCalls.length > 0) {
          const parsedToolCalls = parseToolCalls(messageObj);
          const toolResults = await executeToolCalls(parsedToolCalls);

          // Add tool results to messages
          for (const result of toolResults) {
            this.messages.push(result);
          }

          // Continue the loop to get final response
          console.log(chalk.cyan('\nAssistant: '));
        } else {
          shouldContinue = false;
        }
      }

      if (iterationCount >= maxIterations) {
        console.log(chalk.yellow('\n⚠️  Maximum iterations reached. Please start a new query.'));
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));

      // Platform-specific error handling
      const platformInfo = getPlatformInfo();
      if (error.message.includes('ECONNREFUSED')) {
        console.log(chalk.yellow(`Note: Could not connect to ${this.endpoint.name}`));
        if (this.endpoint.local) {
          console.log(chalk.gray(`Please make sure it's running on ${this.endpoint.baseURL}`));
        }
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        console.log(chalk.yellow('Note: API key may be invalid or expired'));
      }
    }
  }

  /**
   * Check for documentation updates asynchronously
   */
  async checkUpdatesAsync() {
    try {
      const updateInfo = await checkForUpdates();
      if (updateInfo) {
        console.log(chalk.yellow(`\n📢 Documentation update available!`));
        console.log(chalk.gray(`   Current: ${updateInfo.current}`));
        console.log(chalk.gray(`   Latest: ${updateInfo.latest}`));
        console.log(chalk.gray(`   Visit: ${updateInfo.url}\n`));
      }
    } catch (error) {
      // Silently fail - not critical
    }
  }
}

/**
 * Main entry point for tgw chat
 */
async function startChat(options = {}) {
  try {
    console.log(chalk.bold('\n🚀 Starting Tokligence Gateway Chat...\n'));

    // Step 1: Detect available LLM endpoints
    const detector = new LLMDetector();
    await detector.detectAll();

    // Step 2: Select the best endpoint
    const endpoint = await selectEndpoint(detector);

    // Step 3: Create client
    const client = createClient(endpoint);
    const model = getModel(endpoint, options.model);

    // Step 4: Load knowledge base
    console.log('📚 Loading knowledge base...\n');
    const knowledge = await loadKnowledge();

    // Step 5: Start chat session
    const session = new ChatSession(endpoint, client, model, knowledge);
    await session.start();
  } catch (error) {
    console.error(chalk.red(`\n❌ Failed to start chat: ${error.message}\n`));

    // Provide helpful guidance
    const platformInfo = getPlatformInfo();
    console.log(chalk.yellow('Troubleshooting:'));

    if (platformInfo.isWindows) {
      console.log(chalk.gray('  • Check if Ollama/vLLM/LM Studio is running'));
      console.log(chalk.gray('  • Verify environment variables in System Properties'));
      console.log(chalk.gray('  • Try running as Administrator'));
    } else {
      console.log(chalk.gray('  • Check if Ollama/vLLM/LM Studio is running'));
      console.log(chalk.gray('  • Verify environment variables: printenv | grep TOKLIGENCE'));
      console.log(chalk.gray('  • Check file permissions in ~/.tokligence/'));
    }

    console.log(chalk.gray('\nFor more help, visit: https://github.com/tokligence/tokligence-gateway\n'));

    process.exit(1);
  }
}

module.exports = {
  startChat,
  ChatSession
};
