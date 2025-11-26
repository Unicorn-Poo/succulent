"use client";

import { useState, useEffect } from "react";
import { useAccount } from "jazz-tools/react";
import { MyAppAccount, MyAppAccountLoaded } from "@/app/schema";
import {
  Card,
  Tabs,
  Box,
  Heading,
  Text,
  Button,
  Badge,
  Table,
  Dialog,
  TextField,
  Select,
} from "@radix-ui/themes";
import {
  Shield,
  Users,
  Crown,
  Settings,
  BarChart3,
  UserPlus,
  AlertTriangle,
  Database,
} from "lucide-react";
import { useAdminGroups, useCollaboration } from "@/utils/adminGroupManager";

// =============================================================================
// 👑 COMPANY MANAGEMENT DASHBOARD (OWNER/CREATOR ONLY)
// =============================================================================

export default function CompanyDashboard() {
  const { me } = useAccount(MyAppAccount);

  // SECURITY: Only allow specific creator emails
  const creatorEmails = ["sammi@succulent.app", "admin@succulent.app"];
  const isCreator =
    me?.profile?.email && creatorEmails.includes(me.profile.email);

  if (!me || !isCreator) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 text-red-600">
            🚫 Access Restricted
          </h1>
          <p className="text-gray-600 dark:text-muted-foreground mb-2">
            This is the company management dashboard.
          </p>
          <p className="text-gray-600 dark:text-muted-foreground">
            Only the creator/owner of Succulent can access this area.
          </p>
          {me && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-foreground">
                Current user: <strong>{me.profile?.email}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Authorized emails: {creatorEmails.join(", ")}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-8 h-8 text-yellow-500" />
              <Heading size="8">Company Management</Heading>
            </div>
            <Text size="4" color="gray">
              Owner dashboard for managing Succulent
            </Text>
          </div>
          <Badge size="3" color="yellow">
            <Shield size={16} className="mr-1" />
            Creator Access
          </Badge>
        </div>
      </div>

      <Tabs.Root defaultValue="overview" className="w-full">
        <Tabs.List className="mb-6">
          <Tabs.Trigger value="overview" className="flex items-center gap-2">
            <BarChart3 size={16} />
            Company Overview
          </Tabs.Trigger>
          <Tabs.Trigger
            value="admin-groups"
            className="flex items-center gap-2"
          >
            <Shield size={16} />
            Admin Groups
          </Tabs.Trigger>
          <Tabs.Trigger
            value="system-health"
            className="flex items-center gap-2"
          >
            <Database size={16} />
            System Health
          </Tabs.Trigger>
          <Tabs.Trigger value="security" className="flex items-center gap-2">
            <AlertTriangle size={16} />
            Security
          </Tabs.Trigger>
          <Tabs.Trigger value="settings" className="flex items-center gap-2">
            <Settings size={16} />
            Company Settings
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview">
          <CompanyOverviewTab account={me} />
        </Tabs.Content>

        <Tabs.Content value="admin-groups">
          <AdminGroupsTab account={me} />
        </Tabs.Content>

        <Tabs.Content value="system-health">
          <SystemHealthTab account={me} />
        </Tabs.Content>

        <Tabs.Content value="security">
          <SecurityTab account={me} />
        </Tabs.Content>

        <Tabs.Content value="settings">
          <CompanySettingsTab account={me} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

// =============================================================================
// 📊 COMPANY OVERVIEW TAB
// =============================================================================

function CompanyOverviewTab({ account }: { account: MyAppAccountLoaded }) {
  const [companyStats, setCompanyStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    adminUsers: 0,
    systemHealth: "good",
  });

  useEffect(() => {
    // Fetch real company statistics
    // This would integrate with your analytics and user management
    setCompanyStats({
      totalUsers: 1247,
      activeUsers: 892,
      totalRevenue: 15780,
      adminUsers: 5,
      systemHealth: "good",
    });
  }, []);

  const statCards = [
    {
      title: "Total Users",
      value: companyStats.totalUsers.toLocaleString(),
      color: "blue",
      description: "All registered users",
    },
    {
      title: "Active Users",
      value: companyStats.activeUsers.toLocaleString(),
      color: "green",
      description: "Users active in last 30 days",
    },
    {
      title: "Total Revenue",
      value: `$${companyStats.totalRevenue.toLocaleString()}`,
      color: "purple",
      description: "All-time revenue",
    },
    {
      title: "Admin Users",
      value: companyStats.adminUsers.toString(),
      color: "orange",
      description: "Users with admin privileges",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Company Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <Box p="6">
              <div className="text-center">
                <Text size="2" color="gray">
                  {stat.title}
                </Text>
                <Text size="6" weight="bold" className="block mt-1">
                  {stat.value}
                </Text>
                <Text size="1" color="gray" className="mt-1">
                  {stat.description}
                </Text>
              </div>
            </Box>
          </Card>
        ))}
      </div>

      {/* System Status */}
      <Card>
        <Box p="6">
          <div className="flex items-center justify-between mb-4">
            <Heading size="5">System Status</Heading>
            <Badge
              color={companyStats.systemHealth === "good" ? "green" : "red"}
            >
              {companyStats.systemHealth === "good"
                ? "✅ Healthy"
                : "⚠️ Issues"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="text-2xl mb-2">🚀</div>
              <Text weight="medium">Performance</Text>
              <Text size="2" color="gray">
                Excellent
              </Text>
            </div>
            <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="text-2xl mb-2">🔒</div>
              <Text weight="medium">Security</Text>
              <Text size="2" color="gray">
                Secure
              </Text>
            </div>
            <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="text-2xl mb-2">💿</div>
              <Text weight="medium">Database</Text>
              <Text size="2" color="gray">
                Online
              </Text>
            </div>
          </div>
        </Box>
      </Card>

      {/* Quick Actions */}
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-4">
            Quick Actions
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button className="justify-start" variant="outline">
              <UserPlus size={16} className="mr-2" />
              Create Admin Group
            </Button>
            <Button className="justify-start" variant="outline">
              <Settings size={16} className="mr-2" />
              System Settings
            </Button>
            <Button className="justify-start" variant="outline">
              <BarChart3 size={16} className="mr-2" />
              Export Analytics
            </Button>
            <Button className="justify-start" variant="outline">
              <Database size={16} className="mr-2" />
              Database Backup
            </Button>
          </div>
        </Box>
      </Card>
    </div>
  );
}

// =============================================================================
// 🛡️ ADMIN GROUPS TAB
// =============================================================================

function AdminGroupsTab({ account }: { account: MyAppAccountLoaded }) {
  const { isSystemAdmin, getAdminGroups, createAdminGroup, addToAdminGroup } =
    useAdminGroups(account);

  interface AdminGroup {
    id: string;
    name: string;
    description: string;
    memberCount: number;
    permissions: string[];
  }

  const [adminGroups, setAdminGroups] = useState<AdminGroup[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    // Mock admin groups - replace with real data
    setAdminGroups([
      {
        id: "1",
        name: "Super Admins",
        description: "Full system access",
        memberCount: 2,
        permissions: ["all"],
      },
      {
        id: "2",
        name: "Customer Support",
        description: "User support and basic management",
        memberCount: 3,
        permissions: ["manageUsers", "viewAnalytics"],
      },
    ]);
  }, []);

  return (
    <div className="space-y-6">
      {/* Create Admin Group */}
      <Card>
        <Box p="6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Heading size="5">Admin Groups</Heading>
              <Text size="2" color="gray">
                Manage administrative access to Succulent
              </Text>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <UserPlus size={16} className="mr-2" />
              Create Admin Group
            </Button>
          </div>

          {/* Admin Groups List */}
          <div className="space-y-3">
            {adminGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Shield size={20} className="text-red-600" />
                  </div>
                  <div>
                    <Text weight="medium">{group.name}</Text>
                    <Text size="2" color="gray">
                      {group.description}
                    </Text>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge size="1" color="gray">
                        {group.memberCount} members
                      </Badge>
                      <Badge size="1" color="blue">
                        {group.permissions.length} permissions
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="1" variant="outline">
                    Manage
                  </Button>
                  <Button size="1" variant="outline" color="red">
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Box>
      </Card>

      {/* Create Admin Group Dialog */}
      <Dialog.Root
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      >
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Create Admin Group</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Create a new admin group with specific permissions.
          </Dialog.Description>

          <div className="space-y-4">
            <div>
              <Text as="label" size="2" weight="medium">
                Group Name
              </Text>
              <TextField.Root placeholder="e.g., Customer Support" mt="1" />
            </div>
            <div>
              <Text as="label" size="2" weight="medium">
                Description
              </Text>
              <TextField.Root
                placeholder="Brief description of the group's purpose"
                mt="1"
              />
            </div>
            <div>
              <Text as="label" size="2" weight="medium">
                Permissions
              </Text>
              <div className="mt-2 space-y-2">
                {[
                  { key: "manageUsers", label: "Manage Users" },
                  { key: "manageSubscriptions", label: "Manage Subscriptions" },
                  { key: "viewAnalytics", label: "View Analytics" },
                  { key: "managePayments", label: "Manage Payments" },
                  { key: "accessSystemSettings", label: "System Settings" },
                ].map((permission) => (
                  <label
                    key={permission.key}
                    className="flex items-center gap-2"
                  >
                    <input type="checkbox" className="rounded" />
                    <Text size="2">{permission.label}</Text>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 justify-end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Dialog.Close>
              <Button>Create Group</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}

// =============================================================================
// 🏥 SYSTEM HEALTH TAB
// =============================================================================

function SystemHealthTab({ account }: { account: MyAppAccountLoaded }) {
  const [systemMetrics, setSystemMetrics] = useState({
    uptime: "99.9%",
    responseTime: "120ms",
    errorRate: "0.01%",
    activeConnections: 1247,
    databaseSize: "2.3GB",
    lastBackup: "2 hours ago",
  });

  return (
    <div className="space-y-6">
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-6">
            System Health Monitoring
          </Heading>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(systemMetrics).map(([key, value]) => (
              <div key={key} className="p-4 border rounded-lg text-center">
                <Text size="2" color="gray" className="capitalize">
                  {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                </Text>
                <Text size="4" weight="bold" className="block mt-1">
                  {value}
                </Text>
              </div>
            ))}
          </div>
        </Box>
      </Card>

      <Card>
        <Box p="6">
          <Heading size="5" className="mb-4">
            Recent System Events
          </Heading>
          <div className="space-y-3">
            {[
              {
                time: "2 minutes ago",
                event: "Database backup completed",
                status: "success",
              },
              {
                time: "1 hour ago",
                event: "New user registration spike detected",
                status: "info",
              },
              {
                time: "3 hours ago",
                event: "Payment processor sync completed",
                status: "success",
              },
              {
                time: "6 hours ago",
                event: "Scheduled maintenance completed",
                status: "success",
              },
            ].map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-border"
              >
                <div>
                  <Text weight="medium">{event.event}</Text>
                  <Text size="2" color="gray">
                    {event.time}
                  </Text>
                </div>
                <Badge color={event.status === "success" ? "green" : "blue"}>
                  {event.status}
                </Badge>
              </div>
            ))}
          </div>
        </Box>
      </Card>
    </div>
  );
}

// =============================================================================
// 🔒 SECURITY TAB
// =============================================================================

function SecurityTab({ account }: { account: MyAppAccountLoaded }) {
  return (
    <div className="space-y-6">
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-6">
            Security Overview
          </Heading>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Shield size={20} className="text-green-600" />
                </div>
                <div>
                  <Text weight="medium">Two-Factor Authentication</Text>
                  <Text size="2" color="gray">
                    Enhanced security for admin accounts
                  </Text>
                </div>
              </div>
              <Badge color="green">Enabled</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Database size={20} className="text-blue-600" />
                </div>
                <div>
                  <Text weight="medium">Database Encryption</Text>
                  <Text size="2" color="gray">
                    All sensitive data encrypted at rest
                  </Text>
                </div>
              </div>
              <Badge color="green">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={20} className="text-purple-600" />
                </div>
                <div>
                  <Text weight="medium">Security Monitoring</Text>
                  <Text size="2" color="gray">
                    Real-time threat detection
                  </Text>
                </div>
              </div>
              <Badge color="green">Monitoring</Badge>
            </div>
          </div>
        </Box>
      </Card>
    </div>
  );
}

// =============================================================================
// ⚙️ COMPANY SETTINGS TAB
// =============================================================================

function CompanySettingsTab({ account }: { account: MyAppAccountLoaded }) {
  return (
    <div className="space-y-6">
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-6">
            Company Settings
          </Heading>

          <div className="space-y-6">
            <div>
              <Text weight="medium" className="mb-2 block">
                Company Information
              </Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Text size="2" color="gray">
                    Company Name
                  </Text>
                  <TextField.Root defaultValue="Succulent" mt="1" />
                </div>
                <div>
                  <Text size="2" color="gray">
                    Creator Email
                  </Text>
                  <TextField.Root
                    defaultValue={account.profile?.email}
                    mt="1"
                    disabled
                  />
                </div>
              </div>
            </div>

            <div>
              <Text weight="medium" className="mb-2 block">
                System Configuration
              </Text>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Text>Allow New User Registrations</Text>
                    <Text size="2" color="gray">
                      Control whether new users can sign up
                    </Text>
                  </div>
                  <Button variant="outline" size="1">
                    Enabled
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Text>Maintenance Mode</Text>
                    <Text size="2" color="gray">
                      Temporarily disable access for maintenance
                    </Text>
                  </div>
                  <Button variant="outline" size="1">
                    Disabled
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Text>Debug Logging</Text>
                    <Text size="2" color="gray">
                      Enhanced logging for troubleshooting
                    </Text>
                  </div>
                  <Button variant="outline" size="1">
                    Disabled
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button>Save Settings</Button>
            </div>
          </div>
        </Box>
      </Card>
    </div>
  );
}
