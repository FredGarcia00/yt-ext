import type { VideoData } from './cache-service';

export class YouTubeFallbackScraper {
  
  /**
   * Scrape videos from a YouTube channel page when API is unavailable
   * This is a fallback method with limited data
   */
  static async scrapeChannelVideos(channelId: string): Promise<VideoData[]> {
    try {
      // Construct channel URL
      let channelUrl = '';
      if (channelId.startsWith('@')) {
        channelUrl = `https://www.youtube.com/${channelId}/videos`;
      } else if (channelId.startsWith('UC')) {
        channelUrl = `https://www.youtube.com/channel/${channelId}/videos`;
      } else {
        channelUrl = `https://www.youtube.com/@${channelId}/videos`;
      }
      
      // Note: In a real Chrome extension, we can't directly fetch YouTube pages due to CORS
      // This would need to be done through a content script or proxy
      console.log(`FolderTube: Would scrape ${channelUrl} for fallback data`);
      
      // For now, return empty array as this requires content script implementation
      return [];
      
    } catch (error) {
      console.error('FolderTube: Fallback scraping failed:', error);
      return [];
    }
  }
  
  /**
   * Extract video data from YouTube page DOM (to be used by content script)
   */
  static extractVideosFromDOM(channelId: string): VideoData[] {
    const videos: VideoData[] = [];
    
    try {
      // Look for video elements on the page
      const videoElements = document.querySelectorAll('ytd-rich-grid-media, ytd-video-renderer');
      
      videoElements.forEach((element, index) => {
        if (index >= 4) return; // Limit to 4 videos like API
        
        const linkElement = element.querySelector('a#video-title-link, a#thumbnail') as HTMLAnchorElement;
        const titleElement = element.querySelector('#video-title, #meta h3 a') as HTMLElement;
        const thumbnailElement = element.querySelector('img') as HTMLImageElement;
        const metaElement = element.querySelector('#metadata-line, .style-scope.ytd-video-meta-block');
        
        if (linkElement && titleElement) {
          const videoId = this.extractVideoId(linkElement.href);
          if (videoId) {
            const video: VideoData = {
              id: videoId,
              title: titleElement.textContent?.trim() || '',
              thumbnail: thumbnailElement?.src || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              publishedAt: this.extractPublishDate(metaElement) || new Date().toISOString(),
              channelId: channelId
            };
            
            videos.push(video);
          }
        }
      });
      
    } catch (error) {
      console.error('FolderTube: DOM extraction failed:', error);
    }
    
    return videos;
  }
  
  private static extractVideoId(url: string): string | null {
    const match = url.match(/(?:watch\?v=|\/embed\/|\/v\/|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }
  
  private static extractPublishDate(metaElement: Element | null): string | null {
    if (!metaElement) return null;
    
    // Look for various date formats
    const text = metaElement.textContent || '';
    const patterns = [
      /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i,
      /(\d+)\s+(sec|min|hr|day|wk|mo|yr)s?\s+ago/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.approximateDate(parseInt(match[1]), match[2]);
      }
    }
    
    return null;
  }
  
  private static approximateDate(value: number, unit: string): string {
    const now = new Date();
    
    switch (unit.toLowerCase()) {
      case 'second':
      case 'sec':
        now.setSeconds(now.getSeconds() - value);
        break;
      case 'minute':
      case 'min':
        now.setMinutes(now.getMinutes() - value);
        break;
      case 'hour':
      case 'hr':
        now.setHours(now.getHours() - value);
        break;
      case 'day':
        now.setDate(now.getDate() - value);
        break;
      case 'week':
      case 'wk':
        now.setDate(now.getDate() - (value * 7));
        break;
      case 'month':
      case 'mo':
        now.setMonth(now.getMonth() - value);
        break;
      case 'year':
      case 'yr':
        now.setFullYear(now.getFullYear() - value);
        break;
    }
    
    return now.toISOString();
  }
}