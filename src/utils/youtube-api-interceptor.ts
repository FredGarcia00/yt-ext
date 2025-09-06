/**
 * YouTube API Response Interceptor
 * Hooks into YouTube's internal API calls to extract reliable account/channel information
 * This provides bulletproof account detection by using YouTube's own data
 */
export class YouTubeAPIInterceptor {
  private static currentChannelId: string | null = null;
  private static channelChangeCallbacks: ((channelId: string | null) => void)[] = [];
  private static isHooked = false;
  private static originalFetch: typeof fetch;
  private static originalXHROpen: typeof XMLHttpRequest.prototype.open;

  /**
   * Start intercepting YouTube API calls
   */
  static startInterception(): void {
    if (this.isHooked) {
      return;
    }

    console.log('FolderTube: [APIInterceptor] Starting YouTube API interception');
    this.isHooked = true;

    // Try immediate channel detection before setting up hooks
    const immediateChannelId = this.getChannelFromDOM();
    if (immediateChannelId) {
      this.updateCurrentChannel(immediateChannelId);
    }

    // Hook fetch API
    this.originalFetch = window.fetch;
    window.fetch = this.createFetchHook();

    // Hook XMLHttpRequest
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = this.createXHRHook();

    console.log('FolderTube: [APIInterceptor] API hooks installed, current channel:', this.currentChannelId);
  }

  /**
   * Stop intercepting YouTube API calls
   */
  static stopInterception(): void {
    if (!this.isHooked) {
      return;
    }

    console.log('FolderTube: [APIInterceptor] Stopping YouTube API interception');
    this.isHooked = false;

    // Restore original fetch
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }

    // Restore original XMLHttpRequest
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
    }
  }

  /**
   * Create fetch hook to intercept YouTube API calls
   */
  private static createFetchHook() {
    const self = this;
    return async function(this: any, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      try {
        // Use call to preserve the 'this' context and prevent illegal invocation
        const response = await self.originalFetch.call(this, input, init);
        
        // Check if this is a YouTube API call
        if (self.isYouTubeAPICall(url)) {
          // Clone response to read it without consuming the original
          const responseClone = response.clone();
          self.processAPIResponse(url, responseClone);
        }
        
        return response;
      } catch (error) {
        console.error('FolderTube: [APIInterceptor] Fetch error:', error);
        throw error;
      }
    };
  }

  /**
   * Create XMLHttpRequest hook for older YouTube API calls
   */
  private static createXHRHook() {
    const self = this;
    
    return function(this: XMLHttpRequest, method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
      const urlString = typeof url === 'string' ? url : url.href;
      
      // Install response listener if this is a YouTube API call
      if (self.isYouTubeAPICall(urlString)) {
        this.addEventListener('load', function() {
          if (this.status >= 200 && this.status < 300) {
            try {
              self.processAPIResponseText(urlString, this.responseText);
            } catch (error) {
              console.error('FolderTube: [APIInterceptor] XHR response processing error:', error);
            }
          }
        });
      }
      
      return self.originalXHROpen.call(this, method, url, async ?? true, user, password);
    };
  }

  /**
   * Check if URL is a YouTube API call we're interested in
   */
  private static isYouTubeAPICall(url: string): boolean {
    const relevantAPIs = [
      '/youtubei/v1/browse',           // Channel/subscription data
      '/youtubei/v1/account/accounts_list', // Account list
      '/youtubei/v1/account/account_menu', // Account menu data
      '/youtubei/v1/guide',            // Guide/sidebar data
      '/youtubei/v1/navigation',       // Navigation data
      '/youtubei/v1/subscription/subscribe', // Subscribe actions
      '/youtubei/v1/subscription/unsubscribe' // Unsubscribe actions
    ];
    
    return relevantAPIs.some(api => url.includes(api));
  }

  /**
   * Process API response to extract channel information
   */
  private static async processAPIResponse(url: string, response: Response): Promise<void> {
    try {
      const data = await response.json();
      this.extractChannelFromData(url, data);
    } catch (error) {
      console.error('FolderTube: [APIInterceptor] Error processing API response:', error);
    }
  }

  /**
   * Process API response text (for XMLHttpRequest)
   */
  private static processAPIResponseText(url: string, responseText: string): void {
    try {
      const data = JSON.parse(responseText);
      this.extractChannelFromData(url, data);
    } catch (error) {
      console.error('FolderTube: [APIInterceptor] Error parsing API response text:', error);
    }
  }

  /**
   * Extract channel ID from API response data
   */
  private static extractChannelFromData(url: string, data: any): void {
    let channelId: string | null = null;

    try {
      // Method 1: Look for current user's channel ID in various response structures
      if (data.header?.accountSwitcherHeader?.currentAccountGroup?.accountListRenderer?.accounts) {
        const accounts = data.header.accountSwitcherHeader.currentAccountGroup.accountListRenderer.accounts;
        const currentAccount = accounts.find((acc: any) => acc.accountItemRenderer?.isSelected);
        if (currentAccount?.accountItemRenderer?.channelId) {
          channelId = currentAccount.accountItemRenderer.channelId;
        }
      }

      // Method 2: Look in guide data
      if (!channelId && data.contents?.singleColumnGuideRenderer?.items) {
        const guideItems = data.contents.singleColumnGuideRenderer.items;
        for (const item of guideItems) {
          if (item.guideEntryRenderer?.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC')) {
            channelId = item.guideEntryRenderer.navigationEndpoint.browseEndpoint.browseId;
            break;
          }
        }
      }

      // Method 3: Look in browse responses (subscription feeds, channel pages)
      if (!channelId && data.metadata?.channelMetadataRenderer?.externalId) {
        channelId = data.metadata.channelMetadataRenderer.externalId;
      }

      // Method 4: Look for channel ID in context or responseContext
      if (!channelId && data.responseContext?.serviceTrackingParams) {
        const trackingParams = data.responseContext.serviceTrackingParams;
        for (const param of trackingParams) {
          if (param.service === 'youtube' && param.params) {
            const channelParam = param.params.find((p: any) => p.key === 'channel_id' || p.key === 'c');
            if (channelParam?.value?.startsWith('UC')) {
              channelId = channelParam.value;
              break;
            }
          }
        }
      }

      // Method 5: Look in subscription actions
      if (!channelId && (url.includes('/subscribe') || url.includes('/unsubscribe'))) {
        if (data.channelId?.startsWith('UC')) {
          channelId = data.channelId;
        }
      }

      if (channelId && channelId !== this.currentChannelId) {
        console.log('FolderTube: [APIInterceptor] Detected channel change via API:', channelId);
        this.updateCurrentChannel(channelId);
      }

    } catch (error) {
      console.error('FolderTube: [APIInterceptor] Error extracting channel from API data:', error);
    }
  }

  /**
   * Update current channel and notify callbacks
   */
  private static updateCurrentChannel(channelId: string): void {
    const previousChannelId = this.currentChannelId;
    this.currentChannelId = channelId;

    console.log('FolderTube: [APIInterceptor] Channel updated:', {
      from: previousChannelId,
      to: channelId,
      url: window.location.href
    });

    // Notify all callbacks
    this.channelChangeCallbacks.forEach(callback => {
      try {
        callback(channelId);
      } catch (error) {
        console.error('FolderTube: [APIInterceptor] Error in channel change callback:', error);
      }
    });
  }

  /**
   * Get current channel ID
   */
  static getCurrentChannelId(): string | null {
    return this.currentChannelId;
  }

  /**
   * Add callback for channel changes
   */
  static onChannelChange(callback: (channelId: string | null) => void): void {
    this.channelChangeCallbacks.push(callback);
  }

  /**
   * Remove channel change callback
   */
  static removeChannelChangeCallback(callback: (channelId: string | null) => void): void {
    const index = this.channelChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.channelChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Get channel ID from DOM using multiple reliable methods
   */
  private static getChannelFromDOM(): string | null {
    try {
      console.log('FolderTube: [APIInterceptor] Searching for channel ID in DOM...');
      
      // Method 1: Check URL for channel ID (most direct)
      const url = window.location.href;
      const urlMatch = url.match(/\/channel\/(UC[\w-]{22})/);
      if (urlMatch) {
        console.log('FolderTube: [APIInterceptor] Found channel via URL:', urlMatch[1]);
        return urlMatch[1];
      }

      // Method 2: Look for channel links in current user's navigation elements
      const userElements = [
        '#avatar-btn[href*="/channel/"]',
        'a[href*="/channel/"][aria-label*="channel"]',
        '.ytd-account-item-renderer a[href*="/channel/"]'
      ];

      for (const selector of userElements) {
        const element = document.querySelector(selector) as HTMLAnchorElement;
        if (element && element.href) {
          const match = element.href.match(/\/channel\/(UC[\w-]{22})/);
          if (match) {
            console.log('FolderTube: [APIInterceptor] Found channel via user element:', match[1]);
            return match[1];
          }
        }
      }

      // Method 3: Look in ytInitialData first (faster than scripts)
      if ((window as any).ytInitialData) {
        const data = (window as any).ytInitialData;
        const channelId = this.extractChannelFromYtData(data);
        if (channelId) {
          console.log('FolderTube: [APIInterceptor] Found channel via ytInitialData:', channelId);
          return channelId;
        }
      }

      // Method 4: Check page scripts for channel data
      const scripts = document.querySelectorAll('script');
      const patterns = [
        /"channelId":"(UC[\w-]{22})"/,
        /"CHANNEL_ID":"(UC[\w-]{22})"/,
        /LOGGED_IN_USER_CHANNEL_ID.*?"(UC[\w-]{22})"/,
        /"externalId":"(UC[\w-]{22})"/,
        /"browseId":"(UC[\w-]{22})"/
      ];

      for (const script of scripts) {
        const content = script.textContent || '';
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            console.log('FolderTube: [APIInterceptor] Found channel via page script:', match[1]);
            return match[1];
          }
        }
      }

      // Method 5: Look for any channel links on page (least reliable)
      const channelLinks = document.querySelectorAll('a[href*="/channel/UC"]');
      for (const link of channelLinks) {
        const href = (link as HTMLAnchorElement).href;
        const match = href.match(/\/channel\/(UC[\w-]{22})/);
        if (match) {
          // Only use this if it looks like the current user's channel
          const element = link as HTMLElement;
          const isUserChannel = element.closest('#avatar-btn') || 
                               element.closest('.ytd-account-item-renderer') ||
                               element.getAttribute('aria-label')?.includes('channel');
          if (isUserChannel) {
            console.log('FolderTube: [APIInterceptor] Found channel via channel link:', match[1]);
            return match[1];
          }
        }
      }

      console.log('FolderTube: [APIInterceptor] No channel ID found in DOM');
      return null;
    } catch (error) {
      console.error('FolderTube: [APIInterceptor] Error getting channel from DOM:', error);
      return null;
    }
  }

  /**
   * Extract channel ID from ytInitialData
   */
  private static extractChannelFromYtData(data: any): string | null {
    try {
      // Look for channel ID in various places in ytInitialData
      const searchPaths = [
        'metadata.channelMetadataRenderer.externalId',
        'header.c4TabbedHeaderRenderer.channelId',
        'microformat.microformatDataRenderer.urlCanonical',
        'responseContext.serviceTrackingParams'
      ];

      for (const path of searchPaths) {
        const value = this.getNestedValue(data, path);
        if (typeof value === 'string' && value.startsWith('UC') && value.length === 24) {
          return value;
        }
        if (typeof value === 'string' && value.includes('/channel/UC')) {
          const match = value.match(/\/channel\/(UC[\w-]{22})/);
          if (match) return match[1];
        }
      }

      return null;
    } catch (error) {
      console.error('FolderTube: [APIInterceptor] Error extracting from ytData:', error);
      return null;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Force check for current channel using multiple methods
   */
  static async forceChannelDetection(): Promise<string | null> {
    try {
      // Method 1: Try DOM extraction first (most reliable and fast)
      let channelId = this.getChannelFromDOM();
      if (channelId) {
        this.updateCurrentChannel(channelId);
        return channelId;
      }

      // Method 2: Try a simple API request using original fetch to avoid recursion
      try {
        const response = await this.originalFetch.call(window, '/youtubei/v1/guide', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB',
                clientVersion: '2.0'
              }
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          this.extractChannelFromData('force_detection', data);
        }
      } catch (apiError) {
        console.log('FolderTube: [APIInterceptor] API request failed, using DOM fallback');
      }

      return this.currentChannelId;
    } catch (error) {
      console.error('FolderTube: [APIInterceptor] Error in force channel detection:', error);
      return this.currentChannelId;
    }
  }

  /**
   * Wait for channel detection with timeout and immediate fallback
   */
  static async waitForChannelDetection(timeoutMs: number = 10000): Promise<string | null> {
    // If we already have a channel ID, return it immediately
    if (this.currentChannelId) {
      return this.currentChannelId;
    }

    // Try immediate detection first
    const immediateResult = await this.forceChannelDetection();
    if (immediateResult) {
      return immediateResult;
    }

    // If immediate detection failed, wait for API interception with timeout
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('FolderTube: [APIInterceptor] Timeout waiting for channel detection, using fallback');
        // Try one more time with DOM extraction before giving up
        const fallbackResult = this.getChannelFromDOM();
        if (fallbackResult) {
          this.updateCurrentChannel(fallbackResult);
        }
        resolve(fallbackResult);
      }, timeoutMs);

      const callback = (channelId: string | null) => {
        if (channelId) {
          clearTimeout(timeout);
          this.removeChannelChangeCallback(callback);
          resolve(channelId);
        }
      };

      this.onChannelChange(callback);
    });
  }

  /**
   * Get account-specific storage key
   */
  static getStorageKey(baseKey: string): string {
    const channelId = this.currentChannelId;
    if (channelId) {
      return `${baseKey}_${channelId}`;
    }
    return `${baseKey}_default`;
  }

  /**
   * Check if interceptor is active
   */
  static isActive(): boolean {
    return this.isHooked;
  }
}