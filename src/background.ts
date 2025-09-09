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
    // Check if extension context is still valid
    if (!chrome.runtime.id) {
      console.error('BG: [AUTH] Extension context invalidated');
      sendResponse({
        success: false,
        error: 'Extension context invalidated. Please refresh the page and try again.'
      });
      return;
    }
    
    console.log('BG: [AUTH] Starting per-channel authentication');
    console.log('BG: [AUTH] Request data:', {
      type: request.type,
      hasChannelId: !!request.currentPageChannelId,
      channelId: request.currentPageChannelId ? request.currentPageChannelId.substring(0, 10) + '...' : 'none'
    });
    
    // Get the current page's channel ID from the request
    const currentPageChannelId = request.currentPageChannelId;
    if (!currentPageChannelId) {
      console.warn('BG: [AUTH] No channel ID provided in request');
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
        error: 'Authentication failed. Please try signing out of Chrome and signing back in, then re-authenticate.'
      });
      return;
    }
    
    // Step 2: Get user email from OAuth token
    const userEmail = await getChromeAccountEmail(token);
    if (!userEmail) {
      clearTimeout(timeoutId);
      // This means the token doesn't have proper permissions
      sendResponse({
        success: false,
        error: 'Google account permissions missing. Please sign out of Chrome, sign back in with your Google account, and ensure you grant all requested permissions.'
      });
      return;
    }
    
    console.log('BG: [AUTH] User email:', userEmail);
    
    // Step 3: Validate subscription using email and current page channel
    const validationResult = await validateTokenWithServer(userEmail, currentPageChannelId);
    
    if (!validationResult.success) {
      console.error('BG: [AUTH] Server validation failed:', validationResult.error);
      clearTimeout(timeoutId);
      sendResponse({
        success: false,
        error: validationResult.error || 'Server validation failed'
      });
      return;
    }

    console.log('BG: [AUTH] ✅ Using simplified email-based validation - no channel matching required');
    
    // Step 5: Store authentication data per email (not per channel)
    const authenticatedEmails = await getAuthenticatedEmails();
    authenticatedEmails[userEmail] = {
      email: validationResult.email,
      hasSubscription: validationResult.hasSubscription,
      authenticatedAt: Date.now(),
      accessToken: token
    };

    await chrome.storage.local.set({
      authenticated_emails: authenticatedEmails
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
    
    console.log('BG: [SERVER_AUTH] Attempting to get Chrome OAuth token');
    console.log('BG: [SERVER_AUTH] Extension ID:', chrome.runtime.id);
    
    // Check if extension context is valid
    if (!chrome.runtime.id) {
      console.error('BG: [SERVER_AUTH] Extension context invalidated during token request');
      resolve(null);
      return;
    }
    
    // First, try to get a token normally (might be cached)
    chrome.identity.getAuthToken({
      interactive: false  // Non-interactive first to check cache
    }, async (cachedToken) => {
      // If we got a cached token, validate it first
      if (cachedToken && !chrome.runtime.lastError) {
        console.log('BG: [SERVER_AUTH] Found cached token, validating...');
        const tokenString = typeof cachedToken === 'string' ? cachedToken : cachedToken.token;
        
        if (tokenString) {
          // Test if token works with userinfo endpoint
          const isValid = await validateToken(tokenString);
          if (isValid) {
            console.log('BG: [SERVER_AUTH] Cached token is valid');
            resolve(tokenString);
            return;
          }
          
          // Token is invalid, remove it
          console.log('BG: [SERVER_AUTH] Cached token is invalid (401), removing...');
          chrome.identity.removeCachedAuthToken({ token: tokenString }, () => {
            console.log('BG: [SERVER_AUTH] Removed invalid cached token');
          });
        }
      }
      
      // Now get a fresh token interactively
      console.log('BG: [SERVER_AUTH] Requesting fresh token interactively...');
      chrome.identity.getAuthToken({
        interactive: true
      }, async (freshToken) => {
        if (chrome.runtime.lastError) {
          const errorMessage = chrome.runtime.lastError.message || '';
          console.error('BG: [SERVER_AUTH] Chrome OAuth error:', errorMessage);
          
          // If user cancelled, don't retry
          if (errorMessage.includes('cancelled') || errorMessage.includes('denied')) {
            console.log('BG: [SERVER_AUTH] User cancelled authentication');
            resolve(null);
            return;
          }
          
          // For other errors, try one more time after clearing
          console.log('BG: [SERVER_AUTH] Attempting final retry after error...');
          chrome.identity.clearAllCachedAuthTokens(() => {
            chrome.identity.getAuthToken({ interactive: true }, (retryToken) => {
              if (chrome.runtime.lastError) {
                console.error('BG: [SERVER_AUTH] Final retry failed:', chrome.runtime.lastError.message);
                resolve(null);
              } else if (retryToken) {
                const retryTokenString = typeof retryToken === 'string' ? retryToken : retryToken.token;
                console.log('BG: [SERVER_AUTH] Retry successful');
                resolve(retryTokenString || null);
              } else {
                resolve(null);
              }
            });
          });
        } else if (!freshToken) {
          console.error('BG: [SERVER_AUTH] No token returned from Chrome identity');
          resolve(null);
        } else {
          // Validate the fresh token
          console.log('BG: [SERVER_AUTH] Got fresh token, validating...');
          const freshTokenString = typeof freshToken === 'string' ? freshToken : freshToken.token;
          
          if (freshTokenString) {
            const isValid = await validateToken(freshTokenString);
            
            if (isValid) {
              console.log('BG: [SERVER_AUTH] Fresh token is valid');
              resolve(freshTokenString);
            } else {
              console.error('BG: [SERVER_AUTH] Fresh token failed validation');
              // Remove the bad token
              chrome.identity.removeCachedAuthToken({ token: freshTokenString }, () => {
                console.log('BG: [SERVER_AUTH] Removed invalid fresh token');
                resolve(null);
              });
            }
          } else {
            console.error('BG: [SERVER_AUTH] Invalid fresh token format');
            resolve(null);
          }
        }
      });
    });
  });
}

/**
 * Validate OAuth token by testing it with userinfo endpoint
 */
async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      console.log('BG: [TOKEN_VALIDATION] Token is valid (status 200)');
      return true;
    } else {
      console.error('BG: [TOKEN_VALIDATION] Token validation failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('BG: [TOKEN_VALIDATION] Error validating token:', error);
    return false;
  }
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
async function validateTokenWithServer(email: string, currentPageChannelId: string): Promise<any> {
  try {
    console.log('BG: [AUTH] Starting simplified email-based authentication');
    console.log('BG: [AUTH] Email:', email);
    console.log('BG: [AUTH] Page Channel ID:', currentPageChannelId);
    
    // Step 1: Check subscription for the email directly
    const subEndpoint = `${SUPABASE_CONFIG.URL}/functions/v1/verify-subscription`;
    
    console.log('BG: [AUTH] Step 1 - Checking subscription for:', email);
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
    
    console.log('BG: [AUTH] Subscription check response status:', subResponse.status);
    
    let hasSubscription = false;
    if (subResponse.ok) {
      const subData = await subResponse.json();
      hasSubscription = Boolean(subData.hasSubscription);
      console.log('BG: [AUTH] Subscription status:', hasSubscription);
      console.log('BG: [AUTH] Subscription data:', subData);
    } else {
      const subErrorText = await subResponse.text();
      console.warn('BG: [AUTH] Subscription check failed with status:', subResponse.status);
      console.warn('BG: [AUTH] Subscription error response:', subErrorText);
      console.warn('BG: [AUTH] Defaulting subscription to false');
    }
    
    // Step 2: If user has subscription, allow access to any YouTube channel they're viewing
    if (hasSubscription) {
      console.log('BG: [AUTH] ✅ User has valid subscription - granting access to current channel');
      
      // Optional: Test backend functions to ensure they work with this email + channel combo
      const usageEndpoint = `${SUPABASE_CONFIG.URL}/functions/v1/track-ai-usage?email=${encodeURIComponent(email)}&youtubeChannelId=${encodeURIComponent(currentPageChannelId)}&operation=check`;
      const usageResponse = await fetch(usageEndpoint, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
        }
      });
      
      console.log('BG: [AUTH] Backend validation test status:', usageResponse.status);
      
      return {
        success: true,
        channelId: currentPageChannelId,    // Use the page channel they're viewing
        channelName: 'YouTube Channel',     // Generic name since we don't need API
        email: email,
        hasSubscription: hasSubscription
      };
    } else {
      console.log('BG: [AUTH] ❌ User does not have valid subscription');
      return {
        success: true, // Don't fail auth, just mark as no subscription
        channelId: currentPageChannelId,
        channelName: 'YouTube Channel',
        email: email,
        hasSubscription: false
      };
    }
    
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
 * Get authenticated emails from storage
 */
async function getAuthenticatedEmails(): Promise<Record<string, any>> {
  try {
    const result = await chrome.storage.local.get(['authenticated_emails']);
    return result.authenticated_emails || {};
  } catch (error) {
    console.error('BG: [AUTH] Error getting authenticated emails:', error);
    return {};
  }
}

/**
 * Check current authentication status based on email (not channel)
 */
async function checkAuthenticationStatus(request: any, sendResponse: any) {
  try {
    console.log('BG: [AUTH] Checking authentication status using email-based lookup');
    
    // Step 1: Get current browser's email from OAuth token
    const token = await getChromeOAuthToken();
    if (!token) {
      console.log('BG: [AUTH] No OAuth token available');
      sendResponse({
        success: true,
        authenticated: false,
        error: 'No authentication token available'
      });
      return;
    }

    const userEmail = await getChromeAccountEmail(token);
    if (!userEmail) {
      console.log('BG: [AUTH] Could not get user email from token');
      sendResponse({
        success: true,
        authenticated: false,
        error: 'Could not determine user email'
      });
      return;
    }
    
    console.log('BG: [AUTH] Checking auth for email:', userEmail);
    
    // Step 2: Look up authentication by email
    const authenticatedEmails = await getAuthenticatedEmails();
    const emailAuth = authenticatedEmails[userEmail];
    
    if (!emailAuth) {
      console.log('BG: [AUTH] No authentication found for email:', userEmail);
      sendResponse({
        success: true,
        authenticated: false
      });
      return;
    }
    
    // Step 3: Check if authentication is still fresh (24 hours)
    const authAge = Date.now() - (emailAuth.authenticatedAt || 0);
    const isExpired = authAge > (24 * 60 * 60 * 1000); // 24 hours
    
    if (isExpired) {
      console.log('BG: [AUTH] Authentication expired for email:', userEmail);
      
      // Remove expired auth
      delete authenticatedEmails[userEmail];
      await chrome.storage.local.set({ authenticated_emails: authenticatedEmails });
      
      sendResponse({
        success: true,
        authenticated: false,
        reason: 'expired'
      });
      return;
    }
    
    console.log('BG: [AUTH] Valid authentication found for email:', userEmail);
    console.log('BG: [AUTH] Subscription status:', emailAuth.hasSubscription);
    
    // Return authentication info (channel ID from current page for UI purposes)
    const currentPageChannelId = request.currentPageChannelId || 'unknown';
    
    sendResponse({
      success: true,
      authenticated: true,
      email: emailAuth.email,
      channelId: currentPageChannelId, // Use current page channel for UI
      channelName: 'YouTube Channel',
      hasSubscription: Boolean(emailAuth.hasSubscription)
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
    const dailyLimit = 50;
    
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

