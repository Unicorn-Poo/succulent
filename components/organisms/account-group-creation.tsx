"use client";

import { useState } from "react";
import { Button, Dialog, Select, Card, Text, Badge } from "@radix-ui/themes";
import { Plus, X, Trash2, Check, AlertCircle, Users, Loader2, Save } from "lucide-react";
import Image from "next/image";
import { platformIcons, platformLabels } from "@/utils/postConstants";
import { Input } from "@/components/atoms";
import { PlatformNames } from "@/app/schema";
import { 
	validateAyrshareConfig, 
	isBusinessPlanMode,
	createAyrshareProfile} from "@/utils/ayrshareIntegration";

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
    ayrshareProfileKey?: string;
    ayrshareProfileTitle?: string;
  }) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Filter out 'base' from available platforms since it's not a valid social platform
const availablePlatforms = Object.keys(platformLabels).filter(platform => platform !== 'base') as (keyof typeof platformLabels)[];

export default function AccountGroupCreation({ onSave, isOpen, onOpenChange }: AccountGroupCreationProps) {
  const [groupName, setGroupName] = useState("");
  const [accounts, setAccounts] = useState<PlatformAccountData[]>([]);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [linkingStatus, setLinkingStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  
  // Form state for adding new accounts
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPlatform, setNewAccountPlatform] = useState<typeof PlatformNames[number]>("instagram");

  const ayrshareConfigured = validateAyrshareConfig();
  const businessPlanMode = isBusinessPlanMode();

  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      setError("Please enter an account name");
      return;
    }

    // Check if platform already exists
    const platformExists = accounts.some(account => account.platform === newAccountPlatform);
    if (platformExists) {
      setError(`${platformLabels[newAccountPlatform as keyof typeof platformLabels]} account already added`);
      return;
    }

    const newAccount: PlatformAccountData = {
      platform: newAccountPlatform,
      name: newAccountName.trim(),
      isLinked: false,
      status: "pending",
    };

    setAccounts([...accounts, newAccount]);
    setNewAccountName("");
    setNewAccountPlatform("instagram");
    setShowAddAccountForm(false);
    setError("");
  };

  const handleRemoveAccount = (index: number) => {
    setAccounts(accounts.filter((_, i) => i !== index));
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    setIsCreatingProfile(true);
    setError("");

    try {
      let ayrshareProfileKey = undefined;
      let ayrshareProfileTitle = undefined;

      // Create Ayrshare profile if Business Plan is enabled
      if (businessPlanMode && ayrshareConfigured) {
        setLinkingStatus("Creating Ayrshare user profile...");
        
        const profile = await createAyrshareProfile({
          title: groupName
        });

        ayrshareProfileKey = profile.profileKey;
        ayrshareProfileTitle = profile.title || groupName;
        
        setLinkingStatus("Profile created successfully!");
      }

      // Save the group
      onSave({
        name: groupName,
        accounts: accounts.map(account => ({
          platform: account.platform,
          name: account.name,
          profileKey: ayrshareProfileKey,
          isLinked: false,
          status: "pending" as const
        })),
        ayrshareProfileKey,
        ayrshareProfileTitle
      });

      handleCancel();
    } catch (error) {
      console.error('Error creating account group:', error);
      setError(`Failed to create account group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingProfile(false);
      setLinkingStatus("");
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

  const canSave = groupName.trim();

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-w-2xl">
        <Dialog.Title>Create Account Group</Dialog.Title>
        <Dialog.Description>
          {businessPlanMode 
            ? "Create a new account group and add social media accounts to link via Ayrshare"
            : "Create a new account group (Free Account Mode)"
          }
        </Dialog.Description>

        <div className="space-y-6 mt-6">
          {/* Error/Status Messages */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <Text size="2" color="red">{error}</Text>
              </div>
            </div>
          )}

          {linkingStatus && (
            <div className="p-3 bg-brand-mint/10 dark:bg-brand-seafoam/20 border border-brand-mint/40 dark:border-brand-seafoam/40 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-brand-seafoam dark:text-brand-mint animate-spin" />
                <Text size="2" color="blue">{linkingStatus}</Text>
              </div>
            </div>
          )}

          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Group Name</label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Personal Accounts, Business Brand"
            />
          </div>

          {/* Accounts Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium">Social Media Accounts</label>
              <Button
                size="1"
                variant="soft"
                onClick={() => setShowAddAccountForm(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-3 h-3" />
                Add Account
              </Button>
            </div>

            {/* Add Account Form */}
            {showAddAccountForm && (
              <Card className="p-4 mb-4 border-dashed border-2 border-border">
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1">Platform</label>
                    <Select.Root value={newAccountPlatform} onValueChange={(value) => setNewAccountPlatform(value as any)}>
                      <Select.Trigger className="w-full" />
                      <Select.Content>
                        {availablePlatforms.map((platform) => (
                          <Select.Item key={platform} value={platform}>
                            <div className="flex items-center gap-2">
                              <Image 
                                src={platformIcons[platform as keyof typeof platformIcons]} 
                                alt={platform} 
                                width={16} 
                                height={16} 
                              />
                              {platformLabels[platform as keyof typeof platformLabels]}
                            </div>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </div>
                  <div className="flex-2">
                    <label className="block text-xs font-medium mb-1">Account Name</label>
                    <Input
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g., @username or Brand Name"
                    />
                  </div>
                  <Button onClick={handleAddAccount} size="2">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                  <Button 
                    variant="soft"
                    onClick={() => {
                      setShowAddAccountForm(false);
                      setNewAccountName("");
                      setNewAccountPlatform("instagram");
                    }}
                    size="2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Accounts List */}
            {accounts.length > 0 && (
              <div className="space-y-2">
                {accounts.map((account, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Image 
                          src={platformIcons[account.platform as keyof typeof platformIcons]} 
                          alt={account.platform} 
                          width={20} 
                          height={20} 
                        />
                        <div>
                          <Text size="2" weight="medium">{account.name}</Text>
                          <Text size="1" color="gray" className="block">
                            {platformLabels[account.platform as keyof typeof platformLabels]}
                          </Text>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={account.isLinked ? "solid" : "soft"} color={account.isLinked ? "green" : "gray"}>
                          {account.status}
                        </Badge>
                        <Button 
                          size="1" 
                          variant="ghost" 
                          onClick={() => handleRemoveAccount(index)}
                          className="text-red-500 hover:text-red-700 dark:text-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {accounts.length === 0 && !showAddAccountForm && (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <Text size="2" color="gray">No accounts added yet</Text>
                <Text size="1" color="gray" className="block mt-1">
                  Add social media accounts to manage with this group
                </Text>
              </div>
            )}
          </div>

          {/* Business Plan Features Info */}
          {businessPlanMode && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="text-sm text-green-800 dark:text-green-300">
                  <Text size="2" weight="medium" className="block mb-1">Business Plan Active</Text>
                  <Text size="2">
                    After creating the group, you can link accounts via the Settings tab using Ayrshare's secure authentication.
                  </Text>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <Button variant="soft" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSaveGroup} disabled={!canSave || isCreatingProfile}>
            {isCreatingProfile ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Group
              </>
            )}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
} 