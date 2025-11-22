#!/usr/bin/env node

/**
 * Test knowledge base loading
 */

const { loadKnowledge, searchDocs, getDoc } = require('../lib/chat/knowledge');
const chalk = require('chalk');

console.log(chalk.bold('\n=== Testing Knowledge Base ===\n'));

// Load knowledge
const knowledge = loadKnowledge();

console.log(chalk.cyan('1. Available Documents:'));
console.log(Object.keys(knowledge.docs).map(d => `  - ${d}`).join('\n'));
console.log(chalk.gray(`  Total: ${Object.keys(knowledge.docs).length} documents\n`));

// Test firewall docs are present
console.log(chalk.cyan('2. Firewall Documentation Check:'));
const firewallDocs = [
  'PROMPT_FIREWALL',
  'FIREWALL_REDACT_MODE',
  'PII_ENTITIES_REFERENCE'
];

for (const doc of firewallDocs) {
  const exists = knowledge.docs[doc] ? chalk.green('✓') : chalk.red('✗');
  const size = knowledge.docs[doc] ? `(${knowledge.docs[doc].length} chars)` : '';
  console.log(`  ${exists} ${doc} ${chalk.gray(size)}`);
}
console.log('');

// Test search functionality
console.log(chalk.cyan('3. Search Test: "firewall"'));
const results = searchDocs(knowledge, 'firewall');
console.log(chalk.gray(`  Found ${results.length} matches\n`));

if (results.length > 0) {
  console.log(chalk.cyan('  Sample results (first 5):'));
  results.slice(0, 5).forEach((r, i) => {
    console.log(chalk.gray(`  ${i + 1}. ${r.doc} - ${r.section}`));
    console.log(chalk.gray(`     Line ${r.line}: ${r.content.substring(0, 60)}...`));
  });
  console.log('');
}

// Test search for "PII"
console.log(chalk.cyan('4. Search Test: "PII"'));
const piiResults = searchDocs(knowledge, 'PII');
console.log(chalk.gray(`  Found ${piiResults.length} matches\n`));

// Test search for "redact"
console.log(chalk.cyan('5. Search Test: "redact mode"'));
const redactResults = searchDocs(knowledge, 'redact mode');
console.log(chalk.gray(`  Found ${redactResults.length} matches\n`));

// Test getDoc
console.log(chalk.cyan('6. Get Document Test: PROMPT_FIREWALL'));
const doc = getDoc(knowledge, 'PROMPT_FIREWALL');
if (doc) {
  const lines = doc.split('\n');
  console.log(chalk.green('  ✓ Document loaded successfully'));
  console.log(chalk.gray(`    Lines: ${lines.length}`));
  console.log(chalk.gray(`    First line: ${lines[0]}`));
  console.log('');
} else {
  console.log(chalk.red('  ✗ Failed to load document\n'));
}

// Verify metadata
console.log(chalk.cyan('7. Metadata:'));
console.log(chalk.gray(`  Version: ${knowledge.meta.version}`));
console.log(chalk.gray(`  Synced: ${knowledge.meta.syncedAt}`));
console.log(chalk.gray(`  Files tracked: ${Object.keys(knowledge.meta.files).length}`));
console.log('');

console.log(chalk.bold.green('=== All Tests Complete ===\n'));
