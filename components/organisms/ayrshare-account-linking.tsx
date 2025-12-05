"use client";

import { useState } from "react";
import { Button, Card, Text } from "@radix-ui/themes";
import { ExternalLink, RefreshCw, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { getFreeConnectedAccounts } from "@/utils/ayrshareIntegration";

interface Account {
  id?: string;
  platform: string;
  name: string;
  isLinked: boolean;
  status: "pending" | "linked" | "error" | "expired";
}

interface AyrshareAccountLinkingProps {
  accounts: Account[];
  onAccountsUpdated: (updatedAccounts: Account[]) => void;
  isJazzAccountGroup?: boolean;
}

export default function AyrshareAccountLinking({ 
  accounts, 
  onAccountsUpdated, 
  isJazzAccountGroup = false 
}: AyrshareAccountLinkingProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [linkingStatus, setLinkingStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const pendingAccounts = accounts.filter(account => !account.isLinked);
  const linkedAccounts = accounts.filter(account => account.isLinked);

  const handleOpenDashboard = () => {
    window.open("https://app.ayrshare.com/social-accounts", '_blank');
    setLinkingStatus("Link your accounts in the Ayrshare dashboard, then click 'Check Status' to refresh.");
  };

  const handleCheckAccountStatus = async () => {
    if (accounts.length === 0) {
      setError("No accounts to check");
      return;
    }

    setIsChecking(true);
    setError("");
    setLinkingStatus("Checking linked accounts...");
    
    // Debug: Check environment variables
    const apiKey = process.env.NEXT_PUBLIC_AYRSHARE_API_KEY;
    console.log('🔑 API Key configured:', !!apiKey);
    console.log('🔑 API Key length:', apiKey?.length || 0);
    console.log('🔑 API Key starts with:', apiKey?.substring(0, 10) + '...');
    
    if (!apiKey) {
      setError('❌ NEXT_PUBLIC_AYRSHARE_API_KEY environment variable is not set!\n\nPlease add it to your .env file:\nNEXT_PUBLIC_AYRSHARE_API_KEY=your_api_key_here');
      setIsChecking(false);
      return;
    }
    
    try {
      const connectedAccounts = await getFreeConnectedAccounts();
      
      // Debug: Log the full response with detailed structure
      console.log('🔍 FULL Ayrshare API Response:', JSON.stringify(connectedAccounts, null, 2));
      console.log('🔍 Response type:', typeof connectedAccounts);
      console.log('🔍 Response keys:', Object.keys(connectedAccounts));
      
      // Check multiple possible locations for social accounts
      console.log('🔍 activeSocialAccounts:', connectedAccounts.activeSocialAccounts);
      console.log('🔍 activeSocialAccounts type:', typeof connectedAccounts.activeSocialAccounts);
      console.log('🔍 activeSocialAccounts keys:', connectedAccounts.activeSocialAccounts ? Object.keys(connectedAccounts.activeSocialAccounts) : 'undefined');
      
      // Check other possible properties
      console.log('🔍 socialMediaAccounts:', connectedAccounts.socialMediaAccounts);
      console.log('🔍 connectedAccounts:', connectedAccounts.connectedAccounts);
      console.log('🔍 platforms:', connectedAccounts.platforms);
      console.log('🔍 user:', connectedAccounts.user);
      
      // Try to find any property that contains account information
      Object.keys(connectedAccounts).forEach(key => {
        const value = connectedAccounts[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          console.log(`🔍 ${key} object keys:`, Object.keys(value));
        }
      });
      
      // Fix: Handle activeSocialAccounts as either array or object
      let linkedPlatforms: string[] = [];
      
      if (connectedAccounts.activeSocialAccounts) {
        if (Array.isArray(connectedAccounts.activeSocialAccounts)) {
          // It's an array of platform names like ["instagram", "twitter"]
          linkedPlatforms = connectedAccounts.activeSocialAccounts;
          console.log('📱 Linked platforms from Ayrshare (array):', linkedPlatforms);
        } else if (typeof connectedAccounts.activeSocialAccounts === 'object') {
          // It's an object with platform keys like {instagram: {...}, twitter: {...}}
          linkedPlatforms = Object.keys(connectedAccounts.activeSocialAccounts);
          console.log('📱 Linked platforms from Ayrshare (object keys):', linkedPlatforms);
        }
      }
      
      if (linkedPlatforms.length > 0) {
        // Debug: Show what we're looking for vs what we found
        console.log('🎯 Our accounts:', accounts.map(acc => ({ platform: acc.platform, name: acc.name })));
        
        // Update account statuses based on what's linked
        const updatedAccounts = accounts.map(account => {
          // Recognize both 'x' and 'twitter'
          const platformKeysToCheck = new Set(
            [account.platform, account.platform === 'x' ? 'twitter' : null, account.platform === 'twitter' ? 'x' : null]
              .filter(Boolean) as string[]
          );
          const isLinked = linkedPlatforms.some(p => platformKeysToCheck.has(p));
          
          console.log(`🔗 Checking ${account.platform} against ${Array.from(platformKeysToCheck).join('/')}: ${isLinked ? 'LINKED' : 'NOT LINKED'}`);
          
          return {
            ...account,
            isLinked,
            status: isLinked ? "linked" as const : "pending" as const,
          };
        });
        
        onAccountsUpdated(updatedAccounts);
        
        const newlyLinked = updatedAccounts.filter(acc => acc.isLinked).length;
        const previouslyLinked = linkedAccounts.length;
        
        // Enhanced status message with debug info
        let statusMessage = "";
        if (newlyLinked > previouslyLinked) {
          statusMessage = `✅ Great! ${newlyLinked - previouslyLinked} new account(s) linked successfully!`;
        } else if (newlyLinked > 0) {
          statusMessage = `${newlyLinked} account(s) are linked. ${updatedAccounts.length - newlyLinked} still pending.`;
        } else {
          statusMessage = `No linked accounts detected. Found platforms in Ayrshare: [${linkedPlatforms.join(', ')}]`;
        }
        
        // Add debug info to status
        statusMessage += `\n\nDEBUG INFO:\n• Ayrshare platforms: ${linkedPlatforms.join(', ') || 'none'}\n• Looking for: ${accounts.map(a => a.platform).join(', ')}`;
        
        setLinkingStatus(statusMessage);
      } else {
        console.log('❌ No activeSocialAccounts found in response or empty object');
        console.log('📋 Full response keys:', Object.keys(connectedAccounts));
        
        // Try alternative approaches to find social accounts
        let alternativeAccounts = null;
        
        // Check if social accounts are in a different location
        if (connectedAccounts.socialMediaAccounts) {
          alternativeAccounts = connectedAccounts.socialMediaAccounts;
          console.log('🔍 Found socialMediaAccounts instead:', alternativeAccounts);
        } else if (connectedAccounts.user?.socialMediaAccounts) {
          alternativeAccounts = connectedAccounts.user.socialMediaAccounts;
          console.log('🔍 Found user.socialMediaAccounts instead:', alternativeAccounts);
        } else if (connectedAccounts.platforms) {
          alternativeAccounts = connectedAccounts.platforms;
          console.log('🔍 Found platforms instead:', alternativeAccounts);
        }
        
        if (alternativeAccounts && typeof alternativeAccounts === 'object') {
          const altPlatforms = Object.keys(alternativeAccounts);
          console.log('🔍 Alternative platforms found:', altPlatforms);
          
          if (altPlatforms.length > 0) {
            // Update accounts using the alternative location
            const updatedAccounts = accounts.map(account => {
              const platformKey = account.platform === 'x' ? 'twitter' : account.platform;
              const isLinked = altPlatforms.includes(platformKey);
              return {
                ...account,
                isLinked,
                status: isLinked ? "linked" as const : "pending" as const,
              };
            });
            
            onAccountsUpdated(updatedAccounts);
            setLinkingStatus(`✅ Found ${altPlatforms.length} linked account(s) in alternative location!\nPlatforms: ${altPlatforms.join(', ')}`);
            return;
          }
        }
        
        // Don't update accounts if no linked accounts are found - preserve existing state
        // This prevents clearing accounts when Ayrshare temporarily returns empty data
        let debugMessage = "No linked accounts found in Ayrshare response.";
        debugMessage += `\n\nDEBUG: No activeSocialAccounts property found or it's empty.`;
        debugMessage += `\nResponse keys: ${Object.keys(connectedAccounts).join(', ')}`;
        debugMessage += `\n\nFull API Response (check console for details):`;
        debugMessage += `\n${JSON.stringify(connectedAccounts, null, 2)}`;
        debugMessage += `\n\nThis usually means no social media accounts are connected to your Ayrshare account yet.`;
        debugMessage += `\nExisting account states have been preserved.`;
        debugMessage += `\nPlease connect accounts in the Ayrshare dashboard first.`;
        
        setLinkingStatus(debugMessage);
      }
    } catch (error) {
      console.error('❌ Error checking accounts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to check account status: ${errorMessage}\n\nPlease check:\n1. Your NEXT_PUBLIC_AYRSHARE_API_KEY is set correctly\n2. You're using the same email for both services\n3. Your Ayrshare account has the API enabled`);
      setLinkingStatus("");
    } finally {
      setIsChecking(false);
    }
  };

  if (pendingAccounts.length === 0) {
    return (
      <Card>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <Text weight="medium" color="green">All Accounts Connected</Text>
          </div>
          <Text size="2" className="mt-1 text-green-700 dark:text-green-300">
            All {accounts.length} social media accounts are successfully linked to Ayrshare.
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 bg-brand-mint/10 border border-brand-mint/40 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-brand-seafoam flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <Text weight="medium" className="text-brand-seafoam mb-2 block">
              Connect Pending Accounts to Ayrshare
            </Text>
            
            <Text size="2" className="text-brand-seafoam mb-3 block">
              You have {pendingAccounts.length} account(s) that need to be connected to Ayrshare for publishing:
            </Text>
            
            {/* List of pending accounts */}
            <div className="mb-4">
              {pendingAccounts.map((account, index) => (
                <div key={`${account.platform}-${account.name}-${index}`} className="flex items-center gap-2 text-sm text-brand-seafoam mb-1">
                  <span className="w-2 h-2 bg-brand-mint rounded-full"></span>
                  <strong className="capitalize">{account.platform}</strong>: {account.name}
                </div>
              ))}
            </div>
            
            {/* Instructions */}
            <div className="mb-4 p-3 bg-card border border-brand-mint/40 rounded text-sm text-brand-seafoam dark:text-brand-mint">
              <strong>To connect your accounts:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Click "Open Ayrshare Dashboard" below</li>
                <li>Log into your Ayrshare account</li>
                <li>Connect your social media accounts in the dashboard</li>
                <li>Return here and click "Check Status" to refresh</li>
              </ol>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button 
                size="2"
                onClick={handleOpenDashboard}
                className="bg-brand-seafoam hover:bg-brand-seafoam"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Ayrshare Dashboard
              </Button>
              
              <Button 
                size="2"
                variant="outline"
                onClick={handleCheckAccountStatus}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Check Status
                  </>
                )}
              </Button>
            </div>
            
            {/* Status messages */}
            {linkingStatus && (
              <div className="mt-3 p-3 bg-card border border-brand-mint/40 rounded text-sm text-brand-seafoam dark:text-brand-mint">
                <pre className="whitespace-pre-wrap font-mono text-xs">{linkingStatus}</pre>
              </div>
            )}
            
            {error && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-300">
                <pre className="whitespace-pre-wrap">{error}</pre>
              </div>
            )}
            
            {/* Additional help */}
            <div className="mt-3 text-xs text-brand-seafoam dark:text-brand-mint">
              <strong>Need help?</strong> Make sure you're using the same email address for both Succulent and Ayrshare.
              {isJazzAccountGroup && " This is a collaborative account group - changes will sync automatically."}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
} 