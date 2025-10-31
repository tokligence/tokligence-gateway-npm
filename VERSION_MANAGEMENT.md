# Version Management

## The Build Suffix Issue

GitHub releases for `tokligence-gateway` include a build suffix in the binary names that contains git commit information:

- Example: `gateway-v0.2.0-3-ge092ec5-linux-amd64`
- Pattern: `{binary}-v{version}-{commits}-g{hash}-{platform}-{arch}`

## Current Solution

The `buildSuffix` is stored in `package.json`:

```json
"tokligenceGateway": {
  "version": "0.2.0",
  "buildSuffix": "-3-ge092ec5",
  ...
}
```

## Updating for New Releases

When a new version of tokligence-gateway is released:

1. **Check the release assets**:
   ```bash
   gh release view vX.X.X --repo tokligence/tokligence-gateway | grep asset:
   ```

2. **Extract the build suffix**:
   - From: `gateway-v0.3.0-5-gabc1234-linux-amd64`
   - Extract: `-5-gabc1234`

3. **Update package.json**:
   ```json
   "tokligenceGateway": {
     "version": "0.3.0",
     "buildSuffix": "-5-gabc1234"
   }
   ```

4. **Update NPM package version**:
   ```json
   "version": "0.3.0"
   ```

## Alternative Solutions

### Option 1: Release Discovery (Future Enhancement)

Implement automatic discovery of binary names:

```javascript
// lib/binary.js enhancement
async discoverBinaryUrl(binaryType) {
  const releases = await axios.get(
    `https://api.github.com/repos/${this.config.repo}/releases/tags/v${this.config.version}`
  );

  const pattern = new RegExp(
    `${binaryType}-v${this.config.version}.*-${this.platform}-${this.arch}`
  );

  const asset = releases.data.assets.find(a =>
    pattern.test(a.name)
  );

  return asset ? asset.browser_download_url : null;
}
```

### Option 2: Simplified Releases

Request the main repository to create simplified binary names without the build suffix:
- `gateway-v0.2.0-linux-amd64` (instead of `gateway-v0.2.0-3-ge092ec5-linux-amd64`)

### Option 3: Multiple Package Versions

Publish NPM packages with full version strings:
- `@tokligence/gateway@0.2.0-3-ge092ec5`

## Automation Script

Create a script to update versions:

```bash
#!/bin/bash
# scripts/update-version.sh

VERSION=$1
SUFFIX=$2

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$VERSION';
pkg.tokligenceGateway.version = '$VERSION';
pkg.tokligenceGateway.buildSuffix = '$SUFFIX';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "Updated to version $VERSION with suffix $SUFFIX"
```

Usage:
```bash
./scripts/update-version.sh 0.3.0 -5-gabc1234
```

## Best Practice

1. **Always test after updating versions**:
   ```bash
   rm -rf node_modules .bin
   npm install
   npm test
   ```

2. **Document the build suffix in release notes**:
   ```markdown
   ## Version 0.3.0
   - Gateway version: v0.3.0
   - Build suffix: -5-gabc1234
   ```

3. **Consider using GitHub API** in the future to automatically detect the correct binary names.

## Verification

To verify the current configuration works:

```bash
# Test download URL
node -e "
const BinaryManager = require('./lib/binary');
const bm = new BinaryManager();
console.log(bm.getDownloadUrl('gateway'));
"

# Test actual download
npm install --force
```