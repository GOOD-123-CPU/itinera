# Itinera

[简体中文](./README.md) | [English](./README.en.md)

An AI weekend itinerary planner built with Next.js, Prisma, SQLite, and any OpenAI-compatible LLM.

Itinera turns natural-language plans into structured weekend itineraries. A user can ask for something like "a half-day family trip in Chaoyang under 500 RMB", and the app combines seeded venue data, restaurants, weather-like context, budget estimates, maps, and booking-style workflows into a usable plan.

This repository is designed as an open-source reference for AI consumer apps, local-data RAG-style planning flows, and full-stack Next.js product prototypes.

<p align="center">
  <img src="docs/screenshots/readme-home.png" alt="Itinera home screen" width="860" />
</p>

## Why Itinera

- **Natural-language planning**: Converts user intent into validated itinerary JSON.
- **Product-level workflow**: Chat, timeline, map, venue details, reservations, orders, and profile history work together as one app.
- **Provider-agnostic LLM layer**: Works with OpenAI, DeepSeek, Zhipu GLM, Moonshot, local Ollama, or any compatible `/chat/completions` endpoint.
- **Portable city dataset**: The current seed data focuses on Beijing; replace `prisma/seed.ts` to adapt the app to another city.
- **Simple local deployment**: SQLite + Prisma keeps the database setup lightweight.
- **Open-source ready**: MIT license, CI, Docker, API docs, contribution guide, security policy, and unit tests are included.

## Preview

| Chat planning | Itinerary timeline |
| --- | --- |
| ![Chat planning](docs/screenshots/readme-home.png) | ![Itinerary timeline](docs/screenshots/readme-itinerary.png) |

| Signed-in experience | Map view |
| --- | --- |
| ![Signed-in experience](docs/screenshots/readme-logged-in.png) | ![Map view](docs/screenshots/qa-map-view.png) |

## Features

- AI itinerary generation from time, location, budget, group type, and preferences.
- Timeline view with step-by-step activities, dining, costs, location metadata, and booking actions.
- Cost breakdown for activity, dining, and optional delivery-style expenses.
- Interactive map powered by Leaflet, React Leaflet, and OpenStreetMap tiles.
- Demo weather banner with district-level conditions, AQI, hourly forecast, and travel suggestions.
- Venue detail modal with rating, opening hours, facilities, reviews, occupancy, and restaurant menus.
- Reservation and delivery-order simulation for product workflow demos.
- Local authentication with demo accounts and profile history.
- Password hashing with Node.js `crypto.scrypt` and rate limiting on sensitive API routes.

## Tech Stack

| Area | Stack |
| --- | --- |
| Frontend | Next.js 15 App Router, React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Radix UI, Framer Motion |
| Database | SQLite, Prisma ORM |
| LLM | OpenAI-compatible Chat Completions API |
| Maps | Leaflet, React Leaflet, OpenStreetMap |
| Charts | Recharts |
| Validation and safety | Zod, scrypt password hashing, in-memory rate limiting |
| Testing | Vitest |
| Deployment | Docker, Docker Compose, GitHub Actions |

## Quick Start

### Requirements

- Node.js 18.18 or later
- npm
- An API key from an OpenAI-compatible LLM provider

### Run Locally

```bash
git clone https://github.com/GOOD-123-CPU/itinera.git
cd itinera

cp .env.example .env
npm run setup
npm run dev
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
npm.cmd run setup
npm.cmd run dev
```

Then open:

```text
http://localhost:3000
```

`npm run setup` installs dependencies, applies the Prisma schema to SQLite, and seeds demo data.

### Environment Variables

Start from `.env.example`:

```env
DATABASE_URL="file:../db/custom.db"
LLM_BASE_URL="https://api.openai.com/v1"
LLM_API_KEY="sk-your-api-key-here"
LLM_MODEL="gpt-4o-mini"
```

Compatible provider examples:

| Provider | `LLM_BASE_URL` | Example `LLM_MODEL` |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Zhipu GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| Ollama | `http://localhost:11434/v1` | `qwen2.5:7b` |

## Docker

Create `.env` with `LLM_API_KEY`, then run:

```bash
docker compose up -d --build
curl http://localhost:3000/api/health
```

The Docker setup uses a multi-stage build, runs as a non-root user, and persists SQLite data in a named volume.

## Scripts

```bash
npm run dev            # Start the development server
npm run build          # Build for production
npm run start          # Start the production server
npm run lint           # Run ESLint
npm test               # Run unit tests
npm run test:coverage  # Generate test coverage
npm run db:push        # Apply Prisma schema to SQLite
npm run db:seed        # Seed demo data
```

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@planner.com` | `admin123` |
| User | `xiaoming@example.com` | `user123` |

These accounts are for local demos only. For production, replace the auth flow, remove default accounts, use HTTPS, and connect a real user system.

## API

The REST API is mounted at:

```text
http://localhost:3000/api
```

Main endpoints:

- `GET /api/health`
- `POST /api/auth`
- `GET /api/venues`
- `GET /api/restaurants`
- `POST /api/agent`
- `POST /api/reservations`
- `POST /api/orders`
- `GET /api/weather`
- `GET /api/venue-detail`

See [API.md](./API.md) for request bodies, responses, validation rules, and error formats.

## Project Structure

```text
.
├── .github/              # CI, issue templates, PR template
├── db/                   # SQLite directory; real database files are ignored
├── docs/screenshots/     # README and QA screenshots
├── prisma/
│   ├── schema.prisma     # Prisma data model
│   └── seed.ts           # Beijing demo data
├── public/               # Static assets
├── src/
│   ├── app/              # Next.js pages and API routes
│   ├── components/       # Product and UI components
│   ├── hooks/            # React hooks
│   └── lib/              # Database, LLM, password, rate-limit, itinerary logic
├── tests/                # Vitest unit tests
├── API.md
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Adapting the City Dataset

Most city data lives in `prisma/seed.ts`. Replace the districts, venues, restaurants, coordinates, prices, opening hours, tags, and demo metadata, then run:

```bash
npm run db:seed
```

## Security Notes

The repository ignores local secrets and generated data by default:

- `.env`, `.env.local`, `.env*.local`
- `db/*.db`, `db/*.db-journal`
- `node_modules/`
- `.next/`, `.next-build/`, `.next-dev/`
- Logs, coverage, and editor caches

Before publishing, run:

```bash
git status --short
git diff --cached
```

Make sure no real API keys, private screenshots, database files, or production configs are staged.

## Production Notes

Itinera is a working product prototype and open-source reference. Before serving real users, consider adding:

- OAuth, email verification, or a fuller account system
- Redis or persistent rate limiting
- Real weather, route planning, payment, SMS, and email integrations
- Structured logs, monitoring, and error tracking
- Admin tooling and content moderation
- Database migrations, backups, and operational runbooks

## Contributing

Issues and pull requests are welcome. Please read:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)

## Disclaimer

- Weather, messaging, reservations, and delivery orders include demo or simulated logic.
- Seeded venue and restaurant data is for demonstration only; verify real-world details before visiting.
- Follow your LLM provider's terms and applicable data-protection laws when handling user data.

## License

[MIT](./LICENSE) © 2026 Itinera contributors
