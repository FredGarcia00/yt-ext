import { YouTubeAuth } from './youtube-auth';
import { CacheService } from './cache-service';
import type { VideoData } from './cache-service';

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

export function logApiCall(endpoint: string, units: number = 1): void {
  apiCallCount += units;
  const timestamp = new Date().toISOString();
  console.log(`FolderTube API Call: ${timestamp} - ${endpoint} (${units} units) - Total: ${apiCallCount} units`);
  
  // Store in chrome.storage.local for tracking
  chrome.storage.local.get(['apiUsage'], (result) => {
    const usage = result.apiUsage || {};
    const today = new Date().toDateString();
    usage[today] = (usage[today] || 0) + units;
    chrome.storage.local.set({ apiUsage: usage });
  });
}

export class YouTubeAPI {
  private static API_BASE = 'https://www.googleapis.com/youtube/v3';
  
  static async fetchChannelMetadata(channelIds: string): Promise<ChannelDetails[]> {
    return this.getChannelDetails(channelIds.split(','));
  }

  static async getChannelDetails(channelIds: string[]): Promise<ChannelDetails[]> {
    if (!channelIds.length) return [];
    
    const token = await YouTubeAuth.getToken();
    
    // Batch API calls (max 50 channels per request)
    const batchSize = 50;
    const results: ChannelDetails[] = [];
    
    for (let i = 0; i < channelIds.length; i += batchSize) {
      const batch = channelIds.slice(i, i + batchSize);
      const params = new URLSearchParams({
        part: 'snippet,topicDetails',
        id: batch.join(','),
        fields: 'items(id,snippet(title,description,customUrl),topicDetails(topicIds))'
      });
      
      if (!token) {
        const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
        if (!apiKey) {
          console.log('FolderTube: No YouTube API key configured');
          throw new Error('YouTube API key not configured');
        }
        params.append('key', apiKey);
      }
      
      const headers: HeadersInit = {
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      try {
        const response = await fetch(
          `${this.API_BASE}/channels?${params}`,
          { headers }
        );
        
        if (!response.ok) {
          console.error('Failed to fetch channel details:', response.status);
          continue;
        }
        
        const data = await response.json();
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
        console.error('Error fetching channel details:', error);
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
    isPremium: boolean = true // Default to premium for now to test functionality
  ): Promise<ChannelVideoData> {
    console.log(`FolderTube: getChannelVideos called for ${channelId} (${channelName}), forceRefresh=${forceRefresh}, isPremium=${isPremium}`);
    
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
      const cachedVideos = await CacheService.getCachedVideos(channelId);
      if (cachedVideos && cachedVideos.length > 0) {
        console.log(`FolderTube: Found cached videos for ${channelName}: ${cachedVideos.length} videos`);
        return {
          channelId,
          channelName,
          videos: cachedVideos,
          fromCache: true
        };
      }
    }
    
    // Try to fetch fresh videos
    try {
      console.log(`FolderTube: Fetching fresh videos for channel ${channelId} (${channelName})`);
      const videos = await this.fetchChannelVideos(channelId);
      
      if (videos && videos.length > 0) {
        console.log(`FolderTube: Successfully fetched ${videos.length} videos for ${channelName}`);
        
        // Cache the results
        await CacheService.setCachedVideos(channelId, videos);
        await this.incrementSessionAPICount();
        logApiCall('playlistItems.list or search.list', 1);
        
        return {
          channelId,
          channelName,
          videos,
          fromCache: false
        };
      } else {
        console.log(`FolderTube: No videos returned for ${channelName}`);
        throw new Error('No videos found for this channel');
      }
    } catch (error) {
      console.error(`FolderTube: Failed to fetch videos for ${channelName}:`, error);
      
      // Try cached videos as fallback
      const cachedVideos = await CacheService.getCachedVideos(channelId);
      if (cachedVideos && cachedVideos.length > 0) {
        console.log(`FolderTube: Using cached videos as fallback for ${channelName} (${cachedVideos.length} videos)`);
        return {
          channelId,
          channelName,
          videos: cachedVideos,
          fromCache: true
        };
      }
      
      // No cache available, throw the error
      throw error;
    }
  }
  
  private static async fetchChannelVideos(channelId: string): Promise<VideoData[]> {
    console.log(`FolderTube: fetchChannelVideos called for ${channelId}`);
    const token = await YouTubeAuth.getToken();
    console.log(`FolderTube: OAuth token available: ${!!token}`);
    
    // Handle different channel ID formats with improved logic
    let searchValue = '';
    let useUploadsPlaylist = false;
    
    if (channelId.startsWith('UC')) {
      // For proper YouTube channel IDs, use the uploads playlist method (more reliable)
      useUploadsPlaylist = true;
      searchValue = 'UU' + channelId.substring(2); // Convert UC to UU for uploads playlist
    } else {
      // This might be a handle or custom URL - use search with channelId filter
      searchValue = channelId;
    }
    
    const params = new URLSearchParams({
      part: 'snippet',
      maxResults: '10', // Increased from 4 to 10 for better categorization accuracy
      fields: useUploadsPlaylist 
        ? 'items(snippet(title,thumbnails(medium),publishedAt,resourceId(videoId)))'
        : 'items(id(videoId),snippet(title,thumbnails(medium),publishedAt,channelId))'
    });
    
    if (useUploadsPlaylist) {
      params.append('playlistId', searchValue);
    } else {
      // For handles, we need to first resolve to channel ID
      if (searchValue.startsWith('@')) {
        // This is a handle, we need to resolve it to a channel ID first
        return this.fetchChannelVideosViaHandle(searchValue, token);
      } else {
        // For other non-UC channel IDs, use search fallback
        return this.fetchChannelVideosViaSearch(searchValue, token);
      }
    }
    
    // Use API key if no OAuth token available
    if (!token) {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      console.log(`FolderTube: Using API key: ${apiKey ? 'Available' : 'Missing'}`);
      if (!apiKey) {
        // Gracefully degrade to cache-only mode when no API key is available
        console.log('FolderTube: No YouTube API key configured, falling back to cache');
        throw new Error('YouTube API key not configured. Extension will use cache-only mode.');
      }
      params.append('key', apiKey);
      console.log(`FolderTube: API request URL will be: ${this.API_BASE}/${useUploadsPlaylist ? 'playlistItems' : 'search'}?${params}`);
    }
    
    const headers: HeadersInit = {
      'Accept': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const endpoint = useUploadsPlaylist ? 'playlistItems' : 'search';
    
    // Create timeout signal compatible with older Chrome versions
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(
      `${this.API_BASE}/${endpoint}?${params}`,
      { 
        headers,
        signal: controller.signal
      }
    ).catch(error => {
      clearTimeout(timeoutId);
      console.error(`FolderTube: API request failed for ${endpoint}:`, error);
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }
      if (error.message?.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection.');
      }
      throw new Error(`Network request failed: ${error.message}`);
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      if (response.status === 401) {
        await YouTubeAuth.revokeToken();
        throw new Error('Authentication expired. Please re-authenticate.');
      }
      
      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.includes('quota') || errorText.includes('exceeded')) {
          throw new Error('YouTube API quota exceeded. Videos will load from cache when available.');
        }
        throw new Error('Access forbidden. Please check your API permissions.');
      }
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      
      // If uploads playlist method fails, fallback to search
      if (useUploadsPlaylist && response.status === 404) {
        console.log(`FolderTube: Uploads playlist not found for ${channelId}, falling back to search`);
        return this.fetchChannelVideosViaSearch(channelId, token);
      }
      
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      // If no items found with current method, try fallback
      if (useUploadsPlaylist) {
        console.log(`FolderTube: No videos found via uploads playlist for ${channelId}, trying search fallback`);
        return this.fetchChannelVideosViaSearch(channelId, token);
      }
      return [];
    }
    
    // For search results, filter to ensure videos are from the correct channel
    const items = data.items || [];
    const filteredItems = !useUploadsPlaylist && channelId.startsWith('UC')
      ? items.filter((item: any) => item.snippet.channelId === channelId)
      : items; // For uploads playlist, all videos are from the channel
    
    const videos = filteredItems.map((item: any) => {
      const videoId = useUploadsPlaylist ? item.snippet.resourceId.videoId : item.id.videoId;
      return {
        id: videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium?.url || 
                  item.snippet.thumbnails.high?.url || 
                  item.snippet.thumbnails.default?.url || 
                  `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        publishedAt: item.snippet.publishedAt,
        channelId: useUploadsPlaylist ? channelId : (item.snippet.channelId || channelId)
      };
    });
    
    // Fetch statistics for the videos
    const videoIds = videos.map((v: VideoData) => v.id).join(',');
    const stats = await this.fetchVideoStatistics(videoIds, token);
    if (Object.keys(stats).length > 0) {
      logApiCall('videos.list', 1);
    }
    
    // Merge statistics with video data
    return videos.map((video: VideoData) => ({
      ...video,
      viewCount: stats[video.id]?.viewCount
    }));
  }
  
  private static async fetchChannelVideosViaSearch(channelId: string, token: string | null): Promise<VideoData[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      order: 'date',
      type: 'video',
      maxResults: '10', // Increased from 4 to 10 for better categorization accuracy // Always use 4 - no need for more
      fields: 'items(id(videoId),snippet(title,thumbnails(medium),publishedAt,channelId,channelTitle))'
    });
    
    // ONLY use channelId parameter for proper UC channel IDs
    if (channelId.startsWith('UC')) {
      params.append('channelId', channelId);
    } else {
      // For non-UC channels, this method should not be used
      // Return empty to avoid showing wrong videos
      console.warn(`FolderTube: Search method called with non-UC channel ID: ${channelId}`);
      return [];
    }
    
    if (!token) {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) {
        console.log('FolderTube: No YouTube API key configured, falling back to cache');
        throw new Error('YouTube API key not configured. Extension will use cache-only mode.');
      }
      params.append('key', apiKey);
    }
    
    const headers: HeadersInit = {
      'Accept': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(
      `${this.API_BASE}/search?${params}`,
      { 
        headers,
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 15000);
          return controller.signal;
        })()
      }
    ).catch(error => {
      console.error(`FolderTube: Search API request failed:`, error);
      if (error.name === 'TimeoutError') {
        throw new Error('Request timed out. Please check your internet connection.');
      }
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled. Please try again.');
      }
      throw new Error(`Network request failed: ${error.message}`);
    });
    
    if (!response.ok) {
      throw new Error(`Search fallback failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const items = data.items || [];
    
    // Double-check filtering: ALL videos must be from the exact channel
    const filteredItems = items.filter((item: any) => {
      const videoChannelId = item.snippet.channelId;
      if (videoChannelId !== channelId) {
        console.warn(`FolderTube: Filtering out video from wrong channel. Expected: ${channelId}, Got: ${videoChannelId}`);
        return false;
      }
      return true;
    });
    
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
        channelId: item.snippet.channelId
      };
    });
    
    // Fetch statistics for the videos
    const videoIds = videos.map((v: VideoData) => v.id).join(',');
    const stats = await this.fetchVideoStatistics(videoIds, token);
    if (Object.keys(stats).length > 0) {
      logApiCall('videos.list', 1);
    }
    
    // Merge statistics with video data
    return videos.map((video: VideoData) => ({
      ...video,
      viewCount: stats[video.id]?.viewCount
    }));
  }
  
  private static async fetchChannelVideosViaPlaylist(playlistId: string, channelId: string, token: string | null): Promise<VideoData[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: playlistId,
      maxResults: '10', // Increased from 4 to 10 for better categorization accuracy
      fields: 'items(snippet(title,thumbnails(medium),publishedAt,resourceId(videoId)))'
    });
    
    if (!token) {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) {
        console.log('FolderTube: No YouTube API key configured, falling back to cache');
        throw new Error('YouTube API key not configured. Extension will use cache-only mode.');
      }
      params.append('key', apiKey);
    }
    
    const headers: HeadersInit = {
      'Accept': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(
      `${this.API_BASE}/playlistItems?${params}`,
      { 
        headers,
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 15000);
          return controller.signal;
        })()
      }
    ).catch(error => {
      console.error(`FolderTube: Playlist API request failed:`, error);
      if (error.name === 'TimeoutError') {
        throw new Error('Request timed out. Please check your internet connection.');
      }
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled. Please try again.');
      }
      throw new Error(`Network request failed: ${error.message}`);
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // Playlist not found, fallback to search
        return this.fetchChannelVideosViaSearch(channelId, token);
      }
      throw new Error(`Playlist request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const items = data.items || [];
    
    const videos = items.map((item: any) => {
      const videoId = item.snippet.resourceId.videoId;
      return {
        id: videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.medium?.url || 
                  item.snippet.thumbnails.high?.url || 
                  item.snippet.thumbnails.default?.url || 
                  `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        publishedAt: item.snippet.publishedAt,
        channelId: channelId
      };
    });
    
    // Fetch statistics for the videos
    const videoIds = videos.map((v: VideoData) => v.id).join(',');
    const stats = await this.fetchVideoStatistics(videoIds, token);
    if (Object.keys(stats).length > 0) {
      logApiCall('videos.list', 1);
    }
    
    // Merge statistics with video data
    return videos.map((video: VideoData) => ({
      ...video,
      viewCount: stats[video.id]?.viewCount
    }));
  }

  private static async fetchChannelVideosViaHandle(handle: string, token: string | null): Promise<VideoData[]> {
    // First, try to resolve the handle to a channel ID using the channels API
    const channelParams = new URLSearchParams({
      part: 'snippet',
      forHandle: handle,
      fields: 'items(id,snippet(title))'
    });
    
    if (!token) {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) {
        console.log('FolderTube: No YouTube API key configured, cannot resolve handle');
        throw new Error('YouTube API key not configured. Extension will use cache-only mode.');
      }
      channelParams.append('key', apiKey);
    }
    
    const headers: HeadersInit = {
      'Accept': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const channelResponse = await fetch(
        `${this.API_BASE}/channels?${channelParams}`,
        { 
          headers,
          signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 15000);
          return controller.signal;
        })()
        }
      ).catch(error => {
        console.error(`FolderTube: Channels API request failed:`, error);
        if (error.name === 'TimeoutError') {
          throw new Error('Request timed out. Please check your internet connection.');
        }
        if (error.name === 'AbortError') {
          throw new Error('Request was cancelled. Please try again.');
        }
        throw new Error(`Network request failed: ${error.message}`);
      });
      
      if (channelResponse.ok) {
        const channelData = await channelResponse.json();
        if (channelData.items && channelData.items.length > 0) {
          const channelId = channelData.items[0].id;
          console.log(`FolderTube: Resolved handle ${handle} to channel ID: ${channelId}`);
          
          // Use the uploads playlist method for better accuracy
          if (channelId.startsWith('UC')) {
            const uploadsPlaylistId = 'UU' + channelId.substring(2);
            return this.fetchChannelVideosViaPlaylist(uploadsPlaylistId, channelId, token);
          } else {
            // If not UC format, use search with strict filtering
            return this.fetchChannelVideosViaSearch(channelId, token);
          }
        }
      } else {
        // Handle specific API errors
        try {
          const errorData = await channelResponse.json();
          if (errorData.error) {
            if (errorData.error.code === 403 && errorData.error.message.includes('YouTube Data API v3 has not been used')) {
              console.error(`FolderTube: YouTube Data API v3 is not enabled for this project. Please enable it at: https://console.developers.google.com/apis/api/youtube.googleapis.com/overview`);
            } else if (errorData.error.code === 403) {
              console.error(`FolderTube: API access denied. Error: ${errorData.error.message}`);
            } else if (errorData.error.code === 400) {
              console.error(`FolderTube: Invalid API request for handle ${handle}. Error: ${errorData.error.message}`);
            } else {
              console.error(`FolderTube: API error ${errorData.error.code}: ${errorData.error.message}`);
            }
          }
        } catch (parseError) {
          console.warn(`FolderTube: Failed to resolve handle ${handle} to channel ID, response status: ${channelResponse.status}`);
        }
      }
    } catch (error) {
      console.error('Failed to resolve handle to channel ID:', error);
    }
    
    // Try web scraping fallback when API fails
    console.log(`FolderTube: API resolution failed for ${handle}, trying web scraping fallback`);
    try {
      const channelId = await this.resolveHandleViaWebScraping(handle);
      if (channelId) {
        console.log(`FolderTube: Web scraping resolved ${handle} to channel ID: ${channelId}`);
        // Use the resolved channel ID to fetch videos
        if (channelId.startsWith('UC')) {
          const uploadsPlaylistId = 'UU' + channelId.substring(2);
          return this.fetchChannelVideosViaPlaylist(uploadsPlaylistId, channelId, token);
        } else {
          return this.fetchChannelVideosViaSearch(channelId, token);
        }
      }
    } catch (scrapingError) {
      console.error('Web scraping fallback also failed:', scrapingError);
    }
    
    // Only fallback to search if handle resolution completely fails
    // This ensures we don't accidentally show videos from wrong channels
    console.warn(`FolderTube: Could not resolve handle ${handle}, returning empty results to avoid wrong channel videos`);
    return [];
  }

  private static async resolveHandleViaWebScraping(handle: string): Promise<string | null> {
    try {
      // Clean the handle - remove @ if present
      const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
      
      // Fetch the YouTube channel page
      const response = await fetch(`https://www.youtube.com/@${cleanHandle}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch channel page: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Look for channel ID in various places in the HTML
      // Method 1: Look for channelId in ytInitialData
      const channelIdMatch1 = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
      if (channelIdMatch1) {
        return channelIdMatch1[1];
      }
      
      // Method 2: Look for channel ID in meta tags
      const channelIdMatch2 = html.match(/<meta property="og:url" content="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/);
      if (channelIdMatch2) {
        return channelIdMatch2[1];
      }
      
      // Method 3: Look for channel ID in links
      const channelIdMatch3 = html.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
      if (channelIdMatch3) {
        return channelIdMatch3[1];
      }
      
      // Method 4: Look in ytInitialPlayerResponse
      const channelIdMatch4 = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
      if (channelIdMatch4) {
        return channelIdMatch4[1];
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
    
    const result = await chrome.storage.local.get([sessionKey, sessionStartKey]);
    
    if (!result[sessionStartKey] || now - result[sessionStartKey] > sessionDuration) {
      await chrome.storage.local.set({
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
    await chrome.storage.local.set({ [sessionKey]: current + 1 });
  }
  
  private static async fetchVideoStatistics(videoIds: string, token: string | null): Promise<Record<string, { viewCount: string }>> {
    if (!videoIds) return {};
    
    const params = new URLSearchParams({
      part: 'statistics',
      id: videoIds,
      fields: 'items(id,statistics(viewCount))'
    });
    
    if (!token) {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) {
        console.log('FolderTube: No YouTube API key configured, falling back to cache');
        throw new Error('YouTube API key not configured. Extension will use cache-only mode.');
      }
      params.append('key', apiKey);
    }
    
    const headers: HeadersInit = {
      'Accept': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(
        `${this.API_BASE}/videos?${params}`,
        { 
          headers,
          signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 15000);
          return controller.signal;
        })()
        }
      ).catch(error => {
        console.error(`FolderTube: Videos API request failed:`, error);
        if (error.name === 'TimeoutError') {
          throw new Error('Request timed out. Please check your internet connection.');
        }
        if (error.name === 'AbortError') {
          throw new Error('Request was cancelled. Please try again.');
        }
        throw new Error(`Network request failed: ${error.message}`);
      });
      
      if (!response.ok) {
        console.error('Failed to fetch video statistics:', response.status);
        return {};
      }
      
      const data = await response.json();
      const stats: Record<string, { viewCount: string }> = {};
      
      for (const item of data.items || []) {
        stats[item.id] = {
          viewCount: item.statistics?.viewCount || '0'
        };
      }
      
      return stats;
    } catch (error) {
      console.error('Error fetching video statistics:', error);
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