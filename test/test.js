/**
 * Basic tests for @tokligence/gateway
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Test that the package can be loaded
try {
  const { Gateway } = require('../lib/index.js');
  assert(Gateway, 'Gateway class should be exported');
  console.log('✓ Package loads successfully');
} catch (error) {
  console.error('✗ Failed to load package:', error.message);
  process.exit(1);
}

// Test that binary manager can be loaded
try {
  const BinaryManager = require('../lib/binary.js');
  assert(BinaryManager, 'BinaryManager class should be exported');
  console.log('✓ BinaryManager loads successfully');
} catch (error) {
  console.error('✗ Failed to load BinaryManager:', error.message);
  process.exit(1);
}

// Test that CLI files exist
const cliFiles = [
  '../bin/tokligence.js',
  '../bin/gateway.js',
  '../bin/gatewayd.js'
];

cliFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✓ CLI file exists: ${path.basename(file)}`);
  } else {
    console.error(`✗ CLI file missing: ${path.basename(file)}`);
    process.exit(1);
  }
});

// Test package.json configuration
try {
  const pkg = require('../package.json');
  assert(pkg.name === '@tokligence/gateway', 'Package name should be @tokligence/gateway');
  assert(pkg.bin, 'Package should have bin field');
  assert(pkg.bin.tokligence, 'Package should have tokligence command');
  assert(pkg.tokligenceGateway, 'Package should have tokligenceGateway config');
  console.log('✓ package.json is correctly configured');
} catch (error) {
  console.error('✗ package.json validation failed:', error.message);
  process.exit(1);
}

console.log('\n✅ All tests passed!');