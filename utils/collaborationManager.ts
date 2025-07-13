import { Group, createInviteLink, co, z } from "jazz-tools";
import { CollaborationGroup, AccountCollaborator, CollaboratorRole, MyAppAccount } from "@/app/schema";

export class CollaborationManager {
  /**
   * Create an invite link for a collaboration group
   */
  static createInviteLink(collaborationGroup: co.loaded<typeof CollaborationGroup>, role: CollaboratorRole = "editor") {
    return createInviteLink(collaborationGroup, role, {});
  }

  /**
   * Get user's role in a collaboration group
   */
  static getUserRole(
    collaborationGroup: co.loaded<typeof CollaborationGroup>,
    userAccount: co.loaded<typeof MyAppAccount>
  ): CollaboratorRole | null {
    if (!collaborationGroup.collaborators) return null;
    
    const collaborator = collaborationGroup.collaborators.find(
      (c) => c?.account?.id === userAccount.id
    );

    return collaborator?.role ?? null;
  }

  /**
   * Check if a user can perform a specific action
   */
  static canUserPerformAction(
    collaborationGroup: co.loaded<typeof CollaborationGroup>,
    userAccount: co.loaded<typeof MyAppAccount>,
    action: string
  ): boolean {
    if (!collaborationGroup.collaborators) return false;
    
    const collaborator = collaborationGroup.collaborators.find(
      (c) => c?.account?.id === userAccount.id
    );

    if (!collaborator || !collaborator.permissions) return false;

    // Owners can do everything
    if (collaborator.role === "owner") return true;

    // Check specific permission based on action
    switch (action) {
      case "canCreatePosts":
        return collaborator.permissions.canCreatePosts;
      case "canEditPosts":
        return collaborator.permissions.canEditPosts;
      case "canDeletePosts":
        return collaborator.permissions.canDeletePosts;
      case "canManageAccounts":
        return collaborator.permissions.canManageAccounts;
      case "canInviteOthers":
        return collaborator.permissions.canInviteOthers;
      case "canManageSubscription":
        return collaborator.permissions.canManageSubscription;
      default:
        return false;
    }
  }

  /**
   * Get default permissions for a role
   */
  static getDefaultPermissionsForRole(role: CollaboratorRole) {
    switch (role) {
      case "owner":
        return {
          canCreatePosts: true,
          canEditPosts: true,
          canDeletePosts: true,
          canManageAccounts: true,
          canInviteOthers: true,
          canManageSubscription: true,
        };
      case "admin":
        return {
          canCreatePosts: true,
          canEditPosts: true,
          canDeletePosts: true,
          canManageAccounts: true,
          canInviteOthers: true,
          canManageSubscription: false,
        };
      case "editor":
        return {
          canCreatePosts: true,
          canEditPosts: true,
          canDeletePosts: false,
          canManageAccounts: false,
          canInviteOthers: false,
          canManageSubscription: false,
        };
      case "viewer":
        return {
          canCreatePosts: false,
          canEditPosts: false,
          canDeletePosts: false,
          canManageAccounts: false,
          canInviteOthers: false,
          canManageSubscription: false,
        };
      default:
        return {
          canCreatePosts: false,
          canEditPosts: false,
          canDeletePosts: false,
          canManageAccounts: false,
          canInviteOthers: false,
          canManageSubscription: false,
        };
    }
  }

  /**
   * Track email invite
   */
  static addEmailInvite(collaborationGroup: co.loaded<typeof CollaborationGroup>, email: string) {
    if (collaborationGroup.invitedEmails && !collaborationGroup.invitedEmails.includes(email)) {
      collaborationGroup.invitedEmails.push(email);
    }
  }

  /**
   * Remove email from invited list
   */
  static removeEmailInvite(collaborationGroup: co.loaded<typeof CollaborationGroup>, email: string) {
    if (collaborationGroup.invitedEmails) {
      const index = collaborationGroup.invitedEmails.indexOf(email);
      if (index > -1) {
        collaborationGroup.invitedEmails.splice(index, 1);
      }
    }
  }
} 