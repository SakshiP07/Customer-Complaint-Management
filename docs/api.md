# API

Base URL: `/api/v1`

All JSON responses follow:

```json
{ "success": true, "data": {}, "message": "..." }
```

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }
```

Interactive Swagger UI: `http://localhost:4000/docs`

## Authentication

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | /auth/register | No | Customer registration |
| POST | /auth/login | No | Login, sets httpOnly refresh cookie |
| POST | /auth/refresh | Cookie | Rotate access token |
| GET | /auth/me | Bearer | Current user |
| POST | /auth/logout | Bearer | Revoke refresh tokens |

## Complaints

| Method | Path | Description |
| --- | --- | --- |
| POST | /complaints | Website intake (guest or signed-in) |
| GET | /complaints/track | Track with `complaintNumber` + `email` |
| GET | /complaints | Role-scoped list, pagination, filters |
| GET | /complaints/:id | Detail (IDOR scoped) |
| PATCH | /complaints/:id | Category, priority, additional info |
| POST | /complaints/:id/assign | Assign / reassign |
| POST | /complaints/:id/status | Valid transitions only |
| POST | /complaints/:id/escalate | Agent/manager escalation |
| POST | /complaints/:id/resolve | Resolve with notes |
| POST | /complaints/:id/comments | Customer or internal |
| GET | /complaints/:id/history | Audit trail |
| POST | /complaints/:id/attachments | Multipart `file` |
| POST | /complaints/:id/ai-analyse | AI suggestion (not auto-sent) |

Query filters: `search`, `status`, `priority`, `categoryId`, `channelId`, `regionId`, `storeId`, `from`, `to`, `page`, `pageSize`, `sort`, `order`.

## Dashboard and analytics

`/dashboard/summary|trends|by-channel|by-category|by-region|by-store|by-agent|sla|performance`

`/analytics/recurring-issues|categories|regions|stores`

`/reports?type=daily|weekly|monthly` and `/reports/csv`

## Admin

CRUD: `/admin/regions|stores|categories|channels|sla-policies`

`/admin/audit-logs`, `/admin/settings`

`/users` list/create/patch/status

`/lookups` public catalog for forms

`/notifications` in-app inbox
