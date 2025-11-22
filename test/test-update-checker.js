#!/usr/bin/env node

/**
 * Test script for update checker functionality
 */

const { checkForUpdates, getLatestVersion, compareVersions } = require('../lib/update-checker');
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
    const result = compareVersions(test.v1, test.v2);
    if (result === test.expected) {
      console.log(chalk.green('  ✓'), test.desc);
      passed++;
    } else {
      console.log(chalk.red('  ✗'), test.desc, `(got ${result}, expected ${test.expected})`);
    }
  }
  console.log(chalk.gray(`  ${passed}/${tests.length} tests passed\n`));

  // Test 2: Get latest version from npm
  console.log(chalk.cyan('Test 2: Fetch latest version from npm registry'));
  try {
    const latestVersion = await getLatestVersion('@tokligence/gateway');
    console.log(chalk.green('  ✓'), `Latest version: ${latestVersion}\n`);
  } catch (error) {
    console.log(chalk.red('  ✗'), `Failed to fetch: ${error.message}\n`);
  }

  // Test 3: Full update check (simulated with older version)
  console.log(chalk.cyan('Test 3: Simulated update check (using version 0.1.0)'));
  console.log(chalk.gray('  This will prompt you for update decision...\n'));

  try {
    await checkForUpdates('0.1.0', '@tokligence/gateway', { force: true });
    console.log(chalk.green('\n  ✓ Update check completed\n'));
  } catch (error) {
    console.log(chalk.red('\n  ✗ Update check failed:', error.message, '\n'));
  }

  console.log(chalk.bold('=== Tests Complete ===\n'));
}

// Run tests
testUpdateChecker().catch(error => {
  console.error(chalk.red('Test error:'), error);
  process.exit(1);
});
