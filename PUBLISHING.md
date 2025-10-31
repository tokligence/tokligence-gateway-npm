# Publishing to NPM

This guide explains how to publish the @tokligence/gateway package to NPM.

## Prerequisites

1. **NPM Account**: You need an NPM account. Create one at https://www.npmjs.com/signup
2. **Organization Access**: You need to be a member of the `@tokligence` organization on NPM
3. **Authentication**: Login to NPM locally

## Initial Setup

### 1. Login to NPM

```bash
npm login
```

Enter your NPM username, password, and email when prompted.

### 2. Verify Login

```bash
npm whoami
```

### 3. Create/Join Organization

If the `@tokligence` organization doesn't exist yet:

```bash
# Create organization (first time only)
npm org create tokligence

# Or if it exists, ask to be added as a member
```

## Publishing Process

### Method 1: Manual Publishing

1. **Update Version**

   Update both the package version and the gateway version in `package.json`:

   ```json
   {
     "version": "0.2.1",
     "tokligenceGateway": {
       "version": "0.2.1"
     }
   }
   ```

2. **Test Locally**

   ```bash
   # Install dependencies
   npm install

   # Run tests
   npm test

   # Test installation locally
   npm link
   tokligence --version
   ```

3. **Publish to NPM**

   ```bash
   # Dry run (see what would be published)
   npm publish --dry-run

   # Actual publish
   npm publish --access public
   ```

   Note: Use `--access public` for scoped packages to make them public.

4. **Create Git Tag**

   ```bash
   git add .
   git commit -m "Release v0.2.1"
   git tag v0.2.1
   git push origin main --tags
   ```

### Method 2: GitHub Actions (Recommended)

The repository includes a GitHub Actions workflow that automates publishing.

1. **Setup NPM Token**

   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token" → "Classic Token"
   - Select "Automation" type
   - Copy the token

2. **Add Token to GitHub Secrets**

   - Go to your GitHub repository settings
   - Navigate to Settings → Secrets and variables → Actions
   - Add a new secret named `NPM_TOKEN` with your token

3. **Trigger Publishing**

   Option A: Create a GitHub Release
   ```bash
   gh release create v0.2.1 --title "v0.2.1" --notes "Release notes here"
   ```

   Option B: Manual Workflow Trigger
   - Go to Actions tab in GitHub
   - Select "Publish to NPM" workflow
   - Click "Run workflow"
   - Enter the version number

## Version Synchronization

Keep versions synchronized between:

1. **NPM Package Version** (`package.json` → `version`)
2. **Gateway Binary Version** (`package.json` → `tokligenceGateway.version`)
3. **Main Repository Release** (https://github.com/tokligence/tokligence-gateway/releases)

## Testing Before Publishing

### Local Testing

```bash
# Pack the package locally
npm pack

# Install the packed version globally
npm install -g tokligence-gateway-0.2.0.tgz

# Test the CLI
tokligence --version
tokligence init
tokligence start
```

### Test in Another Project

```bash
# Create a test project
mkdir test-project && cd test-project
npm init -y

# Install from local package
npm install ../tokligence-gateway-npm

# Or install specific version from NPM
npm install @tokligence/gateway@0.2.0

# Test programmatic usage
node -e "const { Gateway } = require('@tokligence/gateway'); console.log('Success!');"
```

## Publishing Checklist

Before publishing a new version:

- [ ] Update `version` in package.json
- [ ] Update `tokligenceGateway.version` to match main repo version
- [ ] Update README.md if needed
- [ ] Run tests locally: `npm test`
- [ ] Test CLI commands work
- [ ] Test binary download works
- [ ] Commit all changes
- [ ] Create git tag
- [ ] Publish to NPM
- [ ] Create GitHub release
- [ ] Verify on npmjs.com

## Troubleshooting

### Permission Denied

If you get a permission error:

```bash
npm ERR! 403 Forbidden - You do not have permission to publish "@tokligence/gateway"
```

Solutions:
1. Make sure you're logged in: `npm login`
2. Verify you're a member of the organization
3. Check package name is correct in package.json

### Package Already Exists

If the version already exists:

```bash
npm ERR! 403 Forbidden - Cannot publish over existing version
```

You need to bump the version number in package.json.

### Binary Download Fails

After publishing, test that binary download works:

```bash
# Clear npm cache
npm cache clean --force

# Install globally
npm install -g @tokligence/gateway

# Should download binaries during postinstall
```

## NPM Package URLs

After publishing, your package will be available at:

- NPM Registry: https://www.npmjs.com/package/@tokligence/gateway
- Unpkg CDN: https://unpkg.com/@tokligence/gateway/
- JSDeliver CDN: https://cdn.jsdelivr.net/npm/@tokligence/gateway/

## Best Practices

1. **Semantic Versioning**: Follow semver (MAJOR.MINOR.PATCH)
2. **Changelog**: Keep a CHANGELOG.md file updated
3. **Testing**: Always test before publishing
4. **Documentation**: Update README for any API changes
5. **Git Tags**: Always create git tags for releases
6. **Pre-release**: Use pre-release versions for testing (0.3.0-beta.1)

## Pre-release Versions

For testing:

```bash
# Publish beta version
npm version 0.3.0-beta.1
npm publish --tag beta

# Install beta version
npm install @tokligence/gateway@beta
```

## Unpublishing

If you need to unpublish (within 72 hours):

```bash
npm unpublish @tokligence/gateway@0.2.1
```

Note: Unpublishing is discouraged. Use `npm deprecate` instead:

```bash
npm deprecate @tokligence/gateway@0.2.1 "Critical bug, please upgrade to 0.2.2"
```