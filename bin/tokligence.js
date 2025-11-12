#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const { Gateway } = require('../lib');
const pkg = require('../package.json');

program
  .name('tokligence')
  .description('Tokligence Gateway CLI - Multi-provider LLM Gateway')
  .version(pkg.version);

program
  .command('start')
  .description('Start Tokligence Gateway server')
  .option('-p, --port <port>', 'Port to listen on', '8080')
  .option('-H, --host <host>', 'Host to bind to', 'localhost')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-d, --daemon', 'Run in daemon mode')
  .action(async (options) => {
    const spinner = ora('Starting Tokligence Gateway...').start();

    try {
      const gateway = new Gateway(options);
      await gateway.start();

      spinner.succeed(chalk.green(`Gateway started on http://${options.host}:${options.port}`));

      if (!options.daemon) {
        console.log(chalk.yellow('\nPress Ctrl+C to stop the server\n'));

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\n' + chalk.yellow('Shutting down...'));
          await gateway.stop();
          process.exit(0);
        });
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to start gateway'));
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('Stop Tokligence Gateway server')
  .action(async () => {
    const spinner = ora('Stopping Tokligence Gateway...').start();

    try {
      const gateway = new Gateway();
      await gateway.stop();
      spinner.succeed(chalk.green('Gateway stopped'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to stop gateway'));
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check Tokligence Gateway status')
  .action(async () => {
    try {
      const gateway = new Gateway();
      const status = await gateway.status();

      if (status.running) {
        console.log(chalk.green('✓ Gateway is running'));
        console.log(`  PID: ${status.pid}`);
        console.log(`  Port: ${status.port}`);
        console.log(`  Uptime: ${status.uptime}`);
      } else {
        console.log(chalk.yellow('○ Gateway is not running'));
      }
    } catch (error) {
      console.error(chalk.red('Failed to check status:'), error.message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize Tokligence Gateway configuration')
  .option('-f, --force', 'Overwrite existing configuration')
  .action(async (options) => {
    const spinner = ora('Initializing configuration...').start();

    try {
      const gateway = new Gateway();
      await gateway.init(options);
      spinner.succeed(chalk.green('Configuration initialized'));
      console.log(chalk.gray('Configuration file created at: ~/.tokligence/config.yaml'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to initialize configuration'));
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Manage Tokligence Gateway configuration')
  .addCommand(
    program.createCommand('get')
      .argument('<key>', 'Configuration key to get')
      .description('Get configuration value')
      .action(async (key) => {
        try {
          const gateway = new Gateway();
          const value = await gateway.getConfig(key);
          console.log(value);
        } catch (error) {
          console.error(chalk.red('Failed to get configuration:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    program.createCommand('set')
      .argument('<key>', 'Configuration key to set')
      .argument('<value>', 'Configuration value to set')
      .description('Set configuration value')
      .action(async (key, value) => {
        try {
          const gateway = new Gateway();
          await gateway.setConfig(key, value);
          console.log(chalk.green(`✓ Set ${key} = ${value}`));
        } catch (error) {
          console.error(chalk.red('Failed to set configuration:'), error.message);
          process.exit(1);
        }
      })
  )
  .addCommand(
    program.createCommand('list')
      .description('List all configuration')
      .action(async () => {
        try {
          const gateway = new Gateway();
          const config = await gateway.listConfig();
          console.log(JSON.stringify(config, null, 2));
        } catch (error) {
          console.error(chalk.red('Failed to list configuration:'), error.message);
          process.exit(1);
        }
      })
  );

program
  .command('logs')
  .description('View Tokligence Gateway logs')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <lines>', 'Number of lines to show', '20')
  .action(async (options) => {
    try {
      const gateway = new Gateway();
      await gateway.logs(options);
    } catch (error) {
      console.error(chalk.red('Failed to view logs:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);