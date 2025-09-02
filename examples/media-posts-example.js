// Succulent API Example: Creating Posts with Media
// URL-based images and videos

const API_BASE_URL = 'https://app.succulent.social/api';
const API_KEY = 'sk_live_your_api_key_here'; // Replace with your actual API key

/**
 * Create a post with image media
 */
async function createImagePost() {
    const postData = {
        accountGroupId: 'your-account-group-id',
        content: 'Check out this beautiful sunset! 🌅',
        platforms: ['x', 'instagram'],
        media: [
            {
                type: 'image',
                url: 'https://example.com/images/sunset.jpg',
                alt: 'Beautiful sunset over the ocean',
                filename: 'sunset.jpg'
            }
        ]
    };

    try {
        const response = await fetch(`${API_BASE_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify(postData)
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Post created:', result.postId);
            console.log('Platforms:', result.platforms);
        } else {
            console.error('❌ Failed:', result.error);
        }
    } catch (error) {
        console.error('❌ Request failed:', error);
    }
}

/**
 * Create a post with multiple media items
 */
async function createMultiMediaPost() {
    const postData = {
        accountGroupId: 'your-account-group-id',
        content: 'Our latest product showcase! Images and video walkthrough 📱',
        platforms: ['x', 'linkedin'],
        media: [
            {
                type: 'image',
                url: 'https://example.com/images/product-1.jpg',
                alt: 'Product front view',
                filename: 'product-front.jpg'
            },
            {
                type: 'image', 
                url: 'https://example.com/images/product-2.jpg',
                alt: 'Product side view',
                filename: 'product-side.jpg'
            },
            {
                type: 'video',
                url: 'https://example.com/videos/product-demo.mp4',
                alt: 'Product demonstration video',
                filename: 'demo.mp4'
            }
        ]
    };

    try {
        const response = await fetch(`${API_BASE_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify(postData)
        });

        const result = await response.json();
        console.log('Multi-media post result:', result);
    } catch (error) {
        console.error('❌ Multi-media post failed:', error);
    }
}

/**
 * Schedule a post with media for later
 */
async function createScheduledMediaPost() {
    const scheduledDate = new Date();
    scheduledDate.setHours(scheduledDate.getHours() + 2); // 2 hours from now
    
    const postData = {
        accountGroupId: 'your-account-group-id',
        content: 'Scheduled post with media! This will go live later 🚀',
        platforms: ['x'],
        scheduledDate: scheduledDate.toISOString(),
        media: [
            {
                type: 'image',
                url: 'https://example.com/images/announcement.png',
                alt: 'Important announcement graphic',
                filename: 'announcement.png'
            }
        ]
    };

    try {
        const response = await fetch(`${API_BASE_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify(postData)
        });

        const result = await response.json();
        console.log('Scheduled media post result:', result);
    } catch (error) {
        console.error('❌ Scheduled post failed:', error);
    }
}

// Run examples
console.log('🎬 Creating posts with media...\n');

createImagePost()
    .then(() => createMultiMediaPost())
    .then(() => createScheduledMediaPost())
    .then(() => console.log('\n✅ All examples completed!'))
    .catch(console.error); 