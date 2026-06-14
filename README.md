# RenovateFlow

Professional renovation payment management for property owners and contractors.

Upload your contractor agreement, auto-generate milestone payment checklists, manage draw requests with photo proof, approve work, and record payments — all in one place.

## Features

- **Contract upload & auto-checklist** — Upload a PDF contract; the app extracts milestone draw schedules automatically
- **Smart parsing** — Built-in rule-based parser handles standard milestone tables (no API key required). Optional Claude AI enhancement via `ANTHROPIC_API_KEY`
- **Contractor portal** — Invite your contractor to submit draw requests with photos and notes
- **Approval workflow** — Review completed work, approve/reject draws, record payments
- **Multi-unit support** — Track separate milestones per property/unit (e.g., duplex renovations)
- **Session-based auth** — Secure cookie sessions, no JWT tokens

## Quick start (local)

```bash
# Install dependencies
npm install

# Copy env and configure
cp .env.example .env
# Edit .env with your DATABASE_URL and SESSION_SECRET

# Push database schema
npm run db:push

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register as an owner, and upload your contract PDF.

## Deploy to Railway

1. Create a new Railway project and connect this repo
2. Add a **PostgreSQL** plugin — Railway sets `DATABASE_URL` automatically
3. Set environment variables:
   - `SESSION_SECRET` — random 32+ char string (`openssl rand -base64 32`)
   - `NEXT_PUBLIC_APP_URL` — your Railway public URL
   - `UPLOAD_DIR` — `/app/uploads`
4. Add a **Volume** mounted at `/app/uploads` for contract/photo persistence
5. Deploy — `start:prod` runs migrations and starts the server

### Optional: Claude AI contract parsing

Set `ANTHROPIC_API_KEY` for enhanced parsing of non-standard contracts.

> **Note:** Claude Pro/Max subscription (claude.ai) does not include API access. The built-in parser works well for standard milestone/draw schedule tables without any API key. API usage is pay-as-you-go and typically costs pennies per contract upload.

## Workflow

1. **Owner** registers and uploads the contractor PDF
2. App generates milestones, units, and payment amounts from the draw schedule
3. **Owner** invites contractor via email link
4. **Contractor** completes work, submits draw request with photos
5. **Owner** reviews photos, approves draw, records payment (Zelle/Venmo/check)
6. Next milestone unlocks automatically

## Tech stack

- Next.js 14 (App Router)
- PostgreSQL + Prisma
- iron-session (cookie auth)
- pdf-parse + rule-based / Claude contract parser
- Tailwind CSS
- Railway deployment
