#!/usr/bin/env node

/**
 * Dedicated test for Google Gemini function calling
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiFunctionCalling() {
  console.log('🧪 Testing Google Gemini Function Calling...\n');

  const apiKey = process.env.TOKLIGENCE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.log('❌ No Google API key found');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Define a simple function for testing
  const tools = {
    functionDeclarations: [
      {
        name: 'get_current_weather',
        description: 'Get the current weather for a given location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city and state, e.g. San Francisco, CA'
            },
            unit: {
              type: 'string',
              enum: ['celsius', 'fahrenheit'],
              description: 'The temperature unit to use'
            }
          },
          required: ['location']
        }
      },
      {
        name: 'get_status',
        description: 'Check if the gateway is currently running',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ]
  };

  // Test 1: Simple function calling with weather
  console.log('1️⃣ Test 1: Weather function calling...\n');

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [tools],
      toolConfig: {
        functionCallingConfig: {
          mode: 'ANY' // Force function calling
        }
      }
    });

    const chat = model.startChat({
      history: []
    });

    console.log('User: What is the weather in San Francisco?\n');

    const result = await chat.sendMessage('What is the weather in San Francisco?');
    const response = result.response;

    // Check for function calls in the response structure
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let hasFunctionCall = false;

    for (const part of parts) {
      if (part.functionCall) {
        hasFunctionCall = true;
        console.log('✅ Function calling works!');
        console.log(`🔧 Function called: ${part.functionCall.name}`);
        console.log(`   Args: ${JSON.stringify(part.functionCall.args, null, 2)}\n`);
      }
    }

    if (!hasFunctionCall) {
      console.log('❌ No function calls detected');
      console.log('Response text:', response.text());
      console.log('\nNote: The model chose to respond directly instead of calling the function.\n');
    }

  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
    console.error(error);
  }

  // Test 2: Gateway status function calling
  console.log('\n2️⃣ Test 2: Gateway status function calling...\n');

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [tools],
      toolConfig: {
        functionCallingConfig: {
          mode: 'ANY' // Force function calling
        }
      }
    });

    const chat = model.startChat({
      history: []
    });

    console.log('User: Check the gateway status using the available tool\n');

    const result = await chat.sendMessage('Check the gateway status. Use the get_status function to check if the gateway is running.');
    const response = result.response;

    // Check for function calls
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let hasFunctionCall = false;

    for (const part of parts) {
      if (part.functionCall) {
        hasFunctionCall = true;
        console.log('✅ Function calling works!');
        console.log(`🔧 Function called: ${part.functionCall.name}`);
        console.log(`   Args: ${JSON.stringify(part.functionCall.args, null, 2)}\n`);
      }
    }

    if (!hasFunctionCall) {
      console.log('❌ No function calls detected');
      console.log('Response text:', response.text());
      console.log('\nNote: The model chose to respond directly instead of calling the function.\n');
    }

  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    console.error(error);
  }

  // Test 3: Streaming with function calling
  console.log('\n3️⃣ Test 3: Streaming with function calling...\n');

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [tools],
      toolConfig: {
        functionCallingConfig: {
          mode: 'ANY' // Force function calling
        }
      }
    });

    const chat = model.startChat({
      history: []
    });

    console.log('User: What is the weather in New York and London?\n');

    const result = await chat.sendMessageStream('What is the weather in New York and London? Use the weather function for each city.');

    let functionCallsDetected = false;
    let functionCallsData = [];

    for await (const chunk of result.stream) {
      // Check for function calls in chunk
      const candidate = chunk.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      for (const part of parts) {
        if (part.functionCall) {
          functionCallsDetected = true;
          functionCallsData.push(part.functionCall);
          console.log(`🔧 Function call detected: ${part.functionCall.name}`);
        }
      }

      const text = chunk.text();
      if (text) {
        process.stdout.write(text);
      }
    }

    console.log('\n');

    if (functionCallsDetected) {
      console.log('✅ Streaming function calling works!');
      console.log(`   Total function calls: ${functionCallsData.length}`);
      functionCallsData.forEach((fc, idx) => {
        console.log(`   ${idx + 1}. ${fc.name}: ${JSON.stringify(fc.args)}`);
      });
    } else {
      console.log('ℹ️  No function calls in streaming mode');
      console.log('   Note: The model may have chosen to respond directly.\n');
    }

  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
    console.error(error);
  }

  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║  Gemini Function Calling Test Complete  ║');
  console.log('╚═══════════════════════════════════════════╝\n');
}

// Run test
testGeminiFunctionCalling().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
