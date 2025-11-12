# @tokligence/gateway

[![npm version](https://badge.fury.io/js/@tokligence%2Fgateway.svg)](https://www.npmjs.com/package/@tokligence/gateway)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Sync Release](https://github.com/tokligence/tokligence-gateway-npm/actions/workflows/sync-release.yml/badge.svg)](https://github.com/tokligence/tokligence-gateway-npm/actions/workflows/sync-release.yml)

Node.js wrapper for [Tokligence Gateway](https://github.com/tokligence/tokligence-gateway) - A unified API gateway for multiple LLM providers (OpenAI, Anthropic, Google AI, and more).

## Features

- 🚀 **Easy Installation**: Install via npm, automatically downloads the appropriate binary for your platform
- 🔧 **CLI & API**: Use as a command-line tool or integrate programmatically with Node.js
- 🌍 **Cross-Platform**: Supports macOS, Linux, and Windows (x64 and arm64)
- 🔌 **Multiple Providers**: Unified interface for OpenAI, Anthropic, Google AI, and more
- 🛡️ **Production Ready**: Rate limiting, logging, and monitoring built-in

## Installation

### Global Installation (CLI)

```bash
npm install -g @tokligence/gateway
```

### Local Installation (Project Dependency)

```bash
npm install @tokligence/gateway
```

Or with other package managers:

```bash
# yarn
yarn add @tokligence/gateway

# pnpm
pnpm add @tokligence/gateway
```

## Quick Start

### CLI Usage

After global installation, you can use the `tokligence` command (or `tgw` as a shorthand):

```bash
# Initialize configuration
tokligence init       # or: tgw init

# Start the gateway server
tokligence start      # or: tgw start

# Start on a different port
tokligence start --port 3000

# Check status
tokligence status

# View logs
tokligence logs

# Stop the server
tokligence stop
```

### Programmatic Usage

```javascript
const { Gateway } = require('@tokligence/gateway');

// Create a gateway instance
const gateway = new Gateway({
  port: 8080,
  host: 'localhost'
});

// Start the server
await gateway.start();

// Make API calls
const response = await gateway.chat({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ]
});

console.log(response);

// Stop the server
await gateway.stop();
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### Configuration File

Initialize a configuration file:

```bash
tokligence init
```

This creates `~/.tokligence/config.yaml`:

```yaml
server:
  port: 8080
  host: localhost

providers:
  openai:
    api_key: ${OPENAI_API_KEY}
    base_url: https://api.openai.com/v1

  anthropic:
    api_key: ${ANTHROPIC_API_KEY}
    base_url: https://api.anthropic.com

  google:
    api_key: ${GOOGLE_API_KEY}
    base_url: https://generativelanguage.googleapis.com
```

### Configuration Management

```bash
# Get a configuration value
tokligence config get server.port

# Set a configuration value
tokligence config set server.port 3000

# List all configuration
tokligence config list
```

## API Reference

### Gateway Class

```javascript
const { Gateway } = require('@tokligence/gateway');
```

#### Constructor

```javascript
new Gateway(options)
```

Options:
- `port` (number): Server port (default: 8080)
- `host` (string): Server host (default: 'localhost')
- `config` (string): Path to configuration file
- `daemon` (boolean): Run in daemon mode

#### Methods

##### `start()`

Start the gateway server.

```javascript
await gateway.start();
```

##### `stop()`

Stop the gateway server.

```javascript
await gateway.stop();
```

##### `status()`

Get server status.

```javascript
const status = await gateway.status();
// { running: true, pid: 12345, port: 8080, uptime: '2h 30m' }
```

##### `chat(options)`

Make a chat completion request.

```javascript
const response = await gateway.chat({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello!' }
  ]
});
```

##### `listModels()`

List available models.

```javascript
const models = await gateway.listModels();
```

## Integration Examples

### Express.js Integration

```javascript
const express = require('express');
const { Gateway } = require('@tokligence/gateway');

const app = express();
const gateway = new Gateway({ port: 8081 });

app.get('/api/chat', async (req, res) => {
  try {
    const response = await gateway.chat({
      model: req.query.model || 'gpt-3.5-turbo',
      messages: req.body.messages
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start both servers
gateway.start().then(() => {
  app.listen(3000, () => {
    console.log('API server running on port 3000');
    console.log('Gateway running on port 8081');
  });
});
```

### Next.js API Route

```javascript
// pages/api/chat.js
import { Gateway } from '@tokligence/gateway';

const gateway = new Gateway();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure gateway is running
    if (!(await gateway.isRunning())) {
      await gateway.start();
    }

    const response = await gateway.chat(req.body);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Using with OpenAI SDK

```javascript
const OpenAI = require('openai');
const { Gateway } = require('@tokligence/gateway');

// Start the gateway
const gateway = new Gateway({ port: 8080 });
await gateway.start();

// Use OpenAI SDK with gateway endpoint
const openai = new OpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: 'any-key' // Gateway handles the actual API keys
});

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

## Direct Binary Access

If you need to run the Go binaries directly:

```bash
# Run gateway binary directly
npx tokligence-gateway --help

# Run daemon binary directly
npx tokligence-gatewayd --help
```

## Troubleshooting

### Binary Download Issues

If the automatic binary download fails during installation:

1. Check your internet connection
2. Verify GitHub is accessible
3. Manually download from [GitHub Releases](https://github.com/tokligence/tokligence-gateway/releases)
4. Place binaries in `node_modules/@tokligence/gateway/.bin/`

### Platform Support

Supported platforms:
- macOS (Intel & Apple Silicon)
- Linux (x64 & ARM64)
- Windows (x64)

### Logs

View gateway logs:

```bash
# View last 50 lines
tokligence logs -n 50

# Follow logs in real-time
tokligence logs -f
```

Default log location: `~/.tokligence/gateway.log`

## Development

### Building from Source

```bash
git clone https://github.com/tokligence/tokligence-gateway-npm.git
cd tokligence-gateway-npm
npm install
npm link
```

### Running Tests

```bash
npm test
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](https://github.com/tokligence/tokligence-gateway-npm/blob/main/CONTRIBUTING.md) for details.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Links

- [Main Repository](https://github.com/tokligence/tokligence-gateway)
- [NPM Package](https://www.npmjs.com/package/@tokligence/gateway)
- [Documentation](https://github.com/tokligence/tokligence-gateway/wiki)
- [Issues](https://github.com/tokligence/tokligence-gateway-npm/issues)

## Support

For issues and questions:
- NPM package issues: [GitHub Issues](https://github.com/tokligence/tokligence-gateway-npm/issues)
- Gateway issues: [Main Repo Issues](https://github.com/tokligence/tokligence-gateway/issues)