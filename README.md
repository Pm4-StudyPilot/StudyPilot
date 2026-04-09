# StudyPilot

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- [Bun](https://bun.sh/)
- [Docker](https://www.docker.com/)

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts Postgres and MinIO.

### 2. Run setup

```bash
npm run setup
```

This copies `.env.example` → `.env`, installs dependencies, and sets up husky hooks.

### 4. Start development servers

```bash
npm run dev
```

This starts both services in parallel:

| Service  | URL                            |
| -------- | ------------------------------ |
| Frontend | http://localhost:5173          |
| Backend  | http://localhost:3000          |
| MinIO    | http://localhost:9001          |
| Swagger  | http://localhost:3000/api/docs |
