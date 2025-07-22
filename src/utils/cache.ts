import type { ChannelDetails } from './youtube-api';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class MetadataCache {
  private static readonly CACHE_PREFIX = 'folderTube_metadata_';
  private static readonly METADATA_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

  static async getCachedChannelDetails(channelId: string): Promise<ChannelDetails | null> {
    const key = `${this.CACHE_PREFIX}${channelId}`;
    const result = await chrome.storage.local.get(key);
    
    if (!result[key]) return null;
    
    const entry: CacheEntry<ChannelDetails> = result[key];
    
    // Check if cache is expired
    if (Date.now() > entry.expiresAt) {
      await chrome.storage.local.remove(key);
      return null;
    }
    
    return entry.data;
  }

  static async setCachedChannelDetails(channelId: string, details: ChannelDetails): Promise<void> {
    const key = `${this.CACHE_PREFIX}${channelId}`;
    const entry: CacheEntry<ChannelDetails> = {
      data: details,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.METADATA_CACHE_DURATION
    };
    
    await chrome.storage.local.set({ [key]: entry });
  }

  static async getCachedChannelDetailsBatch(channelIds: string[]): Promise<Map<string, ChannelDetails>> {
    const keys = channelIds.map(id => `${this.CACHE_PREFIX}${id}`);
    const result = await chrome.storage.local.get(keys);
    
    const cached = new Map<string, ChannelDetails>();
    const expiredKeys: string[] = [];
    
    for (const channelId of channelIds) {
      const key = `${this.CACHE_PREFIX}${channelId}`;
      if (result[key]) {
        const entry: CacheEntry<ChannelDetails> = result[key];
        if (Date.now() <= entry.expiresAt) {
          cached.set(channelId, entry.data);
        } else {
          expiredKeys.push(key);
        }
      }
    }
    
    // Clean up expired entries
    if (expiredKeys.length > 0) {
      await chrome.storage.local.remove(expiredKeys);
    }
    
    return cached;
  }

  static async setCachedChannelDetailsBatch(details: ChannelDetails[]): Promise<void> {
    const entries: Record<string, CacheEntry<ChannelDetails>> = {};
    
    for (const detail of details) {
      const key = `${this.CACHE_PREFIX}${detail.id}`;
      entries[key] = {
        data: detail,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.METADATA_CACHE_DURATION
      };
    }
    
    await chrome.storage.local.set(entries);
  }

  static async clearExpiredMetadata(): Promise<void> {
    const allKeys = await chrome.storage.local.get();
    const keysToRemove: string[] = [];
    
    for (const [key, value] of Object.entries(allKeys)) {
      if (key.startsWith(this.CACHE_PREFIX)) {
        const entry = value as CacheEntry<ChannelDetails>;
        if (Date.now() > entry.expiresAt) {
          keysToRemove.push(key);
        }
      }
    }
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`FolderTube: Cleared ${keysToRemove.length} expired metadata entries`);
    }
  }

  static async getStorageInfo(): Promise<{ used: number; total: number }> {
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    // Chrome's storage.local has a 10MB limit
    const totalBytes = 10 * 1024 * 1024;
    return { used: bytesInUse, total: totalBytes };
  }
}