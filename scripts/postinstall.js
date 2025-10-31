#!/usr/bin/env node

const BinaryManager = require('../lib/binary');

async function postInstall() {
  console.log('\n📦 Tokligence Gateway - Post Install\n');

  const manager = new BinaryManager();

  try {
    await manager.install();
  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    console.error('\nYou can try:');
    console.error('1. Installing manually from https://github.com/tokligence/tokligence-gateway/releases');
    console.error('2. Checking your internet connection');
    console.error('3. Reporting an issue at https://github.com/tokligence/tokligence-gateway-npm/issues');

    // Don't fail npm install completely
    process.exit(0);
  }
}

// Only run if this is the main module
if (require.main === module) {
  postInstall();
}