// FolderTube Background Script - Server-Side Token Validation
// Future-proof architecture: Chrome OAuth → Server validates → Store results

import { SUPABASE_CONFIG } from './config/supabase.config';

// Service worker keep-alive
let keepAliveInterval: NodeJS.Timeout | null = null;

function startKeepAlive() {
  if (!keepAliveInterval) {
    keepAliveInterval = setInterval(() => {
    }, 25000);
  }
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

startKeepAlive();

// Main message listener
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  
  // Per-channel authentication
  if (request.type === 'handleAIAuthentication') {
    handleServerValidatedAuth(request, sendResponse);
    return true;
  }
  
  if (request.type === 'checkAuthenticationStatus') {
    checkAuthenticationStatus(request, sendResponse);
    return true;
  }
  
  // Folder management
  if (request.type === 'saveFolders') {
    handleSaveFolders(request, sendResponse);
    return true;
  }
  
  if (request.type === 'loadFolders') {
    handleLoadFolders(sendResponse);
    return true;
  }
  
  // Usage tracking
  if (request.type === 'incrementAIUsage') {
    handleRecordAIUsage(sendResponse);
    return true;
  }
  
  if (request.type === 'checkUsageLimits') {
    handleCheckUsageLimits(sendResponse);
    return true;
  }
  
  // OAuth testing
  if (request.type === 'testOAuth') {
    testOAuthConfiguration(sendResponse);
    return true;
  }
  
  // Legacy handlers
  if (request.type === 'checkSubscription') {
    handleSubscriptionCheck(sendResponse);
    return true;
  }
  
  return false;
});

/**
 * SERVER-VALIDATED AUTHENTICATION: Future-proof solution
 * 1. Get Chrome OAuth token
 * 2. Send to server for validation
 * 3. Server calls YouTube API to determine token owner
 * 4. Store validated results
 */
async function handleServerValidatedAuth(request: any, sendResponse: any) {
  try {
    console.log('BG: [AUTH] Starting per-channel authentication');
    
    // Get the current page's channel ID from the request
    const currentPageChannelId = request.currentPageChannelId;
    if (!currentPageChannelId) {
      sendResponse({
        success: false,
        error: 'Cannot detect YouTube channel on current page. Please navigate to a YouTube channel page or video.'
      });
      return;
    }

    console.log('BG: [AUTH] Authenticating for channel:', currentPageChannelId);
    
    const timeout = 30000; // 30 second timeout
    const timeoutId = setTimeout(() => {
      console.error('BG: [AUTH] Authentication timeout after 30 seconds');
      sendResponse({
        success: false,
        error: 'Authentication timeout - please try again'
      });
    }, timeout);
    
    // Step 1: Get Chrome OAuth token
    const token = await getChromeOAuthToken();
    if (!token) {
      clearTimeout(timeoutId);
      sendResponse({
        success: false,
        error: 'Failed to get authentication token from Chrome'
      });
      return;
    }
    
    // Step 2: Get user email from OAuth token
    const userEmail = await getChromeAccountEmail(token);
    if (!userEmail) {
      clearTimeout(timeoutId);
      sendResponse({
        success: false,
        error: 'Failed to get user email from OAuth token'
      });
      return;
    }
    
    console.log('BG: [AUTH] User email:', userEmail);
    
    // Step 3: Send data to server - server will determine channel ID using YouTube API
    const validationResult = await validateTokenWithServer(token, userEmail);
    
    if (!validationResult.success) {
      console.error('BG: [AUTH] Server validation failed:', validationResult.error);
      clearTimeout(timeoutId);
      sendResponse({
        success: false,
        error: validationResult.error || 'Server validation failed'
      });
      return;
    }

    // Step 4: CRITICAL - Check if OAuth channel matches current page channel
    const oauthChannelId = validationResult.channelId;
    
    console.log('BG: [AUTH] Channel comparison:');
    console.log('  - Current page channel:', currentPageChannelId);
    console.log('  - OAuth token channel:', oauthChannelId);
    
    if (currentPageChannelId !== oauthChannelId) {
      console.warn('BG: [AUTH] ACCOUNT BLEEDING PREVENTED - Channel mismatch detected');
      
      clearTimeout(timeoutId);
      sendResponse({
        success: false,
        error: `Account mismatch: You're on channel ${currentPageChannelId.substring(0, 10)}... but signed into Google account for channel ${oauthChannelId.substring(0, 10)}... Please switch to the matching YouTube account or use a different browser profile.`,
        accountBleeding: true,
        currentPageChannel: currentPageChannelId,
        oauthChannel: oauthChannelId
      });
      return;
    }

    console.log('BG: [AUTH] ✅ Channel match confirmed - No account bleeding');
    
    // Step 5: Store authentication data per channel
    const authenticatedChannels = await getAuthenticatedChannels();
    authenticatedChannels[currentPageChannelId] = {
      email: validationResult.email,
      channelId: validationResult.channelId,
      channelName: validationResult.channelName || 'YouTube Channel',
      hasSubscription: validationResult.hasSubscription,
      authenticatedAt: Date.now(),
      accessToken: token
    };

    await chrome.storage.local.set({
      authenticated_channels: authenticatedChannels,
      current_page_channel: currentPageChannelId
    });
    
    clearTimeout(timeoutId);
    
    console.log('BG: [AUTH] ✅ Authentication successful for channel:', currentPageChannelId);
    console.log('BG: [AUTH] Subscription status:', validationResult.hasSubscription);
    
    sendResponse({
      success: true,
      authenticated: true,
      email: validationResult.email,
      channelId: validationResult.channelId,
      channelName: validationResult.channelName,
      hasSubscription: validationResult.hasSubscription
    });
    
  } catch (error) {
    console.error('BG: [AUTH] Authentication error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
    
    sendResponse({
      success: false,
      error: errorMessage
    });
  }
}

/**
 * Get Chrome OAuth token using chrome.identity API
 */
async function getChromeOAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    
    // Use chrome.identity.getAuthToken with minimal parameters
    // Any extra parameters might trigger third-party interceptors
    chrome.identity.getAuthToken({
      interactive: true
    }, (result) => {
      if (chrome.runtime.lastError) {
        console.error('BG: [SERVER_AUTH] Chrome OAuth error:', chrome.runtime.lastError.message);
        
        // If standard flow fails, try removing specific token and retry
        const errorMessage = chrome.runtime.lastError.message || '';
        if (errorMessage.includes('OAuth2') || 
            errorMessage.includes('User') ||
            errorMessage.includes('bad client')) {
          
          // Try one more time with just the basic call
          chrome.identity.getAuthToken({ interactive: true }, (retryResult) => {
            if (chrome.runtime.lastError) {
              console.error('BG: [SERVER_AUTH] Fallback also failed:', chrome.runtime.lastError.message);
              resolve(null);
            } else {
              const token = typeof retryResult === 'string' ? retryResult : retryResult?.token;
              if (token) {
                resolve(token);
              } else {
                resolve(null);
              }
            }
          });
        } else {
          resolve(null);
        }
      } else if (!result) {
        console.error('BG: [SERVER_AUTH] No token returned from Chrome identity');
        resolve(null);
      } else {
        const token = typeof result === 'string' ? result : result.token;
        if (token) {
          resolve(token);
        } else {
          console.error('BG: [SERVER_AUTH] Invalid token format');
          resolve(null);
        }
      }
    });
  });
}

/**
 * Get Chrome account email from OAuth token
 */
async function getChromeAccountEmail(token: string): Promise<string | null> {
  try {
    
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      console.error('BG: [ACCOUNT_VALIDATION] Failed to get user info:', response.status);
      return null;
    }
    
    const userInfo = await response.json();
    
    if (!userInfo.email) {
      console.error('BG: [ACCOUNT_VALIDATION] No email in user info response');
      return null;
    }
    
    return userInfo.email;
    
  } catch (error) {
    console.error('BG: [ACCOUNT_VALIDATION] Error getting Chrome account email:', error);
    return null;
  }
}

// DOM-based channel detection removed - now handled server-side via YouTube Data API
// This eliminates future-proofing issues with YouTube's changing DOM structure

/**
 * PRODUCTION: Complete authentication flow with client-side YouTube detection
 * Step 1: Get YouTube channel from OAuth token using YouTube Data API
 * Step 2: Send complete data to authenticate-youtube-channel 
 * Step 3: Check subscription status via verify-subscription
 * This prevents account bleeding by using token-based channel detection
 */
async function validateTokenWithServer(accessToken: string, email: string): Promise<any> {
  try {
    console.log('BG: [AUTH] Starting authentication flow with YouTube API');
    
    // Step 1: Get YouTube channel info directly from YouTube API using the OAuth token
    // This determines which YouTube channel actually owns this OAuth token
    const YOUTUBE_API_KEY = 'AIzaSyBwFhz2sJg6nYPnBlgAI1nxhB1VdYpWmUk';
    console.log('BG: [AUTH] Step 1 - Getting YouTube channel from token via YouTube API');
    
    const youtubeResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=${YOUTUBE_API_KEY}`,
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    if (!youtubeResponse.ok) {
      const errorText = await youtubeResponse.text();
      console.error('BG: [AUTH] YouTube API failed:', errorText);
      throw new Error(`YouTube API failed: ${youtubeResponse.status}`);
    }
    
    const youtubeData = await youtubeResponse.json();
    
    if (!youtubeData.items || youtubeData.items.length === 0) {
      console.error('BG: [AUTH] No YouTube channel found for this token');
      throw new Error('No YouTube channel associated with this account');
    }
    
    const channel = youtubeData.items[0];
    const channelId = channel.id;
    const channelName = channel.snippet.title;
    
    console.log('BG: [AUTH] YouTube channel detected:', {
      channelId: channelId,
      channelName: channelName
    });
    
    // Step 2: Send complete authentication data to Supabase
    const authEndpoint = `${SUPABASE_CONFIG.URL}/functions/v1/authenticate-youtube-channel`;
    
    console.log('BG: [AUTH] Step 2 - Authenticating with Supabase');
    const authResponse = await fetch(authEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
      },
      body: JSON.stringify({
        email: email,
        youtubeChannelId: channelId,  // From YouTube API
        channelName: channelName,      // From YouTube API
        accessToken: accessToken
      })
    });
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('BG: [AUTH] Supabase authentication failed:', errorText);
      throw new Error(`Authentication failed: ${authResponse.status}`);
    }
    
    await authResponse.json(); // Consume response body
    console.log('BG: [AUTH] Supabase authentication successful');
    
    // Step 3: Check subscription for the authenticated email
    const subEndpoint = `${SUPABASE_CONFIG.URL}/functions/v1/verify-subscription`;
    
    console.log('BG: [AUTH] Step 3 - Checking subscription for:', email);
    const subResponse = await fetch(subEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
      },
      body: JSON.stringify({
        email: email
      })
    });
    
    let hasSubscription = false;
    if (subResponse.ok) {
      const subData = await subResponse.json();
      hasSubscription = Boolean(subData.hasSubscription);
      console.log('BG: [AUTH] Subscription status:', hasSubscription);
    } else {
      console.warn('BG: [AUTH] Subscription check failed, defaulting to false');
    }
    
    // Return combined result with actual YouTube channel data
    return {
      success: true,
      channelId: channelId,      // From YouTube API - this is the authoritative channel
      channelName: channelName,  // From YouTube API
      email: email,
      hasSubscription: hasSubscription
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    console.error('BG: [AUTH] Authentication error:', errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Get authenticated channels from storage
 */
async function getAuthenticatedChannels(): Promise<Record<string, any>> {
  try {
    const result = await chrome.storage.local.get(['authenticated_channels']);
    return result.authenticated_channels || {};
  } catch (error) {
    console.error('BG: [AUTH] Error getting authenticated channels:', error);
    return {};
  }
}

/**
 * Check current authentication status for a specific channel
 */
async function checkAuthenticationStatus(request: any, sendResponse: any) {
  try {
    const currentPageChannelId = request.currentPageChannelId;
    
    if (!currentPageChannelId) {
      sendResponse({
        success: true,
        authenticated: false,
        error: 'No channel detected on current page'
      });
      return;
    }
    
    console.log('BG: [AUTH] Checking auth status for channel:', currentPageChannelId);
    
    const authenticatedChannels = await getAuthenticatedChannels();
    const channelAuth = authenticatedChannels[currentPageChannelId];
    
    if (!channelAuth) {
      console.log('BG: [AUTH] No authentication found for channel:', currentPageChannelId);
      sendResponse({
        success: true,
        authenticated: false
      });
      return;
    }
    
    // Check if authentication is still fresh (24 hours)
    const authAge = Date.now() - (channelAuth.authenticatedAt || 0);
    const isExpired = authAge > (24 * 60 * 60 * 1000); // 24 hours
    
    if (isExpired) {
      console.log('BG: [AUTH] Authentication expired for channel:', currentPageChannelId);
      
      // Remove expired auth
      delete authenticatedChannels[currentPageChannelId];
      await chrome.storage.local.set({ authenticated_channels: authenticatedChannels });
      
      sendResponse({
        success: true,
        authenticated: false,
        reason: 'expired'
      });
      return;
    }
    
    console.log('BG: [AUTH] Valid authentication found for channel:', currentPageChannelId);
    console.log('BG: [AUTH] Subscription status:', channelAuth.hasSubscription);
    
    sendResponse({
      success: true,
      authenticated: true,
      email: channelAuth.email,
      channelId: channelAuth.channelId,
      channelName: channelAuth.channelName,
      hasSubscription: Boolean(channelAuth.hasSubscription)
    });
    
  } catch (error) {
    console.error('BG: [AUTH] Error checking auth status:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check authentication'
    });
  }
}

/**
 * Folder management handlers
 */
async function handleSaveFolders(request: any, sendResponse: any) {
  try {
    const { folders } = request;
    await chrome.storage.local.set({ folders });
    sendResponse({ success: true });
  } catch (error) {
    console.error('BG: Error saving folders:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save folders'
    });
  }
}

async function handleLoadFolders(sendResponse: any) {
  try {
    const result = await chrome.storage.local.get(['folders']);
    sendResponse({ 
      success: true, 
      folders: result.folders || [] 
    });
  } catch (error) {
    console.error('BG: Error loading folders:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to load folders'
    });
  }
}

/**
 * Usage tracking handlers
 */
async function handleRecordAIUsage(sendResponse: any) {
  try {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get(['aiUsage']);
    const usage = result.aiUsage || {};
    
    usage[today] = (usage[today] || 0) + 1;
    
    await chrome.storage.local.set({ aiUsage: usage });
    sendResponse({ success: true, dailyUsage: usage[today] });
  } catch (error) {
    console.error('BG: Error recording AI usage:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to record usage'
    });
  }
}

async function handleCheckUsageLimits(sendResponse: any) {
  try {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get(['aiUsage']);
    const usage = result.aiUsage || {};
    
    const dailyUsage = usage[today] || 0;
    const dailyLimit = 50; // Example limit
    
    sendResponse({ 
      success: true, 
      dailyUsage,
      dailyLimit,
      canUseAI: dailyUsage < dailyLimit
    });
  } catch (error) {
    console.error('BG: Error checking usage limits:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to check limits'
    });
  }
}

/**
 * Legacy subscription check handler
 */
async function handleSubscriptionCheck(sendResponse: any) {
  try {
    const authStatus = await new Promise<any>((resolve) => {
      checkAuthenticationStatus({}, resolve);
    });
    
    if (!authStatus.authenticated) {
      sendResponse({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }
    
    sendResponse({
      success: true,
      hasSubscription: authStatus.hasSubscription || false
    });
    
  } catch (error) {
    console.error('BG: Error checking subscription:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check subscription'
    });
  }
}

// Extension lifecycle
chrome.runtime.onStartup.addListener(() => {
  startKeepAlive();
});

chrome.runtime.onInstalled.addListener(() => {
  startKeepAlive();
});

chrome.runtime.onSuspend.addListener(() => {
  stopKeepAlive();
});

/**
 * OAuth Configuration Test
 * Simple test to verify Chrome identity API works with current config
 */
async function testOAuthConfiguration(sendResponse: any) {
  try {
    
    // Test getting token without interaction first (silent)
    const silentToken = await testGetToken(false);
    
    if (silentToken) {
      
      // Test getting user info with the token
      const userInfo = await testGetUserInfo(silentToken);
      
      sendResponse({
        success: true,
        hasToken: true,
        tokenLength: silentToken.length,
        userInfo: userInfo,
        extensionId: chrome.runtime.id
      });
      return;
    }
    
    const interactiveToken = await testGetToken(true);
    
    if (interactiveToken) {
      
      const userInfo = await testGetUserInfo(interactiveToken);
      
      sendResponse({
        success: true,
        hasToken: true,
        tokenLength: interactiveToken.length,
        userInfo: userInfo,
        extensionId: chrome.runtime.id
      });
    } else {
      console.error('BG: [OAUTH_TEST] ❌ Failed to get OAuth token');
      sendResponse({
        success: false,
        error: 'Failed to get OAuth token - check Google Cloud Console configuration',
        extensionId: chrome.runtime.id
      });
    }
    
  } catch (error) {
    console.error('BG: [OAUTH_TEST] ❌ OAuth test failed:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'OAuth test failed',
      extensionId: chrome.runtime.id
    });
  }
}

/**
 * Test token retrieval
 */
async function testGetToken(interactive: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({
      interactive: interactive
    }, (result) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else if (!result) {
        resolve(null);
      } else {
        const token = typeof result === 'string' ? result : result.token;
        if (token) {
          resolve(token);
        } else {
          resolve(null);
        }
      }
    });
  });
}

/**
 * Test getting user info with token
 */
async function testGetUserInfo(token: string): Promise<any> {
  try {
    
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      console.error('BG: [OAUTH_TEST] User info request failed:', response.status);
      return null;
    }
    
    const userInfo = await response.json();
    
    return {
      email: userInfo.email,
      verified_email: userInfo.verified_email,
      name: userInfo.name,
      picture: userInfo.picture
    };
    
  } catch (error) {
    console.error('BG: [OAUTH_TEST] Error getting user info:', error);
    return null;
  }
}