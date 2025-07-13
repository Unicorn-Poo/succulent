'use client';

import { useState, useEffect } from 'react';
import { Card, Tabs, Box, Heading, Text, Button, Badge, Table, Dialog, TextField, Select } from '@radix-ui/themes';
import { Users, CreditCard, Settings, BarChart3, Shield, Search, Plus, Edit, Trash2, Download } from 'lucide-react';
import { useAccount } from 'jazz-react';
import { MyAppAccount } from '@/app/schema';
import { PLAN_DEFINITIONS, formatPrice } from '@/utils/subscriptionManager';

// =============================================================================
// 🔐 ADMIN DASHBOARD
// =============================================================================

export default function AdminDashboard() {
  const { me } = useAccount<MyAppAccount>();

  // Check if user is admin (you would implement proper admin auth)
  const isAdmin = true; // Replace with actual admin check

  if (!me || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <Heading size="8" className="mb-2">Admin Dashboard</Heading>
            <Text size="4" color="gray">Manage users, subscriptions, and payments</Text>
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
          <Tabs.Trigger value="subscriptions" className="flex items-center gap-2">
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
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    churnRate: 0,
  });

  useEffect(() => {
    // Fetch stats from your backend
    // This is mock data - replace with actual API calls
    setStats({
      totalUsers: 1250,
      activeSubscriptions: 320,
      monthlyRevenue: 15780,
      churnRate: 5.2,
    });
  }, []);

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers.toLocaleString(), color: 'blue' },
    { title: 'Active Subscriptions', value: stats.activeSubscriptions.toLocaleString(), color: 'green' },
    { title: 'Monthly Revenue', value: `$${stats.monthlyRevenue.toLocaleString()}`, color: 'purple' },
    { title: 'Churn Rate', value: `${stats.churnRate}%`, color: 'orange' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <Box p="4">
              <div className="text-center">
                <Text size="2" color="gray">{stat.title}</Text>
                <Text size="6" weight="bold" className="block mt-1">{stat.value}</Text>
              </div>
            </Box>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-4">Recent Activity</Heading>
          <div className="space-y-3">
            {[
              { user: 'john@example.com', action: 'Upgraded to Pro', time: '2 minutes ago' },
              { user: 'sarah@example.com', action: 'Subscription renewed', time: '1 hour ago' },
              { user: 'mike@example.com', action: 'Account created', time: '3 hours ago' },
              { user: 'lisa@example.com', action: 'Subscription canceled', time: '5 hours ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <Text weight="medium">{activity.user}</Text>
                    <Text size="2" color="gray">{activity.action}</Text>
                  </div>
                </div>
                <Text size="2" color="gray">{activity.time}</Text>
              </div>
            ))}
          </div>
        </Box>
      </Card>
    </div>
  );
}

// =============================================================================
// 👥 USERS TAB
// =============================================================================

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    // Fetch users from your backend
    // This is mock data - replace with actual API calls
    const mockUsers = [
      { id: 1, name: 'John Doe', email: 'john@example.com', tier: 'premium', status: 'active', created: '2024-01-15' },
      { id: 2, name: 'Sarah Smith', email: 'sarah@example.com', tier: 'free', status: 'active', created: '2024-01-20' },
      { id: 3, name: 'Mike Johnson', email: 'mike@example.com', tier: 'business', status: 'active', created: '2024-01-25' },
      { id: 4, name: 'Lisa Brown', email: 'lisa@example.com', tier: 'free', status: 'inactive', created: '2024-01-30' },
    ];
    setUsers(mockUsers);
  }, []);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <Card>
        <Box p="4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-md w-64"
                />
              </div>
              <Button variant="outline">
                <Download size={16} className="mr-2" />
                Export
              </Button>
            </div>
            <Button>
              <Plus size={16} className="mr-2" />
              Add User
            </Button>
          </div>
        </Box>
      </Card>

      {/* Users Table */}
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-4">Users ({filteredUsers.length})</Heading>
          
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Plan</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            
            <Table.Body>
              {filteredUsers.map((user) => (
                <Table.Row key={user.id}>
                  <Table.Cell>{user.name}</Table.Cell>
                  <Table.Cell>{user.email}</Table.Cell>
                  <Table.Cell>
                    <Badge color={user.tier === 'free' ? 'gray' : 'green'}>
                      {user.tier}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={user.status === 'active' ? 'green' : 'gray'}>
                      {user.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{user.created}</Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-2">
                      <Button size="1" variant="outline" onClick={() => handleEditUser(user)}>
                        <Edit size={12} />
                      </Button>
                      <Button size="1" variant="outline" color="red">
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Card>

      {/* Edit User Dialog */}
      <Dialog.Root open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Edit User</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Update user information and subscription details.
          </Dialog.Description>

          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Text as="label" size="2" weight="medium">Name</Text>
                <TextField.Input defaultValue={selectedUser.name} mt="1" />
              </div>
              <div>
                <Text as="label" size="2" weight="medium">Email</Text>
                <TextField.Input defaultValue={selectedUser.email} mt="1" />
              </div>
              <div>
                <Text as="label" size="2" weight="medium">Subscription Tier</Text>
                <Select.Root defaultValue={selectedUser.tier}>
                  <Select.Trigger mt="1" />
                  <Select.Content>
                    <Select.Item value="free">Free</Select.Item>
                    <Select.Item value="premium">Premium</Select.Item>
                    <Select.Item value="business">Business</Select.Item>
                    <Select.Item value="enterprise">Enterprise</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>
          )}

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">Cancel</Button>
            </Dialog.Close>
            <Dialog.Close>
              <Button>Save Changes</Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}

// =============================================================================
// 💳 SUBSCRIPTIONS TAB
// =============================================================================

function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    // Fetch subscriptions from your backend
    // This is mock data - replace with actual API calls
    const mockSubscriptions = [
      { id: 1, user: 'john@example.com', plan: 'Premium', status: 'active', nextBilling: '2024-02-15', revenue: 12 },
      { id: 2, user: 'mike@example.com', plan: 'Business', status: 'active', nextBilling: '2024-02-20', revenue: 49 },
      { id: 3, user: 'lisa@example.com', plan: 'Premium', status: 'canceled', nextBilling: null, revenue: 0 },
    ];
    setSubscriptions(mockSubscriptions);
  }, []);

  return (
    <div className="space-y-6">
      {/* Subscription Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(PLAN_DEFINITIONS).map(([tier, plan]) => (
          <Card key={tier}>
            <Box p="4">
              <div className="text-center">
                <Text size="2" color="gray">{plan.name}</Text>
                <Text size="6" weight="bold" className="block mt-1">
                  {subscriptions.filter(s => s.plan.toLowerCase() === tier).length}
                </Text>
                <Text size="2" color="gray">subscribers</Text>
              </div>
            </Box>
          </Card>
        ))}
      </div>

      {/* Subscriptions Table */}
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-4">Active Subscriptions</Heading>
          
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Plan</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Next Billing</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Revenue</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            
            <Table.Body>
              {subscriptions.map((subscription) => (
                <Table.Row key={subscription.id}>
                  <Table.Cell>{subscription.user}</Table.Cell>
                  <Table.Cell>
                    <Badge color={subscription.plan === 'Premium' ? 'green' : 'purple'}>
                      {subscription.plan}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={subscription.status === 'active' ? 'green' : 'gray'}>
                      {subscription.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{subscription.nextBilling || 'N/A'}</Table.Cell>
                  <Table.Cell>${subscription.revenue}/month</Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-2">
                      <Button size="1" variant="outline">
                        <Edit size={12} />
                      </Button>
                      <Button size="1" variant="outline" color="red">
                        Cancel
                      </Button>
                    </div>
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
// 💰 PAYMENTS TAB
// =============================================================================

function PaymentsTab() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    // Fetch payments from your backend
    // This is mock data - replace with actual API calls
    const mockPayments = [
      { id: 1, user: 'john@example.com', amount: 12, status: 'succeeded', date: '2024-01-15', invoice: 'inv_123' },
      { id: 2, user: 'mike@example.com', amount: 49, status: 'succeeded', date: '2024-01-20', invoice: 'inv_124' },
      { id: 3, user: 'sarah@example.com', amount: 12, status: 'failed', date: '2024-01-25', invoice: 'inv_125' },
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
              <Text size="2" color="gray">Total Revenue</Text>
              <Text size="6" weight="bold" className="block mt-1">
                ${payments.reduce((sum, p) => sum + (p.status === 'succeeded' ? p.amount : 0), 0)}
              </Text>
            </div>
          </Box>
        </Card>
        <Card>
          <Box p="4">
            <div className="text-center">
              <Text size="2" color="gray">Successful Payments</Text>
              <Text size="6" weight="bold" className="block mt-1">
                {payments.filter(p => p.status === 'succeeded').length}
              </Text>
            </div>
          </Box>
        </Card>
        <Card>
          <Box p="4">
            <div className="text-center">
              <Text size="2" color="gray">Failed Payments</Text>
              <Text size="6" weight="bold" className="block mt-1">
                {payments.filter(p => p.status === 'failed').length}
              </Text>
            </div>
          </Box>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-4">Recent Payments</Heading>
          
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
                    <Badge color={payment.status === 'succeeded' ? 'green' : 'red'}>
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
          <Heading size="5" className="mb-6">System Settings</Heading>
          
          <div className="space-y-6">
            <div>
              <Text weight="medium" className="mb-2 block">Stripe Configuration</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Text size="2" color="gray">Public Key</Text>
                  <TextField.Input placeholder="pk_test_..." mt="1" />
                </div>
                <div>
                  <Text size="2" color="gray">Secret Key</Text>
                  <TextField.Input type="password" placeholder="sk_test_..." mt="1" />
                </div>
              </div>
            </div>

            <div>
              <Text weight="medium" className="mb-2 block">Email Settings</Text>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Text size="2" color="gray">SMTP Host</Text>
                  <TextField.Input placeholder="smtp.gmail.com" mt="1" />
                </div>
                <div>
                  <Text size="2" color="gray">From Email</Text>
                  <TextField.Input placeholder="noreply@yourapp.com" mt="1" />
                </div>
              </div>
            </div>

            <div>
              <Text weight="medium" className="mb-2 block">Feature Flags</Text>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Text>Enable Trial Period</Text>
                  <Button variant="outline" size="1">Toggle</Button>
                </div>
                <div className="flex items-center justify-between">
                  <Text>Allow Account Deletion</Text>
                  <Button variant="outline" size="1">Toggle</Button>
                </div>
                <div className="flex items-center justify-between">
                  <Text>Enable Usage Analytics</Text>
                  <Button variant="outline" size="1">Toggle</Button>
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