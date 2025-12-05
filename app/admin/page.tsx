"use client";

import { useState, useEffect, useCallback } from "react";
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
  Users,
  CreditCard,
  Settings,
  BarChart3,
  Shield,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
} from "lucide-react";
import { useAccount } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";
import { PLAN_DEFINITIONS, formatPrice } from "@/utils/subscriptionManager";

// =============================================================================
// 🔐 ADMIN DASHBOARD
// =============================================================================

export default function AdminDashboard() {
  const { me } = useAccount(MyAppAccount);

  // Check if user is admin (you would implement proper admin auth)
  const isAdmin = true; // Replace with actual admin check

  if (!me || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading size="8" className="mb-2">
              Admin Dashboard
            </Heading>
            <Text size="4" color="gray">
              Manage users, subscriptions, and payments
            </Text>
          </div>
          <Badge size="2" color="red">
            <Shield size={14} className="mr-1" />
            Admin Access
          </Badge>
        </div>
      </div>

      <Tabs.Root defaultValue="overview" className="w-full">
        <Tabs.List className="mb-6">
          <Tabs.Trigger value="overview" className="flex items-center gap-2">
            <BarChart3 size={16} />
            Overview
          </Tabs.Trigger>
          <Tabs.Trigger value="users" className="flex items-center gap-2">
            <Users size={16} />
            Users
          </Tabs.Trigger>
          <Tabs.Trigger
            value="subscriptions"
            className="flex items-center gap-2"
          >
            <CreditCard size={16} />
            Subscriptions
          </Tabs.Trigger>
          <Tabs.Trigger value="payments" className="flex items-center gap-2">
            <CreditCard size={16} />
            Payments
          </Tabs.Trigger>
          <Tabs.Trigger value="settings" className="flex items-center gap-2">
            <Settings size={16} />
            Settings
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview">
          <OverviewTab />
        </Tabs.Content>

        <Tabs.Content value="users">
          <UsersTab />
        </Tabs.Content>

        <Tabs.Content value="subscriptions">
          <SubscriptionsTab />
        </Tabs.Content>

        <Tabs.Content value="payments">
          <PaymentsTab />
        </Tabs.Content>

        <Tabs.Content value="settings">
          <AdminSettingsTab />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

// =============================================================================
// 📊 OVERVIEW TAB
// =============================================================================

function OverviewTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-4">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="p-4">Error loading statistics</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-muted-foreground">
            Total Users
          </h3>
          <p className="text-2xl font-bold">{stats.overview.totalUsers}</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-muted-foreground">
            Active Subscriptions
          </h3>
          <p className="text-2xl font-bold">
            {stats.overview.activeSubscriptions}
          </p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-muted-foreground">
            Monthly Revenue
          </h3>
          <p className="text-2xl font-bold">${stats.overview.monthlyRevenue}</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-muted-foreground">
            Churn Rate
          </h3>
          <p className="text-2xl font-bold">{stats.overview.churnRate}%</p>
        </div>
      </div>

      {/* Subscription Breakdown */}
      <div className="bg-card p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Subscription Breakdown</h3>
        <div className="space-y-2">
          {Object.entries(stats.subscriptions).map(([tier, count]) => (
            <div key={tier} className="flex justify-between">
              <span className="capitalize">{tier}</span>
              <span className="font-medium text-foreground">
                {String(count)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
        <div className="space-y-2">
          {stats.recentActivity.map(
            (
              activity: { user: string; action: string; time: string },
              index: number
            ) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <span className="font-medium text-foreground">
                    {activity.user}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {activity.action}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {activity.time}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* System Stats */}
      <div className="bg-card p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">System Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Storage Used</p>
            <p className="text-lg font-medium">
              {stats.systemStats.totalStorageUsed} MB
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Monthly Posts</p>
            <p className="text-lg font-medium">
              {stats.systemStats.monthlyPosts}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">API Calls</p>
            <p className="text-lg font-medium">{stats.systemStats.apiCalls}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Uptime</p>
            <p className="text-lg font-medium">{stats.systemStats.uptime}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 👥 USERS TAB
// =============================================================================

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    tier: "free",
    status: "active",
    reason: "",
  });

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/users?search=${searchTerm}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      tier: user.tier || "free",
      status: user.status || "active",
      reason: "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...editFormData,
          adminId: "current-admin-id", // You'd get this from your auth context
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(
          users.map((user) =>
            user.id === selectedUser.id
              ? { ...user, ...updatedUser.user }
              : user
          )
        );
        setEditDialogOpen(false);
        setSelectedUser(null);
      } else {
        console.error("Failed to update user");
      }
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setUsers(users.filter((user) => user.id !== userId));
      } else {
        console.error("Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-card p-4 rounded-lg shadow">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-input rounded-md"
        />
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-foreground">
                        {user.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.tier === "free"
                          ? "bg-muted text-foreground"
                          : user.tier === "premium"
                          ? "bg-brand-mint/20 dark:bg-brand-seafoam/30 text-brand-seafoam dark:text-brand-mint"
                          : user.tier === "business"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          : "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                      }`}
                    >
                      {user.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.status === "active"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          : user.status === "canceled"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                          : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {user.created}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-brand-seafoam hover:text-brand-seafoam mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Dialog */}
      {editDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Edit User</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full p-2 border border-input rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  className="w-full p-2 border border-input rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Subscription Tier
                </label>
                <select
                  value={editFormData.tier}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, tier: e.target.value })
                  }
                  className="w-full p-2 border border-input rounded-md"
                >
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, status: e.target.value })
                  }
                  className="w-full p-2 border border-input rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="canceled">Canceled</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Reason for Change
                </label>
                <textarea
                  value={editFormData.reason}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, reason: e.target.value })
                  }
                  placeholder="Optional reason for this change..."
                  className="w-full p-2 border border-input rounded-md"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-seafoam rounded-md hover:bg-brand-seafoam"
              >
                Update User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 💳 SUBSCRIPTIONS TAB
// =============================================================================

interface SubscriptionData {
  id: string;
  user: string;
  plan: string;
  status: string;
  nextBilling: string | null;
  revenue: number;
}

function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock subscription data for demo
    const mockSubscriptions: SubscriptionData[] = [
      {
        id: "1",
        user: "john@example.com",
        plan: "Premium",
        status: "active",
        nextBilling: "2024-02-15",
        revenue: 12,
      },
      {
        id: "2",
        user: "mike@example.com",
        plan: "Business",
        status: "active",
        nextBilling: "2024-02-20",
        revenue: 49,
      },
      {
        id: "3",
        user: "lisa@example.com",
        plan: "Premium",
        status: "canceled",
        nextBilling: null,
        revenue: 0,
      },
      {
        id: "4",
        user: "sarah@example.com",
        plan: "Free",
        status: "active",
        nextBilling: null,
        revenue: 0,
      },
      {
        id: "5",
        user: "david@example.com",
        plan: "Premium",
        status: "past_due",
        nextBilling: "2024-02-05",
        revenue: 12,
      },
    ];
    setSubscriptions(mockSubscriptions);
    setLoading(false);
  }, []);

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm("Are you sure you want to cancel this subscription?")) return;

    // Update the subscription status
    setSubscriptions(
      subscriptions.map((sub) =>
        sub.id === subscriptionId
          ? { ...sub, status: "canceled", nextBilling: null }
          : sub
      )
    );
  };

  const handleUpdateSubscription = async (
    subscriptionId: string,
    newPlan: string
  ) => {
    // Update the subscription plan
    setSubscriptions(
      subscriptions.map((sub) =>
        sub.id === subscriptionId ? { ...sub, plan: newPlan } : sub
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-medium">Subscriptions Management</h3>
        </div>

        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Next Billing
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center">
                  Loading subscriptions...
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center">
                  No subscriptions found
                </td>
              </tr>
            ) : (
              subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-foreground">
                      {subscription.user}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        subscription.plan === "Free"
                          ? "bg-muted text-foreground"
                          : subscription.plan === "Premium"
                          ? "bg-brand-mint/20 dark:bg-brand-seafoam/30 text-brand-seafoam dark:text-brand-mint"
                          : subscription.plan === "Business"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          : "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                      }`}
                    >
                      {subscription.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        subscription.status === "active"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          : subscription.status === "canceled"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                          : subscription.status === "past_due"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {subscription.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {subscription.nextBilling || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    ${subscription.revenue}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <select
                        value={subscription.plan}
                        onChange={(e) =>
                          handleUpdateSubscription(
                            subscription.id,
                            e.target.value
                          )
                        }
                        className="text-sm border border-input rounded px-2 py-1"
                      >
                        <option value="Free">Free</option>
                        <option value="Premium">Premium</option>
                        <option value="Business">Business</option>
                        <option value="Enterprise">Enterprise</option>
                      </select>
                      {subscription.status === "active" && (
                        <button
                          onClick={() =>
                            handleCancelSubscription(subscription.id)
                          }
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// 💰 PAYMENTS TAB
// =============================================================================

interface Payment {
  id: number;
  user: string;
  amount: number;
  status: string;
  date: string;
  invoice: string;
}

function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    // Fetch payments from your backend
    // This is mock data - replace with actual API calls
    const mockPayments = [
      {
        id: 1,
        user: "john@example.com",
        amount: 12,
        status: "succeeded",
        date: "2024-01-15",
        invoice: "inv_123",
      },
      {
        id: 2,
        user: "mike@example.com",
        amount: 49,
        status: "succeeded",
        date: "2024-01-20",
        invoice: "inv_124",
      },
      {
        id: 3,
        user: "sarah@example.com",
        amount: 12,
        status: "failed",
        date: "2024-01-25",
        invoice: "inv_125",
      },
    ];
    setPayments(mockPayments);
  }, []);

  return (
    <div className="space-y-6">
      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Box p="4">
            <div className="text-center">
              <Text size="2" color="gray">
                Total Revenue
              </Text>
              <Text size="6" weight="bold" className="block mt-1">
                $
                {payments.reduce(
                  (sum, p) => sum + (p.status === "succeeded" ? p.amount : 0),
                  0
                )}
              </Text>
            </div>
          </Box>
        </Card>
        <Card>
          <Box p="4">
            <div className="text-center">
              <Text size="2" color="gray">
                Successful Payments
              </Text>
              <Text size="6" weight="bold" className="block mt-1">
                {payments.filter((p) => p.status === "succeeded").length}
              </Text>
            </div>
          </Box>
        </Card>
        <Card>
          <Box p="4">
            <div className="text-center">
              <Text size="2" color="gray">
                Failed Payments
              </Text>
              <Text size="6" weight="bold" className="block mt-1">
                {payments.filter((p) => p.status === "failed").length}
              </Text>
            </div>
          </Box>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-4">
            Recent Payments
          </Heading>

          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Invoice</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {payments.map((payment) => (
                <Table.Row key={payment.id}>
                  <Table.Cell>{payment.user}</Table.Cell>
                  <Table.Cell>${payment.amount}</Table.Cell>
                  <Table.Cell>
                    <Badge
                      color={payment.status === "succeeded" ? "green" : "red"}
                    >
                      {payment.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{payment.date}</Table.Cell>
                  <Table.Cell>{payment.invoice}</Table.Cell>
                  <Table.Cell>
                    <Button size="1" variant="outline">
                      View
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Card>
    </div>
  );
}

// =============================================================================
// ⚙️ ADMIN SETTINGS TAB
// =============================================================================

function AdminSettingsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-6">
            System Settings
          </Heading>

          <div className="space-y-6">
            <div>
              <Text weight="medium" className="mb-2 block">
                Stripe Configuration
              </Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Text size="2" color="gray">
                    Public Key
                  </Text>
                  <TextField.Root placeholder="pk_test_..." mt="1" />
                </div>
                <div>
                  <Text size="2" color="gray">
                    Secret Key
                  </Text>
                  <TextField.Root
                    type="password"
                    placeholder="sk_test_..."
                    mt="1"
                  />
                </div>
              </div>
            </div>

            <div>
              <Text weight="medium" className="mb-2 block">
                Email Settings
              </Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Text size="2" color="gray">
                    SMTP Host
                  </Text>
                  <TextField.Root placeholder="smtp.gmail.com" mt="1" />
                </div>
                <div>
                  <Text size="2" color="gray">
                    From Email
                  </Text>
                  <TextField.Root placeholder="noreply@yourapp.com" mt="1" />
                </div>
              </div>
            </div>

            <div>
              <Text weight="medium" className="mb-2 block">
                Feature Flags
              </Text>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Text>Enable Trial Period</Text>
                  <Button variant="outline" size="1">
                    Toggle
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <Text>Allow Account Deletion</Text>
                  <Button variant="outline" size="1">
                    Toggle
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <Text>Enable Usage Analytics</Text>
                  <Button variant="outline" size="1">
                    Toggle
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
