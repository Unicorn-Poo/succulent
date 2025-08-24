import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from './postConstants';

// =============================================================================
// 🚀 BUSINESS PLAN FEATURES (COMMENTED OUT FOR FREE ACCOUNT DEVELOPMENT)
// =============================================================================
// Uncomment this section when upgrading to Business Plan

/*
 * Interface for Ayrshare User Profile creation
 */
export interface CreateProfileData {
  title?: string;
  // Add any other profile metadata you want to track
}

/*
 * Interface for Ayrshare User Profile response
 */
export interface AyrshareProfile {
  profileKey: string;
  title?: string;
  status: string;
}

/*
 * Interface for JWT generation
 */
export interface GenerateJWTData {
  profileKey: string;
  domain?: string;
  redirect?: string;
  logout?: boolean;
  expiresIn?: number;
}

/*
 * Interface for JWT response
 */
export interface JWTResponse {
  jwt: string;
  url: string;
  profileKey: string;
}

/*
 * Creates a new Ayrshare User Profile
 * @param profileData - Data for the new profile
 * @returns Profile information including Profile Key
 */
export const createAyrshareProfile = async (profileData: CreateProfileData = {}): Promise<AyrshareProfile> => {
  const response = await fetch(`${AYRSHARE_API_URL}/profiles/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    },
    body: JSON.stringify(profileData)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to create Ayrshare profile');
  }

  return result;
};

/*
 * Generates a direct linking URL for Business Plan (non-JWT approach)
 * @param profileKey - Ayrshare Profile Key
 * @param redirectUrl - Optional URL to redirect back to after linking
 * @returns Direct linking URL for Ayrshare dashboard
 */
export const generateDirectLinkingURL = (profileKey: string, redirectUrl?: string): string => {
  console.log('🔗 Generating direct linking URL for profile:', profileKey);
  
  // Use the direct Ayrshare dashboard URL with profile context
  // This approach works within Business Plan limits without requiring JWT
  let linkingURL = `https://app.ayrshare.com/social-accounts?profile=${profileKey}&source=api`;
  
  // Add redirect URL if provided
  if (redirectUrl) {
    const encodedRedirect = encodeURIComponent(redirectUrl);
    linkingURL += `&redirect=${encodedRedirect}`;
  }
  
  console.log('📋 Direct linking URL:', linkingURL);
  return linkingURL;
};

/*
 * DEPRECATED: JWT generation requires Max Pack features
 * Generates a JWT token for social account linking
 * @param jwtData - JWT generation parameters
 * @returns JWT token and linking URL
 */
export const generateLinkingJWT = async (jwtData: GenerateJWTData): Promise<JWTResponse> => {
  console.log('🔗 JWT Generation attempted - requires Max Pack features');
  console.log('🔑 API Key present:', !!AYRSHARE_API_KEY);
  console.log('🌐 API URL:', AYRSHARE_API_URL);
  
  // For Business Plan, use direct linking instead of JWT
  throw new Error('JWT generation requires Max Pack features. Use direct linking instead.');
};

/*
 * Gets the connected social accounts for a profile
 * @param profileKey - Ayrshare Profile Key
 * @returns Connected social accounts information
 */
export const getConnectedAccounts = async (profileKey: string) => {
  console.log('🔗 getConnectedAccounts called with:', {
    profileKey,
    profileKeyLength: profileKey?.length,
    apiUrl: AYRSHARE_API_URL,
    hasApiKey: !!AYRSHARE_API_KEY,
    apiKeyLength: AYRSHARE_API_KEY?.length
  });

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
    'Profile-Key': profileKey
  } as Record<string, string>;

  console.log('📡 Request headers:', {
    hasAuthorization: !!headers.Authorization,
    hasProfileKey: !!headers['Profile-Key'],
    authorizationLength: headers.Authorization?.length,
    profileKeyValue: headers['Profile-Key']
  });

  const response = await fetch(`${AYRSHARE_API_URL}/user`, {
    method: 'GET',
    headers
  });

  console.log('📡 Response status:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    url: response.url
  });

  const result = await response.json();
  
  console.log('📡 Response body:', {
    hasUser: !!result.user,
    hasSocialMediaAccounts: !!result.user?.socialMediaAccounts,
    hasActiveSocialAccounts: !!result.user?.activeSocialAccounts,
    hasTopLevelActiveSocialAccounts: !!result.activeSocialAccounts,
    socialMediaAccountsKeys: result.user?.socialMediaAccounts ? Object.keys(result.user.socialMediaAccounts) : [],
    activeSocialAccountsArray: result.user?.activeSocialAccounts || [],
    topLevelActiveSocialAccountsArray: result.activeSocialAccounts || [],
    status: result.status,
    message: result.message
  });
  
  if (!response.ok) {
    console.error('❌ API request failed:', {
      status: response.status,
      statusText: response.statusText,
      message: result.message,
      errors: result.errors,
      fullResult: result
    });
    throw new Error(result.message || 'Failed to get connected accounts');
  }

  // If no connected accounts info found, fall back to /profiles and merge
  const noAccountsInfo = !result?.activeSocialAccounts &&
                         !result?.user?.activeSocialAccounts &&
                         !result?.user?.socialMediaAccounts &&
                         !result?.displayNames &&
                         !result?.user?.displayNames &&
                         !result?.socialMediaAccounts;
  
  if (noAccountsInfo) {
    try {
      // 1) Try /profiles/profile with Profile-Key header (single profile details)
      try {
        const profileDetailRes = await fetch(`${AYRSHARE_API_URL}/profiles/profile`, {
          method: 'GET',
          headers
        });
        if (profileDetailRes.ok) {
          const profileDetail = await profileDetailRes.json();
          if (profileDetail) {
            const merged = {
              ...result,
              ...(profileDetail.displayNames ? { displayNames: profileDetail.displayNames } : {}),
              ...(profileDetail.activeSocialAccounts ? { activeSocialAccounts: profileDetail.activeSocialAccounts } : {}),
              ...(profileDetail.user?.activeSocialAccounts ? { activeSocialAccounts: profileDetail.user.activeSocialAccounts } : {}),
              ...(profileDetail.user?.socialMediaAccounts ? { socialMediaAccounts: profileDetail.user.socialMediaAccounts } : {}),
            };
            return merged;
          }
        }
      } catch {}

      // 2) Try /profiles?profileKey=... with API key only
      try {
        const { ['Profile-Key']: _omit, ...profilesHeaders } = headers;
        const refId = result?.refId;
        const byKeyUrl = refId
          ? `${AYRSHARE_API_URL}/profiles?refId=${encodeURIComponent(refId)}`
          : `${AYRSHARE_API_URL}/profiles`;
        const byKeyRes = await fetch(byKeyUrl, {
          method: 'GET',
          headers: profilesHeaders
        });
        if (byKeyRes.ok) {
          const byKeyJson: any = await byKeyRes.json();
          if (byKeyJson) {
            // Some responses wrap in { profiles: [...] }
            const list = Array.isArray(byKeyJson)
              ? byKeyJson
              : Array.isArray(byKeyJson.profiles)
                ? byKeyJson.profiles
                : [byKeyJson];
            const candidate = refId
              ? (list.find((p: any) => p?.refId === refId) || list[0])
              : list[0];
            const merged = {
              ...result,
              ...(candidate?.displayNames ? { displayNames: candidate.displayNames } : {}),
              ...(candidate?.activeSocialAccounts ? { activeSocialAccounts: candidate.activeSocialAccounts } : {}),
              ...(candidate?.user?.activeSocialAccounts ? { activeSocialAccounts: candidate.user.activeSocialAccounts } : {}),
              ...(candidate?.user?.socialMediaAccounts ? { socialMediaAccounts: candidate.user.socialMediaAccounts } : {}),
            };
            return merged;
          }
        }
      } catch {}

      // 3) Fall back to listing all profiles and selecting match
      const { ['Profile-Key']: _omit, ...profilesHeaders } = headers;
      const profilesRes = await fetch(`${AYRSHARE_API_URL}/profiles`, {
        method: 'GET',
        headers: profilesHeaders
      });
      const profilesJson = await profilesRes.json();

      if (profilesRes.ok && profilesJson) {
        // Try to extract displayNames or social accounts from various shapes
        let displayNames: any[] | undefined;
        let activeSocialAccounts: string[] | undefined;
        let socialMediaAccounts: Record<string, any> | undefined;

        const tryExtract = (obj: any) => {
          if (!obj) return;
          if (Array.isArray(obj.displayNames)) displayNames = obj.displayNames;
          if (Array.isArray(obj.user?.displayNames)) displayNames = obj.user.displayNames;
          if (Array.isArray(obj.activeSocialAccounts)) activeSocialAccounts = obj.activeSocialAccounts;
          if (Array.isArray(obj.user?.activeSocialAccounts)) activeSocialAccounts = obj.user.activeSocialAccounts;
          if (obj.user?.socialMediaAccounts && typeof obj.user.socialMediaAccounts === 'object') socialMediaAccounts = obj.user.socialMediaAccounts;
          if (obj.socialMediaAccounts && typeof obj.socialMediaAccounts === 'object') socialMediaAccounts = obj.socialMediaAccounts;
        };

        const list = Array.isArray(profilesJson)
          ? profilesJson
          : Array.isArray(profilesJson.profiles)
            ? profilesJson.profiles
            : [profilesJson];
        if (Array.isArray(list)) {
          // Prefer the entry that matches our refId
          const refId = result?.refId;
          const match = refId
            ? list.find((p: any) => p?.refId === refId)
            : list.find((p: any) => p?.profileKey === profileKey || p?.key === profileKey);
          if (match) {
            tryExtract(match);
          } else {
            list.forEach((p: any) => tryExtract(p));
          }
        } else if (profilesJson && typeof profilesJson === 'object') {
          tryExtract(profilesJson);
        }

        // Merge into the original result so downstream parsing works
        return {
          ...result,
          ...(displayNames ? { displayNames } : {}),
          ...(activeSocialAccounts ? { activeSocialAccounts } : {}),
          ...(socialMediaAccounts ? { socialMediaAccounts } : {}),
        };
      }
    } catch (e) {
      console.warn('⚠️ Fallbacks to /profiles failed:', e);
    }
  }

  return result;
};

/*
 * Lists all Ayrshare User Profiles
 * @returns Array of user profiles
 */
export const listAyrshareProfiles = async () => {
  const response = await fetch(`${AYRSHARE_API_URL}/profiles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    }
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to list profiles');
  }

  return result;
};

/*
 * Deletes an Ayrshare User Profile
 * @param profileKey - Profile Key to delete
 * @returns Deletion result
 */
export const deleteAyrshareProfile = async (profileKey: string) => {
  const response = await fetch(`${AYRSHARE_API_URL}/profiles/profile`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
      'Profile-Key': profileKey
    }
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to delete profile');
  }

  return result;
};

/*
 * Configure webhooks for real-time account linking notifications
 * @param profileKey - Ayrshare Profile Key
 * @returns Webhook configuration response
 */
export const configureAccountLinkingWebhooks = async (profileKey: string) => {
  const response = await fetch(`${AYRSHARE_API_URL}/webhooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
      'Profile-Key': profileKey
    },
    body: JSON.stringify({
      url: `${window.location.origin}/api/ayrshare-webhooks`,
      events: [
        'social.account.added',
        'social.account.removed',
        'social.account.error'
      ],
      active: true
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to configure webhooks');
  }

  return result;
};

/*
 * Unlink a social media platform from an Ayrshare user profile
 * @param platform - Social media platform to unlink
 * @param profileKey - Ayrshare Profile Key
 * @returns Unlink response
 */
export const unlinkSocialAccount = async (platform: string, profileKey: string) => {
  const response = await fetch(`${AYRSHARE_API_URL}/profiles/unlink`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
      'Profile-Key': profileKey
    },
    body: JSON.stringify({
      platform: platform
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to unlink social account');
  }

  return result;
};

// =============================================================================
// 🆓 FREE ACCOUNT MODE (ACTIVE FOR DEVELOPMENT)
// =============================================================================

/**
 * Free account mode - simplified account creation
 */
export const createFreeAccountGroup = async (groupName: string) => {
  // For free accounts, we just return a mock structure
  return {
    groupName,
    message: "Account group created! Link your social accounts in the Ayrshare dashboard.",
    dashboardUrl: "https://app.ayrshare.com/dashboard"
  };
};

/**
 * Gets connected accounts for free account (no profile key needed)
 */
export const getFreeConnectedAccounts = async () => {
  const response = await fetch(`${AYRSHARE_API_URL}/user`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    }
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get connected accounts');
  }

  return result;
};

// =============================================================================
// 🔧 SHARED UTILITIES
// =============================================================================

/**
 * Extracts detailed account information from Ayrshare API response
 * @param ayrshareResponse - The response from getConnectedAccounts
 * @returns Object with platforms and detailed account information
 */
export const extractAccountDetails = (ayrshareResponse: any) => {
  let platforms: string[] = [];
  const platformSet = new Set<string>();
  const accountDetails: Record<string, any> = {};
  
  const addPlatforms = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((p) => typeof p === 'string' && platformSet.add(p));
    } else if (typeof value === 'object') {
      Object.keys(value).forEach((p) => platformSet.add(p));
    }
  };

  // If the response is an array (e.g., /profiles list), scan each element
  if (Array.isArray(ayrshareResponse)) {
    ayrshareResponse.forEach((p) => {
      addPlatforms(p?.activeSocialAccounts);
      addPlatforms(p?.user?.activeSocialAccounts);
      addPlatforms(p?.user?.socialMediaAccounts);
      if (Array.isArray(p?.displayNames)) {
        p.displayNames.forEach((acc: any) => {
          if (acc?.platform) platformSet.add(acc.platform);
          if (acc?.platform && !accountDetails[acc.platform]) {
            accountDetails[acc.platform] = {
              username: acc.username,
              displayName: acc.displayName || acc.pageName,
              profile_image_url: acc.userImage,
              profileUrl: acc.profileUrl,
              platform: acc.platform,
              id: acc.id,
              userId: acc.userId,
              pageName: acc.pageName,
              created: acc.created
            };
          }
        });
      }
    });
  }

  // If response has a nested profiles array
  if (Array.isArray(ayrshareResponse?.profiles)) {
    ayrshareResponse.profiles.forEach((p: any) => {
      addPlatforms(p?.activeSocialAccounts);
      addPlatforms(p?.user?.activeSocialAccounts);
      addPlatforms(p?.user?.socialMediaAccounts);
      if (Array.isArray(p?.displayNames)) {
        p.displayNames.forEach((acc: any) => {
          if (acc?.platform) platformSet.add(acc.platform);
          if (acc?.platform && !accountDetails[acc.platform]) {
            accountDetails[acc.platform] = {
              username: acc.username,
              displayName: acc.displayName || acc.pageName,
              profile_image_url: acc.userImage,
              profileUrl: acc.profileUrl,
              platform: acc.platform,
              id: acc.id,
              userId: acc.userId,
              pageName: acc.pageName,
              created: acc.created
            };
          }
        });
      }
    });
  }

  // Collect platforms from multiple possible locations
  addPlatforms(ayrshareResponse.activeSocialAccounts);
  addPlatforms(ayrshareResponse.user?.activeSocialAccounts);
  addPlatforms(ayrshareResponse.user?.socialMediaAccounts);
  addPlatforms(ayrshareResponse.socialMediaAccounts);

  // Also collect from display names if present
  const displayNamesArr = Array.isArray(ayrshareResponse.displayNames)
    ? ayrshareResponse.displayNames
    : Array.isArray(ayrshareResponse.user?.displayNames)
      ? ayrshareResponse.user.displayNames
      : [];

  displayNamesArr.forEach((account: any) => {
    if (account?.platform) platformSet.add(account.platform);
  });

  platforms = Array.from(platformSet);
  
  // Prefer details from displayNames
  displayNamesArr.forEach((account: any) => {
    const platform = account?.platform;
    if (!platform) return;
    if (!accountDetails[platform]) {
      accountDetails[platform] = {
        username: account.username,
        displayName: account.displayName || account.pageName,
        profile_image_url: account.userImage,
        profileUrl: account.profileUrl,
        platform,
        id: account.id,
        userId: account.userId,
        pageName: account.pageName,
        created: account.created
      };
    }
  });

  // Fallback: derive details from socialMediaAccounts object if needed
  if (Object.keys(accountDetails).length === 0) {
    const smObj = ayrshareResponse.user?.socialMediaAccounts || ayrshareResponse.socialMediaAccounts;
    if (smObj && typeof smObj === 'object') {
      Object.keys(smObj).forEach((platform) => {
        const info = smObj[platform] || {};
        accountDetails[platform] = {
          username: info.username || info.handle || info.screen_name,
          displayName: info.display_name || info.full_name || info.name,
          profile_image_url: info.profile_image_url || info.profile_picture,
          profileUrl: info.url || info.profile_url,
          platform,
        };
      });
    }
  }
  
  return { platforms, accountDetails };
};

/**
 * Creates a standardized account object from Ayrshare platform data
 * @param platform - Platform name from Ayrshare (e.g., 'twitter', 'instagram')
 * @param details - Detailed account information from Ayrshare
 * @param profileKey - Ayrshare profile key
 * @returns Standardized account object
 */
export const createAccountFromAyrshareData = (platform: string, details: any, profileKey: string) => {
  // Map Ayrshare platform names to our internal names
  const internalPlatform = AYRSHARE_PLATFORM_MAP[platform] || platform;
  
  // Extract account details using the actual Ayrshare structure
  const username = details?.username || `${platform}-account`;
  const displayName = details?.displayName || details?.pageName || username;
  const avatar = details?.profile_image_url || details?.userImage;
  const url = details?.profileUrl || `https://${platform}.com/${username}`;
  
  return {
    id: `ayrshare-${platform}-${Date.now()}`,
    name: username,
    platform: internalPlatform,
    profileKey,
    isLinked: true,
    linkedAt: new Date(),
    username: username,
    displayName: displayName,
    avatar: avatar,
    url: url,
    status: "linked" as const,
    autoCreated: true // Flag to identify auto-created accounts
  };
};

/**
 * Maps Ayrshare platform names to our internal platform names
 */
export const AYRSHARE_PLATFORM_MAP: Record<string, string> = {
  'instagram': 'instagram',
  'facebook': 'facebook', 
  'twitter': 'x',
  'x': 'x',
  'linkedin': 'linkedin',
  'youtube': 'youtube',
  'tiktok': 'tiktok',
  'pinterest': 'pinterest',
  'reddit': 'reddit',
  'telegram': 'telegram',
  'threads': 'threads',
  'limesky': 'limesky',
  'gmb': 'google', // Google My Business
};

/**
 * Reverse mapping for sending to Ayrshare
 */
export const INTERNAL_TO_AYRSHARE_PLATFORM: Record<string, string> = {
  'instagram': 'instagram',
  'facebook': 'facebook',
  'x': 'twitter', // We use 'x' internally, but Ayrshare uses 'twitter'
  'linkedin': 'linkedin',
  'youtube': 'youtube',
};

/**
 * Validates if the Ayrshare API key is configured
 */
export const validateAyrshareConfig = (): boolean => {
  return Boolean(AYRSHARE_API_KEY && AYRSHARE_API_URL);
};

/**
 * Error handler for Ayrshare API errors
 */
export const handleAyrshareError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unknown error occurred with Ayrshare integration';
};

// =============================================================================
// 🎛️ MODE CONFIGURATION
// =============================================================================

/**
 * Set to true when you upgrade to Business Plan
 * Set to false for free account development
 */
export const USE_BUSINESS_PLAN = true;

/**
 * Helper to determine which workflow to use
 */
export const isBusinessPlanMode = () => USE_BUSINESS_PLAN; 