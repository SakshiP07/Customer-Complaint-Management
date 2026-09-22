# Database

PostgreSQL 16 with Prisma ORM. Schema: `backend/prisma/schema.prisma`.

## Entities

User, Role, RefreshToken, CustomerProfile, Region, Store, Complaint, ComplaintCategory, ComplaintChannel, PriorityConfig, ComplaintSequence, ComplaintStatusHistory, ComplaintComment, ComplaintAttachment, ComplaintAssignment, SLAPolicy, SLARecord, Escalation, Notification, AuditLog, AIAnalysis, SystemSetting.

## Indexing (intentional)

**Complaint:** `complaintNumber` (unique), `status`, `priority`, `categoryId`, `channelId`, `regionId`, `storeId`, `assignedAgentId`, `createdAt`, `slaDueAt`, `customerId`.

**User:** `email` (unique), `roleId`, `regionId`, `storeId`.

**Supporting:** assignment/escalation/notification/audit foreign keys and time columns used in list/filter queries.

No covering indexes were added “just in case”; each index supports a list, search, SLA job, or uniqueness constraint.

## Complaint number

`ComplaintSequence(year, lastNumber)` is incremented inside a transaction to produce `CMP-2026-000001`. Numbers are never generated on the client.

## Seed data

`npx prisma db seed` loads **DEMO DATA** only: four Indian regions, stores, 50+ agents, categories, channels, SLA policies, and a large mixed complaint set (including overdue, escalated, and recurring billing/availability patterns).
