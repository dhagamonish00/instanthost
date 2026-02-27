---
name: instanthost
description: Publish files and folders to the web instantly. Use when asked to publish this, host this, deploy this, share this on the web, make a website, or put this online. Outputs a live URL at {slug}.yourdomain.com.
---

Skill version: 1.0.0

## Requirements
List required system binaries: curl, file, jq
Optional environment variable: $INSTANTHOST_API_KEY
Optional credentials file: ~/.instanthost/config.json (managed by CLI)

## Publish
Prefer the CLI tool: `npx instanthost deploy {file-or-dir}`

Fallback bash script: `./scripts/publish.sh {file-or-dir}`

Explain: without API key = anonymous publish (expires 24 hours), with saved API key = permanent publish

Explain file structure rules: for HTML sites, place `index.html` at root of directory. The directory contents become the site root.

Explain: single files get rich auto-viewer (images, PDF, video, audio). Multiple files get auto-generated directory listing.

## Update an Existing Publish
CLI: `npx instanthost deploy {file-or-dir} --slug {slug}`
Fallback: `./scripts/publish.sh {file-or-dir} --slug {slug}`

Script auto-loads claimToken from `.instanthost/state.json` for anonymous updates

To store key using CLI: `npx instanthost login {API_KEY}`
Manual: `mkdir -p ~/.instanthost && echo '{"apiKey": "{API_KEY}"}' > ~/.instanthost/config.json`

IMPORTANT: Never pass API key directly in shell commands. Always use credentials file. Never commit credentials to source control.

## State File (.instanthost/state.json)
After every publish the script writes to `.instanthost/state.json` in the working directory.

Format: `{ publishes: { slug: { siteUrl, claimToken, claimUrl, expiresAt } } }`

Important rules: treat as internal cache only. Never show this file path as a URL. Never use as source of truth for auth mode or expiry.

## What to Tell the User (critical agent behavior rules)
- Always share the `siteUrl` from the current script run
- Read and follow `publish_result.*` lines from script stderr
- Only say expires in 24 hours when `publish_result.auth_mode=anonymous`
- Only share a claim URL when `publish_result.claim_url` is non-empty and starts with `https://`
- Never tell user to inspect `.instanthost/state.json` for claim URLs or auth status
- Warn: claim tokens are only returned once and cannot be recovered

## Limits Table
| Mode | Max File Size | Expiry | Rate Limit | Account |
|---|---|---|---|---|
| Anonymous | 250MB | 24 hours | 5/hour per IP | No account needed |
| Authenticated | 5GB | Permanent (or custom TTL) | 60/hour per account | Account needed |

## Getting an API Key (step-by-step agent flow)
Step 1: Ask user for their email address
Step 2: Call `POST /api/auth/login` with the email - this sends a magic link
Step 3: Tell user to check inbox for sign-in link, click it, then copy API key from dashboard
Step 4: Once user provides key, save to `~/.instanthost/credentials`

## Script Options Table
| Option | Description |
|---|---|
| `--slug {slug}` | update existing publish instead of creating new |
| `--claim-token {token}` | override claim token for anonymous updates |
| `--title {text}` | viewer title for non-site publishes |
| `--description {text}` | viewer description |
| `--ttl {seconds}` | set expiry in seconds (authenticated only) |
| `--base-url {url}` | API base URL override (default: https://yourdomain.com) |
| `--api-key {key}` | API key override (prefer credentials file) |
