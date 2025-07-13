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
 * Generates a JWT token for social account linking
 * @param jwtData - JWT generation parameters
 * @returns JWT token and linking URL
 */
export const generateLinkingJWT = async (jwtData: GenerateJWTData): Promise<JWTResponse> => {
  const response = await fetch(`${AYRSHARE_API_URL}/profiles/generateJWT`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    },
    body: JSON.stringify(jwtData)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to generate JWT');
  }

  return result;
};

/*
 * Gets the connected social accounts for a profile
 * @param profileKey - Ayrshare Profile Key
 * @returns Connected social accounts information
 */
export const getConnectedAccounts = async (profileKey: string) => {
  const response = await fetch(`${AYRSHARE_API_URL}/user`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
      'Profile-Key': profileKey
    }
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get connected accounts');
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
export const USE_BUSINESS_PLAN = false;

/**
 * Helper to determine which workflow to use
 */
export const isBusinessPlanMode = () => USE_BUSINESS_PLAN; 