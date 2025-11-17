const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Knowledge Base Loader
 *
 * Loads documentation from local snapshot (bundled with npm package)
 * and provides links to latest online documentation.
 *
 * Strategy:
 * - Build-time: Sync docs from Go repo, generate _meta.json
 * - Runtime: Load local snapshot, async check for updates
 */

const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');
const META_FILE = path.join(KNOWLEDGE_DIR, '_meta.json');
const UPDATE_CHECK_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Load all documentation from local knowledge base
 * @returns {Object} Knowledge base content
 */
function loadKnowledge() {
  const knowledge = {
    meta: {},
    docs: {},
    links: {}
  };

  // Load metadata if exists
  if (fs.existsSync(META_FILE)) {
    try {
      knowledge.meta = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Failed to load knowledge metadata:', error.message);
    }
  }

  // Load all markdown files
  if (fs.existsSync(KNOWLEDGE_DIR)) {
    const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(KNOWLEDGE_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const name = path.basename(file, '.md');
      knowledge.docs[name] = content;
    }
  }

  // Set up online documentation links
  knowledge.links = {
    github: 'https://github.com/tokligence/tokligence-gateway',
    npm: 'https://www.npmjs.com/package/@tokligence/gateway',
    website: 'https://tokligence.ai',
    wiki: 'https://github.com/tokligence/tokligence-gateway/wiki',
    issues: 'https://github.com/tokligence/tokligence-gateway/issues'
  };

  return knowledge;
}

/**
 * Check if documentation needs updating
 * @returns {Promise<Object|null>} Update info or null
 */
async function checkForUpdates() {
  try {
    // Check when we last checked for updates
    const lastCheckFile = path.join(KNOWLEDGE_DIR, '.last_update_check');
    if (fs.existsSync(lastCheckFile)) {
      const lastCheck = parseInt(fs.readFileSync(lastCheckFile, 'utf8'));
      if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL) {
        return null; // Too soon to check again
      }
    }

    // Fetch latest version info from GitHub
    const response = await axios.get(
      'https://api.github.com/repos/tokligence/tokligence-gateway/releases/latest',
      { timeout: 5000 }
    );

    if (response.status === 200) {
      const latestVersion = response.data.tag_name;

      // Load our local version
      const meta = fs.existsSync(META_FILE)
        ? JSON.parse(fs.readFileSync(META_FILE, 'utf8'))
        : {};

      // Save check timestamp
      fs.writeFileSync(lastCheckFile, Date.now().toString());

      // Compare versions
      if (meta.version && meta.version !== latestVersion) {
        return {
          current: meta.version,
          latest: latestVersion,
          url: response.data.html_url,
          published: response.data.published_at
        };
      }
    }

    return null;
  } catch (error) {
    // Silently fail - offline mode should work
    return null;
  }
}

/**
 * Generate system prompt with knowledge base
 * @param {Object} knowledge - Knowledge base object
 * @returns {string} System prompt
 */
function buildSystemPrompt(knowledge) {
  const docSummary = Object.keys(knowledge.docs).length > 0
    ? `You have access to the following local documentation:\n${Object.keys(knowledge.docs).map(d => `- ${d}`).join('\n')}`
    : 'No local documentation available.';

  const versionInfo = knowledge.meta.version
    ? `\nDocumentation version: ${knowledge.meta.version}`
    : '';

  const prompt = `You are the Tokligence Gateway Assistant, helping users configure and use Tokligence Gateway.

Tokligence Gateway is a unified API gateway that provides:
- Unified API interface for multiple LLM providers (OpenAI, Anthropic, Google, etc.)
- Token management and cost tracking
- Request routing and load balancing
- Caching and rate limiting

${docSummary}${versionInfo}

Online Resources:
- GitHub: ${knowledge.links.github}
- npm Package: ${knowledge.links.npm}
- Website: ${knowledge.links.website}
- Documentation: ${knowledge.links.wiki}

Your role:
1. Answer questions about Tokligence Gateway configuration and usage
2. Help users configure their gateway settings
3. Provide troubleshooting assistance
4. Execute configuration commands when requested
5. Always refer to official documentation for latest information

Guidelines:
- Be concise and practical
- Provide command examples when relevant
- Use the available tools to execute configuration changes
- Always confirm before making changes
- Point users to online docs for detailed information

Available Tools:
- set_config: Update gateway configuration
- get_config: View current configuration
- get_status: Check if gateway is running
- start_gateway: Start the gateway daemon
- stop_gateway: Stop the gateway daemon

When users ask about configuration, you can use these tools to help them.`;

  return prompt;
}

/**
 * Get documentation content by name
 * @param {Object} knowledge - Knowledge base object
 * @param {string} name - Document name (without .md extension)
 * @returns {string|null} Document content
 */
function getDoc(knowledge, name) {
  return knowledge.docs[name] || null;
}

/**
 * Search documentation for keywords
 * @param {Object} knowledge - Knowledge base object
 * @param {string} query - Search query
 * @returns {Array} Matching sections
 */
function searchDocs(knowledge, query) {
  const results = [];
  const lowerQuery = query.toLowerCase();

  for (const [name, content] of Object.entries(knowledge.docs)) {
    const lines = content.split('\n');
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track sections (markdown headers)
      if (line.startsWith('#')) {
        currentSection = line.replace(/^#+\s*/, '');
      }

      // Check if line matches query
      if (line.toLowerCase().includes(lowerQuery)) {
        results.push({
          doc: name,
          section: currentSection,
          line: i + 1,
          content: line.trim()
        });
      }
    }
  }

  return results;
}

module.exports = {
  loadKnowledge,
  checkForUpdates,
  buildSystemPrompt,
  getDoc,
  searchDocs
};
