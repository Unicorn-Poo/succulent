"use client";

import { useState } from "react";
import { Dialog, TextField, TextArea } from "@radix-ui/themes";
import { Button } from "@/components/atoms/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import AccountGroupCreation from "@/components/organisms/account-group-creation";
import {
  AccountGroup,
  PlatformAccount,
  MyAppAccount,
  Post,
  AnalyticsDataPoint,
} from "@/app/schema";
import { useAccount } from "jazz-tools/react";
import { Group } from "jazz-tools";
import { co } from "jazz-tools";

export default function HomePage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [showCreateAccountGroupDialog, setShowCreateAccountGroupDialog] =
    useState(false);
  const [isCreatingAccountGroup, setIsCreatingAccountGroup] = useState(false);

  // =============================================================================
  // 🎵 JAZZ ACCOUNT INTEGRATION (WITH PROPER LOADING)
  // =============================================================================

  // Get the account with proper loading configuration
  const { me } = useAccount(MyAppAccount, {
    resolve: {
      root: {
        accountGroups: { $each: true },
      },
      profile: true,
    },
  });

  const handleCreatePost = async () => {
    // Prompt user to create an account group first
    alert("Please create an account group first to start creating posts.");
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
    console.log("🎯 SAVING ACCOUNT GROUP - START");
    console.log("Jazz Account Group data received:", groupData);
    console.log("Jazz account connected:", !!me);
    console.log("Jazz account ID:", me?.id);
    console.log("Jazz root exists:", !!me?.root);
    console.log(
      "Current account groups before save:",
      me?.root?.accountGroups?.length || 0
    );

    // Check if Jazz system is ready with enhanced error handling
    if (!me) {
      console.error("❌ No Jazz account available");
      alert(
        "Jazz account not available. Please refresh the page and try again. If the issue persists, clear your browser data and reload."
      );
      setIsCreatingAccountGroup(false);
      return;
    }

    if (!me.root) {
      console.error("❌ Jazz account root not initialized");
      console.log("🔍 Account state:", {
        hasMe: !!me,
        accountId: me.id,
        hasRoot: !!me.root,
      });
      alert(
        "Jazz account root not initialized. This can happen on first login. Please refresh the page and try again."
      );
      setIsCreatingAccountGroup(false);
      return;
    }

    if (!me.root.accountGroups) {
      console.error("❌ Jazz account groups list not ready");
      console.log("🔍 Root state:", {
        hasRoot: !!me.root,
        rootId: me.root?.id,
        hasAccountGroups: !!me.root?.accountGroups,
      });

      // Try to initialize account groups if they're missing
      try {
        console.log("🔧 Attempting to initialize account groups...");
        me.root.accountGroups = co.list(AccountGroup).create([], { owner: me });
        console.log("✅ Account groups initialized successfully");
      } catch (initError) {
        console.error("❌ Failed to initialize account groups:", initError);
        alert(
          "Unable to initialize account groups. Please refresh the page and try again. If the issue persists, try logging out and logging back in."
        );
        setIsCreatingAccountGroup(false);
        return;
      }
    }

    try {
      // Create a new group to manage permissions for the account group itself
      const accountGroupGroup = Group.create();

      // Add server worker permissions to account group for API integration
      console.log("🔍 Server worker environment check:", {
        hasEnvVar: !!process.env.NEXT_PUBLIC_JAZZ_WORKER_ACCOUNT,
        workerAccountId: process.env.NEXT_PUBLIC_JAZZ_WORKER_ACCOUNT,
      });

      if (process.env.NEXT_PUBLIC_JAZZ_WORKER_ACCOUNT) {
        try {
          console.log("📥 Loading server worker account on client side...");
          const { Account } = await import("jazz-tools");
          const serverWorker = await Account.load(
            process.env.NEXT_PUBLIC_JAZZ_WORKER_ACCOUNT
          );

          console.log("🔍 Server worker load result:", {
            workerExists: !!serverWorker,
            workerId: serverWorker?.id,
            workerProfile: serverWorker?.profile?.name,
          });

          if (serverWorker) {
            console.log(
              "🔧 Adding server worker to account group:",
              serverWorker.id
            );
            accountGroupGroup.addMember(serverWorker, "writer");
            console.log(
              "✅ Server worker added to account group with writer permissions"
            );

            // Verify the addition worked
            console.log(
              "🔍 Verification - account group members after adding worker"
            );
          } else {
            console.error(
              "❌ Server worker account could not be loaded - this will prevent API access"
            );
            console.error(
              "💡 The account group will be created but API calls will fail"
            );
          }
        } catch (workerError) {
          console.error(
            "❌ Failed to add server worker to account group:",
            workerError
          );
          console.error(
            "💡 This error means API calls to this account group will fail"
          );
          console.error(
            '🔧 You can fix this later using the "Fix API Access" button'
          );
          // Continue with account group creation - server worker permissions will be added server-side during API calls
        }
      } else {
        console.warn(
          "⚠️ NEXT_PUBLIC_JAZZ_WORKER_ACCOUNT not configured - server worker permissions will be added server-side during API calls"
        );
      }

      // Create Jazz AccountGroup with properly initialized empty co-lists
      const jazzAccountGroup = AccountGroup.create(
        {
          name: groupData.name,
          createdAt: new Date(),
          updatedAt: new Date(),
          accounts: co
            .list(PlatformAccount)
            .create([], { owner: accountGroupGroup }),
          posts: co.list(Post).create([], { owner: accountGroupGroup }),
          description: undefined,
          tags: undefined,
          ayrshareProfileKey: groupData.ayrshareProfileKey,
          ayrshareProfileTitle: groupData.ayrshareProfileTitle,
        },
        { owner: accountGroupGroup }
      );

      console.log("✅ Jazz AccountGroup created:", jazzAccountGroup.id);
      console.log("✅ AccountGroup owner:", accountGroupGroup.id);

      // Add accounts to the collaborative list after creation
      groupData.accounts.forEach((accountData, index) => {
        const platformAccount = PlatformAccount.create(
          {
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
            historicalAnalytics: co
              .list(AnalyticsDataPoint)
              .create([], { owner: accountGroupGroup }),
          },
          { owner: accountGroupGroup }
        );

        jazzAccountGroup.accounts.push(platformAccount);
        console.log(`✅ Account ${index + 1} added successfully`);
      });

      console.log("🔧 Adding account group to root...");
      console.log(
        "Root account groups before push:",
        me.root.accountGroups?.length || 0
      );
      console.log("Root owner:", me.root._owner?.id);

      // Ensure the account groups list exists and add the new group
      if (me.root.accountGroups) {
        // Add the account group to the root's account groups list
        me.root.accountGroups.push(jazzAccountGroup);
        console.log("✅ Account group added to root");
        console.log(
          "Root account groups after push:",
          me.root.accountGroups?.length || 0
        );

        // Verify the account group is actually in the list
        const foundGroup = me.root.accountGroups.find(
          (group: any) => group?.id === jazzAccountGroup.id
        );
        console.log("🔍 Verification - Group found in root:", !!foundGroup);
        console.log(
          "🔍 Verification - Group ID match:",
          foundGroup?.id === jazzAccountGroup.id
        );

        if (!foundGroup) {
          throw new Error("Account group was not properly added to root");
        }

        // Additional verification - check if the group persists after a small delay
        console.log("⏳ Verifying persistence...");
        await new Promise((resolve) => setTimeout(resolve, 500));

        const persistenceCheck = me.root.accountGroups.find(
          (group: any) => group?.id === jazzAccountGroup.id
        );
        console.log(
          "🔍 Persistence check - Group still in root:",
          !!persistenceCheck
        );

        if (!persistenceCheck) {
          console.warn(
            "⚠️ Account group was not persistent - ownership issue suspected"
          );
          console.log("🔍 Debug info:", {
            accountId: me.id,
            rootOwner: me.root._owner?.id,
            accountGroupsOwner: me.root.accountGroups._owner?.id,
            jazzAccountGroupOwner: jazzAccountGroup._owner?.id,
          });
        }
      } else {
        throw new Error("Account groups list is not available");
      }

      console.log("✅ Jazz Account Group created successfully!");
      console.log("Jazz Account Group ID:", jazzAccountGroup.id);
      console.log("Total account groups:", me.root.accountGroups?.length || 0);

      // Wait for Jazz to sync the data
      console.log("⏳ Waiting for Jazz sync...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify the data was saved
      const finalCount = me.root.accountGroups?.length || 0;
      console.log("🔄 Final account groups count:", finalCount);

      // Log all account groups for debugging
      if (me.root.accountGroups) {
        console.log(
          "📋 All account groups after creation:",
          me.root.accountGroups.map((group: any, index: number) => ({
            index,
            id: group?.id,
            name: group?.name,
            accountsCount: group?.accounts?.length || 0,
            postsCount: group?.posts?.length || 0,
            owner: group?._owner?.id,
          }))
        );
      }

      if (finalCount > 0) {
        alert(`Account group "${groupData.name}" created successfully!`);
      } else {
        console.error("❌ Account group was not saved properly");
        alert(
          "Account group was created but not saved properly. Please try again."
        );
      }
    } catch (error) {
      console.error("❌ Failed to create Jazz account group:", error);
      alert(
        `Failed to create account group: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsCreatingAccountGroup(false);
    }

    // Close dialog
    setShowCreateAccountGroupDialog(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800">
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Image
                src="/succulent-namemark.png"
                alt="Succulent"
                width={280}
                height={64}
                className="h-12 sm:h-14 w-auto mb-2"
                priority
              />
              <p className="text-gray-600 dark:text-gray-400">
                Your social media management platform
              </p>
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

          {/* Account Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Jazz Account Groups - Persistent Display */}
            {me?.root?.accountGroups &&
              me.root.accountGroups.map((group: any, index: number) => {
                // Debug logging for account groups
                console.log(`🔍 Account Group ${index}:`, {
                  id: group?.id,
                  name: group?.name,
                  hasId: !!group?.id,
                  hasName: !!group?.name,
                  keys: Object.keys(group || {}),
                  fullObject: group,
                });

                // Make sure the group has a valid name (temporarily relaxed ID check)
                if (!group?.name) {
                  console.log(`❌ Skipping group ${index} - missing name`, {
                    id: group?.id,
                    name: group?.name,
                  });
                  return null;
                }

                // Use index as fallback ID if Jazz ID is not immediately available
                const groupId =
                  group?.id ||
                  `jazz-${index}-${group.name?.replace(/\s+/g, "-")}`;
                console.log(`✅ Rendering group ${index} with ID: ${groupId}`);

                return (
                  <Link key={groupId} href={`/account-group/${groupId}`}>
                    <div
                      className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() =>
                        console.log(`🔗 Clicking on account group: ${groupId}`)
                      }
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                          {group.name}
                        </h3>
                        <div
                          className="w-2 h-2 bg-lime-500 rounded-full"
                          title="Jazz Collaborative"
                        ></div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {group.accounts?.length || 0} accounts connected
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {group.posts?.length || 0} posts created
                        </p>
                      </div>

                      <div className="flex -space-x-2 mt-4">
                        {(group.accounts || [])
                          .slice(0, 3)
                          .map((account: any, accountIndex: number) => (
                            <div
                              key={account?.id || accountIndex}
                              className="w-8 h-8 rounded-full border-2 border-white bg-lime-100 flex items-center justify-center"
                            >
                              <span className="text-xs font-medium text-lime-700">
                                {account?.platform?.charAt(0).toUpperCase() ||
                                  "?"}
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
              className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-dashed p-6 hover:shadow-md hover:border-lime-300 transition-all text-center"
              disabled={!me?.root?.accountGroups}
            >
              <Plus className="w-8 h-8 text-lime-600 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                Create Account Group
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {me?.root?.accountGroups
                  ? "Connect your social media accounts"
                  : "Loading Jazz system..."}
              </p>
            </button>
          </div>

          {/* Create Post Dialog */}
          <Dialog.Root
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
          >
            <Dialog.Content style={{ maxWidth: 450 }}>
              <Dialog.Title>Create New Post</Dialog.Title>
              <Dialog.Description>
                Create a new post for your social media accounts
              </Dialog.Description>

              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Post Title
                  </label>
                  <TextField.Root
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    placeholder="Enter post title..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Content
                  </label>
                  <TextArea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="soft"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePost}
                  className="bg-lime-600 hover:bg-lime-700 text-white"
                >
                  Create Post
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Root>

          {/* Account Group Creation Dialog */}
          {me && (
            <AccountGroupCreation
              isOpen={showCreateAccountGroupDialog}
              onOpenChange={setShowCreateAccountGroupDialog}
              onSave={handleSaveAccountGroup}
            />
          )}
        </div>
      </div>
    </div>
  );
}
