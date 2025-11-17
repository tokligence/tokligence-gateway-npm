const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const BinaryManager = require('./binary');

class Gateway {
  constructor(options = {}) {
    this.options = {
      port: options.port || 8081,  // Changed to 8081 to match gatewayd default
      host: options.host || 'localhost',
      config: options.config || null,
      daemon: options.daemon || false,
      ...options
    };

    this.binaryManager = new BinaryManager();
    this.process = null;
    this.pidFile = path.join(process.env.HOME || process.env.USERPROFILE, '.tokligence', 'gateway.pid');
    this.logFile = path.join(process.env.HOME || process.env.USERPROFILE, '.tokligence', 'gateway.log');
  }

  async start() {
    if (await this.isRunning()) {
      throw new Error('Gateway is already running');
    }

    const binaryPath = this.options.daemon
      ? this.binaryManager.getDaemonBinaryPath()
      : this.binaryManager.getBinaryPath();

    const args = [];

    // Add configuration options
    if (this.options.port) {
      args.push('--port', this.options.port.toString());
    }

    if (this.options.host) {
      args.push('--host', this.options.host);
    }

    if (this.options.config) {
      args.push('--config', this.options.config);
    }

    // Ensure log directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      let logFd;

      // For daemon mode, we let gatewayd handle its own logging
      // The log_file_daemon config in gateway.ini tells it where to write
      // This avoids the stdio WriteStream issue

      this.process = spawn(binaryPath, args, {
        detached: this.options.daemon,
        stdio: this.options.daemon ? 'ignore' : 'inherit',
        cwd: path.join(process.env.HOME || process.env.USERPROFILE, '.tokligence')
      });

      this.process.on('error', (err) => {
        reject(new Error(`Failed to start gateway: ${err.message}`));
      });

      // Save PID for daemon mode
      if (this.options.daemon) {
        fs.writeFileSync(this.pidFile, this.process.pid.toString());
        this.process.unref();
      }

      // Wait a bit and check if the server is responding
      setTimeout(async () => {
        try {
          await this.healthCheck();
          resolve();
        } catch (error) {
          // Server might need more time to start
          setTimeout(async () => {
            try {
              await this.healthCheck();
              resolve();
            } catch (error) {
              reject(new Error('Gateway started but is not responding'));
            }
          }, 2000);
        }
      }, 1000);
    });
  }

  async stop() {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
      return;
    }

    // Try to stop daemon process
    if (fs.existsSync(this.pidFile)) {
      const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8'));

      try {
        process.kill(pid, 'SIGTERM');
        fs.unlinkSync(this.pidFile);
      } catch (error) {
        if (error.code === 'ESRCH') {
          // Process doesn't exist, clean up PID file
          fs.unlinkSync(this.pidFile);
        } else {
          throw error;
        }
      }
    } else {
      throw new Error('No running gateway found');
    }
  }

  async status() {
    const running = await this.isRunning();

    if (!running) {
      return { running: false };
    }

    const pid = this.getPid();

    // Try to get more info from the API
    try {
      const response = await axios.get(`http://${this.options.host}:${this.options.port}/health`);

      return {
        running: true,
        pid: pid,
        port: this.options.port,
        host: this.options.host,
        uptime: response.data.uptime || 'unknown',
        version: response.data.version || 'unknown'
      };
    } catch (error) {
      // Basic status if API is not responding
      return {
        running: true,
        pid: pid,
        port: this.options.port,
        host: this.options.host,
        uptime: 'unknown',
        version: 'unknown'
      };
    }
  }

  async isRunning() {
    // Check if process is running
    if (this.process && !this.process.killed) {
      return true;
    }

    // Check daemon process via PID file
    if (fs.existsSync(this.pidFile)) {
      const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8'));

      try {
        process.kill(pid, 0); // Signal 0 = check if process exists
        return true;
      } catch (error) {
        // Process doesn't exist, clean up stale PID file
        try {
          fs.unlinkSync(this.pidFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }

    // Check for any gatewayd process using pgrep
    // Use exact match to avoid matching pgrep itself
    try {
      const { execSync } = require('child_process');
      const result = execSync('pgrep -x gatewayd', { encoding: 'utf8' });
      if (result.trim()) {
        return true;
      }
    } catch (error) {
      // pgrep returns non-zero exit code when no process found
    }

    // Final fallback: try health check on default port
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }

  async healthCheck() {
    try {
      const response = await axios.get(
        `http://${this.options.host}:${this.options.port}/health`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      throw new Error('Health check failed');
    }
  }

  getPid() {
    if (this.process) {
      return this.process.pid;
    }

    if (fs.existsSync(this.pidFile)) {
      const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8'));
      // Verify the process still exists
      try {
        process.kill(pid, 0);
        return pid;
      } catch (error) {
        // Process doesn't exist, clean up PID file
        try {
          fs.unlinkSync(this.pidFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }

    // Try to find gatewayd process via pgrep
    // Use exact match to avoid matching pgrep itself
    try {
      const { execSync } = require('child_process');
      const result = execSync('pgrep -x gatewayd', { encoding: 'utf8' });
      const pids = result.trim().split('\n');
      if (pids.length > 0 && pids[0]) {
        return parseInt(pids[0]);
      }
    } catch (error) {
      // pgrep returns non-zero when no process found
    }

    return null;
  }

  async init(options = {}) {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const configBaseDir = path.join(homeDir, '.tokligence', 'config');
    const settingsFile = path.join(configBaseDir, 'settings.ini');
    const envDir = path.join(configBaseDir, 'dev');
    const envFile = path.join(envDir, 'gateway.ini');

    // Check if already initialized
    if (fs.existsSync(settingsFile) && !options.force) {
      throw new Error('Configuration already exists. Use --force to overwrite.');
    }

    // Create directories
    if (!fs.existsSync(envDir)) {
      fs.mkdirSync(envDir, { recursive: true });
    }

    // Create settings.ini
    const settingsContent = `# Tokligence Gateway Settings
# Generated by @tokligence/gateway npm package

environment=dev
`;

    fs.writeFileSync(settingsFile, settingsContent);

    // Create dev/gateway.ini (main configuration)
    const envConfig = `# Tokligence Gateway Configuration - Development Environment
# Generated by @tokligence/gateway npm package
#
# IMPORTANT: This is the configuration file that gatewayd actually reads.
# Set your API keys via environment variables or edit this file directly.

# ========================================
# Provider Configuration
# ========================================

# OpenAI Provider
# Get your API key from: https://platform.openai.com/api-keys
openai_api_key=\${TOKLIGENCE_OPENAI_API_KEY}
openai_base_url=https://api.openai.com/v1

# Anthropic Provider
# Get your API key from: https://console.anthropic.com/
anthropic_api_key=\${TOKLIGENCE_ANTHROPIC_API_KEY}
anthropic_base_url=https://api.anthropic.com

# ========================================
# Account Configuration
# ========================================

# Your email (required)
# Default: cs@tokligence.ai
email=\${TOKLIGENCE_EMAIL:-cs@tokligence.ai}

# Display name (optional)
display_name=Tokligence Gateway User

# ========================================
# Server Configuration
# ========================================

# Marketplace integration (optional)
base_url=https://tokligence.ai
marketplace_enabled=false

# Enable provider features (optional)
enable_provider=false

# ========================================
# Logging Configuration
# ========================================

log_level=info
log_file_cli=\${HOME}/.tokligence/logs/gateway-cli.log
log_file_daemon=\${HOME}/.tokligence/logs/gatewayd.log

# ========================================
# Storage Paths
# ========================================

ledger_path=\${HOME}/.tokligence/ledger.db
identity_path=\${HOME}/.tokligence/identity.db

# ========================================
# Advanced Configuration
# ========================================

# Work mode: auto, passthrough, or translation
work_mode=auto

# Model routing (optional)
# Example: routes=gpt*=>openai,claude*=>anthropic
`;

    fs.writeFileSync(envFile, envConfig);

    // Create logs directory
    const logsDir = path.join(homeDir, '.tokligence', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    console.log('✓ Configuration initialized successfully!\n');
    console.log('Configuration files created:');
    console.log(`  Settings: ${settingsFile}`);
    console.log(`  Environment: ${envFile}\n`);
    console.log('Next steps:');
    console.log('  1. Set your API keys (choose one):');
    console.log('     a) Via environment variables (recommended):');
    console.log('        export TOKLIGENCE_EMAIL="your@email.com"');
    console.log('        export TOKLIGENCE_OPENAI_API_KEY="sk-..."');
    console.log('        export TOKLIGENCE_ANTHROPIC_API_KEY="sk-ant-..."\n');
    console.log('     b) Edit config file directly:');
    console.log(`        nano ${envFile}\n`);
    console.log('  2. Start the gateway:');
    console.log('        tgw start -d\n');
    console.log('  3. Check status:');
    console.log('        tgw status\n');
  }

  getEnvConfigPath() {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const settingsFile = path.join(homeDir, '.tokligence', 'config', 'settings.ini');

    let env = 'dev';

    // Read environment from settings.ini if it exists
    if (fs.existsSync(settingsFile)) {
      const ini = require('ini');
      try {
        const settings = ini.parse(fs.readFileSync(settingsFile, 'utf8'));
        env = settings.environment || 'dev';
      } catch (error) {
        // Use default if parsing fails
      }
    }

    return path.join(homeDir, '.tokligence', 'config', env, 'gateway.ini');
  }

  async listConfig() {
    const envFile = this.getEnvConfigPath();

    if (!fs.existsSync(envFile)) {
      throw new Error(`Configuration file not found: ${envFile}\nRun 'tgw init' to create it.`);
    }

    const ini = require('ini');
    const content = fs.readFileSync(envFile, 'utf8');
    return ini.parse(content);
  }

  async getConfig(key) {
    const config = await this.listConfig();

    if (!(key in config)) {
      throw new Error(`Configuration key not found: ${key}`);
    }

    return config[key];
  }

  async setConfig(key, value) {
    const envFile = this.getEnvConfigPath();

    if (!fs.existsSync(envFile)) {
      throw new Error(`Configuration file not found: ${envFile}\nRun 'tgw init' to create it.`);
    }

    const ini = require('ini');
    const config = await this.listConfig();

    config[key] = value;

    // Stringify with proper formatting
    const content = ini.stringify(config);
    fs.writeFileSync(envFile, content);
  }

  async logs(options = {}) {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const logsDir = path.join(homeDir, '.tokligence', 'logs');

    if (!fs.existsSync(logsDir)) {
      console.log('No logs available. Start the gateway first: tgw start');
      return;
    }

    // Find all log files
    const files = fs.readdirSync(logsDir)
      .filter(f => f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(logsDir, f),
        mtime: fs.statSync(path.join(logsDir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // Sort by most recent first

    if (files.length === 0) {
      console.log('No log files found');
      return;
    }

    // Use the most recent log file
    const latestLog = files[0].path;
    console.log(`Viewing: ${files[0].name}\n`);

    if (options.follow) {
      // Follow logs (like tail -f)
      const { spawn } = require('child_process');
      const tail = spawn('tail', ['-f', '-n', options.lines || '20', latestLog], {
        stdio: 'inherit'
      });

      process.on('SIGINT', () => {
        tail.kill();
        process.exit(0);
      });
    } else {
      // Show last N lines
      const { execSync } = require('child_process');
      try {
        const output = execSync(`tail -n ${options.lines || 20} "${latestLog}"`, { encoding: 'utf8' });
        console.log(output);
      } catch (error) {
        console.error('Failed to read log file:', error.message);
      }
    }
  }

  // Proxy methods for API calls
  async chat(options) {
    const response = await axios.post(
      `http://${this.options.host}:${this.options.port}/v1/chat/completions`,
      options
    );
    return response.data;
  }

  async completion(options) {
    const response = await axios.post(
      `http://${this.options.host}:${this.options.port}/v1/completions`,
      options
    );
    return response.data;
  }

  async listModels() {
    const response = await axios.get(
      `http://${this.options.host}:${this.options.port}/v1/models`
    );
    return response.data;
  }
}

module.exports = { Gateway };
module.exports.Gateway = Gateway;
module.exports.default = Gateway;