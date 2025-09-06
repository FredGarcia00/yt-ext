/**
 * YouTube Account subscription service
 * Uses YouTube account detection for bulletproof account isolation
 */
import { YouTubeAccountDetector } from './youtube-account-detector';

export class SubscriptionService {
  /**
   * Get current YouTube account ID
   */
  static getCurrentAccount(): { success: boolean; accountId?: string; error?: string } {
    try {
      
      // Get current YouTube account (now synchronous)
      const accountId = YouTubeAccountDetector.getCurrentAccountId();
      
      if (accountId) {
        return { success: true, accountId };
      } else {
        console.error('FolderTube: [AccountDetector] Could not detect YouTube account');
        return { success: false, error: 'Could not detect current YouTube account' };
      }
      
    } catch (error) {
      console.error('FolderTube: [AccountDetector] Error getting account:', error);
      return { success: false, error: 'Failed to get YouTube account' };
    }
  }
  
  /**
   * Check if current YouTube account has active subscription
   */
  static async checkSubscription(): Promise<boolean> {
    try {
      
      // Get current YouTube account
      const accountResult = await this.getCurrentAccount();
      
      if (!accountResult.success || !accountResult.accountId) {
        return false;
      }
      
      const accountId = accountResult.accountId;
      
      // Get subscription email for this account (check multiple locations)
      const emailKey = `account_${accountId}_email`;
      const linkedChannelKey = `account_${accountId}_linkedChannelId`;
      const storageKeys = [emailKey, linkedChannelKey, 'authenticatedEmail', 'authenticatedChannelId'];
      const storageResult = await chrome.storage.local.get(storageKeys);
      
      // Try to find email in order of preference
      let subscriptionEmail = storageResult[emailKey];
      
      // If no account-specific email, check if we have a linked channel ID
      if (!subscriptionEmail && storageResult[linkedChannelKey]) {
        const channelEmailKey = `account_${storageResult[linkedChannelKey]}_email`;
        const channelResult = await chrome.storage.local.get([channelEmailKey]);
        subscriptionEmail = channelResult[channelEmailKey];
      }
      
      // Fallback to global authenticated email if available
      if (!subscriptionEmail && storageResult.authenticatedEmail) {
        subscriptionEmail = storageResult.authenticatedEmail;
        // Save it with the account key for next time
        await chrome.storage.local.set({ [emailKey]: subscriptionEmail });
      }
      
      if (!subscriptionEmail) {
        return false;
      }
      
      console.log('SUBSCRIPTION: Checking subscription for email:', subscriptionEmail);
      
      // Use background script for subscription verification (Chrome Store compliant)
      const response = await new Promise<{ hasSubscription: boolean }>((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'checkEmailSubscription',
          email: subscriptionEmail
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('SUBSCRIPTION: Background script error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        });
      });
      
      console.log('SUBSCRIPTION: Backend result:', response);
      return Boolean(response.hasSubscription);
      
    } catch (error) {
      console.error('FolderTube: [AccountDetector] Error checking subscription:', error);
      return false;
    }
  }
  
  /**
   * Save subscription email for current YouTube account
   */
  static async saveSubscriptionEmail(email: string): Promise<void> {
    // Get current YouTube account and associate the email with it
    const accountResult = await this.getCurrentAccount();
    
    if (!accountResult.success || !accountResult.accountId) {
      throw new Error('Could not detect current YouTube account to save subscription email');
    }
    
    // Save email for this account
    const emailKey = `account_${accountResult.accountId}_email`;
    await chrome.storage.local.set({ [emailKey]: email.toLowerCase() });
    
  }
  
  /**
   * Get subscription email for current YouTube account
   */
  static async getSubscriptionEmail(): Promise<string | null> {
    try {
      const accountResult = await this.getCurrentAccount();
      if (!accountResult.success || !accountResult.accountId) {
        return null;
      }
      
      // Get email for this account
      const emailKey = `account_${accountResult.accountId}_email`;
      const emailResult = await chrome.storage.local.get([emailKey]);
      return emailResult[emailKey] || null;
    } catch (error) {
      console.error('FolderTube: [AccountDetector] Error getting subscription email:', error);
      return null;
    }
  }
  
  /**
   * Get storage key for current YouTube account
   * Returns account-specific key if account is detected, otherwise anonymous
   */
  static getStorageKey(baseKey: string): string {
    try {
      // Try to get current account ID synchronously (fast path)
      const accountId = YouTubeAccountDetector.getCurrentAccountId();
      if (accountId) {
        return `${baseKey}_${accountId}`;
      }
    } catch (error) {
      console.warn('FolderTube: Could not get account ID for storage key:', error);
    }
    
    // Fallback to anonymous if no account detected yet
    return `${baseKey}_anonymous`;
  }

  /**
   * Get storage key based on YouTube account ID
   * Each YouTube account gets completely isolated storage
   * ONLY call this AFTER successful account detection
   */
  static async getAccountStorageKey(baseKey: string, accountId: string): Promise<string> {
    try {
      if (!accountId) {
        console.warn('FolderTube: No YouTube account ID provided for storage key');
        return this.getStorageKey(baseKey);
      }
      
      // Create storage key based on YouTube account ID
      return `${baseKey}_${accountId}`;
      
    } catch (error) {
      console.error('FolderTube: Error getting account storage key:', error);
      return this.getStorageKey(baseKey);
    }
  }
  
  /**
   * Migrate data from anonymous storage to authenticated account storage
   */
  static async migrateAnonymousData(accountId: string): Promise<void> {
    try {
      const anonymousKey = this.getStorageKey('folders');
      const authenticatedKey = await this.getAccountStorageKey('folders', accountId);
      
      if (anonymousKey === authenticatedKey) {
        return; // No migration needed
      }
      
      // Get data from anonymous storage
      const anonymousData = await chrome.storage.local.get([anonymousKey]);
      
      if (anonymousData[anonymousKey] && Array.isArray(anonymousData[anonymousKey]) && anonymousData[anonymousKey].length > 0) {
        
        // Get existing authenticated data
        const authenticatedData = await chrome.storage.local.get([authenticatedKey]);
        const existingFolders = authenticatedData[authenticatedKey] || [];
        
        // Merge data (authenticated data takes precedence)
        const mergedFolders = existingFolders.length > 0 ? existingFolders : anonymousData[anonymousKey];
        
        // Save to authenticated storage
        await chrome.storage.local.set({ [authenticatedKey]: mergedFolders });
        
        // Clean up anonymous storage
        await chrome.storage.local.remove([anonymousKey]);
        
      }
    } catch (error) {
      console.error('FolderTube: [AccountDetector] Error migrating anonymous data:', error);
    }
  }

  /**
   * Check if user has valid subscription (with YouTube account detection)
   * This is the main method components should use
   */
  static async requireSubscription(): Promise<{ hasSubscription: boolean; accountId?: string; email?: string; authenticatedStorageKey?: string; needsEmailSetup?: boolean }> {
    try {
      
      // Get current YouTube account
      const accountResult = await this.getCurrentAccount();
      
      if (!accountResult.success || !accountResult.accountId) {
        return { hasSubscription: false };
      }
      
      const accountId = accountResult.accountId;
      
      // Get subscription email for this account (check multiple locations)
      const emailKey = `account_${accountId}_email`;
      const linkedChannelKey = `account_${accountId}_linkedChannelId`;
      const storageKeys = [emailKey, linkedChannelKey, 'authenticatedEmail', 'authenticatedChannelId'];
      const storageResult = await chrome.storage.local.get(storageKeys);
      
      // Try to find email in order of preference
      let subscriptionEmail = storageResult[emailKey];
      
      // If no account-specific email, check if we have a linked channel ID
      if (!subscriptionEmail && storageResult[linkedChannelKey]) {
        const channelEmailKey = `account_${storageResult[linkedChannelKey]}_email`;
        const channelResult = await chrome.storage.local.get([channelEmailKey]);
        subscriptionEmail = channelResult[channelEmailKey];
      }
      
      // Fallback to global authenticated email if available
      if (!subscriptionEmail && storageResult.authenticatedEmail) {
        subscriptionEmail = storageResult.authenticatedEmail;
        // Save it with the account key for next time
        await chrome.storage.local.set({ [emailKey]: subscriptionEmail });
      }
      
      if (!subscriptionEmail) {
        return { 
          hasSubscription: false, 
          accountId,
          needsEmailSetup: true 
        };
      }
      
      // Check if this email has subscription
      const response = await new Promise<{ hasSubscription: boolean }>((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'checkEmailSubscription', 
          email: subscriptionEmail
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('FolderTube: [AccountDetector] Message error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        });
      });
      
      
      // If user has subscription, migrate anonymous data to their account
      if (response.hasSubscription) {
        await this.migrateAnonymousData(accountId);
        const authenticatedStorageKey = await this.getAccountStorageKey('folders', accountId);
        
        return {
          hasSubscription: true,
          accountId,
          email: subscriptionEmail,
          authenticatedStorageKey
        };
      }
      
      return {
        hasSubscription: false,
        accountId,
        email: subscriptionEmail
      };
      
    } catch (error) {
      console.error('FolderTube: [AccountDetector] Error in subscription requirement check:', error);
      return { hasSubscription: false };
    }
  }


}