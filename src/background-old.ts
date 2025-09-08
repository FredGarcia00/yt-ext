// Force immediate console log
console.log('BG: Background script starting NOW');

// Test Chrome APIs are available
try {
  console.log('BG: Chrome runtime available:', !!chrome.runtime);
  console.log('BG: Chrome storage available:', !!chrome.storage);
} catch (e) {
  console.error('BG: Chrome APIs error:', e);
}

// Import authentication configuration
import { CookieSessionService } from './utils/cookie-session-service';
import { BackgroundAuthHandler } from './utils/background-auth-handler';

// Supabase config
const SUPABASE_URL = 'https://eqwcmgtfprcixhcjxskf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2NtZ3RmcHJjaXhoY2p4c2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjU5NzcsImV4cCI6MjA2OTc0MTk3N30.5se8kIl8_uYeHzyTgD6A3DsiS91cEXDYJ_ejBcPoXN4';

// Initialize cookie session service on startup
CookieSessionService.initialize().then(() => {
  console.log('BG: Cookie session service initialized');
}).catch(error => {
  console.error('BG: Failed to initialize cookie session service:', error);
});

console.log('BG: Setting up message listener');

// Handle all messages
chrome.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any) => {
  console.log('BG: Message received:', request.type);
  
  if (request.type === 'manageFolders') {
    console.log('BG: Handling manageFolders');
    handleManageFolders(request, sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (request.type === 'authenticateYouTube') {
    console.log('BG: Handling authenticateYouTube');
    // Use new cookie-based auth
    handleAIAuthentication(sendResponse);
    return true;
  }
  
  
  if (request.type === 'handleAIAuthentication') {
    console.log('BG: Handling handleAIAuthentication');
    handleAIAuthentication(sendResponse);
    return true;
  }
  
  if (request.type === 'checkAuthenticationStatus') {
    console.log('BG: Handling checkAuthenticationStatus');
    handleCheckAuthenticationStatus(sendResponse);
    return true;
  }
  
  if (request.type === 'checkEmailSubscription') {
    console.log('BG: Handling checkEmailSubscription');
    handleSubscriptionCheck(request, sendResponse);
    return true;
  }
  
  if (request.type === 'checkAIUsage') {
    console.log('BG: Handling checkAIUsage');
    handleCheckAIUsage(request, sendResponse);
    return true;
  }
  
  if (request.type === 'incrementAIUsage') {
    console.log('BG: Handling incrementAIUsage');
    handleIncrementAIUsage(request, sendResponse);
    return true;
  }
  
  if (request.type === 'verifyChannelOwnership') {
    console.log('💥 BG: Handling verifyChannelOwnership');
    handleChannelOwnershipVerification(request, sendResponse);
    return true;
  }
  
  if (request.type === 'clearSubscriptionCache') {
    console.log('BG: Handling clearSubscriptionCache - clearing ALL subscription data');
    subscriptionCache.clear();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'forceSubscriptionRefresh') {
    console.log('BG: Handling forceSubscriptionRefresh - clearing cache for specific email');
    const { email } = request;
    if (email) {
      subscriptionCache.delete(email.toLowerCase().trim());
      console.log('BG: Cleared cache for email:', email);
    }
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'getCurrentYouTubeUser') {
    console.log('BG: Getting current YouTube user via API');
    handleGetCurrentYouTubeUser(sendResponse);
    return true;
  }
  
  if (request.type === 'saveFolders') {
    console.log('BG: Handling saveFolders');
    handleSaveFolders(request, sendResponse);
    return true;
  }
  
  if (request.type === 'loadFolders') {
    console.log('BG: Handling loadFolders');
    handleLoadFolders(sendResponse);
    return true;
  }
  
  return false;
});

// Handle folder operations - FIXED: Added subscription verification
async function handleManageFolders(request: any, sendResponse: any) {
  try {
    // Log the raw request to see exactly what we're receiving
    console.log('BG: Raw request received:', JSON.stringify(request));
    console.log('BG: Request keys:', Object.keys(request));
    
    console.log('BG: Processing manageFolders request with full details:', JSON.stringify({
      type: request.type,
      action: request.action,
      hasEmail: !!request.email,
      hasChannelId: !!request.channelId,
      hasYoutubeChannelId: !!request.youtubeChannelId,
      folderName: request.folderName
    }));
    
    // Extract parameters with defensive checks
    let { action, email, channelId, youtubeChannelId, folderName, channelIds, folderMetadata } = request;
    
    // Additional defensive extraction - check if parameters are defined
    console.log('BG: Initial extraction - email:', email, 'channelId:', channelId, 'youtubeChannelId:', youtubeChannelId);
    
    // If parameters are undefined, try alternative extraction methods
    if (!email && request.email !== undefined) {
      email = request.email;
      console.log('BG: Recovered email from request.email:', email);
    }
    
    if (!youtubeChannelId && request.youtubeChannelId !== undefined) {
      youtubeChannelId = request.youtubeChannelId;
      console.log('BG: Recovered youtubeChannelId from request.youtubeChannelId:', youtubeChannelId);
    }
    
    if (!channelId && request.channelId !== undefined) {
      channelId = request.channelId;
      console.log('BG: Recovered channelId from request.channelId:', channelId);
    }
    
    // Robust parameter extraction - try multiple parameter names
    const finalEmail = email || request.email || null;
    const finalChannelId = youtubeChannelId || channelId || request.youtubeChannelId || request.channelId || null;
    const finalAction = action || request.action || null;
    
    // Debug log the extracted parameters
    console.log('BG: Extracted parameters:', {
      finalEmail: finalEmail ? finalEmail.substring(0, 15) + '...' : 'MISSING',
      finalChannelId: finalChannelId ? finalChannelId.substring(0, 20) + '...' : 'MISSING',
      finalAction,
      folderName
    });
    
    // Basic validation with clear error messages
    if (!finalEmail || !finalChannelId || !finalAction) {
      const missing = [];
      if (!finalEmail) missing.push('email');
      if (!finalChannelId) missing.push('youtubeChannelId');
      if (!finalAction) missing.push('action');
      
      console.error('BG: Missing required parameters:', missing, 'from request:', JSON.stringify(request));
      sendResponse({ 
        success: false, 
        error: `Missing required parameters: ${missing.join(', ')}`
      });
      return;
    }
    
    console.log('BG: Valid parameters received for folder operation:', finalAction, folderName);

    // SECURITY FIX: Check subscription before ANY folder operation (except GET)
    if (finalAction === 'save' || finalAction === 'delete') {
      console.log('BG: [SECURITY] Checking subscription before folder operation...');
      
      // Check subscription status
      const cachedSubscription = subscriptionCache.get(finalEmail.toLowerCase().trim());
      let hasSubscription = false;
      
      if (cachedSubscription && Date.now() - cachedSubscription.timestamp < CACHE_TTL) {
        hasSubscription = Boolean(cachedSubscription.hasSubscription);
      } else {
        // Make fresh subscription check
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-subscription`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Accept': 'application/json'
            },
            body: JSON.stringify({ email: finalEmail.toLowerCase().trim() })
          });
          
          if (response.ok) {
            const result = await response.json();
            hasSubscription = Boolean(result.hasSubscription);
            
            // Cache result
            subscriptionCache.set(finalEmail.toLowerCase().trim(), {
              hasSubscription,
              timestamp: Date.now()
            });
          }
        } catch (error) {
          console.error('BG: [SECURITY] Subscription check error:', error);
          hasSubscription = false;
        }
      }
      
      if (!hasSubscription) {
        console.error('BG: [SECURITY] ❌ BLOCKED: No subscription - cannot save/delete folders');
        sendResponse({ 
          success: false, 
          error: 'Active subscription required to manage folders'
        });
        return;
      }
      
      console.log('BG: [SECURITY] ✅ Subscription verified - proceeding with folder operation');
    }

    // Handle GET requests differently
    if (finalAction === 'get') {
      const url = `${SUPABASE_URL}/functions/v1/manage-user-folders?email=${encodeURIComponent(finalEmail)}&youtubeChannelId=${encodeURIComponent(finalChannelId)}&operation=get`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      // Ensure we return in the expected format
      if (data.folders) {
        sendResponse({ success: true, folders: data.folders });
      } else {
        sendResponse(data);
      }
      return;
    }

    // Handle POST/DELETE requests
    const requestBody = {
      email: finalEmail,
      youtubeChannelId: finalChannelId,
      folderName,
      channelIds,
      folderMetadata,
      operation: finalAction
    };
    
    // Log the actual request body that will be sent
    console.log('BG: Full request body to Supabase:', JSON.stringify(requestBody));
    console.log('BG: Sending folder operation to Supabase with body:', JSON.stringify({
      email: finalEmail ? finalEmail.substring(0, 15) + '...' : 'MISSING',
      youtubeChannelId: finalChannelId ? finalChannelId.substring(0, 20) + '...' : 'MISSING',
      folderName,
      operation: finalAction,
      channelIdsCount: channelIds ? channelIds.length : 0
    }));
    
    // Extra validation before sending
    if (!requestBody.email || !requestBody.youtubeChannelId) {
      console.error('BG: CRITICAL - Request body missing required fields:', {
        hasEmail: !!requestBody.email,
        hasYoutubeChannelId: !!requestBody.youtubeChannelId,
        email: requestBody.email,
        youtubeChannelId: requestBody.youtubeChannelId
      });
    }
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-user-folders`, {
      method: finalAction === 'delete' ? 'DELETE' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    console.log('BG: Supabase response status:', response.status);
    console.log('BG: Supabase response data:', JSON.stringify(data));
    
    // If there's an error, make sure to return it properly
    if (!response.ok || !data.success) {
      console.error('BG: Folder operation failed:', data.error || data.message || 'Unknown error');
      sendResponse({
        success: false,
        error: data.error || data.message || `HTTP ${response.status}: Operation failed`
      });
    } else {
      sendResponse(data);
    }
    
  } catch (error) {
    console.error('BG: manageFolders error:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// Process auth token - SECURITY FIX: Clean authentication storage
async function processAuthToken(token: string | undefined, sendResponse: any) {
  if (!token) {
    sendResponse({ success: false, error: 'No auth token provided' });
    return;
  }
  try {
    console.log('BG: [SECURITY] Processing OAuth token...');
    
    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!userResponse.ok) {
      throw new Error(`Failed to get user info: ${userResponse.status}`);
    }
    
    const userInfo = await userResponse.json();
    console.log('BG: [SECURITY] Got user info for:', userInfo.email);

    // Get YouTube channel info
    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=AIzaSyBwFhz2sJg6nYPnBlgAI1nxhB1VdYpWmUk', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!channelResponse.ok) {
      throw new Error(`Failed to get channel info: ${channelResponse.status}`);
    }
    
    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      console.error('BG: [SECURITY] No YouTube channel found for authenticated account');
      sendResponse({
        success: false,
        error: 'No YouTube channel found for this account'
      });
      return;
    }

    const channel = channelData.items[0];
    console.log('BG: [SECURITY] Authenticated channel:', channel.id, channel.snippet.title);
    
    // CRITICAL SECURITY: Verify this Google account's YouTube channel matches current YouTube page
    // Use content script messaging instead of direct DOM access
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.url?.includes('youtube.com')) {
        console.error('BG: [SECURITY] Authentication must be performed on YouTube');
        sendResponse({
          success: false,
          error: 'Please authenticate while on YouTube.com'
        });
        return;
      }

      // Send message to content script to get current YouTube account
      const currentYouTubeChannel = await new Promise<string | null>((resolve) => {
        chrome.tabs.sendMessage(activeTab.id!, { type: 'getCurrentYouTubeChannel' }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('BG: [SECURITY] Content script communication error:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(response?.channelId || null);
          }
        });
      });
      
      if (currentYouTubeChannel && currentYouTubeChannel !== channel.id) {
        console.error('BG: [SECURITY] ❌ YOUTUBE ACCOUNT MISMATCH DETECTED!');
        console.error('BG: [SECURITY] Google account channel:', channel.id);
        console.error('BG: [SECURITY] Current YouTube account:', currentYouTubeChannel);
        
        sendResponse({
          success: false,
          error: `Account mismatch detected! Your Google account is linked to a different YouTube channel than the one you're currently using. Please switch to the correct YouTube account or sign in with the matching Google account.`
        });
        return;
      }
      
      if (currentYouTubeChannel) {
        console.log('BG: [SECURITY] ✅ YouTube account verified - Google account matches current YouTube account');
      } else {
        console.warn('BG: [SECURITY] ⚠️ Could not detect current YouTube account, proceeding with authentication');
      }
      
    } catch (error) {
      console.error('BG: [SECURITY] Error verifying YouTube account match:', error);
      // Don't block authentication if verification fails - could be due to page not fully loaded
      console.warn('BG: [SECURITY] ⚠️ YouTube account verification failed, proceeding with authentication');
    }
    
    // SECURITY: Clear any old authentication data first
    const allKeys = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(allKeys).filter(key => 
      key.startsWith('account_') || 
      key.startsWith('fresh_session_') ||
      key === 'authenticatedEmail' ||
      key === 'authenticatedChannelId' ||
      key === 'authenticatedChannelName'
    );
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log('BG: [SECURITY] Cleared', keysToRemove.length, 'old authentication keys');
    }
    
    // SECURITY: Verify subscription BEFORE storing authentication
    console.log('Extension: Verifying subscription before authentication');
    try {
      const subResponse = await fetch(`${SUPABASE_URL}/functions/v1/verify-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: userInfo.email })
      });

      if (!subResponse.ok) {
        throw new Error(`Subscription verification failed: ${subResponse.status}`);
      }

      const subResult = await subResponse.json();
      console.log('Extension: Subscription verification complete');

      if (!subResult.hasSubscription) {
        console.log('Extension: Access denied - subscription required');
        sendResponse({
          success: false,
          error: 'Active subscription required to use this extension.'
        });
        return;
      }

      console.log('Extension: Subscription verified - storing authentication');

      // SECURITY: Store ONLY the standard authentication keys (subscription verified)
      // Also store channel-specific authentication to prevent bleeding
      await chrome.storage.local.set({
        authenticatedEmail: userInfo.email,
        authenticatedChannelId: channel.id,
        authenticatedChannelName: channel.snippet.title,
        // Add channel-specific storage for validation
        [`channel_${channel.id}_email`]: userInfo.email,
        [`channel_${channel.id}_authenticated`]: true,
        [`channel_${channel.id}_timestamp`]: Date.now()
      });

      console.log('Extension: Authentication stored successfully with channel-specific keys');
      
      // Update subscription cache with verified status
      subscriptionCache.set(userInfo.email.toLowerCase().trim(), {
        hasSubscription: true,
        timestamp: Date.now()
      });

      // CRITICAL: Create cookie session for new session-based system
      console.log('BG: Creating cookie session for authenticated user');
      const sessionResult = await CookieSessionService.createSession({
        token: token,
        email: userInfo.email,
        channelId: channel.id,
        channelName: channel.snippet.title,
        hasSubscription: true // Already verified above
      });
      
      if (!sessionResult.success) {
        console.error('BG: Failed to create cookie session:', sessionResult.error);
        // Continue anyway since old storage is still set
      } else {
        console.log('BG: Cookie session created successfully');
      }

      sendResponse({
        success: true,
        email: userInfo.email,
        channelId: channel.id,
        channelName: channel.snippet.title
      });

    } catch (subError) {
      console.error('Extension: Subscription verification failed:', subError);
      
      // Clear any existing auth on subscription failure
      await chrome.storage.local.remove([
        'authenticatedEmail',
        'authenticatedChannelId', 
        'authenticatedChannelName'
      ]);
      
      sendResponse({
        success: false,
        error: 'Unable to verify subscription. Please try again.'
      });
      return;
    }
    
  } catch (error) {
    console.error('BG: [SECURITY] Auth processing error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Handle YouTube authentication - LEGACY: Kept for backward compatibility but unused
// @ts-ignore TS6133: Declared but never read
async function handleYouTubeAuth(sendResponse: any) {
  try {
    console.log('BG: [SECURITY] Starting OAuth authentication with fresh token enforcement');
    
    // SECURITY: Clear ALL existing authentication first
    const authKeys = ['authenticatedEmail', 'authenticatedChannelId', 'authenticatedChannelName'];
    await chrome.storage.local.remove(authKeys);
    console.log('BG: [SECURITY] Cleared existing authentication');
    
    // SECURITY: Clear subscription cache to force fresh check
    subscriptionCache.clear();
    console.log('BG: [SECURITY] Cleared subscription cache');
    
    // STEP 1: Clear ALL cached OAuth tokens
    try {
      // Get all cached tokens and remove them
      await new Promise<void>((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (oldToken) => {
          if (oldToken) {
            chrome.identity.removeCachedAuthToken({ token: oldToken as string }, () => {
              console.log('BG: [SECURITY] Removed cached OAuth token');
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
      
      // Additional clearing for safety
      if (chrome.identity.clearAllCachedAuthTokens) {
        await new Promise<void>((resolve) => {
          chrome.identity.clearAllCachedAuthTokens(() => {
            console.log('BG: [SECURITY] Cleared ALL cached OAuth tokens');
            resolve();
          });
        });
      }
    } catch (error) {
      console.error('BG: [SECURITY] Error clearing cached tokens:', error);
    }
    
    // STEP 2: Force INTERACTIVE authentication for fresh token
    console.log('BG: [SECURITY] Requesting fresh OAuth token with interactive flow');
    
    chrome.identity.getAuthToken({ 
      interactive: true, // ALWAYS interactive for fresh token
      scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/userinfo.email']
    }, async (token) => {
      if (chrome.runtime.lastError) {
        console.error('BG: [SECURITY] OAuth failed:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      
      if (!token) {
        console.error('BG: [SECURITY] No token received');
        sendResponse({ success: false, error: 'Failed to get auth token' });
        return;
      }
      
      const tokenString = token as string;
      console.log('BG: [SECURITY] Fresh OAuth token received');
      
      // SECURITY: Immediately remove the token from cache after use to prevent reuse
      setTimeout(() => {
        chrome.identity.removeCachedAuthToken({ token: tokenString }, () => {
          console.log('BG: [SECURITY] Removed token from cache after use');
        });
      }, 100);
      
      await processAuthToken(tokenString, sendResponse);
    });
    
  } catch (error) {
    console.error('BG: [SECURITY] Auth error:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// Cache for subscription status (5 minute TTL)
const subscriptionCache = new Map<string, { hasSubscription: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Handle subscription check
async function handleSubscriptionCheck(request: any, sendResponse: any) {
  try {
    const email = request.email;
    console.log('BG: Checking subscription for email');
    
    if (!email) {
      console.log('BG: No email provided');
      sendResponse({ hasSubscription: false });
      return;
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check cache first
    const cached = subscriptionCache.get(normalizedEmail);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('BG: Using cached subscription status');
      sendResponse({ hasSubscription: cached.hasSubscription });
      return;
    }
    
    const requestBody = { email: normalizedEmail };
    console.log('BG: Making fresh subscription request to Supabase');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('BG: Supabase response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('BG: Supabase error response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('BG: Subscription check result received');
    
    const hasSubscription = Boolean(result.hasSubscription);
    
    // Cache the result
    subscriptionCache.set(normalizedEmail, {
      hasSubscription,
      timestamp: Date.now()
    });
    
    sendResponse({ hasSubscription });
    
  } catch (error) {
    console.error('BG: Subscription check error:', error);
    sendResponse({ hasSubscription: false });
  }
}

// Handle AI usage check - FIXED: Properly enforce subscription requirement
async function handleCheckAIUsage(request: any, sendResponse: any) {
  try {
    const { email, channelId } = request;
    console.log('BG: [SECURITY] Checking AI usage for:', { email, channelId });
    
    // Try cookie-based session first
    const session = await CookieSessionService.getCurrentSession();
    if (session) {
      console.log('BG: [SECURITY] Using cookie-based authentication');
      
      // Verify the request matches the session
      if (channelId && session.channelId !== channelId) {
        console.error('BG: [SECURITY] Session channel mismatch - blocking access');
        sendResponse({ 
          canUseAI: false, 
          currentUsage: 0, 
          remainingUses: 0,
          hasSubscription: false,
          error: 'Account mismatch detected'
        });
        return;
      }
      
      // Check subscription through session
      const hasSubscription = session.hasSubscription;
      
      if (hasSubscription) {
        console.log('BG: [SECURITY] ✅ Cookie-based subscription verified');
        sendResponse({ 
          canUseAI: true, 
          currentUsage: 0, 
          remainingUses: 999,
          hasSubscription: true
        });
      } else {
        console.log('BG: [SECURITY] ❌ No subscription in session');
        sendResponse({ 
          canUseAI: false, 
          currentUsage: 0, 
          remainingUses: 0,
          hasSubscription: false,
          needsSubscription: true
        });
      }
      return;
    }
    
    // Fallback to old method if no session
    if (!email || !channelId) {
      console.log('BG: [SECURITY] ❌ Missing credentials - blocking AI usage');
      sendResponse({ 
        canUseAI: false, 
        currentUsage: 0, 
        remainingUses: 0, 
        hasSubscription: false,
        error: 'Missing email or channelId' 
      });
      return;
    }
    
    // SECURITY FIX: Always check subscription status, no assumptions
    console.log('BG: [SECURITY] Checking subscription cache for:', email.toLowerCase().trim());
    const cachedSubscription = subscriptionCache.get(email.toLowerCase().trim());
    console.log('BG: [SECURITY] Cached subscription data:', cachedSubscription);
    
    // Default to NO subscription unless proven otherwise
    let hasSubscription = false;
    
    if (cachedSubscription && Date.now() - cachedSubscription.timestamp < CACHE_TTL) {
      // Use cached value if fresh
      hasSubscription = Boolean(cachedSubscription.hasSubscription);
      console.log('BG: [SECURITY] Using cached subscription status:', hasSubscription);
    } else {
      // Always do fresh check if no cache or cache expired
      console.log('BG: [SECURITY] Making fresh subscription check...');
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email: email.toLowerCase().trim() })
        });
        
        if (response.ok) {
          const result = await response.json();
          hasSubscription = Boolean(result.hasSubscription);
          
          // Cache the fresh result
          subscriptionCache.set(email.toLowerCase().trim(), {
            hasSubscription,
            timestamp: Date.now()
          });
          
          console.log('BG: [SECURITY] Fresh subscription check result:', { email, hasSubscription });
        } else {
          console.error('BG: [SECURITY] Subscription check failed with status:', response.status);
          hasSubscription = false;
          
          // Clear cache on error to force fresh check next time
          subscriptionCache.delete(email.toLowerCase().trim());
        }
      } catch (error) {
        console.error('BG: [SECURITY] Fresh subscription check failed:', error);
        hasSubscription = false;
        
        // Clear cache on error
        subscriptionCache.delete(email.toLowerCase().trim());
      }
    }
    
    // SECURITY: Additional channel ownership verification
    const storedAuth = await chrome.storage.local.get([
      'authenticatedEmail',
      'authenticatedChannelId',
      `account_${channelId}_email`
    ]);
    
    // Verify the email matches what we have stored for this channel
    const storedEmailForChannel = storedAuth[`account_${channelId}_email`];
    
    if (storedEmailForChannel && storedEmailForChannel !== email) {
      console.error('BG: [SECURITY] ❌ EMAIL MISMATCH - possible account bleeding attempt');
      console.error('BG: [SECURITY] Requested email:', email);
      console.error('BG: [SECURITY] Stored email for channel:', storedEmailForChannel);
      sendResponse({ 
        canUseAI: false, 
        currentUsage: 0, 
        remainingUses: 0,
        hasSubscription: false,
        error: 'Authentication mismatch - please re-authenticate'
      });
      return;
    }
    
    console.log('BG: [SECURITY] Final subscription status:', { email, hasSubscription });
    
    if (hasSubscription === true) {
      // ONLY paid users with verified subscription get access
      console.log('BG: [SECURITY] ✅ Subscription verified - allowing AI usage');
      sendResponse({ 
        canUseAI: true, 
        currentUsage: 0, 
        remainingUses: 999,
        hasSubscription: true
      });
    } else {
      // SECURITY: Block ALL non-subscribers
      console.log('BG: [SECURITY] ❌ NO SUBSCRIPTION - blocking AI usage completely');
      sendResponse({ 
        canUseAI: false, 
        currentUsage: 0, 
        remainingUses: 0,
        hasSubscription: false,
        error: 'Active subscription required for AI Sort'
      });
    }
    
  } catch (error) {
    console.error('BG: [SECURITY] Check AI usage error:', error);
    // SECURITY: Default to blocking on any error
    sendResponse({ 
      canUseAI: false,
      currentUsage: 0,
      remainingUses: 0,
      hasSubscription: false,
      error: (error as Error).message 
    });
  }
}

// Handle AI usage increment
async function handleIncrementAIUsage(request: any, sendResponse: any) {
  try {
    const { email, channelId } = request;
    console.log('BG: Incrementing AI usage for:', { email, channelId });
    
    if (!email || !channelId) {
      sendResponse({ 
        success: false, 
        error: 'Missing email or channelId' 
      });
      return;
    }
    
    // For now, just return success for paid subscribers
    // TODO: Implement actual usage tracking in Supabase
    const hasSubscription = subscriptionCache.get(email.toLowerCase().trim())?.hasSubscription;
    
    if (hasSubscription) {
      sendResponse({ 
        success: true,
        canUseAI: true,
        currentUsage: 1,
        remainingUses: 998
      });
    } else {
      sendResponse({ 
        success: true,
        canUseAI: true,
        currentUsage: 1,
        remainingUses: 19
      });
    }
    
  } catch (error) {
    console.error('BG: Increment AI usage error:', error);
    sendResponse({ 
      success: false, 
      error: (error as Error).message 
    });
  }
}

// Handle getting current YouTube user via API
async function handleGetCurrentYouTubeUser(sendResponse: any) {
  try {
    console.log('BG: Attempting to get current YouTube user');
    
    // Get stored authentication to find token
    const storedAuth = await chrome.storage.local.get(['authenticatedEmail', 'authenticatedChannelId']);
    
    if (!storedAuth.authenticatedEmail || !storedAuth.authenticatedChannelId) {
      console.log('BG: No stored authentication found for API call');
      sendResponse({ success: false, error: 'No authentication found' });
      return;
    }
    
    // Try to get a fresh token for API call
    chrome.identity.getAuthToken({ interactive: false }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        console.log('BG: Could not get token for YouTube API call');
        // Return stored values as fallback
        sendResponse({
          success: true,
          channelId: storedAuth.authenticatedChannelId,
          email: storedAuth.authenticatedEmail
        });
        return;
      }
      
      try {
        // Call YouTube API to get current user's channel
        const channelResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=AIzaSyBwFhz2sJg6nYPnBlgAI1nxhB1VdYpWmUk',
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        
        if (!channelResponse.ok) {
          throw new Error(`YouTube API error: ${channelResponse.status}`);
        }
        
        const channelData = await channelResponse.json();
        
        if (channelData.items && channelData.items.length > 0) {
          const channel = channelData.items[0];
          
          // Also get user info for email
          const userResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (userResponse.ok) {
            const userInfo = await userResponse.json();
            
            console.log('BG: Successfully got YouTube user via API');
            sendResponse({
              success: true,
              channelId: channel.id,
              email: userInfo.email,
              channelName: channel.snippet.title
            });
            return;
          }
        }
        
        // Fallback to stored values
        sendResponse({
          success: true,
          channelId: storedAuth.authenticatedChannelId,
          email: storedAuth.authenticatedEmail
        });
        
      } catch (error) {
        console.error('BG: Error calling YouTube API:', error);
        // Fallback to stored values
        sendResponse({
          success: true,
          channelId: storedAuth.authenticatedChannelId,
          email: storedAuth.authenticatedEmail
        });
      }
    });
    
  } catch (error) {
    console.error('BG: Error in handleGetCurrentYouTubeUser:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// Handle channel ownership verification (prevents account bleeding) - SECURITY FIX
async function handleChannelOwnershipVerification(request: any, sendResponse: any) {
  try {
    const { email, channelId } = request;
    console.log('BG: [SECURITY] Verifying channel ownership:', { 
      email: email?.substring(0, 10) + '...',
      storedChannelId: channelId?.substring(0, 15) + '...'
    });
    
    if (!email || !channelId) {
      console.log('BG: [SECURITY] ❌ Missing required parameters for ownership verification');
      sendResponse({ 
        isOwner: false, 
        error: 'Missing required parameters' 
      });
      return;
    }
    
    // SECURITY FIX: Get the authenticated credentials from storage
    const authKeys = ['authenticatedEmail', 'authenticatedChannelId'];
    const storedAuth = await chrome.storage.local.get(authKeys);
    
    // Verify we have stored authentication
    if (!storedAuth.authenticatedEmail || !storedAuth.authenticatedChannelId) {
      console.log('BG: [SECURITY] ❌ No stored authentication found');
      sendResponse({ 
        isOwner: false, 
        error: 'No authentication found - please sign in' 
      });
      return;
    }
    
    // SECURITY: Verify the email matches
    if (storedAuth.authenticatedEmail !== email) {
      console.error('BG: [SECURITY] ❌ EMAIL MISMATCH - possible account bleeding!');
      console.error('BG: [SECURITY] Requested email:', email);
      console.error('BG: [SECURITY] Stored email:', storedAuth.authenticatedEmail);
      
      // Clear authentication on mismatch
      await chrome.storage.local.remove(authKeys);
      
      sendResponse({ 
        isOwner: false, 
        error: 'Email mismatch - authentication cleared for security' 
      });
      return;
    }
    
    // SECURITY: Verify the channel ID matches
    if (storedAuth.authenticatedChannelId !== channelId) {
      console.error('BG: [SECURITY] ❌ CHANNEL ID MISMATCH - possible account bleeding!');
      console.error('BG: [SECURITY] Requested channel:', channelId);
      console.error('BG: [SECURITY] Stored channel:', storedAuth.authenticatedChannelId);
      
      // Clear authentication on mismatch
      await chrome.storage.local.remove(authKeys);
      
      sendResponse({ 
        isOwner: false, 
        error: 'Channel mismatch - authentication cleared for security',
        storedChannelId: storedAuth.authenticatedChannelId,
        requestedChannelId: channelId
      });
      return;
    }
    
    // SECURITY: Also check subscription status for this email
    const cachedSubscription = subscriptionCache.get(email.toLowerCase().trim());
    let hasSubscription = false;
    
    if (cachedSubscription && Date.now() - cachedSubscription.timestamp < CACHE_TTL) {
      hasSubscription = Boolean(cachedSubscription.hasSubscription);
    }
    
    // SECURITY FIX: Don't validate against page channel - that's content detection, not user auth
    // The currentChannelId parameter was detecting the channel of the page being viewed,
    // not the user's authenticated account, causing false positives
    
    console.log('BG: [SECURITY] ✅ Channel ownership verified - all security checks passed');
    sendResponse({ 
      isOwner: true,
      hasSubscription: hasSubscription,
      email: email,
      channelId: channelId
    });
    
  } catch (error) {
    console.error('BG: [SECURITY] Channel ownership verification error:', error);
    // SECURITY: Default to denying access on any error
    sendResponse({ 
      isOwner: false, 
      error: (error as Error).message 
    });
  }
}

// New Session-Based Authentication Handlers


// Handle AI authentication (single flow)
async function handleAIAuthentication(sendResponse: any) {
  try {
    console.log('BG: Handling AI authentication request - using working processAuthToken');
    
    // Get OAuth token using the working method
    chrome.identity.getAuthToken({ 
      interactive: true, 
      scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/userinfo.email']
    }, async (token) => {
      if (chrome.runtime.lastError) {
        console.error('BG: OAuth failed:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      
      if (!token) {
        console.error('BG: No token received');
        sendResponse({ success: false, error: 'Failed to get auth token' });
        return;
      }
      
      console.log('BG: OAuth token received, processing with working function...');
      
      // Use the existing working processAuthToken function
      await processAuthToken(token as string, sendResponse);
    });
    
  } catch (error) {
    console.error('BG: AI authentication error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Check authentication status
async function handleCheckAuthenticationStatus(sendResponse: any) {
  try {
    console.log('BG: Checking authentication status');
    
    const session = await CookieSessionService.getCurrentSession();
    
    if (session) {
      // Also verify subscription status
      const hasSubscription = await BackgroundAuthHandler.checkSubscription(session.email);
      
      sendResponse({
        success: true,
        authenticated: true,
        email: session.email,
        channelId: session.channelId,
        channelName: session.channelName,
        hasSubscription,
        expiresAt: session.expiresAt
      });
    } else {
      sendResponse({
        success: true,
        authenticated: false
      });
    }
    
  } catch (error) {
    console.error('BG: Authentication status check error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Handle saving folders using session
async function handleSaveFolders(request: any, sendResponse: any) {
  try {
    const { folders, auth } = request;
    console.log('BG: Saving folders via session');
    
    if (!folders || !auth) {
      sendResponse({ success: false, error: 'Missing folders or auth data' });
      return;
    }
    
    // Verify session and subscription
    const session = await CookieSessionService.getCurrentSession();
    if (!session || !session.hasSubscription) {
      console.error('BG: No valid session or subscription for folder save');
      sendResponse({ success: false, error: 'Authentication or subscription invalid' });
      return;
    }
    
    // Verify the auth matches the session
    if (session.email !== auth.email || session.channelId !== auth.channelId) {
      console.error('BG: Auth mismatch during folder save');
      sendResponse({ success: false, error: 'Authentication mismatch' });
      return;
    }
    
    // Save all folders directly via Supabase
    const requestBody = {
      email: session.email,
      youtubeChannelId: session.channelId,
      folders: folders,
      operation: 'save_all'
    };
    
    console.log('BG: Saving', folders.length, 'folders to Supabase');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-user-folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    console.log('BG: Supabase folder save response:', response.status, data);
    
    if (response.ok && data.success) {
      sendResponse({ success: true, folders: data.folders });
    } else {
      sendResponse({
        success: false,
        error: data.error || data.message || `HTTP ${response.status}: Save failed`
      });
    }
    
  } catch (error) {
    console.error('BG: Save folders error:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// Handle loading folders using session
async function handleLoadFolders(sendResponse: any) {
  try {
    console.log('BG: Loading folders via session');
    
    // Get current session
    const session = await CookieSessionService.getCurrentSession();
    if (!session) {
      console.log('BG: No session for folder load');
      sendResponse({ success: false, error: 'No authentication found' });
      return;
    }
    
    // Load folders using the manageFolders handler
    const loadRequest = {
      type: 'manageFolders',
      action: 'get',
      email: session.email,
      youtubeChannelId: session.channelId
    };
    
    // Use existing manageFolders logic
    await handleManageFolders(loadRequest, sendResponse);
    
  } catch (error) {
    console.error('BG: Load folders error:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

console.log('BG: Background script ready');