# tgw chat Implementation Guide

## File Structure

```
tokligence-gateway-npm/
├── lib/
│   ├── chat/
│   │   ├── index.js          # Main entry point, chat loop
│   │   ├── detector.js       # LLM endpoint detection
│   │   ├── client.js         # OpenAI client creation
│   │   ├── agent.js          # LLM Agent with function calling
│   │   ├── knowledge.js      # Knowledge base loader
│   │   ├── setup.js          # Interactive configuration
│   │   └── prompts.js        # System prompt templates
│   ├── knowledge/            # Documentation snapshot
│   │   ├── README.md
│   │   ├── configuration.md
│   │   ├── troubleshooting.md
│   │   ├── _meta.json        # Version, hashes, links
│   │   └── .version
│   └── index.js
├── scripts/
│   └── sync-docs.js          # Sync docs from Go repo
├── bin/
│   └── tokligence.js         # CLI with chat command
└── docs/
    ├── chat-feature-design.md
    └── chat-implementation.md
```

## Core Components

### 1. LLM Detector (lib/chat/detector.js)

Auto-detects all available LLM endpoints with priority ordering.

```javascript
const axios = require('axios');
const chalk = require('chalk');

class LLMDetector {
  constructor() {
    this.endpoints = [];
  }

  async detectAll() {
    console.log(chalk.gray('Detecting available LLM endpoints...\n'));

    // Priority order (1 = highest)
    await this.detectOllama();           // Priority 1
    await this.detectVLLM();             // Priority 2
    await this.detectLMStudio();         // Priority 3
    await this.detectCustomEndpoint();   // Priority 4
    await this.detectCommercialLLMs();   // Priority 5-7
    await this.detectGateway();          // Priority 8

    return this.endpoints;
  }

  async detectOllama() {
    try {
      const response = await axios.get('http://localhost:11434/api/tags', {
        timeout: 1000
      });

      if (response.status === 200) {
        const models = response.data.models || [];
        this.endpoints.push({
          name: 'Ollama (local)',
          type: 'ollama',
          baseURL: 'http://localhost:11434/v1',
          apiKey: 'ollama',
          models: models.map(m => m.name),
          free: true,
          local: true,
          priority: 1
        });
        console.log(chalk.green(`✓ Found Ollama - ${models.length} models`));
      }
    } catch (error) {
      // Ollama not running
    }
  }

  async detectVLLM() {
    const vllmUrl = process.env.VLLM_ENDPOINT || 'http://localhost:8000';
    try {
      const response = await axios.get(`${vllmUrl}/v1/models`, {
        timeout: 1000
      });

      if (response.status === 200) {
        const models = response.data.data || [];
        this.endpoints.push({
          name: 'vLLM (local)',
          type: 'vllm',
          baseURL: `${vllmUrl}/v1`,
          apiKey: 'vllm',
          models: models.map(m => m.id),
          free: true,
          local: true,
          priority: 2
        });
        console.log(chalk.green(`✓ Found vLLM - ${models.length} models`));
      }
    } catch (error) {
      // vLLM not running
    }
  }

  async detectLMStudio() {
    try {
      const response = await axios.get('http://localhost:1234/v1/models', {
        timeout: 1000
      });

      if (response.status === 200) {
        const models = response.data.data || [];
        this.endpoints.push({
          name: 'LM Studio (local)',
          type: 'lmstudio',
          baseURL: 'http://localhost:1234/v1',
          apiKey: 'lmstudio',
          models: models.map(m => m.id),
          free: true,
          local: true,
          priority: 3
        });
        console.log(chalk.green(`✓ Found LM Studio - ${models.length} models`));
      }
    } catch (error) {
      // LM Studio not running
    }
  }

  async detectCustomEndpoint() {
    const endpoint = process.env.TOKLIGENCE_LLM_ENDPOINT || process.env.OPENAI_BASE_URL;
    if (!endpoint) return;

    const apiKey = process.env.TOKLIGENCE_LLM_API_KEY
      || process.env.OPENAI_API_KEY
      || 'not-needed';

    try {
      const response = await axios.get(`${endpoint}/models`, {
        headers: apiKey !== 'not-needed' ? { 'Authorization': `Bearer ${apiKey}` } : {},
        timeout: 2000
      });

      const models = response.data.data ? response.data.data.map(m => m.id) : ['default'];

      this.endpoints.push({
        name: 'Custom Endpoint',
        type: 'custom',
        baseURL: endpoint,
        apiKey: apiKey,
        models: models,
        priority: 4
      });
      console.log(chalk.green(`✓ Found custom endpoint - ${endpoint}`));
    } catch (error) {
      // Still add endpoint even if can't verify
      this.endpoints.push({
        name: 'Custom Endpoint',
        type: 'custom',
        baseURL: endpoint,
        apiKey: apiKey,
        models: ['default'],
        priority: 4
      });
      console.log(chalk.yellow(`⚠ Custom endpoint detected: ${endpoint}`));
    }
  }

  async detectCommercialLLMs() {
    // OpenAI
    const openaiKey = process.env.TOKLIGENCE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (openaiKey && /^sk-[a-zA-Z0-9]{48,}/.test(openaiKey)) {
      this.endpoints.push({
        name: 'OpenAI',
        type: 'openai',
        baseURL: 'https://api.openai.com/v1',
        apiKey: openaiKey,
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
        free: false,
        priority: 5
      });
      console.log(chalk.green('✓ Found OpenAI API key'));
    }

    // Anthropic
    const anthropicKey = process.env.TOKLIGENCE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (anthropicKey && /^sk-ant-/.test(anthropicKey)) {
      this.endpoints.push({
        name: 'Anthropic',
        type: 'anthropic',
        baseURL: 'https://api.anthropic.com/v1',
        apiKey: anthropicKey,
        models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
        free: false,
        priority: 6
      });
      console.log(chalk.green('✓ Found Anthropic API key'));
    }

    // Google Gemini
    const googleKey = process.env.TOKLIGENCE_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    if (googleKey && /^AIza/.test(googleKey)) {
      this.endpoints.push({
        name: 'Google Gemini',
        type: 'google',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: googleKey,
        models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro'],
        free: false,
        priority: 7
      });
      console.log(chalk.green('✓ Found Google API key'));
    }
  }

  async detectGateway() {
    try {
      const response = await axios.get('http://localhost:8081/health', {
        timeout: 1000
      });

      const adapters = response.data.adapters || [];
      const llmAdapters = adapters.filter(a => a !== 'loopback');

      if (llmAdapters.length > 0) {
        this.endpoints.push({
          name: 'Local Gateway',
          type: 'gateway',
          baseURL: 'http://localhost:8081/v1',
          apiKey: 'gateway',
          models: ['auto'],
          adapters: llmAdapters,
          priority: 8
        });
        console.log(chalk.green(`✓ Found gateway - ${llmAdapters.join(', ')}`));
      }
    } catch (error) {
      // Gateway not running
    }
  }
}

async function selectEndpoint(endpoints) {
  if (endpoints.length === 0) {
    return null;
  }

  // Sort by priority
  endpoints.sort((a, b) => a.priority - b.priority);

  // If only one, use it
  if (endpoints.length === 1) {
    const ep = endpoints[0];
    console.log(chalk.green(`\n✓ Using ${ep.name}`));
    if (ep.local) {
      console.log(chalk.gray('  (Free, running locally)'));
    }
    return ep;
  }

  // Multiple endpoints - let user choose
  const inquirer = require('inquirer');
  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: 'Multiple LLM endpoints detected. Which one would you like to use?',
      choices: endpoints.map(ep => ({
        name: `${ep.name}${ep.local ? ' (local, free)' : ''} - ${ep.models.length} models`,
        value: ep.name
      }))
    }
  ]);

  return endpoints.find(ep => ep.name === selected);
}

module.exports = { LLMDetector, selectEndpoint };
```

### 2. Knowledge Base Loader (lib/chat/knowledge.js)

Loads documentation and checks for updates.

```javascript
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const os = require('os');

const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');
const UPDATE_CHECK_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days
const LAST_CHECK_FILE = path.join(os.homedir(), '.tokligence', 'last-doc-check');

async function checkForUpdates(silent = false) {
  // Check if we need to check for updates
  if (fs.existsSync(LAST_CHECK_FILE)) {
    const lastCheck = parseInt(fs.readFileSync(LAST_CHECK_FILE, 'utf8'));
    if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL) {
      return null; // Recently checked
    }
  }

  try {
    const localMeta = JSON.parse(
      fs.readFileSync(path.join(KNOWLEDGE_DIR, '_meta.json'), 'utf8')
    );

    const response = await axios.get(
      'https://raw.githubusercontent.com/tokligence/tokligence-gateway-npm/main/lib/knowledge/_meta.json',
      { timeout: 3000 }
    );

    const remoteMeta = response.data;

    // Record check time
    const tokligenceDir = path.join(os.homedir(), '.tokligence');
    if (!fs.existsSync(tokligenceDir)) {
      fs.mkdirSync(tokligenceDir, { recursive: true });
    }
    fs.writeFileSync(LAST_CHECK_FILE, Date.now().toString());

    // Compare versions
    if (remoteMeta.version !== localMeta.version) {
      if (!silent) {
        console.log(chalk.yellow('\n📚 Documentation update available!'));
        console.log(chalk.gray(`   Current: v${localMeta.version}`));
        console.log(chalk.gray(`   Latest:  v${remoteMeta.version}`));
        console.log(chalk.gray('   Update:  npm update -g @tokligence/gateway\n'));
      }
      return remoteMeta;
    }
  } catch (error) {
    // Network error, silent fail
    if (!silent) {
      console.log(chalk.gray('(Using offline documentation)\n'));
    }
  }

  return null;
}

async function loadKnowledge(options = {}) {
  const { checkUpdates = true } = options;

  // Async check for updates (non-blocking)
  if (checkUpdates) {
    checkForUpdates(false).catch(() => {});
  }

  // Load local documentation
  let knowledge = '';

  const meta = JSON.parse(
    fs.readFileSync(path.join(KNOWLEDGE_DIR, '_meta.json'), 'utf8')
  );

  console.log(chalk.gray(`Using documentation v${meta.version}\n`));

  // Load all documentation files
  for (const doc of meta.docs) {
    const filePath = path.join(KNOWLEDGE_DIR, doc.file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      knowledge += `\n\n# ${doc.file}\n\n${content}`;
    }
  }

  // Add links to latest online documentation
  knowledge += `\n\n# Latest Documentation\n\n`;
  knowledge += `For the most up-to-date information, visit:\n`;
  for (const doc of meta.docs) {
    knowledge += `- ${doc.file}: ${doc.url}\n`;
  }
  knowledge += `\nOnline Wiki: https://github.com/tokligence/tokligence-gateway/wiki\n`;

  return knowledge;
}

module.exports = { loadKnowledge, checkForUpdates };
```

### 3. Documentation Sync Script (scripts/sync-docs.js)

Syncs documentation from Go repository during build.

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const GO_REPO_PATH = process.env.GO_REPO_PATH || '../tokligence-gateway';
const KNOWLEDGE_DIR = path.join(__dirname, '../lib/knowledge');

const DOCS_TO_SYNC = [
  {
    source: 'README.md',
    dest: 'README.md'
  },
  {
    source: 'docs/configuration.md',
    dest: 'configuration.md'
  },
  {
    source: 'docs/troubleshooting.md',
    dest: 'troubleshooting.md'
  },
  {
    source: 'docs/api.md',
    dest: 'api.md'
  }
];

function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function syncDocs() {
  console.log('Syncing documentation from Go repo...');

  if (!fs.existsSync(GO_REPO_PATH)) {
    console.warn(`⚠️  Go repo not found at ${GO_REPO_PATH}`);
    console.warn('Using existing documentation snapshot');
    return;
  }

  // Ensure knowledge directory exists
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  }

  const meta = {
    version: require('../package.json').version,
    buildDate: new Date().toISOString(),
    sourceRepo: 'https://github.com/tokligence/tokligence-gateway',
    sourceCommit: execSync('git rev-parse --short HEAD', {
      cwd: GO_REPO_PATH,
      encoding: 'utf8'
    }).trim(),
    docs: []
  };

  // Copy documentation files
  for (const doc of DOCS_TO_SYNC) {
    const sourcePath = path.join(GO_REPO_PATH, doc.source);
    const destPath = path.join(KNOWLEDGE_DIR, doc.dest);

    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      const hash = getFileHash(destPath);

      meta.docs.push({
        file: doc.dest,
        url: `https://github.com/tokligence/tokligence-gateway/blob/main/${doc.source}`,
        hash: `sha256:${hash}`
      });

      console.log(`✓ Synced ${doc.source} -> ${doc.dest}`);
    } else {
      console.warn(`⚠️  ${doc.source} not found`);
    }
  }

  // Write meta.json
  fs.writeFileSync(
    path.join(KNOWLEDGE_DIR, '_meta.json'),
    JSON.stringify(meta, null, 2)
  );

  // Write version file
  fs.writeFileSync(
    path.join(KNOWLEDGE_DIR, '.version'),
    meta.version
  );

  console.log('✓ Documentation sync complete');
}

if (require.main === module) {
  syncDocs();
}

module.exports = { syncDocs };
```

## Implementation Phases

### Phase 1: Basic Infrastructure (Day 1)

- [x] Create `lib/chat/` directory structure
- [ ] Implement `LLMDetector` class
- [ ] Implement `loadKnowledge` function
- [ ] Create `sync-docs.js` script
- [ ] Update `package.json` with prebuild hook

### Phase 2: LLM Integration (Day 2)

- [ ] Implement `ChatAgent` class with OpenAI SDK
- [ ] Define function calling tools
- [ ] Implement tool execution logic
- [ ] Test with Ollama

### Phase 3: CLI Integration (Day 2-3)

- [ ] Add `chat` command to `bin/tokligence.js`
- [ ] Implement interactive chat loop
- [ ] Add endpoint selection logic
- [ ] Test end-to-end workflow

### Phase 4: Polish (Day 3)

- [ ] Optimize system prompts
- [ ] Add error handling
- [ ] Update README with chat examples
- [ ] Create demo screenshots

### Phase 5: Optional Enhancements (Future)

- [ ] Interactive confirmation for config changes
- [ ] Chat history persistence
- [ ] Support for Anthropic SDK (native)
- [ ] Multi-language support

## Dependencies

```json
{
  "dependencies": {
    "openai": "^4.67.0",        // Main LLM SDK
    "inquirer": "^9.2.0",       // Interactive prompts
    "axios": "^1.6.0",          // HTTP requests
    "chalk": "^4.1.2",          // Terminal colors
    "ora": "^5.4.1"             // Spinners
  }
}
```

## Testing

### Manual Testing Checklist

- [ ] Test with Ollama running
- [ ] Test with vLLM running
- [ ] Test with LM Studio running
- [ ] Test with OpenAI API key
- [ ] Test with Anthropic API key
- [ ] Test with custom endpoint
- [ ] Test with no LLM available
- [ ] Test with running gateway
- [ ] Test function calling (set_config, get_config, etc.)
- [ ] Test documentation updates check
- [ ] Test offline mode

### Automated Testing

```javascript
// test/chat.test.js
const { LLMDetector } = require('../lib/chat/detector');

describe('LLMDetector', () => {
  it('should detect Ollama if running', async () => {
    const detector = new LLMDetector();
    const endpoints = await detector.detectAll();
    // Add assertions
  });

  // More tests...
});
```

## Release Checklist

- [ ] Documentation synced from Go repo
- [ ] All tests passing
- [ ] README updated with chat examples
- [ ] Version bumped in package.json
- [ ] CHANGELOG updated
- [ ] npm publish

## Future Enhancements

1. **Voice Input**: Use Whisper API for voice commands
2. **Streaming Responses**: Stream LLM responses for better UX
3. **Multi-turn Context**: Maintain conversation context across sessions
4. **Templates**: Pre-defined conversation templates for common tasks
5. **Plugins**: Allow users to extend chat with custom tools
