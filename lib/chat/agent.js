const { Gateway } = require('../index');
const os = require('os');

/**
 * Chat Agent with Function Calling
 *
 * Provides tools for the LLM to execute gateway configuration commands.
 * Handles cross-platform differences (Windows, macOS, Linux).
 */

// Create gateway instance for tool execution
const gateway = new Gateway();

/**
 * Tool definitions for function calling
 */
const tools = [
  {
    type: 'function',
    function: {
      name: 'set_config',
      description: 'Update a gateway configuration value. Use this when the user wants to configure or change a setting.',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Configuration key (e.g., "openai_api_key", "email", "port")'
          },
          value: {
            type: 'string',
            description: 'Configuration value to set'
          }
        },
        required: ['key', 'value']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_config',
      description: 'Get current gateway configuration. If key is provided, returns that specific value. If no key provided, returns all configuration.',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Optional configuration key to retrieve. If omitted, returns all config.'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_status',
      description: 'Check if the gateway daemon is currently running',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'start_gateway',
      description: 'Start the gateway daemon in the background',
      parameters: {
        type: 'object',
        properties: {
          daemon: {
            type: 'boolean',
            description: 'Whether to run as daemon (default: true)',
            default: true
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'stop_gateway',
      description: 'Stop the gateway daemon',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_logs',
      description: 'Get recent gateway logs',
      parameters: {
        type: 'object',
        properties: {
          lines: {
            type: 'number',
            description: 'Number of lines to retrieve (default: 50)',
            default: 50
          }
        },
        required: []
      }
    }
  }
];

/**
 * Get platform-specific information
 */
function getPlatformInfo() {
  const platform = os.platform();
  const isWindows = platform === 'win32';
  const isMac = platform === 'darwin';
  const isLinux = platform === 'linux';

  return {
    platform,
    isWindows,
    isMac,
    isLinux,
    pathSeparator: isWindows ? '\\' : '/',
    homeDir: os.homedir()
  };
}

/**
 * Execute a tool function
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} Tool execution result
 */
async function executeTool(toolName, args) {
  const platformInfo = getPlatformInfo();

  try {
    switch (toolName) {
      case 'set_config': {
        const { key, value } = args;
        await gateway.setConfig(key, value);
        return {
          success: true,
          message: `Configuration updated: ${key} = ${value}`,
          platform: platformInfo.platform
        };
      }

      case 'get_config': {
        const { key } = args;
        if (key) {
          const value = await gateway.getConfig(key);
          return {
            success: true,
            key,
            value,
            platform: platformInfo.platform
          };
        } else {
          const config = await gateway.listConfig();
          return {
            success: true,
            config,
            platform: platformInfo.platform
          };
        }
      }

      case 'get_status': {
        const isRunning = await gateway.isRunning();
        const pid = await gateway.getPid();

        return {
          success: true,
          running: isRunning,
          pid: pid || null,
          platform: platformInfo.platform,
          message: isRunning
            ? `Gateway is running (PID: ${pid})`
            : 'Gateway is not running'
        };
      }

      case 'start_gateway': {
        const { daemon = true } = args;

        // Check if already running
        if (await gateway.isRunning()) {
          return {
            success: false,
            message: 'Gateway is already running',
            platform: platformInfo.platform
          };
        }

        // Platform-specific startup
        await gateway.start({ daemon });

        // Wait a moment for startup
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify it started
        const isRunning = await gateway.isRunning();
        const pid = await gateway.getPid();

        if (isRunning) {
          return {
            success: true,
            message: `Gateway started successfully (PID: ${pid})`,
            pid,
            platform: platformInfo.platform,
            note: platformInfo.isWindows
              ? 'Running on Windows - check Task Manager if issues occur'
              : 'Running in background'
          };
        } else {
          return {
            success: false,
            message: 'Gateway failed to start. Check logs for details.',
            platform: platformInfo.platform
          };
        }
      }

      case 'stop_gateway': {
        // Check if running
        if (!(await gateway.isRunning())) {
          return {
            success: false,
            message: 'Gateway is not running',
            platform: platformInfo.platform
          };
        }

        // Platform-specific shutdown
        await gateway.stop();

        // Wait a moment for shutdown
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify it stopped
        const isRunning = await gateway.isRunning();

        return {
          success: !isRunning,
          message: isRunning
            ? 'Gateway may still be shutting down'
            : 'Gateway stopped successfully',
          platform: platformInfo.platform
        };
      }

      case 'get_logs': {
        const { lines = 50 } = args;

        try {
          const logs = await gateway.logs({ lines });
          return {
            success: true,
            logs,
            lines,
            platform: platformInfo.platform
          };
        } catch (error) {
          return {
            success: false,
            message: `Failed to retrieve logs: ${error.message}`,
            platform: platformInfo.platform,
            note: platformInfo.isWindows
              ? 'Check %USERPROFILE%\\.tokligence\\logs\\ directory'
              : 'Check ~/.tokligence/logs/ directory'
          };
        }
      }

      default:
        return {
          success: false,
          message: `Unknown tool: ${toolName}`,
          platform: platformInfo.platform
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      platform: platformInfo.platform,
      note: getPlatformSpecificErrorNote(error, platformInfo)
    };
  }
}

/**
 * Get platform-specific error notes
 */
function getPlatformSpecificErrorNote(error, platformInfo) {
  const errorMsg = error.message.toLowerCase();

  // Permission errors
  if (errorMsg.includes('permission') || errorMsg.includes('eacces')) {
    if (platformInfo.isWindows) {
      return 'Try running as Administrator';
    } else {
      return 'Try running with sudo or check file permissions';
    }
  }

  // Path errors
  if (errorMsg.includes('enoent') || errorMsg.includes('not found')) {
    if (platformInfo.isWindows) {
      return `Check paths in ${platformInfo.homeDir}\\.tokligence\\`;
    } else {
      return `Check paths in ${platformInfo.homeDir}/.tokligence/`;
    }
  }

  // Port errors
  if (errorMsg.includes('eaddrinuse') || errorMsg.includes('port')) {
    if (platformInfo.isWindows) {
      return 'Check if another process is using the port (use netstat -ano)';
    } else {
      return 'Check if another process is using the port (use lsof -i)';
    }
  }

  return null;
}

/**
 * Parse tool calls from LLM response
 * @param {Object} message - LLM message with tool calls
 * @returns {Array} Parsed tool calls
 */
function parseToolCalls(message) {
  if (!message.tool_calls || message.tool_calls.length === 0) {
    return [];
  }

  return message.tool_calls.map(toolCall => ({
    id: toolCall.id,
    name: toolCall.function.name,
    args: JSON.parse(toolCall.function.arguments)
  }));
}

/**
 * Execute all tool calls from a message
 * @param {Array} toolCalls - Parsed tool calls
 * @returns {Promise<Array>} Tool execution results
 */
async function executeToolCalls(toolCalls) {
  const results = [];

  for (const toolCall of toolCalls) {
    console.log(`\n🔧 Executing: ${toolCall.name}`, toolCall.args);

    const result = await executeTool(toolCall.name, toolCall.args);

    results.push({
      tool_call_id: toolCall.id,
      role: 'tool',
      name: toolCall.name,
      content: JSON.stringify(result)
    });

    // Show result to user
    if (result.success) {
      console.log(`✓ ${result.message || 'Success'}`);
    } else {
      console.log(`✗ ${result.message || result.error || 'Failed'}`);
      if (result.note) {
        console.log(`  Note: ${result.note}`);
      }
    }
  }

  return results;
}

module.exports = {
  tools,
  executeTool,
  parseToolCalls,
  executeToolCalls,
  getPlatformInfo
};
