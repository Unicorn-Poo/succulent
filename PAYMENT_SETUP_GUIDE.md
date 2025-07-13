# 🚀 Payment & Subscription Setup Guide

Complete guide to set up payments, subscriptions, and account management in Succulent.

## 📋 Prerequisites

1. **Stripe Account**: Create a free account at [stripe.com](https://stripe.com)
2. **Database**: Your Jazz database is already set up
3. **Email Service**: Optional, for sending notifications

## 🛠️ Installation Steps

### 1. Install Dependencies

```bash
pnpm install stripe@^14.15.0
```

### 2. Environment Variables

Create a `.env.local` file in your project root:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (create these in Stripe dashboard)
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_premium_monthly_id
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY=price_premium_yearly_id
NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY=price_business_monthly_id
NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_YEARLY=price_business_yearly_id

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Stripe Dashboard Setup

#### A. Create Products & Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Create products for each tier:

**Premium Plan:**
- Name: "Pro"
- Monthly: $12/month
- Yearly: $120/year (save price ID)

**Business Plan:**
- Name: "Business"
- Monthly: $49/month
- Yearly: $490/year (save price ID)

#### B. Set Up Webhook

1. Go to Developers → Webhooks
2. Add endpoint: `https://yourapp.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook secret to `.env.local`

## 🎯 Usage Guide

### For Users

#### 1. Account Dashboard
Users can access their account management at `/account`:

- **Profile Tab**: Edit name, email, view account info
- **Subscription Tab**: View current plan, upgrade options, billing portal
- **Usage Tab**: See current usage against limits
- **Settings Tab**: Account preferences and controls

#### 2. Upgrading Subscription
```typescript
import { usePaymentManager } from '@/utils/paymentIntegration';

const { upgradeToTier } = usePaymentManager(account);

// Upgrade to premium
await upgradeToTier('premium', 'monthly');
```

#### 3. Managing Billing
```typescript
const { openBillingPortal } = usePaymentManager(account);

// Open Stripe billing portal
await openBillingPortal();
```

### For Admins

#### 1. Admin Dashboard
Access admin controls at `/admin`:

- **Overview**: Revenue, user stats, activity feed
- **Users**: Manage all users, search, edit, delete
- **Subscriptions**: View all subscriptions, cancel, modify
- **Payments**: Payment history, failed payments, invoices
- **Settings**: System configuration, feature flags

#### 2. User Management
```typescript
// Search users
const users = await fetchUsers({ search: 'john@example.com' });

// Update user subscription
await updateUserSubscription(userId, {
  tier: 'premium',
  status: 'active'
});

// View user analytics
const analytics = await getUserAnalytics(userId);
```

## 🔧 API Endpoints

### Payment Routes

**Create Checkout Session:**
```typescript
POST /api/stripe/create-checkout-session
{
  "priceId": "price_premium_monthly",
  "tier": "premium",
  "billing": "monthly",
  "userId": "user_123",
  "userEmail": "user@example.com"
}
```

**Create Portal Session:**
```typescript
POST /api/stripe/create-portal-session
{
  "customerId": "cus_stripe_customer_id",
  "returnUrl": "https://yourapp.com/account/billing"
}
```

**Webhook Handler:**
```typescript
POST /api/stripe/webhook
// Handles all Stripe events automatically
```

### Admin API Routes

**Get All Users:**
```typescript
GET /api/admin/users?search=john&page=1&limit=50
```

**Update User:**
```typescript
PUT /api/admin/users/123
{
  "name": "John Doe",
  "email": "john@example.com",
  "tier": "premium"
}
```

**Get Revenue Analytics:**
```typescript
GET /api/admin/analytics/revenue?period=month
```

## 🔒 Security Considerations

### 1. Admin Authentication
Implement proper admin authentication:

```typescript
// utils/adminAuth.ts
export function isAdmin(userEmail: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  return adminEmails.includes(userEmail);
}
```

### 2. Webhook Security
Always verify webhook signatures:

```typescript
// In webhook handler
const signature = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 3. Rate Limiting
Add rate limiting to prevent abuse:

```typescript
// utils/rateLimit.ts
export const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
};
```

## 📊 Usage Tracking

### Implementing Limits
```typescript
import { useSubscription } from '@/utils/subscriptionManager';

const { hasReachedLimit, trackPostUsage } = useSubscription(account);

// Check before creating post
if (hasReachedLimit('maxPosts')) {
  // Show paywall
  return <PaywallBlock feature="posts" />;
}

// Track usage after creating post
trackPostUsage(1);
```

### Custom Paywall Components
```typescript
import { PlatformVariantsGuard } from '@/components/paywall/PlatformVariantsGuard';

<PlatformVariantsGuard 
  account={account}
  variantsToCreate={3}
  onUpgrade={() => upgradeToTier('premium')}
>
  <CreateVariantsComponent />
</PlatformVariantsGuard>
```

## 🚨 Testing

### Test Mode
Use Stripe test keys for development:

```env
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Test Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Authentication: `4000 0025 0000 3155`

### Webhook Testing
Use Stripe CLI for local testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 📈 Analytics & Monitoring

### Key Metrics to Track
- Monthly Recurring Revenue (MRR)
- Churn Rate
- Customer Lifetime Value (CLV)
- Conversion from trial to paid
- Feature usage by plan tier

### Dashboard Implementation
```typescript
// utils/analytics.ts
export async function getRevenuemetrics() {
  const payments = await getPayments();
  
  return {
    mrr: calculateMRR(payments),
    churn: calculateChurn(payments),
    clv: calculateCLV(payments)
  };
}
```

## 🔄 Deployment

### Environment Setup
1. Set production environment variables
2. Update webhook URL to production domain
3. Switch to live Stripe keys
4. Configure proper admin authentication

### Database Migration
Ensure your Jazz schema is updated with subscription fields:

```typescript
// Run after deploying
await migrateSubscriptionSchema();
```

## 📞 Support

- **Stripe Documentation**: https://stripe.com/docs
- **Jazz Documentation**: https://jazz.tools/docs
- **Next.js Documentation**: https://nextjs.org/docs

## 🎉 You're Ready!

Your complete subscription management system is now set up with:

✅ **User Account Management** - Profile, subscription, usage tracking
✅ **Payment Processing** - Stripe integration, checkout, billing portal
✅ **Admin Dashboard** - User management, revenue tracking, analytics
✅ **Paywall System** - Limit enforcement, upgrade prompts
✅ **Usage Tracking** - Posts, storage, platform variants monitoring
✅ **Trial System** - Free trials to convert users
✅ **Webhook Handling** - Automatic subscription updates

Start with test mode, then switch to production when ready! 