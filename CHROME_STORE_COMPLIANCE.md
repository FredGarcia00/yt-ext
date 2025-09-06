# Chrome Web Store Compliance Documentation

## Overview
FolderTube Pro is a Chrome extension that organizes YouTube subscriptions using AI. This document outlines how the extension complies with Chrome Web Store policies.

## Permissions Justification

### Required Permissions
- **`storage`** - Store user preferences and cache data locally
- **`identity`** - OAuth authentication with Google/YouTube APIs
- **`identity.email`** - Access user email for subscription verification
- **`alarms`** - Schedule background tasks for API quota management

### Host Permissions
- **`https://*.youtube.com/*`** - Inject UI components on YouTube pages
- **`https://yt3.ggpht.com/*`** - Load channel avatar images
- **`https://yt4.ggpht.com/*`** - Load channel avatar images  
- **`https://yt5.ggpht.com/*`** - Load channel avatar images
- **`https://*.googleusercontent.com/*`** - Load user profile images
- **`https://www.googleapis.com/*`** - YouTube Data API access
- **`https://*.supabase.co/*`** - Backend database and subscription verification
- **`https://foldertube.com/*`** - Official website (future use)
- **`https://api.foldertube.com/*`** - API endpoints (future use)

## Data Handling & Privacy

### Data Collection
- **User Email** - Used for subscription verification via existing Stripe system
- **YouTube Channel ID** - Links folders to specific YouTube channels
- **Subscription Lists** - Organized into AI-generated collections
- **Usage Statistics** - Track AI sort usage (20 per day limit)

### Data Storage
- **Local Storage** - Temporary caching only, no sensitive data
- **Supabase Database** - Secure cloud storage with encryption
- **No Data Selling** - User data is never sold to third parties

### Data Protection
- **Row Level Security** - Each user can only access their own data
- **Encrypted Storage** - All sensitive data encrypted at rest
- **Minimal Data Collection** - Only necessary data for functionality
- **User Control** - Users can delete their data anytime

## Security Measures

### Authentication
- **OAuth 2.0 Flow** - Standard Google OAuth in background script only
- **Token Security** - Access tokens never stored in content scripts
- **Channel Verification** - YouTube API confirms channel ownership
- **Session Management** - Secure token refresh and cleanup

### Account Isolation
- **Server-Side Validation** - All operations validated against subscription database
- **Channel-Specific Data** - Each YouTube channel has completely separate data
- **No Cross-Account Access** - Impossible to access other users' folders
- **Subscription Enforcement** - Every AI sort verified against Stripe subscription

## Content Script Behavior

### Minimal DOM Interaction
- **UI Injection Only** - Only adds buttons and interface elements
- **No Data Harvesting** - Does not read private user data from page
- **No Ad Blocking** - Does not interfere with YouTube advertising
- **No Content Modification** - Does not alter YouTube video content

### User Consent
- **Clear Permission Requests** - All permissions clearly explained
- **Opt-in OAuth** - User must explicitly authorize YouTube access
- **Transparent Operations** - All data usage clearly communicated
- **Uninstall Cleanup** - Data can be deleted when extension is removed

## Subscription Model

### Stripe Integration
- **Legitimate Business Model** - $3.99/month or $39.99/year subscription
- **No Fake Functionality** - All features work as advertised
- **Clear Pricing** - Subscription costs clearly displayed
- **Cancellation Policy** - Users can cancel anytime via Stripe

### Usage Limits
- **Daily Limits** - 20 AI sorts per day to prevent abuse
- **Server Enforcement** - Limits enforced server-side, cannot be bypassed
- **Fair Usage** - Reasonable limits for typical user needs
- **Subscription Required** - AI features require active subscription

## Third-Party Services

### Google APIs
- **YouTube Data API v3** - Access channel and subscription information
- **OAuth 2.0** - User authentication and authorization
- **Official SDKs** - Using official Google client libraries

### Supabase
- **Database Hosting** - Secure PostgreSQL database
- **Edge Functions** - Server-side business logic
- **Authentication** - Secure user session management
- **GDPR Compliant** - European data protection standards

### Stripe
- **Payment Processing** - Secure subscription billing
- **PCI Compliant** - Industry-standard payment security
- **Webhook Integration** - Real-time subscription status updates

## Code Quality & Maintenance

### Architecture
- **Manifest V3** - Latest Chrome extension platform
- **TypeScript** - Type-safe development
- **React Components** - Modern UI framework
- **Service Workers** - Background processing

### Error Handling
- **Graceful Degradation** - Works even with API failures
- **User Feedback** - Clear error messages for users
- **Logging** - Comprehensive error logging for debugging
- **Rate Limiting** - Respects API quotas and limits

## Support & Documentation

### User Support
- **Help Documentation** - Clear usage instructions
- **Email Support** - Responsive customer support
- **Bug Reporting** - GitHub issues for bug reports
- **Feature Requests** - User feedback collection

### Developer Practices
- **Open Source Components** - Using established libraries
- **Security Audits** - Regular code security reviews
- **Testing** - Comprehensive testing before releases
- **Versioning** - Semantic versioning for updates

## Compliance Checklist

- ✅ **Single Purpose** - YouTube subscription organization only
- ✅ **Minimal Permissions** - Only necessary permissions requested
- ✅ **User Privacy** - No unnecessary data collection
- ✅ **Secure Authentication** - OAuth 2.0 in background script
- ✅ **Data Encryption** - All sensitive data encrypted
- ✅ **No Misleading Claims** - Accurate feature descriptions
- ✅ **Legitimate Business Model** - Real subscription service
- ✅ **Quality Code** - Professional development standards
- ✅ **User Control** - Users can manage their data
- ✅ **Third-Party Compliance** - All services meet Chrome standards

This extension follows all Chrome Web Store policies and provides real value to users through AI-powered YouTube subscription organization.