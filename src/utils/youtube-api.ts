import { YouTubeAuth } from './youtube-auth';
import { CacheService } from './cache-service';
import { YouTubeFallbackScraper } from './youtube-fallback-scraper';
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
  
  // Notify background script about API call
  try {
    chrome.runtime.sendMessage({ type: 'apiCallMade', units });
  } catch (error) {
    // Ignore if background script is not available
  }
}

export class YouTubeAPI {
  private static API_BASE = 'https://www.googleapis.com/youtube/v3';
  
  private static async checkQuotaAvailable(): Promise<boolean> {
    try {
      // Check if we're in emergency cache mode
      const storage = await chrome.storage.local.get(['quotaExceeded', 'quotaResetTime']);
      if (storage.quotaExceeded && storage.quotaResetTime > Date.now()) {
        console.warn('FolderTube: In emergency cache mode due to quota exceeded');
        return false;
      } else if (storage.quotaExceeded && storage.quotaResetTime <= Date.now()) {
        // Reset emergency mode
        await chrome.storage.local.remove(['quotaExceeded', 'quotaResetTime']);
        console.log('FolderTube: Emergency cache mode reset - quota should be available');
      }
      
      try {
        const response = await chrome.runtime.sendMessage({ type: 'getApiUsage' });
        if (response && response.apiCallsToday >= response.maxCalls) {
          console.warn('FolderTube: Daily API quota reached');
          return false;
        }
        return true;
      } catch (error) {
        console.warn('FolderTube: Could not connect to background script, assuming quota is available');
        return true;
      }
    } catch (error) {
      // If background script is not available, check storage directly
      const storage = await chrome.storage.local.get(['quotaExceeded', 'quotaResetTime']);
      return !(storage.quotaExceeded && storage.quotaResetTime > Date.now());
    }
  }
  
  static async fetchChannelMetadata(channelIds: string): Promise<ChannelDetails[]> {
    return this.getChannelDetails(channelIds.split(','));
  }

  static async searchChannelByName(channelName: string): Promise<any[]> {
    const token = await YouTubeAuth.getToken();
    
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'channel',
      q: channelName,
      maxResults: '5',  // Get top 5 results
      fields: 'items(id(channelId),snippet(title,thumbnails))'
    });
    
    if (!token) {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) {
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
    
    const response = await fetch(
      `${this.API_BASE}/search?${params}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error(`Channel search failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const items = data.items || [];
    
    return items.map((item: any) => ({
      id: item.id.channelId,
      name: item.snippet.title,
      thumbnails: item.snippet.thumbnails
    }));
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
        
        const batchResults = await this.fetchChannelDetailsBatch(params, token);
        results.push(...batchResults);
      }
    }
    
    // Process handles individually (cannot be batched)
    for (const handleId of handleIds) {
      try {
        const params = new URLSearchParams({
          part: 'snippet,topicDetails',
          forHandle: handleId.startsWith('@') ? handleId : `@${handleId}`,
          fields: 'items(id,snippet(title,description,customUrl),topicDetails(topicIds))'
        });
        
        const handleResults = await this.fetchChannelDetailsBatch(params, token);
        results.push(...handleResults);
      } catch (error) {
        console.warn(`FolderTube: Failed to get details for handle ${handleId}:`, error);
      }
    }
    
    return results;
  }
  
  private static async fetchChannelDetailsBatch(params: URLSearchParams, token: string | null): Promise<ChannelDetails[]> {
    const results: ChannelDetails[] = [];
    
    if (!token) {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) {
        console.log('FolderTube: No YouTube API key configured');
        throw new Error('YouTube API key not configured');
      }
      params.append('key', apiKey);
      console.log('FolderTube: Using API key for channel details request');
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
        if (response.status === 403) {
          const errorText = await response.text();
          console.error('YouTube API 403 error:', errorText);
          if (errorText.includes('quotaExceeded')) {
            console.warn('YouTube API quota exceeded. Extension will use cache-only mode until quota resets.');
            // Set emergency cache mode for 24 hours
            await chrome.storage.local.set({ 
              quotaExceeded: true, 
              quotaResetTime: Date.now() + (24 * 60 * 60 * 1000) 
            });
          } else if (errorText.includes('forbidden')) {
            console.error('YouTube API access forbidden. Check API key permissions.');
          }
        } else {
          console.error('Failed to fetch channel details:', response.status);
        }
        return results; // Return empty results on error
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
    
    // Check if we have API quota available
    const quotaAvailable = await this.checkQuotaAvailable();
    if (!quotaAvailable) {
      // Fall back to cached data even if expired
      const cachedVideos = await CacheService.getCachedVideos(channelId, true); // Allow expired
      if (cachedVideos && cachedVideos.length > 0) {
        console.log(`FolderTube: Using expired cache due to quota limit for ${channelName}`);
        return {
          channelId,
          channelName,
          videos: cachedVideos,
          fromCache: true
        };
      }
      // Try fallback scraping as last resort
      console.log(`FolderTube: Attempting fallback scraping for ${channelName}`);
      const scrapedVideos = YouTubeFallbackScraper.extractVideosFromDOM(channelId);
      if (scrapedVideos.length > 0) {
        // Cache the scraped videos with emergency cache duration
        await CacheService.setCachedVideos(channelId, scrapedVideos, false, true);
        return {
          channelId,
          channelName,
          videos: scrapedVideos,
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
        console.log(`FolderTube: No videos returned for ${channelName}, returning empty result`);
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
    
    // Always try to get proper UC channel ID first for accurate video fetching
    let resolvedChannelId = channelId;
    
    if (!channelId.startsWith('UC')) {
      console.log(`FolderTube: Resolving non-UC channel ID: ${channelId}`);
      try {
        // Try to resolve handle/custom URL to proper UC channel ID
        const channelDetails = await this.getChannelDetails([channelId]);
        if (channelDetails.length > 0 && channelDetails[0].id.startsWith('UC')) {
          resolvedChannelId = channelDetails[0].id;
          console.log(`FolderTube: Resolved ${channelId} to UC channel ID: ${resolvedChannelId}`);
        } else {
          console.warn(`FolderTube: Could not resolve ${channelId} to UC channel ID, using original`);
        }
      } catch (error) {
        console.warn(`FolderTube: Failed to resolve channel ID ${channelId}:`, error);
      }
    }
    
    // Now use uploads playlist method for accurate video fetching
    if (resolvedChannelId.startsWith('UC')) {
      console.log(`FolderTube: Using uploads playlist method for ${resolvedChannelId}`);
      const uploadsPlaylistId = 'UU' + resolvedChannelId.substring(2);
      return this.fetchChannelVideosViaPlaylist(uploadsPlaylistId, resolvedChannelId, token);
    }
    
    // Fallback: if we still don't have a UC channel ID, try handle resolution
    console.warn(`FolderTube: Could not resolve to UC channel ID, trying handle resolution for: ${channelId}`);
    if (channelId.startsWith('@')) {
      return this.fetchChannelVideosViaHandle(channelId, token);
    }
    
    // Last resort: return empty array rather than wrong videos from search
    console.error(`FolderTube: Cannot fetch videos for channel ${channelId} - unable to resolve to proper channel ID`);
    return [];
  }
  
  private static async fetchChannelVideosViaPlaylist(playlistId: string, channelId: string, token: string | null): Promise<VideoData[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId: playlistId,
      maxResults: '10',
      fields: 'items(snippet(title,thumbnails(medium),publishedAt,resourceId(videoId)))'
    });
    
    if (!token) {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) {
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
        `${this.API_BASE}/playlistItems?${params}`,
        { headers }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          // Playlist not found, fallback to search
          return this.fetchChannelVideosViaSearch(channelId, token);
        }
        throw new Error(`Playlist request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      logApiCall('playlistItems.list', 1);
      
      const videos = (data.items || []).map((item: any) => {
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
      const videosWithStats = videos.map((video: VideoData) => ({
        ...video,
        viewCount: stats[video.id]?.viewCount
      }));
      
      return videosWithStats;
    } catch (error) {
      console.error('Error fetching playlist videos:', error);
      throw error;
    }
  }

  
  private static async fetchChannelVideosViaSearch(channelId: string, token: string | null): Promise<VideoData[]> {
    const params = new URLSearchParams({
      part: 'snippet',
      order: 'date',
      type: 'video',
      maxResults: '10', // Increased from 4 to 10 for better categorization accuracy // Always use 4 - no need for more
      fields: 'items(id(videoId),snippet(title,thumbnails(medium),publishedAt,channelId,channelTitle))'
    });
    
    // Handle different channel ID formats
    if (channelId.startsWith('UC')) {
      params.append('channelId', channelId);
    } else if (channelId.startsWith('@')) {
      // For handles, use search query instead of channelId parameter
      params.append('q', `channel:${channelId}`);
      console.log(`FolderTube: Using search query for handle: ${channelId}`);
    } else {
      // For other formats, try searching by channel name
      params.append('q', channelId);
      console.log(`FolderTube: Using search query for channel name: ${channelId}`);
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
    
    // Smart filtering: Handle different channel ID formats
    const filteredItems = items.filter((item: any) => {
      const videoChannelId = item.snippet.channelId;
      
      // Direct match (same format)
      if (videoChannelId === channelId) {
        return true;
      }
      
      // If we're searching for a handle (@username) but got UC channel ID,
      // we can't easily verify without another API call, so we trust the search results
      if (channelId.startsWith('@') && videoChannelId.startsWith('UC')) {
        console.log(`FolderTube: Handle search result - trusting API for ${channelId} -> ${videoChannelId}`);
        return true;
      }
      
      // If we're searching for non-UC ID but got UC channel ID, also trust search results
      if (!channelId.startsWith('UC') && !channelId.startsWith('@') && videoChannelId.startsWith('UC')) {
        console.log(`FolderTube: Custom URL search result - trusting API for ${channelId} -> ${videoChannelId}`);
        return true;
      }
      
      // Only filter out if we're confident it's wrong
      console.warn(`FolderTube: Filtering out video from wrong channel. Expected: ${channelId}, Got: ${videoChannelId}`);
      return false;
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