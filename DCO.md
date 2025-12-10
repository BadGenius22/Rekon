# Developer Certificate of Origin

## Overview

Rekon uses a **Developer Certificate of Origin (DCO)** to clarify intellectual property rights and licensing. The DCO is a lightweight alternative to a Contributor License Agreement (CLA) that's commonly used in open source projects.

By contributing to Rekon, you certify that:

1. The contribution you are making is your own work and you have the right to submit it
2. You understand the project's license and agree to license your contribution under the same terms
3. You are not knowingly including any content that violates anyone else's intellectual property rights

## Developer Certificate of Origin v1.1

```
By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project's terms of service.
```

## How It Works

### Signing Commits

To sign off on your commits, add the `-s` flag when committing:

```bash
git commit -s -m "feat(market): add market filters"
```

This automatically adds a line to your commit message:

```
Signed-off-by: Your Name <your.email@example.com>
```

### Commit Message Example

```
feat(market): add market filters

This commit adds category and status filters to the market list
service, improving the ability to find specific trading opportunities.

Signed-off-by: Jane Developer <jane@example.com>
```

### Verifying Your Sign-off

Check that your commits are properly signed:

```bash
# View recent commits with sign-off
git log -1

# The output should show:
# Signed-off-by: Your Name <your.email@example.com>
```

## Setting Up Automatic Signing

To automatically sign all commits, configure Git:

```bash
# Configure your signing details (one-time setup)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Enable automatic sign-off for all commits (optional)
git config alias.commit 'commit -s'
```

Or set it globally:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Enforcement

- All commits in pull requests must include a valid sign-off
- The sign-off must use a real name (no anonymity)
- The sign-off must match a verified Git identity

## Using a DCO Checker

The project may use automated DCO checking in CI/CD. If your PR fails the DCO check:

1. **Fix recent commits** - Amend and sign:
   ```bash
   git commit --amend -s
   git push --force-with-lease origin your-branch
   ```

2. **Sign all commits in a branch**:
   ```bash
   # For one commit
   git commit --amend -s

   # For multiple commits, rebase interactively
   git rebase -i HEAD~N  # Replace N with number of commits
   # Then in the editor, change 'pick' to 'reword' for commits to sign
   ```

## Why DCO Instead of CLA?

The DCO was chosen because:

1. **Lightweight** - No legal review or signing process needed
2. **Clear intent** - Contributors explicitly acknowledge their work
3. **Community friendly** - Low barrier to entry for open source contributions
4. **Transparent** - Everyone sees the same terms
5. **Reversible** - Contributors retain copyright to their work

## Understanding Your Rights

### You Keep Copyright

The DCO doesn't transfer copyright to the project. You retain full copyright to your contributions. The project is licensed under the [LICENSE](./LICENSE) file, and your contributions are licensed under those same terms.

### Licensing

Your contributions will be used under the project's license (see [LICENSE](./LICENSE)). By signing the DCO, you agree to this licensing.

### Patent Grant

By contributing, you also grant the project a non-exclusive, worldwide, royalty-free license to use, modify, and distribute your contribution.

## Questions?

- See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines
- Check the project's [LICENSE](./LICENSE) file
- Open an issue labeled `question` if you have concerns

## References

- [Developer Certificate of Origin Official Site](https://developercertificate.org/)
- [Linux Kernel DCO](https://www.kernel.org/doc/html/latest/process/applying-patches.html#sign-your-work)
- [Git DCO Documentation](https://git-scm.com/docs/git-commit#Documentation/git-commit.txt--S)

---

By contributing to Rekon, you acknowledge and agree to the Developer Certificate of Origin.
