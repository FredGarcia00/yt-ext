/**
 * Subscription Service - Web-Based Authentication
 * Now uses web-based authentication to prevent account bleeding
 */

export class SubscriptionService {
  /**
   * Check if current authenticated account has active subscription
   */
  static async checkSubscription(): Promise<boolean> {
    try {
      console.log('📊 [SUBSCRIPTION] Checking subscription status via web-based auth');
      
      // Get auth status from background script (which uses web-based auth)
      const authResult = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'checkAuthenticationStatus' },
          (response) => {
            if (chrome.runtime.lastError || !response) {
              console.error('📊 [SUBSCRIPTION] Error checking auth:', chrome.runtime.lastError);
              resolve({ success: false, authenticated: false });
              return;
            }
            resolve(response);
          }
        );
      });
      
      if (!authResult.success || !authResult.authenticated) {
        console.log('📊 [SUBSCRIPTION] Not authenticated, no subscription access');
        return false;
      }
      
      const hasSubscription = authResult.hasSubscription || false;
      console.log('📊 [SUBSCRIPTION] Subscription status:', hasSubscription);
      
      return hasSubscription;
      
    } catch (error) {
      console.error('📊 [SUBSCRIPTION] Error checking subscription:', error);
      return false;
    }
  }
  
  /**
   * Get current authenticated account email
   */
  static async getCurrentAccountEmail(): Promise<string | null> {
    try {
      console.log('📊 [SUBSCRIPTION] Getting current account email');
      
      const authResult = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'checkAuthenticationStatus' },
          (response) => {
            if (chrome.runtime.lastError || !response) {
              resolve({ success: false, authenticated: false });
              return;
            }
            resolve(response);
          }
        );
      });
      
      if (!authResult.success || !authResult.authenticated) {
        return null;
      }
      
      return authResult.email || null;
      
    } catch (error) {
      console.error('📊 [SUBSCRIPTION] Error getting account email:', error);
      return null;
    }
  }
  
  /**
   * Get current authenticated YouTube channel ID
   */
  static async getCurrentChannelId(): Promise<string | null> {
    try {
      console.log('📊 [SUBSCRIPTION] Getting current channel ID');
      
      const authResult = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'checkAuthenticationStatus' },
          (response) => {
            if (chrome.runtime.lastError || !response) {
              resolve({ success: false, authenticated: false });
              return;
            }
            resolve(response);
          }
        );
      });
      
      if (!authResult.success || !authResult.authenticated) {
        return null;
      }
      
      return authResult.channelId || null;
      
    } catch (error) {
      console.error('📊 [SUBSCRIPTION] Error getting channel ID:', error);
      return null;
    }
  }

  /**
   * Check authentication status
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const authResult = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'checkAuthenticationStatus' },
          (response) => {
            if (chrome.runtime.lastError || !response) {
              resolve({ success: false, authenticated: false });
              return;
            }
            resolve(response);
          }
        );
      });
      
      return authResult.success && authResult.authenticated;
      
    } catch (error) {
      console.error('📊 [SUBSCRIPTION] Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Account bleeding is prevented by web-based auth architecture
   */
  static getCurrentAccount(): { success: boolean; accountId?: string; error?: string } {
    console.warn('📊 [SUBSCRIPTION] getCurrentAccount is deprecated - use web-based auth methods');
    return { success: false, error: 'Method deprecated - use web-based authentication' };
  }

  /**
   * Get storage key for data
   * @deprecated Use web-based auth storage instead
   */
  static getStorageKey(dataType: string): string {
    console.warn('📊 [SUBSCRIPTION] getStorageKey is deprecated - use web-based auth storage');
    return `web_auth_${dataType}`;
  }

  /**
   * Get account-specific storage key
   * @deprecated Account bleeding is prevented by web-based auth architecture
   */
  static async getAccountStorageKey(dataType: string, accountId: string): Promise<string> {
    console.warn('📊 [SUBSCRIPTION] getAccountStorageKey is deprecated - use web-based auth storage');
    return `web_auth_${dataType}_${accountId}`;
  }
}