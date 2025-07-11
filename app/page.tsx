"use client";

import { useState, useEffect } from "react";
import { Button, Dialog, TextField, TextArea } from "@radix-ui/themes";
import { Plus, Edit3, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navigation from "../components/navigation";
import AccountGroupCreation from "../components/account-group-creation";
import { AccountGroup, AccountGroupType, PlatformAccount, MyAppAccount, AccountRoot, Post } from "./schema";
import { useAccount, useAcceptInvite } from "jazz-react";
import { ID } from "jazz-tools";
import { co } from "jazz-tools";

// =============================================================================
// 🏢 ACCOUNT GROUP MANAGEMENT (JAZZ INTEGRATED)
// =============================================================================

interface LegacyAccountGroup {
  id: string;
  name: string;
  accounts: Record<string, {
    id: string;
    platform: string;
    name: string;
    profileKey?: string;
    isLinked?: boolean;
    status?: "pending" | "linked" | "error" | "expired";
    // Legacy fields for backward compatibility
    apiUrl?: string;
    avatar?: string;
    username?: string;
    displayName?: string;
    url?: string;
  }>;
  posts: any[];
}

// Legacy account groups (keeping for now)
export const accountGroup1: LegacyAccountGroup = {
  id: "1",
  name: "Demo Account Group",
  accounts: {
    sammiisparkle_ig: {
      id: "1",
      platform: "instagram",
      name: "sammiisparkle",
      profileKey: "demo-profile-key-123",
      isLinked: true,
      status: "linked",
      avatar: "/icons8-instagram.svg",
      username: "@sammiisparkle",
      displayName: "Sammii Sparkle",
      url: "https://instagram.com/sammiisparkle",
    },
    sammii_x: {
      id: "2", 
      platform: "x",
      name: "sammii",
      profileKey: "demo-profile-key-123",
      isLinked: true,
      status: "linked",
      avatar: "/icons8-twitter.svg",
      username: "@sammii",
      displayName: "Sammii",
      url: "https://x.com/sammii",
    },
    sammii_yt: {
      id: "3",
      platform: "youtube", 
      name: "Sammii's Channel",
      profileKey: "demo-profile-key-123",
      isLinked: false,
      status: "pending",
      avatar: "/icons8-youtube-logo.svg",
      username: "@sammiischannel",
      displayName: "Sammii's Channel",
      url: "https://youtube.com/@sammiischannel",
    },
  },
  posts: []
};

export const accountGroups: Record<string, LegacyAccountGroup> = {
  "1": accountGroup1,
};

export default function HomePage() {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [showCreateAccountGroupDialog, setShowCreateAccountGroupDialog] = useState(false);
  
  // =============================================================================
  // 🎵 JAZZ ACCOUNT INTEGRATION (WITH PROPER LOADING)
  // =============================================================================
  
  // First, get the account without deep resolution to initialize root if needed
  const { me: basicAccount, logOut } = useAccount(MyAppAccount);

  // =============================================================================
  // 🔧 JAZZ ROOT INITIALIZATION
  // =============================================================================
  useEffect(() => {
    const initializeRoot = async () => {
      if (basicAccount && !basicAccount.root) {
        console.log('Jazz account exists but root is missing - initializing...');
        try {
          // Create a new AccountRoot with properly initialized empty co-list
          const newRoot = AccountRoot.create({
            accountGroups: co.list(AccountGroup).create([], { owner: basicAccount })
          }, { owner: basicAccount });
          
          // Assign the root to the account
          basicAccount.root = newRoot;
          
          console.log('✅ Jazz root initialized successfully');
        } catch (error) {
          console.error('❌ Failed to initialize Jazz root:', error);
        }
      }
    };

    initializeRoot();
  }, [basicAccount]);

  // Now get the account with deep loading for collaborative data
  const { me } = useAccount(MyAppAccount, {
    resolve: basicAccount?.root ? {
      root: {
        accountGroups: { $each: {
          accounts: { $each: true },
          posts: { $each: true }
        }}
      }
    } : undefined
  });

  // Use the deeply loaded account if available, otherwise use basic account
  const currentAccount = me || basicAccount;

  // Debug logging to understand what's happening with accounts
  useEffect(() => {
    console.log('🎵 Jazz Account Status:');
    console.log('- Account exists:', !!currentAccount);
    console.log('- Account ID:', currentAccount?.id);
    console.log('- Root exists:', !!currentAccount?.root);
    console.log('- Account groups count:', currentAccount?.root?.accountGroups?.length || 0);
    
    // Debug the actual account groups
    if (currentAccount?.root?.accountGroups) {
      console.log('- Account groups details:', currentAccount.root.accountGroups.map((g: any) => ({
        id: g.id,
        name: g.name,
        accountsCount: g.accounts?.length || 0
      })));
    }
    
    if (currentAccount) {
      // Store account ID in localStorage for debugging
      localStorage.setItem('lastJazzAccountId', currentAccount.id);
      const previousAccountId = localStorage.getItem('previousJazzAccountId');
      console.log('- Previous account ID:', previousAccountId);
      console.log('- Same account as before:', previousAccountId === currentAccount.id);
      localStorage.setItem('previousJazzAccountId', currentAccount.id);
    }
  }, [currentAccount, currentAccount?.root?.accountGroups]); // Add dependency on account groups

  const handleCreatePost = async () => {
    // For now, just navigate to the demo account group
    router.push(`/account-group/1`);
  };

  const handleSaveAccountGroup = async (groupData: {
    name: string;
    accounts: Array<{
      platform: string;
      name: string;
      profileKey?: string;
      isLinked: boolean;
      status: "pending" | "linked" | "error" | "expired";
      lastError?: string;
    }>;
  }) => {
    console.log('🎯 SAVING ACCOUNT GROUP - START');
    console.log('Jazz Account Group data received:', groupData);
    console.log('Jazz account connected:', !!currentAccount);
    console.log('Jazz account ID:', currentAccount?.id);
    console.log('Jazz root exists:', !!currentAccount?.root);
    console.log('Current account groups before save:', currentAccount?.root?.accountGroups?.length || 0);
    
    if (!currentAccount || !currentAccount.root) {
      console.error('❌ Jazz account or root not available');
      return;
    }

    try {
      console.log('🔧 Creating Jazz AccountGroup...');
      
      // Create Jazz AccountGroup with properly initialized empty co-lists
      const jazzAccountGroup = AccountGroup.create({
        name: groupData.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        accounts: co.list(PlatformAccount).create([], { owner: currentAccount }),
        posts: co.list(Post).create([], { owner: currentAccount }),
        description: undefined,
        tags: undefined,
        ayrshareProfileKey: undefined,
        ayrshareProfileTitle: undefined,
      }, { owner: currentAccount });

      console.log('✅ Jazz AccountGroup created:', jazzAccountGroup.id);

      // Add accounts to the collaborative list after creation
      console.log('🔧 Adding accounts to group...');
      groupData.accounts.forEach((accountData, index) => {
        console.log(`Adding account ${index + 1}:`, accountData.name);
        const platformAccount = PlatformAccount.create({
          name: accountData.name,
          platform: accountData.platform as any,
          apiUrl: undefined,
          profileKey: accountData.profileKey,
          isLinked: accountData.isLinked,
          linkedAt: accountData.isLinked ? new Date() : undefined,
          avatar: undefined,
          username: undefined,
          displayName: undefined,
          url: undefined,
          status: accountData.status,
          lastError: accountData.lastError,
        }, { owner: currentAccount });

        jazzAccountGroup.accounts.push(platformAccount);
        console.log(`✅ Account ${index + 1} added successfully`);
      });

      console.log('🔧 Adding account group to root...');
      console.log('Root account groups before push:', currentAccount.root.accountGroups.length);
      
      // Add the account group to the root
      currentAccount.root.accountGroups.push(jazzAccountGroup);
      
      console.log('✅ Account group added to root');
      console.log('Root account groups after push:', currentAccount.root.accountGroups.length);

      console.log('✅ Jazz Account Group created successfully!');
      console.log('Jazz Account Group ID:', jazzAccountGroup.id);
      console.log('Total account groups:', currentAccount.root.accountGroups.length);
      
      // Wait for Jazz to sync the data
      console.log('⏳ Waiting for Jazz sync...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if data is still there after sync wait
      console.log('🔄 Post-sync check - Account groups count:', currentAccount?.root?.accountGroups?.length || 0);
      
      // Force a small delay to let Jazz sync
      setTimeout(() => {
        console.log('🔄 Post-save check - Account groups count:', currentAccount?.root?.accountGroups?.length || 0);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to create Jazz account group:', error);
    }
    
    // Close dialog
    setShowCreateAccountGroupDialog(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Succulent</h1>
            <p className="text-gray-600 mt-1">
              Manage your social media accounts and create engaging content
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={handleCreatePost}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowCreateAccountGroupDialog(true)}
            >
              <Edit3 className="w-4 h-4 mr-2" />
              New Account Group
            </Button>
          </div>
        </div>

        {/* Account Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Legacy Account Groups */}
          {Object.entries(accountGroups).map(([id, group]) => (
            <Link key={id} href={`/account-group/${id}`}>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{group.name}</h3>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {Object.keys(group.accounts).length} accounts connected
                  </p>
                  <p className="text-sm text-gray-600">
                    {group.posts.length} posts created
                  </p>
                </div>

                <div className="flex -space-x-2 mt-4">
                  {Object.values(group.accounts).slice(0, 3).map((account, index) => (
                    <div 
                      key={index}
                      className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center"
                    >
                      <span className="text-xs font-medium">
                        {account.platform.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {Object.keys(group.accounts).length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        +{Object.keys(group.accounts).length - 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}

          {/* Jazz Account Groups - Persistent Display */}
          {currentAccount?.root?.accountGroups?.map((group: any, index: number) => (
            <div key={group.id || `jazz-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{group.name}</h3>
                <div className="w-2 h-2 bg-blue-500 rounded-full" title="Jazz Collaborative"></div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {group.accounts?.length || 0} accounts connected
                </p>
                <p className="text-sm text-gray-600">
                  {group.posts?.length || 0} posts created
                </p>
                <p className="text-xs text-blue-600">
                  ✨ Collaborative account group
                </p>
              </div>

              <div className="flex -space-x-2 mt-4">
                {group.accounts?.slice(0, 3).map((account: any, accountIndex: number) => (
                  <div 
                    key={account?.id || accountIndex}
                    className="w-8 h-8 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center"
                  >
                    <span className="text-xs font-medium text-blue-700">
                      {account?.platform?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                ))}
                {(group.accounts?.length || 0) > 3 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-200 flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-700">
                      +{(group.accounts?.length || 0) - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Create New Card */}
          <button
            onClick={() => setShowCreateAccountGroupDialog(true)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 border-dashed p-6 hover:shadow-md transition-shadow text-center"
          >
            <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Create Account Group</h3>
            <p className="text-sm text-gray-500">
              Connect your social media accounts
            </p>
          </button>
        </div>

        {/* Jazz Account Status */}
        {!currentAccount && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              🎵 Connecting to Jazz collaborative system...
            </p>
          </div>
        )}

        {currentAccount && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              ✅ Jazz Foundation Complete! Account: {currentAccount.id}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              🎯 Account system connected | Freeform account creation working | Ayrshare ready
            </p>
            <p className="text-xs text-blue-500 mt-1">
              📋 Ready: Create account groups that persist across sessions! 🚀
            </p>
          </div>
        )}

        {/* Create Post Dialog */}
        <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <Dialog.Content style={{ maxWidth: 450 }}>
            <Dialog.Title>Create New Post</Dialog.Title>
            <Dialog.Description>
              Create a new post for your social media accounts
            </Dialog.Description>

            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Post Title</label>
                <TextField.Root
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Enter post title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <TextArea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="soft" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePost}>
                Create Post
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Root>

        {/* Account Group Creation Dialog */}
        <AccountGroupCreation
          isOpen={showCreateAccountGroupDialog}
          onOpenChange={setShowCreateAccountGroupDialog}
          onSave={handleSaveAccountGroup}
        />
      </div>
    </div>
  );
}
