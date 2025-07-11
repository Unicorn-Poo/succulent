"use client";

import { useState } from "react";
import { Button, Card, Dialog, TextField, Select, Text, Heading, Flex, Box } from "@radix-ui/themes";
import { Plus, X, Save, Users, ExternalLink, Check, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "./input";
import { PlatformNames } from "../app/schema";
import Image from "next/image";
import { createAyrshareProfile, generateLinkingJWT, getConnectedAccounts, validateAyrshareConfig } from "../utils/ayrshareIntegration";

interface PlatformAccount {
  id: string;
  platform: typeof PlatformNames[number];
  name: string;
  profileKey?: string;
  isLinked: boolean;
  status: "pending" | "linked" | "error" | "expired";
  lastError?: string;
}

interface AccountGroupCreationProps {
  onSave: (groupData: { name: string; accounts: PlatformAccount[] }) => void;
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

export default function AccountGroupCreation({ onSave, isOpen, onOpenChange }: AccountGroupCreationProps) {
  const [groupName, setGroupName] = useState("");
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [linkingStatus, setLinkingStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const ayrshareConfigured = validateAyrshareConfig();

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

      // Create account entries for enabled platforms
      const enabledPlatforms: typeof PlatformNames[number][] = ["instagram", "facebook", "x", "linkedin", "youtube"];
      const newAccounts: PlatformAccount[] = enabledPlatforms.map(platform => ({
        id: `${platform}-${Date.now()}`,
        platform,
        name: `${groupName} ${platformLabels[platform]}`,
        profileKey: profile.profileKey,
        isLinked: false,
        status: "pending" as const,
      }));

      setAccounts(newAccounts);

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
                const isLinked = linkedPlatforms.includes(account.platform === 'x' ? 'twitter' : account.platform);
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

  const handleSaveGroup = () => {
    if (groupName && accounts.length > 0) {
      onSave({
        name: groupName,
        accounts: accounts,
      });
      // Reset form
      setGroupName("");
      setAccounts([]);
      setError("");
      setLinkingStatus("");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setGroupName("");
    setAccounts([]);
    setError("");
    setLinkingStatus("");
    onOpenChange(false);
  };

  const linkedAccountsCount = accounts.filter(account => account.isLinked).length;
  const canSave = groupName.trim() && accounts.length > 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 600 }}>
        <Dialog.Title>Create Account Group</Dialog.Title>
        <Dialog.Description>
          Create a new account group and link social media accounts via Ayrshare
        </Dialog.Description>

        <div className="space-y-6 mt-6">
          {/* Group Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Group Name</label>
            <TextField.Root
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Personal Accounts, Business Brand, Client Name"
              disabled={isCreatingProfile || accounts.length > 0}
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

          {/* Create Profile Button */}
          {!accounts.length && (
            <Button 
              onClick={handleCreateAccountGroup}
              disabled={!groupName.trim() || !ayrshareConfigured || isCreatingProfile}
              className="w-full"
            >
              {isCreatingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Create Account Group
                </>
              )}
            </Button>
          )}

          {/* Account Linking */}
          {accounts.length > 0 && (
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Text weight="medium">Social Media Accounts</Text>
                  <Text size="2" color="gray">
                    {linkedAccountsCount} of {accounts.length} linked
                  </Text>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
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
                          {platformLabels[account.platform as keyof typeof platformLabels]}
                        </Text>
                        <Text size="1" color={account.isLinked ? "green" : "gray"}>
                          {account.isLinked ? "Linked" : "Not linked"}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleLinkAccounts}
                  variant="soft"
                  className="w-full"
                  disabled={!accounts[0]?.profileKey}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Link Social Media Accounts
                </Button>
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