#!/bin/bash

# Setup Git hooks for Rekon development
# This script configures git to use the .githooks directory

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_DIR="$( dirname "$SCRIPT_DIR" )"

echo "Setting up Git hooks for Rekon development..."

# Configure git to use .githooks directory
cd "$REPO_DIR"
git config core.hooksPath .githooks

echo "✓ Git hooks configured successfully"
echo ""
echo "What was set up:"
echo "  - prepare-commit-msg hook: Reminds you to sign commits with git commit -s"
echo ""
echo "Next steps:"
echo "  1. Configure your git user (one-time):"
echo "     git config user.name \"Your Name\""
echo "     git config user.email \"your.email@example.com\""
echo ""
echo "  2. Start signing commits:"
echo "     git commit -s -m \"your commit message\""
echo ""
echo "  3. To view the DCO info:"
echo "     cat DCO.md"
echo ""
echo "For more info, see DCO.md and CONTRIBUTING.md"
