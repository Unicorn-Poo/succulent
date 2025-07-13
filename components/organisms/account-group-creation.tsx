"use client";

import { useState, useEffect, useMemo } from "react";
import { Button, Dialog, TextField, Select, Card, Text, Badge } from "@radix-ui/themes";
import { Plus, X, Trash2, Check, AlertCircle, ExternalLink, Users, Loader2, Globe, Save } from "lucide-react";
import Image from "next/image";
import { platformIcons, platformLabels } from "@/utils/postConstants";
import { Input } from "@/components/atoms";
import { PlatformAccount, AccountGroup, PlatformNames } from "@/app/schema";
import { co } from "jazz-tools";
import { 
	validateAyrshareConfig, 
	isBusinessPlanMode,
	createFreeAccountGroup,
	getFreeConnectedAccounts
} from "@/utils/ayrshareIntegration";

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
      
      // Fix: Handle activeSocialAccounts as either array or object
      let linkedPlatforms: string[] = [];
      
      if (connectedAccounts.activeSocialAccounts) {
        if (Array.isArray(connectedAccounts.activeSocialAccounts)) {
          // It's an array of platform names like ["instagram", "twitter"]
          linkedPlatforms = connectedAccounts.activeSocialAccounts;
        } else if (typeof connectedAccounts.activeSocialAccounts === 'object') {
          // It's an object with platform keys like {instagram: {...}, twitter: {...}}
          linkedPlatforms = Object.keys(connectedAccounts.activeSocialAccounts);
        }
      }
      
      if (linkedPlatforms.length > 0) {
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
      <Dialog.Content 
        style={{ 
          maxWidth: 700, 
          backgroundColor: 'white',
          border: '2px solid #000',
          borderRadius: '8px',
          padding: '24px',
          zIndex: 10000,
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}
      >
        
        <Dialog.Title style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          Create Account Group
        </Dialog.Title>
        
        <Dialog.Description style={{ marginBottom: '24px', color: '#666' }}>
          {businessPlanMode 
            ? "Create a new account group and link social media accounts via Ayrshare"
            : "Create a new account group (Free Account Mode)"
          }
        </Dialog.Description>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Simplified content for testing */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f0f9ff', 
            border: '1px solid #0ea5e9',
            borderRadius: '6px' 
          }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#0ea5e9' }}>✅ Modal is Working!</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              This proves the modal is rendering. The issue was CSS visibility.
            </p>
          </div>

          {/* Group Name Input */}
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}>
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Personal Accounts, Business Brand"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (groupName.trim()) {
                  onSave({
                    name: groupName,
                    accounts: []
                  });
                  handleCancel();
                } else {
                  alert('Please enter a group name');
                }
              }}
              disabled={!groupName.trim()}
              style={{
                padding: '12px 24px',
                backgroundColor: groupName.trim() ? '#10b981' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: groupName.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Create Group
            </button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
} 