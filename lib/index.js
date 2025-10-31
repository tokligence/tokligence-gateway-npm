const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const BinaryManager = require('./binary');

class Gateway {
  constructor(options = {}) {
    this.options = {
      port: options.port || 8080,
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
      const logStream = fs.createWriteStream(this.logFile, { flags: 'a' });

      this.process = spawn(binaryPath, args, {
        detached: this.options.daemon,
        stdio: this.options.daemon ? ['ignore', logStream, logStream] : 'inherit'
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
    if (this.process) {
      return !this.process.killed;
    }

    // Check daemon process
    if (fs.existsSync(this.pidFile)) {
      const pid = parseInt(fs.readFileSync(this.pidFile, 'utf8'));

      try {
        process.kill(pid, 0);
        return true;
      } catch (error) {
        // Process doesn't exist
        return false;
      }
    }

    // Try health check
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
      return parseInt(fs.readFileSync(this.pidFile, 'utf8'));
    }

    return null;
  }

  async init(options = {}) {
    const configDir = path.join(process.env.HOME || process.env.USERPROFILE, '.tokligence');
    const configFile = path.join(configDir, 'config.yaml');

    if (fs.existsSync(configFile) && !options.force) {
      throw new Error('Configuration already exists. Use --force to overwrite.');
    }

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const defaultConfig = `# Tokligence Gateway Configuration
# Generated by @tokligence/gateway npm package

server:
  port: 8080
  host: localhost

providers:
  openai:
    api_key: \${OPENAI_API_KEY}
    base_url: https://api.openai.com/v1

  anthropic:
    api_key: \${ANTHROPIC_API_KEY}
    base_url: https://api.anthropic.com

  google:
    api_key: \${GOOGLE_API_KEY}
    base_url: https://generativelanguage.googleapis.com

# Logging configuration
logging:
  level: info
  file: ~/.tokligence/gateway.log

# Rate limiting
rate_limit:
  enabled: false
  requests_per_minute: 60
`;

    fs.writeFileSync(configFile, defaultConfig);
  }

  async getConfig(key) {
    // This would interact with the gateway API or read config file
    throw new Error('Not implemented yet');
  }

  async setConfig(key, value) {
    // This would interact with the gateway API or write config file
    throw new Error('Not implemented yet');
  }

  async listConfig() {
    // This would interact with the gateway API or read config file
    throw new Error('Not implemented yet');
  }

  async logs(options = {}) {
    if (!fs.existsSync(this.logFile)) {
      console.log('No logs available');
      return;
    }

    if (options.follow) {
      // Follow logs (like tail -f)
      const { spawn } = require('child_process');
      const tail = spawn('tail', ['-f', '-n', options.lines || '20', this.logFile], {
        stdio: 'inherit'
      });

      process.on('SIGINT', () => {
        tail.kill();
        process.exit(0);
      });
    } else {
      // Show last N lines
      const { execSync } = require('child_process');
      const output = execSync(`tail -n ${options.lines || 20} ${this.logFile}`);
      console.log(output.toString());
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