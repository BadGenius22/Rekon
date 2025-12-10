# Git Hooks for Rekon

This directory contains Git hooks that enhance the development workflow for Rekon.

## Available Hooks

### prepare-commit-msg
- **Purpose**: Reminds developers to sign commits with DCO sign-off
- **Behavior**: Adds helpful comments to commit message suggesting DCO sign-off
- **Impact**: Informational only, doesn't enforce or prevent commits

## Setup

### Automatic Setup (One-time)

If you ran `pnpm install`, hooks should be configured automatically (if we add a postinstall script).

To manually setup:

```bash
# From the root of the repository
bash scripts/setup-hooks.sh
```

Or manually:

```bash
git config core.hooksPath .githooks
```

### Verify Setup

Check that hooks are configured:

```bash
git config core.hooksPath
# Should output: .githooks
```

## Usage

After setup, git hooks will run automatically on relevant git operations:

```bash
# Regular commit (hooks run automatically)
git commit -m "your message"

# Commit with sign-off (recommended)
git commit -s -m "your message"
```

## Disabling Hooks

If you need to temporarily disable hooks:

```bash
# Unset the hooks path
git config --unset core.hooksPath

# Later, re-enable them
git config core.hooksPath .githooks
```

## Global vs Local

These hooks are configured per-repository (locally). They don't affect your global Git configuration.

## More Information

- See [DCO.md](../DCO.md) for Developer Certificate of Origin details
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for full contribution guidelines
