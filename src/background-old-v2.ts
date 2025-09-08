// FolderTube Background Script - YouTube Direct Authentication
// COMPLETE REWRITE: No Chrome OAuth dependencies

// Import required services
import { SupabaseBackend } from './utils/supabase-backend';

// YouTube API Configuration
const YOUTUBE_API_KEY = 'AIzaSyBwFhz2sJg6nYPnBlgAI1nxhB1VdYpWmUk';

// Cache for subscription status (5 minute TTL)
const subscriptionCache = new Map<string, { hasSubscription: boolean; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Message listener - handles all extension communication
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('BG: Message received:', request.type);
  
  // YouTube Direct Authentication
  if (request.type === 'handleAIAuthentication') {
    console.log('BG: Handling YouTube authentication');
    handleYouTubeAuthentication(sendResponse);
    return true;
  }
  
  if (request.type === 'processYouTubeAuth') {
    console.log('BG: Processing YouTube auth data');
    processYouTubeAuth(request.authData, sendResponse);
    return true;
  }
  
  if (request.type === 'checkAuthenticationStatus') {
    console.log('BG: Checking authentication status');
    checkYouTubeAuthStatus(sendResponse);
    return true;
  }
  
  // Account management
  if (request.type === 'getCurrentYouTubeAccount') {
    console.log('BG: Getting current YouTube account');
    getCurrentYouTubeAccount(sendResponse);
    return true;
  }
  
  if (request.type === 'switchYouTubeAccount') {
    console.log('BG: Switching YouTube account');
    switchYouTubeAccount(request.channelId, sendResponse);
    return true;
  }
  
  if (request.type === 'clearAuthentication') {
    console.log('BG: Clearing authentication');
    clearYouTubeAuthentication(sendResponse);
    return true;
  }
  
  // Folder management
  if (request.type === 'saveFolders') {
    console.log('BG: Saving folders');
    handleSaveFolders(request, sendResponse);
    return true;
  }
  
  if (request.type === 'loadFolders') {
    console.log('BG: Loading folders');
    handleLoadFolders(sendResponse);
    return true;
  }
  
  // Usage tracking
  if (request.type === 'incrementAIUsage') {
    console.log('BG: Recording AI usage');
    handleRecordAIUsage(request, sendResponse);
    return true;
  }
  
  if (request.type === 'checkUsageLimits') {
    console.log('BG: Checking usage limits');
    handleCheckUsageLimits(sendResponse);
    return true;
  }
  
  // Legacy handlers for backward compatibility
  if (request.type === 'checkSubscription') {
    console.log('BG: Checking subscription (legacy)');
    handleSubscriptionCheck(request, sendResponse);
    return true;
  }
  
  return false;
});

// NEW: YouTube Direct Authentication - No Chrome OAuth
async function handleYouTubeAuthentication(sendResponse: any) {
  try {
    console.log('BG: [YOUTUBE_AUTH] Starting YouTube-specific authentication');
    
    // Get active YouTube tab
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.url?.includes('youtube.com')) {
      sendResponse({
        success: false,
        error: 'Please authenticate while on YouTube.com'
      });
      return;
    }

    // Send message to content script to initiate YouTube authentication
    chrome.tabs.sendMessage(activeTab.id!, {
      type: 'requestYouTubeAuthentication'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('BG: [YOUTUBE_AUTH] Content script error:', chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: 'Failed to communicate with YouTube page'
        });
        return;
      }
      
      if (!response || !response.success) {
        console.error('BG: [YOUTUBE_AUTH] Authentication failed:', response?.error);
        sendResponse({
          success: false,
          error: response?.error || 'YouTube authentication failed'
        });
        return;
      }
      
      // Process the YouTube authentication data
      processYouTubeAuth(response.authData, sendResponse);
    });
  } catch (error) {
    console.error('BG: [YOUTUBE_AUTH] Authentication error:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// NEW: Process YouTube page-based authentication data
async function processYouTubeAuth(authData: any, sendResponse: any) {
  if (!authData || !authData.accountId) {
    sendResponse({ success: false, error: 'Invalid authentication data provided' });
    return;
  }
  
  try {
    console.log('BG: [YOUTUBE_AUTH] Processing page-based YouTube authentication for account:', authData.accountId);
    
    // Extract meaningful identifiers from the auth data
    let channelId = null;
    let email = authData.email || null;
    
    // Try to extract channel ID from authData
    if (authData.authInfo) {
      if (authData.authInfo.channelId) {
        channelId = authData.authInfo.channelId;
      }
    }
    
    // If we have a channel ID, try to get more info from YouTube API
    if (channelId) {
      try {
        const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`);
        
        if (channelResponse.ok) {
          const channelData = await channelResponse.json();
          if (channelData.items && channelData.items.length > 0) {
            const channel = channelData.items[0];
            console.log('BG: [YOUTUBE_AUTH] Validated YouTube channel:', channel.snippet.title);
          }
        }
      } catch (apiError) {
        console.warn('BG: [YOUTUBE_AUTH] Could not validate channel via API:', apiError);
        // Continue with page-based auth even if API fails
      }
    }
    
    // If no email found, try to use a placeholder based on account ID
    if (!email) {
      email = `user_${authData.accountId}@youtube.local`;
      console.log('BG: [YOUTUBE_AUTH] No email found, using placeholder:', email);
    }
    
    // SECURITY: Clear authentication for other accounts
    await clearOtherAccountAuth(authData.accountId);
    
    // Use Supabase backend to authenticate the YouTube account
    try {
      console.log('BG: [YOUTUBE_AUTH] Authenticating with Supabase backend');
      
      // For page-based auth, we'll use the account ID and available info
      const authResult = await SupabaseBackend.authenticateYouTubeChannel(
        email,
        channelId || authData.accountId,
        channelId ? 'YouTube Channel' : `Account ${authData.accountId}`,
        'page_auth_token' // Placeholder token for page-based auth
      );
      
      if (!authResult.success) {
        console.log('BG: [YOUTUBE_AUTH] Backend authentication failed');
        sendResponse({
          success: false,
          error: authResult.error || 'Authentication failed'
        });
        return;
      }

      console.log('BG: [YOUTUBE_AUTH] Backend authentication successful');

      // Store YouTube-specific authentication (account-keyed)
      const authStorageKey = `youtube_auth_${authData.accountId}`;
      await chrome.storage.local.set({
        [authStorageKey]: {
          email: email,
          accountId: authData.accountId,
          channelId: channelId,
          authInfo: authData.authInfo,
          authenticated: true,
          timestamp: Date.now(),
          hasSubscription: authResult.hasSubscription || false
        },
        // Keep current account reference for quick access
        currentYouTubeAccount: authData.accountId,
        currentYouTubeEmail: email
      });

      console.log('BG: [YOUTUBE_AUTH] Stored page-based authentication for account:', authData.accountId);
      
      // Update subscription cache
      subscriptionCache.set(email.toLowerCase().trim(), {
        hasSubscription: authResult.hasSubscription || false,
        timestamp: Date.now()
      });

      sendResponse({
        success: true,
        email: email,
        accountId: authData.accountId,
        channelId: channelId,
        hasSubscription: authResult.hasSubscription || false
      });

    } catch (backendError) {
      console.error('BG: [YOUTUBE_AUTH] Backend authentication error:', backendError);
      sendResponse({
        success: false,
        error: 'Unable to verify subscription. Please try again.'
      });
      return;
    }
    
  } catch (error) {
    console.error('BG: [YOUTUBE_AUTH] Authentication error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// NEW: Check YouTube authentication status
async function checkYouTubeAuthStatus(sendResponse: any) {
  try {
    console.log('BG: [YOUTUBE_AUTH] Checking authentication status');
    
    // Get current account from storage
    const storage = await chrome.storage.local.get(['currentYouTubeAccount']);
    const currentAccountId = storage.currentYouTubeAccount;
    
    if (!currentAccountId) {
      console.log('BG: [YOUTUBE_AUTH] No current account found');
      sendResponse({
        success: false,
        authenticated: false,
        hasSubscription: false
      });
      return;
    }
    
    // Get authentication data for current account
    const authStorageKey = `youtube_auth_${currentAccountId}`;
    const authStorage = await chrome.storage.local.get([authStorageKey]);
    const authData = authStorage[authStorageKey];
    
    if (!authData || !authData.authenticated) {
      console.log('BG: [YOUTUBE_AUTH] No valid authentication found for account:', currentAccountId);
      sendResponse({
        success: false,
        authenticated: false,
        hasSubscription: false
      });
      return;
    }
    
    // Check if authentication is still valid (24 hour expiry)
    const authAge = Date.now() - authData.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (authAge > maxAge) {
      console.log('BG: [YOUTUBE_AUTH] Authentication expired for account:', currentAccountId);
      await chrome.storage.local.remove([authStorageKey]);
      sendResponse({
        success: false,
        authenticated: false,
        hasSubscription: false
      });
      return;
    }
    
    console.log('BG: [YOUTUBE_AUTH] Valid authentication found');
    sendResponse({
      success: true,
      authenticated: true,
      hasSubscription: authData.hasSubscription || false,
      email: authData.email,
      accountId: authData.accountId,
      channelId: authData.channelId
    });
    
  } catch (error) {
    console.error('BG: [YOUTUBE_AUTH] Status check error:', error);
    sendResponse({
      success: false,
      authenticated: false,
      hasSubscription: false,
      error: (error as Error).message
    });
  }
}

// NEW: Get current YouTube account
async function getCurrentYouTubeAccount(sendResponse: any) {
  try {
    const storage = await chrome.storage.local.get(['currentYouTubeChannel', 'currentYouTubeEmail']);
    
    if (!storage.currentYouTubeChannel) {
      sendResponse({ channelId: null, email: null });
      return;
    }
    
    sendResponse({
      channelId: storage.currentYouTubeChannel,
      email: storage.currentYouTubeEmail
    });
    
  } catch (error) {
    console.error('BG: [YOUTUBE_AUTH] Error getting current account:', error);
    sendResponse({ channelId: null, email: null });
  }
}

// NEW: Switch YouTube account
async function switchYouTubeAccount(channelId: string, sendResponse: any) {
  try {
    console.log('BG: [YOUTUBE_AUTH] Switching to channel:', channelId);
    
    // Check if we have authentication for this channel
    const authStorageKey = `youtube_auth_${channelId}`;
    const authStorage = await chrome.storage.local.get([authStorageKey]);
    const authData = authStorage[authStorageKey];
    
    if (!authData || !authData.authenticated) {
      sendResponse({
        success: false,
        error: 'No authentication found for this YouTube account'
      });
      return;
    }
    
    // Update current channel reference
    await chrome.storage.local.set({
      currentYouTubeChannel: channelId,
      currentYouTubeEmail: authData.email
    });
    
    console.log('BG: [YOUTUBE_AUTH] Successfully switched to channel:', channelId);
    sendResponse({
      success: true,
      channelId: authData.channelId,
      email: authData.email,
      channelName: authData.channelName,
      hasSubscription: authData.hasSubscription
    });
    
  } catch (error) {
    console.error('BG: [YOUTUBE_AUTH] Account switch error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// NEW: Clear authentication for other accounts
async function clearOtherAccountAuth(keepAccountId: string) {
  try {
    const allStorage = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(allStorage).filter(key => 
      key.startsWith('youtube_auth_') && 
      key !== `youtube_auth_${keepAccountId}`
    );
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log('BG: [YOUTUBE_AUTH] Cleared authentication for', keysToRemove.length, 'other accounts');
    }
  } catch (error) {
    console.error('BG: [YOUTUBE_AUTH] Error clearing other auth:', error);
  }
}

// NEW: Clear all YouTube authentication
async function clearYouTubeAuthentication(sendResponse: any) {
  try {
    console.log('BG: [YOUTUBE_AUTH] Clearing all authentication');
    
    const allStorage = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(allStorage).filter(key => 
      key.startsWith('youtube_auth_') ||
      key === 'currentYouTubeAccount' ||
      key === 'currentYouTubeEmail'
    );
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log('BG: [YOUTUBE_AUTH] Cleared all authentication data');
    }
    
    // Clear subscription cache
    subscriptionCache.clear();
    
    sendResponse({ success: true });
    
  } catch (error) {
    console.error('BG: [YOUTUBE_AUTH] Clear auth error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Folder management handlers
async function handleSaveFolders(request: any, sendResponse: any) {
  try {
    console.log('BG: [FOLDERS] Saving folders');
    
    const currentAuth = await getCurrentAuthenticatedChannel();
    if (!currentAuth) {
      sendResponse({
        success: false,
        error: 'Authentication required to save folders'
      });
      return;
    }
    
    // Save each folder using Supabase backend
    const results = [];
    for (const folder of request.folders) {
      const result = await SupabaseBackend.saveFolder(
        folder.name,
        folder.channelIds,
        {
          id: folder.id,
          createdAt: folder.createdAt
        }
      );
      results.push(result);
    }
    
    const allSuccessful = results.every(r => r.success);
    
    sendResponse({
      success: allSuccessful,
      results: results
    });
    
  } catch (error) {
    console.error('BG: [FOLDERS] Save error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

async function handleLoadFolders(sendResponse: any) {
  try {
    console.log('BG: [FOLDERS] Loading folders');
    
    const currentAuth = await getCurrentAuthenticatedChannel();
    if (!currentAuth) {
      sendResponse({
        success: false,
        error: 'Authentication required to load folders'
      });
      return;
    }
    
    const folders = await SupabaseBackend.getFolders();
    
    sendResponse({
      success: true,
      folders: folders
    });
    
  } catch (error) {
    console.error('BG: [FOLDERS] Load error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

// Usage tracking handlers
async function handleRecordAIUsage(_request: any, sendResponse: any) {
  try {
    console.log('BG: [USAGE] Recording AI usage');
    
    const result = await SupabaseBackend.recordAIUsage();
    sendResponse(result);
    
  } catch (error) {
    console.error('BG: [USAGE] Record error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message
    });
  }
}

async function handleCheckUsageLimits(sendResponse: any) {
  try {
    console.log('BG: [USAGE] Checking usage limits');
    
    const result = await SupabaseBackend.checkUsageLimits();
    sendResponse(result);
    
  } catch (error) {
    console.error('BG: [USAGE] Check error:', error);
    sendResponse({
      hasSubscription: false,
      canUseAI: false,
      error: (error as Error).message
    });
  }
}

// Legacy subscription check handler
async function handleSubscriptionCheck(request: any, sendResponse: any) {
  try {
    const email = request.email;
    console.log('BG: [LEGACY] Checking subscription for email');
    
    if (!email) {
      sendResponse({ hasSubscription: false });
      return;
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check cache first
    const cached = subscriptionCache.get(normalizedEmail);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('BG: [LEGACY] Using cached subscription status');
      sendResponse({ hasSubscription: cached.hasSubscription });
      return;
    }
    
    // Check via Supabase backend
    const result = await SupabaseBackend.checkSubscription(email);
    
    const hasSubscription = Boolean(result.hasSubscription);
    
    // Cache the result
    subscriptionCache.set(normalizedEmail, {
      hasSubscription,
      timestamp: Date.now()
    });
    
    sendResponse({ hasSubscription });
    
  } catch (error) {
    console.error('BG: [LEGACY] Subscription check error:', error);
    sendResponse({ hasSubscription: false });
  }
}

// Helper function to get current authenticated channel
async function getCurrentAuthenticatedChannel() {
  try {
    const storage = await chrome.storage.local.get(['currentYouTubeAccount']);
    const currentAccountId = storage.currentYouTubeAccount;
    
    if (!currentAccountId) {
      return null;
    }
    
    const authStorageKey = `youtube_auth_${currentAccountId}`;
    const authStorage = await chrome.storage.local.get([authStorageKey]);
    const authData = authStorage[authStorageKey];
    
    if (!authData || !authData.authenticated) {
      return null;
    }
    
    return {
      email: authData.email,
      accountId: authData.accountId,
      channelId: authData.channelId,
      hasSubscription: authData.hasSubscription
    };
  } catch (error) {
    console.error('BG: [AUTH] Error getting current account:', error);
    return null;
  }
}

console.log('BG: FolderTube Background Script loaded with YouTube Direct Authentication');