# backend-challenge

Distributed Wagering Processor

## Setup

\`\`\`bash
bun install
docker compose up -d
bun run start:dev
\`\`\`

## Tests

\`\`\`bash
bun test                 # unit
bun run test:integration # requires docker compose up
bun run test:concurrency # requires docker compose up
\`\`\`

## Structure

- `src/domain` — entities, value objects, business rules (no framework dependencies)
- `src/application` — use cases and ports
- `src/infrastructure` — persistence and messaging implementations
- `src/interfaces` — HTTP controllers and SQS consumers
