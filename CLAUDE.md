# Claude Code Rules

## Project Overview
Game Theory Lab is an interactive educational web app that analyzes real-world scenarios through game theory. Users describe scenarios in natural language, and the app uses Claude AI to produce structured analyses (Nash equilibrium, payoff matrices, dominant strategies, etc.), then lets users run simulations and compare scenarios side-by-side.

## Tech Stack
- **Framework**: Next.js 16 (App Router) with React 19 and TypeScript (strict mode)
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk`
- **Database/Auth**: Supabase (PostgreSQL with RLS, email/password + Google OAuth)
- **State**: Zustand
- **Styling**: Tailwind CSS 4
- **Animation**: Framer Motion
- **Deployment**: Vercel-ready

## Project Structure
```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── page.tsx           # Home (analyze mode)
│   ├── simulation/        # Simulation mode
│   ├── compare/           # Comparison mode
│   ├── history/           # Saved analysis history
│   ├── login/             # Auth page
│   └── api/
│       ├── analyze/       # Claude analysis endpoint
│       ├── simulate/      # Server-side simulation fallback
│       └── scenarios/     # CRUD for saved scenarios
├── components/            # React components (~20 components)
│   ├── SimulationView.tsx # Largest: full simulation UI (~2,475 lines)
│   ├── ComparisonView.tsx # Side-by-side scenario comparison (~1,400 lines)
│   ├── AnalysisView.tsx   # Main analysis display
│   ├── GameBoard.tsx      # Interactive player positioning
│   ├── PayoffMatrix.tsx   # Visual payoff matrix
│   └── ...                # OutcomePanel, StrategyPanel, HeadToHeadMatrix, etc.
├── lib/
│   ├── types.ts           # All TypeScript interfaces
│   ├── store.ts           # Zustand store (88 actions)
│   ├── simulation.ts      # Client-side simulation engine (~1,035 lines)
│   ├── comparison.ts      # Comparison analysis logic
│   ├── populationSim.ts   # Population dynamics simulation
│   └── supabase*/         # Auth + DB helpers
└── middleware.ts           # Next.js auth middleware
```

## Key Features
1. **Analyze Mode**: Natural language scenario → Claude-powered game theory analysis (game type, players, connections, payoff matrix, Nash equilibrium, outcomes, strategies)
2. **Simulation Mode**: Iterated game simulations with 7 algorithms (Random, Greedy, Tit-for-Tat, Adaptive, Best-Response, Fictitious-Play, Replicator-Dynamics) plus custom strategy blending, convergence detection, round commentary, population dynamics, head-to-head matrix, sensitivity analysis, and 8 built-in scenario templates
3. **Comparison Mode**: Compare 2-4 scenarios side-by-side across dimensions like risk, cooperation, payoff distribution, strategy overlap
4. **User Accounts**: Supabase auth, save/load scenarios, analysis history

## Commands
```bash
npm run dev        # Dev server on localhost:3000
npm run build      # Production build
npm start          # Production server
npm run lint       # ESLint
```

## Git Workflow
- Commit and push after every few meaningful changes (e.g., after completing a feature, fixing a bug, or finishing a logical unit of work).
- Do NOT add "Co-Authored-By" lines to commit messages.
- Use concise, descriptive commit messages.
- Push to the current branch after committing.

## Architecture Notes
- Client-side simulation for instant feedback; server-side fallback for custom strategies
- Single Zustand store as source of truth for all app state
- Claude analysis endpoint returns structured JSON (GameAnalysis type) with player data, connections, payoff matrix, outcomes
- Supabase RLS ensures users only access their own data
- Path alias: `@/*` → `./src/*`
