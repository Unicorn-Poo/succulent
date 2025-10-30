# Succulent

Social media management platform with integrated print-on-demand and e-commerce automation. Unified publishing, scheduling, and product creation across 13+ social platforms with automated store synchronization.

## Core Features

### Publishing & Content Management
- Multi-platform posting across 13+ social networks via Ayrshare integration
- Bulk CSV uploads with batch processing and validation
- Media management with platform-specific format optimization
- Thread support for multi-part content (X/Twitter)
- Reply-to-post functionality across platforms
- Scheduling with optimal timing recommendations
- Real-time status tracking with retry mechanisms

### Print-on-Demand
- Gelato integration: Template-based product creation with variant management
- Prodigi integration: Product design creation with asset upload and quote generation
- Template import system for POD catalog management
- Automatic product generation from post media assets
- Image processing and format optimization for print requirements

### E-Commerce Integration
- Shopify: Product creation with sales channel management and GraphQL API
- WooCommerce: REST API integration with category/tag management
- Generic store API support with configurable endpoints
- Automated product metadata extraction from post content

### Growth Automation
- Hashtag research with trending analysis and engagement metrics (Business tier)
- Optimal timing engine using historical performance patterns
- Comment automation with sentiment analysis and rule-based replies
- DM automation for outreach campaigns with template personalization
- Competitor analysis with content strategy reverse engineering (Business tier)
- Content discovery via RSS feeds with engagement scoring

### Analytics
- Growth analytics with follower projections and trend analysis
- Cross-platform engagement metrics with historical tracking
- Post-level performance analytics with optimization recommendations
- Audience demographic analysis and behavior pattern recognition

### Brand Management
- Brand persona system for voice and tone consistency
- Content template system with guideline enforcement
- Platform-specific hashtag strategy aligned with brand
- Automated consistency scoring and violation detection

### API & Infrastructure
- RESTful API with API key authentication and rate limiting
- Jazz Tools integration for real-time collaborative data persistence
- Ayrshare API integration with webhook support
- Media proxy for secure image serving

### Notifications
- Pushover integration for real-time publishing alerts
- Bulk upload completion notifications
- Per-account-group notification type configuration

## Experimental Features

### AI Autopilot (Experimental)
- Automated decision making for content optimization and posting
- Streaming content generation with brand context awareness
- Image analysis with automatic caption and hashtag generation
- Risk assessment for brand consistency and engagement
- Platform-aware content optimization based on performance patterns

### AI Learning System (Experimental)
- Historical post performance analysis with pattern recognition
- Pre-posting engagement prediction with platform-specific models
- Learning-based content generation from past performance data
- Per-platform insight models for targeted optimization
- Continuous learning with automatic strategy adjustment

## Technical Stack

- **Framework**: Next.js 15 (App Router), TypeScript
- **Data Layer**: Jazz Tools (real-time collaborative persistence)
- **Social API**: Ayrshare (multi-platform publishing)
- **AI/ML**: AI SDK with OpenAI (experimental autopilot/learning)
- **Payments**: Stripe (subscription management)
- **Auth**: API key-based with rate limiting

## Subscription Tiers

- **Creator**: 10 posts/month, 1 account group
- **Pro ($12/mo)**: Unlimited posts, 3 account groups, analytics
- **Business ($49/mo)**: Team collaboration, competitor analysis, webhooks
- **Enterprise**: Custom pricing, white-labeling, SLA

## Platform Support

**Social**: Instagram, Facebook, X, LinkedIn, YouTube, TikTok, Pinterest, Reddit, Threads, Bluesky, Telegram, Google My Business  
**POD**: Gelato, Prodigi  
**E-Commerce**: Shopify, WooCommerce, Custom API
