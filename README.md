# ReachInbox Full-Stack Email Job Scheduler

A production-grade, distributed outbound email scheduling and queuing platform built with **React**, **TypeScript**, **Node.js / Express**, **PostgreSQL**, **Prisma ORM**, **BullMQ**, **Redis**, **Elasticsearch**, and **Ethereal Email SMTP**, featuring real **Google OAuth**, **Slack OAuth**, and distributed rate-limit notifications.

---

## Architecture Overview

```
                                  +------------------------------------------+
                                  |         React + Vite Frontend            |
                                  |  - Scheduled/Sent Dashboard              |
                                  |  - CSV Lead Upload & Client Validation   |
                                  |  - Elasticsearch Debounced Search        |
                                  |  - Google & Slack OAuth Status           |
                                  +--------------------+---------------------+
                                                       |
                                            HTTP / REST (Cookies / JWT)
                                                       v
+---------------------------------------------------------------------------------------------------------+
|                                    Express.js API Monolith Server                                       |
|                                                                                                         |
|  +--------------------+   +-----------------------+   +--------------------+   +---------------------+  |
|  | Auth Controller    |   | Email Controller      |   | Campaign Controller|   | Slack Controller    |  |
|  | - Google OAuth 2.0 |   | - Schedule Campaign   |   | - Senders list     |   | - Connect / OAuth   |  |
|  | - /me & Logout     |   | - Scheduled / Sent    |   | - Campaign Stats   |   | - Disconnect        |  |
|  | - Demo Test Login  |   | - ES Search Endpoint  |   |                    |   | - Status            |  |
|  +--------------------+   +-----------------------+   +--------------------+   +---------------------+  |
|                                                                                                         |
|  Bull Board UI Endpoint: /admin/queues (Direct BullMQ Queue Inspection & Telemetry)                    |
+-------------------+------------------------------+------------------------------------+-----------------+
                    |                              |                                    |
                    v                              v                                    v
     +-----------------------------+ +-----------------------------+ +----------------------------------+
     |   PostgreSQL via Prisma     | |  BullMQ & Redis (Delayed)   | |      Elasticsearch Cluster       |
     |  - User, Sender, Campaign   | |  - Deterministic Job IDs    | |  - Index: 'emails'               |
     |  - Email, SlackConnection   | |  - Exponential Backoff      | |  - Full-text & Fuzzy search      |
     |  - Status: scheduled,       | |  - Survives container       | |  - Scoped to authenticated user  |
     |    processing, sent, failed | |    restarts (AOF enabled)   | |  - Document state synchronization|
     +-----------------------------+ +--------------+--------------+ +----------------------------------+
                                                    |
                                    Job Claim & Execution
                                                    v
                             +----------------------------------------------+
                             |          BullMQ Email Worker Pool            |
                             |  - Configurable Concurrency Controls         |
                             |  - Atomic DB Idempotency Claim               |
                             |  - Distributed Rate Limiter (Redis Lua)      |
                             |  - Min Send Delay Enforcer                   |
                             |  - Auto-reschedule to next UTC window        |
                             +-----------+----------------------+-----------+
                                         |                      |
                    On Quota Exhaustion  |                      | On Allowed Send
                                         v                      v
                +----------------------------------+  +-----------------------------------+
                |          Slack Web API           |  |      Nodemailer / Ethereal SMTP   |
                |  - Single alert per sender/window|  |  - Real outbound test delivery    |
                |  - Redis deduplication key       |  |  - Message IDs & Preview URLs     |
                |  - Isolated failure model        |  |  - DB & ES status -> 'sent'       |
                +----------------------------------+  +-----------------------------------+
```

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite | Clean, responsive outbound dashboard, CSV parser, and live status |
| **Backend API** | Node.js, Express.js, TypeScript | Modular REST API with centralized error handling and Zod validation |
| **Database** | PostgreSQL 16, Prisma ORM | Relational source of truth, foreign keys, indexing, and atomic transactions |
| **Queue & Cache** | Redis 7 (AOF enabled), BullMQ v5 | Deterministic delayed jobs, worker concurrency, and distributed coordination |
| **Queue Admin** | Bull Board (`@bull-board/express`) | Real-time queue visualizer at `/admin/queues` |
| **Search Engine** | Elasticsearch 8 | Indexed full-text search across recipients, subjects, and statuses |
| **SMTP Delivery**| Nodemailer, Ethereal Email | Real outbound SMTP testing with live preview links |
| **Integrations** | Google OAuth 2.0, Slack OAuth v2 | Real Google user authentication and Slack webhook rate limit alerts |
| **Testing** | Jest, ts-jest, Supertest | Unit & integration tests for scheduling math, rate limiting, CSV, and API |
| **Containerization** | Docker, Docker Compose | Multi-container setup with persistent data volumes |

---

## Core Engineering Principles & Architecture

### 1. Deterministic Scheduling (No Cron Jobs)
- **Zero cron jobs or polling loops**: We never use `node-cron`, `setInterval`, or table-polling loops.
- When an outbound campaign is scheduled:
  $$\text{scheduledAt} = \text{startTime} + (\text{recipientIndex} \times \text{delayBetweenEmails})$$
  $$\text{delayMs} = \max(0, \text{scheduledAt} - \text{currentTime})$$
- Each recipient becomes an individual BullMQ delayed job with a deterministic job ID: `email-${emailId}`.
- BullMQ's internal Redis sorted sets (`zset`) trigger jobs precisely when their delay timestamp expires.

### 2. Strict Idempotency & Concurrency Safeguards
- **Database as Source of Truth**: Before sending, the worker performs an atomic conditional update:
  ```sql
  UPDATE "Email"
  SET status = 'processing', attempts = attempts + 1
  WHERE id = $id AND status = 'scheduled'
  ```
- If another worker has already claimed the job or the email is already in `'sent'` status, the claim query returns 0 rows, and the job aborts immediately without sending a duplicate.
- BullMQ deterministic job IDs (`email-${emailId}`) prevent duplicate queue insertion.

### 3. Distributed-Safe Rate Limiting (Redis Lua Script)
- Hourly quota is tracked in Redis using the key:
  `email-rate-limit:{senderId}:{hourWindow}` where `hourWindow` is UTC-based (`YYYY-MM-DD-HH`).
- An atomic Redis Lua script ensures that multiple concurrent workers never exceed the configured limit:
  ```lua
  local current = redisClient.call('GET', KEYS[1])
  if current and tonumber(current) >= tonumber(ARGV[1]) then
    return 0
  else
    local newVal = redisClient.call('INCR', KEYS[1])
    if tonumber(newVal) == 1 then
      redisClient.call('EXPIRE', KEYS[1], ARGV[2])
    end
    return 1
  end
  ```
- **Next-Hour Rescheduling**: When the limit is reached, jobs are **not deleted or failed**. Instead, the worker calculates the start of the next UTC hour window (`Math.floor(now / 3600000 + 1) * 3600000`), sets the DB record back to `'scheduled'`, and re-enqueues a BullMQ delayed job for the next window.

### 4. Slack Notification Deduplication & Failure Isolation
- When an hourly limit is hit, an alert is dispatched to the user's connected Slack channel.
- **Spam Prevention**: To prevent 500 concurrent jobs from firing 500 identical Slack alerts, we use a Redis atomic lock:
  `SET slack-rate-limit-notified:{senderId}:{hourWindow} 1 NX EX 7200`
  Only the first worker to encounter the limit sends the notification.
- **Failure Isolation**: A Slack API failure will **never** fail the email job or disrupt worker execution.

### 5. Elasticsearch Document Synchronization
- On scheduling, email documents are indexed into the `emails` index.
- On delivery or failure, Elasticsearch documents are updated with `status` and `sentAt`.
- Search queries execute against Elasticsearch with fuzzy matching on recipient and subject, scoped strictly to the authenticated user ID.
- If Elasticsearch is temporarily unreachable, the API gracefully falls back to PostgreSQL ILIKE queries.

---

## Directory Structure

```
reachinbox-email-scheduler/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules
├── docker-compose.yml        # Multi-container orchestration (Postgres, Redis, ES, Backend, Frontend)
├── package.json              # Monorepo root orchestration
├── README.md                 # System documentation & evaluation guide
├── backend/
│   ├── Dockerfile
│   ├── jest.config.js
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma     # PostgreSQL models & indexes
│   │   └── seed.ts           # Demo seed data
│   ├── src/
│   │   ├── app.ts            # Express application setup
│   │   ├── server.ts         # Bootstrap & graceful shutdown
│   │   ├── config/           # Environment, DB, Redis, Elasticsearch
│   │   ├── controllers/      # Auth, Email, Campaign, Slack, Dashboard
│   │   ├── middleware/       # Auth, Error, Validation
│   │   ├── queues/           # BullMQ Queue, Worker, Bull Board router
│   │   ├── routes/           # Express router endpoints
│   │   ├── services/         # Smtp, Scheduler, RateLimiter, Search, Slack
│   │   ├── types/            # TypeScript interfaces & enums
│   │   └── utils/            # Scheduling math, Idempotency, CSV, Logger
│   └── tests/                # Automated Jest test suites
└── frontend/
    ├── Dockerfile
    ├── index.html
    ├── nginx.conf
    ├── package.json
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── index.css
        ├── components/       # Button, Input, Modal, Table, Badge, Header, etc.
        ├── features/         # Compose, CsvUploader, Scheduled, Sent, Slack, Search, Stats
        ├── hooks/            # useAuth, useEmails
        ├── pages/            # Login, Dashboard
        ├── services/         # Centralized Axios API client
        └── types/            # Frontend TypeScript models
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP port | `5000` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://reachinbox_user:reachinbox_pass@localhost:5432/reachinbox_db?schema=public` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `ELASTICSEARCH_URL`| Elasticsearch HTTP endpoint | `http://localhost:9200` |
| `WORKER_CONCURRENCY` | BullMQ worker concurrency | `5` |
| `MIN_SEND_DELAY_MS` | Minimum delay between sender emails | `2000` |
| `MAX_EMAILS_PER_HOUR`| Default sender hourly limit | `100` |
| `SESSION_SECRET` | Secret for cookie parser | 32+ char secret |
| `JWT_SECRET` | Secret for auth JWT signatures | 32+ char secret |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Obtain from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Obtain from Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | Google OAuth Callback URL | `http://localhost:5000/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack App Client ID | Obtain from Slack API |
| `SLACK_CLIENT_SECRET` | Slack App Client Secret | Obtain from Slack API |
| `SLACK_REDIRECT_URI` | Slack OAuth Redirect URI | `http://localhost:5000/api/slack/callback` |
| `ETHEREAL_USER` | Ethereal SMTP username | Auto-provisioned if empty |
| `ETHEREAL_PASSWORD` | Ethereal SMTP password | Auto-provisioned if empty |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:5173` |

> **Tip regarding Ethereal Email**: If `ETHEREAL_USER` and `ETHEREAL_PASSWORD` are left blank, ReachInbox will **automatically provision an ephemeral Ethereal test account on startup** and log the credentials to the console.

---

## Quick Start with Docker Compose

To spin up all services (PostgreSQL, Redis, Elasticsearch, Backend, Frontend) with persistent volumes:

```bash
# 1. Start all infrastructure and applications
docker compose up -d

# 2. View backend logs (including email preview URLs)
docker compose logs -f backend
```

- Frontend App: **http://localhost:5173**
- Backend Health: **http://localhost:5000/health**
- Bull Board Queue UI: **http://localhost:5000/admin/queues**
- Elasticsearch Health: **http://localhost:9200**

---

## Local Development (Without Docker)

### Prerequisites
- Node.js >= 20.x
- PostgreSQL instance running on port 5432
- Redis instance running on port 6379
- Elasticsearch instance running on port 9200

### 1. Database Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

### 2. Run Backend & Worker
```bash
cd backend
npm run dev
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## Bull Board Queue Dashboard

Bull Board is integrated directly into Express and exposed at:
👉 **`http://localhost:5000/admin/queues`**

It allows you to inspect:
- **Delayed Jobs**: Scheduled emails awaiting their execution timestamp.
- **Active Jobs**: Emails currently being processed by the concurrent workers.
- **Completed Jobs**: Delivered emails.
- **Failed Jobs**: Emails that encountered permanent SMTP errors.

---

## API Endpoints

### Authentication
- `GET /auth/google`: Initiates Google OAuth consent.
- `GET /auth/google/callback`: Handles Google OAuth callback, sets HTTP-only session cookie.
- `GET /api/auth/me`: Returns profile of the authenticated user.
- `POST /api/auth/logout`: Clears session cookie.
- `POST /api/auth/demo-login`: Instant demo login for local evaluation.

### Email Operations
- `POST /api/emails/schedule`: Enqueues campaign and individual BullMQ delayed jobs.
- `GET /api/emails/scheduled`: Lists queued/processing emails for the authenticated user.
- `GET /api/emails/sent`: Lists successfully delivered or failed emails.
- `GET /api/emails/search?q=`: Full-text fuzzy search powered by Elasticsearch.
- `GET /api/emails/:id`: Retrieves individual email metadata.

### Slack Integration
- `GET /api/slack/connect`: Generates Slack OAuth authorization redirect.
- `GET /api/slack/callback`: Slack OAuth callback to persist team token and channel.
- `GET /api/slack/status`: Returns whether Slack is connected and channel name.
- `POST /api/slack/disconnect`: Disconnects user's Slack workspace.

### Metrics & Health
- `GET /api/dashboard/stats`: Returns counts for scheduled, processing, sent, and rate limit meter.
- `GET /health`: Healthcheck endpoint for Docker and load balancers.

---

## Automated Tests

Run the test suite in the `backend/` directory:

```bash
cd backend
npm test
```

Test coverage includes:
1. `scheduling.test.ts`:
   - Deterministic sequential timestamp computation.
   - BullMQ delay calculations with zero negative delays.
   - UTC hour window isolation and crossing midnight boundaries.
2. `csv.test.ts`:
   - Email regex validation.
   - Header stripping and whitespace trimming.
   - Multi-row CSV parsing, duplicate detection, and invalid row filtering.
3. `idempotency.test.ts`:
   - Deterministic job ID generation (`email-${id}`).
4. `rateLimiter.test.ts`:
   - UTC hour boundary calculations.
   - Next-window target time and delay calculation.
5. `api.test.ts`:
   - `/health` endpoint response.
   - Unauthenticated 401 UNAUTHORIZED rejection.

---

## Step-by-Step Demo Walkthrough

1. **Authentication**:
   - Open `http://localhost:5173`.
   - Click **"Continue with Google"** (if OAuth credentials are set) or **"Sign In as Demo Reviewer"** for instant local evaluation.
2. **Dashboard & Metrics**:
   - Observe the 4 metric cards: Scheduled Queued, In Flight / Processing, Delivered Outbound, and Hourly Rate Limit Meter.
3. **Compose Outbound Campaign**:
   - Click **"Compose New Email"**.
   - Upload a `.csv` lead file (or sample rows):
     ```csv
     email
     sarah.lead@acme.com
     michael.buyer@enterprise.io
     elena.vp@techcorp.com
     ```
   - Watch the client-side parser display valid count, duplicates removed, and preview chips.
   - Set **Start Time** (e.g. 10 seconds from now), **Delay** (2 seconds), and **Hourly Limit** (e.g. 5).
   - Click **"Schedule Campaign"**.
4. **BullMQ Telemetry**:
   - Open **`http://localhost:5000/admin/queues`** in another tab.
   - Observe the jobs in the **Delayed** tab with countdowns corresponding to each recipient's delay.
   - As the countdown expires, watch jobs transition to **Active** and then **Completed**.
5. **Real-time Status Updates**:
   - On the frontend dashboard, watch emails transition from **Scheduled** (amber) to **Processing** (indigo spinner) and finally to the **Sent Emails** tab (emerald badge).
6. **Elasticsearch Live Search**:
   - In the search bar, type `acme` or `sarah`.
   - Observe instant results queried from Elasticsearch.
7. **Testing the Distributed Rate Limit & Slack Alert**:
   - Set the campaign hourly limit to `2` and upload 5 leads.
   - The first 2 emails will send immediately.
   - The 3rd email will trigger the rate limit.
   - The email is rescheduled for the next UTC hour window, remaining safely in BullMQ.
   - If Slack is connected, a rate-limit alert is delivered to your Slack channel with Redis-based deduplication preventing alert spam.

---

## Known Assumptions & Trade-offs

1. **Two-Phase Coordination (DB vs Queue)**:
   - PostgreSQL and Redis cannot participate in a single atomic two-phase commit without significant distributed coordinator overhead.
   - **Our Design**: We persist records to PostgreSQL first with status `'scheduled'`. Then we enqueue jobs into BullMQ. If Redis enqueue fails, the DB record remains in `'scheduled'` state, allowing a background sweeper or retry loop to safely re-enqueue it without data loss.
2. **At-Least-Once Delivery**:
   - In distributed systems, if a server crashes after SMTP accepts an email but before PostgreSQL status updates to `'sent'`, a retry could potentially deliver a second copy.
   - We minimize this window by using an atomic status transition (`scheduled` -> `processing`) before sending.
3. **Single Alert Per Hour Window**:
   - To respect Slack API limits and prevent channel spam when high-volume campaigns exceed quotas, we deliberately deduplicate rate-limit alerts so that a sender alerts at most once per UTC hour window.
