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
  };

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
    fullResult: result,
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