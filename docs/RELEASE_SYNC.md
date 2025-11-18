# Release Synchronization with Tokligence Gateway

This NPM package automatically syncs with the main Tokligence Gateway releases.

## 🤖 Automated Sync Methods

### Method 1: GitHub Actions (Recommended)

The repository includes a GitHub Actions workflow that automatically checks for new releases.

#### Setup
1. Configure NPM trusted publisher:
   - Go to https://www.npmjs.com/package/@tokligence/gateway/access
   - Add `tokligence/tokligence-gateway-npm` as trusted GitHub repository
   - No tokens needed - uses GitHub OIDC!

2. The workflow runs:
   - **Automatically**: Every hour (via cron schedule)
   - **Manually**: Via Actions tab → "Sync with Gateway Release" → Run workflow

#### How it works
1. Checks latest release from `tokligence/tokligence-gateway`
2. Compares with current version in package.json
3. If new version found:
   - Updates package.json with new version and build suffix
   - Runs tests
   - Commits changes
   - Publishes to NPM
   - Creates GitHub release

### Method 2: Manual Sync Script

For manual control over the sync process:

```bash
# Sync and publish
node scripts/sync-release.js

# Dry run (test without publishing)
node scripts/sync-release.js --dry-run
```

### Method 3: Webhook from Main Repo

Add this workflow to the main `tokligence-gateway` repo to trigger NPM release:

```yaml
# .github/workflows/trigger-npm-release.yml
name: Trigger NPM Package Release

on:
  release:
    types: [published]

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger NPM package workflow
        run: |
          curl -X POST \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Authorization: token ${{ secrets.NPM_REPO_TOKEN }}" \
            https://api.github.com/repos/tokligence/tokligence-gateway-npm/actions/workflows/sync-release.yml/dispatches \
            -d '{"ref":"master"}'
```

## 🔄 Version Mapping

The NPM package version always matches the Gateway version:

| Gateway Release | NPM Version | Build Suffix |
|----------------|-------------|--------------|
| v0.2.0 | 0.2.0 | -3-ge092ec5 |
| v0.3.0 | 0.3.0 | (extracted from binary name) |

## 📦 Binary Name Pattern

Gateway releases include binaries with this pattern:
```
{binary}-v{version}{build-suffix}-{platform}-{arch}
```

Example:
```
gateway-v0.2.0-3-ge092ec5-linux-amd64
```

The sync process automatically extracts the build suffix from binary names.

## 🛠️ Manual Update Process

If automated sync fails, update manually:

1. **Check latest Gateway release:**
   ```bash
   gh release view --repo tokligence/tokligence-gateway
   ```

2. **Get binary name to find build suffix:**
   ```bash
   gh release view --repo tokligence/tokligence-gateway | grep linux-amd64
   ```

3. **Update package.json:**
   ```json
   {
     "version": "0.3.0",
     "tokligenceGateway": {
       "version": "0.3.0",
       "buildSuffix": "-5-gabc1234"
     }
   }
   ```

4. **Test locally:**
   ```bash
   rm -rf node_modules .bin
   npm install
   npm test
   ```

5. **Publish:**
   ```bash
   npm publish
   git add package.json
   git commit -m "chore: sync with gateway release v0.3.0"
   git push
   git tag v0.3.0
   git push --tags
   ```

## 🔔 Monitoring

### Check Sync Status

```bash
# Compare versions
node -e "
const pkg = require('./package.json');
console.log('NPM tracks Gateway v' + pkg.tokligenceGateway.version);
"

# Check latest Gateway release
gh api repos/tokligence/tokligence-gateway/releases/latest --jq .tag_name
```

### View Sync Logs

- GitHub Actions: Actions tab → "Sync with Gateway Release" → View runs
- Manual sync: Check console output

## 🚨 Troubleshooting

### Build Suffix Extraction Failed

If the build suffix cannot be extracted automatically:
1. Check the binary naming pattern in the Gateway release
2. Update `scripts/sync-release.js` regex pattern if needed
3. Manually set the build suffix in package.json

### NPM Publish Failed

Common issues:
1. **Authentication**: Ensure GitHub repo is added as trusted publisher on NPM
2. **Version conflict**: Version might already exist on NPM
3. **OIDC setup**: Check https://www.npmjs.com/package/@tokligence/gateway/access
4. **Network issues**: Retry the workflow

### GitHub Actions Not Running

Check:
1. Workflow file exists: `.github/workflows/sync-release.yml`
2. Actions are enabled in repository settings
3. NPM trusted publisher is configured (no tokens needed with OIDC!)

## 📊 Release History

Track sync history:

```bash
# View NPM releases
npm view @tokligence/gateway versions --json

# View GitHub releases
gh release list --repo tokligence/tokligence-gateway-npm

# View git tags
git tag -l
```

## 🔐 Security

- Uses GitHub OIDC - no tokens stored anywhere!
- Temporary tokens generated per workflow run
- Cryptographic provenance for all publishes
- GitHub's built-in GITHUB_TOKEN for repository operations

## 📝 Best Practices

1. **Test before publishing**: Always run tests before releasing
2. **Semantic versioning**: Follow the main Gateway's version exactly
3. **Release notes**: Include link to main Gateway release
4. **Monitor failures**: Set up alerts for failed sync workflows
5. **Keep build suffix updated**: Critical for binary downloads to work