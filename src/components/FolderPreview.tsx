import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { YouTubeAPI } from '../utils/youtube-api';
import type { VideoData } from '../utils/cache-service';
import { formatRelativeTime, formatViewCount, isNewVideo } from '../utils/format-helpers';

type ContentCategory = 'videos' | 'shorts' | 'live' | 'playlists' | 'community';

interface Channel {
  id: string;
  name: string;
  thumbnail: string;
  url?: string;
}

interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}

interface FolderPreviewProps {
  isVisible: boolean;
  selectedFolderId: string;
  folders: Folder[];
  getChannelById: (id: string) => Channel | undefined;
  onRemoveChannel?: (folderId: string, channelId: string) => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onEditFolderName?: (folderId: string, newName: string) => void;
}

const FolderPreview: React.FC<FolderPreviewProps> = ({ 
  isVisible, 
  selectedFolderId,
  folders,
  getChannelById,
  onRemoveChannel,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onEditFolderName
}) => {
  const [currentFolderId, setCurrentFolderId] = useState(selectedFolderId);
  
  // Update current folder when selectedFolderId changes
  useEffect(() => {
    setCurrentFolderId(selectedFolderId);
  }, [selectedFolderId]);
  
  // Update editing name when folder changes
  useEffect(() => {
    const folder = folders.find(f => f.id === currentFolderId);
    if (folder) {
      setEditingName(folder.name);
    }
  }, [currentFolderId, folders]);
  
  const currentFolder = folders.find(f => f.id === currentFolderId);
  const channels = currentFolder ? currentFolder.channelIds.map(id => getChannelById(id)).filter((ch): ch is Channel => ch !== undefined) : [];
  const folderName = currentFolder?.name || 'Unknown Folder';
  const folderId = currentFolder?.id || '';
  
  // Debug logging
  console.log('FolderPreview: Folder and channel mapping', {
    currentFolderId,
    currentFolder: currentFolder ? { name: currentFolder.name, channelIds: currentFolder.channelIds } : null,
    channelsFound: channels.length,
    channelDetails: channels.map(ch => ({ id: ch.id, name: ch.name })),
    channelMappingResults: currentFolder ? currentFolder.channelIds.map(id => ({
      folderId: id,
      foundChannel: getChannelById(id),
      hasChannel: !!getChannelById(id)
    })) : []
  });
  
  // Retry loading channels if they're not found initially
  useEffect(() => {
    if (isVisible && currentFolder && currentFolder.channelIds.length > 0 && channels.length === 0) {
      console.log('FolderPreview: No channels found, will retry in 2 seconds');
      const retryTimeout = setTimeout(() => {
        // Force re-render to check if channels are now available
        setCurrentFolderId(prev => prev === currentFolderId ? prev : currentFolderId);
      }, 2000);
      
      return () => clearTimeout(retryTimeout);
    }
  }, [isVisible, currentFolder, channels.length, currentFolderId]);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState({ x: 380, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeCategory, setActiveCategory] = useState<ContentCategory>('videos');
  const [channelVideos, setChannelVideos] = useState<Map<string, VideoData[]>>(new Map());
  const [loadingChannels, setLoadingChannels] = useState<Set<string>>(new Set());
  const [errorChannels, setErrorChannels] = useState<Map<string, string>>(new Map());
  const [isPremium] = useState(false); // Disable automatic API calls to conserve quota
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(folderName);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Calculate new position
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Get viewport dimensions and modal size
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const modalWidth = 800; // Modal width from styles
        const modalHeight = 600; // Estimated modal height
        
        // Apply bounds checking to keep modal within viewport
        const boundedX = Math.max(0, Math.min(newX, viewportWidth - modalWidth));
        const boundedY = Math.max(40, Math.min(newY, viewportHeight - modalHeight));
        
        setPosition({
          x: boundedX,
          y: boundedY
        });
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const loadChannelVideos = useCallback(async () => {
    console.log('FolderPreview: loadChannelVideos called', { 
      isVisible, 
      channelsLength: channels.length, 
      activeCategory, 
      channels: channels.map(c => ({ id: c.id, name: c.name })),
      folderChannelIds: currentFolder?.channelIds || []
    });
    
    if (!isVisible) {
      console.log('FolderPreview: Skipping video load - not visible');
      return;
    }
    
    if (activeCategory !== 'videos') {
      console.log('FolderPreview: Skipping video load - not on videos tab');
      return;
    }
    
    if (channels.length === 0 && (!currentFolder || currentFolder.channelIds.length === 0)) {
      console.log('FolderPreview: Skipping video load - no channels and no channel IDs in folder');
      return;
    }
    
    // If we have channel IDs but no matched channels, try to load videos using the raw channel IDs
    const channelsToLoad = channels.length > 0 ? channels : [];
    if (channelsToLoad.length === 0 && currentFolder && currentFolder.channelIds.length > 0) {
      console.log('FolderPreview: No matched channels found, attempting to load videos directly using channel IDs');
      // Try to load videos using raw channel IDs when we can't match them to channel objects
      for (const channelId of currentFolder.channelIds) {
        if (!channelVideos.has(channelId) && !loadingChannels.has(channelId) && !errorChannels.has(channelId)) {
          console.log('FolderPreview: Loading videos for unmatched channel ID', channelId);
          setLoadingChannels(prev => new Set(prev).add(channelId));
          
          try {
            const result = await YouTubeAPI.getChannelVideos(
              channelId,
              `Channel ${channelId}`, // Fallback name
              false,
              isPremium
            );
            
            console.log('FolderPreview: Successfully loaded videos for unmatched channel', channelId, result.videos.length, 'videos');
            
            setChannelVideos(prev => {
              const newMap = new Map(prev);
              newMap.set(channelId, result.videos);
              return newMap;
            });
            
            setErrorChannels(prev => {
              const newMap = new Map(prev);
              newMap.delete(channelId);
              return newMap;
            });
            
          } catch (error) {
            console.error(`FolderPreview: Failed to load videos for unmatched channel ${channelId}:`, error);
            
            let errorMessage = 'Failed to load videos';
            if (error instanceof Error) {
              if (error.message.includes('quota') || error.message.includes('403') || error.message.includes('quotaExceeded')) {
                errorMessage = 'YouTube API quota exceeded. Videos will load from cache when available.';
              } else if (error.message.includes('YouTube API key not configured')) {
                errorMessage = 'YouTube API key not configured. Please check extension setup.';
              } else if (error.message.includes('Network request failed') || error.message.includes('timeout') || error.message.includes('ERR_NETWORK') || error.message.includes('timed out')) {
                errorMessage = 'Network error. Check your internet connection and try again.';
              } else if (error.message.includes('401') || error.message.includes('Authentication')) {
                errorMessage = 'Authentication error. Please refresh the page.';
              } else if (error.message.includes('404')) {
                errorMessage = 'Channel not found or made private.';
              } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
                errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
              } else {
                errorMessage = `Error: ${error.message}`;
              }
            }
            
            setErrorChannels(prev => {
              const newMap = new Map(prev);
              newMap.set(channelId, errorMessage);
              return newMap;
            });
          } finally {
            setLoadingChannels(prev => {
              const newSet = new Set(prev);
              newSet.delete(channelId);
              return newSet;
            });
          }
        }
      }
      return;
    }
    
    for (const channel of channelsToLoad) {
      console.log('FolderPreview: Processing channel', { 
        channelId: channel.id, 
        channelName: channel.name,
        hasVideos: channelVideos.has(channel.id),
        isLoading: loadingChannels.has(channel.id),
        hasError: errorChannels.has(channel.id)
      });
      
      if (!channelVideos.has(channel.id) && !loadingChannels.has(channel.id) && !errorChannels.has(channel.id)) {
        console.log('FolderPreview: Loading videos for channel', channel.name);
        setLoadingChannels(prev => new Set(prev).add(channel.id));
        
        try {
          const result = await YouTubeAPI.getChannelVideos(
            channel.id,
            channel.name,
            false,
            isPremium
          );
          
          console.log('FolderPreview: Successfully loaded videos for', channel.name, result.videos.length, 'videos');
          
          setChannelVideos(prev => {
            const newMap = new Map(prev);
            newMap.set(channel.id, result.videos);
            return newMap;
          });
          
          // Clear any previous errors for this channel
          setErrorChannels(prev => {
            const newMap = new Map(prev);
            newMap.delete(channel.id);
            return newMap;
          });
          
        } catch (error) {
          console.error(`FolderPreview: Failed to load videos for ${channel.name}:`, error);
          
          // Handle different error types gracefully
          let errorMessage = 'Failed to load videos';
          if (error instanceof Error) {
            if (error.message.includes('quota') || error.message.includes('403') || error.message.includes('quotaExceeded')) {
              errorMessage = 'YouTube API quota exceeded. Videos will load from cache when available.';
              console.log('FolderPreview: YouTube API quota exceeded - will try cache');
            } else if (error.message.includes('YouTube API key not configured')) {
              errorMessage = 'YouTube API key not configured. Please check extension setup.';
              console.log('FolderPreview: YouTube API key missing');
            } else if (error.message.includes('Network request failed') || error.message.includes('timeout') || error.message.includes('ERR_NETWORK') || error.message.includes('timed out')) {
              errorMessage = 'Network error. Check your internet connection and try again.';
              console.log('FolderPreview: Network error - check internet connection');
            } else if (error.message.includes('401') || error.message.includes('Authentication')) {
              errorMessage = 'Authentication error. Please refresh the page.';
              console.log('FolderPreview: Authentication error');
            } else if (error.message.includes('404')) {
              errorMessage = 'Channel not found or made private.';
              console.log('FolderPreview: Channel not found');
            } else if (error.message.includes('429') || error.message.includes('Rate limit')) {
              errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
              console.log('FolderPreview: Rate limit exceeded');
            } else {
              errorMessage = `Error: ${error.message}`;
            }
          }
          
          setErrorChannels(prev => {
            const newMap = new Map(prev);
            newMap.set(channel.id, errorMessage);
            return newMap;
          });
        } finally {
          setLoadingChannels(prev => {
            const newSet = new Set(prev);
            newSet.delete(channel.id);
            return newSet;
          });
        }
      }
    }
  }, [channels, channelVideos, loadingChannels, errorChannels, isPremium, isVisible, activeCategory]);

  useEffect(() => {
    console.log('FolderPreview: useEffect triggered', { 
      isVisible, 
      activeCategory, 
      channelsLength: channels.length,
      folderName,
      folderId,
      currentFolderId,
      channelNames: channels.map(c => c.name)
    });
    if (isVisible) {
      console.log('FolderPreview: Modal is visible, checking channels and folder data', {
        channelsLength: channels.length,
        currentFolder: currentFolder ? { id: currentFolder.id, name: currentFolder.name, channelIds: currentFolder.channelIds } : null,
        folderChannelIdsLength: currentFolder?.channelIds?.length || 0
      });
      
      // Load videos for channels or channel IDs
      if (currentFolder && currentFolder.channelIds && currentFolder.channelIds.length > 0) {
        console.log('FolderPreview: Found folder with channel IDs, loading videos');
        console.log('FolderPreview: Calling loadChannelVideos from useEffect');
        setTimeout(() => {
          loadChannelVideos();
        }, 100);
      } else {
        console.log('FolderPreview: No folder or channel IDs found');
      }
    }
  }, [isVisible, channels, loadChannelVideos, folderName, folderId, currentFolderId]);

  useEffect(() => {
    // Create or find the preview container attached to document.body
    let previewContainer = document.getElementById('foldertube-preview-root');
    if (!previewContainer) {
      previewContainer = document.createElement('div');
      previewContainer.id = 'foldertube-preview-root';
      previewContainer.style.position = 'fixed';
      previewContainer.style.top = '0';
      previewContainer.style.left = '0';
      previewContainer.style.width = '0';
      previewContainer.style.height = '0';
      previewContainer.style.overflow = 'visible';
      previewContainer.style.zIndex = '2000000';
      previewContainer.style.pointerEvents = 'none'; // Allow clicks to pass through
      document.body.appendChild(previewContainer);
    }
    setPortalRoot(previewContainer);
  }, []);

  if (!isVisible || !portalRoot) return null;

  const categories: { key: ContentCategory; label: string; icon: string }[] = [
    { key: 'videos', label: 'Videos', icon: '▶️' },
    { key: 'shorts', label: 'Shorts', icon: '📱' },
    { key: 'live', label: 'Live', icon: '🔴' },
    { key: 'playlists', label: 'Playlists', icon: '📋' },
    { key: 'community', label: 'Community', icon: '💬' }
  ];

  const getPlaceholderContent = (category: ContentCategory) => {
    switch (category) {
      case 'videos':
        return {
          items: [1, 2, 3, 4],
          dimensions: { width: '120px', height: '90px' },
          label: 'Video'
        };
      case 'shorts':
        return {
          items: [1, 2, 3, 4, 5, 6],
          dimensions: { width: '80px', height: '140px' },
          label: 'Short'
        };
      case 'live':
        return {
          items: [1, 2],
          dimensions: { width: '160px', height: '90px' },
          label: 'Live Stream'
        };
      case 'playlists':
        return {
          items: [1, 2, 3],
          dimensions: { width: '140px', height: '100px' },
          label: 'Playlist'
        };
      case 'community':
        return {
          items: [1, 2, 3],
          dimensions: { width: '100%', height: '80px' },
          label: 'Post'
        };
      default:
        return {
          items: [1, 2, 3, 4],
          dimensions: { width: '120px', height: '90px' },
          label: 'Video'
        };
    }
  };

  return ReactDOM.createPortal(
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={isDragging ? 'foldertube-modal-dragging' : ''}
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: isDragging ? '0 25px 70px rgba(0, 0, 0, 0.4)' : '0 20px 60px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(10px)',
        pointerEvents: 'auto',
        animation: isDragging ? 'none' : 'slideInLeft 0.2s ease',
        cursor: isDragging ? 'grabbing' : 'default',
        zIndex: 2000001,
        transition: isDragging ? 'none' : 'box-shadow 0.2s ease'
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
      {/* Header */}
      <div 
        onMouseDown={handleMouseDown}
        style={{
          padding: '20px 24px 12px 24px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
      >
        {/* Title and Close Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '600',
              color: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 7V17C3 19.2091 4.79086 21 7 21H17C19.2091 21 21 19.2091 21 17V9C21 6.79086 19.2091 5 17 5H13L11 3H7C4.79086 3 3 4.79086 3 7Z" 
                  fill="#6d28d9" fillOpacity="0.9"/>
              </svg>
              {isEditingName ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editingName.trim() && onEditFolderName) {
                        onEditFolderName(folderId, editingName.trim());
                      }
                      setIsEditingName(false);
                    } else if (e.key === 'Escape') {
                      setEditingName(folderName);
                      setIsEditingName(false);
                    }
                  }}
                  onBlur={() => {
                    if (editingName.trim() && onEditFolderName) {
                      onEditFolderName(folderId, editingName.trim());
                    }
                    setIsEditingName(false);
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1a1a1a',
                    background: 'white',
                    border: '1px solid #065fd4',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    outline: 'none',
                    minWidth: '150px'
                  }}
                />
              ) : (
                <>
                  {folderName}
                  {onEditFolderName && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingName(true);
                        setEditingName(folderName);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '16px',
                        color: '#065fd4',
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(6, 95, 212, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title="Edit folder name"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </>
              )}
              <span style={{
                fontSize: '14px',
                color: '#666',
                backgroundColor: '#e0e0e0',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '400'
              }}>
                {currentFolder ? currentFolder.channelIds.length : 0}
              </span>
            </h3>
            
            {/* Folder Switcher */}
            {folders.length > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginLeft: 'auto',
                paddingLeft: '16px'
              }}>
                <span style={{
                  fontSize: '12px',
                  color: '#666',
                  fontWeight: '500'
                }}>
                  Switch to:
                </span>
                <select
                  value={currentFolderId}
                  onChange={(e) => setCurrentFolderId(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: 'white',
                    fontSize: '14px',
                    color: '#1a1a1a',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s',
                    minWidth: '150px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#065fd4';
                    e.target.style.boxShadow = '0 0 0 3px rgba(6, 95, 212, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name} ({folder.channelIds.length})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        <button
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#666',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e0e0e0';
            e.currentTarget.style.color = '#000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#666';
          }}
        >
          ✕
        </button>
      </div>
      </div>

      {/* Category Tabs */}
      <div style={{
        padding: '0 20px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fafafa',
        display: 'flex',
        gap: '4px',
        overflowX: 'auto'
      }}>
        {categories.map((category) => (
          <button
            key={category.key}
            onClick={() => setActiveCategory(category.key)}
            style={{
              background: activeCategory === category.key ? '#6d28d9' : 'transparent',
              color: activeCategory === category.key ? 'white' : '#666',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              padding: '12px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              borderBottom: activeCategory === category.key ? '2px solid #6d28d9' : '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (activeCategory !== category.key) {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.color = '#333';
              }
            }}
            onMouseLeave={(e) => {
              if (activeCategory !== category.key) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#666';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>{category.icon}</span>
            {category.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        maxHeight: '700px',
        overflow: 'auto',
        padding: '16px'
      }}>
        {channels.length === 0 && (!currentFolder || currentFolder.channelIds.length === 0) ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666'
          }}>
            <span style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}>📭</span>
            <p style={{ fontSize: '14px', margin: 0 }}>
              {currentFolder && currentFolder.channelIds.length > 0 
                ? 'Channels are still loading...' 
                : 'This folder is empty'}
            </p>
            {currentFolder && currentFolder.channelIds.length > 0 && (
              <>
                <p style={{ fontSize: '12px', margin: '8px 0 0 0', opacity: 0.7 }}>
                  Waiting for {currentFolder.channelIds.length} channel{currentFolder.channelIds.length > 1 ? 's' : ''} to load
                </p>
                <div style={{ marginTop: '16px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #f0f0f0',
                    borderTop: '3px solid #6d28d9',
                    borderRadius: '50%',
                    margin: '0 auto',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                </div>
              </>
            )}
            {(!currentFolder || currentFolder.channelIds.length === 0) && (
              <p style={{ fontSize: '12px', margin: '8px 0 0 0', opacity: 0.7 }}>
                Add channels to this folder to see their videos
              </p>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Show matched channels */}
            {channels.map(channel => (
              <div key={channel.id} style={{
                borderBottom: '1px solid #e0e0e0',
                paddingBottom: '16px'
              }}>
                {/* Channel Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <img
                    src={channel.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTgiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiM2ZDI4ZDkiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyek0xMiA2YzEuOTMgMCAzLjUgMS41NyAzLjUgMy41UzEzLjkzIDEzIDEyIDEzczMuNS0xLjU3LTMuNS0zLjVTMTAuMDcgNiAxMiA2em0wIDJjLS44MyAwLTEuNS42Ny0xLjUgMS41UzExLjE3IDExIDEyIDExczEuNS0uNjcgMS41LTEuNVMxMi44MyA4IDEyIDh6bTAgNy41Yy0yLjMzIDAtNC4zMS0xLjQ2LTUuMTEtMy41aC4yMmMuNDQgMCAuODktLjIyIDEuMTEtLjU2LjU2LS44OSAxLjY3LTEuNSAyLjktMS41aC44OWMxLjIyIDAgMi4zMy42MSAyLjg5IDEuNS4yMi4zMy42Ny41NiAxLjExLjU2aC4yMkMxNi4zMSAxNC4wNCAxNC4zMyAxNS41IDEyIDE1LjV6Ii8+Cjwvc3ZnPgo8L3N2Zz4K'}
                    alt={channel.name}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      marginRight: '10px',
                      backgroundColor: '#f0f0f0'
                    }}
                    onLoad={() => {
                      console.log('FolderPreview: Avatar loaded for', channel.name, channel.thumbnail);
                    }}
                    onError={(e) => {
                      console.log('FolderPreview: Avatar failed to load for', channel.name, channel.thumbnail);
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTgiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiM2ZDI4ZDkiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyek0xMiA2YzEuOTMgMCAzLjUgMS41NyAzLjUgMy41UzEzLjkzIDEzIDEyIDEzczMuNS0xLjU3LTMuNS0zLjVTMTAuMDcgNiAxMiA2em0wIDJjLS44MyAwLTEuNS42Ny0xLjUgMS41UzExLjE3IDExIDEyIDExczEuNS0uNjcgMS41LTEuNVMxMi44MyA4IDEyIDh6bTAgNy41Yy0yLjMzIDAtNC4zMS0xLjQ2LTUuMTEtMy41aC4yMmMuNDQgMCAuODktLjIyIDEuMTEtLjU2LjU2LS44OSAxLjY3LTEuNSAyLjktMS41aC44OWMxLjIyIDAgMi4zMy42MSAyLjg5IDEuNS4yMi4zMy42Ny41NiAxLjExLjU2aC4yMkMxNi4zMSAxNC4wNCAxNC4zMyAxNS41IDEyIDE1LjV6Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
                    }}
                  />
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(channel.url, '_blank', 'noopener,noreferrer');
                    }}
                    style={{
                      color: '#065fd4',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      flex: 1,
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {channel.name}
                  </span>
                  {onRemoveChannel && (
                    <button
                      onClick={() => onRemoveChannel(folderId, channel.id)}
                      style={{
                        background: '#718096',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#4a5568';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#718096';
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                {/* Content Row */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '4px',
                  flexWrap: activeCategory === 'community' ? 'wrap' : 'nowrap'
                }}>
                  {(() => {
                    console.log('FolderPreview: Rendering videos for channel', {
                      channelId: channel.id,
                      channelName: channel.name,
                      activeCategory,
                      hasVideos: channelVideos.has(channel.id),
                      videosCount: channelVideos.get(channel.id)?.length || 0,
                      isLoading: loadingChannels.has(channel.id),
                      hasError: errorChannels.has(channel.id),
                      allChannelVideos: Array.from(channelVideos.keys()),
                      currentVideos: channelVideos.get(channel.id)
                    });
                    
                    if (activeCategory === 'videos' && channelVideos.has(channel.id)) {
                      const videos = channelVideos.get(channel.id)!;
                      console.log('FolderPreview: Found videos for', channel.name, videos);
                      return videos.slice(0, 4).map((video) => {
                        const isNew = isNewVideo(video.publishedAt);
                        return (
                          <div
                            key={video.id}
                            onClick={() => {
                              // Use YouTube's standard video link format
                              const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
                              
                              // Try different navigation methods for YouTube SPA
                              const ytGlobal = (window as unknown as { yt?: { www?: { router?: { navigate: (url: string) => void } } } }).yt;
                              const ytPlayer = (window as unknown as { ytplayer?: unknown }).ytplayer;
                              
                              if (ytGlobal?.www?.router?.navigate) {
                                // Use YouTube's internal router first
                                ytGlobal.www.router.navigate(`/watch?v=${video.id}`);
                              } else if (ytPlayer) {
                                // Try the YouTube player API
                                window.location.href = videoUrl;
                              } else {
                                // Fallback to standard navigation
                                window.location.href = videoUrl;
                              }
                              
                              // Close the modal after navigation
                              onClose();
                            }}
                            style={{
                              minWidth: '200px',
                              textDecoration: 'none',
                              color: 'inherit',
                              position: 'relative',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{
                              width: '200px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}>
                              <div style={{ position: 'relative' }}>
                                <img
                                  src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                                  alt={video.title}
                                  style={{
                                    width: '200px',
                                    height: '112px',
                                    borderRadius: '8px',
                                    objectFit: 'cover',
                                    backgroundColor: '#f0f0f0'
                                  }}
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    if (target.src.includes('mqdefault.jpg')) {
                                      // Try the standard quality thumbnail
                                      target.src = `https://img.youtube.com/vi/${video.id}/sddefault.jpg`;
                                    } else if (target.src.includes('sddefault.jpg')) {
                                      // Try the high quality thumbnail
                                      target.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
                                    } else {
                                      // Final fallback to placeholder
                                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjExMiIgdmlld0JveD0iMCAwIDIwMCAxMTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMTIiIGZpbGw9IiNmMGYwZjAiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI1NiIgcj0iMjQiIGZpbGw9IiNkZGQiLz48cG9seWdvbiBwb2ludHM9Ijk0LDQ0IDExMCw1NiA5NCw2OCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjEwMCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCI+VmlkZW8gVGh1bWJuYWlsPC90ZXh0Pjwvc3ZnPg==';
                                    }
                                  }}
                                  onLoad={() => {
                                    console.log('FolderPreview: Video thumbnail loaded successfully', video.id, video.title);
                                  }}
                                />
                                {isNew && (
                                  <span style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    backgroundColor: '#ff0000',
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase'
                                  }}>
                                    New
                                  </span>
                                )}
                              </div>
                              <p style={{
                                margin: 0,
                                fontSize: '12px',
                                lineHeight: '1.2',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                color: '#030303'
                              }}>
                                {video.title}
                              </p>
                              <div style={{
                                display: 'flex',
                                gap: '8px',
                                fontSize: '11px',
                                color: '#606060'
                              }}>
                                <span>{formatViewCount(video.viewCount)}</span>
                                <span>•</span>
                                <span>{formatRelativeTime(video.publishedAt)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    } else if (activeCategory === 'videos' && loadingChannels.has(channel.id)) {
                      return (
                        <div style={{
                          display: 'flex',
                          gap: '8px'
                        }}>
                          {[1, 2, 3].map((index) => (
                            <div
                              key={index}
                              style={{
                                minWidth: '200px',
                                width: '200px',
                                height: '112px',
                                backgroundColor: '#f0f0f0',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                color: '#999',
                                border: '1px solid #e0e0e0',
                                animation: 'pulse 1.5s ease-in-out infinite'
                              }}
                            >
                              Loading...
                            </div>
                          ))}
                        </div>
                      );
                    } else if (activeCategory === 'videos' && errorChannels.has(channel.id)) {
                      return (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '16px',
                          backgroundColor: '#fff5f5',
                          border: '1px solid #fed7d7',
                          borderRadius: '8px',
                          color: '#c53030'
                        }}>
                          <span style={{ fontSize: '20px' }}>⚠️</span>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>
                              Failed to load videos
                            </div>
                            <div style={{ fontSize: '12px', opacity: 0.8 }}>
                              {errorChannels.get(channel.id)}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return getPlaceholderContent(activeCategory).items.map((index) => (
                        <div
                          key={index}
                          style={{
                            minWidth: getPlaceholderContent(activeCategory).dimensions.width,
                            width: activeCategory === 'community' ? '100%' : getPlaceholderContent(activeCategory).dimensions.width,
                            height: getPlaceholderContent(activeCategory).dimensions.height,
                            backgroundColor: '#f0f0f0',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            color: '#999',
                            border: '1px solid #e0e0e0',
                            marginBottom: activeCategory === 'community' ? '8px' : '0',
                            position: 'relative'
                          }}
                        >
                          {activeCategory === 'live' && (
                            <div style={{
                              position: 'absolute',
                              top: '4px',
                              left: '4px',
                              background: '#ff0000',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 'bold'
                            }}>
                              LIVE
                            </div>
                          )}
                          {getPlaceholderContent(activeCategory).label} {index}
                        </div>
                      ));
                    }
                  })()}
                </div>
              </div>
            ))}
            
            {/* Show unmatched channel IDs - these are channels in folders that couldn't be matched to scraped channels */}
            {currentFolder && currentFolder.channelIds
              .filter(channelId => !channels.some(ch => ch.id === channelId)) // Only unmatched IDs
              .map(channelId => (
                <div key={`unmatched-${channelId}`} style={{
                  borderBottom: '1px solid #e0e0e0',
                  paddingBottom: '16px'
                }}>
                  {/* Channel Header for unmatched */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <img
                      src={'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTgiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiM2ZDI4ZDkiLz4KPHN2ZyB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyek0xMiA2YzEuOTMgMCAzLjUgMS41NyAzLjUgMy41UzEzLjkzIDEzIDEyIDEzczMuNS0xLjU3LTMuNS0zLjVTMTAuMDcgNiAxMiA2em0wIDJjLS44MyAwLTEuNS42Ny0xLjUgMS41UzExLjE3IDExIDEyIDExczEuNS0uNjcgMS41LTEuNVMxMi44MyA4IDEyIDh6bTAgNy41Yy0yLjMzIDAtNC4zMS0xLjQ2LTUuMTEtMy41aC4yMmMuNDQgMCAuODktLjIyIDEuMTEtLjU2LjU2LS44OSAxLjY3LTEuNSAyLjktMS41aC44OWMxLjIyIDAgMi4zMy42MSAyLjg5IDEuNS4yMi4zMy42Ny41NiAxLjExLjU2aC4yMkMxNi4zMSAxNC4wNCAxNC4zMyAxNS41IDEyIDE1LjV6Ii8+Cjwvc3ZnPgo8L3N2Zz4K'}
                      alt={channelId}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        marginRight: '10px',
                        backgroundColor: '#f0f0f0'
                      }}
                    />
                    <span style={{
                      color: '#065fd4',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: '600',
                      flex: 1
                    }}>
                      {channelId}
                    </span>
                    {onRemoveChannel && (
                      <button
                        onClick={() => onRemoveChannel(folderId, channelId)}
                        style={{
                          background: '#718096',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#4a5568';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#718096';
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  
                  {/* Content Row for unmatched channels */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                    flexWrap: activeCategory === 'community' ? 'wrap' : 'nowrap'
                  }}>
                    {(() => {
                      if (activeCategory === 'videos' && channelVideos.has(channelId)) {
                        const videos = channelVideos.get(channelId)!;
                        return videos.slice(0, 4).map((video) => {
                          const isNew = isNewVideo(video.publishedAt);
                          return (
                            <div
                              key={video.id}
                              onClick={() => {
                                // Use YouTube's standard video link format
                                const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
                                
                                // Try different navigation methods for YouTube SPA
                                const ytGlobal = (window as unknown as { yt?: { www?: { router?: { navigate: (url: string) => void } } } }).yt;
                                const ytPlayer = (window as unknown as { ytplayer?: unknown }).ytplayer;
                                
                                if (ytGlobal?.www?.router?.navigate) {
                                  // Use YouTube's internal router first
                                  ytGlobal.www.router.navigate(`/watch?v=${video.id}`);
                                } else if (ytPlayer) {
                                  // Try the YouTube player API
                                  window.location.href = videoUrl;
                                } else {
                                  // Fallback to standard navigation
                                  window.location.href = videoUrl;
                                }
                                
                                // Close the modal after navigation
                                onClose();
                              }}
                              style={{
                                minWidth: '200px',
                                textDecoration: 'none',
                                color: 'inherit',
                                position: 'relative',
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{
                                width: '200px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                              }}>
                                <div style={{ position: 'relative' }}>
                                  <img
                                    src={video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                                    alt={video.title}
                                    style={{
                                      width: '200px',
                                      height: '112px',
                                      borderRadius: '8px',
                                      objectFit: 'cover',
                                      backgroundColor: '#f0f0f0'
                                    }}
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      if (target.src.includes('mqdefault.jpg')) {
                                        // Try the standard quality thumbnail
                                        target.src = `https://img.youtube.com/vi/${video.id}/sddefault.jpg`;
                                      } else if (target.src.includes('sddefault.jpg')) {
                                        // Try the high quality thumbnail
                                        target.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
                                      } else {
                                        // Final fallback to placeholder
                                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjExMiIgdmlld0JveD0iMCAwIDIwMCAxMTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxMTIiIGZpbGw9IiNmMGYwZjAiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI1NiIgcj0iMjQiIGZpbGw9IiNkZGQiLz48cG9seWdvbiBwb2ludHM9Ijk0LDQ0IDExMCw1NiA5NCw2OCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjEwMCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCI+VmlkZW8gVGh1bWJuYWlsPC90ZXh0Pjwvc3ZnPg==';
                                      }
                                    }}
                                    onLoad={() => {
                                      console.log('FolderPreview: Video thumbnail loaded successfully (unmatched)', video.id, video.title);
                                    }}
                                  />
                                  {isNew && (
                                    <span style={{
                                      position: 'absolute',
                                      top: '4px',
                                      right: '4px',
                                      backgroundColor: '#ff0000',
                                      color: 'white',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 'bold',
                                      textTransform: 'uppercase'
                                    }}>
                                      New
                                    </span>
                                  )}
                                </div>
                                <p style={{
                                  margin: 0,
                                  fontSize: '12px',
                                  lineHeight: '1.2',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  color: '#030303'
                                }}>
                                  {video.title}
                                </p>
                                <div style={{
                                  display: 'flex',
                                  gap: '8px',
                                  fontSize: '11px',
                                  color: '#606060'
                                }}>
                                  <span>{formatViewCount(video.viewCount)}</span>
                                  <span>•</span>
                                  <span>{formatRelativeTime(video.publishedAt)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      } else if (activeCategory === 'videos' && loadingChannels.has(channelId)) {
                        return (
                          <div style={{
                            display: 'flex',
                            gap: '8px'
                          }}>
                            {[1, 2, 3].map((index) => (
                              <div
                                key={index}
                                style={{
                                  minWidth: '200px',
                                  width: '200px',
                                  height: '112px',
                                  backgroundColor: '#f0f0f0',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  color: '#999',
                                  border: '1px solid #e0e0e0',
                                  animation: 'pulse 1.5s ease-in-out infinite'
                                }}
                              >
                                Loading...
                              </div>
                            ))}
                          </div>
                        );
                      } else if (activeCategory === 'videos' && errorChannels.has(channelId)) {
                        return (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            backgroundColor: '#fff5f5',
                            border: '1px solid #fed7d7',
                            borderRadius: '8px',
                            color: '#c53030'
                          }}>
                            <span style={{ fontSize: '20px' }}>⚠️</span>
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                Failed to load videos
                              </div>
                              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                {errorChannels.get(channelId)}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return getPlaceholderContent(activeCategory).items.map((index) => (
                          <div
                            key={index}
                            style={{
                              minWidth: getPlaceholderContent(activeCategory).dimensions.width,
                              width: activeCategory === 'community' ? '100%' : getPlaceholderContent(activeCategory).dimensions.width,
                              height: getPlaceholderContent(activeCategory).dimensions.height,
                              backgroundColor: '#f0f0f0',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              color: '#999',
                              border: '1px solid #e0e0e0',
                              marginBottom: activeCategory === 'community' ? '8px' : '0',
                              position: 'relative'
                            }}
                          >
                            {activeCategory === 'live' && (
                              <div style={{
                                position: 'absolute',
                                top: '4px',
                                left: '4px',
                                background: '#ff0000',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}>
                                LIVE
                              </div>
                            )}
                            {getPlaceholderContent(activeCategory).label} {index}
                          </div>
                        ));
                      }
                    })()}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Other Folders Navigation */}
      {folders.length > 1 && (
        <div style={{
          borderTop: '1px solid #e0e0e0',
          padding: '16px',
          backgroundColor: '#fafafa'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#666',
            fontWeight: '600',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Other Collections
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {folders
              .filter(f => f.id !== currentFolderId)
              .map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '20px',
                    fontSize: '13px',
                    color: '#1a1a1a',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                    e.currentTarget.style.borderColor = '#6d28d9';
                    e.currentTarget.style.color = '#6d28d9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.color = '#1a1a1a';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 7V17C3 19.2091 4.79086 21 7 21H17C19.2091 21 21 19.2091 21 17V9C21 6.79086 19.2091 5 17 5H13L11 3H7C4.79086 3 3 4.79086 3 7Z" 
                      fill="currentColor" fillOpacity="0.2"/>
                  </svg>
                  <span style={{ fontWeight: '500' }}>{folder.name}</span>
                  <span style={{
                    fontSize: '11px',
                    color: '#666',
                    backgroundColor: '#f0f0f0',
                    padding: '2px 6px',
                    borderRadius: '10px'
                  }}>
                    {folder.channelIds.length}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>,
    portalRoot
  );
};

export default FolderPreview;