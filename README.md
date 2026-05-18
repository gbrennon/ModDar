# ModDar

A sharp detection tool for Reddit moderators that flags cross-subreddit AI
karma farming — spotting users who spam slightly tweaked text across
communities so mods can quickly investigate.

## Architecture

ModDar follows **hexagonal (ports & adapters) architecture**:

```
src/server/
├── domain/                          # Core domain entities
│   ├── link.ts                       #   Reddit Link (value-based equality)
│   └── account.ts                    #   Reddit Account (identity-based equality)
├── application/
│   ├── dtos/
│   │   ├── requests/                 #   Inbound command DTOs (primitives only)
│   │   └── responses/                #   Outbound result DTOs (primitives only)
│   ├── ports/
│   │   ├── inbound/                  #   Use-case interfaces
│   │   └── outbound/                 #   Data-access contracts
│   └── services/                     #   Use-case implementations
├── infrastructure/                   # Adapters (Reddit API via Devvit SDK)
├── presentation/                     # HTTP handlers
├── index.ts                          # Server entrypoint
└── server.ts                         # Request router
```

### Layers

| Layer | Responsibility | Test coverage |
|-------|---------------|---------------|
| Domain | Core entities (`Link`, `Account`) with business invariants | 100% |
| Application | Use-case service, DTOs, port contracts | 100% |
| Infrastructure | Reddit API adapters wrapping the Devvit SDK | Broad (80%+) |
| Presentation | HTTP request/response handling | Broad (80%+) |

## Getting Started

> Make sure you have Node 22 downloaded on your machine before running!

1. Clone the repo
2. Run `npm install`
3. Run `npm run dev` to start the Devvit playtest server

## Commands

- `npm test`: Run all tests (Vitest, 110 tests)
- `npm run test:watch`: Watch mode
- `npm run test:cov`: Run with coverage thresholds
- `npm run dev`: Starts a development server where you can develop your application live on Reddit
- `npm run build`: Builds client and server projects (esbuild)
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run type-check`: TypeScript compiler check

## Tech stack

- **Runtime**: Node.js ≥22.6
- **Language**: TypeScript 6.0 (strict mode, ESM)
- **Platform**: [Reddit Devvit](https://developers.reddit.com/)
- **Test runner**: Vitest + @vitest/coverage-v8
- **Build**: esbuild

## License

BSD-3-Clause
