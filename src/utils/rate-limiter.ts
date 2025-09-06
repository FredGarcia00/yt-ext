import { chromeStorage } from './chrome-api-wrapper';

interface RateLimitData {
  lastSortTimestamp: number;
  dailySortCount: number;
  lastResetDate: string;
  cachedResult?: {
    timestamp: number;
    subscriptionHash: string;
    folders: any[];
  };
}

export class RateLimiter {
  private static COOLDOWN_MINUTES = 5;
  private static MAX_SORTS_PER_DAY = 20;
  private static CACHE_DURATION_MINUTES = 60;

  static async canSort(): Promise<{ allowed: boolean; reason?: string; waitTime?: number; remaining?: number }> {
    const data = await this.getRateLimitData();
    const now = Date.now();
    const today = new Date().toDateString();

    // Reset daily count if it's a new day
    if (data.lastResetDate !== today) {
      data.dailySortCount = 0;
      data.lastResetDate = today;
      await this.saveRateLimitData(data);
    }

    // Check daily limit
    if (data.dailySortCount >= this.MAX_SORTS_PER_DAY) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const timeUntilReset = tomorrow.getTime() - now;
      
      return {
        allowed: false,
        reason: `Daily limit reached (${this.MAX_SORTS_PER_DAY} sorts per day)`,
        waitTime: Math.ceil(timeUntilReset / 1000),
        remaining: 0
      };
    }

    // Check cooldown
    const timeSinceLastSort = now - data.lastSortTimestamp;
    const cooldownMs = this.COOLDOWN_MINUTES * 60 * 1000;
    
    if (timeSinceLastSort < cooldownMs) {
      const waitTime = Math.ceil((cooldownMs - timeSinceLastSort) / 1000);
      return {
        allowed: false,
        reason: 'Cooldown active',
        waitTime,
        remaining: this.MAX_SORTS_PER_DAY - data.dailySortCount
      };
    }

    return {
      allowed: true,
      remaining: this.MAX_SORTS_PER_DAY - data.dailySortCount
    };
  }

  static async recordSort(folders?: any[]): Promise<void> {
    const data = await this.getRateLimitData();
    const now = Date.now();
    const today = new Date().toDateString();

    // Reset if new day
    if (data.lastResetDate !== today) {
      data.dailySortCount = 0;
      data.lastResetDate = today;
    }

    data.lastSortTimestamp = now;
    data.dailySortCount++;

    // Cache the result if provided
    if (folders) {
      const subscriptionHash = await this.getCurrentSubscriptionHash();
      data.cachedResult = {
        timestamp: now,
        subscriptionHash,
        folders
      };
    }

    await this.saveRateLimitData(data);
  }

  static async getCachedResult(currentChannels: string[]): Promise<any[] | null> {
    const data = await this.getRateLimitData();
    
    if (!data.cachedResult) {
      return null;
    }

    const now = Date.now();
    const cacheAge = now - data.cachedResult.timestamp;
    const cacheMaxAge = this.CACHE_DURATION_MINUTES * 60 * 1000;

    // Check if cache is expired
    if (cacheAge > cacheMaxAge) {
      return null;
    }

    // Check if subscriptions have changed
    const currentHash = await this.hashChannels(currentChannels);
    if (currentHash !== data.cachedResult.subscriptionHash) {
      return null;
    }

    return data.cachedResult.folders;
  }

  static async getCurrentSubscriptionHash(): Promise<string> {
    try {
      const result = await chromeStorage.local.get(['currentChannels']);
      const channels = result.currentChannels || [];
      return await this.hashChannels(channels);
    } catch {
      return '';
    }
  }

  private static async hashChannels(channels: string[]): Promise<string> {
    // Simple hash function for channel list
    const sorted = [...channels].sort().join(',');
    let hash = 0;
    for (let i = 0; i < sorted.length; i++) {
      const char = sorted.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  private static async getRateLimitData(): Promise<RateLimitData> {
    try {
      const result = await chromeStorage.local.get(['rateLimitData']);
      return result.rateLimitData || {
        lastSortTimestamp: 0,
        dailySortCount: 0,
        lastResetDate: new Date().toDateString()
      };
    } catch {
      return {
        lastSortTimestamp: 0,
        dailySortCount: 0,
        lastResetDate: new Date().toDateString()
      };
    }
  }

  private static async saveRateLimitData(data: RateLimitData): Promise<void> {
    await chromeStorage.local.set({ rateLimitData: data });
  }

  static formatWaitTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
}