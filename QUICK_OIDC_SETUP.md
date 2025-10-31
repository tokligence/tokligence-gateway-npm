# 🚀 Quick OIDC Setup - What You Need to Do

## NPM OIDC Configuration

Go to: https://www.npmjs.com/package/@tokligence/gateway/access

Add **TWO** trusted publishers:

### 1️⃣ For Automatic Sync (每小时自动检查)
- **Repository**: `tokligence/tokligence-gateway-npm`
- **Workflow filename**: `sync-release.yml`
- **Environment**: (leave empty)

### 2️⃣ For Manual Publish (手动发布)
- **Repository**: `tokligence/tokligence-gateway-npm`
- **Workflow filename**: `publish.yml`
- **Environment**: (leave empty)

## That's it! ✅

After adding these, the workflows will automatically:
- Check for new Gateway releases every hour
- Publish to NPM without needing any tokens
- Add provenance badges to your packages

## Test It

After setup, you can test by:
1. Go to https://github.com/tokligence/tokligence-gateway-npm/actions
2. Click "Sync with Gateway Release"
3. Click "Run workflow"
4. Watch it work!

## Why Two Workflows?

- **sync-release.yml**: Automatic sync with main Gateway releases
- **publish.yml**: Manual publish when needed

Both need to be trusted for full automation.