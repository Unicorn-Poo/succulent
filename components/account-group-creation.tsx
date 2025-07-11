"use client";

import { useState } from "react";
import { Button, Card, Dialog, TextField, Select, Text, Heading, Flex, Box } from "@radix-ui/themes";
import { Plus, X, Save, Users, ExternalLink, Check, AlertCircle, Loader2, Globe, Trash2 } from "lucide-react";
import { Input } from "./input";
import { PlatformNames, PlatformAccount, AccountGroup, AccountGroupType } from "../app/schema";
import Image from "next/image";
import { co } from "jazz-tools";
import { 
  // Business Plan functions (commented out)
  // createAyrshareProfile, generateLinkingJWT, getConnectedAccounts, 
  validateAyrshareConfig, 
  isBusinessPlanMode,
  createFreeAccountGroup,
  getFreeConnectedAccounts
} from "../utils/ayrshareIntegration";

interface PlatformAccountData {
  platform: typeof PlatformNames[number];
  name: string;
  profileKey?: string;
  isLinked: boolean;
  status: "pending" | "linked" | "error" | "expired";
  lastError?: string;
}

interface AccountGroupCreationProps {
  onSave: (groupData: { 
    name: string; 
    accounts: Array<{
      platform: string;
      name: string;
      profileKey?: string;
      isLinked: boolean;
      status: "pending" | "linked" | "error" | "expired";
      lastError?: string;
    }>;
  }) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const platformIcons = {
  x: "/icons8-twitter.svg",
  instagram: "/icons8-instagram.svg",
  youtube: "/icons8-youtube-logo.svg",
  facebook: "/icons8-facebook.svg",
  linkedin: "/icons8-linkedin.svg",
};

const platformLabels = {
  x: "X (Twitter)",
  instagram: "Instagram", 
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

const availablePlatforms = Object.keys(platformLabels) as (keyof typeof platformLabels)[];

export default function AccountGroupCreation({ onSave, isOpen, onOpenChange }: AccountGroupCreationProps) {
  const [groupName, setGroupName] = useState("");
  const [accounts, setAccounts] = useState<PlatformAccountData[]>([]);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [linkingStatus, setLinkingStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  
  // Form state for adding new accounts
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPlatform, setNewAccountPlatform] = useState<keyof typeof platformLabels>("instagram");

  const ayrshareConfigured = validateAyrshareConfig();
  const businessPlanMode = isBusinessPlanMode();

  // =============================================================================
  // 🆓 FREE ACCOUNT MODE (ACTIVE)
  // =============================================================================
  
  const handleCreateFreeAccountGroup = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    if (!ayrshareConfigured) {
      setError("Ayrshare API is not configured. Please check your environment variables.");
      return;
    }

    setIsCreatingProfile(true);
    setError("");
    setLinkingStatus("Creating account group...");

    try {
      const result = await createFreeAccountGroup(groupName);
      setLinkingStatus(result.message);
    } catch (error) {
      console.error('Error creating account group:', error);
      setError(`Failed to create account group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      setError("Please enter an account name");
      return;
    }

    const newAccount: PlatformAccountData = {
      platform: newAccountPlatform,
      name: newAccountName.trim(),
      isLinked: false,
      status: "pending" as const,
    };

    setAccounts(prev => [...prev, newAccount]);
    setNewAccountName("");
    setNewAccountPlatform("instagram");
    setShowAddAccountForm(false);
    setError("");
  };

  const handleRemoveAccount = (platform: string, name: string) => {
    setAccounts(prev => prev.filter(account => !(account.platform === platform && account.name === name)));
  };

  const handleOpenDashboard = () => {
    window.open("https://app.ayrshare.com/dashboard", '_blank');
    setLinkingStatus("Link your accounts in the Ayrshare dashboard, then refresh to check status.");
  };

  const handleCheckAccountStatus = async () => {
    if (accounts.length === 0) {
      setError("Please add some accounts first");
      return;
    }

    setLinkingStatus("Checking linked accounts...");
    
    try {
      const connectedAccounts = await getFreeConnectedAccounts();
      
      if (connectedAccounts.user?.socialMediaAccounts) {
        const linkedPlatforms = Object.keys(connectedAccounts.user.socialMediaAccounts);
        
        // Update account statuses based on what's linked
        const updatedAccounts = accounts.map(account => {
          const platformKey = account.platform === 'x' ? 'twitter' : account.platform;
          const isLinked = linkedPlatforms.includes(platformKey);
          return {
            ...account,
            isLinked,
            status: isLinked ? "linked" as const : "pending" as const,
          };
        });
        
        setAccounts(updatedAccounts);
        setLinkingStatus(`${linkedPlatforms.length} platform(s) detected as linked!`);
      } else {
        setLinkingStatus("No linked accounts found. Please link accounts in the dashboard first.");
      }
    } catch (error) {
      console.error('Error checking accounts:', error);
      setError('Failed to check account status. Please try again.');
      setLinkingStatus("");
    }
  };

  // =============================================================================
  // 💾 JAZZ INTEGRATION - CREATE COLLABORATIVE ACCOUNT GROUP
  // =============================================================================

  // =============================================================================
  // 🚀 BUSINESS PLAN MODE (DISABLED FOR DEVELOPMENT)
  // =============================================================================
  /*
  const handleCreateAccountGroup = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    if (!ayrshareConfigured) {
      setError("Ayrshare API is not configured. Please check your environment variables.");
      return;
    }

    setIsCreatingProfile(true);
    setError("");
    setLinkingStatus("Creating Ayrshare profile...");

    try {
      // Create Ayrshare User Profile
      const profile = await createAyrshareProfile({
        title: groupName
      });

      setLinkingStatus("Profile created! Ready to link accounts.");

      // Update all accounts with the profile key
      const updatedAccounts = accounts.map(account => ({
        ...account,
        profileKey: profile.profileKey,
      }));

      setAccounts(updatedAccounts);

    } catch (error) {
      console.error('Error creating Ayrshare profile:', error);
      setError(`Failed to create Ayrshare profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingProfile(false);
      setLinkingStatus("");
    }
  };

  const handleLinkAccounts = async () => {
    if (!accounts.length || !accounts[0].profileKey) {
      setError("No profile created yet");
      return;
    }

    setLinkingStatus("Generating account linking URL...");
    setError("");

    try {
      // Generate JWT for account linking
      const jwtResponse = await generateLinkingJWT({
        profileKey: accounts[0].profileKey,
        logout: true, // Force logout for clean linking
      });

      setLinkingStatus("Opening account linking page...");

      // Open the social linking page in a new window
      const linkingWindow = window.open(jwtResponse.url, '_blank', 'width=800,height=600');

      if (!linkingWindow) {
        setError("Please allow popups to link your social accounts");
        return;
      }

      // Focus on the new window
      linkingWindow.focus();

      // Check for linked accounts periodically
      const checkInterval = setInterval(async () => {
        try {
          const connectedAccounts = await getConnectedAccounts(accounts[0].profileKey!);
          
          if (connectedAccounts.user?.socialMediaAccounts) {
            const linkedPlatforms = Object.keys(connectedAccounts.user.socialMediaAccounts);
            
            if (linkedPlatforms.length > 0) {
              // Update account statuses
              const updatedAccounts = accounts.map(account => {
                const platformKey = account.platform === 'x' ? 'twitter' : account.platform;
                const isLinked = linkedPlatforms.includes(platformKey);
                return {
                  ...account,
                  isLinked,
                  status: isLinked ? "linked" as const : "pending" as const,
                };
              });
              
              setAccounts(updatedAccounts);
              setLinkingStatus(`${linkedPlatforms.length} account(s) linked successfully!`);
              
              // Stop checking if we have linked accounts
              clearInterval(checkInterval);
            }
          }
        } catch (error) {
          console.error('Error checking linked accounts:', error);
        }
      }, 3000);

      // Stop checking after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (linkingStatus.includes("Generating")) {
          setLinkingStatus("Account linking window opened. Close this dialog when done linking.");
        }
      }, 300000);

    } catch (error) {
      console.error('Error generating JWT:', error);
      setError(`Failed to generate linking URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLinkingStatus("");
    }
  };
  */

  const handleSaveGroup = () => {
    if (groupName && accounts.length > 0) {
      // Pass raw form data to parent
      onSave({
        name: groupName,
        accounts: accounts,
      });
      
      // Reset form
      setGroupName("");
      setAccounts([]);
      setError("");
      setLinkingStatus("");
      setShowAddAccountForm(false);
      setNewAccountName("");
      setNewAccountPlatform("instagram");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setGroupName("");
    setAccounts([]);
    setError("");
    setLinkingStatus("");
    setShowAddAccountForm(false);
    setNewAccountName("");
    setNewAccountPlatform("instagram");
    onOpenChange(false);
  };

  const linkedAccountsCount = accounts.filter(account => account.isLinked).length;
  const canSave = groupName.trim() && accounts.length > 0;
  const groupCreated = !isCreatingProfile && linkingStatus.includes("Account group created");

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 700 }}>
        <Dialog.Title>Create Account Group</Dialog.Title>
        <Dialog.Description>
          {businessPlanMode 
            ? "Create a new account group and link social media accounts via Ayrshare"
            : "Create a new account group (Free Account Mode)"
          }
        </Dialog.Description>

        <div className="space-y-6 mt-6">
          {/* Development Mode Notice */}
          {!businessPlanMode && (
            <Card>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  <Text weight="medium" color="blue">Development Mode (Free Account)</Text>
                </div>
                <Text size="2" className="text-blue-700">
                  Using simplified workflow. Add accounts manually, then link them in Ayrshare dashboard.
                </Text>
              </div>
            </Card>
          )}

          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Group Name</label>
            <TextField.Root
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Personal Accounts, Business Brand, Client Name"
              disabled={isCreatingProfile}
            />
          </div>

          {/* Ayrshare Configuration Check */}
          {!ayrshareConfigured && (
            <Card>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <Text weight="medium" color="red">Ayrshare Not Configured</Text>
                </div>
                <Text size="2" className="mt-1 text-red-600">
                  Please set your NEXT_PUBLIC_AYRSHARE_API_KEY environment variable.
                </Text>
              </div>
            </Card>
          )}

          {/* Create Group Button */}
          {!groupCreated && (
            <Button 
              onClick={handleCreateFreeAccountGroup}
              disabled={!groupName.trim() || !ayrshareConfigured || isCreatingProfile}
              className="w-full"
            >
              {isCreatingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Group...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Create Account Group
                </>
              )}
            </Button>
          )}

          {/* Account Management */}
          {groupCreated && (
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Text weight="medium">Social Media Accounts</Text>
                  <div className="flex items-center gap-2">
                    <Text size="2" color="gray">
                      {linkedAccountsCount} of {accounts.length} linked
                    </Text>
                    <Button 
                      size="1" 
                      variant="soft" 
                      onClick={() => setShowAddAccountForm(true)}
                      disabled={showAddAccountForm}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Account
                    </Button>
                  </div>
                </div>

                {/* Add Account Form */}
                {showAddAccountForm && (
                  <Card className="mb-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Text size="2" weight="medium" className="mb-3 block">Add New Account</Text>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1">Platform</label>
                          <Select.Root 
                            value={newAccountPlatform} 
                            onValueChange={(value) => setNewAccountPlatform(value as keyof typeof platformLabels)}
                          >
                            <Select.Trigger className="w-full" />
                            <Select.Content>
                              {availablePlatforms.map(platform => (
                                <Select.Item key={platform} value={platform}>
                                  <div className="flex items-center gap-2">
                                    <Image
                                      src={platformIcons[platform]}
                                      alt={platform}
                                      width={16}
                                      height={16}
                                    />
                                    {platformLabels[platform]}
                                  </div>
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Account Name</label>
                          <TextField.Root
                            value={newAccountName}
                            onChange={(e) => setNewAccountName(e.target.value)}
                            placeholder="@username or display name"
                            size="2"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <Button 
                            size="2" 
                            onClick={handleAddAccount}
                            disabled={!newAccountName.trim()}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                          <Button 
                            size="2" 
                            variant="soft" 
                            onClick={() => {
                              setShowAddAccountForm(false);
                              setNewAccountName("");
                              setNewAccountPlatform("instagram");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Accounts List */}
                {accounts.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {accounts.map((account) => (
                      <div key={account.platform + account.name} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                        <div className="relative">
                          <Image
                            src={platformIcons[account.platform as keyof typeof platformIcons] || "/sprout.svg"}
                            alt={account.platform}
                            width={20}
                            height={20}
                          />
                          {account.isLinked && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Text size="2" weight="medium" className="truncate">
                            {account.name}
                          </Text>
                          <div className="flex items-center gap-2">
                            <Text size="1" color="gray">
                              {platformLabels[account.platform as keyof typeof platformLabels]}
                            </Text>
                            <Text size="1" color={account.isLinked ? "green" : "gray"}>
                              • {account.isLinked ? "Linked" : "Not linked"}
                            </Text>
                          </div>
                        </div>
                        <Button
                          size="1"
                          variant="ghost"
                          color="red"
                          onClick={() => handleRemoveAccount(account.platform, account.name)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <Text size="2">No accounts added yet</Text>
                    <Text size="1" className="block mt-1">Click "Add Account" to get started</Text>
                  </div>
                )}

                {/* Actions */}
                {accounts.length > 0 && (
                  <div className="space-y-2">
                    <Button 
                      onClick={handleOpenDashboard}
                      variant="soft"
                      className="w-full"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Open Ayrshare Dashboard to Link Accounts
                    </Button>
                    
                    <Button 
                      onClick={handleCheckAccountStatus}
                      variant="outline"
                      className="w-full"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Check Account Status
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Status Messages */}
          {linkingStatus && (
            <Card>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Text size="2" color="blue">{linkingStatus}</Text>
              </div>
            </Card>
          )}

          {error && (
            <Card>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <Text size="2" color="red">{error}</Text>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Dialog Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="soft" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveGroup}
            disabled={!canSave}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Account Group
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
} 