# tgw chat Feature Design

## Overview

`tgw chat` is an interactive AI assistant that helps users configure and use Tokligence Gateway. It works independently without requiring a running gateway instance, making it perfect for first-time setup and troubleshooting.

## Key Design Principles

1. **Independence**: Works without requiring gateway to be running
2. **Local-First**: Prioritizes free local LLMs over commercial APIs
3. **Auto-Detection**: Automatically discovers available LLM endpoints
4. **Zero-Config**: Works out-of-the-box with Ollama/vLLM/LM Studio
5. **OpenAI-Compatible**: Unified interface for all providers

## Architecture

```
┌─────────────────────────────────────┐
│  tgw chat                           │
│  - Interactive CLI                  │
│  - Knowledge base from docs         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  LLM Detector                       │
│  - Auto-detect local LLMs           │
│  - Check environment variables      │
│  - Validate API keys                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  LLM Client (OpenAI SDK)            │
│  - Unified OpenAI-compatible API    │
│  - Supports all providers           │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Providers                          │
│  Ollama | vLLM | LM Studio         │
│  OpenAI | Anthropic | Google        │
│  Custom endpoints | Gateway         │
└─────────────────────────────────────┘
```

## Detection Priority

The system detects LLM endpoints in this order (highest to lowest priority):

1. **Ollama** (localhost:11434) - Local, free, auto-detect
2. **vLLM** (localhost:8000) - Local, free, auto-detect
3. **LM Studio** (localhost:1234) - Local, free, auto-detect
4. **Custom endpoint** (`TOKLIGENCE_LLM_ENDPOINT`) - User-provided
5. **OpenAI** (`TOKLIGENCE_OPENAI_API_KEY`) - Commercial
6. **Anthropic** (`TOKLIGENCE_ANTHROPIC_API_KEY`) - Commercial
7. **Google Gemini** (`TOKLIGENCE_GOOGLE_API_KEY`) - Commercial
8. **Running Gateway** (localhost:8081) - Optional, lowest priority

## Environment Variables

### Local LLMs (Recommended)

```bash
# Ollama - no configuration needed, auto-detected
# Just run: ollama serve

# vLLM (if not using default port)
VLLM_ENDPOINT=http://localhost:8000

# Any OpenAI-compatible endpoint
TOKLIGENCE_LLM_ENDPOINT=http://your-llm.com/v1
TOKLIGENCE_LLM_API_KEY=optional-key-if-needed
```

### Commercial LLMs

```bash
# OpenAI
TOKLIGENCE_OPENAI_API_KEY=sk-...
# or
OPENAI_API_KEY=sk-...

# Anthropic
TOKLIGENCE_ANTHROPIC_API_KEY=sk-ant-...
# or
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini
TOKLIGENCE_GOOGLE_API_KEY=AIza...
# or
GOOGLE_API_KEY=AIza...
```

### Gateway Configuration

```bash
# Email for gateway (will be prompted if not set)
TOKLIGENCE_EMAIL=user@example.com

# Gateway will be auto-detected if running
```

## Knowledge Base Strategy

### Build-Time Sync

Documentation is synced from the Go repository during npm package build:

```bash
scripts/sync-docs.js
  ↓
Copy from tokligence-gateway/
  - README.md
  - docs/configuration.md
  - docs/troubleshooting.md
  ↓
Generate lib/knowledge/_meta.json
  - Version
  - Commit hash
  - File hashes
  - Online URLs
  ↓
Package into npm
```

### Runtime Usage

```javascript
// Load local documentation snapshot
const knowledge = await loadKnowledge();

// Async check for updates (7 days interval)
checkForUpdates().catch(() => {});

// System prompt includes:
// - Local documentation
// - Links to latest online docs
// - Version information
```

### Benefits

- ✅ **Offline-capable**: Works without internet
- ✅ **Up-to-date**: Synced at build time
- ✅ **Update awareness**: Prompts user about newer versions
- ✅ **Best practices**: Includes links to latest documentation

## Function Calling

The chat assistant can execute gateway configuration commands:

### Available Tools

```javascript
const tools = [
  {
    name: 'set_config',
    description: 'Update gateway configuration',
    parameters: {
      key: 'string',    // e.g., 'openai_api_key'
      value: 'string'   // e.g., 'sk-...'
    }
  },
  {
    name: 'get_config',
    description: 'Get configuration value or list all',
    parameters: {
      key: 'string?'    // optional
    }
  },
  {
    name: 'get_status',
    description: 'Check if gateway is running'
  },
  {
    name: 'start_gateway',
    description: 'Start the gateway daemon',
    parameters: {
      daemon: 'boolean'  // default: true
    }
  },
  {
    name: 'stop_gateway',
    description: 'Stop the gateway daemon'
  }
]
```

### Example Interaction

```
User: I want to configure OpenAI