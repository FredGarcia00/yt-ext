# Supabase Backend Deployment Guide

## Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Access to your Supabase project: `eqwcmgtfprcixhcjxskf`

## Environment Variables/Secrets
Your Supabase project has these secrets configured:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key for client requests
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key for server operations
- `SUPABASE_DB_URL` - Direct database connection URL
- `YOUTUBE_API_KEY` - For YouTube Data API calls
- `STRIPE_SECRET_KEY` - For payment processing
- `STRIPE_MONTHLY_PRICE_ID` - Monthly subscription price ID
- `STRIPE_YEARLY_PRICE_ID` - Yearly subscription price ID
- `STRIPE_WEBHOOK_SECRET` - For webhook validation

## Step 1: Deploy Database Schema

```bash
# Login to Supabase CLI
supabase login

# Link to your existing project
supabase link --project-ref eqwcmgtfprcixhcjxskf

# Deploy the database migration (creates new tables)
supabase db push
```

This will create the following new tables:
- `youtube_accounts` - Links user emails to YouTube channels
- `user_folders` - Stores AI-generated folder collections
- `ai_usage` - Tracks daily AI sort usage per user

## Step 2: Deploy Edge Functions

```bash
# Deploy all Edge Functions
supabase functions deploy youtube-proxy
supabase functions deploy stripe-webhook
supabase functions deploy stripe-portal
supabase functions deploy create-checkout
supabase functions deploy verify-subscription
supabase functions deploy verify-payment
supabase functions deploy manage-user-folders
supabase functions deploy track-usage-limits
supabase functions deploy authenticate-youtube-channel
```

## Step 3: Test the Backend

### Test Subscription Verification
```bash
curl -X POST https://eqwcmgtfprcixhcjxskf.supabase.co/functions/v1/verify-subscription \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"email":"fredgonzalezgonzalez15@gmail.com"}'
```

### Test YouTube Channel Authentication
```bash
curl -X POST https://eqwcmgtfprcixhcjxskf.supabase.co/functions/v1/authenticate-youtube-channel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"access_token":"ya29.a0AfH6SMC..."}'
```

### Test AI Usage Tracking
```bash
curl -X POST "https://eqwcmgtfprcixhcjxskf.supabase.co/functions/v1/track-ai-usage?action=check" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{"email":"fredgonzalezgonzalez15@gmail.com","channelId":"UC123"}'
```

## Step 4: Build and Test Extension

```bash
# Build the extension
npm run build

# Load the extension in Chrome:
# 1. Go to chrome://extensions/
# 2. Enable "Developer mode" 
# 3. Click "Load unpacked"
# 4. Select the `dist` folder
```

## Expected Flow

1. **User clicks AI Sort** → Extension checks authentication
2. **If not authenticated** → OAuth flow via background script
3. **Channel verified** → Stored in `youtube_accounts` table
4. **Subscription checked** → Against existing `subscriptions` table
5. **AI usage tracked** → In `ai_usage` table (20 daily limit)
6. **Folders saved** → In `user_folders` table
7. **Complete isolation** → Each YouTube channel has separate data

## Database Relationships

```
customers (existing)
├── subscriptions (existing) 
└── youtube_accounts (new)
    ├── user_folders (new)
    └── ai_usage (new)
```

## Security Features

- **Row Level Security** enabled on all tables
- **Service role access** for Edge Functions
- **Email-based authentication** using existing subscription system
- **Daily usage limits** enforced server-side
- **Channel ownership verification** via YouTube API

## Chrome Store Compliance

- ✅ **OAuth in background script only**
- ✅ **Minimal DOM manipulation**
- ✅ **Secure token handling**
- ✅ **Transparent permissions**
- ✅ **User data protection**
- ✅ **Server-side validation**

## Troubleshooting

### 404 Errors
- Ensure Edge Functions are deployed: `supabase functions list`

### Authentication Issues  
- Check OAuth permissions in manifest.json
- Verify client ID in youtube-auth-service.ts

### Database Errors
- Check migration status: `supabase db diff`
- Verify RLS policies are active