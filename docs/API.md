# Succulent API Documentation

## 🔐 API Key Management

Before using the API, you need to create API keys from your account dashboard.

### Getting Your API Keys

1. **Login to Succulent** and navigate to your account page
2. **Click the "API Keys" tab** in your account dashboard
3. **Create a new API key** with the permissions you need
4. **Copy the API key** - you'll only see it once!

### API Key Format

All Succulent API keys follow this format:
- **Development:** `sk_test_32randomcharacters`
- **Production:** `sk_live_32randomcharacters`

### API Key Permissions

When creating API keys, you can assign these permissions:

| Permission | Description |
|------------|-------------|
| `posts:create` | Create new social media posts |
| `posts:read` | View existing posts and metadata |
| `posts:update` | Edit existing posts |
| `posts:delete` | Delete posts |
| `accounts:read` | View account group information |
| `analytics:read` | Access analytics data |
| `media:upload` | Upload images and videos |

### Rate Limits

API keys have different rate limit tiers:

| Tier | Requests per Hour | Usage |
|------|------------------|--------|
| **Standard** | 1,000 | Free and basic plans |
| **Premium** | 5,000 | Pro plans |
| **Enterprise** | 25,000 | Enterprise plans |

Rate limit information is included in response headers:
- `X-RateLimit-Limit`: Total requests allowed per hour
- `X-RateLimit-Remaining`: Requests remaining in current period
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Authentication

All API requests require authentication using an API key in the header:

```
X-API-Key: sk_your_api_key_here
```

API keys must start with `sk_` followed by your unique identifier.

## Posts API

### Create Post

Create a new post for publishing to social media platforms.

**Endpoint:** `POST /api/posts`

**Headers:**
- `Content-Type: application/json`
- `X-API-Key: sk_your_api_key_here`

#### Request Body Schema

```typescript
{
  // Required fields
  accountGroupId: string;     // ID of the account group to post to
  content: string;           // Post content text
  platforms: string[];       // Array of platforms: ["instagram", "x", "linkedin", etc.]
  
  // Optional fields
  mediaItems?: Array<{       // Media attachments
    type: "image" | "video";
    url: string;
    altText?: string;
    caption?: string;
  }>;
  
  scheduledDate?: string;    // ISO 8601 datetime string
  publishImmediately?: boolean; // Default: false
  
  // Thread/multi-post support
  threadPosts?: Array<{
    content: string;
    mediaItems?: MediaItem[];
  }>;
  
  // Reply functionality
  replyTo?: {
    platform: string;
    postId: string;
    parentId?: string;
  };
  
  // Draft mode
  isDraft?: boolean;         // Save as draft without publishing
}
```

#### Supported Platforms

- `instagram` - Instagram posts and stories
- `x` - X (Twitter) posts and threads
- `linkedin` - LinkedIn posts and articles
- `facebook` - Facebook posts and pages
- `youtube` - YouTube community posts
- `tiktok` - TikTok videos
- `pinterest` - Pinterest pins
- `reddit` - Reddit posts
- `telegram` - Telegram channel posts
- `threads` - Meta Threads posts

#### Response

**Success (201):**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "postId": "post_1234567890_abcdef",
    "accountGroupId": "group_abc123",
    "platforms": ["instagram", "x"],
    "scheduledDate": "2024-01-25T10:00:00.000Z",
    "publishedImmediately": false
  }
}
```

**Error (400):**
```json
{
  "success": false,
  "error": "Invalid request data",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "content",
      "message": "Content is required"
    }
  ]
}
```

#### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTHENTICATION_FAILED` | 401 | Invalid or missing API key |
| `INSUFFICIENT_PERMISSIONS` | 403 | API key lacks required permissions |
| `ACCOUNT_GROUP_ACCESS_DENIED` | 403 | API key restricted from account group |
| `VALIDATION_ERROR` | 400 | Request data validation failed |
| `INVALID_JSON` | 400 | Malformed JSON request |
| `POST_CREATION_FAILED` | 400 | Post creation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |

## API Key Management API

Manage your API keys programmatically (requires web session authentication).

### List API Keys

**Endpoint:** `GET /api/api-keys`
**Headers:** `Authorization: Bearer your_session_token`

**Response:**
```json
{
  "success": true,
  "data": {
    "apiKeys": [
      {
        "keyId": "key_1703123456789_abc123def",
        "name": "Production Key",
        "keyPrefix": "sk_live_a1b2c3d4...",
        "permissions": ["posts:create", "posts:read"],
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "lastUsedAt": "2024-01-20T14:22:00.000Z",
        "usageCount": 145,
        "monthlyUsageCount": 45,
        "rateLimitTier": "standard",
        "description": "API key for production app"
      }
    ],
    "summary": {
      "totalKeys": 1,
      "activeKeys": 1,
      "totalUsage": 145
    }
  }
}
```

### Create API Key

**Endpoint:** `POST /api/api-keys`
**Headers:** `Authorization: Bearer your_session_token`

**Request:**
```json
{
  "name": "My App Key",
  "description": "API key for my mobile app",
  "permissions": ["posts:create", "posts:read"],
  "rateLimitTier": "standard",
  "expiresAt": "2025-01-01T00:00:00.000Z"
}
```

### Update API Key

**Endpoint:** `PUT /api/api-keys/{keyId}`
**Headers:** `Authorization: Bearer your_session_token`

### Revoke API Key

**Endpoint:** `DELETE /api/api-keys/{keyId}`
**Headers:** `Authorization: Bearer your_session_token`

## Example Usage

### Node.js Example

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.succulent.com',
  headers: {
    'X-API-Key': 'sk_live_your_api_key_here',
    'Content-Type': 'application/json'
  }
});

// Create a simple post
const createPost = async () => {
  try {
    const response = await api.post('/api/posts', {
      accountGroupId: 'group_12345',
      content: 'Hello from my Node.js app! 🌱',
      platforms: ['instagram', 'x', 'linkedin'],
      publishImmediately: false,
      scheduledDate: '2024-01-25T10:00:00.000Z'
    });
    
    console.log('Post created:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};
```

### Python Example

```python
import requests
import json
from datetime import datetime, timedelta

API_BASE = 'https://api.succulent.com'
API_KEY = 'sk_live_your_api_key_here'

headers = {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
}

# Create a post with media
def create_media_post():
    post_data = {
        'accountGroupId': 'group_12345',
        'content': 'Check out this amazing photo! 📸',
        'platforms': ['instagram', 'facebook'],
        'mediaItems': [{
            'type': 'image',
            'url': 'https://example.com/image.jpg',
            'altText': 'Beautiful sunset landscape'
        }],
        'scheduledDate': (datetime.now() + timedelta(hours=2)).isoformat()
    }
    
    response = requests.post(
        f'{API_BASE}/api/posts',
        headers=headers,
        json=post_data
    )
    
    if response.ok:
        print('Post created successfully:', response.json())
    else:
        print('Error:', response.json())
```

### cURL Examples

#### Create a simple post
```bash
curl -X POST https://api.succulent.com/api/posts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_your_api_key_here" \
  -d '{
    "accountGroupId": "group_12345",
    "content": "Hello from cURL! 🚀",
    "platforms": ["x", "linkedin"],
    "publishImmediately": true
  }'
```

#### Create a scheduled post with media
```bash
curl -X POST https://api.succulent.com/api/posts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_your_api_key_here" \
  -d '{
    "accountGroupId": "group_12345",
    "content": "Scheduled post with beautiful image! 🌅",
    "platforms": ["instagram", "facebook"],
    "scheduledDate": "2024-01-25T10:00:00.000Z",
    "mediaItems": [{
      "type": "image",
      "url": "https://example.com/sunrise.jpg",
      "altText": "Beautiful sunrise over mountains"
    }]
  }'
```

## Security Best Practices

### API Key Security

1. **Never share API keys** in public repositories or client-side code
2. **Use environment variables** to store API keys
3. **Rotate keys regularly** for production applications
4. **Set appropriate permissions** - only grant what's needed
5. **Monitor usage** through the dashboard
6. **Revoke compromised keys** immediately

### Rate Limiting

- Implement **exponential backoff** for rate limit errors
- **Cache responses** when possible to reduce API calls
- **Batch operations** to optimize API usage
- **Monitor rate limits** via response headers

### Error Handling

```javascript
// Good error handling example
const handleAPICall = async (apiCall) => {
  try {
    const response = await apiCall();
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      // Rate limited - wait and retry
      const retryAfter = error.response.headers['retry-after'] || 60;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return handleAPICall(apiCall); // Retry
    } else if (error.response?.status === 401) {
      // Invalid API key
      throw new Error('Please check your API key');
    } else {
      // Other errors
      console.error('API Error:', error.response?.data || error.message);
      throw error;
    }
  }
};
```

## Support

- **Documentation:** [https://docs.succulent.com](https://docs.succulent.com)
- **API Status:** [https://status.succulent.com](https://status.succulent.com)
- **Support:** [support@succulent.com](mailto:support@succulent.com)
- **Community:** [Discord](https://discord.gg/succulent) | [GitHub](https://github.com/succulent) 