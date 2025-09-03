// =============================================================================
// 📝 SHARED API POSTS STORAGE
// =============================================================================

// Simple in-memory store for API posts (in production, this would be a database)
let apiPosts: any[] = [];

/**
 * Add a post to the shared storage
 */
export function addAPIPost(post: any) {
  apiPosts.push(post);
  console.log(`📝 Added post to storage: ${post.id} (total: ${apiPosts.length})`);
  console.log(`📝 Post details:`, { id: post.id, accountGroupId: post.accountGroupId, title: post.title });
  
  // Keep only last 100 posts to prevent memory issues
  if (apiPosts.length > 100) {
    apiPosts = apiPosts.slice(-100);
  }
}

/**
 * Get all posts from storage
 */
export function getAllAPIPosts() {
  return apiPosts;
}

/**
 * Get posts for a specific account group
 */
export function getAPIPostsForGroup(accountGroupId: string) {
  console.log(`📋 Looking for posts with accountGroupId: "${accountGroupId}"`);
  console.log(`📋 Available posts:`, apiPosts.map(p => ({ id: p.id, accountGroupId: p.accountGroupId })));
  const posts = apiPosts.filter(post => post.accountGroupId === accountGroupId);
  console.log(`📋 Found ${posts.length} posts for account group: ${accountGroupId}`);
  if (posts.length > 0) {
    console.log(`📋 Matching posts:`, posts.map(p => ({ id: p.id, accountGroupId: p.accountGroupId, title: p.title })));
  }
  return posts;
}

/**
 * Get total count of posts in storage
 */
export function getAPIPostsCount() {
  return apiPosts.length;
}

/**
 * Clear all posts (for testing)
 */
export function clearAllAPIPosts() {
  apiPosts = [];
  console.log('🗑️ Cleared all API posts from storage');
} 