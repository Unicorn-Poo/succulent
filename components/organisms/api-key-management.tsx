"use client";

import { useState, useEffect } from "react";
import { Card, Text, Button, Badge, Dialog, TextField, TextArea, Tabs, Checkbox } from "@radix-ui/themes";
import {
  Key,
  Plus,
  Trash2,
  Edit,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
  Activity,
  Clock,
  Shield,
  BarChart3,
  Settings
} from "lucide-react";
import { useAccount } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";

// =============================================================================
// 🔐 TYPES & INTERFACES
// =============================================================================

interface APIKey {
  keyId: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'revoked';
  createdAt: string;
  lastUsedAt?: string;
  usageCount: number;
  monthlyUsageCount: number;
  rateLimitTier: 'standard' | 'premium' | 'enterprise';
  description?: string;
  expiresAt?: string;
}

interface CreateKeyForm {
  name: string;
  description: string;
  permissions: ('posts:create' | 'posts:read' | 'posts:update' | 'posts:delete' | 'accounts:read' | 'analytics:read' | 'media:upload')[];
  rateLimitTier: 'standard' | 'premium' | 'enterprise';
  expiresAt?: string;
  accountGroupIds?: string[];
  allowedOrigins?: string[];
  ipWhitelist?: string[];
}

// =============================================================================
// 🎯 MAIN COMPONENT
// =============================================================================

export default function APIKeyManagement() {
  const { me } = useAccount(MyAppAccount, {
    resolve: {
      profile: {
        apiKeys: { $each: true },
        apiKeyUsageLogs: { $each: true }
      }
    }
  });
  
  // State management
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  
  // Form state
  const [createForm, setCreateForm] = useState<CreateKeyForm>({
    name: '',
    description: '',
    permissions: ['posts:create', 'posts:read'],
    rateLimitTier: 'standard'
  });

  // Copy states
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Available permissions
  const availablePermissions = [
    { id: 'posts:create', name: 'Create Posts', description: 'Create new social media posts' },
    { id: 'posts:read', name: 'Read Posts', description: 'View existing posts and metadata' },
    { id: 'posts:update', name: 'Update Posts', description: 'Edit existing posts' },
    { id: 'posts:delete', name: 'Delete Posts', description: 'Delete posts' },
    { id: 'accounts:read', name: 'Read Accounts', description: 'View account group information' },
    { id: 'analytics:read', name: 'Read Analytics', description: 'Access analytics data' },
    { id: 'media:upload', name: 'Upload Media', description: 'Upload images and videos' },
  ];

  // =============================================================================
  // 🔄 DATA LOADING
  // =============================================================================

  useEffect(() => {
    loadAPIKeys();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Loading API keys - Account state:', {
        hasMe: !!me,
        accountId: me?.id,
        hasProfile: !!me?.profile,
        profileId: me?.profile?.id,
        profileName: me?.profile?.name,
        hasApiKeysJson: !!me?.profile?.apiKeysJson,
        apiKeysJsonLength: me?.profile?.apiKeysJson?.length || 0,
        apiKeysJsonPreview: me?.profile?.apiKeysJson?.substring(0, 100) + '...',
        hasApiKeys: !!me?.profile?.apiKeys,
        apiKeysLength: me?.profile?.apiKeys?.length || 0,
        apiKeysListId: me?.profile?.apiKeys?.id,
        apiKeysListOwner: me?.profile?.apiKeys?._owner?.id,
        profileOwner: me?.profile?._owner?.id,
        // Debug: show ALL profile fields
        profileKeys: me?.profile ? Object.keys(me.profile) : []
      });

      if (!me?.id) {
        setError('User account not available');
        return;
      }

      if (!me.profile) {
        setError('User profile not available');
        return;
      }

      // Initialize apiKeys if it doesn't exist
      if (!me.profile.apiKeys) {
        try {
          console.log('🔧 Initializing API keys list for user profile');
          const { co } = await import('jazz-tools');
          const { APIKey } = await import('@/app/schema');
          
          // Create the API keys list with the profile owner (Group)
          const profileOwner = me.profile._owner;
          me.profile.apiKeys = co.list(APIKey).create([], profileOwner);
          console.log('✅ API keys list initialized successfully with Group ownership');
        } catch (initError) {
          console.error('❌ Failed to initialize API keys list:', initError);
          setError('Failed to initialize API keys. Please refresh the page.');
          return;
        }
      }

      // Load API keys from JSON storage (persistent) and sync to list (for UI)
      console.log('📋 Checking JSON storage for API keys...');
      
      let keysFromJson = [];
      if (me.profile.apiKeysJson) {
        try {
          keysFromJson = JSON.parse(me.profile.apiKeysJson);
          console.log('💾 Found API keys in JSON storage:', keysFromJson.length);
        } catch (parseError) {
          console.error('❌ Failed to parse API keys JSON:', parseError);
          keysFromJson = [];
        }
      } else {
        console.log('📝 No JSON storage found');
      }
      
      // Also check the collaborative list
      const keysFromList = me.profile.apiKeys?.length || 0;
      console.log('📋 API keys in collaborative list:', keysFromList);
      
      if (keysFromJson.length > 0) {
        console.log('🔑 Loading API keys from JSON storage...');
        
        // Sync JSON storage to collaborative list if needed
        if (!me.profile.apiKeys || me.profile.apiKeys.length === 0) {
          console.log('🔄 Syncing JSON storage to collaborative list...');
          try {
            if (!me.profile.apiKeys) {
              const { co } = await import('jazz-tools');
              const { APIKey } = await import('@/app/schema');
              const profileOwner = me.profile._owner;
              me.profile.apiKeys = co.list(APIKey).create([], profileOwner);
            }
            
            // Recreate API key objects from JSON and add to list
            for (const keyJson of keysFromJson) {
              const { APIKey } = await import('@/app/schema');
              const apiKeysOwner = me.profile._owner;
              
              const recreatedKey = APIKey.create({
                keyId: keyJson.keyId,
                name: keyJson.name,
                keyPrefix: keyJson.keyPrefix,
                hashedKey: keyJson.hashedKey,
                permissions: keyJson.permissions,
                status: keyJson.status,
                createdAt: new Date(keyJson.createdAt),
                expiresAt: keyJson.expiresAt ? new Date(keyJson.expiresAt) : undefined,
                usageCount: keyJson.usageCount,
                rateLimitTier: keyJson.rateLimitTier,
                monthlyUsageCount: keyJson.monthlyUsageCount,
                monthlyUsageResetDate: new Date(keyJson.monthlyUsageResetDate),
                description: keyJson.description,
                createdBy: keyJson.createdBy
              }, { owner: apiKeysOwner });
              
              me.profile.apiKeys.push(recreatedKey);
            }
            
            console.log('✅ Synced JSON storage to collaborative list');
          } catch (syncError) {
            console.error('❌ Failed to sync to collaborative list:', syncError);
          }
        }
        
        // Map JSON keys to UI format
        const uiApiKeys = keysFromJson.map((key: any) => ({
          keyId: key.keyId,
          name: key.name,
          keyPrefix: key.keyPrefix,
          permissions: key.permissions as ('posts:create' | 'posts:read' | 'posts:update' | 'posts:delete' | 'accounts:read' | 'analytics:read' | 'media:upload')[],
          status: key.status,
          createdAt: key.createdAt,
          lastUsedAt: key.lastUsedAt,
          usageCount: key.usageCount || 0,
          monthlyUsageCount: key.monthlyUsageCount || 0,
          rateLimitTier: key.rateLimitTier,
          description: key.description,
          expiresAt: key.expiresAt
        }));
        
        console.log('✅ Loaded API keys from JSON storage:', uiApiKeys.length);
        setApiKeys(uiApiKeys);
      } else {
        console.log('📝 No API keys found in any storage, setting empty array');
        setApiKeys([]);
      }
    } catch (err) {
      console.error('❌ Error loading API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // 🎬 ACTIONS
  // =============================================================================

  const handleCreateKey = async () => {
    try {
      setError(null);
      
      if (!createForm.name.trim()) {
        setError('API key name is required');
        return;
      }

      if (!me?.id) {
        setError('User account not available');
        return;
      }

      if (!me.profile) {
        setError('User profile not available');
        return;
      }

      // Create API key directly on the client side using Jazz
      const { createAPIKey } = await import('@/utils/apiKeyManager');
      
      console.log('🔐 Creating API key on client side...');
      const { apiKey, keyData } = await createAPIKey(me, {
        name: createForm.name,
        description: createForm.description,
        permissions: createForm.permissions || ['posts:create', 'posts:read'],
        rateLimitTier: createForm.rateLimitTier || 'standard',
        accountGroupIds: createForm.accountGroupIds,
        allowedOrigins: createForm.allowedOrigins,
        ipWhitelist: createForm.ipWhitelist,
        expiresAt: createForm.expiresAt ? new Date(createForm.expiresAt) : undefined
      });

      console.log('✅ API key created successfully on client side:', keyData.keyId);
      
      // Wait a moment for Jazz to sync the changes
      console.log('⏳ Waiting for Jazz sync...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if the key was actually added to the profile
      console.log('🔍 Post-creation check:', {
        profileHasApiKeys: !!me.profile?.apiKeys,
        apiKeysCount: me.profile?.apiKeys?.length || 0,
        lastKeyId: me.profile?.apiKeys?.[me.profile.apiKeys.length - 1]?.keyId,
        profileId: me.profile?.id,
        profileOwner: me.profile?._owner?.id,
        apiKeysListId: me.profile?.apiKeys?.id,
        apiKeysListOwner: me.profile?.apiKeys?._owner?.id
      });
      
      // Test if we can manually trigger a save/sync
      try {
        console.log('🔄 Attempting to check Jazz sync status...');
        const profileRef = me.profile;
        if (profileRef && profileRef.apiKeys) {
          console.log('📤 Profile and apiKeys exist, checking internal state...');
          // Try to access internal Jazz state for debugging
          const profileInternal = (profileRef as any)._raw;
          const apiKeysInternal = (profileRef.apiKeys as any)._raw;
          
          console.log('🔍 Jazz internal state:', {
            profileRawId: profileInternal?.id,
            apiKeysRawId: apiKeysInternal?.id,
            profileHasTransactions: !!profileInternal?.transactions,
            apiKeysHasTransactions: !!apiKeysInternal?.transactions
          });
        }
      } catch (syncError) {
        console.error('❌ Sync check failed:', syncError);
      }
      
      setNewApiKey(apiKey);
      setShowCreateDialog(false);
      setShowKeyDialog(true);
      setCreateForm({
        name: '',
        description: '',
        permissions: ['posts:create', 'posts:read'],
        rateLimitTier: 'standard'
      });
      
      // Check if we're getting a different profile each time (which would explain the persistence issue)
      const currentProfileId = me.profile?.id;
      const storedProfileId = localStorage.getItem('lastProfileId');
      
      if (storedProfileId && storedProfileId !== currentProfileId) {
        console.log('🚨 PROFILE ID CHANGED!', {
          previousId: storedProfileId,
          currentId: currentProfileId,
          explanation: 'This would explain why API keys dont persist - we get a new profile each time!'
        });
      } else if (!storedProfileId) {
        console.log('📝 First time seeing profile ID:', currentProfileId);
      } else {
        console.log('✅ Profile ID consistent:', currentProfileId);
      }
      
      if (currentProfileId) {
        localStorage.setItem('lastProfileId', currentProfileId);
      }
      
      // Reload keys from Jazz
      loadAPIKeys();
      setSuccess('API key created successfully');
      
    } catch (err) {
      console.error('❌ Failed to create API key on client side:', err);
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(`/api/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer mock_session_token`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to revoke API key');
      }

      loadAPIKeys();
      setSuccess('API key revoked successfully');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      setError('Failed to copy API key to clipboard');
    }
  };

  // =============================================================================
  // 🎨 HELPER FUNCTIONS
  // =============================================================================

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'inactive': return 'orange';
      case 'revoked': return 'red';
      default: return 'gray';
    }
  };

  const getRateLimitInfo = (tier: string) => {
    const limits = {
      standard: { requests: '1,000/hour', color: 'gray' },
      premium: { requests: '5,000/hour', color: 'blue' },
      enterprise: { requests: '25,000/hour', color: 'purple' }
    };
    return limits[tier as keyof typeof limits] || limits.standard;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // =============================================================================
  // 🎭 RENDER
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Text size="5" weight="bold" className="mb-1 block">API Keys</Text>
          <Text size="2" color="gray">
            Manage API keys for programmatic access to your Succulent account
          </Text>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create API Key
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

      {/* API Keys List */}
      <Card>
        <div className="p-6">
          <Text size="4" weight="bold" className="mb-4 block">Your API Keys</Text>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500 mx-auto mb-4"></div>
              <Text size="2" color="gray">Loading API keys...</Text>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <Text size="3" weight="medium" className="mb-2 block">No API keys yet</Text>
              <Text size="2" color="gray" className="mb-4 block">
                Create your first API key to start using the Succulent API
              </Text>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => {
                const statusColor = getStatusColor(key.status);
                const rateLimitInfo = getRateLimitInfo(key.rateLimitTier);
                
                return (
                  <div key={key.keyId} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Text size="3" weight="bold">{key.name}</Text>
                          <Badge color={statusColor as any} size="1">
                            {key.status}
                          </Badge>
                          <Badge color={rateLimitInfo.color as any} variant="soft" size="1">
                            {rateLimitInfo.requests}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-2 text-sm text-muted-foreground">
                          <span className="font-mono bg-muted px-2 py-1 rounded">
                            {key.keyPrefix}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Created {formatDate(key.createdAt)}
                          </span>
                          {key.lastUsedAt && (
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              Last used {formatDate(key.lastUsedAt)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{key.usageCount} total requests</span>
                          <span>{key.monthlyUsageCount} this month</span>
                          <span>{key.permissions.length} permissions</span>
                        </div>
                        
                        {key.description && (
                          <Text size="2" color="gray" className="mt-2 block">
                            {key.description}
                          </Text>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="soft"
                          size="1"
                          onClick={() => setEditingKey(key)}
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="soft"
                          size="1"
                          color="red"
                          onClick={() => handleRevokeKey(key.keyId)}
                          disabled={key.status === 'revoked'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Permissions */}
                    <div className="flex flex-wrap gap-1">
                      {key.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="px-2 py-1 bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 text-xs rounded-md"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* API Documentation Link */}
      <Card>
        <div className="p-4 bg-lime-50 border border-lime-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <Text size="3" weight="medium" className="mb-1 block">
                Ready to start using the API?
              </Text>
              <Text size="2" color="gray">
                Check out our comprehensive API documentation with examples
              </Text>
            </div>
            <Button variant="soft" onClick={() => window.open('/api/docs', '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              View API Docs
            </Button>
          </div>
        </div>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <Dialog.Content style={{ maxWidth: 600 }}>
          <Dialog.Title>Create New API Key</Dialog.Title>
          <Dialog.Description>
            Create a new API key for programmatic access to your Succulent account.
          </Dialog.Description>

          <div className="space-y-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
              <TextField.Root
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Production App, Development, Mobile App"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Description</label>
              <TextArea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Optional description for this API key..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Permissions</label>
              <div className="space-y-2">
                {availablePermissions.map((permission) => (
                  <label key={permission.id} className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={createForm.permissions.includes(permission.id as any)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCreateForm({
                            ...createForm,
                            permissions: [...createForm.permissions, permission.id as any]
                          });
                        } else {
                          setCreateForm({
                            ...createForm,
                            permissions: createForm.permissions.filter(p => p !== permission.id)
                          });
                        }
                      }}
                    />
                    <div>
                      <Text size="2" weight="medium" className="block">{permission.name}</Text>
                      <Text size="1" color="gray">{permission.description}</Text>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Rate Limit Tier</label>
              <select
                value={createForm.rateLimitTier}
                onChange={(e) => setCreateForm({ ...createForm, rateLimitTier: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="standard">Standard (1,000 req/hour)</option>
                <option value="premium">Premium (5,000 req/hour)</option>
                <option value="enterprise">Enterprise (25,000 req/hour)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="soft" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey}>
              Create API Key
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/* Show New API Key Dialog */}
      <Dialog.Root open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Your New API Key</Dialog.Title>
          <Dialog.Description>
            Save this API key now - you won't be able to see it again!
          </Dialog.Description>

          {newApiKey && (
            <div className="mt-6">
              <div className="p-4 bg-muted border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Text size="2" weight="medium">API Key</Text>
                  <Button
                    size="1"
                    variant="soft"
                    onClick={() => handleCopyKey(newApiKey)}
                  >
                    {copiedKey === newApiKey ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <code className="block font-mono text-sm break-all bg-card p-2 rounded border">
                  {newApiKey}
                </code>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <Text size="2" weight="medium" className="text-yellow-800 dark:text-yellow-300 block">
                      Important Security Notice
                    </Text>
                    <Text size="1" className="text-yellow-700 dark:text-yellow-300">
                      This is the only time you'll see this API key. Store it securely and never share it publicly.
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={() => {
              setShowKeyDialog(false);
              setNewApiKey(null);
              if (success) {
                setTimeout(() => setSuccess(null), 3000);
              }
            }}>
              Done
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/* Edit API Key Dialog */}
      <Dialog.Root open={!!editingKey} onOpenChange={(open) => !open && setEditingKey(null)}>
        <Dialog.Content style={{ maxWidth: 600 }}>
          <Dialog.Title>Edit API Key</Dialog.Title>
          <Dialog.Description>
            Update the settings for "{editingKey?.name}"
          </Dialog.Description>

          {editingKey && (
            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
                <TextField.Root
                  value={editingKey.name}
                  onChange={(e) => setEditingKey({ ...editingKey, name: e.target.value })}
                  placeholder="API key name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <TextArea
                  value={editingKey.description || ''}
                  onChange={(e) => setEditingKey({ ...editingKey, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Permissions</label>
                <div className="space-y-2">
                  {availablePermissions.map((permission) => (
                    <label key={permission.id} className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        checked={editingKey.permissions.includes(permission.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditingKey({
                              ...editingKey,
                              permissions: [...editingKey.permissions, permission.id]
                            });
                          } else {
                            setEditingKey({
                              ...editingKey,
                              permissions: editingKey.permissions.filter(p => p !== permission.id)
                            });
                          }
                        }}
                      />
                      <div>
                        <Text size="2" weight="medium" className="block">{permission.name}</Text>
                        <Text size="1" color="gray">{permission.description}</Text>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <select
                  value={editingKey.status}
                  onChange={(e) => setEditingKey({ ...editingKey, status: e.target.value as any })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <Text size="1" color="gray" className="mt-1 block">
                  Inactive keys cannot be used to make API calls
                </Text>
              </div>

              {/* Key Information */}
              <div className="p-4 bg-muted border border-border rounded-lg">
                <Text size="2" weight="medium" className="mb-2 block">Key Information</Text>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div><strong>Key ID:</strong> {editingKey.keyId}</div>
                  <div><strong>Created:</strong> {formatDate(editingKey.createdAt)}</div>
                  <div><strong>Usage:</strong> {editingKey.usageCount} total requests, {editingKey.monthlyUsageCount} this month</div>
                  {editingKey.lastUsedAt && (
                    <div><strong>Last Used:</strong> {formatDate(editingKey.lastUsedAt)}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="soft" onClick={() => setEditingKey(null)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              if (!editingKey) return;
              
              try {
                setError(null);
                
                const response = await fetch(`/api/api-keys/${editingKey.keyId}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer mock_session_token`
                  },
                  body: JSON.stringify({
                    name: editingKey.name,
                    description: editingKey.description,
                    permissions: editingKey.permissions,
                    status: editingKey.status
                  })
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to update API key');
                }

                setEditingKey(null);
                loadAPIKeys();
                setSuccess('API key updated successfully');

              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to update API key');
              }
            }}>
              Save Changes
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
} 