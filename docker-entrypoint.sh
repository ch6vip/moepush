#!/bin/sh
set -eu

cd /app

# Runtime secrets are passed by the container operator and are never baked into
# the image or printed to the process log.
node <<'NODE'
const fs = require('node:fs')
const keys = ['AUTH_TRUST_HOST', 'AUTH_SECRET', 'AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET', 'DISABLE_REGISTER']
const lines = keys.map((key) => `${key}=${JSON.stringify(process.env[key] ?? (key === 'AUTH_TRUST_HOST' ? 'true' : ''))}`)
fs.writeFileSync('/app/.dev.vars', `${lines.join('\n')}\n`, { mode: 0o600 })
NODE

pnpm exec wrangler d1 migrations apply moepush --local --config wrangler.json
exec pnpm exec wrangler pages dev .vercel/output/static --local --ip 0.0.0.0 --port "${PORT:-3000}" --config wrangler.json
