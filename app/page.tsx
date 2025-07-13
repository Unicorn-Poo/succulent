"use client";

import { useState, useEffect } from "react";
import { Dialog, TextField, TextArea } from "@radix-ui/themes";
import { Button } from "@/components/atoms/button";
import { Plus, Edit3, Home, BarChart3, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AccountGroupCreation from "@/components/organisms/account-group-creation";
import { AccountGroup, AccountGroupType, PlatformAccount, MyAppAccount, AccountRoot, Post } from "@/app/schema";
import { useAccount, useAcceptInvite } from "jazz-react";
import { Group, ID } from "jazz-tools";
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
  posts: [
    {
      id: "demo-post-1",
      title: "Welcome to Succulent! 🌱",
      content: "Excited to launch our new social media management platform! Create, schedule, and manage all your content from one place. #SocialMediaMarketing #Succulent",
      platforms: ["instagram", "x"],
      status: "published",
      publishedAt: "2024-01-15T10:30:00Z",
      engagement: {
        likes: 142,
        comments: 23,
        shares: 8
      }
    },
    {
      id: "demo-post-2", 
      title: "Tips for Better Social Media Content",
      content: "💡 Pro tip: Consistency is key! Post regularly and engage with your audience. Quality content builds lasting relationships. What's your favorite content creation tip?",
      platforms: ["instagram", "x", "youtube"],
      status: "published", 
      publishedAt: "2024-01-12T14:15:00Z",
      engagement: {
        likes: 89,
        comments: 15,
        shares: 12
      }
    },
    {
      id: "demo-post-3",
      title: "Behind the Scenes",
      content: "Working late into the night building something amazing! The Succulent team is passionate about helping creators and businesses thrive online. 🚀",
      platforms: ["instagram"],
      status: "scheduled",
      scheduledFor: "2024-01-20T09:00:00Z",
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0
      }
    }
  ]
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

  // Now get the account with deep loading for collaborative data
  const { me } = useAccount(MyAppAccount, {
    resolve: {
      root: {
        accountGroups: { $each: {
          accounts: { $each: true },
          posts: { $each: true }
        }}
      }
    }
  });

  // Debug logging to understand what's happening with accounts
  useEffect(() => {
    if (me) {
      // Store account ID in localStorage for debugging
      localStorage.setItem('lastJazzAccountId', me.id);
      const previousAccountId = localStorage.getItem('previousJazzAccountId');
      localStorage.setItem('previousJazzAccountId', me.id);
    }
  }, [me, me?.root?.accountGroups]); // Add dependency on account groups

  const handleCreatePost = async () => {
    // Navigate to the demo account group page
    router.push(`/account-group/demo`);
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
    console.log('Jazz account connected:', !!me);
    console.log('Jazz account ID:', me?.id);
    console.log('Jazz root exists:', !!me?.root);
    console.log('Current account groups before save:', me?.root?.accountGroups?.length || 0);
    
    if (!me || !me.root) {
      console.error('❌ Jazz account or root not available');
      return;
    }

    try {

      // to manage permissions
      const accountGroupGroup = Group.create();
      
      // Create Jazz AccountGroup with properly initialized empty co-lists
      const jazzAccountGroup = AccountGroup.create({
        name: groupData.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        accounts: co.list(PlatformAccount).create([], { owner: accountGroupGroup }),
        posts: co.list(Post).create([], { owner: accountGroupGroup }),
        description: undefined,
        tags: undefined,
        ayrshareProfileKey: undefined,
        ayrshareProfileTitle: undefined,
      }, { owner: accountGroupGroup });

      // Add accounts to the collaborative list after creation
      groupData.accounts.forEach((accountData, index) => {
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
        }, { owner: accountGroupGroup });

        jazzAccountGroup.accounts.push(platformAccount);
        console.log(`✅ Account ${index + 1} added successfully`);
      });

      console.log('🔧 Adding account group to root...');
      console.log('Root account groups before push:', me.root.accountGroups.length);
      
      // Add the account group to the root
      me.root.accountGroups.push(jazzAccountGroup);
      
      console.log('✅ Account group added to root');
      console.log('Root account groups after push:', me.root.accountGroups.length);

      console.log('✅ Jazz Account Group created successfully!');
      console.log('Jazz Account Group ID:', jazzAccountGroup.id);
      console.log('Total account groups:', me.root.accountGroups.length);
      
      // Wait for Jazz to sync the data
      console.log('⏳ Waiting for Jazz sync...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if data is still there after sync wait
      console.log('🔄 Post-sync check - Account groups count:', me?.root?.accountGroups?.length || 0);
      
      // Force a small delay to let Jazz sync
      setTimeout(() => {
        console.log('🔄 Post-save check - Account groups count:', me?.root?.accountGroups?.length || 0);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to create Jazz account group:', error);
    }
    
    // Close dialog
    setShowCreateAccountGroupDialog(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Succulent 🌱</h1>
              <p className="text-gray-600">Your social media management platform</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/analytics-demo">
                <Button variant="soft" size="2">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics Demo
                </Button>
              </Link>
              <Link href="/paywall-demo">
                <Button variant="soft" size="2">
                  <Shield className="w-4 h-4 mr-2" />
                  Paywall Demo
                </Button>
              </Link>
                              <Button 
                  onClick={() => setShowCreateAccountGroupDialog(true)}
                  intent="primary"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Account Group
                </Button>
            </div>
          </div>

          {/* Account Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Legacy Account Groups */}
            {Object.entries(accountGroups).map(([id, group]) => (
              <Link key={id} href={`/account-group/demo`}>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">{group.name}</h3>
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Demo Account Group"></div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {Object.keys(group.accounts).length} accounts connected
                    </p>
                    <p className="text-sm text-gray-600">
                      {group.posts.length} posts created
                    </p>
                    <p className="text-xs text-green-600">
                      🎭 Demo account group
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
            {me?.root?.accountGroups?.map((group: any, index: number) => (
              <Link key={group.id || `jazz-${index}`} href={`/account-group/${group.id}`}>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">{group.name}</h3>
                    <div className="w-2 h-2 bg-lime-500 rounded-full" title="Jazz Collaborative"></div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      {group.accounts?.length || 0} accounts connected
                    </p>
                    <p className="text-sm text-gray-600">
                      {group.posts?.length || 0} posts created
                    </p>
                    <p className="text-xs text-lime-600">
                      ✨ Collaborative account group
                    </p>
                  </div>

                  <div className="flex -space-x-2 mt-4">
                    {group.accounts?.slice(0, 3).map((account: any, accountIndex: number) => (
                      <div 
                        key={account?.id || accountIndex}
                        						className="w-8 h-8 rounded-full border-2 border-white bg-lime-100 flex items-center justify-center"
                      >
                        <span className="text-xs font-medium text-lime-700">
                          {account?.platform?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {(group.accounts?.length || 0) > 3 && (
                      <div className="w-8 h-8 rounded-full border-2 border-white bg-lime-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-lime-700">
                          +{(group.accounts?.length || 0) - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            {/* Create New Card */}
            <button
              onClick={() => setShowCreateAccountGroupDialog(true)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 border-dashed p-6 hover:shadow-md hover:border-lime-300 transition-all text-center"
            >
              <Plus className="w-8 h-8 text-lime-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Create Account Group</h3>
              <p className="text-sm text-gray-500">
                Connect your social media accounts
              </p>
            </button>
          </div>

          {/* Jazz Account Status */}
          {!me && (
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                🎵 Connecting to Jazz collaborative system...
              </p>
            </div>
          )}

          {me && (
            <div className="mt-8 p-4 bg-lime-50 border border-lime-200 rounded-lg">
              <p className="text-lime-800">
                ✅ Jazz Foundation Complete! Account: {me.id}
              </p>
              <p className="text-xs text-lime-600 mt-1">
                🎯 Account system connected | Freeform account creation working | Ayrshare ready
              </p>
              <p className="text-xs text-lime-500 mt-1">
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
                <Button onClick={handleCreatePost} className="bg-lime-600 hover:bg-lime-700 text-white">
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
    </div>
  );
}
