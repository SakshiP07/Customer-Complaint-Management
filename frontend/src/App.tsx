import { Navigate, Route, Routes } from "react-router-dom";
import { GuestOnly, Protected } from "./routes/guards";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage, RegisterPage } from "./pages/public/AuthPages";
import { NewComplaintPage, TrackComplaintPage } from "./pages/public/ComplaintPages";
import {
  AgentDashboard,
  AgentPerformancePage,
  AiAssistantPage,
  ComplaintDetailPage,
  ComplaintsListPage,
  CustomerDashboard,
  EmployeePerformancePage,
  EmployeesPage,
  ManagerDashboard,
  NotificationsPage,
  ProfilePage,
  RecurringIssuesPage,
  RegionalDashboard,
  ReportsPage,
  SlaMonitoringPage,
} from "./pages/workspace/WorkspacePages";
import {
  AdminDashboard,
  AuditPage,
  CategoriesPage,
  ChannelsPage,
  RegionsPage,
  SettingsPage,
  SlaPage,
  StoresPage,
  UsersPage,
} from "./pages/admin/AdminPages";

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/complaints/new" element={<NewComplaintPage />} />
      <Route path="/complaints/track" element={<TrackComplaintPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />

      <Route element={<Protected roles={["CUSTOMER"]} />}>
        <Route element={<AppShell />}>
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/customer/complaints" element={<ComplaintsListPage title="My complaints" base="/customer/complaints" />} />
          <Route path="/customer/complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="/customer/notifications" element={<NotificationsPage />} />
          <Route path="/customer/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<Protected roles={["AGENT"]} />}>
        <Route element={<AppShell />}>
          <Route path="/agent/dashboard" element={<AgentDashboard />} />
          <Route path="/agent/inbox" element={<ComplaintsListPage title="Central Complaint Inbox" base="/agent/inbox" view="inbox" />} />
          <Route path="/agent/inbox/:id" element={<ComplaintDetailPage />} />
          <Route path="/agent/complaints" element={<ComplaintsListPage title="My Complaints" base="/agent/complaints" view="mine" />} />
          <Route path="/agent/complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="/agent/escalated" element={<ComplaintsListPage title="Escalated" base="/agent/escalated" view="escalated" />} />
          <Route path="/agent/escalated/:id" element={<ComplaintDetailPage />} />
          <Route path="/agent/overdue" element={<ComplaintsListPage title="Overdue" base="/agent/overdue" view="overdue" />} />
          <Route path="/agent/overdue/:id" element={<ComplaintDetailPage />} />
          <Route path="/agent/ai" element={<AiAssistantPage />} />
          <Route path="/agent/notifications" element={<NotificationsPage />} />
          <Route path="/agent/performance" element={<AgentPerformancePage />} />
          <Route path="/agent/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<Protected roles={["OPERATIONS_MANAGER"]} />}>
        <Route element={<AppShell />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/complaints" element={<ComplaintsListPage title="All Complaints" base="/manager/complaints" view="inbox" />} />
          <Route path="/manager/complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="/manager/employees" element={<EmployeesPage />} />
          <Route path="/manager/employees/:id" element={<EmployeePerformancePage />} />
          <Route path="/manager/escalations" element={<ComplaintsListPage title="Escalations" base="/manager/escalations" view="escalated" />} />
          <Route path="/manager/escalations/:id" element={<ComplaintDetailPage />} />
          <Route path="/manager/sla" element={<SlaMonitoringPage />} />
          <Route path="/manager/recurring-issues" element={<RecurringIssuesPage />} />
          <Route path="/manager/reports" element={<ReportsPage />} />
          <Route path="/manager/audit-logs" element={<AuditPage path="/analytics/audit-logs" />} />
          <Route path="/manager/notifications" element={<NotificationsPage />} />
          <Route path="/manager/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<Protected roles={["REGIONAL_MANAGER"]} />}>
        <Route element={<AppShell />}>
          <Route path="/regional/dashboard" element={<RegionalDashboard />} />
          <Route path="/regional/complaints" element={<ComplaintsListPage title="Regional complaints" base="/regional/complaints" view="inbox" />} />
          <Route path="/regional/complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="/regional/employees" element={<EmployeesPage />} />
          <Route path="/regional/employees/:id" element={<EmployeePerformancePage />} />
          <Route path="/regional/escalations" element={<ComplaintsListPage title="Escalations" base="/regional/escalations" view="escalated" />} />
          <Route path="/regional/escalations/:id" element={<ComplaintDetailPage />} />
          <Route path="/regional/sla" element={<SlaMonitoringPage />} />
          <Route path="/regional/analytics" element={<RegionalDashboard />} />
          <Route path="/regional/recurring-issues" element={<RecurringIssuesPage />} />
          <Route path="/regional/notifications" element={<NotificationsPage />} />
          <Route path="/regional/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<Protected roles={["ADMIN", "SUPER_ADMIN"]} />}>
        <Route element={<AppShell />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/complaints" element={<ComplaintsListPage title="All Complaints" base="/admin/complaints" view="inbox" />} />
          <Route path="/admin/complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/employees" element={<EmployeesPage />} />
          <Route path="/admin/employees/:id" element={<EmployeePerformancePage />} />
          <Route path="/admin/regions" element={<RegionsPage />} />
          <Route path="/admin/stores" element={<StoresPage />} />
          <Route path="/admin/categories" element={<CategoriesPage />} />
          <Route path="/admin/channels" element={<ChannelsPage />} />
          <Route path="/admin/sla" element={<SlaPage />} />
          <Route path="/admin/audit-logs" element={<AuditPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="/admin/notifications" element={<NotificationsPage />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
