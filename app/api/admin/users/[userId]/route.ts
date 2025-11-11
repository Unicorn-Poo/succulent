import { NextRequest, NextResponse } from 'next/server';

// Mock user data storage (in a real app, this would be in a database)
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

// Force dynamic rendering to prevent build-time static analysis issues
export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const updateData = await request.json();

    // Find the user in our mock data
    const userIndex = mockUsers.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update the user
    mockUsers[userIndex] = {
      ...mockUsers[userIndex],
      name: updateData.name || mockUsers[userIndex].name,
      email: updateData.email || mockUsers[userIndex].email,
      tier: updateData.tier || mockUsers[userIndex].tier,
      status: updateData.status || mockUsers[userIndex].status,
    };

    return NextResponse.json({
      success: true,
      user: mockUsers[userIndex],
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Find the user in our mock data
    const userIndex = mockUsers.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove the user
    mockUsers.splice(userIndex, 1);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 