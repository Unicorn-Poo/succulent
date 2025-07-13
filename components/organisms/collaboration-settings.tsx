"use client";

import { useState } from "react";
import { Dialog, TextField, Button, Select, Badge, Card, Text, Heading, Box, Flex } from "@radix-ui/themes";
import { Plus, UserPlus, Settings, Mail, Copy, Check, X, Crown, Shield, Edit, Eye } from "lucide-react";
import { AccountGroup, CollaboratorRole } from "@/app/schema";
import { useAccount } from "jazz-react";
import { MyAppAccount } from "@/app/schema";
import { co } from "jazz-tools";

interface CollaborationSettingsProps {
  accountGroup: co.loaded<typeof AccountGroup>;
  onClose?: () => void;
}

export function CollaborationSettings({ accountGroup, onClose }: CollaborationSettingsProps) {
  const { me } = useAccount();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>("editor");
  const [copiedLink, setCopiedLink] = useState(false);

  // Mock data - in real app, this would come from the collaboration group
  const collaborators = [
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      role: "owner" as CollaboratorRole,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face",
      joinedAt: new Date("2024-01-15"),
    },
    {
      id: "2",
      name: "Sarah Smith",
      email: "sarah@example.com",
      role: "admin" as CollaboratorRole,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b9c04e6d?w=32&h=32&fit=crop&crop=face",
      joinedAt: new Date("2024-01-20"),
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike@example.com",
      role: "editor" as CollaboratorRole,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face",
      joinedAt: new Date("2024-01-25"),
    },
  ];

  const pendingInvites = [
    {
      email: "alice@example.com",
      role: "editor" as CollaboratorRole,
      invitedAt: new Date("2024-02-01"),
    },
  ];

  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim()) return;

    // TODO: Implement actual email invitation
    console.log("Inviting", inviteEmail, "as", inviteRole);
    
    // Reset form
    setInviteEmail("");
    setInviteRole("editor");
    setIsInviteOpen(false);
  };

  const handleGenerateInviteLink = async () => {
    // TODO: Generate actual invite link
    const mockLink = `https://succulent.app/invite/${accountGroup.id}?role=${inviteRole}`;
    
    try {
      await navigator.clipboard.writeText(mockLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleRoleChange = (collaboratorId: string, newRole: CollaboratorRole) => {
    // TODO: Implement role change
    console.log("Changing role for", collaboratorId, "to", newRole);
  };

  const handleRemoveCollaborator = (collaboratorId: string) => {
    // TODO: Implement collaborator removal
    console.log("Removing collaborator", collaboratorId);
  };

  const getRoleIcon = (role: CollaboratorRole) => {
    switch (role) {
      case "owner":
        return <Crown className="w-3 h-3" />;
      case "admin":
        return <Shield className="w-3 h-3" />;
      case "editor":
        return <Edit className="w-3 h-3" />;
      case "viewer":
        return <Eye className="w-3 h-3" />;
      default:
        return <Eye className="w-3 h-3" />;
    }
  };

  const getRoleColor = (role: CollaboratorRole) => {
    switch (role) {
      case "owner":
        return "gold";
      case "admin":
        return "blue";
      case "editor":
        return "green";
      case "viewer":
        return "gray";
      default:
        return "gray";
    }
  };

  const canManageCollaborators = () => {
    // TODO: Check actual permissions
    return true;
  };

  return (
    <Dialog.Root open onOpenChange={onClose}>
      <Dialog.Content style={{ maxWidth: "600px", maxHeight: "80vh" }}>
        <Dialog.Title>
          <Flex align="center" gap="2">
            <Settings className="w-5 h-5" />
            Collaboration Settings
          </Flex>
        </Dialog.Title>

        <Dialog.Description>
          Manage who can access and collaborate on "{accountGroup.name}" account group.
        </Dialog.Description>

        <Box mt="4" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {/* Invite Section */}
          {canManageCollaborators() && (
            <Card mb="4">
              <Flex direction="column" gap="3">
                <Heading size="3">Invite Collaborators</Heading>
                
                <Flex gap="2" align="center">
                  <Button
                    variant="outline"
                    onClick={() => setIsInviteOpen(true)}
                    style={{ flex: 1 }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite by Email
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleGenerateInviteLink}
                    style={{ flex: 1 }}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Invite Link
                      </>
                    )}
                  </Button>
                </Flex>
              </Flex>
            </Card>
          )}

          {/* Current Collaborators */}
          <Card mb="4">
            <Flex direction="column" gap="3">
              <Heading size="3">Current Collaborators ({collaborators.length})</Heading>
              
              <Box>
                {collaborators.map((collaborator) => (
                  <Flex key={collaborator.id} justify="between" align="center" py="2">
                    <Flex align="center" gap="3">
                      <img
                        src={collaborator.avatar}
                        alt={collaborator.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <Box>
                        <Text size="2" weight="medium">
                          {collaborator.name}
                        </Text>
                        <Text size="1" color="gray">
                          {collaborator.email}
                        </Text>
                      </Box>
                    </Flex>
                    
                    <Flex align="center" gap="2">
                      <Badge color={getRoleColor(collaborator.role)}>
                        <Flex align="center" gap="1">
                          {getRoleIcon(collaborator.role)}
                          {collaborator.role}
                        </Flex>
                      </Badge>
                      
                      {canManageCollaborators() && collaborator.role !== "owner" && (
                        <Flex gap="1">
                          <Select.Root
                            value={collaborator.role}
                            onValueChange={(value) => handleRoleChange(collaborator.id, value as CollaboratorRole)}
                          >
                            <Select.Trigger variant="ghost" />
                            <Select.Content>
                              <Select.Item value="admin">Admin</Select.Item>
                              <Select.Item value="editor">Editor</Select.Item>
                              <Select.Item value="viewer">Viewer</Select.Item>
                            </Select.Content>
                          </Select.Root>
                          
                          <Button
                            variant="ghost"
                            size="1"
                            color="red"
                            onClick={() => handleRemoveCollaborator(collaborator.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </Flex>
                      )}
                    </Flex>
                  </Flex>
                ))}
              </Box>
            </Flex>
          </Card>

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <Card mb="4">
              <Flex direction="column" gap="3">
                <Heading size="3">Pending Invites ({pendingInvites.length})</Heading>
                
                <Box>
                  {pendingInvites.map((invite, index) => (
                    <Flex key={index} justify="between" align="center" py="2">
                      <Flex align="center" gap="3">
                        <Box className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <Mail className="w-4 h-4 text-gray-500" />
                        </Box>
                        <Box>
                          <Text size="2" weight="medium">
                            {invite.email}
                          </Text>
                          <Text size="1" color="gray">
                            Invited {invite.invitedAt.toLocaleDateString()}
                          </Text>
                        </Box>
                      </Flex>
                      
                      <Flex align="center" gap="2">
                        <Badge color={getRoleColor(invite.role)}>
                          <Flex align="center" gap="1">
                            {getRoleIcon(invite.role)}
                            {invite.role}
                          </Flex>
                        </Badge>
                        
                        {canManageCollaborators() && (
                          <Button
                            variant="ghost"
                            size="1"
                            color="red"
                            onClick={() => console.log("Cancel invite", invite.email)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </Flex>
                    </Flex>
                  ))}
                </Box>
              </Flex>
            </Card>
          )}

          {/* Permissions Info */}
          <Card>
            <Flex direction="column" gap="3">
              <Heading size="3">Role Permissions</Heading>
              
              <Box>
                <Text size="1" color="gray">
                  <strong>Owner:</strong> Full access to everything including billing and deletion
                </Text>
                <Text size="1" color="gray">
                  <strong>Admin:</strong> Can manage posts, accounts, and invite others
                </Text>
                <Text size="1" color="gray">
                  <strong>Editor:</strong> Can create and edit posts, view analytics
                </Text>
                <Text size="1" color="gray">
                  <strong>Viewer:</strong> Can only view posts and analytics
                </Text>
              </Box>
            </Flex>
          </Card>
        </Box>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>

      {/* Invite Modal */}
      <Dialog.Root open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <Dialog.Content style={{ maxWidth: "400px" }}>
          <Dialog.Title>Invite Collaborator</Dialog.Title>
          
          <Dialog.Description>
            Send an invitation to collaborate on "{accountGroup.name}".
          </Dialog.Description>

          <Box mt="4">
            <Flex direction="column" gap="3">
              <label>
                <Text size="2" weight="medium">
                  Email Address
                </Text>
                <TextField.Root
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  mt="1"
                />
              </label>

              <label>
                <Text size="2" weight="medium">
                  Role
                </Text>
                <Select.Root value={inviteRole} onValueChange={(value) => setInviteRole(value as CollaboratorRole)}>
                  <Select.Trigger mt="1" />
                  <Select.Content>
                    <Select.Item value="admin">Admin - Can manage everything</Select.Item>
                    <Select.Item value="editor">Editor - Can create and edit posts</Select.Item>
                    <Select.Item value="viewer">Viewer - Can only view content</Select.Item>
                  </Select.Content>
                </Select.Root>
              </label>
            </Flex>
          </Box>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleInviteByEmail} disabled={!inviteEmail.trim()}>
              Send Invitation
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Dialog.Root>
  );
} 