# Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management and automated npm publishing.

## How It Works

### 1. Adding Changes

When you make changes that should be released:

```bash
pnpm changeset
```

This creates a changeset file describing your changes. Commit this file with your PR.

### 2. Release PR

When changesets are merged to `main`, the Release workflow automatically:

- Creates/updates a "release: version packages" PR
- Bumps package versions according to changesets
- Updates CHANGELOG.md files

### 3. Publishing

When you merge the Release PR, the workflow automatically:

- Builds all packages
- Publishes to npm with provenance
- Creates GitHub releases

## Setup Requirements

### NPM Token

The workflow requires an `NPM_TOKEN` secret for publishing to npm.

**Setting it up:**

1. Generate an npm automation token:
   - Go to https://www.npmjs.com/settings/{your-username}/tokens
   - Click "Generate New Token" → "Automation"
   - Copy the token

2. Add it to GitHub secrets:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: (paste your token)

**Important:** The token must have:

- Publish access to `@jaicome/*` packages
- 2FA on auth can be enabled, but 2FA on publish must be disabled

## Manual Release

To publish manually:

```bash
# Build packages
bun run build

# Publish to npm
pnpm changeset publish
```

## Troubleshooting

### "No changesets detected"

Add a changeset file:

```bash
pnpm changeset
```

### Publish fails with auth error

Check that `NPM_TOKEN` secret is set correctly in repository settings.

### Version mismatch

Ensure the Release PR was merged (not just closed) before expecting a publish.
