/**
 * YouTube Account Detector
 * Detects the current YouTube account using URL and cookie monitoring
 * Avoids fragile DOM parsing in favor of reliable browser APIs
 */
export class YouTubeAccountDetector {
  private static currentAccountId: string | null = null;
  private static currentChannelId: string | null = null;
  private static accountChangeCallbacks: ((accountId: string | null) => void)[] = [];
  private static isMonitoring = false;
  private static cookieCheckInterval: number | null = null;

  /**
   * Get current YouTube channel ID (CRITICAL for preventing account bleeding)
   * This detects the actual channel that's currently active, not just the session
   */
  static getCurrentChannelId(): string | null {
    try {
      console.log('🔍 [CHANNEL DETECT] Starting current YouTube channel detection...');
      
      // Method 1: Check URL for channel context (most reliable)
      const urlChannelId = this.getChannelIdFromUrl();
      if (urlChannelId) {
        console.log('🔍 [CHANNEL DETECT] Found channel in URL:', urlChannelId.substring(0, 15) + '...');
        this.currentChannelId = urlChannelId;
        return urlChannelId;
      }
      
      // Method 2: Check page content for channel indicators
      const pageChannelId = this.getChannelIdFromPage();
      if (pageChannelId) {
        console.log('🔍 [CHANNEL DETECT] Found channel in page:', pageChannelId.substring(0, 15) + '...');
        this.currentChannelId = pageChannelId;
        return pageChannelId;
      }
      
      // Method 3: Check stored/cached channel
      if (this.currentChannelId) {
        console.log('🔍 [CHANNEL DETECT] Using cached channel:', this.currentChannelId.substring(0, 15) + '...');
        return this.currentChannelId;
      }
      
      console.log('🔍 [CHANNEL DETECT] ❌ Could not detect current YouTube channel');
      return null;
      
    } catch (error) {
      console.error('🔍 [CHANNEL DETECT] Error detecting channel:', error);
      return null;
    }
  }

  /**
   * Get current YouTube account identifier using reliable methods
   * Priority: URL authuser -> Cookie SAPISID -> Channel detection
   */
  static getCurrentAccountId(): string | null {
    try {
      // Method 1: Check URL authuser parameter (most reliable for account switching)
      const authUser = this.getAuthUserFromUrl();
      if (authUser !== null) {
        const accountId = `authuser_${authUser}`;
        return accountId;
      }

      // Method 2: Use cookie-based detection (persistent)
      const cookieAccount = this.getAccountFromCookies();
      if (cookieAccount) {
        return cookieAccount;
      }

      // Method 3: Enhanced Chrome API detection (run async in background)
      this.tryEnhancedDetection(); // Run async in background

      // Method 4: Fallback to basic URL-based detection
      const urlAccount = this.getAccountFromUrlParams();
      if (urlAccount) {
        return urlAccount;
      }

      console.warn('FolderTube: [AccountDetector] Could not detect YouTube account');
      return null;

    } catch (error) {
      console.error('FolderTube: [AccountDetector] Error detecting account:', error);
      return null;
    }
  }

  /**
   * Get authuser parameter from URL (primary method for account switching)
   */
  private static getAuthUserFromUrl(): number | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const authUser = urlParams.get('authuser');
      if (authUser !== null && !isNaN(Number(authUser))) {
        return Number(authUser);
      }
      return null;
    } catch (error) {
      console.error('FolderTube: [AccountDetector] Error getting authuser from URL:', error);
      return null;
    }
  }

  /**
   * Get account identifier from YouTube cookies (reliable method)
   */
  private static getAccountFromCookies(): string | null {
    try {
      const cookies = document.cookie;
      
      // Check for SAPISID cookie (most reliable for YouTube account identification)
      if (cookies.includes('SAPISID=')) {
        const sapisidMatch = cookies.match(/SAPISID=([^;]+)/);
        if (sapisidMatch && sapisidMatch[1]) {
          const sapisid = sapisidMatch[1];
          const hash = this.simpleHash(sapisid);
          return `sapisid_${hash}`;
        }
      }

      // Fallback: Check for HSID cookie
      if (cookies.includes('HSID=')) {
        const hsidMatch = cookies.match(/HSID=([^;]+)/);
        if (hsidMatch && hsidMatch[1]) {
          const hsid = hsidMatch[1];
          const hash = this.simpleHash(hsid);
          return `hsid_${hash}`;
        }
      }

      return null;
    } catch (error) {
      console.error('FolderTube: [AccountDetector] Error getting account from cookies:', error);
      return null;
    }
  }

  /**
   * Enhanced account detection using Chrome API (async background method)
   */
  private static async tryEnhancedDetection(): Promise<void> {
    try {
      const account = await this.getAccountFromChromeAPI();
      if (account) {
        // Update cached account if we found one
        if (account !== this.currentAccountId) {
          this.currentAccountId = account;
          // Notify callbacks of the enhanced detection
          this.accountChangeCallbacks.forEach(callback => {
            try {
              callback(account);
            } catch (error) {
              console.error('FolderTube: [AccountDetector] Error in enhanced detection callback:', error);
            }
          });
        }
      } else {
      }
    } catch (error) {
      console.error('FolderTube: [AccountDetector] Enhanced detection error:', error);
    }
  }

  /**
   * Get account identifier using Chrome API cookie access (more reliable method)
   */
  private static async getAccountFromChromeAPI(): Promise<string | null> {
    try {
      if (typeof chrome === 'undefined' || !chrome.cookies) {
        console.warn('FolderTube: [AccountDetector] Chrome API not available in this context');
        return null;
      }


      // Try to get SAPISID cookie via Chrome API
      const sapisidCookie = await new Promise<chrome.cookies.Cookie | null>((resolve) => {
        chrome.cookies.get({
          url: 'https://www.youtube.com',
          name: 'SAPISID'
        }, (cookie) => {
          if (chrome.runtime.lastError) {
            console.warn('FolderTube: [AccountDetector] Chrome API SAPISID error:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(cookie);
          }
        });
      });

      if (sapisidCookie && sapisidCookie.value) {
        const hash = this.simpleHash(sapisidCookie.value);
        return `chromeapi_sapisid_${hash}`;
      }

      // Fallback: Try HSID via Chrome API  
      const hsidCookie = await new Promise<chrome.cookies.Cookie | null>((resolve) => {
        chrome.cookies.get({
          url: 'https://www.youtube.com',
          name: 'HSID'
        }, (cookie) => {
          if (chrome.runtime.lastError) {
            console.warn('FolderTube: [AccountDetector] Chrome API HSID error:', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve(cookie);
          }
        });
      });

      if (hsidCookie && hsidCookie.value) {
        const hash = this.simpleHash(hsidCookie.value);
        return `chromeapi_hsid_${hash}`;
      }

      console.warn('FolderTube: [AccountDetector] Chrome API could not find usable cookies');
      return null;

    } catch (error) {
      console.error('FolderTube: [AccountDetector] Error with Chrome API cookie access:', error);
      return null;
    }
  }

  /**
   * Get account identifier from URL parameters (fallback method)
   */
  private static getAccountFromUrlParams(): string | null {
    try {
      const url = window.location.href;
      
      // Check for user-specific patterns in YouTube URLs
      if (url.includes('/channel/')) {
        const channelMatch = url.match(/\/channel\/([^?\/]+)/);
        if (channelMatch && channelMatch[1]) {
          return `channel_${channelMatch[1].substring(0, 8)}`;
        }
      }

      // Check for other YouTube-specific URL patterns
      if (url.includes('/c/')) {
        const customMatch = url.match(/\/c\/([^?\/]+)/);
        if (customMatch && customMatch[1]) {
          return `custom_${this.simpleHash(customMatch[1])}`;
        }
      }

      return null;
    } catch (error) {
      console.error('FolderTube: [AccountDetector] Error getting account from URL params:', error);
      return null;
    }
  }

  /**
   * Start monitoring for account changes - NUCLEAR VERSION with aggressive detection
   */
  static startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.currentAccountId = this.getCurrentAccountId();

    console.log('💥 Starting NUCLEAR YouTube account monitoring...');

    // Listen for URL changes (popstate events)
    window.addEventListener('popstate', this.handleLocationChange.bind(this));
    
    // Listen for pushState/replaceState (YouTube SPA navigation)
    this.interceptHistoryChanges();

    // NUCLEAR OPTION: Aggressive polling to catch account switches
    this.cookieCheckInterval = window.setInterval(() => {
      this.checkForAccountChange();
    }, 1000); // Check every second

    // Additional detection methods
    this.startAdvancedMonitoring();

  }

  /**
   * Stop monitoring for account changes
   */
  static stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    window.removeEventListener('popstate', this.handleLocationChange.bind(this));
    
    if (this.cookieCheckInterval) {
      clearInterval(this.cookieCheckInterval);
      this.cookieCheckInterval = null;
    }
  }

  /**
   * Add callback for account changes
   */
  static onAccountChange(callback: (accountId: string | null) => void): void {
    this.accountChangeCallbacks.push(callback);
  }

  /**
   * Remove account change callback
   */
  static removeAccountChangeCallback(callback: (accountId: string | null) => void): void {
    const index = this.accountChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.accountChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Handle location changes (URL navigation)
   */
  private static handleLocationChange(): void {
    setTimeout(() => {
      this.checkForAccountChange();
    }, 100); // Small delay to let YouTube update
  }

  /**
   * Intercept pushState/replaceState for SPA navigation
   */
  private static interceptHistoryChanges(): void {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      YouTubeAccountDetector.handleLocationChange();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      YouTubeAccountDetector.handleLocationChange();
    };
  }

  /**
   * Check if account has changed and notify callbacks
   */
  private static checkForAccountChange(): void {
    const newAccountId = this.getCurrentAccountId();
    
    if (newAccountId !== this.currentAccountId) {
      this.currentAccountId = newAccountId;
      
      // Notify all callbacks
      this.accountChangeCallbacks.forEach(callback => {
        try {
          callback(newAccountId);
        } catch (error) {
          console.error('FolderTube: [AccountDetector] Error in account change callback:', error);
        }
      });
    }
  }

  /**
   * Create simple hash for privacy
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  /**
   * Advanced monitoring for account changes (Nuclear Option)
   */
  private static startAdvancedMonitoring(): void {
    console.log('💥 Starting advanced account change monitoring...');
    
    // Monitor DOM changes for account switcher
    const observer = new MutationObserver(() => {
      // Check if account switcher is visible
      const accountSwitcher = document.querySelector('#account-menu, [role="menu"]');
      if (accountSwitcher) {
        console.log('💥 Account switcher detected - checking for changes');
        setTimeout(() => this.checkForAccountChange(), 500);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    // Monitor URL changes more aggressively
    let lastUrl = window.location.href;
    setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        console.log('💥 URL change detected:', { from: lastUrl.substring(0, 50), to: currentUrl.substring(0, 50) });
        lastUrl = currentUrl;
        this.checkForAccountChange();
      }
    }, 500);
    
    // Monitor clicks on account elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target && (
        target.closest('#avatar-btn') ||
        target.closest('[aria-label*="Account"]') ||
        target.closest('[data-test-id*="account"]') ||
        target.id.includes('account') ||
        target.className.includes('account')
      )) {
        console.log('💥 Account-related click detected - monitoring for changes');
        setTimeout(() => this.checkForAccountChange(), 1000);
      }
    });
  }

  /**
   * Check if we can reliably detect the current account
   */
  static canDetectAccount(): boolean {
    return this.getCurrentAccountId() !== null;
  }

  /**
   * Force immediate account detection (useful for manual refresh)
   */
  static forceAccountDetection(): string | null {
    const accountId = this.getCurrentAccountId();
    if (accountId !== this.currentAccountId) {
      this.currentAccountId = accountId;
      this.accountChangeCallbacks.forEach(callback => {
        try {
          callback(accountId);
        } catch (error) {
          console.error('FolderTube: [AccountDetector] Error in forced account change callback:', error);
        }
      });
    }
    return accountId;
  }

  /**
   * Wait for account detection with timeout
   */
  static async waitForAccountDetection(timeoutMs: number = 10000): Promise<string | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const accountId = this.getCurrentAccountId();
      if (accountId) {
        return accountId;
      }
      
      // Wait 200ms before trying again (increased from 100ms)
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.warn('FolderTube: [AccountDetector] Timeout waiting for account detection after', timeoutMs, 'ms');
    return null;
  }

  /**
   * Get display name for current account (for debugging/logging)
   */
  static getCurrentAccountDisplayName(): string | null {
    try {
      // Try to get display name from account menu or avatar
      const accountName = document.querySelector('#account-name') as HTMLElement;
      if (accountName && accountName.textContent) {
        return accountName.textContent.trim();
      }

      const avatarButton = document.querySelector('#avatar-btn img') as HTMLImageElement;
      if (avatarButton && avatarButton.alt) {
        return avatarButton.alt;
      }

      return null;
    } catch (error) {
      console.error('FolderTube: [AccountDetector] Error getting display name:', error);
      return null;
    }
  }

  /**
   * Extract YouTube Channel ID from URL (most reliable method)
   */
  private static getChannelIdFromUrl(): string | null {
    try {
      const url = window.location.href;
      
      // Method 1: Direct channel URL (youtube.com/channel/UCxxx)
      const channelMatch = url.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
      if (channelMatch) {
        return channelMatch[1];
      }
      
      // Method 2: Custom URL that might have channel ID in page
      if (url.includes('youtube.com/@') || url.includes('youtube.com/c/') || url.includes('youtube.com/user/')) {
        // Will need to check page content for these
        return null;
      }
      
      // Method 3: Check for channel ID in URL params
      const urlParams = new URLSearchParams(window.location.search);
      const channelId = urlParams.get('channel_id') || urlParams.get('channelId');
      if (channelId && channelId.startsWith('UC')) {
        return channelId;
      }
      
      return null;
    } catch (error) {
      console.error('🔍 [CHANNEL DETECT] Error getting channel from URL:', error);
      return null;
    }
  }
  
  /**
   * Extract YouTube Channel ID from page content (fallback method)
   */
  private static getChannelIdFromPage(): string | null {
    try {
      // Method 1: Look for channel ID in meta tags
      const metaTags = document.querySelectorAll('meta[property="og:url"], meta[name="twitter:url"], link[rel="canonical"]');
      for (const tag of metaTags) {
        const content = tag.getAttribute('content') || tag.getAttribute('href');
        if (content) {
          const channelMatch = content.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/);
          if (channelMatch) {
            return channelMatch[1];
          }
        }
      }
      
      // Method 2: Look for channel ID in page scripts (YouTube often includes it in JSON)
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        if (script.textContent && script.textContent.includes('"ucid":"UC')) {
          const ucidMatch = script.textContent.match(/"ucid":"(UC[a-zA-Z0-9_-]+)"/);
          if (ucidMatch) {
            return ucidMatch[1];
          }
        }
      }
      
      // Method 3: Look for browseId in page data (YouTube's internal identifier)
      for (const script of scripts) {
        if (script.textContent && script.textContent.includes('"browseId":"UC')) {
          const browseMatch = script.textContent.match(/"browseId":"(UC[a-zA-Z0-9_-]+)"/);
          if (browseMatch) {
            return browseMatch[1];
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('🔍 [CHANNEL DETECT] Error getting channel from page:', error);
      return null;
    }
  }
}