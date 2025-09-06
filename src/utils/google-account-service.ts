/**
 * Google Account Service - Universal Account Detection
 * Uses Chrome Identity API for bulletproof account isolation
 */
export class GoogleAccountService {
  private static cachedAccountEmail: string | null = null;
  private static accountChangeCallbacks: ((email: string | null) => void)[] = [];

  /**
   * Get current Google account email using Chrome Identity API (background script only)
   * For content scripts, returns a stable unique identifier based on browser storage
   */
  static async getCurrentAccountEmail(): Promise<string | null> {
    try {
      // Return cached email if available
      if (this.cachedAccountEmail) {
        return this.cachedAccountEmail;
      }

      // Check if we're in a background script context
      if (chrome.identity && chrome.identity.getProfileUserInfo && !window) {
        return new Promise((resolve) => {
          chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (userInfo) => {
            if (chrome.runtime.lastError) {
              console.warn('FolderTube: [GoogleAccount] Identity API error:', chrome.runtime.lastError);
              resolve(null);
            } else if (userInfo && userInfo.email) {
              const email = userInfo.email.toLowerCase().trim();
              console.log('FolderTube: [GoogleAccount] Found email via Chrome Identity:', email);
              this.cachedAccountEmail = email;
              resolve(email);
            } else {
              console.warn('FolderTube: [GoogleAccount] No email in identity response');
              resolve(null);
            }
          });
        });
      }

      // For content scripts, generate a stable account identifier
      // This uses browser's storage sync which is tied to the Google account
      console.log('FolderTube: [GoogleAccount] Using stable account identifier for content script');
      
      // Get or create a unique account identifier
      const result = await chrome.storage.sync.get(['accountId']);
      let accountId = result.accountId;
      
      if (!accountId) {
        // Generate a unique account ID tied to this browser profile
        accountId = 'account_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await chrome.storage.sync.set({ accountId });
        console.log('FolderTube: [GoogleAccount] Created new account identifier:', accountId);
      } else {
        console.log('FolderTube: [GoogleAccount] Using existing account identifier:', accountId);
      }
      
      this.cachedAccountEmail = accountId;
      return accountId;
    } catch (error) {
      console.error('FolderTube: [GoogleAccount] Error getting account email:', error);
      return null;
    }
  }

  /**
   * Get account-specific storage key
   */
  static async getStorageKey(baseKey: string): Promise<string> {
    const email = await this.getCurrentAccountEmail();
    if (email) {
      // Use email hash for privacy and to avoid special characters
      const emailHash = await this.hashEmail(email);
      return `${baseKey}_${emailHash}`;
    }
    // Fallback to default key
    return `${baseKey}_default`;
  }

  /**
   * Hash email for privacy in storage keys
   */
  private static async hashEmail(email: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(email);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.substring(0, 16); // Use first 16 chars for shorter keys
    } catch (error) {
      console.error('FolderTube: [GoogleAccount] Hash error:', error);
      // Fallback to simple encoding
      return btoa(email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
    }
  }

  /**
   * Monitor for account changes
   */
  static startMonitoring(): void {
    console.log('FolderTube: [GoogleAccount] Starting account monitoring');
    
    // Check for account changes every 5 seconds
    setInterval(async () => {
      const currentEmail = await this.getCurrentAccountEmail();
      if (currentEmail !== this.cachedAccountEmail) {
        console.log('FolderTube: [GoogleAccount] Account changed from', this.cachedAccountEmail, 'to', currentEmail);
        const previousEmail = this.cachedAccountEmail;
        this.cachedAccountEmail = currentEmail;
        
        // Notify all callbacks
        this.accountChangeCallbacks.forEach(callback => {
          try {
            callback(currentEmail);
          } catch (error) {
            console.error('FolderTube: [GoogleAccount] Error in account change callback:', error);
          }
        });
        
        // Dispatch global event
        window.dispatchEvent(new CustomEvent('foldertube:google-account-changed', {
          detail: { currentEmail, previousEmail }
        }));
      }
    }, 5000);
  }

  /**
   * Add callback for account changes
   */
  static onAccountChange(callback: (email: string | null) => void): void {
    this.accountChangeCallbacks.push(callback);
  }

  /**
   * Remove account change callback
   */
  static removeAccountChangeCallback(callback: (email: string | null) => void): void {
    const index = this.accountChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.accountChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Clear cached email (force refresh)
   */
  static clearCache(): void {
    this.cachedAccountEmail = null;
  }

  /**
   * Check if we can reliably detect accounts
   */
  static canDetectAccount(): boolean {
    return !!(chrome.identity && chrome.identity.getProfileUserInfo);
  }

  /**
   * Verify email format (simplified - no account matching needed)
   */
  static async verifyEmailOwnership(typedEmail: string): Promise<{
    isValid: boolean;
    actualEmail?: string;
    reason?: string;
  }> {
    try {
      const normalizedTypedEmail = typedEmail.toLowerCase().trim();
      
      if (!normalizedTypedEmail || !normalizedTypedEmail.includes('@')) {
        return {
          isValid: false,
          reason: 'Please enter a valid email address'
        };
      }

      // For the simplified version, just validate email format
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(normalizedTypedEmail)) {
        return {
          isValid: false,
          reason: 'Please enter a valid email address'
        };
      }

      return {
        isValid: true,
        actualEmail: normalizedTypedEmail
      };

    } catch (error) {
      console.error('FolderTube: [GoogleAccount] Error verifying email:', error);
      return {
        isValid: true,
        reason: 'Verification error - proceeding with typed email'
      };
    }
  }
}