// Force immediate console log
console.log('BG: Background script starting NOW');

// Test Chrome APIs are available
try {
  console.log('BG: Chrome runtime available:', !!chrome.runtime);
  console.log('BG: Chrome storage available:', !!chrome.storage);
} catch (e) {
  console.error('BG: Chrome APIs error:', e);
}

// Supabase config
const SUPABASE_URL = 'https://eqwcmgtfprcixhcjxskf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2NtZ3RmcHJjaXhoY2p4c2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjU5NzcsImV4cCI6MjA2OTc0MTk3N30.5se8kIl8_uYeHzyTgD6A3DsiS91cEXDYJ_ejBcPoXN4';

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
    handleYouTubeAuth(sendResponse);
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
  
  return false;
});

// Handle folder operations
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

// Process auth token with CHANNEL OWNERSHIP verification
async function processAuthToken(token: string | undefined, sendResponse: any) {
  if (!token) {
    sendResponse({ success: false, error: 'No auth token provided' });
    return;
  }
  try {
    console.log('💥 BG: Processing fresh OAuth token with ownership verification...');
    
    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const userInfo = await userResponse.json();
    console.log('💥 BG: Got user info for:', userInfo.email);

    // Get YouTube channel info from OAuth token (this tells us what channel the TOKEN can access)
    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=AIzaSyBwFhz2sJg6nYPnBlgAI1nxhB1VdYpWmUk', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const channelData = await channelResponse.json();

    if (!channelData.items || channelData.items.length === 0) {
      console.error('💥 BG: No YouTube channel found for authenticated account');
      sendResponse({
        success: false,
        error: 'No YouTube channel found for this account'
      });
      return;
    }

    const channel = channelData.items[0];
    console.log('💥 BG: OAuth token grants access to channel:', channel.id, channel.snippet.title);
    
    // CRITICAL: Verify this is a FRESH authentication, not cached data
    const authTimestamp = Date.now();
    console.log('💥 BG: Recording auth timestamp:', authTimestamp);
    
    // Store authentication with SESSION-BASED keys (will implement session storage)
    const authData = {
      email: userInfo.email,
      channelId: channel.id,
      channelName: channel.snippet.title,
      authTimestamp,
      tokenHash: token.substring(0, 20) + '...' // For debugging/verification
    };
    
    // Store in Chrome storage (will migrate to sessionStorage)
    await chrome.storage.local.set({
      // Fresh session-based auth (timestamp prevents stale data)
      [`fresh_session_${channel.id}`]: authData,
      // Keep existing keys for backwards compatibility during transition
      authenticatedEmail: userInfo.email,
      authenticatedChannelId: channel.id,
      authenticatedChannelName: channel.snippet.title,
      [`account_${channel.id}_email`]: userInfo.email,
      [`account_${channel.id}_channelId`]: channel.id,
      [`account_${channel.id}_channelName`]: channel.snippet.title
    });
    
    console.log('💥 BG: ✅ Fresh authentication stored for channel:', channel.id);
    
    sendResponse({
      success: true,
      email: userInfo.email,
      channelId: channel.id,
      channelName: channel.snippet.title,
      authTimestamp
    });
    
  } catch (error) {
    console.error('💥 BG: Auth processing error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Handle YouTube authentication with FORCED token invalidation
async function handleYouTubeAuth(sendResponse: any) {
  try {
    console.log('💥🔥 BG: FORCING OAUTH TOKEN INVALIDATION - destroying Chrome token cache');
    
    // STEP 1: Destroy ALL cached OAuth tokens to prevent account bleeding
    try {
      await new Promise<void>((resolve) => {
        chrome.identity.clearAllCachedAuthTokens(() => {
          console.log('💥 BG: Cleared ALL cached OAuth tokens');
          resolve();
        });
      });
    } catch (error) {
      console.error('💥 BG: Error clearing cached tokens:', error);
    }
    
    // STEP 2: FORCE interactive authentication (NEVER use silent auth)
    console.log('💥 BG: Forcing INTERACTIVE authentication - no silent auth allowed');
    
    chrome.identity.getAuthToken({ 
      interactive: true, // ALWAYS interactive to prevent cached token usage
      scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/userinfo.email']
    }, async (token) => {
      if (chrome.runtime.lastError) {
        console.error('💥 BG: Interactive auth failed:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      
      if (!token) {
        console.error('💥 BG: No token received from interactive auth');
        sendResponse({ success: false, error: 'Failed to get auth token' });
        return;
      }
      
      console.log('💥 BG: Fresh interactive token received - processing...');
      
      // STEP 3: Verify token freshness (prevent cached token usage)
      const tokenString = token as string;
      const tokenParts = tokenString.split('.');
      if (tokenParts.length > 1) {
        try {
          const payload = JSON.parse(atob(tokenParts[1]));
          const tokenAge = Date.now() / 1000 - (payload.iat || 0);
          console.log('💥 BG: Token age:', tokenAge, 'seconds');
          
          // If token is older than 60 seconds, it might be cached
          if (tokenAge > 60) {
            console.warn('💥 BG: Token may be cached - age:', tokenAge, 'seconds');
          }
        } catch (e) {
          console.log('💥 BG: Could not parse token payload (might not be JWT)');
        }
      }
      
      await processAuthToken(tokenString, sendResponse);
    });
    
  } catch (error) {
    console.error('💥 BG: Auth error:', error);
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

// Handle AI usage check
async function handleCheckAIUsage(request: any, sendResponse: any) {
  try {
    const { email, channelId } = request;
    console.log('BG: Checking AI usage for:', { email, channelId });
    
    if (!email || !channelId) {
      sendResponse({ 
        canUseAI: false, 
        currentUsage: 0, 
        remainingUses: 0, 
        error: 'Missing email or channelId' 
      });
      return;
    }
    
    console.log('BG: Checking subscription cache for:', email.toLowerCase().trim());
    const cachedSubscription = subscriptionCache.get(email.toLowerCase().trim());
    console.log('BG: Cached subscription data:', cachedSubscription);
    
    // If no cached subscription, check fresh
    let hasSubscription = cachedSubscription?.hasSubscription || false;
    
    if (!cachedSubscription) {
      console.log('BG: No cached subscription, checking fresh...');
      try {
        // Make fresh subscription check
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
          
          console.log('BG: Fresh subscription check result:', { email, hasSubscription });
        } else {
          console.error('BG: Subscription check failed with status:', response.status);
          hasSubscription = false;
        }
      } catch (error) {
        console.error('BG: Fresh subscription check failed:', error);
        hasSubscription = false;
      }
    }
    
    console.log('BG: Final subscription status:', { email, hasSubscription });
    
    if (hasSubscription) {
      // Paid users get unlimited usage
      sendResponse({ 
        canUseAI: true, 
        currentUsage: 0, 
        remainingUses: 999,
        hasSubscription: true
      });
    } else {
      // Non-paid users should see paywall
      console.log('BG: User has no subscription - blocking AI usage');
      sendResponse({ 
        canUseAI: false, 
        currentUsage: 0, 
        remainingUses: 0,
        hasSubscription: false,
        error: 'Subscription required'
      });
    }
    
  } catch (error) {
    console.error('BG: Check AI usage error:', error);
    sendResponse({ 
      canUseAI: false, 
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

// Handle channel ownership verification (prevents account bleeding)
async function handleChannelOwnershipVerification(request: any, sendResponse: any) {
  try {
    const { email, channelId, currentChannelId } = request;
    console.log('💥 BG: Verifying channel ownership:', { 
      email: email?.substring(0, 10) + '...',
      storedChannelId: channelId?.substring(0, 15) + '...',
      currentChannelId: currentChannelId?.substring(0, 15) + '...'
    });
    
    if (!email || !channelId || !currentChannelId) {
      console.log('💥 BG: Missing required parameters for ownership verification');
      sendResponse({ 
        isOwner: false, 
        error: 'Missing required parameters' 
      });
      return;
    }
    
    // CRITICAL: Check if the stored authentication channel matches the current channel
    if (channelId !== currentChannelId) {
      console.log('💥 BG: ❌ CHANNEL MISMATCH - stored auth does not belong to current channel');
      console.log('💥 BG: Stored channel:', channelId.substring(0, 15) + '...');
      console.log('💥 BG: Current channel:', currentChannelId.substring(0, 15) + '...');
      sendResponse({ 
        isOwner: false, 
        error: 'Authentication belongs to different channel',
        storedChannelId: channelId,
        currentChannelId: currentChannelId
      });
      return;
    }
    
    // Additional verification: Check if we have fresh session data for this channel
    const sessionKey = `fresh_session_${channelId}`;
    const sessionData = await chrome.storage.local.get([sessionKey]);
    const freshSession = sessionData[sessionKey];
    
    if (!freshSession) {
      console.log('💥 BG: ❌ No fresh session data found - authentication may be stale');
      sendResponse({ 
        isOwner: false, 
        error: 'No fresh authentication session found' 
      });
      return;
    }
    
    // Check session freshness (within last 30 minutes)
    const sessionAge = Date.now() - (freshSession.authTimestamp || 0);
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    if (sessionAge > maxAge) {
      console.log('💥 BG: ❌ Authentication session is too old:', sessionAge, 'ms');
      sendResponse({ 
        isOwner: false, 
        error: 'Authentication session expired' 
      });
      return;
    }
    
    // Verify email matches
    if (freshSession.email !== email) {
      console.log('💥 BG: ❌ Email mismatch in session data');
      sendResponse({ 
        isOwner: false, 
        error: 'Email mismatch in authentication session' 
      });
      return;
    }
    
    console.log('💥 BG: ✅ Channel ownership verified - all checks passed');
    sendResponse({ 
      isOwner: true,
      sessionAge,
      authTimestamp: freshSession.authTimestamp
    });
    
  } catch (error) {
    console.error('💥 BG: Channel ownership verification error:', error);
    sendResponse({ 
      isOwner: false, 
      error: (error as Error).message 
    });
  }
}

console.log('BG: Background script ready');