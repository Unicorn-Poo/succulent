# Succulent Social Media API Documentation

## Overview

The Succulent API allows you to create, schedule, and manage social media posts across multiple platforms through a unified interface.

**Base URL**: `https://app.succulent.social/api`

## Authentication

All API endpoints require authentication via API key in the request header:

```
X-API-Key: your_api_key_here
```

## Media Handling

### Images and Videos

The API supports images and videos through **URL references only**. You must host your media files externally and provide publicly accessible URLs.

**Supported Media Types**:
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Videos**: MP4, MOV, AVI, WebM

**URL Requirements**:
- Must be publicly accessible HTTP/HTTPS URLs
- Should be optimized for social media (recommended sizes vary by platform)
- Must return proper Content-Type headers

**Example Media Usage**:
```json
{
  "accountGroupId": "demo",
  "content": "Check out this image!",
  "platforms": ["x"],
  "media": [
    {
      "type": "image",
      "url": "https://example.com/my-image.jpg",
      "alt": "Beautiful sunset photo",
      "filename": "sunset.jpg"
    }
  ]
}
```

## Posts API

### Create Post

Create a new social media post with optional media attachments.

**Endpoint**: `POST /posts`

**Request Body**:
```json
{
  "accountGroupId": "demo",
  "content": "Your post content here",
  "platforms": ["x", "instagram", "linkedin"],
  "title": "Optional post title",
  "scheduledDate": "2024-01-15T10:30:00Z",
  "media": [
    {
      "type": "image",
      "url": "https://example.com/images/my-image.jpg",
      "alt": "Image description",
      "filename": "my-image.jpg"
    }
  ],
  "publishImmediately": false,
  "saveAsDraft": true
}
```

**Media Schema**:
```json
{
  "type": "image", // or "video"
  "url": "https://example.com/images/your-image.jpg",
  "alt": "Optional description for accessibility",
  "filename": "Optional original filename"
}
```

**Response**:
```json
{
  "success": true,
  "postId": "post_12345",
  "status": "scheduled",
  "scheduledDate": "2024-01-15T10:30:00Z",
  "platforms": {
    "x": "pending",
    "instagram": "pending",
    "linkedin": "pending"
  },
  "hasMedia": true,
  "publishImmediately": false
}
```

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