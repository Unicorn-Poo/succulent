# Succulent Posts API

A production-ready API for creating and managing social media posts across multiple platforms.

## ✅ Production Ready Features

- **🔐 API Key Authentication** - Secure access using `X-API-Key` header
- **📝 Comprehensive Validation** - Zod schema validation with detailed error messages
- **🌐 Multi-Platform Support** - Instagram, X (Twitter), LinkedIn, Facebook, YouTube, TikTok, and more
- **📅 Post Scheduling** - Schedule posts for optimal engagement times
- **🖼️ Media Attachments** - Support for images and videos
- **🧵 Thread Support** - Create multi-post threads for platforms like X
- **💬 Reply Functionality** - Reply to existing posts across platforms
- **⚡ Draft Mode** - Save posts as drafts before publishing
- **📊 Integration Ready** - Works with existing Jazz collaborative system and Ayrshare
- **🛠️ Error Handling** - Proper HTTP status codes and error responses
- **📖 Full Documentation** - Complete API docs with examples

## 🚀 Quick Start

### 1. Authentication

All requests require an API key in the header:

```bash
X-API-Key: sk_your_api_key_here
```

### 2. Create a Simple Post

```bash
curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_test_12345" \
  -d '{
    "accountGroupId": "your-account-group",
    "content": "Hello from Succulent API! 🌱",
    "platforms": ["instagram", "x", "linkedin"]
  }'
```

### 3. Response

```json
{
  "success": true,
  "postId": "api_post_1703123456789_abc123def",
  "message": "Post created successfully",
  "data": {
    "accountGroupId": "your-account-group",
    "platforms": ["instagram", "x", "linkedin"],
    "publishedImmediately": false,
    "publishingResults": {"message": "Post saved as draft"}
  }
}
```

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/posts` | Create a new post |
| `GET` | `/api/posts` | Retrieve posts from account group |

## 🎯 Key Features

### Multi-Platform Posting
Post to multiple social media platforms simultaneously:
- Instagram, Facebook, X (Twitter), LinkedIn
- YouTube, TikTok, Pinterest, Reddit
- Threads, Bluesky, Google My Business

### Advanced Post Types
- **Standard Posts** - Simple text and media posts
- **Scheduled Posts** - Post at optimal times
- **Thread Posts** - Multi-part content series
- **Reply Posts** - Respond to existing posts
- **Media Posts** - Images and videos with alt text

### Business Features
- **Draft Mode** - Review before publishing
- **Media Management** - Support for multiple media types
- **Analytics Integration** - Track post performance
- **Team Collaboration** - Jazz-based collaborative editing

## 📊 Request Schema

```typescript
{
  accountGroupId: string;        // Required
  content: string;              // Required - Post text content
  platforms: string[];          // Required - Target platforms
  title?: string;               // Optional - Internal title
  scheduledDate?: string;       // Optional - ISO 8601 datetime
  media?: Array<{              // Optional - Media attachments
    type: "image" | "video";
    url: string;
    alt?: string;
    filename?: string;
  }>;
  replyTo?: {                  // Optional - Reply functionality
    url: string;
    platform?: string;
  };
  isThread?: boolean;          // Optional - Thread posts
  threadPosts?: Array<{        // Optional - Thread content
    content: string;
    media?: Array<MediaItem>;
  }>;
  publishImmediately?: boolean; // Default: false
  profileKey?: string;         // Business plan integration
}
```

## 🔧 Development

The API is built with:
- **Next.js 15** - Modern React framework with API routes
- **Jazz Tools** - Collaborative real-time data layer
- **Zod** - Runtime type validation
- **TypeScript** - Full type safety
- **Ayrshare Integration** - Social media publishing

## 📚 Documentation

- **[Complete API Documentation](docs/API.md)** - Full API reference
- **[Usage Examples](examples/api-usage.js)** - JavaScript examples
- **[Error Codes](docs/API.md#error-codes)** - Complete error reference

## 🧪 Testing

Test the API with different scenarios:

```bash
# Simple post
curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_test_12345" \
  -d '{"accountGroupId": "test", "content": "Hello API!", "platforms": ["x"]}'

# Scheduled post with media
curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_test_12345" \
  -d '{
    "accountGroupId": "test",
    "content": "Check this out! 🚀",
    "platforms": ["instagram"],
    "scheduledDate": "2024-01-25T10:00:00.000Z",
    "media": [{"type": "image", "url": "https://picsum.photos/800/600"}]
  }'

# Authentication error test
curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -d '{"accountGroupId": "test", "content": "test", "platforms": ["x"]}'
```

## 🚦 Status

- ✅ **Authentication** - API key validation
- ✅ **Validation** - Request schema validation  
- ✅ **Multi-platform** - All major platforms supported
- ✅ **Media Support** - Images and videos
- ✅ **Scheduling** - Post scheduling functionality
- ✅ **Threads** - Multi-post thread support
- ✅ **Replies** - Reply to existing posts
- ✅ **Error Handling** - Comprehensive error responses
- ✅ **Documentation** - Complete API documentation
- 🔧 **Rate Limiting** - Coming soon
- 🔧 **Webhooks** - Coming soon

## 💡 Usage Tips

1. **Start with drafts** - Use `publishImmediately: false` for testing
2. **Validate media URLs** - Ensure URLs are publicly accessible
3. **Handle errors gracefully** - Implement proper error handling
4. **Use meaningful titles** - Helps with organization and debugging
5. **Test authentication** - Verify API key format and permissions

## 🔐 Security Notes

- API keys must start with `sk_` prefix
- All requests require authentication
- Media URLs should be HTTPS
- Rate limiting will be enforced
- Audit logs track all API usage

---

**Ready to integrate?** Check out the [complete documentation](docs/API.md) and [usage examples](examples/api-usage.js) to get started! 