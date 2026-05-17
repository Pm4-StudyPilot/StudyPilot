# Local Setup And Calendar Testing

## Recommended Setup

Use the existing Docker-based local stack if possible.

That gives you:

- PostgreSQL
- MinIO
- the same local environment expected by the project

For the calendar feature specifically, PostgreSQL is required. MinIO is not required for the calendar itself, but it is part of the existing local stack and is the easiest way to run the full app without surprises.

## Option 1: Docker Desktop + WSL

This is the preferred setup on Windows + WSL.

### Install prerequisites

Install these on your system:

- Node.js 20+
- Docker Desktop
- Bun

If Bun is not installed yet:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then restart your shell, or run:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

### Enable Docker for WSL

In Docker Desktop:

1. Open `Settings`
2. Go to `Resources > WSL Integration`
3. Enable integration for your Ubuntu/WSL distro

Verify Docker works in WSL:

```bash
docker --version
docker compose version
```

### Project setup

From the project root:

```bash
cp .env.example .env
cp .env backend/.env
```

Install dependencies:

```bash
npm install
```

If your `npm` inside WSL is broken because it points to a Windows install, fix Node/npm inside WSL first and then rerun the command.

Start infrastructure:

```bash
docker compose up -d
```

Run Prisma migration and generate the client:

```bash
npm run db:migrate
npm run db:generate
```

Seed demo data:

```bash
cd backend
bun run db:seed
cd ..
```

Start the app:

```bash
npm run dev
```

App URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- MinIO console: `http://localhost:9001`

## Option 2: Native PostgreSQL Without Docker

Use this only if Docker Desktop is unavailable.

### Install PostgreSQL

On Ubuntu / WSL:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
```

Start PostgreSQL:

```bash
sudo service postgresql start
```

Create the local database and user:

```bash
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE USER studypilot WITH PASSWORD 'studypilot';
CREATE DATABASE studypilot OWNER studypilot;
\q
```

### Configure environment

From the project root:

```bash
cp .env.example .env
cp .env backend/.env
```

If you use native PostgreSQL instead of Docker, either:

- keep PostgreSQL listening on `5433`, or
- change `DATABASE_URL` in both `.env` and `backend/.env` back to `5432`

The current repository defaults are:

```env
DATABASE_URL=postgresql://studypilot:studypilot@127.0.0.1:5433/studypilot
```

### Install dependencies and database client

```bash
npm install
```

Run migrations and generate Prisma client:

```bash
npm run db:migrate
npm run db:generate
```

Seed demo data:

```bash
cd backend
bun run db:seed
cd ..
```

### Start the app

```bash
npm run dev
```

### Notes

- Native PostgreSQL is enough for calendar/task testing.
- MinIO is only needed if you want document upload features working locally.

## Test Accounts

The seed script creates these local users:

- `admin@example.com` / `Admin.Password123`
- `user@example.com` / `User.Password123`

## What Changed For Calendar Testing

The seed task due dates were changed to be relative to the current date instead of fixed old calendar dates.

That means a fresh local seed should now include:

- overdue tasks
- a task due today
- near-future tasks
- future tasks beyond the due-soon window

This makes the calendar feature immediately testable after seeding.

## Manual Calendar Test Checklist

After logging in:

1. Open the dashboard at `/`
2. Confirm the new `Deadline Calendar` panel appears next to the course list on desktop
3. Confirm today is visibly highlighted
4. Confirm some dates show deadline counts
5. Use previous and next month navigation
6. Click a date with a deadline and confirm the selected-day task list updates
7. Confirm the `Next deadlines` list shows future tasks
8. Confirm `Due soon`, `Due today`, and `Overdue` labels appear where appropriate
9. Click `Open course` from a calendar task and confirm it navigates to the correct course
10. Resize to mobile width and confirm the layout stacks cleanly

## Extra Validation

If you want to test the feature with your own dates:

1. Open a course
2. Create a new task or edit an existing one
3. Set the due date to:
   - yesterday for `Overdue`
   - today for `Due today`
   - within the next 7 days for `Due soon`
   - more than 7 days ahead for a normal scheduled future task
4. Return to the dashboard and confirm the calendar updates after refresh

## Frontend Verification Commands

Once dependencies are installed, these are the most relevant checks:

```bash
cd frontend
npx vitest run src/__tests__/DeadlineCalendar.test.tsx
npx vite build
```

If you prefer Bun tooling:

```bash
cd frontend
bunx vitest run src/__tests__/DeadlineCalendar.test.tsx
bunx vite build
```

## Troubleshooting

### `npm` is broken inside WSL

If `npm -v` fails and points to a Windows path, your WSL shell is using a Windows-managed npm wrapper.

Use a Linux-native Node installation inside WSL instead of the Windows wrapper, then rerun:

```bash
npm install
```

### PostgreSQL auth fails on `5432`

This repository is currently configured to use Docker Postgres on host port `5433`.

Check:

```bash
docker compose ps
```

Then confirm both env files match:

```env
DATABASE_URL=postgresql://studypilot:studypilot@127.0.0.1:5433/studypilot
```

### Prisma migration fails

Check:

- PostgreSQL is actually running
- `DATABASE_URL` matches your local DB
- the database user and database exist

### Dashboard shows no upcoming deadlines

Run the seed again:

```bash
cd backend
bun run db:seed
```

Or create/edit tasks manually with future due dates.
