# Quick Start: Contributing to Rekon

A quick reference guide for contributors. For detailed information, see [CONTRIBUTING.md](../CONTRIBUTING.md).

> ⚠️ **Important:** You must **fork the repository first** before cloning. See Step 1 below.

## 1️⃣ Setup (First Time Only)

### Step 1: Fork the Repository

```
                    dewaxindo/Rekon (original)
                           |
                        [FORK] ← Click "Fork" button at https://github.com/dewaxindo/Rekon
                           |
                    YOUR_USERNAME/Rekon (your fork)
```

Go to https://github.com/dewaxindo/Rekon and click the **"Fork"** button (top-right corner). This creates your own copy of the repository on GitHub.

### Step 2: Clone Your Fork

```
        YOUR_USERNAME/Rekon (on GitHub)
                |
             [CLONE]
                |
        Rekon/ (on your computer)
```

```bash
# Clone YOUR fork to your computer (replace YOUR_USERNAME)
git clone https://github.com/YOUR_USERNAME/Rekon.git
cd Rekon

# Add upstream remote to track the original repository
git remote add upstream https://github.com/dewaxindo/Rekon.git

# Install dependencies
pnpm install

# Setup git hooks (helps with DCO sign-off)
bash scripts/setup-hooks.sh

# Configure git user (one-time)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Set up environment
cp .env.example .env
# Edit .env as needed
```

## 2️⃣ Create Your Feature

```bash
# Update main branch
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch (use descriptive name)
git checkout -b feat/your-feature-name
# or: fix/bug-name, docs/guide-name, etc.

# Make your changes
# ... edit files ...

# Verify everything works
pnpm type-check  # Type checking
pnpm lint        # Linting
pnpm test        # Tests
pnpm build       # Build
```

## 3️⃣ Commit Your Changes

```bash
# Stage changes
git add .

# Commit with sign-off (recommended)
git commit -s -m "feat(scope): description"
# Example: git commit -s -m "feat(market): add category filter"

# Or let git help you sign
git commit --amend -s  # Add sign-off to recent commit
```

### Commit Format

```
<type>(<scope>): <subject>

<body explaining what and why>

<references to issues>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
**Scope**: `frontend`, `backend`, `market`, `order`, etc. (optional)
**Subject**: Imperative mood, lowercase, no period, max 50 chars

**Examples:**
```
feat(market): add category filtering
fix(backend): fix price cache timing
docs(contributing): add DCO guide
```

## 4️⃣ Push and Create PR

```bash
# Push to your fork
git push origin feat/your-feature-name

# Go to GitHub and create a PR
# - Title: follows commit convention
# - Description: what, why, how
# - Link related issues: Closes #123
```

## 5️⃣ PR Checklist

Before submitting, verify:

- [ ] Synced with upstream: `git fetch upstream && git rebase upstream/main`
- [ ] Type checking: `pnpm type-check` ✓
- [ ] Linting: `pnpm lint` ✓
- [ ] Tests: `pnpm test` ✓
- [ ] Build: `pnpm build` ✓
- [ ] Commits are signed (check with `git log -1`)
- [ ] Commit messages follow convention
- [ ] Self-reviewed code
- [ ] PR description is clear
- [ ] No unrelated changes

## 6️⃣ During Review

- Respond to feedback constructively
- Push additional commits (don't force push)
- Run tests again after changes
- Re-request review when ready

## 📋 Useful Commands

```bash
# View commits with sign-off status
git log --pretty=full

# Check a single commit
git show HEAD

# Fix recent commit (add sign-off, update message, etc.)
git commit --amend -s
git push --force-with-lease origin your-branch

# Sign all commits in branch (interactive)
git rebase -i upstream/main
# Change 'pick' to 'reword' for each commit, then add -s during reword

# Update branch from upstream
git fetch upstream
git rebase upstream/main
git push --force-with-lease origin your-branch
```

## 🔗 Important Links

- **Main Guide**: [CONTRIBUTING.md](../CONTRIBUTING.md)
- **DCO Info**: [DCO.md](../DCO.md)
- **Architecture**: [CLAUDE.md](../CLAUDE.md)
- **License**: [LICENSE](../LICENSE)

## ❓ Common Issues

### "Commits need to be signed"
```bash
# Sign recent commit
git commit --amend -s

# Sign all unsigned commits in PR
git rebase -i upstream/main
```

### "CI checks failing"
1. Pull latest: `git fetch upstream && git rebase upstream/main`
2. Run locally: `pnpm type-check && pnpm lint && pnpm test && pnpm build`
3. Fix issues and commit: `git commit -s -m "fix: ..."`
4. Push: `git push origin your-branch`

### "Out of sync with main"
```bash
git fetch upstream
git rebase upstream/main
git push --force-with-lease origin your-branch
```

## 💡 Tips

- Read [CLAUDE.md](../CLAUDE.md) for architecture guidelines
- Small, focused PRs are faster to review
- Write tests for new features
- Ask questions in the PR if unsure about something
- The team is friendly and helpful!

## 🎯 First Contribution?

1. Look for issues labeled `good first issue`
2. Comment on the issue to let us know you're working on it
3. Follow steps 1-6 above
4. Don't worry about perfection—we'll help you get there!

---

**Need help?** Open an issue or ask in the discussion tab. We're here to help! 🙌
