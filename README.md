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
| Dozzle   | http://localhost:8080          |

[Dozzle](https://dozzle.dev/) gives a live view of all container logs. In dev it's
open on port 8080; in prod it's served at `logs.studypilot.aneshodza.ch` behind
username/password auth.

### Production logs setup

Before deploying, create the Dozzle auth file (it's gitignored — never commit it):

```bash
cp dozzle/users.yml.example dozzle/users.yml
# then replace the default admin/admin entry with your own:
docker run --rm amir20/dozzle:latest generate <user> --password '<password>' --name '<Name>'
```

Point a `logs.studypilot.aneshodza.ch` DNS record at the server so Caddy can issue
its TLS certificate.
