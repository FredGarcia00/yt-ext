import type { VideoData } from './cache-service';
import type { ChannelVideoData } from './youtube-api';

/**
 * Fallback implementation when YouTube API is unavailable
 * This generates placeholder data so the UI still functions
 */
export class YouTubeAPIFallback {
  
  /**
   * Generate mock video data for testing/demo purposes
   */
  static generateMockVideos(channelId: string, channelName: string): VideoData[] {
    const videos: VideoData[] = [];
    const now = new Date();
    
    // Create a simple hash from channel ID to ensure unique videos per channel
    let hash = 0;
    for (let i = 0; i < channelId.length; i++) {
      hash = ((hash << 5) - hash) + channelId.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    const seed = Math.abs(hash);
    
    // Generate channel-specific video titles based on channel name
    const videoTopics = [
      ['Tutorial', 'Guide', 'How-To', 'Tips & Tricks'],
      ['Review', 'First Look', 'Unboxing', 'Comparison'],
      ['Vlog', 'Behind the Scenes', 'Day in the Life', 'Q&A'],
      ['Update', 'News', 'Announcement', 'Special']
    ];
    
    const topicSet = videoTopics[seed % videoTopics.length];
    
    for (let i = 0; i < 4; i++) {
      const daysAgo = i * 3 + (seed % 3); // Vary based on channel
      const publishDate = new Date(now);
      publishDate.setDate(publishDate.getDate() - daysAgo);
      
      // Generate unique video ID based on channel and index
      const videoIdChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
      let videoId = '';
      for (let j = 0; j < 11; j++) {
        videoId += videoIdChars[(seed * (i + 1) * (j + 1)) % videoIdChars.length];
      }
      
      // Generate unique view count based on channel popularity seed
      const baseViews = (seed % 10 + 1) * 1000;
      const viewVariance = Math.floor((seed * (i + 1)) % 50000);
      
      videos.push({
        id: videoId,
        title: `${channelName} - ${topicSet[i % topicSet.length]} #${i + 1}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        publishedAt: publishDate.toISOString(),
        channelId: channelId,
        viewCount: (baseViews + viewVariance).toString(),
        duration: `PT${5 + (seed % 15)}M${(seed * (i + 1)) % 60}S`
      });
    }
    
    return videos;
  }
  
  /**
   * Get channel videos with fallback data
   */
  static async getChannelVideos(
    channelId: string,
    channelName: string
  ): Promise<ChannelVideoData> {
    console.log(`FolderTube: Using fallback API for ${channelName} (${channelId})`);
    
    // Generate mock videos
    const videos = this.generateMockVideos(channelId, channelName);
    
    return {
      channelId,
      channelName,
      videos,
      fromCache: false
    };
  }
  
  /**
   * Extract real videos from YouTube by navigating to channel pages
   */
  static async getChannelVideosViaNavigation(channelId: string, channelName: string): Promise<VideoData[]> {
    try {
      // Only try this if we're on YouTube
      if (typeof window === 'undefined' || !window.location.hostname.includes('youtube.com')) {
        return this.generateMockVideos(channelId, channelName);
      }
      
      console.log(`FolderTube: Attempting to get real videos for ${channelName} (${channelId})`);
      
      // Try to extract videos from current page first
      const currentPageVideos = this.extractVideosFromCurrentPage(channelId);
      if (currentPageVideos.length > 0) {
        return currentPageVideos;
      }
      
      // If no videos found on current page, try different approaches
      return this.findRecentVideosForChannel(channelId, channelName);
      
    } catch (error) {
      console.error('FolderTube: Error getting real videos:', error);
      return this.generateMockVideos(channelId, channelName);
    }
  }
  
  /**
   * Extract actual videos from YouTube page if we're on YouTube
   */
  static extractVideosFromCurrentPage(channelId: string): VideoData[] {
    const videos: VideoData[] = [];
    
    try {
      // Check if we're on YouTube
      if (typeof window === 'undefined' || !window.location.hostname.includes('youtube.com')) {
        return videos;
      }
      
      // Look for video elements on the current page
      const videoRenderers = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer');
      
      videoRenderers.forEach((renderer, index) => {
        if (index >= 4) return; // Limit to 4 videos
        
        // Extract video ID from thumbnail link
        const thumbnailLink = renderer.querySelector('a#thumbnail, a[href*="/watch?v="]') as HTMLAnchorElement;
        if (!thumbnailLink) return;
        
        const videoIdMatch = thumbnailLink.href.match(/[?&]v=([^&]+)/);
        if (!videoIdMatch) return;
        
        const videoId = videoIdMatch[1];
        
        // Extract title
        const titleElement = renderer.querySelector('#video-title, #video-title-link, h3.title a, .ytd-video-meta-block #video-title') as HTMLElement;
        const title = titleElement?.textContent?.trim() || titleElement?.getAttribute('title') || `Video ${index + 1}`;
        
        // Extract thumbnail
        const thumbnailImg = renderer.querySelector('img') as HTMLImageElement;
        const thumbnail = thumbnailImg?.src || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        
        // Extract metadata
        const metadataElement = renderer.querySelector('#metadata-line, ytd-video-meta-block, .ytd-video-meta-block');
        const metadataText = metadataElement?.textContent || '';
        
        // Try to extract view count
        let viewCount = '0';
        const viewMatch = metadataText.match(/([\d.]+[KMB]?)\s*views?/i);
        if (viewMatch) {
          viewCount = this.parseViewCount(viewMatch[1]);
        }
        
        // Try to extract publish date
        const publishedAt = this.extractPublishDate(metadataText);
        
        videos.push({
          id: videoId,
          title: title,
          thumbnail: thumbnail,
          publishedAt: publishedAt,
          channelId: channelId,
          viewCount: viewCount
        });
      });
      
      console.log(`FolderTube: Extracted ${videos.length} real videos from current page`);
    } catch (error) {
      console.error('FolderTube: Error extracting videos from page:', error);
    }
    
    return videos;
  }
  
  /**
   * Find recent videos for a channel using YouTube's search and trending
   */
  static findRecentVideosForChannel(channelId: string, channelName: string): VideoData[] {
    try {
      // Look for videos from this specific channel in the current page
      const allVideoElements = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer');
      const channelVideos: VideoData[] = [];
      
      allVideoElements.forEach((element, index) => {
        if (channelVideos.length >= 4) return; // Limit to 4 videos
        
        // Check if this video is from the target channel
        const channelLink = element.querySelector('a[href*="/@"], a[href*="/channel/"], .ytd-channel-name a') as HTMLAnchorElement;
        const channelNameElement = element.querySelector('.ytd-channel-name a, #channel-name a, #text') as HTMLElement;
        
        let isFromTargetChannel = false;
        
        // Check by channel ID or name
        if (channelLink) {
          const href = channelLink.href;
          isFromTargetChannel = href.includes(channelId) || href.includes(channelName);
        }
        
        if (channelNameElement) {
          const displayedChannelName = channelNameElement.textContent?.trim() || '';
          isFromTargetChannel = isFromTargetChannel || displayedChannelName === channelName;
        }
        
        if (isFromTargetChannel) {
          const thumbnailLink = element.querySelector('a#thumbnail, a[href*="/watch?v="]') as HTMLAnchorElement;
          if (thumbnailLink) {
            const videoIdMatch = thumbnailLink.href.match(/[?&]v=([^&]+)/);
            if (videoIdMatch) {
              const videoId = videoIdMatch[1];
              const titleElement = element.querySelector('#video-title, #video-title-link') as HTMLElement;
              const title = titleElement?.textContent?.trim() || `${channelName} Video`;
              
              channelVideos.push({
                id: videoId,
                title: title,
                thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                publishedAt: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
                channelId: channelId,
                viewCount: Math.floor(Math.random() * 50000 + 1000).toString()
              });
            }
          }
        }
      });
      
      if (channelVideos.length > 0) {
        console.log(`FolderTube: Found ${channelVideos.length} real videos for ${channelName}`);
        return channelVideos;
      }
      
    } catch (error) {
      console.error('FolderTube: Error finding channel videos:', error);
    }
    
    // Fallback to mock data if no real videos found
    return this.generateMockVideos(channelId, channelName);
  }
  
  private static parseViewCount(viewText: string): string {
    // Convert K, M, B to actual numbers
    const multipliers: { [key: string]: number } = {
      'K': 1000,
      'M': 1000000,
      'B': 1000000000
    };
    
    const match = viewText.match(/([\d.]+)([KMB]?)/);
    if (!match) return '0';
    
    const num = parseFloat(match[1]);
    const multiplier = multipliers[match[2]] || 1;
    
    return Math.floor(num * multiplier).toString();
  }
  
  private static extractPublishDate(metadataText: string): string {
    const now = new Date();
    
    // Look for "X time ago" patterns
    const patterns = [
      { regex: /(\d+)\s*seconds?\s*ago/i, unit: 'second' },
      { regex: /(\d+)\s*minutes?\s*ago/i, unit: 'minute' },
      { regex: /(\d+)\s*hours?\s*ago/i, unit: 'hour' },
      { regex: /(\d+)\s*days?\s*ago/i, unit: 'day' },
      { regex: /(\d+)\s*weeks?\s*ago/i, unit: 'week' },
      { regex: /(\d+)\s*months?\s*ago/i, unit: 'month' },
      { regex: /(\d+)\s*years?\s*ago/i, unit: 'year' }
    ];
    
    for (const pattern of patterns) {
      const match = metadataText.match(pattern.regex);
      if (match) {
        const value = parseInt(match[1]);
        const date = new Date(now);
        
        switch (pattern.unit) {
          case 'second':
            date.setSeconds(date.getSeconds() - value);
            break;
          case 'minute':
            date.setMinutes(date.getMinutes() - value);
            break;
          case 'hour':
            date.setHours(date.getHours() - value);
            break;
          case 'day':
            date.setDate(date.getDate() - value);
            break;
          case 'week':
            date.setDate(date.getDate() - (value * 7));
            break;
          case 'month':
            date.setMonth(date.getMonth() - value);
            break;
          case 'year':
            date.setFullYear(date.getFullYear() - value);
            break;
        }
        
        return date.toISOString();
      }
    }
    
    // Default to now if we can't parse
    return now.toISOString();
  }
}