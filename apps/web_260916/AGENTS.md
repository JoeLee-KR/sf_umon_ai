<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:environment-toolchain -->
# Environment & Binary Execution Context for AI Agent (Junie Pro)

The host development machine uses **fnm (Fast Node Manager)** on macOS.
Background subshells spawned by IDE agents do not inherit dynamic multi-shell shims.
When executing shell tasks (installing dependencies, running builds, running dev servers, or triggering Prisma CLI commands), adhere strictly to the following execution context:

## 1. Concrete Toolchain Metadata
- **OS**: macOS (Darwin, arm64/x86_64)
- **Node Manager**: fnm (v1.39.0) located at `/usr/local/bin/fnm`
- **Active Runtimes**: Node.js v22.23.2, NPM 10.9.8
- **Fixed Node Binary**: `/Users/doogie/.local/share/fnm/node-versions/v22.23.2/installation/bin/node`
- **Fixed NPM Binary**: `/Users/doogie/.local/share/fnm/node-versions/v22.23.2/installation/bin/npm`
- **Fixed NPX Binary**: `/Users/doogie/.local/share/fnm/node-versions/v22.23.2/installation/bin/npx`

## 2. Command Execution Guidelines
1. **Shell Command Prefixing:**
   Always prepend the concrete installation bin directory to `PATH` before calling `npm`, `npx`, or `node`:
   ```bash
   export PATH="/Users/doogie/.local/share/fnm/node-versions/v22.23.2/installation/bin:$PATH" && npm <command>

<!-- END:environment-toolchain -->