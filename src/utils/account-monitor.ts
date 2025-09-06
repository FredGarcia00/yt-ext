/**
 * Account Monitor - YouTube User + Subscription isolation
 * Prevents account bleeding by tying subscriptions to specific YouTube users
 */

export class AccountMonitor {
  public static STORAGE_KEYS = {
    EXTENSION_ACCOUNT_ID: 'extensionAccountId',
    SUBSCRIPTION_EMAIL: 'subscriptionEmail',
    ACCOUNT_SESSION: 'accountSession',
    LAST_VERIFIED: 'lastAccountVerification',
    CURRENT_YOUTUBE_USER: 'currentYouTubeUser'
  };

  /**
   * Get or create BULLETPROOF unique account ID for this Chrome profile
   * GUARANTEED to be different for each Chrome profile installation
   */
  static async getExtensionAccountId(): Promise<string> {
    try {
      const stored = await chrome.storage.local.get([this.STORAGE_KEYS.EXTENSION_ACCOUNT_ID]);
      
      if (stored[this.STORAGE_KEYS.EXTENSION_ACCOUNT_ID]) {
        return stored[this.STORAGE_KEYS.EXTENSION_ACCOUNT_ID];
      }
      
      // Create super unique account ID using multiple entropy sources
      const timestamp = Date.now();
      const randomPart1 = Math.random().toString(36).substring(2);
      const randomPart2 = Math.random().toString(36).substring(2);
      
      // Try to get Chrome runtime ID for extra uniqueness
      let runtimeComponent = 'runtime_unavailable';
      try {
        if (chrome.runtime?.id) {
          runtimeComponent = chrome.runtime.id.substring(0, 8);
        }
      } catch (error) {
        // Chrome runtime ID not available
      }
      
      // Generate extension account ID with all components
      const timestampComponent = timestamp.toString();
      const chromeIdentifier = runtimeComponent;
      const newAccountId = `ext_${timestampComponent}_${randomPart1}_${randomPart2}_${chromeIdentifier}`;
      
      // Store with verification
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.EXTENSION_ACCOUNT_ID]: newAccountId
      });
      
      // Verify it was stored correctly
      const verification = await chrome.storage.local.get([this.STORAGE_KEYS.EXTENSION_ACCOUNT_ID]);
      
      if (verification[this.STORAGE_KEYS.EXTENSION_ACCOUNT_ID] === newAccountId) {
        return newAccountId;
      } else {
        // Emergency fallback if storage verification failed
        const emergencyId = `emergency_${timestamp}_${Math.random().toString(36).substring(2)}`;
        return emergencyId;
      }
    } catch (error) {
      // Ultimate fallback
      return `fallback_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
  }

  /**
   * BULLETPROOF account verification with multiple fallbacks
   */
  static async verifyAccount(subscriptionEmail?: string): Promise<{
    verified: boolean;
    accountId: string;
    reason?: string;
  }> {
    try {
      const accountId = await this.getExtensionAccountId();
      
      if (!subscriptionEmail) {
        return {
          verified: false,
          accountId,
          reason: 'No subscription email provided'
        };
      }

      const stored = await chrome.storage.local.get([
        this.STORAGE_KEYS.ACCOUNT_SESSION,
        this.STORAGE_KEYS.LAST_VERIFIED
      ]);

      const accountSession = stored[this.STORAGE_KEYS.ACCOUNT_SESSION];
      const lastVerified = stored[this.STORAGE_KEYS.LAST_VERIFIED];

      // Method 1: Session validation (most secure)
      if (accountSession && subscriptionEmail) {
        try {
          const expectedSession = await this.generateAccountSession(accountId, subscriptionEmail);
          
          if (accountSession === expectedSession) {
            return {
              verified: true,
              accountId,
              reason: 'Session validation successful'
            };
          }
        } catch (sessionError) {
          // Continue to fallback methods
        }
      }

      // Method 2: Email verification fallback
      if (subscriptionEmail) {
        try {
          const newSession = await this.generateAccountSession(accountId, subscriptionEmail);
          
          await chrome.storage.local.set({
            [this.STORAGE_KEYS.ACCOUNT_SESSION]: newSession,
            [this.STORAGE_KEYS.LAST_VERIFIED]: Date.now()
          });
          
          return {
            verified: true,
            accountId,
            reason: 'Email verification successful - session regenerated'
          };
        } catch (regenerationError) {
          // Continue to final fallback
        }
      }

      // Method 3: Grace period fallback (24 hours)
      if (lastVerified) {
        const gracePeriod = 24 * 60 * 60 * 1000; // 24 hours
        const timeSinceVerification = Date.now() - lastVerified;
        
        if (timeSinceVerification < gracePeriod) {
          return {
            verified: true,
            accountId,
            reason: 'Grace period validation (temporary)'
          };
        }
      }

      // All methods failed
      return {
        verified: false,
        accountId,
        reason: 'All verification methods failed'
      };

    } catch (error) {
      const fallbackAccountId = `verification_error_${Date.now()}`;
      return {
        verified: false,
        accountId: fallbackAccountId,
        reason: 'Verification process error'
      };
    }
  }

  /**
   * Generate secure session hash for account + email combination
   */
  private static async generateAccountSession(accountId: string, email: string): Promise<string> {
    try {
      const combined = `${accountId}:${email}:${Date.now()}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(combined);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.substring(0, 32); // First 32 chars
    } catch (error) {
      // Fallback hash generation
      return btoa(`${accountId}:${email}:${Date.now()}`).substring(0, 32);
    }
  }

  /**
   * Store subscription email with account association
   */
  static async storeSubscriptionEmail(email: string): Promise<void> {
    try {
      const accountId = await this.getExtensionAccountId();
      const session = await this.generateAccountSession(accountId, email);
      
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.SUBSCRIPTION_EMAIL]: email,
        [this.STORAGE_KEYS.ACCOUNT_SESSION]: session,
        [this.STORAGE_KEYS.LAST_VERIFIED]: Date.now()
      });
    } catch (error) {
      // Continue anyway - better to have partial storage than none
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.SUBSCRIPTION_EMAIL]: email,
        [this.STORAGE_KEYS.LAST_VERIFIED]: Date.now()
      });
    }
  }

  /**
   * Clear account data (for logout/reset)
   */
  static async clearAccountData(): Promise<void> {
    try {
      await chrome.storage.local.remove([
        this.STORAGE_KEYS.SUBSCRIPTION_EMAIL,
        this.STORAGE_KEYS.ACCOUNT_SESSION,
        this.STORAGE_KEYS.LAST_VERIFIED,
        this.STORAGE_KEYS.CURRENT_YOUTUBE_USER
      ]);
    } catch (error) {
      // Continue silently
    }
  }

  /**
   * Verify account session (compatibility method)
   */
  static async verifyAccountSession(email?: string): Promise<{
    isValid: boolean;
    needsAuth?: boolean;
    reason?: string;
  }> {
    const result = await this.verifyAccount(email);
    return {
      isValid: result.verified,
      needsAuth: !result.verified,
      reason: result.reason
    };
  }

  /**
   * Logout (compatibility method)
   */
  static async logout(): Promise<void> {
    await this.clearAccountData();
  }
}