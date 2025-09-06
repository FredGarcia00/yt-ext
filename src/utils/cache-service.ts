import { chromeStorage } from './chrome-api-wrapper';

export interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channelId: string;
  viewCount?: string;
  duration?: string;
}

export interface CachedChannelData {
  channelId: string;
  videos: VideoData[];
  cachedAt: number;
  expiresAt: number;
  lastVideoPublished?: string; // Track the latest video's publish date
  refreshPriority?: number; // Higher priority channels get refreshed more often
}

export class CacheService {
  private static CACHE_PREFIX = 'yt_cache_';
  private static CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours for faster updates
  private static EMERGENCY_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days for quota issues
  private static MAX_VIDEOS_PER_CHANNEL = 4; // Increased to match UI
  // private static AGGRESSIVE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for less active channels
  private static PRIORITY_CACHE_PREFIX = 'yt_priority_';
  
  static async getCachedVideos(channelId: string, allowExpired: boolean = false): Promise<VideoData[] | null> {
    const key = `${this.CACHE_PREFIX}${channelId}`;
    const result = await chromeStorage.local.get(key);
    
    if (!result[key]) {
      return null;
    }
    
    const cached: CachedChannelData = result[key];
    const now = Date.now();
    
    // Check if we're in emergency mode (quota exceeded)
    const storage = await chromeStorage.local.get(['quotaExceeded']);
    const inEmergencyMode = storage.quotaExceeded;
    
    if (now > cached.expiresAt && !allowExpired && !inEmergencyMode) {
      await this.clearChannelCache(channelId);
      return null;
    }
    
    // In emergency mode or when explicitly allowing expired cache, return even expired videos
    if (inEmergencyMode || allowExpired) {
      return cached.videos;
    }
    
    return cached.videos;
  }
  
  static async setCachedVideos(channelId: string, videos: VideoData[], isPriority: boolean = false, isEmergencyCache: boolean = false): Promise<void> {
    const now = Date.now();
    let cacheDuration = this.CACHE_DURATION;
    
    // Calculate refresh priority based on upload frequency
    let refreshPriority = 1;
    if (videos.length > 0) {
      const latestVideo = videos[0];
      const daysSinceUpload = (now - new Date(latestVideo.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpload < 1) {
        refreshPriority = 10; // Very active channel, check frequently
        cacheDuration = 1 * 60 * 60 * 1000; // 1 hour cache
      } else if (daysSinceUpload < 7) {
        refreshPriority = 5; // Active channel
        cacheDuration = 3 * 60 * 60 * 1000; // 3 hours cache
      } else if (daysSinceUpload < 30) {
        refreshPriority = 2; // Semi-active channel
        cacheDuration = 12 * 60 * 60 * 1000; // 12 hours cache
      } else {
        refreshPriority = 1; // Inactive channel
        cacheDuration = 24 * 60 * 60 * 1000; // 24 hours cache
      }
    }
    
    if (isEmergencyCache) {
      cacheDuration = this.EMERGENCY_CACHE_DURATION; // 7 days for quota issues
    } else if (isPriority) {
      cacheDuration = Math.min(cacheDuration, this.CACHE_DURATION); // Don't extend cache for priority items
    }
    
    const cachedData: CachedChannelData = {
      channelId,
      videos: videos.slice(0, this.MAX_VIDEOS_PER_CHANNEL),
      cachedAt: now,
      expiresAt: now + cacheDuration,
      lastVideoPublished: videos.length > 0 ? videos[0].publishedAt : undefined,
      refreshPriority
    };
    
    const key = `${this.CACHE_PREFIX}${channelId}`;
    await chromeStorage.local.set({ [key]: cachedData });
    
    // Track priority channels separately
    if (isPriority) {
      const priorityKey = `${this.PRIORITY_CACHE_PREFIX}${channelId}`;
      await chromeStorage.local.set({ [priorityKey]: now });
    }
  }
  
  static async extendCacheForQuotaIssues(channelId: string): Promise<boolean> {
    const key = `${this.CACHE_PREFIX}${channelId}`;
    const result = await chromeStorage.local.get(key);
    
    if (!result[key]) {
      return false; // No cache to extend
    }
    
    const cached: CachedChannelData = result[key];
    const now = Date.now();
    
    // Extend cache by emergency duration
    cached.expiresAt = now + this.EMERGENCY_CACHE_DURATION;
    
    await chromeStorage.local.set({ [key]: cached });
    console.log(`FolderTube: Extended cache for ${channelId} due to quota issues`);
    return true;
  }
  
  static async clearChannelCache(channelId: string): Promise<void> {
    const key = `${this.CACHE_PREFIX}${channelId}`;
    await chromeStorage.local.remove(key);
  }
  
  static async clearAllChannelCaches(channelIds: string[]): Promise<void> {
    const keys = channelIds.map(id => `${this.CACHE_PREFIX}${id}`);
    await chromeStorage.local.remove(keys);
    console.log(`FolderTube: Cleared cache for ${channelIds.length} channels`);
  }
  
  static async clearAllCache(): Promise<void> {
    const storage = await chromeStorage.local.get();
    const keysToRemove = Object.keys(storage).filter(key => 
      key.startsWith(this.CACHE_PREFIX)
    );
    
    if (keysToRemove.length > 0) {
      await chromeStorage.local.remove(keysToRemove);
    }
  }
  
  static async getChannelsNeedingRefresh(limit: number = 5): Promise<string[]> {
    const result = await chromeStorage.local.get();
    const now = Date.now();
    const channelsToRefresh: Array<{channelId: string, priority: number, expired: boolean}> = [];
    
    for (const key in result) {
      if (key.startsWith(this.CACHE_PREFIX)) {
        const cached: CachedChannelData = result[key];
        const isExpired = now > cached.expiresAt;
        
        // Include if expired or high priority
        if (isExpired || (cached.refreshPriority && cached.refreshPriority >= 5)) {
          channelsToRefresh.push({
            channelId: cached.channelId,
            priority: cached.refreshPriority || 1,
            expired: isExpired
          });
        }
      }
    }
    
    // Sort by priority (expired first, then by priority)
    channelsToRefresh.sort((a, b) => {
      if (a.expired && !b.expired) return -1;
      if (!a.expired && b.expired) return 1;
      return b.priority - a.priority;
    });
    
    // Return only the channel IDs, limited to prevent quota issues
    return channelsToRefresh.slice(0, limit).map(c => c.channelId);
  }
  
  static async clearExpiredCache(): Promise<void> {
    const storage = await chromeStorage.local.get();
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
      await chromeStorage.local.remove(keysToRemove);
    }
  }
  
  static async getCacheStats(): Promise<{
    totalChannels: number;
    totalVideos: number;
    oldestCache: number | null;
    newestCache: number | null;
  }> {
    const storage = await chromeStorage.local.get();
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
  
  static async batchLoadChannels(channelIds: string[]): Promise<Map<string, VideoData[]>> {
    const results = new Map<string, VideoData[]>();
    const uncachedChannels: string[] = [];
    
    // First, load all available cached data
    for (const channelId of channelIds) {
      const cached = await this.getCachedVideos(channelId);
      if (cached) {
        results.set(channelId, cached);
      } else {
        uncachedChannels.push(channelId);
      }
    }
    
    // Batch load uncached channels (max 10 at a time to avoid overwhelming the API)
    const batchSize = 10;
    for (let i = 0; i < uncachedChannels.length; i += batchSize) {
      const batch = uncachedChannels.slice(i, i + batchSize);
      
      // Load channels in parallel within each batch
      const batchPromises = batch.map(async (channelId) => {
        try {
          const { YouTubeAPI } = await import('./youtube-api');
          const result = await YouTubeAPI.getChannelVideos(channelId, '', false, true);
          results.set(channelId, result.videos);
        } catch (error) {
          console.warn(`FolderTube: Failed to load channel ${channelId}:`, error);
          results.set(channelId, []); // Set empty array for failed channels
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < uncachedChannels.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }

  static async smartPreload(folderChannelIds: string[][]): Promise<void> {
    await this.clearExpiredCache();
    
    // Prioritize channels that are in multiple folders
    const channelFrequency = new Map<string, number>();
    folderChannelIds.forEach(channelIds => {
      channelIds.forEach(channelId => {
        channelFrequency.set(channelId, (channelFrequency.get(channelId) || 0) + 1);
      });
    });
    
    // Sort by frequency (most used channels first)
    const sortedChannels = Array.from(channelFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([channelId]) => channelId)
      .slice(0, 20); // Limit to top 20 channels
    
    // Use batch loading for better performance
    try {
      await this.batchLoadChannels(sortedChannels);
      console.log(`FolderTube: Smart preload completed for ${sortedChannels.length} channels`);
    } catch (error) {
      console.error('FolderTube: Smart preload failed:', error);
    }
  }
}