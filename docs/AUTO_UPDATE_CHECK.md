# Auto Update Check Feature

## Overview

The Tokligence Gateway CLI automatically checks for updates when you run commands. This ensures you're always aware of new versions without being intrusive.

## How It Works

### Automatic Check Timing

- Checks are performed **once every 24 hours**
- Only triggered when running actual commands (not `--help` or `--version`)
- Runs asynchronously in the background, doesn't block your command
- Network failures are silently ignored

### When an Update is Available

When a new version is detected, you'll see a prompt like this:

```
┌─────────────────────────────────────────────────┐
│  Update Available                               │
├─────────────────────────────────────────────────┤
│  Current version: 0.3.4                         │
│  Latest version:  0.3.5                         │
└─────────────────────────────────────────────────┘

Run npm install -g @tokligence/gateway@latest to update

Update now? [y/N/skip]:
```

### User Options

You have three choices:

1. **`y` or `yes`** - Update immediately
   - Automatically runs `npm install -g @tokligence/gateway@latest`
   - Shows progress and confirms success
   - You'll need to re-run your original command after update

2. **`N` or just press Enter** - Update later (default)
   - Continues with your command
   - Will remind you next time (after 24 hours)
   - Shows manual update instructions

3. **`skip` or `s`** - Skip this version
   - Won't prompt about this specific version again
   - Will still notify about future versions
   - Useful if you want to stay on current version temporarily

## Configuration

### Storage Location

Update preferences are stored in:
```
~/.tokligence/update-config.json
```

### Configuration Format

```json
{
  "lastCheckTime": 1234567890123,
  "skippedVersions": ["0.3.5", "0.3.6"]
}
```

- `lastCheckTime`: Timestamp of last update check (milliseconds)
- `skippedVersions`: Array of version strings you chose to skip

### Manual Configuration

You can manually edit this file if needed:

```bash
# View current config
cat ~/.tokligence/update-config.json

# Reset update checks (force immediate check)
rm ~/.tokligence/update-config.json

# Skip a specific version manually
echo '{"lastCheckTime": 0, "skippedVersions": ["0.3.5"]}' > ~/.tokligence/update-config.json
```

## Examples

### Example 1: Update Immediately

```bash
$ tgw status

┌─────────────────────────────────────────────────┐
│  Update Available                               │
├─────────────────────────────────────────────────┤
│  Current version: 0.3.4                         │
│  Latest version:  0.3.5                         │
└─────────────────────────────────────────────────┘

Run npm install -g @tokligence/gateway@latest to update

Update now? [y/N/skip]: y

Updating @tokligence/gateway...
[npm output...]

✓ Update completed successfully!
Please run your command again.
```

### Example 2: Update Later

```bash
$ tgw status

[Update prompt shown]

Update now? [y/N/skip]: N

Update reminder: You can update later with:

  npm install -g @tokligence/gateway@latest

✓ Gateway is running
  PID: 12345
  Port: 8081
```

### Example 3: Skip Version

```bash
$ tgw status

[Update prompt shown]

Update now? [y/N/skip]: skip

Skipping version 0.3.5. You won't be notified about this version again.

✓ Gateway is running
  PID: 12345
  Port: 8081
```

## Testing

### Run Basic Tests

```bash
# Test version comparison and basic functionality
node test/test-update-checker.js

# Run comprehensive test suite
node test/test-update-scenarios.js
```

### Test Scenarios

The test suite covers:
- ✓ Version comparison (semantic versioning)
- ✓ npm registry fetching
- ✓ Update prompt and user choices
- ✓ Skip version functionality
- ✓ 24-hour check interval
- ✓ Force check option
- ✓ Configuration persistence

## Disabling Update Checks

If you want to disable update checks entirely, you can:

### Option 1: Set very old last check time

```bash
# This will prevent checks for ~290 million years
echo '{"lastCheckTime": 9999999999999, "skippedVersions": []}' > ~/.tokligence/update-config.json
```

### Option 2: Modify package installation

Remove the update check from your local installation by editing `bin/tokligence.js` and commenting out the check.

## Implementation Details

### Version Comparison

Uses semantic versioning comparison:
- `0.3.4` < `0.3.5` (patch version)
- `0.3.9` < `0.3.10` (numeric comparison, not string)
- `0.9.9` < `1.0.0` (major version)

### Network Requests

- Uses Node.js built-in `https` module
- Queries npm registry: `https://registry.npmjs.org/@tokligence/gateway/latest`
- 30-second timeout
- All errors are silently caught to not interrupt user commands

### Performance

- Check happens in background using `setImmediate()`
- Doesn't block command execution
- Minimal memory footprint (~1KB config file)

## Troubleshooting

### Update check not appearing

1. Check when last checked:
   ```bash
   cat ~/.tokligence/update-config.json
   ```

2. Force a check (for testing):
   ```bash
   rm ~/.tokligence/update-config.json
   tgw status
   ```

### Network issues

If behind a proxy or firewall:
- Update checks may fail silently
- Your commands will still work normally
- Update manually when convenient

### Skipped wrong version

Clear the skip list:
```bash
echo '{"lastCheckTime": 0, "skippedVersions": []}' > ~/.tokligence/update-config.json
```

## Security

- Only checks npm official registry
- No telemetry or data collection
- Only stores version numbers and timestamps locally
- Network requests are read-only
