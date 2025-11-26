"use client";

import { Card, Text, Button, Badge, Dialog } from "@radix-ui/themes";
import { 
  User, 
  Plus, 
  Settings, 
  Trash2, 
  Edit, 
  Key, 
  Users, 
  Copy, 
  Check,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  createAyrshareProfile,
  generateDirectLinkingURL,
  getConnectedAccounts,
  isBusinessPlanMode
} from "@/utils/ayrshareIntegration";

interface UserProfile {
  profileKey: string;
  title: string;
  createdAt: string;
  connectedAccounts?: string[];
  status: 'active' | 'inactive' | 'setup';
}

interface UserProfileManagementProps {
  onProfileCreated?: (profile: UserProfile) => void;
  existingProfiles?: UserProfile[];
}

export default function UserProfileManagement({ 
  onProfileCreated, 
  existingProfiles = [] 
}: UserProfileManagementProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>(existingProfiles);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProfileTitle, setNewProfileTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const businessPlanAvailable = isBusinessPlanMode();

  // Create new user profile
  const handleCreateProfile = async () => {
    if (!newProfileTitle.trim()) {
      setError('Please enter a profile title');
      return;
    }

    setIsCreating(true);
    setError(null);
    
    try {
      const result = await createAyrshareProfile({
        title: newProfileTitle.trim()
      });

      const newProfile: UserProfile = {
        profileKey: result.profileKey,
        title: newProfileTitle.trim(),
        createdAt: new Date().toISOString(),
        connectedAccounts: [],
        status: 'setup'
      };

      setProfiles(prev => [...prev, newProfile]);
      setNewProfileTitle('');
      setShowCreateDialog(false);
      setSuccess(`Profile "${newProfile.title}" created successfully!`);

      if (onProfileCreated) {
        onProfileCreated(newProfile);
      }
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create profile');
    } finally {
      setIsCreating(false);
    }
  };

  // Direct linking for account linking (Business Plan approach)
  const handleLinkAccounts = async (profileKey: string) => {
    try {
      // Create redirect URL back to current page
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('linked', 'true');
      currentUrl.searchParams.set('profile', profileKey);
      const redirectUrl = currentUrl.toString();

      // Generate direct linking URL with redirect (no JWT required - Business Plan compatible)
      const linkingURL = generateDirectLinkingURL(profileKey, redirectUrl);

      // Open Ayrshare dashboard in new window
      const linkingWindow = window.open(linkingURL, '_blank', 'width=1200,height=800');
      
      if (linkingWindow) {
        linkingWindow.focus();
        setSuccess('Ayrshare dashboard opened. Link your social media accounts there - we\'ll automatically detect when you\'re done!');
      } else {
        setError('Please allow popups to open the Ayrshare dashboard');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to open account linking');
    }
  };

  // Check connected accounts for a profile
  const handleRefreshAccounts = async (profileKey: string) => {
    try {
      const result = await getConnectedAccounts(profileKey);
      
      const connectedPlatforms = result.user?.socialMediaAccounts 
        ? Object.keys(result.user.socialMediaAccounts)
        : [];

      setProfiles(prev => prev.map(profile => 
        profile.profileKey === profileKey 
          ? { 
              ...profile, 
              connectedAccounts: connectedPlatforms,
              status: connectedPlatforms.length > 0 ? 'active' : 'setup'
            }
          : profile
      ));

      setSuccess(`Found ${connectedPlatforms.length} connected account(s)`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refresh accounts');
    }
  };

  // Copy profile key to clipboard
  const handleCopyKey = async (profileKey: string) => {
    try {
      await navigator.clipboard.writeText(profileKey);
      setCopiedKey(profileKey);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      setError('Failed to copy profile key');
    }
  };

  // Delete profile (Note: This would need additional API endpoint)
  const handleDeleteProfile = (profileKey: string) => {
    if (confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      setProfiles(prev => prev.filter(profile => profile.profileKey !== profileKey));
      setSuccess('Profile deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  if (!businessPlanAvailable) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <Users className="w-12 h-12 text-gray-400 mx-auto" />
          <div>
            <Text size="4" weight="bold" className="block mb-2">User Profile Management</Text>
            <Text size="2" color="gray" className="block mb-4">
              Multi-user profile management requires Ayrshare Business Plan
            </Text>
            <Button onClick={() => window.open('https://www.ayrshare.com/pricing', '_blank')}>
              Upgrade to Business Plan
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Text size="5" weight="bold">User Profile Management</Text>
          <Text size="2" color="gray" className="mt-1">
            Manage multiple user profiles for your Ayrshare Business Plan
          </Text>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Profile
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <Card>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <Text color="red">{error}</Text>
            </div>
          </div>
        </Card>
      )}

      {success && (
        <Card>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              <Text color="green">{success}</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Profiles List */}
      {profiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <Card key={profile.profileKey} className="p-4">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <Text size="3" weight="medium">{profile.title}</Text>
                    </div>
                    <Badge 
                      variant="soft" 
                      color={profile.status === 'active' ? 'green' : profile.status === 'setup' ? 'orange' : 'gray'}
                    >
                      {profile.status === 'active' ? 'Active' : profile.status === 'setup' ? 'Setup Required' : 'Inactive'}
                    </Badge>
                  </div>
                  <button
                    onClick={() => handleDeleteProfile(profile.profileKey)}
                    className="text-red-500 hover:text-red-700 dark:text-red-300 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <span>{new Date(profile.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Accounts:</span>
                    <span>{profile.connectedAccounts?.length || 0} connected</span>
                  </div>
                </div>

                {/* Connected Accounts */}
                {profile.connectedAccounts && profile.connectedAccounts.length > 0 && (
                  <div>
                    <Text size="2" weight="medium" className="block mb-2">Connected Accounts</Text>
                    <div className="flex flex-wrap gap-1">
                      {profile.connectedAccounts.map((platform) => (
                        <Badge key={platform} variant="outline" size="1">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile Key */}
                <div>
                  <Text size="2" weight="medium" className="block mb-1">Profile Key</Text>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded font-mono truncate">
                      {profile.profileKey}
                    </code>
                    <button
                      onClick={() => handleCopyKey(profile.profileKey)}
                      className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:text-gray-200"
                    >
                      {copiedKey === profile.profileKey ? (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    size="2" 
                    variant="soft" 
                    className="flex-1"
                    onClick={() => handleLinkAccounts(profile.profileKey)}
                  >
                    <Settings className="w-3 h-3 mr-1" />
                    Link Accounts
                  </Button>
                  <Button 
                    size="2" 
                    variant="outline"
                    onClick={() => handleRefreshAccounts(profile.profileKey)}
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="p-8 text-center space-y-4">
            <Users className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <Text size="3" weight="medium" className="block mb-2">No Profiles Created</Text>
              <Text size="2" color="gray" className="block mb-4">
                Create your first user profile to start managing multiple client accounts
              </Text>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Profile
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Create Profile Dialog */}
      <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Create New User Profile</Dialog.Title>
          <Dialog.Description style={{ marginBottom: '24px', color: '#666' }}>
            Create a new user profile to manage a separate set of social media accounts.
          </Dialog.Description>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Profile Title
              </label>
              <input
                type="text"
                value={newProfileTitle}
                onChange={(e) => setNewProfileTitle(e.target.value)}
                placeholder="e.g., Client Name or Project Name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isCreating}
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Text size="2" className="text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> Each profile gets its own set of social media accounts and analytics data.
              </Text>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="soft"
              onClick={() => {
                setShowCreateDialog(false);
                setNewProfileTitle('');
                setError(null);
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProfile}
              disabled={isCreating || !newProfileTitle.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Profile'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/* Info Card */}
      <Card>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <Text size="2" weight="medium" className="block mb-1 text-blue-800 dark:text-blue-300">
                About Profile Keys
              </Text>
              <Text size="2" className="text-blue-700 dark:text-blue-300 mb-3">
                Profile Keys are unique identifiers that allow you to manage multiple sets of social media accounts. 
                Each profile operates independently with its own analytics and settings.
              </Text>
              <Button 
                size="1" 
                variant="soft"
                onClick={() => window.open('https://www.ayrshare.com/docs/apis/user-management/overview', '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
} 