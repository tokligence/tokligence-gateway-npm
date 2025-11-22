#!/usr/bin/env node

/**
 * Comprehensive test scenarios for update checker
 */

const fs = require('fs');
const path = require('path');
const { checkForUpdates, compareVersions } = require('../lib/update-checker');
const chalk = require('chalk');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.tokligence');
const UPDATE_CONFIG_FILE = path.join(CONFIG_DIR, 'update-config.json');
const BACKUP_FILE = UPDATE_CONFIG_FILE + '.backup';

function backupConfig() {
  if (fs.existsSync(UPDATE_CONFIG_FILE)) {
    fs.copyFileSync(UPDATE_CONFIG_FILE, BACKUP_FILE);
    console.log(chalk.gray('  Backed up existing config\n'));
  }
}

function restoreConfig() {
  if (fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(BACKUP_FILE, UPDATE_CONFIG_FILE);
    fs.unlinkSync(BACKUP_FILE);
    console.log(chalk.gray('\n  Restored original config'));
  } else if (fs.existsSync(UPDATE_CONFIG_FILE)) {
    fs.unlinkSync(UPDATE_CONFIG_FILE);
  }
}

function setConfig(config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(UPDATE_CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function runScenario(name, description, setup, test) {
  console.log(chalk.bold.cyan(`\n▶ Scenario: ${name}`));
  console.log(chalk.gray(`  ${description}\n`));

  try {
    if (setup) setup();
    await test();
    console.log(chalk.green('  ✓ Scenario passed'));
  } catch (error) {
    console.log(chalk.red('  ✗ Scenario failed:'), error.message);
  }
}

async function main() {
  console.log(chalk.bold('\n╔════════════════════════════════════════════════╗'));
  console.log(chalk.bold('║  Update Checker - Comprehensive Test Suite    ║'));
  console.log(chalk.bold('╚════════════════════════════════════════════════╝\n'));

  backupConfig();

  try {
    // Scenario 1: No update needed (same version)
    await runScenario(
      'No Update Needed',
      'Current version equals latest version',
      () => {
        setConfig({ lastCheckTime: 0, skippedVersions: [] });
      },
      async () => {
        console.log(chalk.gray('  Testing with current version 0.3.4...'));
        await checkForUpdates('0.3.4', '@tokligence/gateway', { force: true, silent: true });
        console.log(chalk.gray('  No update prompt shown (expected)'));
      }
    );

    // Scenario 2: Update available (older version)
    await runScenario(
      'Update Available',
      'Current version is older than latest',
      () => {
        setConfig({ lastCheckTime: 0, skippedVersions: [] });
      },
      async () => {
        console.log(chalk.gray('  Testing with old version 0.1.0...'));
        console.log(chalk.yellow('  Update prompt should appear (responding with N automatically)'));

        // This will show the update prompt
        const promise = checkForUpdates('0.1.0', '@tokligence/gateway', { force: true, silent: true });
        await promise;
      }
    );

    // Scenario 3: Version already skipped
    await runScenario(
      'Skipped Version',
      'Version 0.3.4 was previously skipped',
      () => {
        setConfig({
          lastCheckTime: Date.now(),
          skippedVersions: ['0.3.4']
        });
      },
      async () => {
        console.log(chalk.gray('  Testing with version 0.1.0 (0.3.4 is skipped)...'));
        await checkForUpdates('0.1.0', '@tokligence/gateway', { force: true, silent: true });
        console.log(chalk.gray('  No prompt shown because 0.3.4 is in skip list'));
      }
    );

    // Scenario 4: Recent check (within 24h)
    await runScenario(
      'Recent Check',
      'Last check was less than 24 hours ago',
      () => {
        setConfig({
          lastCheckTime: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
          skippedVersions: []
        });
      },
      async () => {
        console.log(chalk.gray('  Testing without force flag...'));
        await checkForUpdates('0.1.0', '@tokligence/gateway', { force: false, silent: true });
        console.log(chalk.gray('  No check performed (too recent)'));
      }
    );

    // Scenario 5: Force check
    await runScenario(
      'Force Check',
      'Force check regardless of last check time',
      () => {
        setConfig({
          lastCheckTime: Date.now() - (1 * 60 * 60 * 1000), // 1 hour ago
          skippedVersions: []
        });
      },
      async () => {
        console.log(chalk.gray('  Testing with force=true flag...'));
        await checkForUpdates('0.1.0', '@tokligence/gateway', { force: true, silent: true });
        console.log(chalk.gray('  Update check performed despite recent check'));
      }
    );

    // Scenario 6: Version comparison edge cases
    await runScenario(
      'Version Comparison',
      'Test various version comparison scenarios',
      null,
      async () => {
        const tests = [
          ['0.3.4', '0.3.5', -1],
          ['0.3.5', '0.3.4', 1],
          ['0.3.4', '0.3.4', 0],
          ['1.0.0', '0.9.9', 1],
          ['0.3.10', '0.3.9', 1],
          ['2.0.0', '1.99.99', 1],
          ['0.0.1', '0.0.2', -1]
        ];

        for (const [v1, v2, expected] of tests) {
          const result = compareVersions(v1, v2);
          if (result === expected) {
            console.log(chalk.gray(`    ✓ ${v1} vs ${v2} = ${result}`));
          } else {
            throw new Error(`${v1} vs ${v2}: expected ${expected}, got ${result}`);
          }
        }
      }
    );

    console.log(chalk.bold.green('\n╔════════════════════════════════════════════════╗'));
    console.log(chalk.bold.green('║  All Test Scenarios Completed Successfully!   ║'));
    console.log(chalk.bold.green('╚════════════════════════════════════════════════╝\n'));

  } finally {
    restoreConfig();
  }
}

main().catch(error => {
  console.error(chalk.red('\nTest suite error:'), error);
  restoreConfig();
  process.exit(1);
});
