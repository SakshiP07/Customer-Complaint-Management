# Complaint Ingestion Documentation

This document explains how complaints are automatically ingested from Email and YouTube into the complaint management platform.

## Overview

The platform supports automatic complaint ingestion from two external sources:

1. **Email** - Customers send emails to a dedicated Gmail inbox
2. **YouTube** - Customers post comments on monitored YouTube channels

Both integrations run as background polling services that periodically check for new content and convert it into complaints in the system.

## Email Complaint Flow

```
Customer → Gmail inbox → IMAP → Backend → Complaint → PostgreSQL → Dashboard
```

### Detailed Flow

1. Customer sends email to dedicated Gmail complaint inbox
2. Backend connects via Gmail IMAP (imap.gmail.com:993 with TLS)
3. EmailPollingService polls every 5 minutes
4. Email is fetched from INBOX (unseen emails since last check)
5. Email is parsed (subject, from, text, html) using simpleParser
6. EmailChannelAdapter normalizes data to complaint format
7. Customer profile is created/found (by email address)
8. Complaint is created via complaintService.createFromWebsite()
9. Complaint saved in PostgreSQL with source = EMAIL
10. SLA policy applied automatically
11. Complaint appears in All Complaints dashboard
12. Manager/Agent can view and process it

### Email Implementation Details

- **IMAP Connection**: Uses `imapflow` library to connect to Gmail
- **Polling Interval**: Every 5 minutes (hardcoded)
- **Deduplication**: Uses Message-ID header to prevent duplicate complaints
- **Default Region/Category**: Applied if not specified in email
- **Customer Creation**: Automatically creates customer profile if email address is new

## YouTube Complaint Flow

```
YouTube comment → YouTube Data API → Backend → Complaint → PostgreSQL → Dashboard
```

### Detailed Flow

1. Customer posts comment on monitored YouTube channel
2. YouTube Data API v3 is polled
3. YouTubePollingService polls every 10 minutes
4. New comments are fetched from monitored channels
5. YouTubeChannelAdapter normalizes data to complaint format
6. Customer profile is created/found (email = channelId@youtube.com)
7. Complaint created via complaintService.createFromWebsite()
8. Complaint saved in PostgreSQL with source = YOUTUBE
9. SLA policy applied automatically
10. Complaint appears in All Complaints dashboard
11. Manager/Agent can view and process it

### YouTube Implementation Details

- **API Authentication**: Uses YouTube Data API v3 with API key
- **Polling Interval**: Every 10 minutes (configurable via YOUTUBE_POLLING_INTERVAL_MINUTES)
- **Deduplication**: Uses comment ID to prevent duplicate complaints
- **Channel Monitoring**: Supports multiple channel IDs (comma-separated)
- **Customer Email**: YouTube doesn't provide email, uses `channelId@youtube.com` as placeholder
- **Default Region/Category**: Applied if not specified

## What Each Credential Does

### Email Credentials

| Variable | Purpose |
|----------|---------|
| `EMAIL_IMAP_HOST` | Mail server used to connect to Gmail (default: imap.gmail.com) |
| `EMAIL_IMAP_PORT` | IMAP connection port (default: 993) |
| `EMAIL_TLS` | Enables secure encrypted IMAP connection (default: true) |
| `EMAIL_USER` | Dedicated Gmail complaint-inbox address |
| `EMAIL_PASSWORD` | Gmail App Password used by backend to authenticate to the mailbox |

**Important**: Gmail requires an App Password, not the regular account password. Generate one at Google Account > Security > 2-Step Verification > App Passwords.

### YouTube Credentials

| Variable | Purpose |
|----------|---------|
| `YOUTUBE_API_KEY` | Authentication credential used by backend requests to YouTube Data API |
| `YOUTUBE_CHANNEL_IDS` | Identifies which YouTube channel(s) the backend should monitor (comma-separated) |
| `YOUTUBE_POLLING_INTERVAL_MINUTES` | Controls how frequently the backend checks YouTube for new comments (default: 10) |

**Important**: Get YouTube API key from Google Cloud Console > APIs & Services > Credentials.

## Environment Variables

### Required for Email Integration

```bash
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_TLS=true
EMAIL_USER=your-complaint-inbox@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
```

### Required for YouTube Integration

```bash
YOUTUBE_API_KEY=your-youtube-api-key
YOUTUBE_CHANNEL_IDS=UCxxxxxxxxxxxxxxxxxxxxxx,UCyyyyyyyyyyyyyyyyyyyyyy
YOUTUBE_POLLING_INTERVAL_MINUTES=10
```

## .env vs .env.example

### .env (Local Configuration)

- **Purpose**: Contains REAL credentials and secrets for local development
- **Location**: Project root directory
- **Git Status**: MUST be gitignored (never committed)
- **Contents**: Actual email passwords, API keys, database credentials

### .env.example (Template)

- **Purpose**: Safe template showing required variables without real values
- **Location**: Project root directory
- **Git Status**: Tracked and committed to repository
- **Contents**: Only placeholders and non-secret defaults

**Rule**: Never put real credentials in `.env.example`. Use empty values or safe defaults like `imap.gmail.com`, `993`, `true`.

## Security Rules

1. **Never commit .env to Git** - `.env` is in `.gitignore`
2. **Never put real credentials in source code** - Always use environment variables
3. **Never send secrets to frontend** - API keys and passwords stay on backend
4. **Never log secrets** - Logs should not contain passwords or API keys
5. **Never expose secrets in API responses** - Frontend only receives safe complaint data

## Complaint Source Values

Complaints are stored with channel codes in the database:

| Channel Code | Display Name | Source |
|-------------|--------------|--------|
| `WEBSITE` | Website | Web form submission |
| `EMAIL` | Email | Gmail IMAP integration |
| `YOUTUBE` | YouTube | YouTube API integration |

**Note**: Only these three sources are currently supported. Do not add unsupported sources like META, X, TWITTER, etc.

## Polling Intervals

| Service | Default Interval | Configurable Via |
|---------|------------------|------------------|
| Email Polling | 5 minutes | Hardcoded in EmailPollingService |
| YouTube Polling | 10 minutes | `YOUTUBE_POLLING_INTERVAL_MINUTES` |
| SLA Monitor | Every 1 minute | Hardcoded in `slaMonitor.ts` |

Polling services start automatically when the backend server starts (unless `NODE_ENV=test`).

## Troubleshooting

### Email Integration Not Working

1. **Check environment variables**: Ensure `EMAIL_USER` and `EMAIL_PASSWORD` are set
2. **Verify App Password**: Gmail requires App Password, not account password
3. **Check IMAP access**: Ensure IMAP is enabled in Gmail settings
4. **Review logs**: Look for "Email polling started" and "Checking for new emails..."
5. **Test connection**: Backend has `testConnection()` method for EmailPollingService

### YouTube Integration Not Working

1. **Check API key**: Ensure `YOUTUBE_API_KEY` is set and valid
2. **Verify channel IDs**: Ensure `YOUTUBE_CHANNEL_IDS` are correct (comma-separated)
3. **Check API quota**: YouTube API has daily quota limits
4. **Review logs**: Look for "YouTube polling started" and "Checking YouTube for new comments..."
5. **Test connection**: Backend has `testConnection()` method for YouTubePollingService

### Duplicate Complaints

Both integrations use deduplication:

- **Email**: Message-ID appended to subject, checked before creation
- **YouTube**: Comment ID appended to subject, checked before creation

If duplicates appear, check that the deduplication logic is working correctly in the respective service files.

### Complaints Not Appearing in Dashboard

1. **Check database**: Verify complaints exist in PostgreSQL
2. **Check channel**: Ensure ComplaintChannel record exists for EMAIL/YOUTUBE
3. **Check API**: Verify `/api/v1/complaints` endpoint returns the complaints
4. **Check frontend**: Verify React Query is fetching and displaying data
5. **Check role**: Ensure user has permission to view the complaints

## Runtime Configuration

Environment variables are loaded at startup via:

```typescript
// backend/src/config/env.ts
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(backendRoot, '../.env') });
dotenv.config({ path: path.resolve(backendRoot, '.env') });
```

The backend validates required variables using Zod schema. Missing variables will cause startup to fail with a clear error message.

## Safe Logging

The platform uses structured logging. Logs include:

- "Email polling started"
- "Checking for new emails..."
- "Found X new emails"
- "Created complaint from email"
- "YouTube polling started"
- "Checking YouTube for new comments..."
- "Created complaint from YouTube comment"

Logs never include:
- Email passwords
- API keys
- Authorization tokens
- App passwords

## Architecture Summary

**Backend Components:**
- `EmailPollingService` - Handles email ingestion via IMAP
- `YouTubePollingService` - Handles YouTube comment ingestion via API
- `EmailChannelAdapter` - Normalizes email data to complaint format
- `YouTubeChannelAdapter` - Normalizes YouTube data to complaint format
- `complaintService.createFromWebsite()` - Creates complaint in database
- Prisma ORM - Database operations

**Database Models:**
- `Complaint` - Stores complaint data with `channelId` reference
- `ComplaintChannel` - Stores channel definitions (WEBSITE, EMAIL, YOUTUBE)
- `CustomerProfile` - Stores customer information
- `SLARecord` - Stores SLA tracking for each complaint

**Frontend Display:**
- Complaint list shows `channel.name` (e.g., "Email", "YouTube")
- Complaint details show source information
- Dashboard updates automatically via React Query polling (30 seconds)
