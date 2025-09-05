"use client";

import { useState, useEffect } from "react";
import { Dialog, TextField, TextArea } from "@radix-ui/themes";
import { Button } from "@/components/atoms/button";
import { Plus, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AccountGroupCreation from "@/components/organisms/account-group-creation";
import ProfileMigrationManager from "@/components/organisms/profile-migration-manager";
import { AccountGroup, PlatformAccount, MyAppAccount, Post, AnalyticsDataPoint } from "@/app/schema";
import { useAccount } from "jazz-tools/react";
import { Group } from "jazz-tools";
import { co } from "jazz-tools";
import { AccountRoot } from "@/app/schema";

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

// Legacy account groups (removed - no longer needed after demo cleanup)
export const accountGroups: Record<string, LegacyAccountGroup> = {};

export default function HomePage() {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [showCreateAccountGroupDialog, setShowCreateAccountGroupDialog] = useState(false);
  const [isCreatingAccountGroup, setIsCreatingAccountGroup] = useState(false);
  const [accountGroupsUpdateTrigger, setAccountGroupsUpdateTrigger] = useState(0);
  
  // =============================================================================
  // 🎵 JAZZ ACCOUNT INTEGRATION (WITH PROPER LOADING)
  // =============================================================================

  // Get the account with proper loading configuration
  const { me } = useAccount(MyAppAccount, { 
    resolve: {
      root: {
        accountGroups: { $each: true }
      },
      profile: true
    }
  });

  // Debug logging for account state
  useEffect(() => {
    if (me) {
      console.log('🎵 Jazz Account State:', {
        hasMe: !!me,
        hasRoot: !!me.root,
        hasAccountGroups: !!me.root?.accountGroups,
        accountGroupsLength: me.root?.accountGroups?.length || 0,
        accountGroups: me.root?.accountGroups,
        rootOwner: me.root?._owner?.id,
        accountOwner: me.id
      });
    }
  }, [me, accountGroupsUpdateTrigger]);

  // Debug function to check and fix root ownership
  const debugRootOwnership = () => {
    if (!me || !me.root) {
      console.log('❌ No account or root available for debugging');
      return;
    }

    console.log('🔍 Debugging root ownership...');
    console.log('Account ID:', me.id);
    console.log('Root owner:', me.root._owner?.id);
    console.log('Account groups list owner:', me.root.accountGroups?._owner?.id);
    console.log('Account groups count:', me.root.accountGroups?.length || 0);
    
    // Check if ownership is correct
    if (me.root._owner?.id === me.id) {
      console.log('✅ Root ownership is correct');
    } else {
      console.log('❌ Root ownership is incorrect - should be account ID');
    }
    
    if (me.root.accountGroups?._owner?.id === me.id) {
      console.log('✅ Account groups list ownership is correct');
    } else {
      console.log('❌ Account groups list ownership is incorrect - should be account ID');
    }
  };

  // Function to attempt to fix ownership issues
  const fixRootOwnership = async () => {
    if (!me) {
      console.log('❌ No account available for fixing');
      return;
    }

    console.log('🔧 Attempting to fix root ownership...');
    
    try {
      // Check if we need to recreate the root
      if (me.root && me.root._owner?.id !== me.id) {
        console.log('🔄 Recreating root with correct ownership...');
        
        // Create new root with account as owner
        const newRoot = AccountRoot.create({
          accountGroups: co.list(AccountGroup).create([], { owner: me }),
        }, { owner: me });
        
        // Replace the old root
        me.root = newRoot;
        
        console.log('✅ Root ownership fixed');
        console.log('New root owner:', me.root._owner?.id);
        
        // Force a re-render
        setAccountGroupsUpdateTrigger(prev => prev + 1);
        
        alert('Root ownership has been fixed! Please try creating an account group again.');
      } else {
        console.log('✅ Root ownership is already correct');
        alert('Root ownership is already correct. No fix needed.');
      }
    } catch (error) {
      console.error('❌ Failed to fix root ownership:', error);
      alert(`Failed to fix root ownership: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreatePost = async () => {
    // Prompt user to create an account group first
    alert('Please create an account group first to start creating posts.');
    setShowCreateAccountGroupDialog(true);
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
    ayrshareProfileKey?: string;
    ayrshareProfileTitle?: string;
  }) => {
    setIsCreatingAccountGroup(true);
    console.log('🎯 SAVING ACCOUNT GROUP - START');
    console.log('Jazz Account Group data received:', groupData);
    console.log('Jazz account connected:', !!me);
    console.log('Jazz account ID:', me?.id);
    console.log('Jazz root exists:', !!me?.root);
    console.log('Current account groups before save:', me?.root?.accountGroups?.length || 0);
    
    // Check if Jazz system is ready with enhanced error handling
    if (!me) {
      console.error('❌ No Jazz account available');
      alert('Jazz account not available. Please refresh the page and try again. If the issue persists, clear your browser data and reload.');
      setIsCreatingAccountGroup(false);
      return;
    }
    
    if (!me.root) {
      console.error('❌ Jazz account root not initialized');
      console.log('🔍 Account state:', {
        hasMe: !!me,
        accountId: me.id,
        hasRoot: !!me.root
      });
      alert('Jazz account root not initialized. This can happen on first login. Please refresh the page and try again.');
      setIsCreatingAccountGroup(false);
      return;
    }
    
    if (!me.root.accountGroups) {
      console.error('❌ Jazz account groups list not ready');
      console.log('🔍 Root state:', {
        hasRoot: !!me.root,
        rootId: me.root?.id,
        hasAccountGroups: !!me.root?.accountGroups
      });
      
      // Try to initialize account groups if they're missing
      try {
        console.log('🔧 Attempting to initialize account groups...');
        me.root.accountGroups = co.list(AccountGroup).create([], { owner: me });
        console.log('✅ Account groups initialized successfully');
      } catch (initError) {
        console.error('❌ Failed to initialize account groups:', initError);
        alert('Unable to initialize account groups. Please refresh the page and try again. If the issue persists, try logging out and logging back in.');
        setIsCreatingAccountGroup(false);
        return;
      }
    }

    try {
      // Create a new group to manage permissions for the account group itself
      const accountGroupGroup = Group.create();
      
      // Add server worker permissions to account group for API integration
      if (process.env.NEXT_PUBLIC_JAZZ_WORKER_ACCOUNT) {
        try {
          const { Account } = await import('jazz-tools');
          const serverWorker = await Account.load(process.env.NEXT_PUBLIC_JAZZ_WORKER_ACCOUNT);
          console.log('✅ Server worker added to account group:', serverWorker);
          if (serverWorker) {
            accountGroupGroup.addMember(serverWorker, 'writer');
          }
        } catch (workerError) {
          // Worker permissions will be added server-side during API calls
          console.error('❌ Failed to add server worker to account group:', workerError);
        }
      }
      
      // Create Jazz AccountGroup with properly initialized empty co-lists
      const jazzAccountGroup = AccountGroup.create({
        name: groupData.name,
        createdAt: new Date(),
        updatedAt: new Date(),
        accounts: co.list(PlatformAccount).create([], { owner: accountGroupGroup }),
        posts: co.list(Post).create([], { owner: accountGroupGroup }),
        description: undefined,
        tags: undefined,
        ayrshareProfileKey: groupData.ayrshareProfileKey,
        ayrshareProfileTitle: groupData.ayrshareProfileTitle,
      }, { owner: accountGroupGroup });

      console.log('✅ Jazz AccountGroup created:', jazzAccountGroup.id);
      console.log('✅ AccountGroup owner:', accountGroupGroup.id);

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
          historicalAnalytics: co.list(AnalyticsDataPoint).create([], { owner: accountGroupGroup }),
        }, { owner: accountGroupGroup });

        jazzAccountGroup.accounts.push(platformAccount);
        console.log(`✅ Account ${index + 1} added successfully`);
      });

      console.log('🔧 Adding account group to root...');
      console.log('Root account groups before push:', me.root.accountGroups?.length || 0);
      console.log('Root owner:', me.root._owner?.id);
      
      // Ensure the account groups list exists and add the new group
      if (me.root.accountGroups) {
        // Add the account group to the root's account groups list
        me.root.accountGroups.push(jazzAccountGroup);
        console.log('✅ Account group added to root');
        console.log('Root account groups after push:', me.root.accountGroups?.length || 0);
        
        // Verify the account group is actually in the list
        const foundGroup = me.root.accountGroups.find((group: any) => group?.id === jazzAccountGroup.id);
        console.log('🔍 Verification - Group found in root:', !!foundGroup);
        console.log('🔍 Verification - Group ID match:', foundGroup?.id === jazzAccountGroup.id);
        
        if (!foundGroup) {
          throw new Error('Account group was not properly added to root');
        }

        // Additional verification - check if the group persists after a small delay
        console.log('⏳ Verifying persistence...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const persistenceCheck = me.root.accountGroups.find((group: any) => group?.id === jazzAccountGroup.id);
        console.log('🔍 Persistence check - Group still in root:', !!persistenceCheck);
        
        if (!persistenceCheck) {
          console.warn('⚠️ Account group was not persistent - ownership issue suspected');
          console.log('🔍 Debug info:', {
            accountId: me.id,
            rootOwner: me.root._owner?.id,
            accountGroupsOwner: me.root.accountGroups._owner?.id,
            jazzAccountGroupOwner: jazzAccountGroup._owner?.id
          });
        }
      } else {
        throw new Error('Account groups list is not available');
      }

      console.log('✅ Jazz Account Group created successfully!');
      console.log('Jazz Account Group ID:', jazzAccountGroup.id);
      console.log('Total account groups:', me.root.accountGroups?.length || 0);
      
      // Wait for Jazz to sync the data
      console.log('⏳ Waiting for Jazz sync...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify the data was saved
      const finalCount = me.root.accountGroups?.length || 0;
      console.log('🔄 Final account groups count:', finalCount);
      
      // Log all account groups for debugging
      if (me.root.accountGroups) {
        console.log('📋 All account groups after creation:', me.root.accountGroups.map((group: any, index: number) => ({
          index,
          id: group?.id,
          name: group?.name,
          accountsCount: group?.accounts?.length || 0,
          postsCount: group?.posts?.length || 0,
          owner: group?._owner?.id
        })));
      }
      
      if (finalCount > 0) {
        console.log('✅ Account group successfully saved to Jazz!');
        alert(`Account group "${groupData.name}" created successfully!`);
        
        // Force a re-render by updating state
        setAccountGroupsUpdateTrigger(prev => prev + 1);
        
        setTimeout(() => {
          console.log('🔄 Post-alert account groups count:', me.root.accountGroups?.length || 0);
        }, 100);
      } else {
        console.error('❌ Account group was not saved properly');
        alert('Account group was created but not saved properly. Please try again.');
      }
      
    } catch (error) {
      console.error('❌ Failed to create Jazz account group:', error);
      alert(`Failed to create account group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingAccountGroup(false);
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
              <Button 
                onClick={() => {
                  setShowCreateAccountGroupDialog(true);
                }}
                intent="primary"
                className="flex items-center gap-2"
                disabled={isCreatingAccountGroup}
              >
                {isCreatingAccountGroup ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Account Group
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Profile Migration Manager */}
          {me?.root?.accountGroups && (
            <div className="mb-6">
              <ProfileMigrationManager 
                accountGroups={me.root.accountGroups.filter(group => group !== null && group !== undefined)}
                onMigrationComplete={() => {
                  // Refresh the page or update state after migration
                  console.log('Migration completed!');
                }}
              />
            </div>
          )}

          {/* Jazz System Status */}
          {me && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-800">
                    Jazz System Status
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="soft" 
                    size="1"
                    onClick={debugRootOwnership}
                  >
                    🔍 Debug
                  </Button>
                  {me.root && me.root._owner?.id !== me.id && (
                    <Button 
                      variant="soft" 
                      color="red"
                      size="1"
                      onClick={fixRootOwnership}
                    >
                      🔧 Fix Ownership
                    </Button>
                  )}
                  <Button 
                    variant="soft" 
                    size="1"
                    onClick={() => setAccountGroupsUpdateTrigger(prev => prev + 1)}
                  >
                    🔄 Refresh
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-blue-700">
                <p>✅ Account connected: {me.id}</p>
                <p>✅ Root initialized: {me.root ? 'Yes' : 'No'}</p>
                <p>✅ Root owner: {me.root?._owner?.id === me.id ? 'Account' : 'Other'}</p>
                <p className="font-medium">📊 Account groups: {me.root?.accountGroups?.length || 0}</p>
                {isCreatingAccountGroup && (
                  <p className="text-blue-600 font-medium">🔄 Creating account group...</p>
                )}
                {!me.root && (
                  <p className="text-orange-600 font-medium">⚠️ Account root not initialized yet</p>
                )}
                {me.root && !me.root.accountGroups && (
                  <p className="text-orange-600 font-medium">⚠️ Account groups list not ready yet</p>
                )}
                {me.root && me.root._owner?.id !== me.id && (
                  <p className="text-red-600 font-medium">🚨 Root ownership issue detected!</p>
                )}
              </div>
            </div>
          )}

          {/* Account Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">


            {/* Jazz Account Groups - Persistent Display */}
            {me?.root?.accountGroups && me.root.accountGroups.map((group: any, index: number) => {
              // Debug logging for account groups
              console.log(`🔍 Account Group ${index}:`, {
                id: group?.id,
                name: group?.name,
                hasId: !!group?.id,
                hasName: !!group?.name,
                keys: Object.keys(group || {}),
                fullObject: group
              });
              
              // Make sure the group has a valid name (temporarily relaxed ID check)
              if (!group?.name) {
                console.log(`❌ Skipping group ${index} - missing name`, { id: group?.id, name: group?.name });
                return null;
              }
              
              // Use index as fallback ID if Jazz ID is not immediately available
              const groupId = group?.id || `jazz-${index}-${group.name?.replace(/\s+/g, '-')}`;
              console.log(`✅ Rendering group ${index} with ID: ${groupId}`);
              
              return (
                <Link key={groupId} href={`/account-group/${groupId}`}>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => console.log(`🔗 Clicking on account group: ${groupId}`)}>
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
                      {(group.accounts || []).slice(0, 3).map((account: any, accountIndex: number) => (
                        <div 
                          key={account?.id || accountIndex}
                          className="w-8 h-8 rounded-full border-2 border-white bg-lime-100 flex items-center justify-center"
                        >
                          <span className="text-xs font-medium text-lime-700">
                            {account?.platform?.charAt(0).toUpperCase() || '?'}
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
              );
            })}

            {/* Create New Card */}
            <button
              onClick={() => setShowCreateAccountGroupDialog(true)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 border-dashed p-6 hover:shadow-md hover:border-lime-300 transition-all text-center"
              disabled={!me?.root?.accountGroups}
            >
              <Plus className="w-8 h-8 text-lime-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Create Account Group</h3>
              <p className="text-sm text-gray-500">
                {me?.root?.accountGroups 
                  ? "Connect your social media accounts"
                  : "Loading Jazz system..."
                }
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
          {me && <AccountGroupCreation
            isOpen={showCreateAccountGroupDialog}
            onOpenChange={setShowCreateAccountGroupDialog}
            onSave={handleSaveAccountGroup}
          />}
        </div>
      </div>
    </div>
  );
}
