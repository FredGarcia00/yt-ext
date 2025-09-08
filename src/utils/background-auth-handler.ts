/**
 * Background-Safe Authentication Handler
 * Handles OAuth flow and subscription verification without DOM dependencies
 */

import { CookieSessionService } from './cookie-session-service';

const SUPABASE_URL = 'https://eqwcmgtfprcixhcjxskf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxd2NtZ3RmcHJjaXhoY2p4c2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNjU5NzcsImV4cCI6MjA2OTc0MTk3N30.5se8kIl8_uYeHzyTgD6A3DsiS91cEXDYJ_ejBcPoXN4';

export class BackgroundAuthHandler {
  private static subscriptionCache = new Map<string, { hasSubscription: boolean; timestamp: number }>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Handle authentication request from content script
   */
  static async handleAuthentication(): Promise<{
    success: boolean;
    error?: string;
    needsAuth?: boolean;
  }> {
    try {
      console.log('🚀 BackgroundAuth: Starting authentication flow');
      console.log('🔍 BackgroundAuth: Checking for existing session...');
      
      // Check if we already have a valid session
      const existingSession = await CookieSessionService.getCurrentSession();
      console.log('📋 BackgroundAuth: Existing session check:', {
        hasSession: !!existingSession,
        hasSubscription: existingSession?.hasSubscription,
        email: existingSession?.email?.substring(0, 10) + '...' || 'None',
        expiresAt: existingSession?.expiresAt ? new Date(existingSession.expiresAt).toLocaleString() : 'None'
      });
      
      if (existingSession && existingSession.hasSubscription) {
        console.log('✅ BackgroundAuth: Valid session exists - authentication successful');
        return { success: true };
      }
      
      // Need to authenticate
      if (!existingSession) {
        console.log('🔐 BackgroundAuth: No session found, starting OAuth flow...');
        
        // Get OAuth token using Chrome Identity API
        console.log('🎫 BackgroundAuth: Requesting OAuth token...');
        const token = await this.getOAuthToken();
        if (!token) {
          console.error('❌ BackgroundAuth: OAuth token request failed');
          return { 
            success: false, 
            error: 'Failed to get authentication token',
            needsAuth: true 
          };
        }
        console.log('✅ BackgroundAuth: OAuth token received successfully');
        
        // Get user info and subscription status via Supabase backend
        const userInfo = await this.getUserInfo(token);
        if (!userInfo) {
          return { 
            success: false, 
            error: 'Failed to authenticate with server',
            needsAuth: true 
          };
        }
        
        // Subscription status already included in server response
        const hasSubscription = userInfo.hasSubscription;
        console.log('🔒 BackgroundAuth: Subscription verified via Supabase:', hasSubscription);
        
        // Create session
        const sessionResult = await CookieSessionService.createSession({
          token: token,
          email: userInfo.email,
          channelId: userInfo.channelId,
          channelName: userInfo.channelName,
          hasSubscription: hasSubscription
        });
        
        if (!sessionResult.success) {
          return { 
            success: false, 
            error: sessionResult.error || 'Failed to create session' 
          };
        }
        
        if (!hasSubscription) {
          return { 
            success: false, 
            error: 'Subscription required to use AI features',
            needsAuth: false 
          };
        }
        
        return { success: true };
      }
      
      // Have session but no subscription
      if (!existingSession.hasSubscription) {
        console.log('🔄 BackgroundAuth: Session exists but no subscription - rechecking...');
        
        // Re-check subscription via Supabase in case they just subscribed
        const hasSubscription = await this.checkSubscription(existingSession.email);
        
        if (hasSubscription) {
          console.log('✅ BackgroundAuth: Subscription found - updating session');
          // Update session with subscription
          await CookieSessionService.createSession({
            ...existingSession,
            hasSubscription: true
          });
          return { success: true };
        }
        
        console.log('❌ BackgroundAuth: No subscription found');
        return { 
          success: false, 
          error: 'Subscription required to use AI features',
          needsAuth: false 
        };
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('BackgroundAuth: Authentication error:', error);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }
  
  /**
   * Get OAuth token using Chrome Identity API
   */
  private static async getOAuthToken(): Promise<string | null> {
    return new Promise((resolve) => {
      console.log('🔍 BackgroundAuth: Checking for cached OAuth token...');
      
      // First, try to get cached token
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          console.log('📝 BackgroundAuth: No cached token, requesting interactive authentication...');
          console.log('🚪 BackgroundAuth: Opening OAuth consent screen...');
          
          // No cached token, request interactively - using exact working pattern from background.ts line 563
          chrome.identity.getAuthToken({ 
            interactive: true, 
            scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/userinfo.email']
          }, (newToken) => {
            if (chrome.runtime.lastError || !newToken) {
              console.error('❌ BackgroundAuth: Interactive OAuth failed:', chrome.runtime.lastError?.message || 'Unknown error');
              console.error('❌ BackgroundAuth: Full error details:', JSON.stringify(chrome.runtime.lastError, null, 2));
              resolve(null);
            } else {
              console.log('✅ BackgroundAuth: Interactive OAuth successful');
              resolve(newToken as string);
            }
          });
        } else {
          console.log('✅ BackgroundAuth: Using cached OAuth token');
          resolve(token as string);
        }
      });
    });
  }
  
  /**
   * Get user info using working pattern from background.ts
   */
  private static async getUserInfo(token: string): Promise<{
    email: string;
    channelId: string;
    channelName: string;
    hasSubscription: boolean;
  } | null> {
    try {
      console.log('🔄 BackgroundAuth: Getting user info using working background.ts pattern...');
      
      // Step 1: Get user email using working pattern from background.ts line 927
      console.log('📧 BackgroundAuth: Requesting user email from Google...');
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!userResponse.ok) {
        console.error('❌ BackgroundAuth: Email API failed:', userResponse.status, userResponse.statusText);
        throw new Error(`Failed to get user email: ${userResponse.status} ${userResponse.statusText}`);
      }
      
      const userInfo = await userResponse.json();
      const email = userInfo.email;
      console.log('✅ BackgroundAuth: Email obtained:', email?.substring(0, 10) + '...');
      
      // Step 2: Get YouTube channel info using working pattern from background.ts line 911  
      console.log('📺 BackgroundAuth: Requesting YouTube channel info...');
      const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=AIzaSyBwFhz2sJg6nYPnBlgAI1nxhB1VdYpWmUk', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!channelResponse.ok) {
        console.error('❌ BackgroundAuth: YouTube API failed:', channelResponse.status, channelResponse.statusText);
        const errorText = await channelResponse.text();
        console.error('❌ BackgroundAuth: YouTube API error details:', errorText);
        throw new Error(`Failed to get YouTube channel: ${channelResponse.status} ${channelResponse.statusText}`);
      }
      
      const channelData = await channelResponse.json();
      
      if (!channelData.items || channelData.items.length === 0) {
        console.error('❌ BackgroundAuth: No YouTube channel found');
        throw new Error('No YouTube channel found - please ensure you have a YouTube channel');
      }
      
      const channel = channelData.items[0];
      const channelId = channel.id;
      const channelName = channel.snippet.title;
      console.log('✅ BackgroundAuth: YouTube channel found:', channelName);
      
      // Step 3: Call existing authenticate-youtube-channel Supabase function
      console.log('🔐 BackgroundAuth: Authenticating with existing Supabase function...');
      const authResponse = await fetch(`${SUPABASE_URL}/functions/v1/authenticate-youtube-channel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          youtubeChannelId: channelId,
          channelName,
          accessToken: token
        })
      });
      
      if (!authResponse.ok) {
        console.error('❌ BackgroundAuth: Supabase auth failed:', authResponse.status);
        throw new Error('Failed to authenticate with backend');
      }
      
      const authData = await authResponse.json();
      if (!authData.success) {
        console.error('❌ BackgroundAuth: Supabase auth returned failure:', authData.error);
        throw new Error(authData.error || 'Backend authentication failed');
      }
      
      // Step 4: Check subscription using existing verify-subscription function
      console.log('💳 BackgroundAuth: Checking subscription status...');
      const subResponse = await fetch(`${SUPABASE_URL}/functions/v1/verify-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      let hasSubscription = false;
      if (subResponse.ok) {
        const subData = await subResponse.json();
        hasSubscription = Boolean(subData.hasSubscription);
        console.log('✅ BackgroundAuth: Subscription check complete:', hasSubscription);
      } else {
        console.warn('⚠️ BackgroundAuth: Subscription check failed, assuming no subscription');
      }
      
      return {
        email,
        channelId,
        channelName,
        hasSubscription
      };
      
    } catch (error) {
      console.error('❌ BackgroundAuth: Error during authentication:', error);
      if (error instanceof Error) {
        console.error('❌ BackgroundAuth: Error details:', error.message);
      }
      return null;
    }
  }
  
  /**
   * Check subscription status with Supabase
   */
  static async checkSubscription(email: string): Promise<boolean> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check cache first
      const cached = this.subscriptionCache.get(normalizedEmail);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log('BackgroundAuth: Using cached subscription status');
        return cached.hasSubscription;
      }
      
      // Make API call to check subscription
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: normalizedEmail })
      });
      
      if (!response.ok) {
        console.error('BackgroundAuth: Subscription check failed:', response.status);
        return false;
      }
      
      const result = await response.json();
      const hasSubscription = Boolean(result.hasSubscription);
      
      // Cache the result
      this.subscriptionCache.set(normalizedEmail, {
        hasSubscription,
        timestamp: Date.now()
      });
      
      console.log('BackgroundAuth: Subscription status:', hasSubscription);
      return hasSubscription;
      
    } catch (error) {
      console.error('BackgroundAuth: Error checking subscription:', error);
      return false;
    }
  }
  
  /**
   * Clear all authentication data
   */
  static async clearAuthentication(): Promise<void> {
    try {
      // Clear session
      await CookieSessionService.clearSession();
      
      // Clear OAuth token
      await new Promise<void>((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (token) {
            chrome.identity.removeCachedAuthToken({ token: token as string }, () => {
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
      
      // Clear subscription cache
      this.subscriptionCache.clear();
      
      // Clear storage
      await chrome.storage.local.remove([
        'authenticatedEmail',
        'authenticatedChannelId',
        'authenticatedChannelName'
      ]);
      
      console.log('BackgroundAuth: Authentication cleared');
      
    } catch (error) {
      console.error('BackgroundAuth: Error clearing authentication:', error);
    }
  }
  
  /**
   * Quick check if user needs to authenticate
   */
  static async needsAuthentication(): Promise<boolean> {
    const session = await CookieSessionService.getCurrentSession();
    return !session || !session.hasSubscription;
  }
}