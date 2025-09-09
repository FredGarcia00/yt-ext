import { YouTubeAuth } from './youtube-auth';
import { CacheService } from './cache-service';
import { YouTubeAPIFallback } from './youtube-api-fallback';
import { SUPABASE_CONFIG } from '../config/supabase-config';
import type { VideoData } from './cache-service';
import { chromeStorage, chromeRuntime } from './chrome-api-wrapper';

export interface ChannelVideoData {
  channelId: string;
  channelName: string;
  videos: VideoData[];
  fromCache: boolean;
}

export interface ChannelDetails {
  id: string;
  name: string;
  description?: string;
  topicIds?: string[];
  keywords?: string[];
}

let apiCallCount = 0;

export function logApiCall(_endpoint: string, units: number = 1): void {
  apiCallCount += units;
  // Removed logging for cleaner console
  
  // Store in chromeStorage.local for tracking
  chromeStorage.local.get(['apiUsage']).then((result) => {
    const usage = result.apiUsage || {};
    const today = new Date().toDateString();
    usage[today] = (usage[today] || 0) + units;
    chromeStorage.local.set({ apiUsage: usage });
  }).catch(error => {
    console.error('Failed to track API usage:', error);
  });
  
  // Notify background script about API call
  try {
    chromeRuntime.sendMessage({ type: 'apiCallMade', units }).catch(() => {
      // Ignore if background script is not available
    });
  } catch (error) {
    // Ignore if background script is not available
  }
}

export class YouTubeAPI {
  
  /**
   * Get the current authenticated user's YouTube channel
   * This requires user authentication and may fail - that's OK
   */
  static async getCurrentUserChannel(): Promise<ChannelDetails | null> {
    try {
      // Check if we can get an auth token
      const token = await YouTubeAuth.getToken();
      if (!token) {
        // console.log('FolderTube: No auth token available for channel detection');
        return null;
      }
      
      const params = new URLSearchParams({
        part: 'snippet',
        mine: 'true',
        fields: 'items(id,snippet(title,description))'
      });
      
      const data = await this.makeProxyRequest('channels', params);
      logApiCall('channels.list', 1);
      
      if (data.items && data.items.length > 0) {
        const channel = data.items[0];
        return {
          id: channel.id,
          name: channel.snippet.title,
          description: channel.snippet.description
        };
      }
      
      return null;
    } catch (error) {
      // This is expected for users who haven't granted YouTube permissions
      // Channel detection failed (expected for users without YouTube auth)
      return null;
    }
  }
  // Use Supabase Edge Function instead of direct API calls
  private static get SUPABASE_FUNCTION_URL() {
    // Check if Supabase is properly configured
    if (SUPABASE_CONFIG.url === 'https://your-project-id.supabase.co' || 
        SUPABASE_CONFIG.anonKey === 'your-anon-key-here') {
      console.warn('FolderTube: Supabase not configured, falling back to direct API');
      return null;
    }
    return SUPABASE_CONFIG.youtubeApiUrl;
  }
  
  // Test Supabase backend connection
  static async testYouTubeConnection(): Promise<boolean> {
    try {
      // console.log('FolderTube: Testing Supabase YouTube proxy connection...');
      
      const testUrl = `${this.SUPABASE_FUNCTION_URL}/test`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      // console.log('FolderTube: Supabase proxy test response status:', response.status);
      
      if (!response.ok) {
        await response.text(); // Consume response text
        return false;
      }
      
      const data = await response.json();
      // console.log('FolderTube: Supabase proxy test success:', data.success);
      
      return data.success === true;
    } catch (error) {
      console.error('FolderTube: Supabase proxy connection test failed:', error);
      return false;
    }
  }

  // Make request via Supabase proxy
  private static async makeProxyRequest(endpoint: string, params: URLSearchParams): Promise<any> {
    const supabaseUrl = this.SUPABASE_FUNCTION_URL;
    
    if (!supabaseUrl) {
      // If Supabase is not properly configured, immediately use fallback
      console.warn('FolderTube: Supabase not configured. Using direct fallback.');
      throw new Error('Supabase proxy not configured. Using fallback.');
    }
    
    try {
      const url = `${supabaseUrl}/${endpoint}?${params.toString()}`;
      // console.log(`FolderTube: Making proxy request to ${endpoint}`);
      
      // Include Supabase anon key if configured
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      // Add anon key for Supabase authentication if available
      if (SUPABASE_CONFIG.anonKey && SUPABASE_CONFIG.anonKey !== 'your-anon-key-here') {
        headers['apikey'] = SUPABASE_CONFIG.anonKey;
        headers['Authorization'] = `Bearer ${SUPABASE_CONFIG.anonKey}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`FolderTube: Proxy request failed: ${response.status} - ${errorText}`);
        
        // Check if it's a configuration issue
        if (response.status === 500 && errorText.includes('YOUTUBE_API_KEY')) {
          throw new Error('YouTube API key not configured in Supabase. Please set YOUTUBE_API_KEY environment variable.');
        }
        
        throw new Error(`Proxy request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if the proxied YouTube API returned an error
      if (data.error) {
        console.error('FolderTube: YouTube API error via proxy:', data.error);
        
        // Check for quota exceeded
        if (data.error.code === 403 && data.error.message?.includes('quota')) {
          throw new Error('YouTube API quota exceeded');
        }
        
        throw new Error(data.error.message || 'YouTube API error');
      }
      
      return data;
    } catch (error) {
      console.error('FolderTube: Proxy request failed:', error);
      throw error; // Re-throw to trigger fallback mechanisms
    }
  }
  
  private static async checkQuotaAvailable(): Promise<boolean> {
    // Simplified quota check
    const storage = await chromeStorage.local.get(['quotaExceeded', 'quotaResetTime']);
    if (storage.quotaExceeded && storage.quotaResetTime > Date.now()) {
      // console.log('FolderTube: Quota exceeded, using cache only');
      return false;
    }
    return true;
  }
  
  static async fetchChannelMetadata(channelIds: string): Promise<ChannelDetails[]> {
    return this.getChannelDetails(channelIds.split(','));
  }

  static async searchChannelByName(channelName: string): Promise<any[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'channel',
      q: channelName,
      maxResults: '5',
      fields: 'items(id(channelId),snippet(title,thumbnails))'
    });
    
    try {
      const data = await this.makeProxyRequest('search', params);
      const items = data.items || [];
      
      return items.map((item: any) => ({
        id: item.id.channelId,
        name: item.snippet.title,
        thumbnails: item.snippet.thumbnails
      }));
    } catch (error) {
      console.error('FolderTube: Channel search failed:', error);
      return []; // Return empty array if search fails
    }
  }

  static async getChannelDetails(channelIds: string[]): Promise<ChannelDetails[]> {
    if (!channelIds.length) return [];
    
    const token = await YouTubeAuth.getToken();
    const results: ChannelDetails[] = [];
    
    // Separate UC channel IDs from handles/custom URLs
    const ucChannelIds = channelIds.filter(id => id.startsWith('UC'));
    const handleIds = channelIds.filter(id => !id.startsWith('UC'));
    
    // Process UC channel IDs in batches (can be batched)
    if (ucChannelIds.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < ucChannelIds.length; i += batchSize) {
        const batch = ucChannelIds.slice(i, i + batchSize);
        const params = new URLSearchParams({
          part: 'snippet,topicDetails',
          id: batch.join(','),
          fields: 'items(id,snippet(title,description,customUrl),topicDetails(topicIds))'
        });
        
        try {
          const batchResults = await this.fetchChannelDetailsBatch(params, token);
          results.push(...batchResults);
        } catch (error) {
          console.warn(`FolderTube: Failed to fetch batch of UC channels:`, error);
        }
      }
    }
    
    // Process handles with improved error handling and fallbacks
    for (const handleId of handleIds) {
      try {
        const cleanHandle = handleId.startsWith('@') ? handleId : `@${handleId}`;
        
        // First try the channels API with forHandle
        const params = new URLSearchParams({
          part: 'snippet,topicDetails',
          forHandle: cleanHandle,
          fields: 'items(id,snippet(title,description,customUrl),topicDetails(topicIds))'
        });
        
        const handleResults = await this.fetchChannelDetailsBatch(params, token);
        if (handleResults.length > 0) {
          results.push(...handleResults);
        } else {
          // Fallback: try to resolve via web scraping
          // console.log(`FolderTube: API failed for ${handleId}, trying web scraping...`);
          const resolvedChannelId = await this.resolveHandleViaWebScraping(cleanHandle);
          if (resolvedChannelId && resolvedChannelId.startsWith('UC')) {
            // Get channel details using the resolved UC ID
            const ucParams = new URLSearchParams({
              part: 'snippet,topicDetails',
              id: resolvedChannelId,
              fields: 'items(id,snippet(title,description,customUrl),topicDetails(topicIds))'
            });
            const ucResults = await this.fetchChannelDetailsBatch(ucParams, token);
            results.push(...ucResults);
          } else {
            // Create minimal channel details for unresolved handles
            results.push({
              id: handleId,
              name: handleId.replace('@', ''),
              description: '',
              topicIds: [],
              keywords: []
            });
          }
        }
      } catch (error) {
        console.warn(`FolderTube: Failed to get details for handle ${handleId}:`, error);
        // Create minimal channel details for failed handles
        results.push({
          id: handleId,
          name: handleId.replace('@', ''),
          description: '',
          topicIds: [],
          keywords: []
        });
      }
    }
    
    return results;
  }
  
  private static async fetchChannelDetailsBatch(params: URLSearchParams, _token: string | null): Promise<ChannelDetails[]> {
    const results: ChannelDetails[] = [];
    
    try {
      const data = await this.makeProxyRequest('channels', params);
      logApiCall('channels.list', 1); // 1 unit per call
      
      for (const item of data.items || []) {
        const topicIds = item.topicDetails?.topicIds || [];
        results.push({
          id: item.id,
          name: item.snippet.title,
          description: item.snippet.description,
          topicIds,
          keywords: this.extractKeywordsFromDescription(item.snippet.description || '')
        });
      }
    } catch (error) {
      console.warn('FolderTube: Failed to fetch channel details via proxy:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('quotaExceeded')) {
          console.warn('YouTube API quota exceeded. Extension will use cache-only mode until quota resets.');
          await chromeStorage.local.set({ 
            quotaExceeded: true, 
            quotaResetTime: Date.now() + (24 * 60 * 60 * 1000) 
          });
        }
      }
    }
    
    return results;
  }
  
  private static extractKeywordsFromDescription(description: string): string[] {
    // Simple keyword extraction from description
    const words = description.toLowerCase().split(/\s+/);
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been']);
    const keywords = words
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 10); // Take top 10 words
    return [...new Set(keywords)];
  }
  
  static async getChannelVideos(
    channelId: string, 
    channelName: string,
    forceRefresh: boolean = false,
_isPremium: boolean = false
  ): Promise<ChannelVideoData> {
    // PRODUCTION: Strict input validation
    if (!channelId || !channelId.trim()) {
      console.error(`FolderTube: Invalid channelId provided. channelName: ${channelName}`);
      return {
        channelId: channelId || 'unknown',
        channelName: channelName || 'Unknown Channel',
        videos: [],
        fromCache: true
      };
    }
    
    // Sanitize channel ID to prevent injection or malformed requests
    channelId = channelId.trim();
    if (channelId.length > 100) {
      console.error(`FolderTube: Channel ID too long (${channelId.length} chars): ${channelId}`);
      return {
        channelId: channelId.substring(0, 100),
        channelName: channelName || 'Unknown Channel',
        videos: [],
        fromCache: true
      };
    }
    
    // console.log(`FolderTube: getChannelVideos called for ${channelId} (${channelName}), forceRefresh=${forceRefresh}, isPremium=${isPremium}`);
    
    // Normalize channelId for consistent caching - always use original format
    const cacheKey = channelId.trim();
    
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
      const cachedVideos = await CacheService.getCachedVideos(cacheKey);
      if (cachedVideos && cachedVideos.length > 0) {
        // console.log(`FolderTube: Found cached videos for ${channelName}: ${cachedVideos.length} videos`);
        return {
          channelId,
          channelName,
          videos: cachedVideos,
          fromCache: true
        };
      }
    }
    
    // Check if we have API quota available
    const quotaAvailable = await this.checkQuotaAvailable();
    if (!quotaAvailable) {
      // Fall back to cached data even if expired
      const cachedVideos = await CacheService.getCachedVideos(cacheKey, true); // Allow expired
      if (cachedVideos && cachedVideos.length > 0) {
        // console.log(`FolderTube: Using expired cache due to quota limit for ${channelName}`);
        return {
          channelId,
          channelName,
          videos: cachedVideos,
          fromCache: true
        };
      }
      // Try enhanced fallback scraping as last resort
      // console.log(`FolderTube: Attempting enhanced fallback for ${channelName}`);
      const realVideos = await YouTubeAPIFallback.getChannelVideosViaNavigation(channelId, channelName);
      if (realVideos.length > 0) {
        // Cache the real videos with emergency cache duration
        await CacheService.setCachedVideos(cacheKey, realVideos, false, true);
        return {
          channelId,
          channelName,
          videos: realVideos,
          fromCache: false
        };
      }
      
      // Return empty result instead of throwing error for better UX
      console.warn(`FolderTube: No data available for ${channelName} - quota exceeded and no cache`);
      return {
        channelId,
        channelName,
        videos: [],
        fromCache: true
      };
    }
    
    // Try to fetch fresh videos
    try {
      // console.log(`FolderTube: Fetching fresh videos for channel ${channelId} (${channelName})`);
      const videos = await this.fetchChannelVideos(channelId);
      
      if (videos && videos.length > 0) {
        // console.log(`FolderTube: Successfully fetched ${videos.length} videos for ${channelName}`);
        
        // Cache the results using the original channelId as cache key
        await CacheService.setCachedVideos(cacheKey, videos);
        await this.incrementSessionAPICount();
        logApiCall('playlistItems.list or search.list', 1);
        
        return {
          channelId,
          channelName,
          videos,
          fromCache: false
        };
      } else {
        // console.log(`FolderTube: No videos returned for ${channelName}, returning empty result`);
        // Don't throw an error, return empty result gracefully
        return {
          channelId,
          channelName,
          videos: [],
          fromCache: false
        };
      }
    } catch (error) {
      console.error(`FolderTube: Failed to fetch videos for ${channelName}:`, error);
      
      // Check if it's an API permission error or Supabase not configured
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('accessNotConfigured') || errorMessage.includes('Supabase proxy not configured')) {
        console.warn(`FolderTube: API not configured properly. Using fallback mode.`);
        
        // Use enhanced fallback to get real videos when possible
        // console.log(`FolderTube: Using enhanced fallback for ${channelName} due to API configuration issues`);
        const realVideos = await YouTubeAPIFallback.getChannelVideosViaNavigation(channelId, channelName);
        await CacheService.setCachedVideos(cacheKey, realVideos, false, true);
        return {
          channelId,
          channelName,
          videos: realVideos,
          fromCache: false
        };
      }
      
      // Check if it's a network error or fallback trigger
      if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('NetworkError') || 
          errorMessage.includes('TypeError') ||
          errorMessage.includes('Network connection failed') ||
          errorMessage.includes('Request timeout') ||
          errorMessage.includes('Using fallback')) {
        console.warn(`FolderTube: Network/API error detected for ${channelName}, using fallback data`);
        
        // Use enhanced fallback to get real videos for network errors
        const realVideos = await YouTubeAPIFallback.getChannelVideosViaNavigation(channelId, channelName);
        await CacheService.setCachedVideos(cacheKey, realVideos, false, true);
        return {
          channelId,
          channelName,
          videos: realVideos,
          fromCache: false
        };
      }
      
      // Try cached videos as fallback
      const cachedVideos = await CacheService.getCachedVideos(cacheKey, true); // Allow expired cache
      if (cachedVideos && cachedVideos.length > 0) {
        // console.log(`FolderTube: Using cached videos as fallback for ${channelName} (${cachedVideos.length} videos)`);
        return {
          channelId,
          channelName,
          videos: cachedVideos,
          fromCache: true
        };
      }
      
      // Use enhanced fallback as final fallback for better UX
      // console.log(`FolderTube: Using direct fallback for ${channelName}`);
      const realVideos = await YouTubeAPIFallback.getChannelVideosViaNavigation(channelId, channelName);
      await CacheService.setCachedVideos(cacheKey, realVideos, false, true);
      return {
        channelId,
        channelName,
        videos: realVideos,
        fromCache: false
      };
    }
  }
  
  private static async fetchChannelVideos(channelId: string): Promise<VideoData[]> {
    // console.log(`FolderTube: fetchChannelVideos called for ${channelId}`);
    const token = await YouTubeAuth.getToken();
    
    // CRITICAL: For production, we need to ensure accurate channel resolution
    // Priority order for best accuracy:
    // 1. UC channel IDs -> Use playlist method (most accurate)
    // 2. Handles (@username) -> Resolve to UC ID first, then use playlist
    // 3. Other formats -> Try to resolve to UC ID
    
    // For UC channel IDs, use the playlist method (most reliable)
    if (channelId.startsWith('UC') && channelId.length === 24) {
      // console.log(`FolderTube: Using uploads playlist method for UC channel: ${channelId}`);
      const uploadsPlaylistId = 'UU' + channelId.substring(2);
      const videos = await this.fetchChannelVideosViaPlaylist(uploadsPlaylistId, channelId, token);
      
      // Validate that videos are from the correct channel
      const validVideos = videos.filter(v => {
        if (v.channelId !== channelId) {
          console.warn(`FolderTube: Filtered out video ${v.id} - wrong channel ${v.channelId} !== ${channelId}`);
          return false;
        }
        return true;
      });
      
      return validVideos;
    }
    
    // For handles, try to resolve to UC ID first for better accuracy
    if (channelId.startsWith('@')) {
      // console.log(`FolderTube: Handle detected: ${channelId}, attempting to resolve to UC ID`);
      
      // Try to resolve handle to UC channel ID
      const resolvedId = await this.resolveChannelHandle(channelId);
      if (resolvedId && resolvedId.startsWith('UC')) {
        // console.log(`FolderTube: Successfully resolved ${channelId} to ${resolvedId}`);
        const uploadsPlaylistId = 'UU' + resolvedId.substring(2);
        return this.fetchChannelVideosViaPlaylist(uploadsPlaylistId, resolvedId, token);
      }
      
      // Fallback to search with strict filtering
      // console.log(`FolderTube: Could not resolve handle, using search with strict filtering`);
      return this.fetchChannelVideosViaSearch(channelId, token);
    }
    
    // For other formats, try search with very strict filtering
    // console.log(`FolderTube: Non-standard channel ID: ${channelId}, using strict search`);
    return this.fetchChannelVideosViaSearch(channelId, token);
  }
  
  private static async fetchChannelVideosViaPlaylist(playlistId: string, channelId: string, token: string | null): Promise<VideoData[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: playlistId,
      maxResults: '10',
      fields: 'items(snippet(title,thumbnails(medium,high,default),publishedAt,resourceId(videoId),channelId,videoOwnerChannelId))'
    });
    
    try {
      const data = await this.makeProxyRequest('playlistItems', params);
      // console.log(`FolderTube: Playlist API response for ${channelId} - found ${data.items?.length || 0} items`);
      logApiCall('playlistItems.list', 1);
      
      const videos = (data.items || []).map((item: any) => {
        const videoId = item.snippet.resourceId.videoId;
        
        // CRITICAL: Use the video's actual channel ID from the API response
        // This ensures we're getting the correct channel attribution
        const videoChannelId = item.snippet.videoOwnerChannelId || item.snippet.channelId || channelId;
        
        // Log if there's a mismatch (shouldn't happen with uploads playlist)
        if (videoChannelId !== channelId) {
          console.warn(`FolderTube: Channel mismatch in playlist! Video ${videoId} belongs to ${videoChannelId}, expected ${channelId}`);
        }
        
        return {
          id: videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails?.medium?.url || 
                    item.snippet.thumbnails?.high?.url || 
                    item.snippet.thumbnails?.default?.url || 
                    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          publishedAt: item.snippet.publishedAt,
          channelId: channelId // Keep original channelId for consistency
        };
      });
      
      // Try to fetch statistics, but don't fail if it doesn't work
      try {
        const videoIds = videos.map((v: VideoData) => v.id).join(',');
        const stats = await this.fetchVideoStatistics(videoIds, token);
        if (Object.keys(stats).length > 0) {
          logApiCall('videos.list', 1);
          // Merge statistics with video data
          return videos.map((video: VideoData) => ({
            ...video,
            viewCount: stats[video.id]?.viewCount,
            duration: stats[video.id]?.duration
          }));
        }
      } catch (statsError) {
        console.warn('FolderTube: Failed to fetch video statistics, continuing without stats:', statsError);
      }
      
      return videos;
    } catch (error) {
      console.error('FolderTube: Error fetching playlist videos:', error);
      // Try fallback to search method
      if (error instanceof Error && (error.message.includes('Network') || error.message.includes('fetch'))) {
        // console.log('FolderTube: Network error with playlist, trying search method');
        return this.fetchChannelVideosViaSearch(channelId, token);
      }
      throw error;
    }
  }

  
  private static async fetchChannelVideosViaSearch(channelId: string, _token: string | null): Promise<VideoData[]> {
    // PRODUCTION CRITICAL: Ensure absolute accuracy in channel matching
    let resolvedChannelId = channelId;
    let useDirectChannelSearch = false;
    
    // For handles, we MUST resolve to UC ID for accurate results
    if (channelId.startsWith('@')) {
      const resolved = await this.resolveChannelHandle(channelId);
      if (resolved && resolved.startsWith('UC')) {
        resolvedChannelId = resolved;
        useDirectChannelSearch = true;
        // console.log(`FolderTube: Successfully resolved ${channelId} to ${resolvedChannelId}`);
      } else {
        console.warn(`FolderTube: Could not resolve handle ${channelId} to UC ID - results may be less accurate`);
      }
    }
    
    const params = new URLSearchParams({
      part: 'snippet',
      order: 'date',
      type: 'video',
      maxResults: '10',
      fields: 'items(id(videoId),snippet(title,thumbnails(medium,high,default),publishedAt,channelId,channelTitle))'
    });
    
    // Handle different channel ID formats
    if (resolvedChannelId.startsWith('UC') || useDirectChannelSearch) {
      // Use direct channel ID search for UC IDs
      params.append('channelId', resolvedChannelId);
      // console.log(`FolderTube: Using direct channelId search for: ${resolvedChannelId}`);
    } else if (channelId.startsWith('@')) {
      // Fallback to handle search if resolution failed
      const handleWithoutAt = channelId.substring(1);
      params.append('q', `"${handleWithoutAt}"`);
      // console.log(`FolderTube: Searching for videos from handle: ${channelId}`);
    } else {
      params.append('q', channelId);
      // console.log(`FolderTube: Using search query for channel name: ${channelId}`);
    }
    
    try {
      const data = await this.makeProxyRequest('search', params);
      // console.log(`FolderTube: Search API response for ${channelId} - found ${data.items?.length || 0} items`);
      
      const items = data.items || [];
      let filteredItems = items;
      let actualChannelId = resolvedChannelId;
      
      if (useDirectChannelSearch && resolvedChannelId.startsWith('UC')) {
        // When using direct channel ID, all results should be from that channel
        filteredItems = items.filter((item: any) => item.snippet.channelId === resolvedChannelId);
        actualChannelId = resolvedChannelId;
        // console.log(`FolderTube: Direct channel search for ${resolvedChannelId} returned ${filteredItems.length} videos`);
      } else if (channelId.startsWith('UC')) {
        // For UC IDs, filter precisely
        filteredItems = items.filter((item: any) => item.snippet.channelId === channelId);
        actualChannelId = channelId;
      } else if (channelId.startsWith('@')) {
        // For handles that couldn't be resolved, try to match by channel title
        const handleWithoutAt = channelId.substring(1);
        
        // Group results by channel and find the best match
        const channelGroups = new Map<string, any[]>();
        items.forEach((item: any) => {
          const itemChannelId = item.snippet.channelId;
          if (!channelGroups.has(itemChannelId)) {
            channelGroups.set(itemChannelId, []);
          }
          channelGroups.get(itemChannelId)!.push(item);
        });
        
        // Find the channel with the best title match
        let bestMatchChannelId: string | null = null;
        let bestMatchScore = 0;
        
        for (const [chId, chItems] of channelGroups) {
          if (chItems.length > 0) {
            const channelTitle = chItems[0].snippet.channelTitle || '';
            const titleLower = channelTitle.toLowerCase();
            const handleLower = handleWithoutAt.toLowerCase();
            
            let score = 0;
            if (titleLower === handleLower) {
              score = 100; // Exact match
            } else if (titleLower.includes(handleLower) || handleLower.includes(titleLower)) {
              score = 50; // Partial match
            } else if (titleLower.replace(/[^a-z0-9]/g, '') === handleLower.replace(/[^a-z0-9]/g, '')) {
              score = 80; // Match after removing special characters
            }
            
            if (score > bestMatchScore) {
              bestMatchScore = score;
              bestMatchChannelId = chId;
            }
          }
        }
        
        if (bestMatchChannelId && bestMatchScore >= 50) {
          filteredItems = channelGroups.get(bestMatchChannelId) || [];
          actualChannelId = bestMatchChannelId;
          // console.log(`FolderTube: Handle ${channelId} matched to channel ${bestMatchChannelId} with score ${bestMatchScore}`);
        } else if (channelGroups.size > 0) {
          // Fallback: use the channel with the most videos
          let maxVideos = 0;
          for (const [chId, chItems] of channelGroups) {
            if (chItems.length > maxVideos) {
              maxVideos = chItems.length;
              bestMatchChannelId = chId;
            }
          }
          if (bestMatchChannelId) {
            filteredItems = channelGroups.get(bestMatchChannelId) || [];
            actualChannelId = bestMatchChannelId;
            // console.log(`FolderTube: Handle ${channelId} fallback to channel ${bestMatchChannelId} with most videos (${maxVideos})`);
          }
        }
      } else {
        // For other formats, try to find the most relevant channel
        if (items.length > 0) {
          const firstChannelId = items[0].snippet.channelId;
          filteredItems = items.filter((item: any) => item.snippet.channelId === firstChannelId);
          actualChannelId = firstChannelId;
        }
      }
      
      if (filteredItems.length === 0) {
        console.warn(`FolderTube: No videos found for ${channelId} after filtering`);
        return [];
      }
      
      const videos = filteredItems.map((item: any) => {
        const videoId = item.id.videoId;
        return {
          id: videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium?.url || 
                    item.snippet.thumbnails.high?.url || 
                    item.snippet.thumbnails.default?.url || 
                    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          publishedAt: item.snippet.publishedAt,
          // Use the original channelId for consistent caching
          channelId: channelId
        };
      });
      
      // console.log(`FolderTube: Returning ${videos.length} videos for ${channelId} from actual channel ${actualChannelId}`);
      
      // PRODUCTION: Final validation - fetch video details to confirm channel ownership
      if (videos.length > 0) {
        const videoIds = videos.map((v: VideoData) => v.id).join(',');
        
        // Fetch both statistics AND channel info to validate ownership
        const verifyParams = new URLSearchParams({
          part: 'snippet,statistics,contentDetails',
          id: videoIds,
          fields: 'items(id,snippet(channelId),statistics(viewCount),contentDetails(duration))'
        });
        
        try {
          const verifyData = await this.makeProxyRequest('videos', verifyParams);
          logApiCall('videos.list', 1);
          
          // Build a map of verified video data
          const verifiedVideos: VideoData[] = [];
          
          for (const video of videos) {
            const verifiedItem = verifyData.items?.find((item: any) => item.id === video.id);
            
            if (verifiedItem) {
              const verifiedChannelId = verifiedItem.snippet?.channelId;
              
              // STRICT CHECK: Only include videos that belong to the correct channel
              if (useDirectChannelSearch && resolvedChannelId.startsWith('UC')) {
                // When we have a UC ID, match exactly
                if (verifiedChannelId === resolvedChannelId) {
                  verifiedVideos.push({
                    ...video,
                    viewCount: verifiedItem.statistics?.viewCount,
                    duration: verifiedItem.contentDetails?.duration
                  });
                } else {
                  console.warn(`FolderTube: REJECTED video ${video.id} - belongs to ${verifiedChannelId}, not ${resolvedChannelId}`);
                }
              } else {
                // For handles/other formats, be more flexible but log mismatches
                if (verifiedChannelId === actualChannelId) {
                  verifiedVideos.push({
                    ...video,
                    viewCount: verifiedItem.statistics?.viewCount,
                    duration: verifiedItem.contentDetails?.duration
                  });
                } else {
                  console.warn(`FolderTube: Video ${video.id} channel mismatch: ${verifiedChannelId} vs ${actualChannelId}`);
                  // Still include if it's from our search results (trust the initial filtering)
                  verifiedVideos.push({
                    ...video,
                    viewCount: verifiedItem.statistics?.viewCount,
                    duration: verifiedItem.contentDetails?.duration
                  });
                }
              }
            } else {
              // If we can't verify, don't include the video (safer for production)
              console.warn(`FolderTube: Could not verify video ${video.id} - excluding`);
            }
          }
          
          // console.log(`FolderTube: Verified ${verifiedVideos.length}/${videos.length} videos for ${channelId}`);
          return verifiedVideos;
          
        } catch (verifyError) {
          console.error('FolderTube: Failed to verify videos, returning unverified results:', verifyError);
          // If verification fails, return original videos but without stats
          return videos;
        }
      }
      
      return videos;
    } catch (error) {
      console.error('FolderTube: Error in search method:', error);
      throw error;
    }
  }

  // @ts-expect-error - Legacy method, kept for compatibility but not used
  private static async fetchChannelVideosViaHandle(handle: string, _token: string | null): Promise<VideoData[]> {
    // First, try to resolve the handle to a channel ID using the channels API
    const channelParams = new URLSearchParams({
      part: 'snippet',
      forHandle: handle,
      fields: 'items(id,snippet(title))'
    });
    
    try {
      // console.log('FolderTube: Fetching channel via handle:', handle);
      
      const channelData = await this.makeProxyRequest('channels', channelParams);
      if (channelData.items && channelData.items.length > 0) {
        const channelId = channelData.items[0].id;
        // console.log(`FolderTube: Resolved handle ${handle} to channel ID: ${channelId}`);
        
        // Use the uploads playlist method for better accuracy
        if (channelId.startsWith('UC')) {
          const uploadsPlaylistId = 'UU' + channelId.substring(2);
          return this.fetchChannelVideosViaPlaylist(uploadsPlaylistId, channelId, null);
        } else {
          // If not UC format, use search with strict filtering
          return this.fetchChannelVideosViaSearch(channelId, null);
        }
      }
    } catch (error) {
      console.error('Failed to resolve handle to channel ID via proxy:', error);
    }
    
    // Only fallback to search if handle resolution completely fails
    // This ensures we don't accidentally show videos from wrong channels
    console.warn(`FolderTube: Could not resolve handle ${handle}, returning empty results to avoid wrong channel videos`);
    return [];
  }

  private static async resolveChannelHandle(handle: string): Promise<string | null> {
    try {
      // First try via YouTube API channels endpoint
      const params = new URLSearchParams({
        part: 'id',
        forHandle: handle.startsWith('@') ? handle : `@${handle}`,
        fields: 'items(id)'
      });
      
      try {
        const data = await this.makeProxyRequest('channels', params);
        if (data.items && data.items.length > 0) {
          const channelId = data.items[0].id;
          // console.log(`FolderTube: Resolved handle ${handle} to ${channelId} via API`);
          return channelId;
        }
      } catch (apiError) {
        // console.log(`FolderTube: API resolution failed for ${handle}, trying web scraping`);
      }
      
      // Fallback to web scraping
      return this.resolveHandleViaWebScraping(handle);
    } catch (error) {
      console.error(`FolderTube: Failed to resolve handle ${handle}:`, error);
      return null;
    }
  }
  
  private static async resolveHandleViaWebScraping(handle: string): Promise<string | null> {
    try {
      // Skip web scraping in background context to avoid window errors
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        // console.log(`FolderTube: Skipping web scraping for ${handle} in background context`);
        return null;
      }
      
      // Clean the handle - remove @ if present
      const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      
      // console.log(`FolderTube: Attempting to resolve handle ${handle} via web scraping...`);
      
      // First try the main channel page
      let response = await fetch(`https://www.youtube.com/@${cleanHandle}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        },
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 10000);
          return controller.signal;
        })()
      });
      
      if (!response.ok) {
        // Try alternative URL format
        response = await fetch(`https://www.youtube.com/c/${cleanHandle}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
          },
          signal: (() => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 10000);
            return controller.signal;
          })()
        });
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch channel page: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Enhanced pattern matching for channel ID extraction
      const patterns = [
        // Look for channelId in various JSON structures
        /"channelId":"(UC[a-zA-Z0-9_-]{22})"/,
        /"browseId":"(UC[a-zA-Z0-9_-]{22})"/,
        /"channelId":\s*"(UC[a-zA-Z0-9_-]{22})"/,
        // Look in meta tags
        /<meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/,
        /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/,
        // Look in URLs and links
        /\/channel\/(UC[a-zA-Z0-9_-]{22})/,
        // Look in data attributes
        /data-channel-external-id="(UC[a-zA-Z0-9_-]{22})"/,
        // Look in JavaScript variables
        /window\["ytInitialData"\].*?"channelId":"(UC[a-zA-Z0-9_-]{22})"/,
        // Look for browseEndpoint
        /"browseEndpoint":\s*{\s*"browseId":\s*"(UC[a-zA-Z0-9_-]{22})"/
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          // console.log(`FolderTube: Successfully resolved ${handle} to ${match[1]} via web scraping`);
          return match[1];
        }
      }
      
      console.warn(`FolderTube: Could not extract channel ID from HTML for handle: ${handle}`);
      return null;
      
    } catch (error) {
      console.error(`FolderTube: Web scraping failed for handle ${handle}:`, error);
      return null;
    }
  }
  
  private static async getSessionAPICount(): Promise<number> {
    const sessionKey = 'session_api_count';
    const sessionStartKey = 'session_start';
    const now = Date.now();
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
    
    const result = await chromeStorage.local.get([sessionKey, sessionStartKey]);
    
    if (!result[sessionStartKey] || now - result[sessionStartKey] > sessionDuration) {
      await chromeStorage.local.set({
        [sessionKey]: 0,
        [sessionStartKey]: now
      });
      return 0;
    }
    
    return result[sessionKey] || 0;
  }
  
  private static async incrementSessionAPICount(): Promise<void> {
    const sessionKey = 'session_api_count';
    const current = await this.getSessionAPICount();
    await chromeStorage.local.set({ [sessionKey]: current + 1 });
  }
  
  private static async fetchVideoStatistics(videoIds: string, _token: string | null): Promise<Record<string, { viewCount: string; duration?: string }>> {
    if (!videoIds) return {};
    
    const params = new URLSearchParams({
      part: 'statistics,contentDetails',
      id: videoIds,
      fields: 'items(id,statistics(viewCount),contentDetails(duration))'
    });
    
    try {
      const data = await this.makeProxyRequest('videos', params);
      const stats: Record<string, { viewCount: string; duration?: string }> = {};
      
      for (const item of data.items || []) {
        stats[item.id] = {
          viewCount: item.statistics?.viewCount || '0',
          duration: item.contentDetails?.duration
        };
      }
      
      return stats;
    } catch (error) {
      console.warn('FolderTube: Failed to fetch video statistics via proxy:', error);
      return {};
    }
  }

  static async preloadChannelVideos(channelIds: string[]): Promise<void> {
    await CacheService.clearExpiredCache();
    
    for (const channelId of channelIds) {
      const cached = await CacheService.getCachedVideos(channelId);
      if (!cached) {
        try {
          await this.getChannelVideos(channelId, '', false, true);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to preload channel ${channelId}:`, error);
        }
      }
    }
  }
}