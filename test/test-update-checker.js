#!/usr/bin/env node

/**
 * Test script for update checker functionality
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

// Use temp config directory to avoid touching real ~/.tokligence during tests
const tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toklicfg-'));
process.env.TOKLIGENCE_CONFIG_DIR = tempConfigDir;

const updateChecker = require('../lib/update-checker');
const chalk = require('chalk');

async function testUpdateChecker() {
  console.log(chalk.bold('\n=== Testing Update Checker ===\n'));

  // Test 1: Version comparison
  console.log(chalk.cyan('Test 1: Version comparison'));
  const tests = [
    { v1: '0.3.4', v2: '0.3.5', expected: -1, desc: '0.3.4 < 0.3.5' },
    { v1: '0.3.5', v2: '0.3.4', expected: 1, desc: '0.3.5 > 0.3.4' },
    { v1: '0.3.4', v2: '0.3.4', expected: 0, desc: '0.3.4 = 0.3.4' },
    { v1: '1.0.0', v2: '0.3.4', expected: 1, desc: '1.0.0 > 0.3.4' },
    { v1: '0.3.10', v2: '0.3.9', expected: 1, desc: '0.3.10 > 0.3.9' }
  ];

  let passed = 0;
  for (const test of tests) {
    const result = updateChecker.compareVersions(test.v1, test.v2);
    if (result === test.expected) {
      console.log(chalk.green('  ✓'), test.desc);
      passed++;
    } else {
      console.log(chalk.red('  ✗'), test.desc, `(got ${result}, expected ${test.expected})`);
    }
  }
  console.log(chalk.gray(`  ${passed}/${tests.length} tests passed\n`));

  // Test 2: Stubbed update check (no network, no prompt)
  console.log(chalk.cyan('Test 2: Stubbed update check (silent)'));
  try {
    await updateChecker.checkForUpdates('0.1.0', '@tokligence/gateway', {
      force: true,
      silent: true,
      fetchLatestVersion: async () => '9.9.9'
    });
    console.log(chalk.green('  ✓ Update check completed without network\n'));
  } catch (error) {
    console.log(chalk.red('  ✗ Update check failed:', error.message, '\n'));
  }

  console.log(chalk.bold('=== Tests Complete ===\n'));
}

// Run tests
testUpdateChecker().catch(error => {
  console.error(chalk.red('Test error:'), error);
  process.exit(1);
});
