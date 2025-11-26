"use client";

import { Card, Text, Button, Badge, Select, Dialog } from "@radix-ui/themes";
import { 
  Users, 
  ExternalLink, 
  Check, 
  AlertCircle, 
  RefreshCw,
  Settings,
  Plus,
  Trash2,
  X,
  AlertTriangle
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  generateDirectLinkingURL,
  getConnectedAccounts,
  isBusinessPlanMode,
  unlinkSocialAccount,
  extractAccountDetails,
  createAccountFromAyrshareData
} from "@/utils/ayrshareIntegration";
import { platformIcons, platformLabels } from "@/utils/postConstants";
import { Input } from "@/components/atoms";
import { PlatformNames } from "@/app/schema";

interface AccountLinkingManagerProps {
  accountGroup: any; // Jazz AccountGroup with ayrshareProfileKey
  onAccountsUpdated?: (accounts: any[]) => void;
}

// Filter out 'base' from available platforms
const availablePlatforms = Object.keys(platformLabels).filter(platform => platform !== 'base') as (keyof typeof platformLabels)[];

// Helper function to safely access potentially corrupted Jazz collaborative arrays
function safeArrayAccess(collaborativeArray: any): any[] {
  try {
    if (!collaborativeArray) {
      return [];
    }
    
    // Handle null references in collaborative lists
    if (Array.isArray(collaborativeArray)) {
      return collaborativeArray.filter(item => item != null);
    }
    
    // Try to convert Jazz collaborative list to regular array
    const array = Array.from(collaborativeArray || []);
    return array.filter(item => item != null);
  } catch (error) {
    console.error('🚨 Jazz collaborative array is corrupted:', error);
    return [];
  }
}

export default function AccountLinkingManager({ 
  accountGroup, 
  onAccountsUpdated 
}: AccountLinkingManagerProps) {
  const [isLinking, setIsLinking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollProgress, setPollProgress] = useState({ current: 0, max: 0 });
  
  // Add account form state
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPlatform, setNewAccountPlatform] = useState<typeof PlatformNames[number]>("instagram");

  // Remove account state
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState<{index: number, account: any} | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Change profile key state
  const [showChangeProfileKey, setShowChangeProfileKey] = useState(false);
  const [newProfileKey, setNewProfileKey] = useState("");
  const [isSavingProfileKey, setIsSavingProfileKey] = useState(false);

  const businessPlanAvailable = isBusinessPlanMode();
  const profileKey = accountGroup?.ayrshareProfileKey;
  const profileTitle = accountGroup?.ayrshareProfileTitle || accountGroup?.name;

  // Check if we have the required profile key
  const hasProfileKey = Boolean(profileKey);

  // Load connected accounts on mount
  useEffect(() => {
    if (hasProfileKey) {
      refreshConnectedAccounts();
    }
  }, [hasProfileKey, profileKey]);

  // Check for redirect from Ayrshare linking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const linkedParam = urlParams.get('linked');
    const profileParam = urlParams.get('profile');
    
    if (linkedParam === 'true' && profileParam === profileKey) {
      setSuccess('🎉 Welcome back! Checking for newly linked accounts...');
      
      // Remove the URL parameters
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('linked');
      newUrl.searchParams.delete('profile');
      window.history.replaceState({}, '', newUrl.toString());
      
      // Start polling immediately
      setTimeout(() => {
        startAccountPolling();
      }, 1000); // Small delay to ensure component is ready
    }
  }, [profileKey]);

  const refreshConnectedAccounts = async () => {
    if (!profileKey) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      // Prefer server route that merges /profiles fallback
      let result: any = null;
      try {
        const res = await fetch(`/api/ayrshare-user-info?profileKey=${encodeURIComponent(profileKey)}`);
        const json = await res.json();
        if (res.ok && json?.data) {
          result = json.data;
        }
      } catch {}
      // Fallback to direct client call if server route not available
      if (!result) {
        result = await getConnectedAccounts(profileKey);
      }
      
      // Extract platform list and detailed account information using utility function
      const { platforms, accountDetails } = extractAccountDetails(result);

      // Ensure UI "Connected" state matches freshly fetched platforms
      if (Array.isArray(platforms)) {
        setConnectedAccounts(platforms);
      }

      if (platforms.length === 0) {
        setSuccess('No connected accounts found on Ayrshare. Connect your social media accounts in the Ayrshare dashboard to see them here.');
        return;
      }

      // Create new accounts from Ayrshare data automatically using utility function
      const autoCreatedAccounts = platforms.map(platform => 
        createAccountFromAyrshareData(platform, accountDetails[platform] || {}, profileKey)
      );

      // Combine with any existing manually created accounts, avoiding duplicates
      const existingAccounts = accountGroup?.accounts ? safeArrayAccess(accountGroup.accounts) : [];
      const existingPlatforms = new Set(existingAccounts.map((acc: any) => acc.platform));
      
      // Only add new platforms that don't already exist
      const newAccounts = autoCreatedAccounts.filter(account => !existingPlatforms.has(account.platform));
      
      // Update existing accounts' linking status
      const updatedExistingAccounts = existingAccounts.map((account: any) => {
        if (!account || !account.platform) return account;
        
        const platformKey = account.platform === 'x' ? 'twitter' : account.platform;
        const isLinked = platforms.includes(platformKey);
        
        if (isLinked && accountDetails[platformKey]) {
          const details = accountDetails[platformKey];
          return {
            ...account,
            isLinked: true,
            status: "linked" as const,
            linkedAt: new Date(),
            // Update details from Ayrshare if they weren't set
            username: account.username || details.username || details.handle || details.screen_name,
            displayName: account.displayName || details.display_name || details.full_name || details.name,
            avatar: account.avatar || details.profile_image_url || details.profile_picture,
            url: account.url || details.url || details.profile_url
          };
        }
        
        return {
          ...account,
          isLinked,
          status: isLinked ? "linked" as const : "pending" as const,
          linkedAt: isLinked ? new Date() : account.linkedAt
        };
      });

      // Combine updated existing accounts with new auto-created accounts
      const allAccounts = [...updatedExistingAccounts, ...newAccounts];
      
      // Persist to Jazz: update existing entries and append new ones
      try {
        if (accountGroup?.accounts) {
          // Update existing entries in-place
          for (let i = 0; i < accountGroup.accounts.length; i++) {
            const acc = accountGroup.accounts[i];
            if (!acc || !acc.platform) continue;
            const platformKeyExisting = acc.platform === 'x' ? 'twitter' : acc.platform;
            const isLinkedExisting = platforms.includes(platformKeyExisting);
            acc.isLinked = isLinkedExisting;
            acc.status = isLinkedExisting ? 'linked' : 'pending';
            if (isLinkedExisting && accountDetails[platformKeyExisting]) {
              const details = accountDetails[platformKeyExisting];
              acc.linkedAt = new Date();
              acc.username = acc.username || details.username || details.handle || details.screen_name;
              acc.displayName = acc.displayName || details.display_name || details.full_name || details.name;
              acc.avatar = acc.avatar || details.profile_image_url || details.profile_picture;
              acc.url = acc.url || details.url || details.profile_url;
            }
          }
          // Append newly discovered accounts
          if (typeof accountGroup.accounts.push === 'function') {
            newAccounts.forEach((a) => accountGroup.accounts.push(a));
          }
        }
      } catch (e) {
        console.error('❌ Failed to persist refreshed accounts to Jazz:', e);
      }
      
      if (onAccountsUpdated) {
        onAccountsUpdated(allAccounts);
      }
      
      const linkedCount = allAccounts.filter(acc => acc.isLinked).length;
      const newAccountsCount = newAccounts.length;
      
      if (newAccountsCount > 0) {
        setSuccess(`✅ ${newAccountsCount} new account(s) automatically added from Ayrshare! ${linkedCount} of ${allAccounts.length} accounts are now linked.`);
      } else {
        setSuccess(`✅ Account status updated! ${linkedCount} of ${allAccounts.length} accounts are now linked.`);
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refresh connected accounts');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLinkAccounts = async () => {
    console.log('🔗 Starting account linking process...', {
      hasProfileKey: !!profileKey,
      profileKey: profileKey,
      profileKeyLength: profileKey?.length,
      businessPlanAvailable
    });

    if (!profileKey) {
      setError('No profile key available for this account group');
      return;
    }

    // Validate profile key format (should be UUID-like)
    if (!/^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/i.test(profileKey)) {
      console.error('❌ Invalid profile key format:', profileKey);
      setError(`Invalid profile key format. Expected format: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX, got: ${profileKey}`);
      return;
    }

    setIsLinking(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🎯 Using direct linking (Business Plan approach)');

      // Create redirect URL back to current page with linking success indicator
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('linked', 'true');
      currentUrl.searchParams.set('profile', profileKey);
      const redirectUrl = currentUrl.toString();

      // Generate direct linking URL with redirect (no JWT required - Business Plan compatible)
      const linkingURL = generateDirectLinkingURL(profileKey, redirectUrl);

      // Enhanced UX: Better modal messaging for direct linking
      setSuccess('🔗 Opening Ayrshare dashboard for account linking...');
      
      // Create a more integrated experience
      const linkingWindow = window.open(
        linkingURL, 
        'ayrshare-linking',
        'width=1200,height=800,centerscreen=yes,resizable=yes,scrollbars=yes'
      );
      
      if (linkingWindow) {
        linkingWindow.focus();
        
        // Start automatic polling for linked accounts
        startAccountPolling();
        
        // Better user messaging with polling indicator
        setSuccess('🔐 Link your social media accounts in the Ayrshare dashboard. We\'ll automatically detect when accounts are linked!');
        
      } else {
        setError('❌ Please allow popups to open the Ayrshare dashboard. Check your browser settings and try again.');
      }
      
    } catch (error) {
      console.error('❌ Error during account linking:', error);
      setError(error instanceof Error ? error.message : 'Failed to start account linking process');
    } finally {
      setIsLinking(false);
    }
  };

  // Automatic polling for newly linked accounts
  const startAccountPolling = () => {
    let pollCount = 0;
    const maxPolls = 3; // Poll for 30 seconds (10 second intervals)
    const initialCount = connectedAccounts.length;
    
    setIsPolling(true);
    setPollProgress({ current: 0, max: maxPolls });
    setSuccess('🔄 Waiting for account linking... (checking every 10 seconds)');
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      setPollProgress({ current: pollCount, max: maxPolls });
      
      try {
        console.log(`🔄 Polling attempt ${pollCount}/${maxPolls} - checking for new accounts...`);
        console.log(`🔑 Using profile key: ${profileKey}`);
        console.log(`📈 Initial account count: ${initialCount}`);
        
        // Prefer server route that merges /profiles fallback
        let result: any = null;
        try {
          const res = await fetch(`/api/ayrshare-user-info?profileKey=${encodeURIComponent(profileKey!)}`);
          const json = await res.json();
          if (res.ok && json?.data) {
            result = json.data;
          }
        } catch {}
        // Fallback to direct client call if server route not available
        if (!result) {
          result = await getConnectedAccounts(profileKey!);
        }
        console.log(`📡 Full API response:`, result);
        
        // Check multiple possible locations for connected accounts
        let currentPlatforms: string[] = [];
        const platformSet = new Set<string>();
        
        // Try top-level activeSocialAccounts
        if (Array.isArray(result.activeSocialAccounts)) {
          result.activeSocialAccounts.forEach((p: string) => platformSet.add(p));
        } else if (result.activeSocialAccounts && typeof result.activeSocialAccounts === 'object') {
          Object.keys(result.activeSocialAccounts).forEach((p) => platformSet.add(p));
        }
        
        // Try user.activeSocialAccounts
        if (Array.isArray(result.user?.activeSocialAccounts)) {
          result.user.activeSocialAccounts.forEach((p: string) => platformSet.add(p));
        } else if (result.user?.activeSocialAccounts && typeof result.user.activeSocialAccounts === 'object') {
          Object.keys(result.user.activeSocialAccounts).forEach((p) => platformSet.add(p));
        }
        
        // user.socialMediaAccounts object
        if (result.user?.socialMediaAccounts && typeof result.user.socialMediaAccounts === 'object') {
          Object.keys(result.user.socialMediaAccounts).forEach((p) => platformSet.add(p));
        }

        // Top-level socialMediaAccounts if present
        if (result.socialMediaAccounts && typeof result.socialMediaAccounts === 'object') {
          Object.keys(result.socialMediaAccounts).forEach((p) => platformSet.add(p));
        }
        
        // displayNames array (top-level or user-level)
        const displayNamesArr = Array.isArray(result.displayNames)
          ? result.displayNames
          : Array.isArray(result.user?.displayNames)
            ? result.user.displayNames
            : [];
        displayNamesArr.forEach((acc: any) => {
          if (acc?.platform) platformSet.add(acc.platform);
        });

        currentPlatforms = Array.from(platformSet);
        
        console.log(`📊 Raw socialMediaAccounts:`, result.user?.socialMediaAccounts);
        console.log(`📊 Raw activeSocialAccounts (user level):`, result.user?.activeSocialAccounts);
        console.log(`📊 Raw activeSocialAccounts (top level):`, result.activeSocialAccounts);
        console.log(`📊 Final extracted platforms: [${currentPlatforms.join(', ')}]`);
        console.log(`📊 Current count: ${currentPlatforms.length}, Initial count: ${initialCount}`);
        
        // Update our local state
        setConnectedAccounts(currentPlatforms);
        
        // Check if we have new accounts OR if we now have accounts when we didn't before
        if (currentPlatforms.length > initialCount || (initialCount === 0 && currentPlatforms.length > 0)) {
          clearInterval(pollInterval);
          setIsPolling(false);
          const newCount = currentPlatforms.length - initialCount;
          setSuccess(`🎉 Success! Detected ${newCount > 0 ? newCount : currentPlatforms.length} linked account(s)! Found: ${currentPlatforms.join(', ')}`);
          
          // Trigger a full refresh to update the UI
          await refreshConnectedAccounts();
          return;
        }
        
        // Update progress message
        if (pollCount < maxPolls) {
          setSuccess(`🔄 Still checking for linked accounts... (${pollCount}/${maxPolls}) - Current: ${currentPlatforms.length} accounts`);
        } else {
          clearInterval(pollInterval);
          setIsPolling(false);
          setSuccess('⏰ Automatic checking stopped. If you linked accounts, click "Force Refresh" to update.');
        }
        
      } catch (error) {
        console.error('❌ Error during polling:', error);
        console.error('❌ Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          profileKey,
          pollCount
        });
        
        // Continue polling despite errors
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setIsPolling(false);
          setError(`❌ API errors during polling: ${error instanceof Error ? error.message : 'Unknown error'}. Try "Force Refresh".`);
        } else {
          setSuccess(`⚠️ Error checking accounts (${pollCount}/${maxPolls}), retrying...`);
        }
      }
    }, 10000); // Poll every 10 seconds
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      setError("Please enter an account name");
      return;
    }

    if (!accountGroup) {
      setError("Account group not properly loaded");
      return;
    }

    // Handle corrupted or missing accounts array using safe access
    const accountsArray = safeArrayAccess(accountGroup.accounts);
    
    if (accountsArray.length === 0 && accountGroup.accounts) {
      // If safe access returns empty but accounts exists, it's likely corrupted
      setError("Account group data is corrupted. Please create a new account group and clear your browser data.");
      return;
    }

    // Check if platform already exists
    const platformExists = accountsArray.some((account: any) => 
      account && account.platform === newAccountPlatform
    );
    
    if (platformExists) {
      setError(`${platformLabels[newAccountPlatform as keyof typeof platformLabels]} account already added`);
      return;
    }

    // Create new account object
    const newAccount = {
      name: newAccountName.trim(),
      platform: newAccountPlatform,
      profileKey: profileKey,
      isLinked: false,
      status: "pending",
      linkedAt: undefined,
      avatar: undefined,
      username: undefined,
      displayName: undefined,
      url: undefined,
      lastError: undefined
    };

    // Try to add to the account group's accounts list
    try {
      if (accountGroup.accounts && typeof accountGroup.accounts.push === 'function') {
        accountGroup.accounts.push(newAccount);
      } else {
        setError("Cannot add accounts - Jazz database is corrupted. Please create a new account group.");
        return;
      }
    } catch (error) {
      setError("Failed to add account - Jazz database corruption detected. Please clear browser data and create a new account group.");
      return;
    }

    // Reset form
    setNewAccountName("");
    setNewAccountPlatform("instagram");
    setShowAddAccountForm(false);
    setError(null);
    setSuccess(`Added ${platformLabels[newAccountPlatform as keyof typeof platformLabels]} account. You can now link it using the "Link Accounts" button.`);

    // Trigger update callback
    if (onAccountsUpdated) {
      try {
        onAccountsUpdated([...accountsArray, newAccount]);
      } catch (error) {
        // Fallback if spread operator fails
        onAccountsUpdated(accountsArray.concat([newAccount]));
      }
    }
  };

  const handleRemoveAccount = (index: number, account: any) => {
    setAccountToRemove({ index, account });
    setShowRemoveDialog(true);
  };

  const handleConfirmRemove = async (action: 'removeFromGroup' | 'disconnectFromAyrshare') => {
    if (!accountToRemove) return;

    setIsRemoving(true);
    setError(null);

    try {
      const { index, account } = accountToRemove;
      const platformKey = account.platform === 'x' ? 'twitter' : account.platform;
      const isConnected = connectedAccounts.includes(platformKey);

      if (action === 'disconnectFromAyrshare' && isConnected && profileKey) {
        // Disconnect from Ayrshare
        await unlinkSocialAccount(account.platform, profileKey);
        setSuccess(`Disconnected ${platformLabels[account.platform as keyof typeof platformLabels]} from Ayrshare`);
        
        // Refresh to update connection status
        setTimeout(() => {
          refreshConnectedAccounts();
        }, 1000);
      }

      if (action === 'removeFromGroup' || action === 'disconnectFromAyrshare') {
        // Remove from the account group's accounts list
        if (accountGroup?.accounts) {
          try {
            if (Array.isArray(accountGroup.accounts)) {
              accountGroup.accounts.splice(index, 1);
            } else if (accountGroup.accounts && typeof accountGroup.accounts.splice === 'function') {
              accountGroup.accounts.splice(index, 1);
            } else {
              setError("Cannot remove account - Jazz database is corrupted. Please create a new account group.");
              return;
            }
            
            // Trigger update callback using safe array access
            if (onAccountsUpdated) {
              const accountsArray = safeArrayAccess(accountGroup.accounts);
              onAccountsUpdated([...accountsArray]);
            }
            
            if (action === 'removeFromGroup') {
              setSuccess(`Removed ${platformLabels[account.platform as keyof typeof platformLabels]} from account group`);
            }
          } catch (error) {
            setError("Jazz database corruption detected. Please clear browser data and create a new account group.");
            return;
          }
        }
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove account');
    } finally {
      setIsRemoving(false);
      setShowRemoveDialog(false);
      setAccountToRemove(null);
    }
  };

  // Helper function to get accounts array safely
  const getAccountsArray = () => {
    return safeArrayAccess(accountGroup?.accounts);
  };

  // Helper function to clear Jazz database corruption
  const handleDatabaseReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  if (!businessPlanAvailable) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-3">
          <Users className="w-8 h-8 text-gray-400 mx-auto" />
          <div>
            <Text size="3" weight="medium" className="block">Account Linking</Text>
            <Text size="2" color="gray" className="block mt-1">
              Advanced account linking requires Business Plan
            </Text>
          </div>
          <Button onClick={() => window.open('https://www.ayrshare.com/pricing', '_blank')}>
            Upgrade Plan
          </Button>
        </div>
      </Card>
    );
  }

  if (!hasProfileKey) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-orange-400 mx-auto" />
          <div>
            <Text size="3" weight="medium" className="block">Profile Key Required</Text>
            <Text size="2" color="gray" className="block mt-1">
              This account group needs an Ayrshare user profile to link accounts
            </Text>
          </div>
          <Text size="1" color="gray" className="block">
            Account groups created before the Business Plan upgrade need to be migrated.
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Text size="3" weight="medium" className="block">Account Management</Text>
              <Text size="2" color="gray">Profile: {profileTitle}</Text>
            </div>
                          <div className="flex gap-2">
              <Button 
                variant="soft" 
                size="2"
                onClick={refreshConnectedAccounts}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Force Refresh
              </Button>
              <Button 
                variant="outline" 
                size="2"
                onClick={async () => {
                  setError(null);
                  setSuccess('🔍 Testing API connection...');
                  try {
                    let result: any = null;
                    try {
                      const res = await fetch(`/api/ayrshare-user-info?profileKey=${encodeURIComponent(profileKey!)}`);
                      const json = await res.json();
                      if (res.ok && json?.data) {
                        result = json.data;
                      }
                    } catch {}
                    if (!result) {
                      result = await getConnectedAccounts(profileKey!);
                    }
                    setSuccess(`✅ API Test Success! Response: ${JSON.stringify(result, null, 2)}`);
                  } catch (error) {
                    setError(`❌ API Test Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }}
                disabled={!profileKey}
              >
                🔍 Test API
              </Button>
              <Button 
                size="2"
                onClick={handleLinkAccounts}
                disabled={isLinking}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {isLinking ? 'Opening...' : 'Link Accounts'}
              </Button>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <Text size="2" color="red">{error}</Text>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <Text size="2" color="green">{success}</Text>
              </div>
            </div>
          )}

          {/* Polling Progress Indicator */}
          {isPolling && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                  <Text size="2" color="blue" weight="medium">
                    Auto-detecting linked accounts...
                  </Text>
                </div>
                <Badge variant="soft" color="blue">
                  {pollProgress.current}/{pollProgress.max}
                </Badge>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(pollProgress.current / pollProgress.max) * 100}%` }}
                />
              </div>
                             <Text size="1" color="blue" className="block mt-2">
                 We check every 10 seconds for newly linked accounts. This will stop automatically when accounts are detected or after 30 seconds.
               </Text>
            </div>
          )}

          {/* Force Refresh Section */}
          {connectedAccounts.length === 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Text size="2" weight="medium" className="block text-blue-800 dark:text-blue-300 mb-1">
                    Just linked accounts in Ayrshare?
                  </Text>
                  <Text size="2" className="text-blue-700 dark:text-blue-300">
                    If you just connected accounts, click refresh to update the status.
                  </Text>
                </div>
                <Button 
                  onClick={refreshConnectedAccounts}
                  disabled={isRefreshing}
                  variant="solid"
                  size="2"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Force Refresh
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Account Group Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Text size="2" weight="medium">Connected Accounts</Text>
              <div className="flex items-center gap-2">
                <Badge variant="soft" color="blue" size="1">
                  Auto-populated from Ayrshare
                </Badge>
                <Button
                  size="1"
                  variant="soft"
                  onClick={handleLinkAccounts}
                  disabled={isLinking}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Add More
                </Button>
              </div>
            </div>

            {/* Jazz Database Corruption Warning */}
            {!accountGroup?.accounts && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <Text size="2" weight="medium" className="text-red-800 dark:text-red-300">
                    Database Corruption Detected
                  </Text>
                </div>
                <Text size="2" className="text-red-700 dark:text-red-300 mb-3 block">
                  Your account group data is corrupted. This can happen if the browser was closed during account group creation.
                </Text>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleDatabaseReset}
                    variant="solid"
                    color="red"
                    size="2"
                  >
                    Clear Data & Start Fresh
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/'}
                    variant="soft"
                    size="2"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            )}

            {/* Add Account Form */}
            {showAddAccountForm && (
              <Card className="p-4 border-dashed border-2 border-gray-300 dark:border-gray-600">
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
                      setError(null);
                    }}
                    size="2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Account Group Accounts List */}
            {(() => {
              const accountsArray = getAccountsArray();
              
              if (accountsArray.length > 0) {
                return (
                  <div className="space-y-2">
                    {accountsArray.map((account: any, index: number) => {
                      if (!account) return null; // Skip null/undefined accounts
                      
                      const platformKey = account.platform === 'x' ? 'twitter' : account.platform;
                      const isConnected = account.isLinked || connectedAccounts.includes(platformKey);
                      
                      return (
                        <Card key={account.id || index} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Image 
                                src={platformIcons[account.platform as keyof typeof platformIcons]} 
                                alt={account.platform} 
                                width={20} 
                                height={20} 
                              />
                              <div>
                                <Text size="2" weight="medium">{account.displayName || account.username || account.name || 'Unknown Account'}</Text>
                                <Text size="1" color="gray" className="block capitalize">
                                  {platformLabels[account.platform as keyof typeof platformLabels] || account.platform}
                                </Text>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <Badge variant="soft" color={isConnected ? 'green' : 'gray'} size="1">
                                {isConnected ? 'Connected' : 'Not Connected'}
                              </Badge>
                              <Button 
                                size="1" 
                                variant="ghost" 
                                onClick={() => handleRemoveAccount(index, account)}
                                className="text-red-500 hover:text-red-700 dark:text-red-300"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                );
              } else if (!showAddAccountForm && accountGroup?.accounts !== undefined) {
                return (
                  <div className="text-center py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <Text size="2" color="gray" className="block mb-3">
                      No accounts found
                    </Text>
                    <Text size="1" color="gray" className="block mb-4">
                      Connect your social media accounts in Ayrshare and they'll automatically appear here
                    </Text>
                    <Button size="2" onClick={handleLinkAccounts} disabled={isLinking}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Connect Accounts in Ayrshare
                    </Button>
                  </div>
                );
              }
              
              return null;
            })()}
          </div>



          {/* Profile Information */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <Text size="2" weight="medium" className="block mb-1 text-blue-800 dark:text-blue-300">
                  Profile Key Management
                </Text>
                <Text size="1" className="text-blue-700 dark:text-blue-300 mb-2">
                  This account group uses Ayrshare user profile: <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">{profileKey?.substring(0, 12)}...</code>
                </Text>
                <Button 
                  size="1" 
                  variant="soft"
                  onClick={() => window.open('https://app.ayrshare.com/social-accounts', '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Manage in Ayrshare
                </Button>
                <Button 
                  size="1" 
                  variant="outline"
                  className="ml-2"
                  onClick={() => {
                    setNewProfileKey("");
                    setShowChangeProfileKey(true);
                  }}
                >
                  Change Profile Key
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Remove Account Dialog */}
      <Dialog.Root open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <Dialog.Content className="max-w-md">
          <Dialog.Title className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Remove Account
          </Dialog.Title>
          
          {accountToRemove && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Image 
                  src={platformIcons[accountToRemove.account.platform as keyof typeof platformIcons]} 
                  alt={accountToRemove.account.platform} 
                  width={24} 
                  height={24} 
                />
                <div>
                  <Text size="2" weight="medium">{accountToRemove.account.name}</Text>
                  <Text size="1" color="gray" className="block capitalize">
                    {platformLabels[accountToRemove.account.platform as keyof typeof platformLabels]}
                  </Text>
                </div>
              </div>

              <div className="space-y-3">
                <Text size="2">Choose what you want to do:</Text>
                
                <div className="space-y-2">
                  <Button
                    variant="soft"
                    onClick={() => handleConfirmRemove('removeFromGroup')}
                    disabled={isRemoving}
                    className="w-full justify-start"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove from Account Group Only
                  </Button>
                  <Text size="1" color="gray" className="block pl-6">
                    Removes from this group but keeps connected to Ayrshare
                  </Text>
                </div>

                {connectedAccounts.includes(accountToRemove.account.platform === 'x' ? 'twitter' : accountToRemove.account.platform) && (
                  <div className="space-y-2">
                    <Button
                      variant="solid"
                      color="red"
                      onClick={() => handleConfirmRemove('disconnectFromAyrshare')}
                      disabled={isRemoving}
                      className="w-full justify-start"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Disconnect from Ayrshare & Remove
                    </Button>
                    <Text size="1" color="gray" className="block pl-6">
                      Fully disconnects the account and removes from group
                    </Text>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="soft" onClick={() => setShowRemoveDialog(false)} disabled={isRemoving}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Root>

      {/* Change Profile Key Dialog */}
      <Dialog.Root open={showChangeProfileKey} onOpenChange={setShowChangeProfileKey}>
        <Dialog.Content className="max-w-md">
          <Dialog.Title className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            Change Ayrshare Profile Key
          </Dialog.Title>
          <div className="space-y-4 mt-4">
            <Text size="2" className="block">Paste the new Ayrshare Profile Key for this account group.</Text>
            <Input
              value={newProfileKey}
              onChange={(e) => setNewProfileKey(e.target.value.trim())}
              placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="soft" onClick={() => setShowChangeProfileKey(false)} disabled={isSavingProfileKey}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!newProfileKey) {
                    setError('Please enter a Profile Key');
                    return;
                  }
                  if (!/^[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/i.test(newProfileKey)) {
                    setError('Invalid profile key format. Expected XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX');
                    return;
                  }
                  setIsSavingProfileKey(true);
                  setError(null);
                  try {
                    // Verify the profile key via Ayrshare /user
                    const userData = await getConnectedAccounts(newProfileKey);
                    // Save into Jazz
                    if (accountGroup) {
                      accountGroup.ayrshareProfileKey = newProfileKey;
                      if (userData?.title) {
                        accountGroup.ayrshareProfileTitle = userData.title;
                      }
                    }
                    setSuccess('✅ Profile key updated. Refreshing connected accounts...');
                    setShowChangeProfileKey(false);
                    await refreshConnectedAccounts();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to verify profile key');
                  } finally {
                    setIsSavingProfileKey(false);
                  }
                }}
                disabled={isSavingProfileKey}
              >
                {isSavingProfileKey ? 'Saving...' : 'Verify & Save'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
} 