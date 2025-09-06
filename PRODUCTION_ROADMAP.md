# 🚀 Production Subscription System Roadmap

## 🎯 Current Status: TESTING WORKS ✅

**Right now**: Users can pay via Stripe Payment Links, payments show in your dashboard.
**Missing**: Automatic subscription activation after payment.

## 📋 Step-by-Step Production Plan

### **Phase 1: Stripe Webhook Integration** 🔗

**What it does**: Automatically activates users after they pay
**Required**: Yes, for automatic activation

#### 1.1 Set Up Supabase Database
```sql
-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  email TEXT NOT NULL,
  status TEXT NOT NULL, -- 'active', 'cancelled', 'past_due'
  plan TEXT NOT NULL,   -- 'monthly', 'yearly' 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for fast lookups
CREATE INDEX idx_subscriptions_email ON subscriptions(email);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
```

#### 1.2 Create Supabase Edge Function (Webhook Handler)
```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '')
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object
        
        // Store new subscription
        await supabase.from('subscriptions').insert({
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          email: session.customer_email,
          status: 'active',
          plan: session.metadata?.plan || 'monthly'
        })
        break
        
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object
        await supabase.from('subscriptions')
          .update({ 
            status: subscription.status,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
        break
    }
    
    return new Response(JSON.stringify({ received: true }))
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
```

#### 1.3 Configure Stripe Webhook
1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy webhook secret

### **Phase 2: Update Extension Backend Check** 🔍

#### 2.1 Create Subscription Check Function
```typescript
// supabase/functions/check-subscription/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const { email } = await req.json()
  
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 })
  }
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('email', email)
    .eq('status', 'active')
    .single()
    
  if (error || !data) {
    return new Response(JSON.stringify({ hasSubscription: false }))
  }
  
  return new Response(JSON.stringify({ 
    hasSubscription: true,
    plan: data.plan,
    customerId: data.stripe_customer_id
  }))
})
```

#### 2.2 Update Extension Code
```typescript
// In subscription-manager.ts - Update hasActiveSubscription method
static async hasActiveSubscription(): Promise<boolean> {
  try {
    // Get user's email (you'll need to implement this)
    const userEmail = await this.getUserEmail()
    
    if (!userEmail) return false
    
    const response = await fetch(`${this.API_BASE_URL}/check-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    })
    
    const data = await response.json()
    return data.hasSubscription
  } catch (error) {
    console.error('Error checking subscription:', error)
    return false
  }
}
```

### **Phase 3: Production Deployment** 🌟

#### 3.1 Switch to Live Stripe
1. **Stripe Dashboard**: Switch to Live mode
2. **Create Live Products**: Monthly/Yearly in live mode
3. **Create Live Payment Links**: Copy new live URLs
4. **Update Extension**: Replace test URLs with live URLs
5. **Update Webhooks**: Point to live webhook endpoint

#### 3.2 Deploy Supabase Functions
```bash
# Deploy to production
supabase functions deploy stripe-webhook
supabase functions deploy check-subscription
```

#### 3.3 Set Production Environment Variables
```bash
# In Supabase Dashboard > Edge Functions > Secrets
STRIPE_SECRET_KEY=sk_live_... (your live secret key)
STRIPE_WEBHOOK_SECRET=whsec_... (from live webhook)
```

## 🔧 **URL Management (Answer to your question)**

### **Testing (Current)**
- URLs hardcoded in extension code ✅
- Manual updates when needed ✅

### **Production Options**

**Option A: Keep URLs in Code (Simpler)**
```typescript
// Just update the URLs when going live
private static readonly PAYMENT_URLS = {
  monthly: 'https://buy.stripe.com/live_XXXXXXX', // Live URL
  yearly: 'https://buy.stripe.com/live_YYYYYYY'    // Live URL
}
```

**Option B: Fetch URLs from Backend (More Flexible)**
```typescript
// Fetch from Supabase config table
static async getPaymentUrls() {
  const response = await fetch(`${API_BASE_URL}/get-payment-config`)
  return await response.json()
}
```

**👍 Recommendation**: Start with **Option A** (hardcoded) for simplicity.

## 🎯 **What Supabase Does**

1. **Database**: Stores who has active subscriptions
2. **Edge Functions**: 
   - Receives Stripe webhooks
   - Checks subscription status for extension
3. **API**: Extension calls it to verify subscriptions

## ⚡ **Quick Production Setup (Minimal)**

If you want to go live quickly:

1. **Switch Stripe to live mode**
2. **Create live Payment Links** 
3. **Update URLs in extension**
4. **Deploy webhook to handle automatic activation**

That's it! Users can pay and get automatically activated.

## 📊 **Timeline Estimate**

- **Phase 1** (Webhooks): 2-4 hours
- **Phase 2** (Backend check): 1-2 hours  
- **Phase 3** (Deployment): 30 minutes

**Total**: Half a day to full production system!

Would you like me to start with Phase 1 (webhook setup)?