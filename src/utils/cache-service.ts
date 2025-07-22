export interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channelId: string;
  viewCount?: string;
}

export interface CachedChannelData {
  channelId: string;
  videos: VideoData[];
  cachedAt: number;
  expiresAt: number;
}

export class CacheService {
  private static CACHE_PREFIX = 'yt_cache_';
  private static CACHE_DURATION = 48 * 60 * 60 * 1000; // 48 hours (extended for API limits)
  private static EMERGENCY_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days for quota issues
  private static MAX_VIDEOS_PER_CHANNEL = 4; // Increased to match UI
  private static PRIORITY_CACHE_PREFIX = 'yt_priority_';
  
  static async getCachedVideos(channelId: string): Promise<VideoData[] | null> {
    const key = `${this.CACHE_PREFIX}${channelId}`;
    const result = await chrome.storage.local.get(key);
    
    if (!result[key]) {
      return null;
    }
    
    const cached: CachedChannelData = result[key];
    const now = Date.now();
    
    if (now > cached.expiresAt) {
      await this.clearChannelCache(channelId);
      return null;
    }
    
    return cached.videos;
  }
  
  static async setCachedVideos(channelId: string, videos: VideoData[], isPriority: boolean = false, isEmergencyCache: boolean = false): Promise<void> {
    const now = Date.now();
    let cacheDuration = this.CACHE_DURATION;
    
    if (isEmergencyCache) {
      cacheDuration = this.EMERGENCY_CACHE_DURATION; // 7 days for quota issues
    } else if (isPriority) {
      cacheDuration = this.CACHE_DURATION * 2; // Priority items cached longer
    }
    
    const cachedData: CachedChannelData = {
      channelId,
      videos: videos.slice(0, this.MAX_VIDEOS_PER_CHANNEL),
      cachedAt: now,
      expiresAt: now + cacheDuration
    };
    
    const key = `${this.CACHE_PREFIX}${channelId}`;
    await chrome.storage.local.set({ [key]: cachedData });
    
    // Track priority channels separately
    if (isPriority) {
      const priorityKey = `${this.PRIORITY_CACHE_PREFIX}${channelId}`;
      await chrome.storage.local.set({ [priorityKey]: now });
    }
  }
  
  static async extendCacheForQuotaIssues(channelId: string): Promise<boolean> {
    const key = `${this.CACHE_PREFIX}${channelId}`;
    const result = await chrome.storage.local.get(key);
    
    if (!result[key]) {
      return false; // No cache to extend
    }
    
    const cached: CachedChannelData = result[key];
    const now = Date.now();
    
    // Extend cache by emergency duration
    cached.expiresAt = now + this.EMERGENCY_CACHE_DURATION;
    
    await chrome.storage.local.set({ [key]: cached });
    console.log(`FolderTube: Extended cache for ${channelId} due to quota issues`);
    return true;
  }
  
  static async clearChannelCache(channelId: string): Promise<void> {
    const key = `${this.CACHE_PREFIX}${channelId}`;
    await chrome.storage.local.remove(key);
  }
  
  static async clearAllCache(): Promise<void> {
    const storage = await chrome.storage.local.get();
    const keysToRemove = Object.keys(storage).filter(key => 
      key.startsWith(this.CACHE_PREFIX)
    );
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
  }
  
  static async clearExpiredCache(): Promise<void> {
    const storage = await chrome.storage.local.get();
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith(this.CACHE_PREFIX)) {
        const cached = value as CachedChannelData;
        if (now > cached.expiresAt) {
          keysToRemove.push(key);
        }
      }
    }
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }
  }
  
  static async getCacheStats(): Promise<{
    totalChannels: number;
    totalVideos: number;
    oldestCache: number | null;
    newestCache: number | null;
  }> {
    const storage = await chrome.storage.local.get();
    let totalChannels = 0;
    let totalVideos = 0;
    let oldestCache: number | null = null;
    let newestCache: number | null = null;
    
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith(this.CACHE_PREFIX)) {
        const cached = value as CachedChannelData;
        totalChannels++;
        totalVideos += cached.videos.length;
        
        if (!oldestCache || cached.cachedAt < oldestCache) {
          oldestCache = cached.cachedAt;
        }
        if (!newestCache || cached.cachedAt > newestCache) {
          newestCache = cached.cachedAt;
        }
      }
    }
    
    return { totalChannels, totalVideos, oldestCache, newestCache };
  }
  
  static async smartPreload(folderChannelIds: string[][]): Promise<void> {
    await this.clearExpiredCache();
    
    // Prioritize channels that are in multiple folders (more likely to be accessed)
    const channelFrequency = new Map<string, number>();
    
    folderChannelIds.forEach(channelIds => {
      channelIds.forEach(channelId => {
        channelFrequency.set(channelId, (channelFrequency.get(channelId) || 0) + 1);
      });
    });
    
    // Sort by frequency (most used channels first)
    const sortedChannels = Array.from(channelFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([channelId]) => channelId);
    
    // Preload up to 3 most important channels that aren't cached (reduced to conserve API quota)
    let preloadCount = 0;
    let apiErrorCount = 0;
    const maxPreload = 3;
    const maxApiErrors = 2; // Stop preloading after 2 API errors
    
    for (const channelId of sortedChannels) {
      if (preloadCount >= maxPreload || apiErrorCount >= maxApiErrors) break;
      
      const cached = await this.getCachedVideos(channelId);
      if (!cached) {
        try {
          // Import YouTubeAPI dynamically to avoid circular dependency
          const { YouTubeAPI } = await import('./youtube-api');
          await YouTubeAPI.getChannelVideos(channelId, '', false, true);
          preloadCount++;
          
          // Small delay to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.warn(`FolderTube: Failed to preload channel ${channelId}:`, error);
          apiErrorCount++;
          
          // If we're hitting API key or quota issues, stop preloading
          if (error instanceof Error && 
              (error.message.includes('API key not configured') || 
               error.message.includes('quota') || 
               error.message.includes('403'))) {
            console.log('FolderTube: Stopping preload due to API limitations');
            break;
          }
        }
      }
    }
    
    console.log(`FolderTube: Smart preload completed for ${preloadCount} channels (${apiErrorCount} API errors)`);
  }
}