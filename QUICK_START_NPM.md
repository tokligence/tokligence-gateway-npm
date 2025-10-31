# Quick Start: Publishing to NPM

✅ **Package is ready to publish!** All tests pass and binaries download correctly.

Since you already have an NPM account, here's how to publish this package:

## Step 1: Login to NPM

```bash
cd /home/alejandroseaah/tokligence/tokligence-gateway-npm
npm login
```

Enter your NPM credentials when prompted.

## Step 2: Create or Join Organization (First Time Only)

If the @tokligence organization doesn't exist on NPM yet:

```bash
# Option A: Create the organization (you'll own it)
npm org create tokligence

# Option B: Publish under your personal scope instead
# Change package name in package.json from "@tokligence/gateway" to "@yourusername/tokligence-gateway"
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Run Tests

```bash
npm test
```

## Step 5: Publish

```bash
# First time publish (makes package public)
npm publish --access public

# Subsequent publishes
npm publish
```

## Alternative: Publish Under Your Personal Scope

If you want to test first or don't want to create an organization:

1. Edit `package.json`:
   ```json
   {
     "name": "@yourusername/tokligence-gateway",
     ...
   }
   ```

2. Publish:
   ```bash
   npm publish --access public
   ```

3. Install globally:
   ```bash
   npm install -g @yourusername/tokligence-gateway
   ```

## After Publishing

Your package will be available at:
- https://www.npmjs.com/package/@tokligence/gateway (or @yourusername/tokligence-gateway)

Users can install it with:
```bash
npm install -g @tokligence/gateway
```

## Version Updates

When the main gateway releases a new version:

1. Update both versions in package.json:
   ```json
   {
     "version": "0.3.0",
     "tokligenceGateway": {
       "version": "0.3.0"
     }
   }
   ```

2. Publish the new version:
   ```bash
   npm publish
   ```

## GitHub Repository (Optional)

To host the NPM wrapper code on GitHub:

```bash
# Initialize git
git init

# Add remote (create a repo on GitHub first)
git remote add origin https://github.com/tokligence/tokligence-gateway-npm.git
# or
git remote add origin https://github.com/yourusername/tokligence-gateway-npm.git

# Commit and push
git add .
git commit -m "Initial commit: NPM wrapper for Tokligence Gateway"
git push -u origin main
```

## Quick Test Before Publishing

```bash
# Create a package locally
npm pack

# Test install in another directory
cd /tmp
npm install /home/alejandroseaah/tokligence/tokligence-gateway-npm/tokligence-gateway-0.2.0.tgz
npx tokligence --version
```

## Troubleshooting

If binary download fails during testing:
- Check that the version in `tokligenceGateway.version` matches an existing GitHub release
- Verify the binary names match the pattern in GitHub releases

## Next Steps

1. Decide on the package scope (@tokligence or @yourusername)
2. Run `npm login`
3. Run `npm publish --access public`
4. Test installation: `npm install -g @tokligence/gateway`
5. Try the CLI: `tokligence --help`

That's it! Your package is now on NPM and ready for users to install.