/**
 * Basic example of using Tokligence Gateway
 */

const { Gateway } = require('@tokligence/gateway');

async function main() {
  // Create a new gateway instance
  const gateway = new Gateway({
    port: 8080,
    host: 'localhost'
  });

  try {
    // Start the gateway
    console.log('Starting Tokligence Gateway...');
    await gateway.start();
    console.log('Gateway started successfully!');

    // Check status
    const status = await gateway.status();
    console.log('Status:', status);

    // Make a chat request
    console.log('\nMaking a chat request...');
    const response = await gateway.chat({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is 2+2?' }
      ]
    });

    console.log('Response:', response.choices[0].message.content);

    // List available models
    const models = await gateway.listModels();
    console.log('\nAvailable models:', models.data.map(m => m.id));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Stop the gateway
    console.log('\nStopping gateway...');
    await gateway.stop();
    console.log('Gateway stopped.');
  }
}

// Run the example
main().catch(console.error);