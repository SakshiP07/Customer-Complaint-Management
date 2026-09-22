# Multi-Tenant Architecture Audit & Implementation Plan

## Executive Summary

The current complaint management platform is **single-tenant**. There is no Company/Organization model, and all data is globally shared across the application. To implement proper multi-tenancy with strict data isolation, significant architectural changes are required.

---

## Current Architecture Audit

### 1. Database Schema Analysis

#### Missing Company Model
- **Status**: ❌ No `Company` or `Organization` model exists
- **Impact**: Cannot associate any data with a specific company

#### Models Requiring companyId

| Model | Current Status | Needs companyId? | Notes |
|-------|----------------|-----------------|-------|
| User | ❌ No companyId | ✅ Yes | Users must belong to a company |
| CustomerProfile | ❌ No companyId | ✅ Yes | Customers must be company-scoped |
| Complaint | ❌ No companyId | ✅ Yes | Core entity requiring isolation |
| Region | ❌ No companyId | ✅ Yes | Regions are company-specific |
| Store | ❌ No companyId | ✅ Yes | Stores are company-specific |
| ComplaintCategory | ❌ No companyId | ✅ Yes | Categories are company-specific |
| ComplaintChannel | ❌ No companyId | ✅ Yes | Channels are company-specific |
| PriorityConfig | ❌ No companyId | ✅ Yes | Priority rules are company-specific |
| SLAPolicy | ❌ No companyId | ✅ Yes | SLA policies are company-specific |
| Notification | ❌ No companyId | ✅ Yes | Notifications must be company-scoped |
| AuditLog | ❌ No companyId | ✅ Yes | Audit logs must be company-scoped |
| AIAnalysis | ❌ No companyId | ✅ Yes | AI analyses are company-specific |
| Conversation | ❌ No companyId | ✅ Yes | Conversations are company-specific |
| ConversationMessage | ❌ No companyId | ✅ Yes | Messages are company-specific |

#### Integration Configuration
- **Email Integration**: Currently configured via environment variables (`EMAIL_USER`, `EMAIL_PASSWORD`)
- **YouTube Integration**: Not modeled as a database entity
- **Issue**: Cannot have per-company integration credentials

### 2. Backend API Analysis

#### Authentication
- Current: JWT tokens contain user info but no company context
- Required: JWT must include companyId

#### Authorization
- Current: Role-based authorization only
- Required: Role + Company-based authorization

#### Critical Endpoints Requiring Company Scoping

All endpoints need company scoping. Key examples:

- `/complaints` - Must filter by user's company
- `/complaints/:id` - Must verify complaint belongs to user's company
- `/dashboard/*` - Must aggregate only user's company data
- `/notifications` - Must return only user's company notifications
- `/users` - Must return only users from same company
- `/regions`, `/stores`, `/categories` - Must return company-scoped data
- `/admin/*` - Must enforce company boundaries

### 3. Frontend Analysis

#### Current State
- No company selection or display
- No awareness of company boundaries
- No company-specific UI elements

#### Required Changes
- Add company selector (for platform admins)
- Display company name in header
- All API calls must include company context (implicitly via auth token)
- Settings pages must be company-scoped

### 4. Integration Analysis

#### Email Integration
- **Current**: Single global email inbox via environment variables
- **Required**: Per-company email configuration stored in database
- **Migration**: Move credentials from .env to database (encrypted)

#### YouTube Integration
- **Current**: Not fully modeled
- **Required**: Per-company YouTube channel configuration

---

## Implementation Plan

### Phase 1: Database Schema Changes

#### 1.1 Add Company Model
```prisma
model Company {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users                  User[]
  customerProfiles       CustomerProfile[]
  complaints             Complaint[]
  regions                Region[]
  stores                 Store[]
  complaintCategories    ComplaintCategory[]
  complaintChannels       ComplaintChannel[]
  priorityConfigs        PriorityConfig[]
  slaPolicies            SLAPolicy[]
  notifications          Notification[]
  auditLogs              AuditLog[]
  aiAnalyses             AIAnalysis[]
  conversations          Conversation[]
  emailIntegrations      EmailIntegration[]
  youtubeIntegrations    YouTubeIntegration[]

  @@index([slug])
  @@index([isActive])
}
```

#### 1.2 Add companyId to All Company-Scoped Models

Add to each model:
```prisma
companyId String
company   Company @relation(fields: [companyId], references: [id])
@@index([companyId])
```

#### 1.3 Add Integration Models
```prisma
model EmailIntegration {
  id           String   @id @default(uuid())
  companyId    String
  imapHost     String
  imapPort     Int
  imapUser     String
  imapPassword String  // Encrypted
  imapTls      Boolean  @default(true)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  company      Company  @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([isActive])
}

model YouTubeIntegration {
  id           String   @id @default(uuid())
  companyId    String
  channelId    String
  apiKey       String  // Encrypted
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  company      Company  @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([isActive])
}
```

### Phase 2: Data Migration Strategy

#### 2.1 Create Default Company
- Create a single "Default Company" record
- Assign all existing data to this company

#### 2.2 Migration Script
```typescript
// Migration steps:
1. Create default company
2. Update all User records with companyId
3. Update all CustomerProfile records with companyId
4. Update all Complaint records with companyId
5. Update all Region, Store, Category, Channel, Priority, SLA records with companyId
6. Update all Notification, AuditLog, AIAnalysis, Conversation records with companyId
7. Create EmailIntegration record from current environment variables
```

#### 2.3 Important Notes
- **DO NOT** delete existing data
- All existing data will be migrated to the default company
- New companies can be created after migration

### Phase 3: Backend Changes

#### 3.1 Authentication
- Update JWT payload to include `companyId`
- Update `authenticate` middleware to extract companyId from token
- Update `AuthUser` type to include `companyId`

#### 3.2 Authorization Middleware
- Create new middleware or update existing to enforce company scoping
- Every query must include `where: { companyId: user.companyId }`
- Reject any requests attempting to access other company data

#### 3.3 Service Layer Updates
- Update all service methods to use `user.companyId`
- Ensure no service accepts `companyId` from request body
- Add company validation to all CRUD operations

#### 3.4 Integration Services
- Refactor email service to use per-company EmailIntegration records
- Refactor YouTube service to use per-company YouTubeIntegration records
- Implement credential encryption/decryption

### Phase 4: Frontend Changes

#### 4.1 Auth Context
- Update `AuthUser` type to include `companyId` and `companyName`
- Update `AuthProvider` to store company info

#### 4.2 UI Updates
- Add company name display in header
- Add company selector for platform admins (ADMIN, SUPER_ADMIN)
- Update settings pages to be company-scoped

#### 4.3 API Client
- No changes needed if companyId comes from JWT
- Ensure no manual companyId is sent in requests

### Phase 5: Testing

#### 5.1 Security Tests
1. Company A user cannot access Company B complaints
2. Company A user cannot access Company B users
3. Company A dashboard shows only Company A data
4. Company A notifications are isolated
5. Company A search returns only Company A results
6. Direct URL access with other company IDs is blocked
7. API requests with manipulated companyId are rejected

#### 5.2 Integration Tests
1. Email integration creates complaints with correct companyId
2. YouTube integration creates complaints with correct companyId
3. Per-company credentials are isolated

### Phase 6: Deployment

#### 6.1 Database Migration
- Run Prisma migration in production
- Run data migration script
- Verify data integrity

#### 6.2 Environment Variables
- Deprecate global EMAIL_* variables
- Keep for backward compatibility during transition
- Document migration path for credentials

---

## Risk Assessment

### High Risks
1. **Data Migration**: Large schema change with existing data
   - Mitigation: Comprehensive backup, test migration on staging
2. **Breaking Changes**: Existing API contracts may change
   - Mitigation: Version APIs, maintain backward compatibility where possible
3. **Credential Security**: Moving credentials to database
   - Mitigation: Implement encryption at rest, use AWS KMS or similar

### Medium Risks
1. **Performance**: Additional companyId joins in queries
   - Mitigation: Add proper indexes, monitor query performance
2. **Complexity**: Increased code complexity
   - Mitigation: Comprehensive documentation, code reviews

### Low Risks
1. **User Experience**: Company selection may confuse users
   - Mitigation: Clear UI, default to user's company

---

## Estimated Effort

| Phase | Estimated Effort |
|-------|------------------|
| Phase 1: Schema Changes | 2-3 days |
| Phase 2: Data Migration | 2-3 days |
| Phase 3: Backend Changes | 5-7 days |
| Phase 4: Frontend Changes | 3-4 days |
| Phase 5: Testing | 3-4 days |
| Phase 6: Deployment | 1-2 days |
| **Total** | **16-23 days** |

---

## Next Steps

1. **Review this audit** with stakeholders
2. **Approve implementation plan**
3. **Set up staging environment** for testing
4. **Create database backup** before migration
5. **Begin Phase 1**: Schema changes
6. **Test migration** on staging with copy of production data
7. **Proceed with remaining phases**

---

## Questions for Stakeholders

1. Should we support a "Platform Admin" role that can see all companies?
2. Should companies be able to share certain data (e.g., global categories)?
3. What is the credential encryption strategy (AWS KMS, application-level encryption)?
4. Should we support company subdomains (e.g., company-a.platform.com)?
5. What is the rollback plan if migration fails?
