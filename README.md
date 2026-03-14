# StudyPilot

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Bun](https://bun.sh/)
- [Docker](https://www.docker.com/)

### 1. Set up environment variables

```bash
chmod +x setup-env.sh
./setup-env.sh
```

This copies `.env.example` files to `.env` in the root and `backend/` directories. Review and adjust values as needed.

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts Postgres and MinIO.

### 3. Install dependencies

```bash
npm install
```

### 4. Run database migration

```bash
cd backend && bun prisma migrate dev --name init && cd ..
```

### 5. Start development servers

```bash
npm run dev
```

This starts both services in parallel:

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3000 |
| MinIO    | http://localhost:9001 |
