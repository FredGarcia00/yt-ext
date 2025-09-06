/**
 * YouTube User Detector - Bulletproof current user identification
 * Detects the currently logged-in YouTube user to prevent account bleeding
 */

export class YouTubeUserDetector {
  /**
   * Get the current YouTube user identifier
   * Uses multiple methods for reliability
   */
  static getCurrentYouTubeUser(): string | null {
    try {
      console.log('🔍 FolderTube: [User Detector] Detecting current YouTube user...');
      
      // Method 1: Try to get user from account menu button
      const accountButton = document.querySelector('button[aria-label*="Account menu"]');
      if (accountButton) {
        const img = accountButton.querySelector('img');
        if (img && img.src) {
          // Extract user ID from avatar URL
          const avatarMatch = img.src.match(/\/([a-zA-Z0-9_-]+)\/photo/);
          if (avatarMatch) {
            const userId = avatarMatch[1];
            console.log('🔍 FolderTube: [User Detector] Found user via avatar:', userId);
            return userId;
          }
        }
      }

      // Method 2: Try to get user from page data
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        if (script.textContent?.includes('"VISITOR_DATA"')) {
          const visitorMatch = script.textContent.match(/"VISITOR_DATA":"([^"]+)"/);
          if (visitorMatch) {
            const visitorData = visitorMatch[1];
            console.log('🔍 FolderTube: [User Detector] Found user via visitor data:', visitorData);
            return visitorData;
          }
        }
      }

      // Method 3: Try to get user from channel links in DOM
      const channelLinks = document.querySelectorAll('a[href*="/channel/"]');
      for (const link of channelLinks) {
        const href = (link as HTMLAnchorElement).href;
        const channelMatch = href.match(/\/channel\/([a-zA-Z0-9_-]+)/);
        if (channelMatch && link.closest('[id*="avatar"]')) {
          const channelId = channelMatch[1];
          console.log('🔍 FolderTube: [User Detector] Found user via channel link:', channelId);
          return channelId;
        }
      }

      // Method 4: Try to get from URL if on channel page
      if (window.location.pathname.includes('/channel/')) {
        const urlMatch = window.location.pathname.match(/\/channel\/([a-zA-Z0-9_-]+)/);
        if (urlMatch) {
          const channelId = urlMatch[1];
          console.log('🔍 FolderTube: [User Detector] Found user via URL:', channelId);
          return channelId;
        }
      }

      // Method 5: Use page title or meta data as fallback
      const pageTitle = document.title;
      if (pageTitle && pageTitle !== 'YouTube') {
        const titleHash = this.generateHash(pageTitle);
        console.log('🔍 FolderTube: [User Detector] Using page title hash as fallback:', titleHash);
        return titleHash;
      }

      console.log('❌ FolderTube: [User Detector] Could not detect current YouTube user');
      return null;
      
    } catch (error) {
      console.error('❌ FolderTube: [User Detector] Error detecting user:', error);
      return null;
    }
  }

  /**
   * Generate a simple hash from a string (for fallback identification)
   */
  private static generateHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if YouTube user has changed from stored user
   */
  static async hasYouTubeUserChanged(storedUserId: string): Promise<boolean> {
    try {
      const currentUser = this.getCurrentYouTubeUser();
      
      if (!currentUser) {
        console.log('⚠️ FolderTube: [User Detector] Cannot detect current user - assuming change');
        return true;
      }

      const userChanged = currentUser !== storedUserId;
      console.log('🔍 FolderTube: [User Detector] User change check:', {
        stored: storedUserId,
        current: currentUser,
        changed: userChanged
      });

      return userChanged;
    } catch (error) {
      console.error('❌ FolderTube: [User Detector] Error checking user change:', error);
      return true; // Assume change on error for security
    }
  }

  /**
   * Wait for page to load and then detect user
   */
  static async waitForUserDetection(maxAttempts: number = 10): Promise<string | null> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔍 FolderTube: [User Detector] Detection attempt ${attempt}/${maxAttempts}`);
      
      const user = this.getCurrentYouTubeUser();
      if (user) {
        console.log('✅ FolderTube: [User Detector] Successfully detected user:', user);
        return user;
      }

      // Wait 500ms before next attempt
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('❌ FolderTube: [User Detector] Failed to detect user after all attempts');
    return null;
  }
}