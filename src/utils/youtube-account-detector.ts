/**
 * YouTube Account Detector - Production Ready
 * Detects the current YouTube channel from the page (not from OAuth)
 * This is critical for preventing account bleeding
 */

export class YouTubeAccountDetector {
  private static cachedChannelId: string | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 5000; // 5 seconds cache

  /**
   * Get the current YouTube channel ID from the page
   * Uses multiple detection methods for reliability
   */
  static getCurrentPageChannelId(): string | null {
    // Check cache first
    if (this.cachedChannelId && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cachedChannelId;
    }

    let channelId: string | null = null;

    // Method 1: Check if we're on a channel page URL
    channelId = this.getChannelFromURL();
    if (channelId) {
      console.log('YouTubeAccountDetector: Found channel from URL:', channelId);
      this.updateCache(channelId);
      return channelId;
    }

    // Method 2: Check ytInitialData (most reliable for general pages)
    channelId = this.getChannelFromYtInitialData();
    if (channelId) {
      console.log('YouTubeAccountDetector: Found channel from ytInitialData:', channelId);
      this.updateCache(channelId);
      return channelId;
    }

    // Method 3: Check page metadata
    channelId = this.getChannelFromMetaTags();
    if (channelId) {
      console.log('YouTubeAccountDetector: Found channel from meta tags:', channelId);
      this.updateCache(channelId);
      return channelId;
    }

    // Method 4: Check DOM elements
    channelId = this.getChannelFromDOM();
    if (channelId) {
      console.log('YouTubeAccountDetector: Found channel from DOM:', channelId);
      this.updateCache(channelId);
      return channelId;
    }

    // Method 5: Check ytcfg configuration
    channelId = this.getChannelFromYtcfg();
    if (channelId) {
      console.log('YouTubeAccountDetector: Found channel from ytcfg:', channelId);
      this.updateCache(channelId);
      return channelId;
    }

    console.log('YouTubeAccountDetector: No channel ID found on current page');
    return null;
  }

  /**
   * Get channel ID from URL if on a channel page
   */
  private static getChannelFromURL(): string | null {
    try {
      const path = window.location.pathname;
      
      // Check for /channel/UCxxxxxx format
      const channelMatch = path.match(/\/channel\/(UC[\w-]{22})/);
      if (channelMatch) {
        return channelMatch[1];
      }

      // Check for /@handle format (needs conversion)
      const handleMatch = path.match(/\/@([\w.-]+)/);
      if (handleMatch) {
        // We have a handle but need the channel ID
        // This would need to be resolved via DOM or ytInitialData
        return null; // Let other methods handle it
      }
    } catch (error) {
      console.error('YouTubeAccountDetector: Error parsing URL:', error);
    }
    return null;
  }

  /**
   * Get channel ID from ytInitialData global variable
   */
  private static getChannelFromYtInitialData(): string | null {
    try {
      const ytData = (window as any).ytInitialData;
      if (!ytData) return null;

      // Multiple paths where channel ID might be stored
      const paths = [
        // On channel pages
        'metadata.channelMetadataRenderer.externalId',
        'header.c4TabbedHeaderRenderer.channelId',
        
        // On video pages - the video owner
        'contents.twoColumnWatchNextResults.results.results.contents.0.videoPrimaryInfoRenderer.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId',
        'playerOverlays.playerOverlayRenderer.endScreen.watchNextEndScreenRenderer.results.0.endScreenVideoRenderer.navigationEndpoint.browseEndpoint.browseId',
        
        // On home page - the logged in user's channel
        'topbar.desktopTopbarRenderer.trackingParams',
        'responseContext.serviceTrackingParams.0.params.0.value'
      ];

      for (const path of paths) {
        const value = this.getNestedProperty(ytData, path);
        if (value && typeof value === 'string' && value.startsWith('UC')) {
          return value;
        }
      }

      // Search recursively for any channelId property
      const channelId = this.findChannelIdRecursive(ytData);
      if (channelId) return channelId;

    } catch (error) {
      console.error('YouTubeAccountDetector: Error parsing ytInitialData:', error);
    }
    return null;
  }

  /**
   * Get channel ID from meta tags
   */
  private static getChannelFromMetaTags(): string | null {
    try {
      // Check various meta tags
      const metaTags = [
        'meta[itemprop="channelId"]',
        'meta[property="og:url"]',
        'link[itemprop="url"]'
      ];

      for (const selector of metaTags) {
        const element = document.querySelector(selector);
        if (element) {
          const content = element.getAttribute('content') || element.getAttribute('href');
          if (content) {
            const match = content.match(/UC[\w-]{22}/);
            if (match) return match[0];
          }
        }
      }
    } catch (error) {
      console.error('YouTubeAccountDetector: Error parsing meta tags:', error);
    }
    return null;
  }

  /**
   * Get channel ID from DOM elements
   */
  private static getChannelFromDOM(): string | null {
    try {
      // Check various DOM elements that might contain channel ID
      const selectors = [
        // Channel page elements
        '[data-channel-external-id]',
        'yt-formatted-string.ytd-channel-name a[href*="/channel/"]',
        'a.ytp-ce-channel-title[href*="/channel/"]',
        
        // Video page elements
        'ytd-video-owner-renderer a[href*="/channel/"]',
        'ytd-channel-name a[href*="/channel/"]',
        
        // Comments section
        '#author-text a[href*="/channel/"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          // Check data attribute
          const dataChannel = element.getAttribute('data-channel-external-id');
          if (dataChannel && dataChannel.startsWith('UC')) {
            return dataChannel;
          }

          // Check href
          const href = element.getAttribute('href');
          if (href) {
            const match = href.match(/\/channel\/(UC[\w-]{22})/);
            if (match) return match[1];
          }
        }
      }

      // Check for channel links in the page
      const allChannelLinks = document.querySelectorAll('a[href*="/channel/UC"]');
      if (allChannelLinks.length > 0) {
        const href = allChannelLinks[0].getAttribute('href');
        if (href) {
          const match = href.match(/\/channel\/(UC[\w-]{22})/);
          if (match) return match[1];
        }
      }

    } catch (error) {
      console.error('YouTubeAccountDetector: Error parsing DOM:', error);
    }
    return null;
  }

  /**
   * Get channel ID from ytcfg configuration
   */
  private static getChannelFromYtcfg(): string | null {
    try {
      const ytcfg = (window as any).ytcfg;
      if (!ytcfg || typeof ytcfg.get !== 'function') return null;

      // Try to get channel ID from config
      const configs = [
        'CHANNEL_ID',
        'SESSION_INDEX.channelId',
        'VISITOR_DATA'
      ];

      for (const config of configs) {
        const value = ytcfg.get(config);
        if (value && typeof value === 'string' && value.startsWith('UC')) {
          return value;
        }
      }
    } catch (error) {
      console.error('YouTubeAccountDetector: Error parsing ytcfg:', error);
    }
    return null;
  }

  /**
   * Helper: Get nested property from object
   */
  private static getNestedProperty(obj: any, path: string): any {
    try {
      const keys = path.split('.');
      let current = obj;
      
      for (const key of keys) {
        if (current === null || current === undefined) return null;
        current = current[key];
      }
      
      return current;
    } catch (error) {
      return null;
    }
  }

  /**
   * Helper: Find channel ID recursively in object
   */
  private static findChannelIdRecursive(obj: any, depth: number = 0): string | null {
    if (depth > 10) return null; // Prevent infinite recursion
    if (!obj || typeof obj !== 'object') return null;

    try {
      for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;

        // Check if this key might contain a channel ID
        if (key.toLowerCase().includes('channel') || key === 'browseId' || key === 'externalId') {
          const value = obj[key];
          if (typeof value === 'string' && value.startsWith('UC') && value.length === 24) {
            return value;
          }
        }

        // Recurse into nested objects
        if (typeof obj[key] === 'object') {
          const found = this.findChannelIdRecursive(obj[key], depth + 1);
          if (found) return found;
        }
      }
    } catch (error) {
      // Ignore errors during recursion
    }

    return null;
  }

  /**
   * Update cache with new channel ID
   */
  private static updateCache(channelId: string): void {
    this.cachedChannelId = channelId;
    this.cacheTimestamp = Date.now();
  }

  /**
   * Clear the cache (useful when page changes)
   */
  static clearCache(): void {
    this.cachedChannelId = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Monitor for page changes and clear cache
   */
  static startMonitoring(): void {
    // Clear cache on navigation
    let lastUrl = window.location.href;
    
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.clearCache();
        console.log('YouTubeAccountDetector: Page changed, cache cleared');
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  /**
   * Get current user's email from the page (if available)
   */
  static getCurrentUserEmail(): string | null {
    try {
      // Try to get email from ytInitialData
      const ytData = (window as any).ytInitialData;
      if (ytData) {
        // Look for email in various locations
        const paths = [
          'topbar.desktopTopbarRenderer.topbarButtons.0.topbarMenuButtonRenderer.avatar.thumbnails.0.url',
          'header.c4TabbedHeaderRenderer.subscriberCountText.accessibility.accessibilityData.label'
        ];

        for (const path of paths) {
          const value = this.getNestedProperty(ytData, path);
          if (value && value.includes('@')) {
            const match = value.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (match) return match[1];
          }
        }
      }
    } catch (error) {
      console.error('YouTubeAccountDetector: Error getting email:', error);
    }
    return null;
  }

  /**
   * Check if we're on a YouTube page
   */
  static isYouTubePage(): boolean {
    return window.location.hostname.includes('youtube.com');
  }

  /**
   * Get the current page type (home, video, channel, etc.)
   */
  static getPageType(): string {
    const path = window.location.pathname;
    
    if (path === '/' || path === '/feed/subscriptions') return 'home';
    if (path.startsWith('/watch')) return 'video';
    if (path.startsWith('/channel/') || path.startsWith('/@')) return 'channel';
    if (path.startsWith('/c/')) return 'custom_channel';
    if (path.startsWith('/results')) return 'search';
    
    return 'other';
  }
}