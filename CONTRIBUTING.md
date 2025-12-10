# Contributing to Rekon

Thank you for your interest in contributing to Rekon! We're building the Binance-level trading terminal for prediction markets, and we need thoughtful contributors like you.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Architecture Guidelines](#architecture-guidelines)
- [Getting Help](#getting-help)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- Be respectful and constructive in all interactions
- Welcome people of all backgrounds and experience levels
- Focus on what is best for the community
- Be patient and assume good intent
- Report any violations to the maintainers

## Getting Started

### Prerequisites

- **Node.js**: >=20.0.0
- **pnpm**: >=10.0.0 (npm or yarn won't work with our monorepo setup)
- **Git**: For version control and submitting PRs

### Fork and Clone

**Step 1: Fork the Repository**

Go to https://github.com/dewaxindo/Rekon and click the **"Fork"** button in the top-right corner of the page. This creates a copy of the repository under your own GitHub account.

**Step 2: Clone Your Fork**

```bash
# Clone YOUR forked repository (replace YOUR_USERNAME)
git clone https://github.com/YOUR_USERNAME/Rekon.git
cd Rekon

# Add upstream remote to stay in sync with the original repository
git remote add upstream https://github.com/dewaxindo/Rekon.git

# Verify remotes are set correctly
git remote -v
# Should show:
# origin   https://github.com/YOUR_USERNAME/Rekon.git (fetch)
# origin   https://github.com/YOUR_USERNAME/Rekon.git (push)
# upstream https://github.com/dewaxindo/Rekon.git (fetch)
# upstream https://github.com/dewaxindo/Rekon.git (push)
```

**Why fork?** You don't have write access to the main repository, so you fork it to create your own copy where you can push changes, then submit a pull request to merge your changes back.

**What's upstream?** The `upstream` remote points to the original repository, allowing you to keep your fork in sync with the latest changes from the main project.

## Development Setup

### Installation

```bash
# Install dependencies (pnpm only)
pnpm install

# Verify installation
node --version  # Should be >=20.0.0
pnpm --version  # Should be >=10.0.0
```

### Environment Variables

Copy and configure environment variables:

```bash
cp .env.example .env
# Edit .env with your local configuration
```

### Running the Project

```bash
# Start all development servers (frontend + backend)
pnpm dev

# This will start:
# - Frontend: http://localhost:3000 (Next.js)
# - Backend: http://localhost:8000 (Hono API)
```

### Verify Setup

```bash
# Type check
pnpm type-check

# Lint code
pnpm lint

# Run tests
pnpm test

# Build all packages
pnpm build
```

## How to Contribute

### Reporting Bugs

1. **Search existing issues** - Check if the bug has already been reported
2. **Create a detailed issue** including:
   - Clear title describing the problem
   - Step-by-step reproduction instructions
   - Expected vs actual behavior
   - Environment details (OS, Node version, pnpm version)
   - Screenshots or error logs if applicable

### Suggesting Features

1. **Check existing discussions** - Search for similar feature requests
2. **Create a feature request issue** with:
   - Clear title and description
   - Use case and motivation
   - Proposed implementation approach (if you have ideas)
   - Links to related issues or discussions

### Contributing Code

**For small changes** (typos, documentation, obvious fixes):
1. Create a branch and make your changes
2. Follow the [Commit Conventions](#commit-conventions)
3. Submit a PR with a clear description

**For significant changes** (new features, refactoring, architectural changes):
1. Open an issue first to discuss the approach
2. Wait for feedback from maintainers
3. Get approval before starting major work
4. Proceed with development once aligned

## Development Workflow

### Branch Naming

Use descriptive branch names following the pattern:
```
<type>/<description>
```

Examples:
- `feat/market-filters` - New feature
- `fix/price-cache-bug` - Bug fix
- `docs/contributing-guide` - Documentation
- `refactor/market-service` - Code refactoring
- `test/add-market-tests` - Test improvements

### Creating a Branch

```bash
# Update main branch
git fetch upstream
git checkout main
git merge upstream/main

# Create your feature branch
git checkout -b feat/your-feature-name
```

### Making Changes

1. **Make atomic commits** - One logical change per commit
2. **Keep commits focused** - Don't mix multiple features or unrelated changes
3. **Follow code standards** - See [Architecture Guidelines](#architecture-guidelines)
4. **Test your changes** - Run tests before committing
5. **Reference CLAUDE.md** - It contains detailed architectural guidance

## Commit Conventions

We follow conventional commit format for clear, semantic commit messages:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, semicolons, etc.)
- **refactor**: Code refactoring without behavior changes
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build, dependency, or tooling changes

### Scope

Optional scope indicating the area affected:
- `frontend`, `backend`, `types`, `utils`, `config`, `ui`
- `market`, `order`, `portfolio`, `esports`, `auth`

### Subject

- Use imperative mood ("add", not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Max 50 characters

### Body

- Explain *what* and *why*, not *how*
- Wrap at 72 characters
- Separate from subject with blank line

### Footer

- Reference related issues: `Closes #123`
- For breaking changes: `BREAKING CHANGE: description`

### Examples

```
feat(market): add market filter by category

- Add category filter to market list service
- Update frontend to display category selector
- Cache filtered results with 8s TTL

Closes #123
```

```
fix(backend): fix price cache invalidation timing

The cache was invalidating too frequently, causing excess
API calls to Polymarket. Increased TTL from 1s to 3s and
added debouncing for rapid requests.

Closes #456
```

## Testing

### Test Structure

Tests are co-located with implementations and use Vitest:

```
apps/api/src/services/market.service.ts
apps/api/src/services/market.service.test.ts
```

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode (re-run on file changes)
pnpm test --watch

# Run specific test file
pnpm test apps/api/src/services/market.service.test.ts

# Generate coverage report
pnpm test:coverage
```

### Writing Tests

1. **Mock external dependencies** - Use `vi.mock()` for external APIs
2. **Test behavior, not implementation** - Focus on inputs and outputs
3. **Keep tests focused** - One concept per test
4. **Use descriptive names** - Test names should explain what is being tested

Example test pattern:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@rekon/config", () => ({
  POLYMARKET_CONFIG: { /* ... */ },
}));

describe("MarketService", () => {
  it("should fetch markets with proper caching", async () => {
    const markets = await marketService.getMarkets({ category: "esports" });
    expect(markets).toHaveLength(5);
    expect(markets[0]).toHaveProperty("id");
  });
});
```

### Code Coverage

- Aim for >80% coverage on new code
- Don't decrease overall coverage
- Focus on critical paths and business logic

## Pull Request Process

### Before Submitting

1. **Update from main**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Verify all checks pass**:
   ```bash
   pnpm type-check
   pnpm lint
   pnpm test
   pnpm build
   ```

3. **Self-review** your changes for quality and clarity

### Creating the PR

1. **Push to your fork**:
   ```bash
   git push origin feat/your-feature-name
   ```

2. **Create PR on GitHub** with:
   - **Title**: Follows commit convention (e.g., `feat(market): add filters`)
   - **Description**: Clearly explains what, why, and how
   - **References**: Link to related issues (`Closes #123`)
   - **Testing**: Describe how to test the changes
   - **Breaking Changes**: Clearly mark any breaking changes

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Changes
- Specific change 1
- Specific change 2
- Specific change 3

## Testing
How to test these changes:
1. Step 1
2. Step 2

## Checklist
- [ ] Type checking passes (`pnpm type-check`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Commits follow convention
- [ ] Self-reviewed code

## Related Issues
Closes #123
```

### PR Review Process

1. **Automated Checks**: CI/CD must pass
   - Type checking
   - Linting
   - Tests
   - Build verification

2. **Code Review**: Maintainers will review for:
   - Adherence to architecture guidelines
   - Code quality and maintainability
   - Test coverage
   - Documentation completeness

3. **Responding to Feedback**:
   - Address all comments
   - Push additional commits (don't force push)
   - Re-request review when ready
   - Keep discussion focused on the changes

4. **Merge**: Once approved and checks pass, a maintainer will merge your PR

## Architecture Guidelines

Read [CLAUDE.md](./CLAUDE.md) for detailed architecture guidance including:

- **Monorepo structure** - Fixed folder layout and import conventions
- **Backend architecture** - Layered architecture (Routes → Controllers → Services → Adapters)
- **Frontend architecture** - Next.js 16 App Router best practices
- **Error handling** - Global error handler patterns
- **Polymarket integration** - Integration points and caching
- **Code standards** - TypeScript, naming conventions, comments
- **Domain logic** - Where to place business logic
- **Package structure** - Purpose of `@rekon/types`, `@rekon/utils`, etc.

### Key Architecture Rules

1. **Strict dependency flow**: Routes → Controllers → Services → Adapters
2. **No try-catch in controllers** - Use global error handler
3. **No direct Polymarket calls from frontend** - All through API
4. **Services contain business logic** - Not in adapters or controllers
5. **Deterministic domain logic** - No side effects in util functions
6. **Caching strategy** - 8s for lists, 3s for single items
7. **No default exports** - Named exports everywhere

## Getting Help

### Questions

- **Discord/Slack**: Join the community (link in README)
- **GitHub Discussions**: Ask questions in the discussions tab
- **Issues**: Open an issue labeled `question`

### Finding Issues to Work On

- **good first issue**: Perfect for newcomers
- **help wanted**: Tasks needing contribution
- **documentation**: Help improve docs
- **minor**: Small, low-impact changes

### Pair Programming / Discussions

Feel free to:
- Open draft PRs for feedback while developing
- Comment on issues with ideas
- Participate in discussions about architecture
- Suggest improvements to this guide

## Code Review Standards

### What We Look For

✅ **Good code reviews are**:
- Constructive and respectful
- Focused on code, not people
- Explaining the "why" behind suggestions
- Appreciating effort and good ideas

❌ **Avoid**:
- Nitpicking style (we have linters for that)
- Demanding personal coding preferences
- Bike-shedding on non-critical decisions

## License

By contributing to Rekon, you agree that your contributions will be licensed under the same license as the project. See [LICENSE](./LICENSE) for details.

Your contributions are also acknowledged in commit history and may be recognized in project documentation.

## Questions or Need Help?

- Check existing documentation in [CLAUDE.md](./CLAUDE.md)
- Search closed issues for similar problems
- Open an issue with the `question` label
- Reach out to maintainers in discussions

---

**Thank you for contributing to Rekon!** Together, we're building the future of prediction market trading. 🎯
