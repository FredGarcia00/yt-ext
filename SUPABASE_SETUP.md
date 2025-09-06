# Supabase Setup Instructions

## Prerequisites
1. Install Supabase CLI: https://supabase.com/docs/guides/cli/getting-started
2. Have your Supabase project ready

## Deploy to Supabase

### 1. Login to Supabase CLI
```bash
supabase login
```

### 2. Link to your existing project
```bash
supabase link --project-ref eqwcmgtfprcixhcjxskf
```

### 3. Run the database migration
```bash
supabase db push
```

### 4. Deploy the Edge Function
```bash
supabase functions deploy check-subscription
```

### 5. Set Environment Variables (if needed)
The function uses the default Supabase environment variables that are automatically available:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Database Structure

The migration creates a `subscriptions` table with:
- `id` (UUID, primary key)
- `email` (TEXT, unique)  
- `status` (TEXT: 'active', 'inactive', 'cancelled', 'past_due')
- `stripe_customer_id` (TEXT, optional)
- `stripe_subscription_id` (TEXT, optional)
- `plan_type` (TEXT: 'monthly', 'yearly')
- `created_at`, `updated_at`, `expires_at` (timestamps)

## Testing

After deployment, test the endpoint:
```bash
curl -X POST https://eqwcmgtfprcixhcjxskf.supabase.co/functions/v1/check-subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"email":"fredgonzalezgonzalez15@gmail.com"}'
```

Should return: `{"hasSubscription": true}`

## Integration with Stripe

To connect with real Stripe subscriptions, you'll need to:
1. Add Stripe webhook endpoints
2. Update subscription status when Stripe events occur
3. Store Stripe customer/subscription IDs

The current setup includes a test record for your email that will work immediately.