import { MyAppAccountLoaded } from '@/app/schema';
import { SubscriptionManager } from './subscriptionManager';

type SubscriptionTier = 'free' | 'premium' | 'business' | 'enterprise';

// =============================================================================
// 💳 STRIPE CONFIGURATION
// =============================================================================

export const STRIPE_CONFIG = {
  // Replace with your actual Stripe price IDs
  PRICE_IDS: {
    premium_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
    premium_yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY || 'price_premium_yearly',
    business_monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY || 'price_business_monthly',
    business_yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_YEARLY || 'price_business_yearly',
  },
  PUBLIC_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '',
  SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
};

// =============================================================================
// 🔄 SUBSCRIPTION MANAGEMENT
// =============================================================================

export class PaymentManager {
  private account: MyAppAccountLoaded;
  private subscriptionManager: SubscriptionManager;

  constructor(account: MyAppAccountLoaded) {
    this.account = account;
    this.subscriptionManager = new SubscriptionManager(account);
  }

  /**
   * Create checkout session for subscription upgrade
   */
  async createCheckoutSession(tier: SubscriptionTier, billing: 'monthly' | 'yearly' = 'monthly') {
    const priceId = this.getPriceId(tier, billing);
    
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        tier,
        billing,
        userId: this.account.id,
        userEmail: this.account.profile.email,
        successUrl: `${window.location.origin}/account/billing?success=true`,
        cancelUrl: `${window.location.origin}/account/billing?canceled=true`,
      }),
    });

    const session = await response.json();
    return session;
  }

  /**
   * Create customer portal session for subscription management
   */
  async createPortalSession() {
    const subscription = this.subscriptionManager.getCurrentSubscription();
    
    const response = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: subscription?.billing?.customerId,
        returnUrl: `${window.location.origin}/account/billing`,
      }),
    });

    const session = await response.json();
    return session;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription() {
    const subscription = this.subscriptionManager.getCurrentSubscription();
    
    const response = await fetch('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId: subscription?.billing?.subscriptionId,
      }),
    });

    return response.json();
  }

  /**
   * Get invoice history
   */
  async getInvoiceHistory() {
    const subscription = this.subscriptionManager.getCurrentSubscription();
    
    const response = await fetch('/api/stripe/get-invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: subscription?.billing?.customerId,
      }),
    });

    return response.json();
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod() {
    const subscription = this.subscriptionManager.getCurrentSubscription();
    
    const response = await fetch('/api/stripe/update-payment-method', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: subscription?.billing?.customerId,
        setupIntentUrl: `${window.location.origin}/account/billing/payment-method`,
      }),
    });

    return response.json();
  }

  /**
   * Get subscription status from Stripe
   */
  async syncSubscriptionStatus() {
    const subscription = this.subscriptionManager.getCurrentSubscription();
    
    const response = await fetch('/api/stripe/sync-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId: subscription?.billing?.subscriptionId,
        userId: this.account.id,
      }),
    });

    return response.json();
  }

  // =============================================================================
  // 🔧 UTILITY METHODS
  // =============================================================================

  private getPriceId(tier: SubscriptionTier, billing: 'monthly' | 'yearly'): string {
    const key = `${tier}_${billing}` as keyof typeof STRIPE_CONFIG.PRICE_IDS;
    return STRIPE_CONFIG.PRICE_IDS[key];
  }

  /**
   * Format subscription for Stripe metadata
   */
  getSubscriptionMetadata() {
    const subscription = this.subscriptionManager.getCurrentSubscription();
    const plan = this.subscriptionManager.getCurrentPlan();
    
    return {
      userId: this.account.id,
      userEmail: this.account.profile.email,
      tier: subscription?.tier || 'free',
      planName: plan.name,
      isTrialUser: this.subscriptionManager.isInTrial(),
    };
  }
}

// =============================================================================
// 🎯 REACT HOOKS
// =============================================================================

export function usePaymentManager(account: MyAppAccountLoaded) {
  const paymentManager = new PaymentManager(account);
  
  const upgradeToTier = async (tier: SubscriptionTier, billing: 'monthly' | 'yearly' = 'monthly') => {
    try {
      const session = await paymentManager.createCheckoutSession(tier, billing);
      
      // Redirect to Stripe Checkout
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  };

  const openBillingPortal = async () => {
    try {
      const session = await paymentManager.createPortalSession();
      
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      throw error;
    }
  };

  const cancelSubscription = async () => {
    try {
      const result = await paymentManager.cancelSubscription();
      
      // Refresh subscription data
      await paymentManager.syncSubscriptionStatus();
      
      return result;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  };

  return {
    upgradeToTier,
    openBillingPortal,
    cancelSubscription,
    getInvoiceHistory: () => paymentManager.getInvoiceHistory(),
    updatePaymentMethod: () => paymentManager.updatePaymentMethod(),
    syncSubscriptionStatus: () => paymentManager.syncSubscriptionStatus(),
    getSubscriptionMetadata: () => paymentManager.getSubscriptionMetadata(),
  };
} 