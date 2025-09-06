/**
 * YouTube Authentication Service - Chrome Store Compliant
 * Handles OAuth flow entirely in background script for security
 */
export class YouTubeAuthService {
  private static readonly SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  /**
   * Authenticate user and get YouTube channel information
   * This method should only be called from background script
   */
  static async authenticateAndGetChannel(): Promise<{
    success: boolean;
    channelId?: string;
    channelName?: string;
    channelHandle?: string;
    email?: string;
    error?: string;
  }> {
    try {
      // Check if we're in background script context
      if (typeof window !== 'undefined') {
        throw new Error('OAuth must be performed in background script only');
      }

      console.log('FolderTube: Starting YouTube OAuth flow...');

      // Get OAuth token using Chrome Identity API
      const token = await new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken(
          {
            interactive: true,
            scopes: this.SCOPES
          },
          (token) => {
            if (chrome.runtime.lastError) {
              console.error('FolderTube: OAuth error:', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message || 'OAuth failed'));
              return;
            }
            if (!token) {
              reject(new Error('No OAuth token received'));
              return;
            }
            resolve(token as string);
          }
        );
      });

      console.log('FolderTube: OAuth token received');

      // Get user email first
      const userInfo = await this.getUserInfo(token);
      if (!userInfo.email) {
        throw new Error('Unable to get user email');
      }

      // Get YouTube channel information
      const channelInfo = await this.getYouTubeChannelInfo(token);

      console.log('FolderTube: Successfully authenticated YouTube channel:', channelInfo);

      return {
        success: true,
        channelId: channelInfo.id,
        channelName: channelInfo.snippet?.title,
        channelHandle: channelInfo.snippet?.customUrl,
        email: userInfo.email
      };

    } catch (error) {
      console.error('FolderTube: Authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Get user profile information
   */
  private static async getUserInfo(token: string): Promise<{ email: string }> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status} ${response.statusText}`);
    }

    const userInfo = await response.json();
    return {
      email: userInfo.email
    };
  }

  /**
   * Get YouTube channel information for the authenticated user
   */
  private static async getYouTubeChannelInfo(token: string): Promise<any> {
    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouTube API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      throw new Error('No YouTube channel found for this account');
    }

    return data.items[0];
  }

  /**
   * Store channel authentication securely in Supabase
   */
  static async storeChannelAuthentication(authData: {
    email: string;
    channelId: string;
    channelName: string;
    channelHandle?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('FolderTube: Storing channel authentication for:', authData.email);

      // Send to background script to handle Supabase communication
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'storeChannelAuth',
          authData
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        });
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to store authentication');
      }

      console.log('FolderTube: Channel authentication stored successfully');
      return { success: true };

    } catch (error) {
      console.error('FolderTube: Error storing channel authentication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Storage failed'
      };
    }
  }

  /**
   * Get stored authentication for current session
   */
  static async getStoredAuthentication(): Promise<{
    success: boolean;
    channelId?: string;
    channelName?: string;
    email?: string;
    error?: string;
  }> {
    try {
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'getStoredAuth'
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        });
      });

      return response;

    } catch (error) {
      console.error('FolderTube: Error getting stored authentication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get authentication'
      };
    }
  }

  /**
   * Clear authentication (logout)
   */
  static async clearAuthentication(): Promise<void> {
    try {
      // Clear OAuth token from Chrome
      await new Promise<void>((resolve) => {
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
          if (token) {
            chrome.identity.removeCachedAuthToken({ token: token as string }, () => {
              if (chrome.runtime.lastError) {
                console.warn('FolderTube: Error clearing token:', chrome.runtime.lastError);
              }
              resolve();
            });
          } else {
            resolve();
          }
        });
      });

      // Clear stored authentication
      await new Promise<void>((resolve) => {
        chrome.runtime.sendMessage({
          type: 'clearStoredAuth'
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('FolderTube: Error clearing stored auth:', chrome.runtime.lastError);
          }
          resolve();
        });
      });

      console.log('FolderTube: Authentication cleared');

    } catch (error) {
      console.error('FolderTube: Error clearing authentication:', error);
    }
  }

  /**
   * Check if user is currently authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const auth = await this.getStoredAuthentication();
    return auth.success && !!auth.channelId;
  }
}