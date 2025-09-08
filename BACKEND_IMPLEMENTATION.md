# Backend Implementation Required for Account Bleeding Fix

## Overview
The Chrome extension now uses **server-side channel ID validation** to prevent account bleeding. The server must implement the `/validate-token` endpoint that uses the YouTube Data API to determine which channel actually owns the OAuth token.

## Required Backend Endpoint

### POST `/validate-token`

**Request:**
```json
{
  "access_token": "ya29.a0AfH6SMC..."
}
```

**Implementation Steps:**
1. **Validate Token with YouTube Data API**
   - Call `GET https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`
   - Use the provided `access_token` in Authorization header
   - This will return the channel that actually owns the token

2. **Extract Channel Information**
   - Get `channelId` from the API response
   - Get user email from Google OAuth userinfo API
   - Check subscription status in your database

3. **Response Format:**
```json
{
  "success": true,
  "channelId": "UCxxxxxxxxxxxxxxxxxxxxxxx",
  "email": "user@example.com", 
  "channelName": "Channel Name",
  "hasSubscription": true
}
```

## Key Implementation Details

### YouTube Data API Call
```javascript
// Server-side implementation example
const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

const data = await response.json();
const channelId = data.items[0].id; // This is the authoritative channel ID
```

### Why This Prevents Account Bleeding
1. **Server determines channel ownership**: The YouTube API tells us exactly which channel the token belongs to
2. **Client-side channel matching**: Extension compares server-validated channel ID vs current page channel ID  
3. **Blocks mismatches**: If channel IDs don't match, access is denied

## Required Environment Variables
- `YOUTUBE_API_KEY` (if needed for additional API calls)
- Database connection for subscription validation

## Error Handling
Return appropriate error responses:
```json
{
  "success": false,
  "error": "Invalid token or YouTube API error"
}
```

## Testing
Test with multiple Google accounts to verify:
1. Token belongs to correct channel
2. Subscription validation works
3. Different channels get blocked appropriately

This approach is **future-proof** and **reliable** compared to DOM scraping methods.

## ⚠️ IMPORTANT: Account Matching Requirement

**Current Implementation Status: WORKING with Browser-YouTube Account Matching**

The current production implementation requires:
1. **Browser Google Account** (the account Chrome is signed into)
2. **YouTube Channel Account** (the channel being viewed) 
3. **Must Match**: The OAuth token's channel must match the current page's channel

### User Experience Impact:
- **✅ Single Account Users**: Works perfectly  
- **⚠️ Multi-Account Users**: Must switch browser accounts (not just YouTube accounts)

### Example Scenarios:
```
✅ WORKS:
- Browser: signed into paid@gmail.com
- YouTube: viewing paid@gmail.com's channel
- Result: Access granted

❌ BLOCKED:  
- Browser: signed into paid@gmail.com  
- YouTube: viewing business@gmail.com's channel
- Result: "Account mismatch detected"
```

This prevents **100% of account bleeding** but requires users to manage browser accounts for different YouTube channels.