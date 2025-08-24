import { NextRequest, NextResponse } from 'next/server';

// Mock user data for admin dashboard
const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    tier: 'premium',
    status: 'active',
    created: '2024-01-15',
    lastLogin: '2024-02-10',
    accountGroups: 2,
    storageUsed: 250,
  },
  {
    id: '2',
    name: 'Sarah Smith',
    email: 'sarah@example.com',
    tier: 'free',
    status: 'active',
    created: '2024-01-20',
    lastLogin: '2024-02-09',
    accountGroups: 1,
    storageUsed: 45,
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    tier: 'business',
    status: 'active',
    created: '2024-01-25',
    lastLogin: '2024-02-08',
    accountGroups: 3,
    storageUsed: 890,
  },
  {
    id: '4',
    name: 'Lisa Brown',
    email: 'lisa@example.com',
    tier: 'premium',
    status: 'canceled',
    created: '2024-01-30',
    lastLogin: '2024-02-01',
    accountGroups: 1,
    storageUsed: 120,
  },
  {
    id: '5',
    name: 'David Wilson',
    email: 'david@example.com',
    tier: 'free',
    status: 'active',
    created: '2024-02-01',
    lastLogin: '2024-02-10',
    accountGroups: 1,
    storageUsed: 23,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Filter users based on search term
    const filteredUsers = mockUsers.filter(user => {
      const searchTerm = search.toLowerCase();
      return user.name.toLowerCase().includes(searchTerm) || 
             user.email.toLowerCase().includes(searchTerm);
    });

    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return NextResponse.json({
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limit),
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 