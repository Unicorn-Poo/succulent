// Debug script to test platform mapping
const INTERNAL_TO_AYRSHARE_PLATFORM = {
  'instagram': 'instagram',
  'facebook': 'facebook',
  'x': 'twitter', // Ayrshare API expects 'twitter' not 'x'
  'twitter': 'twitter', // Map legacy 'twitter' to 'twitter'
  'linkedin': 'linkedin',
  'youtube': 'youtube',
  'tiktok': 'tiktok',
  'pinterest': 'pinterest',
  'reddit': 'reddit',
  'telegram': 'telegram',
  'threads': 'threads',
  'bluesky': 'bluesky',
  'google': 'gmb', // Google My Business
};

const mapPlatformsForAyrshare = (platforms) => {
  return platforms.map(platform => INTERNAL_TO_AYRSHARE_PLATFORM[platform] || platform);
};

// Test the mapping
console.log('Testing platform mapping:');
console.log('Input: ["instagram", "x"]');
console.log('Output:', mapPlatformsForAyrshare(['instagram', 'x']));
console.log('');
console.log('Input: ["x"]');
console.log('Output:', mapPlatformsForAyrshare(['x']));
console.log('');
console.log('Input: ["twitter"]');
console.log('Output:', mapPlatformsForAyrshare(['twitter']));
console.log('');
console.log('Expected for Ayrshare API: ["instagram", "twitter"] and ["twitter"] and ["twitter"]');
