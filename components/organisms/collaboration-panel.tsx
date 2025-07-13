'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'jazz-react';
import { MyAppAccount, MyAppAccountLoaded } from '@/app/schema';
import { Card, Box, Heading, Text, Button, Badge, Dialog, TextField, Select } from '@radix-ui/themes';
import { Users, Plus, Share2, Mail, Settings, Crown, Eye, Edit3, UserPlus } from 'lucide-react';
import { useCollaboration } from '@/utils/adminGroupManager';

// =============================================================================
// 🤝 COLLABORATION PANEL
// =============================================================================

interface CollaborationPanelProps {
  account: MyAppAccountLoaded;
  postId?: string;
}

export function CollaborationPanel({ account, postId }: CollaborationPanelProps) {
  const { 
    getCollaborationGroups, 
    createCollaborationGroup, 
    inviteToGroup, 
    sharePostWithGroup 
  } = useCollaboration(account);
  
  const [groups, setGroups] = useState({ owned: [], member: [] });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    const userGroups = getCollaborationGroups();
    setGroups(userGroups);
  }, []);

  const handleCreateGroup = async (groupData: any) => {
    try {
      await createCollaborationGroup(
        groupData.name,
        groupData.description,
        groupData.settings
      );
      
      // Refresh groups
      const updatedGroups = getCollaborationGroups();
      setGroups(updatedGroups);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating collaboration group:', error);
    }
  };

  const handleSharePost = async (groupId: string) => {
    if (!postId) return;
    
    try {
      await sharePostWithGroup(groupId, postId);
      alert('Post shared successfully!');
    } catch (error) {
      console.error('Error sharing post:', error);
      alert('Failed to share post');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading size="5" className="flex items-center gap-2">
            <Users size={20} />
            Collaboration
          </Heading>
          <Text size="2" color="gray">Work together with your team</Text>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus size={16} className="mr-2" />
          Create Group
        </Button>
      </div>

      {/* Owned Groups */}
      {groups.owned.length > 0 && (
        <Card>
          <Box p="4">
            <div className="flex items-center gap-2 mb-4">
              <Crown size={16} className="text-yellow-500" />
              <Text weight="medium">Your Groups</Text>
              <Badge size="1" color="yellow">{groups.owned.length}</Badge>
            </div>
            
            <div className="space-y-3">
              {groups.owned.map((group) => (
                <GroupCard 
                  key={group.id} 
                  group={group} 
                  isOwner={true}
                  onInvite={() => {
                    setSelectedGroup(group);
                    setIsInviteDialogOpen(true);
                  }}
                  onShare={postId ? () => handleSharePost(group.id) : undefined}
                />
              ))}
            </div>
          </Box>
        </Card>
      )}

      {/* Member Groups */}
      {groups.member.length > 0 && (
        <Card>
          <Box p="4">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-blue-500" />
              <Text weight="medium">Member Of</Text>
              <Badge size="1" color="blue">{groups.member.length}</Badge>
            </div>
            
            <div className="space-y-3">
              {groups.member.map((group) => (
                <GroupCard 
                  key={group.id} 
                  group={group} 
                  isOwner={false}
                  onShare={postId ? () => handleSharePost(group.id) : undefined}
                />
              ))}
            </div>
          </Box>
        </Card>
      )}

      {/* Empty State */}
      {groups.owned.length === 0 && groups.member.length === 0 && (
        <Card>
          <Box p="8">
            <div className="text-center">
              <Users size={48} className="text-gray-400 mx-auto mb-4" />
              <Heading size="4" className="mb-2">No Collaboration Groups</Heading>
              <Text size="2" color="gray" className="mb-4">
                Create your first group to start collaborating with others
              </Text>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus size={16} className="mr-2" />
                Create Your First Group
              </Button>
            </div>
          </Box>
        </Card>
      )}

      {/* Create Group Dialog */}
      <CreateGroupDialog 
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateGroup}
      />

      {/* Invite Dialog */}
      <InviteDialog 
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        group={selectedGroup}
        onInvite={(email, role) => inviteToGroup(selectedGroup?.id, email, role)}
      />
    </div>
  );
}

// =============================================================================
// 🎴 GROUP CARD COMPONENT
// =============================================================================

interface GroupCardProps {
  group: any;
  isOwner: boolean;
  onInvite?: () => void;
  onShare?: () => void;
}

function GroupCard({ group, isOwner, onInvite, onShare }: GroupCardProps) {
  const memberCount = group.members?.length || 0;
  const sharedPostsCount = group.sharedPosts?.length || 0;

  const getRoleIcon = () => {
    if (isOwner) return <Crown size={14} className="text-yellow-500" />;
    
    const userMember = group.members?.find((m: any) => m.accountId === 'current-user-id');
    switch (userMember?.role) {
      case 'admin': return <Settings size={14} className="text-purple-500" />;
      case 'editor': return <Edit3 size={14} className="text-blue-500" />;
      case 'viewer': return <Eye size={14} className="text-gray-500" />;
      default: return <Users size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Users size={20} className="text-blue-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Text weight="medium">{group.name}</Text>
            {getRoleIcon()}
          </div>
          <Text size="2" color="gray">{group.description}</Text>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <Users size={12} className="text-gray-400" />
              <Text size="1" color="gray">{memberCount} members</Text>
            </div>
            <div className="flex items-center gap-1">
              <Share2 size={12} className="text-gray-400" />
              <Text size="1" color="gray">{sharedPostsCount} posts</Text>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        {onShare && (
          <Button size="1" variant="outline" onClick={onShare}>
            <Share2 size={12} className="mr-1" />
            Share
          </Button>
        )}
        {isOwner && onInvite && (
          <Button size="1" variant="outline" onClick={onInvite}>
            <UserPlus size={12} className="mr-1" />
            Invite
          </Button>
        )}
        <Button size="1" variant="outline">
          <Settings size={12} />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// 📝 CREATE GROUP DIALOG
// =============================================================================

interface CreateGroupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (groupData: any) => void;
}

function CreateGroupDialog({ isOpen, onClose, onCreate }: CreateGroupDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    allowInvites: true,
    maxMembers: 10,
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    
    onCreate({
      name: formData.name,
      description: formData.description,
      settings: {
        isPublic: formData.isPublic,
        allowInvites: formData.allowInvites,
        maxMembers: formData.maxMembers,
      }
    });
    
    setFormData({
      name: '',
      description: '',
      isPublic: false,
      allowInvites: true,
      maxMembers: 10,
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>Create Collaboration Group</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Create a new group to collaborate with others on your posts and projects.
        </Dialog.Description>

        <div className="space-y-4">
          <div>
            <Text as="label" size="2" weight="medium">Group Name</Text>
            <input
              type="text"
              placeholder="e.g., Marketing Team"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1 p-2 border rounded-md"
            />
          </div>
          
          <div>
            <Text as="label" size="2" weight="medium">Description</Text>
            <input
              type="text"
              placeholder="Brief description of the group's purpose"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 p-2 border rounded-md"
            />
          </div>

          <div>
            <Text as="label" size="2" weight="medium">Settings</Text>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="rounded"
                />
                <Text size="2">Public group (discoverable by others)</Text>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allowInvites}
                  onChange={(e) => setFormData({ ...formData, allowInvites: e.target.checked })}
                  className="rounded"
                />
                <Text size="2">Allow members to invite others</Text>
              </label>
            </div>
          </div>

          <div>
            <Text as="label" size="2" weight="medium">Maximum Members</Text>
            <select
              value={formData.maxMembers}
              onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value={5}>5 members</option>
              <option value={10}>10 members</option>
              <option value={25}>25 members</option>
              <option value={50}>50 members</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Dialog.Close>
            <Button variant="soft" color="gray">Cancel</Button>
          </Dialog.Close>
          <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
            Create Group
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// =============================================================================
// 📧 INVITE DIALOG
// =============================================================================

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  group: any;
  onInvite: (email: string, role: string) => void;
}

function InviteDialog({ isOpen, onClose, group, onInvite }: InviteDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');

  const handleInvite = () => {
    if (!email.trim()) return;
    
    onInvite(email, role);
    setEmail('');
    setRole('viewer');
    onClose();
  };

  if (!group) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Invite to {group.name}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Invite someone to collaborate in this group.
        </Dialog.Description>

        <div className="space-y-4">
          <div>
            <Text as="label" size="2" weight="medium">Email Address</Text>
            <input
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            />
          </div>
          
          <div>
            <Text as="label" size="2" weight="medium">Role</Text>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="viewer">Viewer - Can view shared content</option>
              <option value="editor">Editor - Can edit and share content</option>
              <option value="admin">Admin - Can manage group and members</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Dialog.Close>
            <Button variant="soft" color="gray">Cancel</Button>
          </Dialog.Close>
          <Button onClick={handleInvite} disabled={!email.trim()}>
            <Mail size={16} className="mr-2" />
            Send Invite
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
} 