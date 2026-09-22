# Architecture

## Business problem

A multi-region Indian retail organisation currently handles customer complaints through email, website, social media, and store channels in a fragmented way. The platform centralises intake, assignment, SLA, escalation, analytics, and audit so operations can move from reactive ticket handling to measurable, data-driven improvement.

## Architecture summary

The system is a TypeScript monorepo:

- **frontend/** — React 18 + Vite SPA. Role-based routes, TanStack Query, React Hook Form + Zod, Recharts.
- **backend/** — Express REST API with layered architecture (routes → controllers → services → repositories → Prisma).
- **PostgreSQL 16** — source of truth. Prisma is the only database access path.
- **Docker Compose** — PostgreSQL always; optional full stack (api + nginx frontend).

```
Channel Adapter (Website | Email stub | Social stubs)
        ↓
  Normalised Complaint DTO
        ↓
  Complaint Service  →  Prisma / PostgreSQL
        ↓
  SLA Service · Notification Service · Audit · History
        ↓
  REST API  (/api/v1)
        ↓
  React SPA (RBAC-aware)
```

## Layering (backend)

| Layer | Responsibility |
| --- | --- |
| `routes/` | HTTP mapping, middleware composition |
| `controllers/` | Parse request, call service, shape response |
| `services/` | Business rules, lifecycle, SLA, RBAC scope |
| `repositories/` | Prisma queries only |
| `integrations/` | Channel, AI, storage, notification adapters |
| `jobs/` | SLA monitor / escalation scheduler |
| `middleware/` | AuthN, AuthZ, validation, errors, audit |

Controllers stay thin. Status transitions, SLA matching, IDOR scoping, and AI never live in controllers.

## Authentication and RBAC

- Access JWT (15 minutes) in `Authorization: Bearer`.
- Refresh token (7 days) stored **hashed** in PostgreSQL and sent as httpOnly cookie.
- Passwords hashed with bcrypt (cost 12).
- `authenticate()` verifies JWT; `authorize(...roles)` enforces role.
- Every complaint query is additionally scoped in the service layer (IDOR protection):
  - `CUSTOMER` — own `CustomerProfile` only
  - `AGENT` — assigned complaints only
  - `REGIONAL_MANAGER` — assigned `regionId` only
  - `OPERATIONS_MANAGER` — all (optional region scope if user has `regionId`)
  - `ADMIN` / `SUPER_ADMIN` — all

Frontend hiding of menus is **not** security. Backend denies unauthorised access with 403.

## Complaint lifecycle

Valid transitions (enforced server-side):

```
NEW → CATEGORISED | ASSIGNED
CATEGORISED → ASSIGNED
ASSIGNED → IN_PROGRESS | ESCALATED
IN_PROGRESS → PENDING | RESOLVED | ESCALATED
PENDING → IN_PROGRESS | RESOLVED | ESCALATED
ESCALATED → IN_PROGRESS | PENDING | RESOLVED
RESOLVED → CLOSED | REOPENED
CLOSED → REOPENED          (manager / admin formal reopen only)
REOPENED → ASSIGNED | IN_PROGRESS
```

`CLOSED → IN_PROGRESS` is **not** allowed. Reopen is an explicit `REOPENED` step with reason, then work resumes.

Website submissions that include a category are created as `CATEGORISED`. Every status, assignment, priority, and escalation change writes `ComplaintStatusHistory` and an `AuditLog`.

## SLA

`SLAPolicy` rows are the only source of response / resolution / escalation hours. Seed values are **demo configuration**, not production SLAs.

Matching order (first active match wins):

1. priority + category + region
2. priority + category
3. priority + region
4. priority only

A background job marks `APPROACHING` (default 80% of resolution window) and `OVERDUE`, notifies, and can raise SLA escalations.

## Integrations (intentionally not fake)

| Concern | MVP | Later |
| --- | --- | --- |
| Website channel | Fully functional adapter | — |
| Email / Instagram / Facebook / X / Google | Adapter stubs that refuse live ingest | Real APIs + credentials |
| AI | `MockAIProvider` if no key; `OpenAIProvider` if `AI_API_KEY` set | Other providers |
| Storage | Local disk | S3-compatible |
| Notifications | In-app | Email / SMS / push via same dispatcher |

AI suggestions are **never** auto-applied to customers. Agents accept / edit / reject.

## Assumptions (enterprise-safe defaults)

1. Public `/complaints/new` may be used by guests. A `CustomerProfile` is created/linked by email; tracking requires complaint number **and** email.
2. Agents do not self-assign from a global queue; operations managers assign. Agents work assigned items only.
3. Demo credentials exist only for local/seed environments and are documented in README.
4. Complaint numbers (`CMP-YYYY-NNNNNN`) are allocated in a transactional `ComplaintSequence` table.
5. `SUPER_ADMIN` is seeded in addition to `ADMIN`.
6. Guest users cannot enumerate other customers’ complaints (search is scoped; track endpoint requires number + email).

## Traceability

| Objective | Primary implementation |
| --- | --- |
| BO-01 Centralise | Single complaint store + channel adapters |
| BO-02 Visibility | Dashboards, filters, history |
| BO-03 Timeliness | SLA engine + overdue job |
| BO-04 Accountability | Assignment + audit + agent metrics |
| BO-05 Prioritisation | Configurable priorities + SLA |
| BO-06 Reporting | Dashboard + CSV reports |
| BO-07 Recurring issues | Analytics service (patterns, not claimed root cause) |
| BO-08 Proactive improvement | Recurring-issue + regional views |
| BO-09 Customer experience | Track, comments, resolution visibility |
| BO-10 Agent support | Agent workspace + AI suggestions (human-approved) |
