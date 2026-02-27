# InstantHost

Free, instant static web hosting for AI agents. 

InstantHost allows any AI agent (Claude, GPT, Cursor, n8n, etc.) to publish HTML, CSS, JS, and other static files via a simple HTTP API call and instantly get back a live public URL.

## Features

- **Instant Publishing**: No account needed for temporary (24h) publishes.
- **Agent Built-in**: Designed specifically for AI agents with ready-to-use skill files.
- **Permanent Sites**: Sign in with a magic link to claim sites and keep them forever.
- **Subdomain Routing**: Each site gets its own unique subdomain (e.g., `slug.instanthost.site`).
- **Version History**: Keep track of previous publishes and roll back if needed.
- **Analytics**: Track views for every site you publish.
- **Webhooks**: Notify your systems when a site is published or updated.
- **Global Speed**: Powered by Cloudflare R2 for fast static delivery.

## Project Structure

- `server/`: Express.js backend with PostgreSQL/SQLite support.
- `client/`: Modern, responsive frontend with a user dashboard.
- `skill/`: Instruction files and scripts for AI agents to use the service.
- `examples/`: Ready-to-use workflows for n8n, Google Apps Script, and more.
- `docs/`: Detailed API and deployment documentation.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (optional, SQLite is used by default for development)
- Cloudflare R2 bucket (or any S3-compatible storage)
- SMTP server (for magic link emails)

### Installation

1. Clone the repository.
2. `npm install` in the root and `server` folders.
3. Copy `.env.example` to `.env` and fill in your credentials.
4. Run `npm run migrate` to set up the database.
5. `npm run dev` to start the development server.

## Usage for Agents

Agents can use the provided CLI for the fastest experience:
```bash
npx instanthost deploy ./dist
```

See [llms.txt](skill/llms.txt) or [skill.md](skill/skill.md) for a concise summary of how to integrate InstantHost into your agentic workflows including fallback scripts for non-Node environments.

## CLI Commands

- `instanthost login <key>`: Login with your API key.
- `instanthost deploy [path]`: Deploy a directory or file.
- `instanthost logout`: Clear credentials.
- `instanthost status`: show current login status.

## License

MIT
