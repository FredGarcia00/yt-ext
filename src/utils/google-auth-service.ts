/**
 * Google Authentication Service
 * Handles Google OAuth verification to prevent subscription sharing
 */

export class GoogleAuthService {
  private static CACHE_KEY = 'googleAccountCache';
  private static CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Get the current Google account email
   * Uses Chrome Identity API to get the actual logged-in Google account
   */
  static async getCurrentGoogleEmail(): Promise<string | null> {
    try {
      // Check cache first
      const cached = await this.getCachedGoogleEmail();
      if (cached) {
        console.log('FolderTube: Using cached Google email');
        return cached;
      }

      // Get Google account info using Chrome Identity API with OAuth token
      return new Promise((resolve) => {
        // First try getProfileUserInfo
        chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (userInfo) => {
          if (chrome.runtime.lastError) {
            console.error('FolderTube: getProfileUserInfo error:', chrome.runtime.lastError);
            // Fallback to OAuth token method
            this.getEmailViaOAuth().then(resolve).catch(() => resolve(null));
            return;
          }

          if (userInfo && userInfo.email) {
            console.log('FolderTube: Got Google account email via profile:', userInfo.email);
            // Cache the email
            this.cacheGoogleEmail(userInfo.email);
            resolve(userInfo.email);
          } else {
            console.log('FolderTube: No email from profile, trying OAuth...');
            // Fallback to OAuth token method
            this.getEmailViaOAuth().then(resolve).catch(() => resolve(null));
          }
        });
      });
    } catch (error) {
      console.error('FolderTube: Error getting Google email:', error);
      return null;
    }
  }

  /**
   * Verify that the subscription email matches the Google account
   */
  static async verifySubscriptionOwnership(subscriptionEmail: string): Promise<{
    isValid: boolean;
    googleEmail: string | null;
    message: string;
  }> {
    try {
      console.log('🔍 FolderTube: [GoogleAuth] Starting verification for:', subscriptionEmail);
      
      const googleEmail = await this.getCurrentGoogleEmail();
      console.log('🔍 FolderTube: [GoogleAuth] Retrieved Google email:', googleEmail);
      
      if (!googleEmail) {
        console.warn('⚠️ FolderTube: [GoogleAuth] No Google email available');
        return {
          isValid: false,
          googleEmail: null,
          message: 'Could not verify Google account. Please ensure you are signed into Chrome.'
        };
      }

      // Normalize emails for comparison (lowercase, trim)
      const normalizedGoogle = googleEmail.toLowerCase().trim();
      const normalizedSubscription = subscriptionEmail.toLowerCase().trim();
      
      console.log('🔍 FolderTube: [GoogleAuth] Normalized Google:', normalizedGoogle);
      console.log('🔍 FolderTube: [GoogleAuth] Normalized Subscription:', normalizedSubscription);

      if (normalizedGoogle !== normalizedSubscription) {
        console.warn('❌ FolderTube: [GoogleAuth] EMAIL MISMATCH DETECTED!');
        console.log('❌ FolderTube: [GoogleAuth] Google account:', normalizedGoogle);
        console.log('❌ FolderTube: [GoogleAuth] Subscription email:', normalizedSubscription);
        
        return {
          isValid: false,
          googleEmail,
          message: `This subscription belongs to ${subscriptionEmail}. You are signed in as ${googleEmail}.`
        };
      }

      console.log('✅ FolderTube: [GoogleAuth] VERIFICATION SUCCESS for:', googleEmail);
      return {
        isValid: true,
        googleEmail,
        message: 'Subscription verified successfully'
      };
    } catch (error) {
      console.error('💥 FolderTube: [GoogleAuth] Verification error:', error);
      return {
        isValid: false,
        googleEmail: null,
        message: 'Error verifying subscription. Please try again.'
      };
    }
  }

  /**
   * Cache Google email to reduce API calls
   */
  private static async cacheGoogleEmail(email: string): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.CACHE_KEY]: {
          email,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('FolderTube: Error caching Google email:', error);
    }
  }

  /**
   * Get cached Google email if still valid
   */
  private static async getCachedGoogleEmail(): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get([this.CACHE_KEY]);
      const cached = result[this.CACHE_KEY];
      
      if (cached && cached.email && cached.timestamp) {
        const age = Date.now() - cached.timestamp;
        if (age < this.CACHE_DURATION) {
          return cached.email;
        }
      }
      
      return null;
    } catch (error) {
      console.error('FolderTube: Error getting cached Google email:', error);
      return null;
    }
  }

  /**
   * Clear cached Google email
   */
  static async clearCache(): Promise<void> {
    try {
      await chrome.storage.local.remove([this.CACHE_KEY]);
      console.log('FolderTube: Cleared Google email cache');
    } catch (error) {
      console.error('FolderTube: Error clearing Google email cache:', error);
    }
  }

  /**
   * Get email via OAuth token (fallback method)
   */
  private static async getEmailViaOAuth(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          console.log('FolderTube: No OAuth token available');
          resolve(null);
          return;
        }

        // Use the token to get user info from Google API
        fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`)
          .then(response => response.json())
          .then(data => {
            if (data && data.email) {
              console.log('FolderTube: Got Google email via OAuth:', data.email);
              this.cacheGoogleEmail(data.email);
              resolve(data.email);
            } else {
              console.log('FolderTube: No email in OAuth response');
              resolve(null);
            }
          })
          .catch(error => {
            console.error('FolderTube: OAuth API error:', error);
            resolve(null);
          });
      });
    });
  }

  /**
   * Check if user is signed into Chrome/Google
   */
  static async isSignedIntoGoogle(): Promise<boolean> {
    try {
      const email = await this.getCurrentGoogleEmail();
      return !!email;
    } catch (error) {
      console.error('FolderTube: Error checking Google sign-in status:', error);
      return false;
    }
  }
}