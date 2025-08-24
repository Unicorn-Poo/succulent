import { MyAppAccountLoaded, CompanyAdminGroup, AdminRole } from '@/app/schema';
import { Group } from 'jazz-tools';

// =============================================================================
// 🛡️ ADMIN GROUP MANAGER
// =============================================================================

export class AdminGroupManager {
  private account: MyAppAccountLoaded;

  constructor(account: MyAppAccountLoaded) {
    this.account = account;
  }

  /**
   * Check if current user is a system admin
   */
  isSystemAdmin(): boolean {
    return this.account.profile?.isSystemAdmin || false;
  }

  /**
   * Check if user has specific admin role
   */
  hasAdminRole(role: AdminRole): boolean {
    if (this.isSystemAdmin()) return true;
    
    const adminGroups = this.account.profile?.adminGroups || [];
    return adminGroups.some(group => 
      group.members?.some(member => 
        member.accountId === this.account.id && 
        (member.role === role || member.role === 'super_admin')
      )
    );
  }

  /**
   * Check if user can perform specific admin action
   */
  canPerformAction(action: 'manageUsers' | 'manageSubscriptions' | 'viewAnalytics' | 'managePayments' | 'accessSystemSettings'): boolean {
    if (this.isSystemAdmin()) return true;

    const adminGroups = this.account.profile?.adminGroups || [];
    
    return adminGroups.some(group => {
      const isMember = group.members?.some(member => member.accountId === this.account.id);
      if (!isMember) return false;

      const settingsKey = `can${action.charAt(0).toUpperCase() + action.slice(1)}` as keyof typeof group.settings;
      return group.settings?.[settingsKey] || false;
    });
  }

  /**
   * Create a new admin group (super admin only)
   */
  async createAdminGroup(
    name: string,
    description: string,
    permissions: {
      canManageUsers?: boolean;
      canManageSubscriptions?: boolean;
      canViewAnalytics?: boolean;
      canManagePayments?: boolean;
      canAccessSystemSettings?: boolean;
    } = {}
  ): Promise<CompanyAdminGroup | null> {
    if (!this.isSystemAdmin()) {
      throw new Error('Only system admins can create admin groups');
    }

    try {
      const adminGroup = CompanyAdminGroup.create({
        name,
        description,
        createdAt: new Date(),
        settings: {
          canManageUsers: permissions.canManageUsers || false,
          canManageSubscriptions: permissions.canManageSubscriptions || false,
          canViewAnalytics: permissions.canViewAnalytics || false,
          canManagePayments: permissions.canManagePayments || false,
          canAccessSystemSettings: permissions.canAccessSystemSettings || false,
        },
        members: [],
      }, { owner: this.account });

      return adminGroup;
    } catch (error) {
      console.error('Error creating admin group:', error);
      return null;
    }
  }

  /**
   * Add member to admin group
   */
  async addToAdminGroup(
    groupId: string,
    targetAccountId: string,
    role: AdminRole = 'admin'
  ): Promise<boolean> {
    if (!this.hasAdminRole('super_admin') && !this.hasAdminRole('admin')) {
      throw new Error('Insufficient permissions to add admin members');
    }

    try {
      const adminGroups = this.account.profile?.adminGroups || [];
      const group = adminGroups.find(g => g.id === groupId);
      
      if (!group) {
        throw new Error('Admin group not found');
      }

      // Check if user is already a member
      const existingMember = group.members?.find(m => m.accountId === targetAccountId);
      if (existingMember) {
        // Update role if different
        existingMember.role = role;
        return true;
      }

      // Add new member
      group.members?.push({
        accountId: targetAccountId,
        role,
        addedAt: new Date(),
        addedBy: this.account.id,
      });

      return true;
    } catch (error) {
      console.error('Error adding to admin group:', error);
      return false;
    }
  }

  /**
   * Remove member from admin group
   */
  async removeFromAdminGroup(groupId: string, targetAccountId: string): Promise<boolean> {
    if (!this.hasAdminRole('super_admin') && !this.hasAdminRole('admin')) {
      throw new Error('Insufficient permissions to remove admin members');
    }

    try {
      const adminGroups = this.account.profile?.adminGroups || [];
      const group = adminGroups.find(g => g.id === groupId);
      
      if (!group || !group.members) {
        throw new Error('Admin group not found');
      }

      const memberIndex = group.members.findIndex(m => m.accountId === targetAccountId);
      if (memberIndex === -1) {
        throw new Error('Member not found in group');
      }

      group.members.splice(memberIndex, 1);
      return true;
    } catch (error) {
      console.error('Error removing from admin group:', error);
      return false;
    }
  }

  /**
   * Get all admin groups user belongs to
   */
  getAdminGroups(): CompanyAdminGroup[] {
    return this.account.profile?.adminGroups || [];
  }

  /**
   * Get user's highest admin role
   */
  getHighestAdminRole(): AdminRole | null {
    if (this.isSystemAdmin()) return 'super_admin';

    const adminGroups = this.account.profile?.adminGroups || [];
    const roles: AdminRole[] = [];

    adminGroups.forEach(group => {
      const member = group.members?.find(m => m.accountId === this.account.id);
      if (member) {
        roles.push(member.role);
      }
    });

    if (roles.includes('super_admin')) return 'super_admin';
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('moderator')) return 'moderator';
    if (roles.includes('support')) return 'support';

    return null;
  }
}

// =============================================================================
// 🤝 COLLABORATION GROUP MANAGER
// =============================================================================

export class CollaborationManager {
  private account: MyAppAccountLoaded;

  constructor(account: MyAppAccountLoaded) {
    this.account = account;
  }

  /**
   * Create a new collaboration group
   */
  async createCollaborationGroup(
    name: string,
    description: string,
    settings: {
      isPublic?: boolean;
      allowInvites?: boolean;
      maxMembers?: number;
    } = {}
  ) {
    try {
      const CollaborationGroup = await import('@/app/schema').then(m => m.CollaborationGroup);
      
      const group = CollaborationGroup.create({
        name,
        description,
        createdAt: new Date(),
        createdBy: this.account.id,
        settings: {
          isPublic: settings.isPublic || false,
          allowInvites: settings.allowInvites || true,
          maxMembers: settings.maxMembers || 10,
        },
        members: [{
          accountId: this.account.id,
          role: 'owner',
          joinedAt: new Date(),
        }],
        sharedPosts: [],
        sharedAccountGroups: [],
      }, { owner: this.account });

      // Add to user's owned groups
      if (!this.account.profile.ownedGroups) {
        this.account.profile.ownedGroups = [];
      }
      this.account.profile.ownedGroups.push(group);

      return group;
    } catch (error) {
      console.error('Error creating collaboration group:', error);
      throw error;
    }
  }

  /**
   * Invite user to collaboration group
   */
  async inviteToGroup(
    groupId: string,
    targetEmail: string,
    role: 'admin' | 'editor' | 'viewer' = 'viewer'
  ): Promise<boolean> {
    try {
      const ownedGroups = this.account.profile?.ownedGroups || [];
      const group = ownedGroups.find(g => g.id === groupId);
      
      if (!group) {
        throw new Error('Collaboration group not found or you do not own it');
      }

      // Check if invites are allowed
      if (!group.settings?.allowInvites) {
        throw new Error('Invites are not allowed for this group');
      }

      // Check member limit
      const currentMemberCount = group.members?.length || 0;
      if (currentMemberCount >= (group.settings?.maxMembers || 10)) {
        throw new Error('Group has reached maximum member limit');
      }

      // In a real implementation, you would:
      // 1. Find the user by email
      // 2. Send them an invitation
      // 3. Add them to the group when they accept

      // For now, we'll simulate this
      console.log(`Invitation sent to ${targetEmail} for group ${group.name}`);
      
      return true;
    } catch (error) {
      console.error('Error inviting to group:', error);
      return false;
    }
  }

  /**
   * Share a post with collaboration group
   */
  async sharePostWithGroup(groupId: string, postId: string): Promise<boolean> {
    try {
      const collaborationGroups = this.account.profile?.collaborationGroups || [];
      const group = collaborationGroups.find(g => g.id === groupId);
      
      if (!group) {
        throw new Error('Collaboration group not found');
      }

      // Check if user can share (owner, admin, or editor)
      const member = group.members?.find(m => m.accountId === this.account.id);
      if (!member || member.role === 'viewer') {
        throw new Error('Insufficient permissions to share posts');
      }

      // Find the post and add it to shared posts
      const userPosts = this.account.root?.accountGroups?.flatMap(ag => ag.posts) || [];
      const post = userPosts.find(p => p.id === postId);
      
      if (!post) {
        throw new Error('Post not found');
      }

      if (!group.sharedPosts) {
        group.sharedPosts = [];
      }
      
      group.sharedPosts.push(post);
      return true;
    } catch (error) {
      console.error('Error sharing post with group:', error);
      return false;
    }
  }

  /**
   * Get user's collaboration groups
   */
  getCollaborationGroups() {
    return {
      owned: this.account.profile?.ownedGroups || [],
      member: this.account.profile?.collaborationGroups || [],
    };
  }

  /**
   * Check if user can perform action in group
   */
  canPerformActionInGroup(
    groupId: string,
    action: 'edit' | 'share' | 'invite' | 'manage'
  ): boolean {
    const { owned, member } = this.getCollaborationGroups();
    
    // Check if user owns the group
    const ownedGroup = owned.find(g => g.id === groupId);
    if (ownedGroup) return true;

    // Check member permissions
    const memberGroup = member.find(g => g.id === groupId);
    if (!memberGroup) return false;

    const userMember = memberGroup.members?.find(m => m.accountId === this.account.id);
    if (!userMember) return false;

    switch (action) {
      case 'manage':
        return userMember.role === 'owner' || userMember.role === 'admin';
      case 'invite':
        return userMember.role === 'owner' || userMember.role === 'admin';
      case 'share':
        return userMember.role !== 'viewer';
      case 'edit':
        return userMember.role === 'owner' || userMember.role === 'admin' || userMember.role === 'editor';
      default:
        return false;
    }
  }
}

// =============================================================================
// 🎯 REACT HOOKS
// =============================================================================

export function useAdminGroups(account: MyAppAccountLoaded) {
  const adminManager = new AdminGroupManager(account);
  
  return {
    isSystemAdmin: adminManager.isSystemAdmin(),
    hasAdminRole: (role: AdminRole) => adminManager.hasAdminRole(role),
    canPerformAction: (action: Parameters<typeof adminManager.canPerformAction>[0]) => 
      adminManager.canPerformAction(action),
    getHighestAdminRole: () => adminManager.getHighestAdminRole(),
    getAdminGroups: () => adminManager.getAdminGroups(),
    createAdminGroup: (name: string, description: string, permissions?: any) => 
      adminManager.createAdminGroup(name, description, permissions),
    addToAdminGroup: (groupId: string, accountId: string, role?: AdminRole) => 
      adminManager.addToAdminGroup(groupId, accountId, role),
    removeFromAdminGroup: (groupId: string, accountId: string) => 
      adminManager.removeFromAdminGroup(groupId, accountId),
  };
}

export function useCollaboration(account: MyAppAccountLoaded) {
  const collabManager = new CollaborationManager(account);
  
  return {
    getCollaborationGroups: () => collabManager.getCollaborationGroups(),
    createCollaborationGroup: (name: string, description: string, settings?: any) => 
      collabManager.createCollaborationGroup(name, description, settings),
    inviteToGroup: (groupId: string, email: string, role?: 'admin' | 'editor' | 'viewer') => 
      collabManager.inviteToGroup(groupId, email, role),
    sharePostWithGroup: (groupId: string, postId: string) => 
      collabManager.sharePostWithGroup(groupId, postId),
    canPerformActionInGroup: (groupId: string, action: 'edit' | 'share' | 'invite' | 'manage') => 
      collabManager.canPerformActionInGroup(groupId, action),
  };
} 