import React, { useEffect } from 'react';
import { YouTubeScraper } from '../utils/youtube-scraper';
import { CacheService } from '../utils/cache-service';
import { SubscriptionService } from '../utils/subscription-service';
import { AccountMonitor } from '../utils/account-monitor';

interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}

const SidebarFolderSection: React.FC = () => {
  useEffect(() => {
    const checkAndLoad = async () => {
      try {
        // First verify account session
        const sessionVerification = await AccountMonitor.verifyAccountSession();
        
        if (!sessionVerification.isValid || sessionVerification.needsAuth) {
          console.log('FolderTube: Invalid session in sidebar - features disabled');
          return;
        }
        
        // Check subscription
        const subStatus = await SubscriptionService.checkSubscription();
        
        if (!subStatus) {
          console.log('FolderTube: No subscription, sidebar features disabled');
          return;
        }
        
        // Only load data if subscribed
        const storageKey = SubscriptionService.getStorageKey('folders');
        const result = await chrome.storage.local.get([storageKey]);
        if (result[storageKey]) {
          // Smart preload videos for folders
          try {
            const folderChannelIds = result[storageKey].map((folder: Folder) => folder.channelIds);
            await CacheService.smartPreload(folderChannelIds);
          } catch (error) {
            // Smart preload failed, continue
          }
        }

        // Get current channels  
        await YouTubeScraper.getSubscriptions();
        
        // Add drag and drop functionality to subscriptions
        addDragDropToSubscriptions();
        
        // Trigger refresh to add drag functionality to native subscriptions
        window.dispatchEvent(new CustomEvent('foldertube:refresh'));
      } catch (error) {
        console.error('FolderTube: Error in sidebar:', error);
      }
    };

    checkAndLoad();

    // Re-add drag functionality when navigation changes
    const handleRefresh = () => {
      setTimeout(() => addDragDropToSubscriptions(), 100);
    };

    window.addEventListener('foldertube:refresh', handleRefresh);
    return () => window.removeEventListener('foldertube:refresh', handleRefresh);
  }, []);

  const addDragDropToSubscriptions = () => {
    // Use a more aggressive approach - find ALL links that point to channels
    const allChannelLinks = document.querySelectorAll('a[href*="/@"], a[href*="/channel/"]');
    
    let totalProcessed = 0;
    const processedChannels = new Set<string>();
    
    allChannelLinks.forEach((linkElement) => {
      // Get the parent container that we'll make draggable
      const container = linkElement.closest('ytd-guide-entry-renderer') || 
                       linkElement.closest('[role="listitem"]') ||
                       linkElement.parentElement;
      
      if (!container) return;
      
      // Skip if already processed
      if (container.getAttribute('data-foldertube-draggable') === 'true') return;
      
      const href = linkElement.getAttribute('href');
      let channelId = '';
      
      // Extract channel ID
      if (href?.includes('/@')) {
        const match = href.match(/\/@([^\/\?]+)/);
        channelId = match ? match[1] : '';
      } else if (href?.includes('/channel/')) {
        const match = href.match(/\/channel\/([^\/\?]+)/);
        channelId = match ? match[1] : '';
      }
      
      if (!channelId || processedChannels.has(channelId)) return;
      
      // Get channel name from various possible locations
      const nameSelectors = [
        '#text',
        '.yt-formatted-string', 
        '[role="text"]',
        '.style-scope.ytd-guide-entry-renderer',
        'yt-formatted-string'
      ];
      
      let channelName = '';
      for (const selector of nameSelectors) {
        const nameElement = container.querySelector(selector);
        if (nameElement?.textContent?.trim()) {
          channelName = nameElement.textContent.trim();
          break;
        }
      }
      
      // Fallback: extract from link text or title
      if (!channelName) {
        channelName = linkElement.textContent?.trim() || 
                     linkElement.getAttribute('title') || 
                     channelId;
      }
      
      if (channelName && channelId) {
        processedChannels.add(channelId);
        
        // Initialize global drag data (will be populated during dragstart)
        // Don't clear it here as it might contain data from a previous drag operation
        
        // Make container draggable
        (container as HTMLElement).draggable = true;
        container.setAttribute('data-foldertube-draggable', 'true');
        container.setAttribute('data-channel-id', channelId);
        container.setAttribute('data-channel-name', channelName);
        
        // Get avatar if available
        const avatar = container.querySelector('img') as HTMLImageElement;
        const avatarUrl = avatar?.src || '';
        container.setAttribute('data-channel-avatar', avatarUrl);
        
        // Prevent default link behavior during drag
        const preventClick = (e: Event) => {
          if ((container as HTMLElement).getAttribute('data-being-dragged') === 'true') {
            e.preventDefault();
            e.stopPropagation();
          }
        };
        
        // Add drag event listeners
        container.addEventListener('dragstart', (e) => {
          const dragEvent = e as DragEvent;
          
          // Mark as being dragged
          (container as HTMLElement).setAttribute('data-being-dragged', 'true');
          
          if (dragEvent.dataTransfer) {
            const dragData = {
              channelId: channelId,
              channelName: channelName,
              avatarUrl: avatarUrl,
              source: 'sidebar'
            };
            
            // Store globally as backup with additional validation
            (window as any).foldertubeDragData = dragData;
            
            const jsonData = JSON.stringify(dragData);
            
            // Clear any existing data first
            dragEvent.dataTransfer.clearData();
            
            // Set data in multiple formats with enhanced error handling
            let successCount = 0;
            const formats = [
              { key: 'text/foldertube', primary: true },
              { key: 'application/json', primary: false },
              { key: 'text/plain', primary: false }
            ];
            
            for (const format of formats) {
              try {
                dragEvent.dataTransfer.setData(format.key, jsonData);
                successCount++;
              } catch (error) {
                if (format.primary) {
                  // If primary format fails, also try setting the channel ID as plain text
                  try {
                    dragEvent.dataTransfer.setData('text', channelId);
                  } catch (fallbackError) {
                    // Fallback also failed
                  }
                }
              }
            }
            
            if (successCount === 0) {
              console.error('FolderTube: Failed to set drag data in any format, relying on global backup');
            }
            
            dragEvent.dataTransfer.effectAllowed = 'move';
          } else {
            // dataTransfer not available, relying on global backup only
          }
          
          // Visual feedback
          (container as HTMLElement).style.opacity = '0.5';
          
          // Prevent clicks on links during drag
          linkElement.addEventListener('click', preventClick, {capture: true});
        });
        
        container.addEventListener('dragend', () => {
          (container as HTMLElement).style.opacity = '1';
          (container as HTMLElement).removeAttribute('data-being-dragged');
          
          // Re-enable clicks
          linkElement.removeEventListener('click', preventClick, {capture: true});
          
          // Clean up global data with a delay to allow drop handler to access it
          setTimeout(() => {
            if ((window as any).foldertubeDragData && 
                (window as any).foldertubeDragData.channelId === channelId) {
              (window as any).foldertubeDragData = null;
            }
          }, 100);
        });
        
        // Visual styling
        (container as HTMLElement).style.cursor = 'grab';
        (container as HTMLElement).title = `Drag ${channelName} to a folder`;
        
        // Add visual indicator
        const indicator = document.createElement('div');
        indicator.innerHTML = '⋮⋮';
        indicator.style.cssText = `
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 10px;
          color: #666;
          opacity: 0.6;
          pointer-events: none;
          z-index: 1;
        `;
        (container as HTMLElement).style.position = 'relative';
        container.appendChild(indicator);
        
        totalProcessed++;
      }
    });
    
  };

  // Return null to remove the collections section from sidebar
  return null;
};

export default SidebarFolderSection;