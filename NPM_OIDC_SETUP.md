# NPM OIDC Setup Guide

This repository uses GitHub OIDC (OpenID Connect) for secure, token-less publishing to NPM.

## ✅ What is OIDC?

OIDC allows GitHub Actions to authenticate with NPM directly without storing any tokens. It's more secure and requires no token management.

## 🔧 Setup Steps

### 1. Enable OIDC on NPM

1. Go to your NPM package settings:
   https://www.npmjs.com/package/@tokligence/gateway/access

2. Under "Publishing access", you should see GitHub Actions option

3. Add the GitHub repository:
   - Repository: `tokligence/tokligence-gateway-npm`
   - Environment: Leave empty (or specify if using environments)

### 2. Configure Package for Provenance

The package.json and workflows are already configured. Key settings:

- **Workflows have permissions**:
  ```yaml
  permissions:
    contents: read
    id-token: write
  ```

- **Publish commands use provenance**:
  ```bash
  npm publish --access public --provenance
  ```

## 🚀 How It Works

1. GitHub Actions requests an ID token from GitHub
2. GitHub verifies the workflow is from `tokligence/tokligence-gateway-npm`
3. NPM verifies the token with GitHub
4. NPM allows the publish without needing a stored token

## ✨ Benefits

- **No tokens to manage** - No need to create or rotate NPM tokens
- **More secure** - Tokens are temporary and scoped to the workflow run
- **Provenance** - Packages show they were published from GitHub Actions
- **Auditable** - Full trail of who published what and when

## 🔍 Verification

After publishing with OIDC, packages will show:

1. A "Provenance" badge on NPM
2. Link to the exact GitHub Action run that published it
3. Cryptographic proof of the source

## 📝 Required Configuration

### On NPM:
- Package must list the GitHub repository as trusted publisher
- Organization must have OIDC enabled (usually enabled by default)

### On GitHub:
- Workflows must request `id-token: write` permission
- Repository must be public (or use GitHub Enterprise)

## 🎯 Current Status

- ✅ Workflows configured for OIDC
- ✅ Provenance flags added to publish commands
- ⏳ Waiting for NPM trusted publisher configuration

## 🔗 Resources

- [NPM Docs: Publishing packages with provenance](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub Docs: OIDC for NPM](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [NPM Blog: Provenance](https://github.blog/2023-04-19-introducing-npm-package-provenance/)

## 🆘 Troubleshooting

### "Insufficient permissions" error
- Check that the GitHub repository is added as trusted publisher on NPM
- Verify workflow has `id-token: write` permission

### "Provenance not supported" error
- Ensure using npm version 9.5.0 or higher
- Add `--provenance` flag to publish command

### "OIDC token error"
- Repository must be correctly configured on NPM
- Workflow must be running from the main/master branch