#!/usr/bin/env node

/**
 * Succulent API Usage Examples
 * 
 * This script demonstrates how to use the Succulent Posts API
 * for creating posts across multiple social media platforms.
 */

const API_BASE_URL = 'http://localhost:3001/api';
const API_KEY = 'sk_demo_12345'; // Replace with your actual API key

/**
 * Simple HTTP client for API calls
 */
class SucculentAPI {
  constructor(apiKey, baseUrl = API_BASE_URL) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API Error (${response.status}): ${data.error || 'Unknown error'}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Request failed:', error.message);
      throw error;
    }
  }

  async createPost(postData) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  }

  async getPosts(accountGroupId, options = {}) {
    const params = new URLSearchParams({
      accountGroupId,
      limit: options.limit || '20',
      offset: options.offset || '0'
    });
    
    return this.request(`/posts?${params}`);
  }
}

/**
 * Example 1: Simple Text Post
 */
async function example1_simplePost(api) {
  console.log('\n🔸 Example 1: Simple Text Post');
  
  const postData = {
    accountGroupId: 'demo-account-group',
    content: 'Hello from the Succulent API! 🌱 This is a test post created via API. #SucculentAPI #SocialMedia',
    platforms: ['instagram', 'x', 'linkedin'],
    title: 'API Test Post',
    publishImmediately: false, // Save as draft first
  };
  
  try {
    const result = await api.createPost(postData);
    console.log('✅ Post created successfully:');
    console.log(`   Post ID: ${result.postId}`);
    console.log(`   Message: ${result.message}`);
    console.log(`   Platforms: ${result.data.platforms.join(', ')}`);
    return result.postId;
  } catch (error) {
    console.error('❌ Failed to create simple post:', error.message);
    return null;
  }
}

/**
 * Example 2: Scheduled Post with Media
 */
async function example2_scheduledPostWithMedia(api) {
  console.log('\n🔸 Example 2: Scheduled Post with Media');
  
  // Schedule post for 1 hour from now
  const scheduledDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  
  const postData = {
    accountGroupId: 'demo-account-group',
    content: '🚀 Exciting product announcement coming soon! Stay tuned for something amazing. #ProductLaunch #Innovation',
    platforms: ['instagram', 'facebook'],
    title: 'Product Launch Teaser',
    scheduledDate,
    media: [
      {
        type: 'image',
        url: 'https://picsum.photos/800/600?random=1',
        alt: 'Product teaser image',
        filename: 'product-teaser.jpg'
      }
    ],
    publishImmediately: false
  };
  
  try {
    const result = await api.createPost(postData);
    console.log('✅ Scheduled post created successfully:');
    console.log(`   Post ID: ${result.postId}`);
    console.log(`   Scheduled for: ${scheduledDate}`);
    console.log(`   Media attached: ${postData.media.length} image(s)`);
    return result.postId;
  } catch (error) {
    console.error('❌ Failed to create scheduled post:', error.message);
    return null;
  }
}

/**
 * Example 3: Thread/Multi-Post
 */
async function example3_threadPost(api) {
  console.log('\n🔸 Example 3: Thread Post');
  
  const postData = {
    accountGroupId: 'demo-account-group',
    content: '🧵 Thread: Let me share some insights about social media automation... (1/4)',
    platforms: ['x'], // Threads work best on X/Twitter
    title: 'Social Media Automation Thread',
    isThread: true,
    threadPosts: [
      {
        content: '📈 First, automation saves you significant time. Instead of manually posting to each platform, you can schedule and publish across all platforms simultaneously. (2/4)'
      },
      {
        content: '🎯 Second, consistency is key for engagement. Automated scheduling ensures your content goes out at optimal times, even when you\'re not available. (3/4)'
      },
      {
        content: '🌟 Finally, analytics from automated posts help you understand what content performs best, allowing you to refine your strategy over time. (4/4) #SocialMediaTips'
      }
    ],
    publishImmediately: false
  };
  
  try {
    const result = await api.createPost(postData);
    console.log('✅ Thread post created successfully:');
    console.log(`   Post ID: ${result.postId}`);
    console.log(`   Thread length: ${postData.threadPosts.length + 1} posts`);
    return result.postId;
  } catch (error) {
    console.error('❌ Failed to create thread post:', error.message);
    return null;
  }
}

/**
 * Example 4: Reply Post
 */
async function example4_replyPost(api) {
  console.log('\n🔸 Example 4: Reply Post');
  
  const postData = {
    accountGroupId: 'demo-account-group',
    content: 'Thanks for sharing this! This is exactly the kind of automation we help businesses implement with Succulent. 🌱',
    platforms: ['x'],
    title: 'Reply to Industry Discussion',
    replyTo: {
      url: 'https://x.com/example/status/1234567890', // This would be a real tweet URL
      platform: 'x'
    },
    publishImmediately: false
  };
  
  try {
    const result = await api.createPost(postData);
    console.log('✅ Reply post created successfully:');
    console.log(`   Post ID: ${result.postId}`);
    console.log(`   Replying to: ${postData.replyTo.url}`);
    return result.postId;
  } catch (error) {
    console.error('❌ Failed to create reply post:', error.message);
    return null;
  }
}

/**
 * Example 5: Multiple Media Post
 */
async function example5_multipleMediaPost(api) {
  console.log('\n🔸 Example 5: Multiple Media Post');
  
  const postData = {
    accountGroupId: 'demo-account-group',
    content: '📸 Behind the scenes of our latest project! Swipe to see the process from start to finish. ➡️ #BehindTheScenes #Process',
    platforms: ['instagram'],
    title: 'Behind the Scenes Gallery',
    media: [
      {
        type: 'image',
        url: 'https://picsum.photos/800/800?random=2',
        alt: 'Project setup phase',
        filename: 'setup.jpg'
      },
      {
        type: 'image',
        url: 'https://picsum.photos/800/800?random=3',
        alt: 'Development in progress',
        filename: 'progress.jpg'
      },
      {
        type: 'image',
        url: 'https://picsum.photos/800/800?random=4',
        alt: 'Final result',
        filename: 'result.jpg'
      }
    ],
    publishImmediately: false
  };
  
  try {
    const result = await api.createPost(postData);
    console.log('✅ Multiple media post created successfully:');
    console.log(`   Post ID: ${result.postId}`);
    console.log(`   Media files: ${postData.media.length} images`);
    return result.postId;
  } catch (error) {
    console.error('❌ Failed to create multiple media post:', error.message);
    return null;
  }
}

/**
 * Example 6: Get Posts
 */
async function example6_getPosts(api) {
  console.log('\n🔸 Example 6: Retrieve Posts');
  
  try {
    const result = await api.getPosts('demo-account-group', {
      limit: 10,
      offset: 0
    });
    
    console.log('✅ Posts retrieved successfully:');
    console.log(`   Total posts: ${result.data.pagination.total}`);
    console.log(`   Posts in response: ${result.data.posts.length}`);
    console.log(`   Has more: ${result.data.pagination.hasMore}`);
    
    return result.data.posts;
  } catch (error) {
    console.error('❌ Failed to retrieve posts:', error.message);
    return [];
  }
}

/**
 * Example 7: Error Handling
 */
async function example7_errorHandling(api) {
  console.log('\n🔸 Example 7: Error Handling');
  
  // Intentionally create invalid post to demonstrate error handling
  const invalidPostData = {
    // Missing required accountGroupId
    content: '', // Empty content should cause validation error
    platforms: [], // Empty platforms array should cause validation error
  };
  
  try {
    await api.createPost(invalidPostData);
    console.log('❌ This should not happen - validation should fail');
  } catch (error) {
    console.log('✅ Correctly caught validation error:');
    console.log(`   Error: ${error.message}`);
    console.log('   This demonstrates proper error handling in your application');
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🌱 Succulent API Examples');
  console.log('========================');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Using API Key: ${API_KEY.substring(0, 10)}...`);
  
  const api = new SucculentAPI(API_KEY);
  const createdPostIds = [];
  
  try {
    // Run all examples
    const postId1 = await example1_simplePost(api);
    if (postId1) createdPostIds.push(postId1);
    
    const postId2 = await example2_scheduledPostWithMedia(api);
    if (postId2) createdPostIds.push(postId2);
    
    const postId3 = await example3_threadPost(api);
    if (postId3) createdPostIds.push(postId3);
    
    const postId4 = await example4_replyPost(api);
    if (postId4) createdPostIds.push(postId4);
    
    const postId5 = await example5_multipleMediaPost(api);
    if (postId5) createdPostIds.push(postId5);
    
    await example6_getPosts(api);
    await example7_errorHandling(api);
    
    // Summary
    console.log('\n🎉 Examples completed!');
    console.log('==================');
    console.log(`Successfully created ${createdPostIds.length} posts:`);
    createdPostIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    
  } catch (error) {
    console.error('\n❌ Examples failed:', error.message);
  }
}

/**
 * Run examples if this script is executed directly
 */
if (require.main === module) {
  main();
}

module.exports = {
  SucculentAPI,
  examples: {
    example1_simplePost,
    example2_scheduledPostWithMedia,
    example3_threadPost,
    example4_replyPost,
    example5_multipleMediaPost,
    example6_getPosts,
    example7_errorHandling
  }
}; 