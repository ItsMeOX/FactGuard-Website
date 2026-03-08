# FactGuard

🛡️ **Don't let misinformation win the narrative.**

**[→ Live demo: https://hackomania-three.vercel.app/](https://hackomania-three.vercel.app/)**

FactGuard is an AI-assisted credibility and fact-checking system. This repository is the **forum-based website**: a Next.js app for discovering suspicious claims, submitting reports, and browsing community discussions—with optional integration to the FactGuard browser extension for in-page verification and reporting.

---

## Related repositories

FactGuard is split across three repositories:

| Repo | Description |
|------|-------------|
| 🔌 **[FactGuard Web Extension](https://github.com/JunJin1218/FactGuard-WebExtension)** | Browser extension (WXT + Svelte) for inline Google Search verification badges and a popup credibility review. Supports login via this website and links to report suspicious content here. |
| ⚙️ **[FactGuard Web Extension Backend](https://github.com/JunJin1218/natfanclub-backend)** | FastAPI backend that powers the extension: crawling, summarization, and OpenAI-based verification (`/verify_content`, `/domain_verify`, `/crawl`). |
| 🌐 **This repo (FactGuard Website)** | Next.js forum-style website: landing, report submission, listing/detail pages, auth, and API used by the extension (e.g. chat report flow). |

---

## Extension in brief

The **FactGuard Web Extension** adds credibility signals where you browse:

- 🔍 Injects verification badges on Google Search results (e.g. Likely Accurate, Unverified, Potentially Misleading).
- 📋 Popup provides a detailed credibility review (crawl → summarize → verify) with supporting/contradicting sources.
- 🔗 Users can sign in with this website and use “Report” links to submit suspicious pages into the forum workflow below.

This website is the **forum and report hub**: you browse trending claims, open report details, and submit new reports—with or without the extension.

---

## Website features

- **Landing** – Tagline, “Verify a Claim” CTA, and trending/popular unverified claims by category.
- **Report** – Submit suspicious content (URL, headline, platform, reason, evidence); supports authenticated and extension-origin reports.
- **Forum / Listing** – Browse claims by category, view post detail with AI summary, reports, and threaded comments.
- **Auth** – Register, log in, profile (view/edit), and change password.
- **API** – REST API for posts, categories, reports, auth, and internal endpoints (e.g. extension chat report).

---

## Tech stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Database:** PostgreSQL with [Prisma](https://www.prisma.io)
- **Auth:** JWT (jose), bcrypt for passwords
- **Validation:** Zod
- **Styling:** CSS modules, Tailwind CSS
- **Language:** TypeScript

---

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL (local or hosted)
- Optional: env for OpenAI/Tavily if using AI processing

### Install and run

```bash
# Install dependencies
pnpm install
# or: npm install

# Set up environment (see Environment below)
cp .env.example .env
# Edit .env with DATABASE_URL and any optional vars

# Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Create a `.env` file (see `.env.example` if present). Typical variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `JWT_SECRET` | Secret for signing auth tokens |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app (e.g. for API base URL in prod) |

Other vars may be used for AI processing or internal APIs; check the codebase and `.env.example`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run Jest tests |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:push` | Push schema without migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:generate` | Generate Prisma client |

---

## Project structure (high level)

```
app/
  page.tsx              # Landing + trending claims
  report/page.tsx       # Report submission
  listing/              # Browse claims, [id] detail
  auth/                 # Login, register
  profile/page.tsx      # User profile & change password
  api/                  # REST: auth, posts, reports, categories, internal
lib/
  services/             # Business logic (auth, post, report, category-ranking, …)
  validators/           # Zod schemas
  prisma.ts             # Prisma client
prisma/
  schema.prisma         # Data models
```

---

## Deploy

The app is suitable for [Vercel](https://vercel.com) or any Node.js host. Set `DATABASE_URL` and `JWT_SECRET` (and optionally `NEXT_PUBLIC_APP_URL`) in the deployment environment. Run migrations (e.g. in CI or a release step) before or after deploy.

---

## License

See repository license file.
