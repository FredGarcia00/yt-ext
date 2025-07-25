export interface YouTubeChannel {
  id: string;
  name: string;
  url: string;
  avatarUrl: string;
  avatarLoaded?: boolean;
}

export class YouTubeScraper {
  
  private static SELECTORS = {
    // Main sidebar guide - focus on the sections container
    guideRenderer: 'ytd-guide-renderer',
    sectionsContainer: 'ytd-guide-section-renderer#sections',
    
    // All guide entries that might be channels
    allGuideEntries: 'ytd-guide-entry-renderer',
    channelName: 'yt-formatted-string, #title',
    channelLink: 'a',
    channelAvatar: 'img#img', // Specific selector for avatar images
    
    // Show more button for subscriptions
    expandButton: 'ytd-guide-entry-renderer#expander-item',
  };


  static async getSubscriptions(): Promise<YouTubeChannel[]> {
    const channels: YouTubeChannel[] = [];
    
    try {
      // Wait for guide renderer to be loaded
      await this.waitForElement(this.SELECTORS.guideRenderer);
      
      // First, try to expand subscriptions if they're collapsed
      const expandButton = document.querySelector(this.SELECTORS.expandButton) as HTMLElement;
      if (expandButton && expandButton.textContent?.includes('Show more')) {
        expandButton.click();
        await new Promise(resolve => setTimeout(resolve, 100)); // Reduced delay
      }
      
      // Look for all guide entries, preferring those in the sections container
      const sectionsContainer = document.querySelector(this.SELECTORS.sectionsContainer);
      let allGuideEntries: NodeListOf<Element>;
      
      if (sectionsContainer) {
        allGuideEntries = sectionsContainer.querySelectorAll(this.SELECTORS.allGuideEntries);
      } else {
        allGuideEntries = document.querySelectorAll(this.SELECTORS.allGuideEntries);
      }
      
      for (let index = 0; index < allGuideEntries.length; index++) {
        const entry = allGuideEntries[index];
        const links = entry.querySelectorAll('a');
        const nameElement = entry.querySelector(this.SELECTORS.channelName);
        
        // Find the main link (usually the first one that's a channel link)
        let channelLink: HTMLAnchorElement | null = null;
        for (const link of links) {
          const href = link.getAttribute('href');
          if (href && (href.includes('/@') || href.includes('/channel/'))) {
            channelLink = link as HTMLAnchorElement;
            break;
          }
        }
        
        // Skip verbose debugging for faster loading
        
        if (channelLink && nameElement) {
          // Get channel URL for extracting ID first
          const href = channelLink.href || '';
          const channelIdMatch = href.match(/\/channel\/(UC[\w-]+)/);
          const handleMatch = href.match(/\/@([\w-]+)/);
          
          let avatarUrl = '';
          
          // Extract proper channel ID from URL first
          let channelId = '';
          
          if (channelIdMatch) {
            channelId = channelIdMatch[1]; // Use the actual channel ID (UC...)
          } else if (handleMatch) {
            channelId = '@' + handleMatch[1]; // Preserve @ symbol for handles
          } else {
            // Try to extract from channel name as a more reliable fallback
            const channelName = nameElement.textContent?.trim() || '';
            if (channelName) {
              // Use a more descriptive identifier that includes the channel name
              channelId = channelName.replace(/[^a-zA-Z0-9]/g, '');
            } else {
              channelId = `channel-${index}`; // Final fallback
            }
          }
          
          // Simplified avatar extraction - focus on what actually works
          const getAllImageSources = (): (string | null | undefined)[] => {
            const sources: (string | null | undefined)[] = [];
            
            // Strategy 1: Direct img elements with comprehensive attribute checking
            const allImages = entry.querySelectorAll('img');
            allImages.forEach(img => {
              const src = img.getAttribute('src') || (img as HTMLImageElement).src;
              const dataSrc = img.getAttribute('data-src');
              if (src && src.length > 10) sources.push(src);
              if (dataSrc && dataSrc.length > 10) sources.push(dataSrc);
            });
            
            // Strategy 2: img#img within ytd-guide-entry-renderer (common pattern)
            const imgById = entry.querySelector('img#img');
            if (imgById) {
              const src = imgById.getAttribute('src');
              const dataSrc = imgById.getAttribute('data-src');
              const currentSrc = (imgById as HTMLImageElement).src;
              if (src) sources.push(src);
              if (dataSrc) sources.push(dataSrc);
              if (currentSrc) sources.push(currentSrc);
            }
            
            // Strategy 3: yt-img-shadow elements (common YouTube pattern)
            const shadowElements = entry.querySelectorAll('yt-img-shadow');
            shadowElements.forEach(shadow => {
              const img = shadow.querySelector('img, #img');
              if (img) {
                const src = img.getAttribute('src') || (img as HTMLImageElement).src;
                const dataSrc = img.getAttribute('data-src');
                if (src && src.length > 10) sources.push(src);
                if (dataSrc && dataSrc.length > 10) sources.push(dataSrc);
              }
            });
            
            // Strategy 4: YouTube policy-compliant approach - only use already loaded images
            // No forced loading or DOM manipulation beyond reading existing attributes
            
            return sources.filter(src => src && src.trim() !== '');
          };
          
          // Get all image sources
          const allSources = getAllImageSources();
          
          // Simple filtering - just find valid image URLs
          // Log all sources found for debugging
          console.log(`FolderTube: Found ${allSources.length} image sources for ${nameElement?.textContent?.trim()}:`, allSources.slice(0, 5));
          
          const validSources = allSources
            .filter((src): src is string => !!src && src.length > 10)
            .filter(src => {
              // More permissive filtering - accept any reasonable YouTube/Google avatar URL
              const isValidDomain = src.startsWith('https://yt3.ggpht.com') || 
                                   src.startsWith('https://lh3.googleusercontent.com') ||
                                   src.startsWith('https://yt3.googleusercontent.com') ||
                                   src.startsWith('https://yt4.ggpht.com') ||
                                   src.startsWith('https://lh4.googleusercontent.com');
              
              const isNotJunk = !src.includes('/clear.gif') &&
                               !src.includes('spacer.gif') &&
                               !src.includes('blank.gif') &&
                               !src.includes('default_avatar.jpg');
              
              console.log(`FolderTube: Checking URL ${src} - validDomain: ${isValidDomain}, notJunk: ${isNotJunk}`);
              return isValidDomain && isNotJunk;
            });
          
          // Use all valid sources, prioritizing YouTube domains but not excluding others
          const avatarSources = validSources
            .filter((src, index, arr) => arr.indexOf(src) === index) // Remove duplicates
            .sort((a, b) => {
              // Prioritize YouTube avatar domains but don't exclude others
              const aScore = (a.includes('yt3.ggpht.com') ? 100 : 0) + 
                            (a.includes('googleusercontent.com') ? 90 : 0) + 
                            (a.includes('ytimg.com') ? 80 : 0);
              const bScore = (b.includes('yt3.ggpht.com') ? 100 : 0) + 
                            (b.includes('googleusercontent.com') ? 90 : 0) + 
                            (b.includes('ytimg.com') ? 80 : 0);
              return bScore - aScore; // Higher score first
            });
          
          // Use the first valid avatar found, or fallback
          if (avatarSources.length > 0) {
            avatarUrl = avatarSources[0];
            // Convert relative URLs to absolute
            if (!avatarUrl.startsWith('http')) {
              avatarUrl = avatarUrl.startsWith('//') ? 'https:' + avatarUrl : 'https://www.youtube.com' + avatarUrl;
            }
            // Log the found avatar URL for debugging
            console.log(`FolderTube: Avatar found for ${nameElement?.textContent?.trim()}: ${avatarUrl}`);
          } else {
            // No valid avatar found, try fallback options
            const channelName = nameElement.textContent?.trim() || 'Unknown Channel';
            console.log(`FolderTube: No strict match for ${channelName}, found ${allSources.length} total sources, ${validSources.length} valid YouTube avatar URLs`);
            if (validSources.length > 0) {
              console.log('FolderTube: Valid avatar URLs found but filtered:', validSources.slice(0, 2));
            }
            
            // Last attempt: try any Google/YouTube image URL even if it doesn't match strict criteria
            const anyGoogleUrl = allSources.find(src => 
              src && typeof src === 'string' &&
              (src.includes('ggpht.com') || src.includes('googleusercontent.com')) &&
              !src.includes('clear.gif') && !src.includes('spacer.gif')
            );
            
            if (anyGoogleUrl) {
              console.log(`FolderTube: Found Google/YouTube URL as last resort for ${channelName}: ${anyGoogleUrl}`);
              avatarUrl = anyGoogleUrl;
            } else {
              console.log(`FolderTube: Using generated fallback for ${channelName}`);
              avatarUrl = this.generateFallbackAvatar(channelName);
            }
          }
          
          const channel: YouTubeChannel = {
            id: channelId,
            name: nameElement.textContent?.trim() || 'Unknown Channel',
            url: href,
            avatarUrl: avatarUrl,
            avatarLoaded: false
          };
          
          // Only add valid channels (exclude Home, Trending, etc.)
          const isValidChannel = channel.url && 
            (channel.url.includes('/channel/') || channel.url.includes('/@')) &&
            !channel.url.includes('/feed/') &&
            !channel.url.includes('/trending') &&
            !channel.url.includes('/explore');
          
          // Additional check to exclude native YouTube sections
          const nativeSections = ['Music', 'Shopping', 'Live', 'News', 'Sports', 'Learning', 'Gaming', 'Fashion & Beauty', 'My Videos', 'Your Videos', 'Your movies', 'Your channel'];
          const isNativeSection = nativeSections.some(section => 
            channel.name.toLowerCase() === section.toLowerCase() || 
            channel.name.toLowerCase().includes('my videos') ||
            channel.name.toLowerCase().includes('your videos') ||
            channel.name.toLowerCase().includes('your movies') ||
            channel.name.toLowerCase().includes('your channel')
          );
            
          if (isValidChannel && !isNativeSection) {
            channels.push(channel);
          }
        }
      }
      
      // Return found channels
      
      // Skip post-processing for instant results
      
    } catch (error) {
      console.error('FolderTube: Error getting subscriptions:', error);
    }
    
    return channels;
  }

  
  static onAvatarUpdate(_callback?: (channels: YouTubeChannel[]) => void) {
    // Avatar updates now happen immediately during DOM scraping
    // This method is kept for compatibility but callbacks are never triggered
    return () => {};
  }

  static async waitForElement(selector: string, timeout = 10000): Promise<Element | null> {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((_mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  static observeSubscriptionChanges(callback: (channels: YouTubeChannel[]) => void) {
    const observer = new MutationObserver(async () => {
      const channels = await this.getSubscriptions();
      if (channels.length > 0) {
        callback(channels);
      }
    });

    // Observe the guide (sidebar) for changes
    const guide = document.querySelector('ytd-guide-renderer');
    if (guide) {
      observer.observe(guide, {
        childList: true,
        subtree: true
      });
    }

    return observer;
  }

  // Removed preloadImage method - not needed for instant loading

  static generateFallbackAvatar(channelName: string): string {
    const initial = channelName.charAt(0).toUpperCase();
    
    // Generate a consistent color based on the channel name
    const colors = [
      '#4285f4', '#ea4335', '#34a853', '#fbbc05', 
      '#9c27b0', '#ff9800', '#795548', '#607d8b',
      '#e91e63', '#673ab7', '#3f51b5', '#2196f3',
      '#00bcd4', '#009688', '#8bc34a', '#cddc39'
    ];
    
    // Use channel name to consistently pick a color
    let hash = 0;
    for (let i = 0; i < channelName.length; i++) {
      hash = ((hash << 5) - hash) + channelName.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const color = colors[colorIndex];

    const svg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="${color}"/>
      <text x="12" y="16" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">${initial}</text>
    </svg>`;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
}