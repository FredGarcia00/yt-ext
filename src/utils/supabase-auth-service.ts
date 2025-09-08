/**
 * Supabase Authentication Service - Web-Based Authentication
 * Now uses web-based authentication instead of Chrome identity to prevent account bleeding
 */

export class SupabaseAuthService {
  /**
   * Get current authentication status from the new web-based auth system
   */
  static async getCurrentAuth(): Promise<any> {
    try {
      console.log('🔒 [WEB_AUTH] Checking current authentication status');
      
      // Get auth status from background script (which uses web-based auth)
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'checkAuthenticationStatus' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('🔒 [WEB_AUTH] Chrome runtime error:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
              return;
            }
            
            if (!response) {
              console.error('🔒 [WEB_AUTH] No response from background script');
              resolve({ success: false, authenticated: false });
              return;
            }
            
            console.log('🔒 [WEB_AUTH] Auth status received:', response);
            resolve(response);
          }
        );
      });
      
    } catch (error) {
      console.error('🔒 [WEB_AUTH] Error checking auth status:', error);
      return { success: false, authenticated: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Trigger web-based authentication
   */
  static async authenticateUser(): Promise<any> {
    try {
      console.log('🔒 [WEB_AUTH] Starting web-based authentication');
      
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'handleAIAuthentication' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('🔒 [WEB_AUTH] Chrome runtime error:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
              return;
            }
            
            if (!response) {
              console.error('🔒 [WEB_AUTH] No response from background script');
              reject(new Error('No response from background script'));
              return;
            }
            
            console.log('🔒 [WEB_AUTH] Authentication result:', response);
            resolve(response);
          }
        );
      });
      
    } catch (error) {
      console.error('🔒 [WEB_AUTH] Error during authentication:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Clear authentication (logout)
   */
  static async clearAuth(): Promise<void> {
    try {
      console.log('🔒 [WEB_AUTH] Clearing authentication');
      
      // Clear stored auth data
      if (chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove([
          'authenticatedEmail',
          'authenticatedChannelId',
          'authenticatedChannelName',
          'authenticatedAt',
          'hasSubscription',
          'accessToken'
        ]);
      }
      
      // Notify listeners that auth was cleared
      window.dispatchEvent(new CustomEvent('foldertube-auth-cleared', { 
        detail: { reason: 'manual-logout' } 
      }));
      
    } catch (error) {
      console.error('🔒 [WEB_AUTH] Error clearing auth:', error);
    }
  }

  /**
   * Check if user has active subscription
   */
  static async checkSubscription(): Promise<boolean> {
    try {
      const authStatus = await this.getCurrentAuth();
      
      if (!authStatus.success || !authStatus.authenticated) {
        return false;
      }
      
      return authStatus.hasSubscription || false;
      
    } catch (error) {
      console.error('🔒 [WEB_AUTH] Error checking subscription:', error);
      return false;
    }
  }

  /**
   * Get authenticated user email
   */
  static async getAuthenticatedEmail(): Promise<string | null> {
    try {
      const authStatus = await this.getCurrentAuth();
      
      if (!authStatus.success || !authStatus.authenticated) {
        return null;
      }
      
      return authStatus.email || null;
      
    } catch (error) {
      console.error('🔒 [WEB_AUTH] Error getting authenticated email:', error);
      return null;
    }
  }

  /**
   * Get authenticated YouTube channel ID
   */
  static async getAuthenticatedChannelId(): Promise<string | null> {
    try {
      const authStatus = await this.getCurrentAuth();
      
      if (!authStatus.success || !authStatus.authenticated) {
        return null;
      }
      
      return authStatus.channelId || null;
      
    } catch (error) {
      console.error('🔒 [WEB_AUTH] Error getting authenticated channel ID:', error);
      return null;
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use getCurrentAuth() instead
   */
  static async authenticateYouTubeChannel(_email: string, _channelId: string, _channelName: string): Promise<any> {
    console.warn('🔒 [WEB_AUTH] authenticateYouTubeChannel is deprecated, use web-based auth instead');
    return this.authenticateUser();
  }

  /**
   * Clear account-specific authentication
   * @deprecated Account bleeding is now prevented by web-based auth
   */
  static async clearAccountAuth(): Promise<void> {
    console.log('🔒 [WEB_AUTH] clearAccountAuth called - delegating to clearAuth');
    return this.clearAuth();
  }

  /**
   * Start account change monitoring
   * @deprecated Account bleeding is now prevented by web-based auth architecture
   */
  static startAccountChangeMonitoring(): void {
    console.log('🔒 [WEB_AUTH] Account change monitoring not needed with web-based auth');
    // No-op - web-based auth prevents account bleeding by design
  }

  /**
   * Authenticate user (alias for authenticateUser)
   * @deprecated Use authenticateUser() instead
   */
  static async authenticate(): Promise<any> {
    console.warn('🔒 [WEB_AUTH] authenticate is deprecated, use authenticateUser instead');
    return this.authenticateUser();
  }

  /**
   * Save folders via background script
   */
  static async saveFolders(folders: any[], options?: any): Promise<any> {
    try {
      console.log('🔒 [WEB_AUTH] Saving folders via background script');
      
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'saveFolders', folders, options },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('🔒 [WEB_AUTH] Error saving folders:', chrome.runtime.lastError);
              resolve({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            
            console.log('🔒 [WEB_AUTH] Folders saved successfully');
            resolve(response || { success: true });
          }
        );
      });
      
    } catch (error) {
      console.error('🔒 [WEB_AUTH] Error saving folders:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Load folders via background script
   */
  static async loadFolders(): Promise<any> {
    try {
      console.log('🔒 [WEB_AUTH] Loading folders via background script');
      
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'loadFolders' },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('🔒 [WEB_AUTH] Error loading folders:', chrome.runtime.lastError);
              resolve({ success: false, error: chrome.runtime.lastError.message });
              return;
            }
            
            console.log('🔒 [WEB_AUTH] Folders loaded successfully');
            resolve(response || { success: true, folders: [] });
          }
        );
      });
      
    } catch (error) {
      console.error('🔒 [WEB_AUTH] Error loading folders:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}