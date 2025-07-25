import { useState, useEffect } from 'react';
import type { Folder, Channel } from '../utils/storage';
import { YouTubeAPI } from '../utils/youtube-api';
import { isExtensionContextValid, showExtensionReloadNotification, safeStorageGet } from '../utils/extension-context';

// Utility function to format date to "X ago" format
const formatTimeAgo = (publishedAt: string): string => {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffInMs = now.getTime() - published.getTime();
  
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
};

// Check if video is considered "new" (within 24 hours)
const isNewVideo = (publishedAt: string): boolean => {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffInHours = (now.getTime() - published.getTime()) / (1000 * 60 * 60);
  return diffInHours <= 24;
};

interface CollectionsViewProps {
  onClose: () => void;
}

const CollectionsView: React.FC<CollectionsViewProps> = ({ onClose }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [folderVideos, setFolderVideos] = useState<{[folderId: string]: any[]}>({});
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isAddingChannels, setIsAddingChannels] = useState(false);
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [quotaResetTime, setQuotaResetTime] = useState<number | null>(null);

  useEffect(() => {
    loadFolders();
    loadChannels();
    checkApiQuotaStatus();

    // Listen for storage changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.folders) {
          setFolders(changes.folders.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Preload videos for first 3 folders when component mounts
  useEffect(() => {
    if (folders.length > 0 && channels.length > 0) {
      const foldersToPreload = folders.slice(0, 3);
      foldersToPreload.forEach(folder => {
        if (!folderVideos[folder.id]) {
          loadFolderVideos(folder);
        }
      });
    }
  }, [folders, channels]);

  const loadFolders = async () => {
    try {
      // Check if extension context is still valid
      if (!isExtensionContextValid()) {
        console.warn('FolderTube: Extension context invalidated, cannot load folders');
        showExtensionReloadNotification();
        return;
      }
      
      // Load from chrome.storage.local where AI Sort saves folders
      const result = await safeStorageGet(['folders']);
      const loadedFolders = result.folders || [];
      setFolders(loadedFolders);
      if (loadedFolders.length > 0) {
        setSelectedFolder(loadedFolders[0]);
      }
    } catch (error) {
      // Handle extension context invalidation gracefully
      if ((error as Error).message?.includes('Extension context invalidated')) {
        console.warn('FolderTube: Extension was reloaded. Please refresh the page to continue using the extension.');
        showExtensionReloadNotification();
        return;
      }
      
      console.error('Error loading folders:', error);
    }
  };

  const checkApiQuotaStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'getApiUsage' });
      if (response) {
        // API quota tracking removed for simplicity
      }
      
      // Check for emergency mode
      const storage = await chrome.storage.local.get(['quotaExceeded', 'quotaResetTime']);
      setQuotaExceeded(storage.quotaExceeded || false);
      setQuotaResetTime(storage.quotaResetTime || null);
    } catch (error) {
      // Background script not available, check storage directly
      const storage = await chrome.storage.local.get(['quotaExceeded', 'quotaResetTime']);
      setQuotaExceeded(storage.quotaExceeded || false);
      setQuotaResetTime(storage.quotaResetTime || null);
    }
  };

  const loadChannels = async () => {
    let allChannels: Channel[] = [];

    try {
      // Method 1: Try YouTubeScraper first
      const scrapedChannels = await import('../utils/youtube-scraper').then(module => 
        module.YouTubeScraper.getSubscriptions()
      );
      
      if (scrapedChannels && scrapedChannels.length > 0) {
        allChannels = scrapedChannels;
      }
    } catch (error) {
    }

    // Method 2: Always try DOM extraction to get more channels
    try {
      // Look for subscription channels in multiple possible locations
      const selectors = [
        // Standard subscription items
        'ytd-guide-entry-renderer[line-end-style]',
        // Channel items in sidebar
        '#items ytd-guide-entry-renderer',
        // Expanded subscription section
        'ytd-guide-collapsible-entry-renderer ytd-guide-entry-renderer',
        // Any element with channel links
        '[href*="/@"]:has(img[id="avatar"])',
        '[href*="/channel/"]:has(img[id="avatar"])'
      ];

      const extractedChannels: Channel[] = [];
      const seenChannelIds = new Set<string>();

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);

        elements.forEach((element) => {
          // Try different ways to extract channel info
          let linkElement = element.querySelector('a[href*="/@"], a[href*="/channel/"]') as HTMLAnchorElement;
          if (!linkElement && element.tagName === 'A') {
            linkElement = element as HTMLAnchorElement;
          }

          const avatarImg = element.querySelector('img[id="avatar"], img.yt-img-shadow') as HTMLImageElement;
          const nameElement = element.querySelector('#text, .yt-formatted-string, [role="text"]');

          if (linkElement && avatarImg && nameElement) {
            const href = linkElement.getAttribute('href');
            let channelId = '';

            // Extract channel ID from different URL formats
            if (href?.includes('/@')) {
              const match = href.match(/\/@([^\/\?]+)/);
              channelId = match ? match[1] : '';
            } else if (href?.includes('/channel/')) {
              const match = href.match(/\/channel\/([^\/\?]+)/);
              channelId = match ? match[1] : '';
            }

            const channelName = nameElement.textContent?.trim() || '';

            if (channelId && channelName && !seenChannelIds.has(channelId)) {
              seenChannelIds.add(channelId);
              extractedChannels.push({
                id: channelId,
                name: channelName,
                url: href || `https://www.youtube.com/@${channelId}`,
                avatarUrl: avatarImg.src || avatarImg.getAttribute('src') || ''
              });
            }
          }
        });
      }


      // Merge scraped and extracted channels, avoiding duplicates
      const channelMap = new Map<string, Channel>();
      
      // Add scraped channels first (higher priority)
      allChannels.forEach(channel => {
        channelMap.set(channel.id, channel);
      });

      // Add extracted channels that aren't already present
      extractedChannels.forEach(channel => {
        if (!channelMap.has(channel.id)) {
          channelMap.set(channel.id, channel);
        }
      });

      allChannels = Array.from(channelMap.values());
    } catch (error) {
    }

    setChannels(allChannels);
  };

  useEffect(() => {
    if (selectedFolder) {
      const hasVideos = folderVideos[selectedFolder.id];
      if (!hasVideos) {
        loadFolderVideos(selectedFolder);
      }
    }
  }, [selectedFolder, folderVideos, forceRefresh]);

  const loadFolderVideos = async (folder: Folder, forceRefresh: boolean = false) => {
    setLoadingVideos(true);
    
    // Load videos in parallel for faster performance
    const videoPromises = folder.channelIds.map(async (channelId) => {
      try {
        const channel = channels.find(c => c.id === channelId);
        const channelVideos = await YouTubeAPI.getChannelVideos(channelId, channel?.name || '', forceRefresh);
        if (channelVideos.videos && channelVideos.videos.length > 0) {
          const result = {
            channel: channel || { id: channelId, name: channelVideos.channelName || channelId, url: '', avatarUrl: '' },
            videos: channelVideos.videos.slice(0, 4)
          };
          return result;
        }
        return null;
      } catch (error) {
        console.error(`Error loading videos for channel ${channelId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(videoPromises);
    const videos = results.filter(result => result !== null);
    setFolderVideos(prev => ({
      ...prev,
      [folder.id]: videos
    }));
    setLoadingVideos(false);
  };

  const getChannelCount = (folder: Folder) => {
    return folder.channelIds.length;
  };

  const startEditingFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const saveEditedFolderName = async () => {
    if (!editingFolderId || !editingFolderName.trim()) return;

    const updatedFolders = folders.map(folder => 
      folder.id === editingFolderId 
        ? { ...folder, name: editingFolderName.trim() }
        : folder
    );

    setFolders(updatedFolders);
    await chrome.storage.local.set({ folders: updatedFolders });
    
    if (selectedFolder?.id === editingFolderId) {
      setSelectedFolder({ ...selectedFolder, name: editingFolderName.trim() });
    }

    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const removeChannelFromFolder = async (folderId: string, channelId: string) => {
    const updatedFolders = folders.map(folder => 
      folder.id === folderId 
        ? { ...folder, channelIds: folder.channelIds.filter(id => id !== channelId) }
        : folder
    );

    setFolders(updatedFolders);
    await chrome.storage.local.set({ folders: updatedFolders });

    if (selectedFolder?.id === folderId) {
      setSelectedFolder(updatedFolders.find(f => f.id === folderId) || null);
    }

    // Clear video cache for this folder since channel list changed
    const newFolderVideos = { ...folderVideos };
    delete newFolderVideos[folderId];
    setFolderVideos(newFolderVideos);
  };

  const resolveChannelId = async (channelId: string, channelName: string): Promise<{ resolvedId: string, resolvedName: string, avatarUrl: string }> => {
    // If it's already a proper UC channel ID, return as-is
    if (channelId.startsWith('UC')) {
      return { resolvedId: channelId, resolvedName: channelName, avatarUrl: '' };
    }
    
    // If it's a handle or custom ID, try to resolve it via YouTube API
    try {
      console.log(`FolderTube: Resolving channel ID for ${channelId} (${channelName})`);
      
      // First try to get channel details which will give us the proper UC ID
      const channelDetails = await YouTubeAPI.getChannelDetails([channelId]);
      if (channelDetails.length > 0) {
        const detail = channelDetails[0];
        console.log(`FolderTube: Resolved ${channelId} to ${detail.id}`);
        return { 
          resolvedId: detail.id, 
          resolvedName: detail.name || channelName,
          avatarUrl: '' // We could add thumbnail here if needed
        };
      }
      
      // If that fails, try searching for the channel by name
      console.log(`FolderTube: Fallback: searching for channel by name: ${channelName}`);
      const searchResults = await YouTubeAPI.searchChannelByName(channelName);
      if (searchResults.length > 0) {
        const result = searchResults[0];
        console.log(`FolderTube: Found channel via search: ${result.id}`);
        return {
          resolvedId: result.id,
          resolvedName: result.name,
          avatarUrl: result.thumbnails?.default?.url || ''
        };
      }
      
    } catch (error) {
      console.warn(`FolderTube: Failed to resolve channel ID for ${channelId}:`, error);
    }
    
    // Fallback: return original ID if resolution fails
    console.log(`FolderTube: Using original channel ID as fallback: ${channelId}`);
    return { resolvedId: channelId, resolvedName: channelName, avatarUrl: '' };
  };

  const addChannelToFolder = async (folderId: string, channelId: string, channelData?: { name: string, avatarUrl: string }) => {
    // Resolve the channel ID to proper UC format if needed
    const { resolvedId, resolvedName, avatarUrl } = await resolveChannelId(
      channelId, 
      channelData?.name || channelId
    );
    
    console.log(`FolderTube: Adding channel to folder - Original: ${channelId}, Resolved: ${resolvedId}`);
    
    // Ensure the channel exists in the channels array for UI display
    const existingChannel = channels.find(c => c.id === resolvedId);
    
    if (!existingChannel) {
      const newChannel = {
        id: resolvedId,
        name: resolvedName,
        url: `https://www.youtube.com/${resolvedId.startsWith('@') ? resolvedId : `channel/${resolvedId}`}`,
        avatarUrl: channelData?.avatarUrl || avatarUrl || ''
      };
      
      // Use functional update to ensure the state change is applied
      setChannels(prevChannels => [...prevChannels, newChannel]);
    }
    
    // Remove the channel from any existing folder to ensure exclusivity
    const updatedFolders = await Promise.all(folders.map(async folder => {
      if (folder.id === folderId) {
        // Check if channel is already in this folder to avoid duplicates
        if (!folder.channelIds.includes(resolvedId) && !folder.channelIds.includes(channelId)) {
          const newChannelIds = [...folder.channelIds, resolvedId];
          console.log(`FolderTube: Adding channel ${resolvedId} to folder ${folder.name}`);
          return { ...folder, channelIds: newChannelIds };
        } else {
          console.log(`FolderTube: Channel ${resolvedId} already exists in folder ${folder.name}`);
          return folder; // Channel already exists, no change needed
        }
      } else {
        // Remove from any other folder - need to check by resolving each ID
        const filteredChannelIds = [];
        
        for (const existingId of folder.channelIds) {
          try {
            // Resolve existing channel ID to compare properly
            const existingChannel = channels.find(c => c.id === existingId);
            const { resolvedId: existingResolvedId } = await resolveChannelId(
              existingId,
              existingChannel?.name || existingId
            );
            
            // Keep the channel if it doesn't match (by any ID combination)
            const shouldKeep = !(
              existingId === channelId ||
              existingId === resolvedId ||
              existingResolvedId === channelId ||
              existingResolvedId === resolvedId
            );
            
            if (shouldKeep) {
              filteredChannelIds.push(existingId);
            } else {
              console.log(`FolderTube: Removing channel ${existingId} (resolved: ${existingResolvedId}) from folder ${folder.name}`);
            }
          } catch (error) {
            // If resolution fails, keep the channel (conservative approach)
            console.warn(`FolderTube: Failed to resolve ${existingId} for removal check:`, error);
            
            // Simple fallback comparison
            if (existingId !== channelId && existingId !== resolvedId) {
              filteredChannelIds.push(existingId);
            }
          }
        }
        
        return { ...folder, channelIds: filteredChannelIds };
      }
    }));
    setFolders(updatedFolders);
    await chrome.storage.local.set({ folders: updatedFolders });

    // Clear the video cache for ALL affected folders to force refresh
    const newFolderVideos = { ...folderVideos };
    
    // Clear cache for target folder
    delete newFolderVideos[folderId];
    
    // Clear cache for any folder that previously had this channel
    folders.forEach(folder => {
      if (folder.channelIds.includes(channelId)) {
        delete newFolderVideos[folder.id];
      }
    });
    
    // Update video cache state
    setFolderVideos(newFolderVideos);
    
    // Update selected folder if it's the target folder (AFTER clearing cache)
    const targetFolder = updatedFolders.find(f => f.id === folderId);
    if (selectedFolder?.id === folderId && targetFolder) {
      // Force an immediate state update
      setSelectedFolder({ ...targetFolder });
    }
    
    // Immediately reload videos for the target folder
    const updatedTargetFolder = updatedFolders.find(f => f.id === folderId);
    if (updatedTargetFolder) {
      // Show immediate feedback that the channel was added
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(updatedTargetFolder);
      }
      
      // Load videos for the newly added channel immediately
      loadFolderVideos(updatedTargetFolder, true); // Force refresh
    }
    
    
    // Force a re-render by updating the force refresh counter
    setForceRefresh(prev => prev + 1);
  };

  const showAddChannelDialog = () => {
    if (!selectedFolder) return;
    
    // Get all channel IDs that are already assigned to ANY folder
    const assignedChannelIds = new Set<string>();
    folders.forEach(folder => {
      folder.channelIds.forEach(channelId => {
        assignedChannelIds.add(channelId);
      });
    });
    
    // Filter to only show unassigned channels
    const available = channels.filter(channel => !assignedChannelIds.has(channel.id));
    setAvailableChannels(available);
    setIsAddingChannels(true);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    
    
    try {
      // Try to get data from different formats
      let dragData = null;
      let rawData = '';
      
      
      // Try custom foldertube format first
      rawData = e.dataTransfer.getData('text/foldertube');
      if (rawData) {
        dragData = JSON.parse(rawData);
      } else {
        // Try application/json
        rawData = e.dataTransfer.getData('application/json');
        if (rawData) {
          dragData = JSON.parse(rawData);
        } else {
          // Fallback to text/plain
          rawData = e.dataTransfer.getData('text/plain');
          
          if (rawData) {
            // Check if it's already JSON
            if (rawData.startsWith('{')) {
              dragData = JSON.parse(rawData);
            } else {
            // Handle non-JSON format (might be just channel name/id)
            
            // Try to get data from the dragged element's attributes
            const draggedElements = document.querySelectorAll('[data-foldertube-draggable="true"]');
            
            for (const element of draggedElements) {
              const elementChannelName = element.getAttribute('data-channel-name');
              const elementChannelId = element.getAttribute('data-channel-id');
              
              if (elementChannelName && (rawData.includes(elementChannelName) || rawData.includes(elementChannelId || ''))) {
                dragData = {
                  channelId: elementChannelId,
                  channelName: elementChannelName,
                  avatarUrl: element.getAttribute('data-channel-avatar'),
                  source: 'sidebar'
                };
                break;
              }
            }
            
            // If still no data, try to use the raw data as channel name
            if (!dragData && rawData.trim()) {
              // Look for any element that might match
              const allChannelElements = document.querySelectorAll('[href*="/@"], [href*="/channel/"]');
              for (const element of allChannelElements) {
                const channelLink = element.getAttribute('href');
                const nameElement = element.querySelector('#text, .yt-formatted-string, [role="text"]');
                const channelName = nameElement?.textContent?.trim();
                
                if (channelName && (rawData.includes(channelName) || channelName.includes(rawData.trim()))) {
                  let channelId = '';
                  if (channelLink?.includes('/@')) {
                    const match = channelLink.match(/\/@([^\/\?]+)/);
                    channelId = match ? match[1] : '';
                  }
                  
                  if (channelId) {
                    dragData = {
                      channelId,
                      channelName,
                      avatarUrl: '',
                      source: 'sidebar'
                    };
                    break;
                  }
                }
              }
            }
            }
          } else {
            
            // Try text/html as last resort
            const htmlData = e.dataTransfer.getData('text/html');
            if (htmlData) {
              
              // Parse HTML to extract channel data
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = htmlData;
              const spanElement = tempDiv.querySelector('span[data-channel-id]');
              
              if (spanElement) {
                const channelId = spanElement.getAttribute('data-channel-id');
                const channelName = spanElement.getAttribute('data-channel-name') || spanElement.textContent;
                
                if (channelId && channelName) {
                  dragData = {
                    channelId,
                    channelName,
                    avatarUrl: '',
                    source: 'sidebar'
                  };
                }
              }
            }
          }
        }
      }
      
      // Final fallback: try global backup data
      if (!dragData) {
        const globalData = (window as any).foldertubeDragData;
        if (globalData) {
          dragData = globalData;
        }
      }
      
      if (dragData && dragData.channelId && targetFolderId) {
        
        // First resolve the channel ID to check for duplicates properly
        let resolvedId, resolvedName;
        try {
          const resolved = await resolveChannelId(
            dragData.channelId, 
            dragData.channelName || dragData.channelId
          );
          resolvedId = resolved.resolvedId;
          resolvedName = resolved.resolvedName;
        } catch (error) {
          if ((error as Error).message?.includes('Extension context invalidated')) {
            console.warn('FolderTube: Extension was reloaded. Please refresh the page to continue.');
            return;
          }
          // Fallback to original data if resolution fails
          resolvedId = dragData.channelId;
          resolvedName = dragData.channelName || dragData.channelId;
        }
        
        console.log(`FolderTube: Duplicate check - Original ID: ${dragData.channelId}, Resolved ID: ${resolvedId}, Name: ${resolvedName}`);
        
        // Check if the channel already exists in another folder by comparing resolved IDs and names
        let existingFolder = null;
        
        for (const folder of folders) {
          if (folder.id === targetFolderId) continue; // Skip target folder
          
          // Check each channel in the folder
          for (const existingChannelId of folder.channelIds) {
            // Resolve the existing channel ID to compare properly
            try {
              const existingChannel = channels.find(c => c.id === existingChannelId);
              let existingResolvedId, existingResolvedName;
              
              try {
                const resolved = await resolveChannelId(
                  existingChannelId,
                  existingChannel?.name || existingChannelId
                );
                existingResolvedId = resolved.resolvedId;
                existingResolvedName = resolved.resolvedName;
              } catch (resolveError) {
                if ((resolveError as Error).message?.includes('Extension context invalidated')) {
                  console.warn('FolderTube: Extension was reloaded during duplicate check. Please refresh the page.');
                  return;
                }
                // Fallback to original data if resolution fails
                existingResolvedId = existingChannelId;
                existingResolvedName = existingChannel?.name || existingChannelId;
              }
              
              console.log(`FolderTube: Comparing with existing - ID: ${existingChannelId}, Resolved: ${existingResolvedId}, Name: ${existingResolvedName}`);
              
              // Check if IDs match (any combination)
              const idsMatch = (
                dragData.channelId === existingChannelId ||
                dragData.channelId === existingResolvedId ||
                resolvedId === existingChannelId ||
                resolvedId === existingResolvedId
              );
              
              // Check if names match (case insensitive, normalized)
              const normalizedDragName = (dragData.channelName || resolvedName || '').toLowerCase().trim();
              const normalizedExistingName = (existingChannel?.name || existingResolvedName || '').toLowerCase().trim();
              const namesMatch = normalizedDragName && normalizedExistingName && normalizedDragName === normalizedExistingName;
              
              if (idsMatch || namesMatch) {
                console.log(`FolderTube: Duplicate found in folder "${folder.name}" - IDs match: ${idsMatch}, Names match: ${namesMatch}`);
                existingFolder = folder;
                break;
              }
            } catch (error) {
              console.warn(`FolderTube: Error resolving channel ${existingChannelId} for duplicate check:`, error);
              // Continue checking other channels even if one fails
            }
          }
          
          if (existingFolder) break; // Found duplicate, stop searching
        }
        
        if (existingFolder) {
          // Show confirmation dialog
          const confirmed = window.confirm(
            `This channel "${dragData.channelName}" is already in the "${existingFolder.name}" folder. Do you want to move it here instead?`
          );
          
          if (!confirmed) {
            // User cancelled, don't proceed with the drop
            return;
          }
        }
        
        // Add the channel to the target folder (will handle moving from other folders)
        try {
          await addChannelToFolder(targetFolderId, dragData.channelId, {
            name: dragData.channelName,
            avatarUrl: dragData.avatarUrl || ''
          });
          
          // Force a complete UI refresh by reloading everything from storage
          const refreshData = await chrome.storage.local.get(['folders']);
          if (refreshData.folders) {
            setFolders(refreshData.folders);
            
            // Clear video cache for ALL folders to force complete refresh
            setFolderVideos({});
            
            // Update selected folder state if we're currently viewing any affected folder
            if (selectedFolder) {
              // Check if we're viewing the target folder or the folder the channel was removed from
              const updatedSelectedFolder = refreshData.folders.find((f: any) => f.id === selectedFolder.id);
              if (updatedSelectedFolder) {
                setSelectedFolder(updatedSelectedFolder);
                console.log(`FolderTube: Updated selected folder "${updatedSelectedFolder.name}" - now has ${updatedSelectedFolder.channelIds.length} channels`);
              } else {
                // Folder might have been deleted, clear selection
                setSelectedFolder(null);
              }
            }
          }
        
          // Force UI refresh
          setForceRefresh(prev => prev + 1);
          
          
          // Show success message
          const message = document.createElement('div');
          message.textContent = `Moved ${dragData.channelName} to folder`;
          message.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
          `;
          document.body.appendChild(message);
          
          setTimeout(() => {
            message.remove();
          }, 2000);
          
        } catch (addError) {
          if ((addError as Error).message?.includes('Extension context invalidated')) {
            // Show user-friendly message for extension context invalidation
            const errorMessage = document.createElement('div');
            errorMessage.textContent = 'Extension was updated. Please refresh the page to continue.';
            errorMessage.style.cssText = `
              position: fixed;
              top: 80px;
              left: 50%;
              transform: translateX(-50%);
              background: #ff9800;
              color: white;
              padding: 12px 20px;
              border-radius: 20px;
              font-size: 14px;
              z-index: 10000;
              box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
              cursor: pointer;
            `;
            errorMessage.onclick = () => window.location.reload();
            document.body.appendChild(errorMessage);
            
            setTimeout(() => {
              if (errorMessage.parentNode) {
                errorMessage.remove();
              }
            }, 10000);
            return;
          }
          
          console.error('FolderTube: Error adding channel to folder:', addError);
          
          // Show error message
          const errorMessage = document.createElement('div');
          errorMessage.textContent = 'Failed to move channel. Please try again.';
          errorMessage.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: #dc2626;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
          `;
          document.body.appendChild(errorMessage);
          
          setTimeout(() => {
            errorMessage.remove();
          }, 3000);
        }
      } else {
        
        // Show error message
        const message = document.createElement('div');
        message.textContent = 'Failed to move channel - invalid data';
        message.style.cssText = `
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: #dc2626;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          z-index: 10000;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
          message.remove();
        }, 2000);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      
      // Show error message
      const message = document.createElement('div');
      message.textContent = 'Failed to move channel - parsing error';
      message.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #dc2626;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
      `;
      document.body.appendChild(message);
      
      setTimeout(() => {
        message.remove();
      }, 2000);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="yt-collections-view" style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#f9f9f9',
      padding: '20px',
      paddingTop: '60px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      {quotaExceeded && quotaResetTime && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '12px 20px',
          margin: '0 20px 20px 20px',
          fontSize: '14px',
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️</span>
          <div>
            <strong>API Quota Exceeded</strong> - Using cached videos only. 
            Fresh videos will resume after quota reset in{' '}
            {Math.ceil((quotaResetTime - Date.now()) / (1000 * 60 * 60))} hours.
          </div>
        </div>
      )}
      
      <div className="collections-header" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '0 20px',
        position: 'relative'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: '500', color: '#0f0f0f', margin: 0 }}>Your Collections</h1>
        <button className="back-button" onClick={onClose} style={{
          position: 'absolute',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#0f0f0f'
        }}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
          </svg>
          Back to YouTube
        </button>
      </div>

      <div className="collections-container" style={{
        display: 'flex',
        gap: '20px',
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        minHeight: '600px'
      }}>
        <div className="folders-sidebar" style={{
          width: '280px',
          backgroundColor: '#f8f8f8',
          borderRight: '1px solid #e5e5e5',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0f0f0f', margin: '0 0 16px 0' }}>
            Folders ({folders.length})
          </h2>
          {folders.length === 0 ? (
            <div style={{ padding: '20px 0', color: '#666', fontSize: '14px', textAlign: 'center' }}>
              No folders found.<br/>
              Use AI Sort to create folders first.
            </div>
          ) : (
            <div className="folders-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className={`folder-item ${selectedFolder?.id === folder.id ? 'selected' : ''}`}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: selectedFolder?.id === folder.id ? '#6d28d9' : 'transparent',
                    color: selectedFolder?.id === folder.id ? 'white' : 'inherit',
                    position: 'relative'
                  }}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (selectedFolder?.id !== folder.id) {
                      e.currentTarget.style.backgroundColor = 'rgba(109, 40, 217, 0.1)';
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (selectedFolder?.id !== folder.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {editingFolderId === folder.id ? (
                    <input
                      type="text"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      onBlur={saveEditedFolderName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditedFolderName();
                        if (e.key === 'Escape') {
                          setEditingFolderId(null);
                          setEditingFolderName('');
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: '14px',
                        fontWeight: '400',
                        background: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        color: '#0f0f0f',
                        flex: 1,
                        marginRight: '8px'
                      }}
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="folder-name" 
                      style={{ fontSize: '14px', fontWeight: '400', flex: 1 }}
                      onClick={() => setSelectedFolder(folder)}
                    >
                      {folder.name}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {editingFolderId !== folder.id && selectedFolder?.id === folder.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingFolder(folder);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: 'white',
                          opacity: 0.8
                        }}
                        title="Edit folder name"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                        </svg>
                      </button>
                    )}
                    <span className="channel-count" style={{ 
                      fontSize: '12px', 
                      color: selectedFolder?.id === folder.id ? 'rgba(255, 255, 255, 0.8)' : '#606060',
                      flexShrink: 0 
                    }}>
                      {getChannelCount(folder)} channels
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="folder-content">
          {selectedFolder ? (
            <div className="folder-details">
              <h2>{selectedFolder.name}</h2>
              <div className="channels-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>Channels ({selectedFolder.channelIds.length})</h3>
                  <button
                    onClick={showAddChannelDialog}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#6d28d9',
                      color: 'white',
                      border: 'none',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#5b21b6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#6d28d9';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                    </svg>
                    Add Channel
                  </button>
                  
                </div>
                <div 
                  className="channels-list" 
                  key={`channels-${selectedFolder.id}-${forceRefresh}`}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '32px',
                    padding: '0',
                    minHeight: '50px'
                  }}
                >
                  {selectedFolder.channelIds.map((channelId: string) => {
                    const channel = channels.find(c => c.id === channelId);
                    
                    // Always render something, even if channel data is missing
                    const displayName = channel?.name || channelId;
                    const displayAvatar = channel?.avatarUrl || '';
                    
                    return (
                      <div 
                        key={channelId} 
                        className="channel-item" 
                        style={{ 
                          position: 'relative', 
                          display: 'flex !important', 
                          alignItems: 'center', 
                          gap: '8px', 
                          padding: '8px 16px', 
                          background: '#f0f0f0 !important', 
                          borderRadius: '20px', 
                          fontSize: '14px !important', 
                          color: '#0f0f0f !important',
                          minWidth: '150px !important',
                          minHeight: '40px !important',
                          zIndex: '99999 !important'
                        }}
                      >
                        {displayAvatar ? (
                          <img src={displayAvatar} alt={displayName} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#666' }}>
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <a 
                          href={channel?.url || `https://www.youtube.com/${channelId?.startsWith('@') ? channelId : `channel/${channelId}`}`}
                          style={{
                            flex: 1,
                            color: '#065fd4',
                            textDecoration: 'none',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          {displayName}
                        </a>
                        <button
                          onClick={() => removeChannelFromFolder(selectedFolder.id, channelId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#dc2626',
                            opacity: 0.7,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.7';
                          }}
                          title="Remove channel from folder"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="videos-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>Recent Videos</h3>
                </div>
                {loadingVideos ? (
                  <div className="loading">Loading videos...</div>
                ) : (
                  <div className="channel-videos-list">
                    {folderVideos[selectedFolder.id]?.map((channelData, index) => (
                      <div key={index} className="channel-videos-group">
                        <div className="channel-header">
                          <img src={channelData.channel.avatarUrl} alt={channelData.channel.name} />
                          <a 
                            href={channelData.channel.url || `https://www.youtube.com/${channelData.channel.id?.startsWith('@') ? channelData.channel.id : `channel/${channelData.channel.id}`}`}
                            style={{
                              color: '#065fd4',
                              textDecoration: 'none',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration = 'underline';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = 'none';
                            }}
                          >
                            {channelData.channel.name}
                          </a>
                        </div>
                        <div className="videos-grid">
                          {channelData.videos.map((video: any) => (
                            <a
                              key={video.id}
                              href={`https://www.youtube.com/watch?v=${video.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="video-item"
                            >
                              <img src={video.thumbnail} alt={video.title} />
                              <div className="video-info">
                                <div className="video-title">
                                  {video.title}
                                  {isNewVideo(video.publishedAt) && (
                                    <span style={{
                                      marginLeft: '8px',
                                      padding: '2px 6px',
                                      backgroundColor: '#ff4444',
                                      color: 'white',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      borderRadius: '4px',
                                      textTransform: 'uppercase'
                                    }}>
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <div className="video-meta">
                                  {video.viewCount ? `${parseInt(video.viewCount).toLocaleString()} views` : ''} • {formatTimeAgo(video.publishedAt)}
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="no-folder-selected">
              <p>Select a folder to view its contents</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Channel Dialog */}
      {isAddingChannels && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '70vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>Add Channels to "{selectedFolder?.name}"</h3>
              <button
                onClick={() => setIsAddingChannels(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {availableChannels.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', margin: '40px 0' }}>
                <p>All available channels are already assigned to folders.</p>
                <button
                  onClick={() => {
                    loadChannels();
                    showAddChannelDialog();
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#6d28d9',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginTop: '12px'
                  }}
                >
                  Refresh Channels
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableChannels.map(channel => (
                  <div
                    key={channel.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      if (selectedFolder) {
                        addChannelToFolder(selectedFolder.id, channel.id, {
                          name: channel.name,
                          avatarUrl: channel.avatarUrl || ''
                        });
                        setAvailableChannels(availableChannels.filter(c => c.id !== channel.id));
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                      e.currentTarget.style.borderColor = '#6d28d9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    <img
                      src={channel.avatarUrl}
                      alt={channel.name}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%'
                      }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{channel.name}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto', color: '#6d28d9' }}>
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionsView;