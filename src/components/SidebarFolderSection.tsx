import React, { useEffect } from 'react';
import { YouTubeScraper } from '../utils/youtube-scraper';
import { CacheService } from '../utils/cache-service';

interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}

const SidebarFolderSection: React.FC = () => {
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load folders with smart preloading
        const result = await chrome.storage.local.get(['folders']);
        if (result.folders) {
          // Smart preload videos for folders
          try {
            const folderChannelIds = result.folders.map((folder: Folder) => folder.channelIds);
            await CacheService.smartPreload(folderChannelIds);
          } catch (error) {
            console.log('FolderTube: Smart preload failed:', error);
          }
        }

        // Get current channels  
        await YouTubeScraper.getSubscriptions();
        
        // Add drag and drop functionality to subscriptions
        addDragDropToSubscriptions();
        
        // Trigger refresh to add drag functionality to native subscriptions
        window.dispatchEvent(new CustomEvent('foldertube:refresh'));
      } catch (error) {
        console.error('FolderTube: Error loading data:', error);
      }
    };

    loadData();

    // Re-add drag functionality when navigation changes
    const handleRefresh = () => {
      setTimeout(() => addDragDropToSubscriptions(), 100);
    };

    window.addEventListener('foldertube:refresh', handleRefresh);
    return () => window.removeEventListener('foldertube:refresh', handleRefresh);
  }, []);

  const addDragDropToSubscriptions = () => {
    console.log('FolderTube: Starting to add drag functionality to subscriptions');
    
    // Use a more aggressive approach - find ALL links that point to channels
    const allChannelLinks = document.querySelectorAll('a[href*="/@"], a[href*="/channel/"]');
    console.log(`FolderTube: Found ${allChannelLinks.length} total channel links`);
    
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
        console.log(`FolderTube: Making channel draggable: ${channelName} (${channelId})`);
        
        processedChannels.add(channelId);
        
        // Store the current drag data globally so we can access it in drop
        (window as any).foldertubeDragData = null;
        
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
          console.log('FolderTube: Drag started for:', channelName);
          
          // Mark as being dragged
          (container as HTMLElement).setAttribute('data-being-dragged', 'true');
          
          if (dragEvent.dataTransfer) {
            const dragData = {
              channelId: channelId,
              channelName: channelName,
              avatarUrl: avatarUrl,
              source: 'sidebar'
            };
            
            // Store globally as backup
            (window as any).foldertubeDragData = dragData;
            
            console.log('FolderTube: Setting drag data:', dragData);
            const jsonData = JSON.stringify(dragData);
            
            // Clear any existing data first
            dragEvent.dataTransfer.clearData();
            
            // Set data in multiple formats
            try {
              dragEvent.dataTransfer.setData('text/plain', jsonData);
              dragEvent.dataTransfer.setData('application/json', jsonData);
              dragEvent.dataTransfer.setData('text/foldertube', jsonData);
            } catch (error) {
              console.warn('FolderTube: Error setting drag data:', error);
            }
            
            dragEvent.dataTransfer.effectAllowed = 'move';
            console.log('FolderTube: Drag data set successfully');
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
          
          console.log('FolderTube: Drag ended for:', channelName);
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
    
    console.log(`FolderTube: Successfully made ${totalProcessed} channels draggable`);
  };

  // Return null to remove the collections section from sidebar
  return null;
};

export default SidebarFolderSection;