import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_CONFIG } from '@/utils/paymentIntegration';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(STRIPE_CONFIG.SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      STRIPE_CONFIG.WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);
  
  const { userId, tier, billing } = session.metadata!;
  
  // Update user subscription in your database
  // This would typically involve updating the Jazz account
  // For now, we'll just log the event
  console.log(`User ${userId} upgraded to ${tier} (${billing})`);
  
  // You would implement the database update logic here
  // Example:
  // await updateUserSubscription(userId, {
  //   tier: tier as SubscriptionTier,
  //   status: 'active',
  //   customerId: session.customer as string,
  //   subscriptionId: session.subscription as string,
  //   billing: billing as 'monthly' | 'yearly',
  // });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const { userId } = subscription.metadata;
  
  // Update subscription status to active
  console.log(`Payment succeeded for user ${userId}`);
  
  // You would implement the database update logic here
  // await updateUserSubscriptionStatus(userId, 'active');
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const { userId } = subscription.metadata;
  
  // Update subscription status to past_due
  console.log(`Payment failed for user ${userId}`);
  
  // You would implement the database update logic here
  // await updateUserSubscriptionStatus(userId, 'past_due');
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const { userId } = subscription.metadata;
  
  // Update subscription details
  console.log(`Subscription updated for user ${userId}`);
  
  // You would implement the database update logic here
  // await updateUserSubscription(userId, {
  //   status: subscription.status,
  //   currentPeriodStart: new Date(subscription.current_period_start * 1000),
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  // });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const { userId } = subscription.metadata;
  
  // Downgrade user to free tier
  console.log(`Subscription canceled for user ${userId}`);
  
  // You would implement the database update logic here
  // await updateUserSubscription(userId, {
  //   tier: 'free',
  //   status: 'canceled',
  // });
} 