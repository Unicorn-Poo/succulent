"use client";

import { Card, Text, Button, Badge, Dialog } from "@radix-ui/themes";
import { 
  AlertTriangle, 
  ArrowRight, 
  Check, 
  RefreshCw,
  Users,
  Info,
  Trash2,
  Database
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  createAyrshareProfile,
  isBusinessPlanMode,
  listAyrshareProfiles,
  deleteAyrshareProfile
} from "@/utils/ayrshareIntegration";

interface ProfileMigrationManagerProps {
  accountGroups: any[];
  onMigrationComplete?: () => void;
}

export default function ProfileMigrationManager({ 
  accountGroups, 
  onMigrationComplete 
}: ProfileMigrationManagerProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  
  // Cleanup state
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [orphanedProfiles, setOrphanedProfiles] = useState<any[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isDeletingProfiles, setIsDeletingProfiles] = useState(false);
  const [cleanupResults, setCleanupResults] = useState<Record<string, string>>({});

  const businessPlanAvailable = isBusinessPlanMode();

  // Find account groups that need migration (no ayrshareProfileKey)
  const groupsNeedingMigration = accountGroups.filter(group => group && !group.ayrshareProfileKey);
  const groupsAlreadyMigrated = accountGroups.filter(group => group && group.ayrshareProfileKey);
  
  // Load orphaned profiles when dialog opens
  useEffect(() => {
    if (showCleanupDialog && businessPlanAvailable) {
      loadOrphanedProfiles();
    }
  }, [showCleanupDialog, businessPlanAvailable]);

  const loadOrphanedProfiles = async () => {
    setIsLoadingProfiles(true);
    setError(null);
    
    try {
      const allProfiles = await listAyrshareProfiles();
      const existingProfileKeys = accountGroups
        .filter(group => group?.ayrshareProfileKey)
        .map(group => group.ayrshareProfileKey);
      
      // Find profiles that aren't linked to any current account groups
      const orphaned = (allProfiles.profiles || []).filter(
        (profile: any) => !existingProfileKeys.includes(profile.profileKey)
      );
      
      console.log('🔍 Found orphaned profiles:', orphaned.length);
      setOrphanedProfiles(orphaned);
      
    } catch (error) {
      console.error('❌ Failed to load profiles:', error);
      setError(error instanceof Error ? error.message : 'Failed to load profiles');
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const cleanupOrphanedProfiles = async () => {
    if (orphanedProfiles.length === 0) return;
    
    setIsDeletingProfiles(true);
    setCleanupResults({});
    setError(null);
    
    for (const profile of orphanedProfiles) {
      try {
        setCleanupResults(prev => ({
          ...prev,
          [profile.profileKey]: 'deleting'
        }));
        
        await deleteAyrshareProfile(profile.profileKey);
        
        setCleanupResults(prev => ({
          ...prev,
          [profile.profileKey]: 'deleted'
        }));
        
        console.log(`✅ Deleted orphaned profile: ${profile.title || profile.profileKey}`);
        
      } catch (error) {
        console.error(`❌ Failed to delete profile ${profile.profileKey}:`, error);
        setCleanupResults(prev => ({
          ...prev,
          [profile.profileKey]: 'error'
        }));
      }
    }
    
    setIsDeletingProfiles(false);
    
    // Reload to refresh the list
    setTimeout(() => {
      loadOrphanedProfiles();
    }, 1000);
  };

  const migrateAccountGroup = async (accountGroup: any) => {
    try {
      setMigrationResults(prev => ({
        ...prev,
        [accountGroup.id]: 'creating'
      }));

      // Create Ayrshare user profile
      const profile = await createAyrshareProfile({
        title: accountGroup.name || `Account Group ${accountGroup.id}`
      });

      // Update the account group with the profile information
      accountGroup.ayrshareProfileKey = profile.profileKey;
      accountGroup.ayrshareProfileTitle = profile.title || accountGroup.name;
      accountGroup.updatedAt = new Date();

      setMigrationResults(prev => ({
        ...prev,
        [accountGroup.id]: 'success'
      }));

      return true;
    } catch (error) {
      console.error(`Migration failed for ${accountGroup.name}:`, error);
      
      // Set specific error message for API key issues
      const errorMessage = error instanceof Error ? error.message : 'Migration failed';
      if (errorMessage.includes('API Key not valid') || errorMessage.includes('Authorization')) {
        setError('Invalid Ayrshare API key. Please check your .env file and ensure NEXT_PUBLIC_AYRSHARE_API_KEY is set with your Business Plan API key.');
      }
      
      setMigrationResults(prev => ({
        ...prev,
        [accountGroup.id]: 'error'
      }));
      return false;
    }
  };

  const migrateAllGroups = async () => {
    if (groupsNeedingMigration.length === 0) return;

    setIsMigrating(true);
    setError(null);
    setMigrationResults({});

    try {
      const results = await Promise.allSettled(
        groupsNeedingMigration.map(group => migrateAccountGroup(group))
      );

      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;

      if (successCount === groupsNeedingMigration.length) {
        if (onMigrationComplete) {
          onMigrationComplete();
        }
      } else {
        setError(`Migration completed with ${successCount}/${groupsNeedingMigration.length} successful`);
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  if (!businessPlanAvailable) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-3">
          <Users className="w-8 h-8 text-gray-400 mx-auto" />
          <div>
            <Text size="3" weight="medium" className="block">Profile Migration</Text>
            <Text size="2" color="gray" className="block mt-1">
              Account group migration requires Business Plan
            </Text>
          </div>
          <Button onClick={() => window.open('https://www.ayrshare.com/pricing', '_blank')}>
            Upgrade Plan
          </Button>
        </div>
      </Card>
    );
  }

  if (groupsNeedingMigration.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-3">
          <Check className="w-8 h-8 text-green-500 mx-auto" />
          <div>
            <Text size="3" weight="medium" className="block text-green-800">All Account Groups Migrated</Text>
            <Text size="2" color="gray" className="block mt-1">
              All your account groups have Ayrshare user profiles
            </Text>
          </div>
          <div className="text-sm text-gray-600">
            {groupsAlreadyMigrated.length} account group{groupsAlreadyMigrated.length !== 1 ? 's' : ''} ready for Business Plan features
          </div>
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
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <Text size="3" weight="medium">Account Group Migration Required</Text>
            </div>
            <Badge variant="soft" color="orange">
              {groupsNeedingMigration.length} need migration
            </Badge>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <Text size="2" weight="medium" className="block mb-1">Business Plan Upgrade</Text>
                <Text size="2">
                  To use Business Plan features, each account group needs an Ayrshare user profile. 
                  This migration will create profiles for existing account groups.
                </Text>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text size="2" color="red">{error}</Text>
            </div>
          )}

          {/* Account Groups List */}
          <div className="space-y-3">
            <Text size="2" weight="medium">Account Groups to Migrate:</Text>
            
            <div className="space-y-2">
              {groupsNeedingMigration.map((group) => {
                const status = migrationResults[group.id];
                
                return (
                  <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <Text size="2" weight="medium">{group.name || `Group ${group.id}`}</Text>
                      <Text size="1" color="gray" className="block">
                        {Array.isArray(group.accounts) ? group.accounts.length : Object.keys(group.accounts || {}).length} accounts
                      </Text>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {status === 'creating' && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <Text size="1">Creating...</Text>
                        </div>
                      )}
                      {status === 'success' && (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="w-4 h-4" />
                          <Text size="1">Migrated</Text>
                        </div>
                      )}
                      {status === 'error' && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          <Text size="1">Failed</Text>
                        </div>
                      )}
                      {!status && (
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Already Migrated Groups */}
          {groupsAlreadyMigrated.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <Text size="2" weight="medium" className="text-green-600">
                ✓ Already Migrated ({groupsAlreadyMigrated.length})
              </Text>
              
              <div className="space-y-1">
                {groupsAlreadyMigrated.slice(0, 3).map((group) => (
                  <div key={group.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>{group.name || `Group ${group.id}`}</span>
                  </div>
                ))}
                {groupsAlreadyMigrated.length > 3 && (
                  <Text size="1" color="gray">
                    ...and {groupsAlreadyMigrated.length - 3} more
                  </Text>
                )}
              </div>
            </div>
          )}

          {/* Migration Button */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <Text size="2" color="gray">
              This will create {groupsNeedingMigration.length} Ayrshare user profile{groupsNeedingMigration.length !== 1 ? 's' : ''}
            </Text>
            <Button 
              onClick={migrateAllGroups}
              disabled={isMigrating || groupsNeedingMigration.length === 0}
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Migrate All Groups
                </>
              )}
            </Button>
          </div>

          {/* Post-migration instructions */}
          {Object.values(migrationResults).some(status => status === 'success') && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <Text size="2" weight="medium" className="block mb-1 text-green-800">
                Next Steps
              </Text>
              <Text size="2" className="text-green-700">
                After migration, visit each account group's Settings tab to link your social media accounts 
                using the new Ayrshare user profiles.
              </Text>
            </div>
          )}

          {/* Cleanup Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Text size="3" weight="medium" className="block">Profile Cleanup</Text>
                <Text size="2" color="gray">Remove orphaned Ayrshare profiles</Text>
              </div>
              <Button 
                variant="soft" 
                color="red"
                onClick={() => setShowCleanupDialog(true)}
                disabled={!businessPlanAvailable}
              >
                <Database className="w-4 h-4 mr-2" />
                Clean Up Profiles
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Cleanup Dialog */}
      <Dialog.Root open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <Dialog.Content maxWidth="600px">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-red-500" />
              <div>
                <Text size="4" weight="bold">Cleanup Orphaned Profiles</Text>
                <Text size="2" color="gray">
                  These Ayrshare profiles aren't linked to any account groups in Succulent
                </Text>
              </div>
            </div>

            {isLoadingProfiles && (
              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg mb-4">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <Text size="2" color="blue">Loading profiles...</Text>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <Text size="2" color="red">{error}</Text>
              </div>
            )}

            {!isLoadingProfiles && orphanedProfiles.length === 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <Text size="2" color="green">✅ No orphaned profiles found! All profiles are properly linked.</Text>
              </div>
            )}

            {orphanedProfiles.length > 0 && (
              <div className="space-y-3 mb-6">
                <Text size="3" weight="medium">
                  Found {orphanedProfiles.length} orphaned profile{orphanedProfiles.length !== 1 ? 's' : ''}:
                </Text>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {orphanedProfiles.map((profile) => {
                    const status = cleanupResults[profile.profileKey];
                    
                    return (
                      <div key={profile.profileKey} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <Text size="2" weight="medium">
                            {profile.title || 'Untitled Profile'}
                          </Text>
                          <Text size="1" color="gray" className="block">
                            {profile.profileKey}
                          </Text>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {status === 'deleting' && (
                            <div className="flex items-center gap-2 text-red-600">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <Text size="1">Deleting...</Text>
                            </div>
                          )}
                          {status === 'deleted' && (
                            <div className="flex items-center gap-2 text-green-600">
                              <Check className="w-4 h-4" />
                              <Text size="1">Deleted</Text>
                            </div>
                          )}
                          {status === 'error' && (
                            <div className="flex items-center gap-2 text-red-600">
                              <AlertTriangle className="w-4 h-4" />
                              <Text size="1">Error</Text>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex gap-3 pt-3">
                  <Button 
                    color="red"
                    onClick={cleanupOrphanedProfiles}
                    disabled={isDeletingProfiles}
                  >
                    {isDeletingProfiles ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete All Orphaned Profiles
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="soft"
                    onClick={() => loadOrphanedProfiles()}
                    disabled={isLoadingProfiles || isDeletingProfiles}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingProfiles ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="soft" onClick={() => setShowCleanupDialog(false)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
} 