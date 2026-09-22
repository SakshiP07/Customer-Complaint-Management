# Complaint Management Platform - Complete Overview

## Table of Contents
1. [User Roles and Permissions](#user-roles-and-permissions)
2. [Pages and Their Functions](#pages-and-their-functions)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [How Backend and Frontend Communicate](#how-backend-and-frontend-communicate)
6. [New Features Implemented](#new-features-implemented)
7. [Available Integrations](#available-integrations)

---

## User Roles and Permissions

### 1. CUSTOMER
**Purpose**: End users who submit and track their own complaints

**Permissions**:
- Submit new complaints
- View only their own complaints
- Track complaint status
- View complaint details
- Cannot assign or resolve complaints

**Sidebar Navigation**:
- Dashboard - View complaint summary and status
- My Complaints - List of all their complaints
- New Complaint - Submit a new complaint

---

### 2. AGENT
**Purpose**: Frontline support staff who handle complaints

**Permissions**:
- View all complaints in inbox
- View their assigned complaints
- Assign complaints to themselves
- Update complaint status
- Add comments and messages
- Escalate complaints to managers
- Cannot delete complaints or manage users

**Sidebar Navigation**:
- Dashboard - KPIs and workload overview
- Inbox - All unassigned complaints
- My Complaints - Complaints assigned to them

---

### 3. OPERATIONS_MANAGER
**Purpose**: Team leads managing complaint operations

**Permissions**:
- View all complaints
- Assign complaints to agents
- Escalate complaints
- View analytics and reports
- Manage team workload
- Cannot manage system configuration

**Sidebar Navigation**:
- Dashboard - Team performance metrics
- All Complaints - Complete complaint list
- Analytics - Charts and reports

---

### 4. REGIONAL_MANAGER
**Purpose**: Managers overseeing specific geographic regions

**Permissions**:
- View complaints in their region only
- Assign complaints to regional agents
- View regional analytics
- Manage regional team

**Sidebar Navigation**:
- Dashboard - Regional performance metrics
- All Complaints - Regional complaint list
- Analytics - Regional charts and reports

---

### 5. ADMIN
**Purpose**: System administrators with full access

**Permissions**:
- Full access to all complaints
- Manage users (create, edit, deactivate)
- Manage regions, stores, categories
- Configure SLA policies
- System settings
- View all analytics

**Sidebar Navigation**:
- Dashboard - System-wide metrics
- All Complaints - Complete complaint list
- Users - User management
- Categories - Complaint category management

---

## Pages and Their Functions

### Public Pages (No Login Required)

#### Login Page (`/login`)
- **Purpose**: User authentication
- **Features**: Email/password login, role-based redirect after login
- **Redirects to**: Dashboard based on user role

#### Register Page (`/register`)
- **Purpose**: New customer registration
- **Features**: Name, email, phone, password
- **Creates**: User account with CUSTOMER role and customer profile
- **Redirects to**: Customer dashboard

#### Complaint Submission (`/complaints/new`)
- **Purpose**: Submit new complaints
- **Features**: Form with name, email, phone, region, store, category, description
- **Creates**: New complaint in database
- **Available to**: All logged-in users

---

### Customer Pages

#### Customer Dashboard (`/customer/dashboard`)
- **Purpose**: Overview of customer's complaints
- **Shows**: 
  - Total complaints count
  - Open complaints count
  - Overdue complaints count
  - List of recent complaints with status
- **Data Source**: `/api/v1/complaints` API (filtered by customer)
- **Auto-refresh**: Every 30 seconds

#### Customer Complaints (`/customer/complaints`)
- **Purpose**: Detailed list of all customer complaints
- **Features**: Search, filter by status/priority/category
- **Data Source**: `/api/v1/complaints` API
- **Auto-refresh**: Every 30 seconds

#### Customer Complaint Detail (`/customer/complaints/:id`)
- **Purpose**: View full complaint details
- **Shows**: Complaint info, status history, messages, attachments
- **Data Source**: `/api/v1/complaints/:id` API

---

### Agent Pages

#### Agent Dashboard (`/agent/dashboard`)
- **Purpose**: Agent's personal workload overview
- **Shows**:
  - My open complaints
  - New complaints
  - In progress count
  - Pending count
  - Overdue count
  - Resolved today
  - List of assigned complaints
- **Data Source**: `/api/v1/dashboard/summary` API
- **Auto-refresh**: Every 30 seconds

#### Agent Inbox (`/agent/inbox`)
- **Purpose**: View all unassigned complaints
- **Features**: Search, filter, assign to self
- **Data Source**: `/api/v1/complaints?view=inbox` API
- **Auto-refresh**: Every 30 seconds

#### Agent My Complaints (`/agent/complaints`)
- **Purpose**: View complaints assigned to this agent
- **Features**: Search, filter, update status, add comments
- **Data Source**: `/api/v1/complaints?view=mine` API
- **Auto-refresh**: Every 30 seconds

#### Agent Escalated (`/agent/escalated`)
- **Purpose**: View escalated complaints
- **Features**: List of complaints escalated by this agent
- **Data Source**: `/api/v1/complaints?view=escalated` API

#### Agent Overdue (`/agent/overdue`)
- **Purpose**: View overdue complaints
- **Features**: List of SLA-overdue complaints
- **Data Source**: `/api/v1/complaints?view=overdue` API

#### Agent AI Assistant (`/agent/ai`)
- **Purpose**: AI-powered complaint analysis
- **Features**: AI summary, suggested category, priority, next steps, draft response
- **Data Source**: `/api/v1/ai/analyze` API

---

### Manager Pages (Operations & Regional)

#### Manager Dashboard (`/manager/dashboard` or `/regional/dashboard`)
- **Purpose**: Team performance overview
- **Shows**:
  - Total complaints
  - Open, pending, overdue counts
  - Resolved count
  - Escalated count
  - SLA compliance percentage
  - Average resolution time
  - Complaint trends chart
  - Complaints by channel (pie chart)
  - Complaints by category (bar chart)
  - Complaints by region (bar chart)
  - SLA performance (bar chart)
  - Employee workload (bar chart)
- **Data Source**: `/api/v1/dashboard/summary`, `/api/v1/dashboard/trends`, etc.
- **Auto-refresh**: Every 30 seconds

#### Manager All Complaints (`/manager/complaints` or `/regional/complaints`)
- **Purpose**: View all complaints (regional managers see only their region)
- **Features**: Search, filter, assign, escalate
- **Data Source**: `/api/v1/complaints` API
- **Auto-refresh**: Every 30 seconds

#### Manager Analytics (`/manager/analytics` or `/regional/analytics`)
- **Purpose**: Detailed analytics and reports
- **Features**: Charts, KPIs, trends
- **Data Source**: Various dashboard APIs

---

### Admin Pages

#### Admin Dashboard (`/admin/dashboard`)
- **Purpose**: System-wide overview
- **Shows**: Same as manager dashboard but for entire system
- **Data Source**: `/api/v1/dashboard/summary` API
- **Auto-refresh**: Every 30 seconds

#### Admin All Complaints (`/admin/complaints`)
- **Purpose**: View all complaints in system
- **Features**: Search, filter, assign, escalate, delete
- **Data Source**: `/api/v1/complaints` API
- **Auto-refresh**: Every 30 seconds

#### Admin Users (`/admin/users`)
- **Purpose**: User management
- **Features**: Create, edit, deactivate users, manage roles
- **Data Source**: `/api/v1/users` API

#### Admin Employees (`/admin/employees`)
- **Purpose**: Employee management
- **Features**: Manage agents and managers
- **Data Source**: `/api/v1/users?role=AGENT` API

#### Admin Regions (`/admin/regions`)
- **Purpose**: Region management
- **Features**: Create, edit regions
- **Data Source**: `/api/v1/regions` API

#### Admin Stores (`/admin/stores`)
- **Purpose**: Store management
- **Features**: Create, edit stores
- **Data Source**: `/api/v1/stores` API

#### Admin Categories (`/admin/categories`)
- **Purpose**: Complaint category management
- **Features**: Create, edit categories
- **Data Source**: `/api/v1/categories` API

#### Admin SLA Policies (`/admin/sla`)
- **Purpose**: SLA configuration
- **Features**: Set SLA rules by priority/category
- **Data Source**: `/api/v1/sla` API

---

## Backend Architecture

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **API Style**: RESTful

### Project Structure
```
backend/
├── src/
│   ├── app.ts              # Express app configuration
│   ├── server.ts           # Server entry point
│   ├── config/             # Configuration files
│   │   ├── env.ts          # Environment variables
│   │   └── prisma.ts       # Database client
│   ├── controllers/        # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── complaint.controller.ts
│   │   └── admin.controller.ts
│   ├── services/           # Business logic
│   │   ├── auth.service.ts
│   │   ├── complaint.service.ts
│   │   └── notification.service.ts
│   ├── routes/             # API route definitions
│   │   ├── auth.routes.ts
│   │   ├── complaint.routes.ts
│   │   └── admin.routes.ts
│   ├── middleware/         # Express middleware
│   │   ├── auth.ts         # JWT verification
│   │   └── rbac.ts         # Role-based access control
│   ├── integrations/       # External integrations
│   │   └── channels/       # Complaint channel adapters
│   │       ├── adapters.ts # Channel adapters
│   │       ├── email.service.ts
│   │       └── youtube.service.ts
│   ├── jobs/               # Scheduled tasks
│   │   └── slaMonitor.ts   # SLA monitoring
│   └── utils/              # Utility functions
│       └── logger.ts
└── prisma/
    └── schema.prisma       # Database schema
```

### Key Backend Components

#### 1. Authentication System
- **File**: `src/services/auth.service.ts`
- **Purpose**: Handle user registration, login, token generation
- **Features**:
  - Password hashing with bcrypt
  - JWT access and refresh tokens
  - Role-based access control
  - Session management

#### 2. Complaint Service
- **File**: `src/services/complaint.service.ts`
- **Purpose**: Core complaint business logic
- **Features**:
  - Create complaints from various sources
  - Assign complaints to agents
  - Update complaint status
  - Escalate complaints
  - Add comments and messages
  - Track history
  - Apply SLA policies

#### 3. Notification Service
- **File**: `src/services/notification.service.ts`
- **Purpose**: Send notifications to users
- **Features**:
  - In-app notifications
  - Email notifications (stub)
  - SMS notifications (stub)
  - Notification channels
  - Mark as read/unread

#### 4. Channel Adapters
- **File**: `src/integrations/channels/adapters.ts`
- **Purpose**: Normalize complaints from different sources
- **Adapters**:
  - WebsiteChannelAdapter - Web form submissions
  - EmailChannelAdapter - Email to complaints
  - YouTubeChannelAdapter - YouTube comments to complaints
  - Stub adapters for Instagram, WhatsApp, Facebook, X, Google Reviews

#### 5. Email Polling Service
- **File**: `src/integrations/channels/email.service.ts`
- **Purpose**: Fetch emails from IMAP and convert to complaints
- **Features**:
  - IMAP connection
  - Poll every 5 minutes
  - Parse emails
  - Create customer profiles
  - Create complaints

#### 6. YouTube Polling Service
- **File**: `src/integrations/channels/youtube.service.ts`
- **Purpose**: Fetch YouTube comments and convert to complaints
- **Features**:
  - YouTube Data API v3
  - Poll every 10 minutes
  - Fetch videos from channels
  - Fetch comments from videos
  - Create complaints from comments

#### 7. SLA Monitor
- **File**: `src/jobs/slaMonitor.ts`
- **Purpose**: Monitor SLA compliance and update statuses
- **Features**:
  - Check overdue complaints
  - Update SLA status (ON_TRACK, APPROACHING, OVERDUE)
  - Run every minute

### API Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new customer
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

#### Complaints
- `GET /api/v1/complaints` - List complaints (with filters)
- `POST /api/v1/complaints` - Create complaint
- `GET /api/v1/complaints/:id` - Get complaint details
- `PATCH /api/v1/complaints/:id` - Update complaint
- `POST /api/v1/complaints/:id/assign` - Assign to agent
- `POST /api/v1/complaints/:id/status` - Update status
- `POST /api/v1/complaints/:id/escalate` - Escalate complaint
- `POST /api/v1/complaints/:id/resolve` - Resolve complaint
- `POST /api/v1/complaints/:id/comments` - Add comment
- `POST /api/v1/complaints/:id/messages` - Add message
- `GET /api/v1/complaints/:id/history` - Get history
- `GET /api/v1/complaints/:id/attachments` - Get attachments

#### Dashboard
- `GET /api/v1/dashboard/summary` - Dashboard summary stats
- `GET /api/v1/dashboard/trends` - Complaint trends
- `GET /api/v1/dashboard/by-channel` - Complaints by channel
- `GET /api/v1/dashboard/by-category` - Complaints by category
- `GET /api/v1/dashboard/by-region` - Complaints by region
- `GET /api/v1/dashboard/sla` - SLA performance

#### Admin
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `GET /api/v1/regions` - List regions
- `POST /api/v1/regions` - Create region
- `GET /api/v1/stores` - List stores
- `POST /api/v1/stores` - Create store
- `GET /api/v1/categories` - List categories
- `POST /api/v1/categories` - Create category
- `GET /api/v1/notifications` - List notifications
- `POST /api/v1/notifications/:id/read` - Mark as read

---

## Frontend Architecture

### Technology Stack
- **Framework**: React with TypeScript
- **Routing**: React Router v6
- **State Management**: React Context (Auth), TanStack Query (API data)
- **UI Components**: Custom components with Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios

### Project Structure
```
frontend/
├── src/
│   ├── main.tsx            # App entry point
│   ├── App.tsx             # Root component with router
│   ├── api/                # API client
│   │   └── client.ts       # Axios configuration
│   ├── auth/               # Authentication
│   │   └── AuthProvider.tsx # Auth context
│   ├── components/         # Reusable components
│   │   ├── layout/         # Layout components
│   │   │   └── AppShell.tsx # Sidebar + header
│   │   ├── ui/             # UI primitives
│   │   │   └── Primitives.tsx # Buttons, cards, inputs
│   │   ├── complaints/     # Complaint components
│   │   │   ├── ComplaintTable.tsx
│   │   │   └── ComplaintDetail.tsx
│   │   └── dashboard/     # Dashboard components
│   │       └── DashboardCharts.tsx
│   ├── pages/              # Page components
│   │   ├── public/         # Public pages
│   │   │   └── AuthPages.tsx
│   │   └── workspace/     # Protected pages
│   │       └── WorkspacePages.tsx
│   ├── hooks/              # Custom React hooks
│   │   └── useLookups.ts   # Lookup data hook
│   └── lib/                # Utilities
│       └── utils.ts        # Helper functions
```

### Key Frontend Components

#### 1. AppShell
- **File**: `src/components/layout/AppShell.tsx`
- **Purpose**: Main layout with sidebar and header
- **Features**:
  - Sticky sidebar (224px width)
  - Sticky header with search
  - Notification bell with badge
  - Role-based navigation
  - Profile and logout at sidebar bottom

#### 2. ComplaintTable
- **File**: `src/components/complaints/ComplaintTable.tsx`
-- **Purpose**: Display complaints in table format
- **Features**:
  - Search functionality
  - Filter by status, priority, category
  - Pagination
  - Auto-refresh every 30 seconds
  - Click to view details

#### 3. DashboardCharts
- **File**: `src/components/dashboard/DashboardCharts.tsx`
- **Purpose**: Display dashboard analytics
- **Features**:
  - KPI cards
  - Line chart (trends)
  - Pie chart (by channel)
  - Bar charts (by category, region, SLA)
  - Employee workload chart
  - Auto-refresh every 30 seconds

#### 4. AuthProvider
- **File**: `src/auth/AuthProvider.tsx`
- **Purpose**: Authentication context
- **Features**:
  - Login/logout functions
  - User state management
  - JWT token storage
  - Protected route wrapper

---

## How Backend and Frontend Communicate

### Authentication Flow
1. User enters credentials on login page
2. Frontend sends `POST /api/v1/auth/login` to backend
3. Backend validates credentials and returns JWT tokens
4. Frontend stores tokens in localStorage
5. Frontend includes access token in Authorization header for all requests
6. Backend verifies token on protected routes
7. When token expires, frontend uses refresh token to get new access token

### Data Fetching Flow
1. Frontend uses TanStack Query (`useQuery`) to fetch data
2. Query calls API client with endpoint
3. API client adds Authorization header
4. Request sent to backend
5. Backend verifies auth, executes business logic
6. Backend queries PostgreSQL via Prisma
7. Backend returns JSON response
8. Frontend caches response and renders UI
9. Auto-refresh re-fetches data every 30 seconds

### Complaint Creation Flow
1. User fills complaint form
2. Frontend sends `POST /api/v1/complaints` with form data
3. Backend validates input
4. Backend creates/updates customer profile
5. Backend generates complaint number
6. Backend creates complaint in database
7. Backend applies SLA policy
8. Backend creates conversation message
9. Backend dispatches notifications to agents/managers
10. Backend returns created complaint
11. Frontend updates UI with new complaint

### Notification Flow
1. Backend dispatches notification on complaint creation
2. Notification stored in database
3. Frontend polls `/api/v1/notifications` every 30 seconds
4. Frontend displays unread count in header
5. User clicks notification bell
6. Frontend shows notification list
7. User marks notification as read
8. Frontend sends `POST /api/v1/notifications/:id/read`
9. Backend updates database
10. Frontend updates UI

---

## New Features Implemented

### 1. Email Integration (FREE)
- **What**: Automatic complaint ingestion from emails
- **How**: IMAP polling every 5 minutes
- **Files**: `backend/src/integrations/channels/email.service.ts`
- **Setup**: See `docs/email-integration.md`
- **Environment**: EMAIL_USER, EMAIL_PASSWORD, EMAIL_IMAP_HOST, EMAIL_IMAP_PORT, EMAIL_TLS

### 2. YouTube Integration (FREE)
- **What**: Automatic complaint ingestion from YouTube comments
- **How**: YouTube Data API v3 polling every 10 minutes
- **Files**: `backend/src/integrations/channels/youtube.service.ts`
- **Setup**: See `docs/youtube-integration.md`
- **Environment**: YOUTUBE_API_KEY, YOUTUBE_CHANNEL_IDS, YOUTUBE_POLLING_INTERVAL_MINUTES

### 3. Auto-Refresh
- **What**: Data automatically updates without page refresh
- **Where**: Complaint tables, dashboards, notifications
- **Interval**: Every 30 seconds
- **Implementation**: TanStack Query `refetchInterval` option

### 4. Search Functionality
- **What**: Global search bar in header
- **How**: Navigates to complaint list with search query
- **Role-based**: Routes to appropriate complaint page based on user role
- **Implementation**: Search input in AppShell header

### 5. Sticky Sidebar
- **What**: Sidebar stays visible while scrolling
- **Width**: 224px (smaller than before)
- **Scrollable**: Sidebar has its own scroll if content overflows
- **Implementation**: CSS `sticky top-0` and `overflow-y-auto`

### 6. Simplified Navigation
- **What**: Reduced sidebar items to essentials only
- **Customer**: Dashboard, My Complaints, New Complaint
- **Agent**: Dashboard, Inbox, My Complaints
- **Manager**: Dashboard, All Complaints, Analytics
- **Admin**: Dashboard, All Complaints, Users, Categories

### 7. Improved Dashboard Charts
- **What**: Clear titles and explanations for each chart
- **Titles**: "Complaint Trends Over Time", "Complaints by Channel", etc.
- **Subtitles**: Brief explanation of what each chart shows
- **Spacing**: Better spacing between sections

### 8. Notification System
- **What**: In-app notifications for new complaints
- **Recipients**: Agents and managers notified on new complaint creation
- **Display**: Badge count in header, notification list
- **Polling**: Every 30 seconds

### 9. Improved UI/UX
- **What**: Softer, more professional appearance
- **Changes**: 
  - Reduced verbose text
  - Cleaner layouts
  - Better spacing
  - Smaller sidebar
  - Sticky header
  - Professional color scheme

---

## Available Integrations

### Currently Working (Live)
1. **Website** - Web form submissions (always active)
2. **Email** - IMAP email polling (requires configuration)
3. **YouTube** - YouTube Data API comments (requires configuration)

### Stub Integrations (Not Configured)
These are placeholders for future implementation:
- Instagram
- WhatsApp
- Facebook
- X (Twitter)
- Google Reviews
- Customer Service

To enable stub integrations, you would need to:
1. Create adapter class in `adapters.ts`
2. Create polling service similar to email/youtube
3. Add environment variables for API credentials
4. Add to channelAdapters registry

---

## Data Flow Summary

```
User Action → Frontend Component → API Client → Backend Controller → Service → Prisma → Database
                                                                 ↓
                                                         Notification Service → Database
                                                                 ↓
                                                         Frontend Polling → UI Update
```

### Example: Customer Submits Complaint
1. Customer fills form → ComplaintForm component
2. Form submit → api.post('/complaints')
3. Backend → complaintController.create
4. Service → complaintService.createFromWebsite
5. Prisma → Create customer, complaint, history, message
6. Notification → Dispatch to agents/managers
7. Response → Frontend shows success
8. Agent dashboard → Auto-refresh shows new complaint
9. Agent inbox → Auto-refresh shows new complaint
10. Agent notification → Badge count increases
