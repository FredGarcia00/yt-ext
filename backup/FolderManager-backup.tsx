import React, { useState, useEffect } from 'react';
import { YouTubeScraper } from '../utils/youtube-scraper';
import { CacheService } from '../utils/cache-service';
import FolderPreview from './FolderPreview';
import CreateFolderModal from './CreateFolderModal';

interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}

interface Channel {
  id: string;
  name: string;
  thumbnail: string;
  url?: string;
}

const FolderManager: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);
  const [draggedChannel, setDraggedChannel] = useState<string | null>(null);
  const [draggedChannelFromFolder, setDraggedChannelFromFolder] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isHoverDebounced, setIsHoverDebounced] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addingToFolderId, setAddingToFolderId] = useState<string | null>(null);

  useEffect(() => {
    // Load folders from chrome storage
    try {
      chrome.storage.sync.get(['folders'], async (result) => {
        if (chrome.runtime.lastError) {
          console.error('FolderTube: Storage error:', chrome.runtime.lastError);
          setFolders([]);
          return;
        }
        
        if (result.folders) {
          setFolders(result.folders);
          
          // Smart preload videos for folders
          try {
            const folderChannelIds = result.folders.map((folder: Folder) => folder.channelIds);
            await CacheService.smartPreload(folderChannelIds);
          } catch (error) {
            console.log('FolderTube: Smart preload failed:', error);
          }
        } else {
          setFolders([]);
        }
      });
    } catch (error) {
      console.error('FolderTube: Error accessing storage:', error);
      setFolders([]);
    }
  }, []);

  useEffect(() => {
    // Load subscriptions for folder functionality only
    async function loadInitialSubscriptions() {
      try {
        const youtubeChannels = await YouTubeScraper.getSubscriptions();
        
        if (youtubeChannels.length > 0) {
          const convertedChannels: Channel[] = youtubeChannels.map(ytChannel => ({
            id: ytChannel.id,
            name: ytChannel.name,
            thumbnail: ytChannel.avatarUrl,
            url: ytChannel.url
          }));
          setChannels(convertedChannels);
        }
      } catch (err) {
        console.error('FolderTube: Error loading subscriptions:', err);
      }
    }

    loadInitialSubscriptions();
    
    // Trigger refresh to add drag functionality to native subscriptions
    window.dispatchEvent(new CustomEvent('foldertube:refresh'));

    // Set up observer for subscription changes
    const observer = YouTubeScraper.observeSubscriptionChanges((youtubeChannels) => {
      const convertedChannels: Channel[] = youtubeChannels.map(ytChannel => ({
        id: ytChannel.id,
        name: ytChannel.name,
        thumbnail: ytChannel.avatarUrl,
        url: ytChannel.url
      }));
      setChannels(convertedChannels);
    });

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  const toggleFolder = (folderId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
    }
    
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    
    setExpandedFolders(newExpanded);
  };

  const openFolderPreview = (folder: Folder) => {
    setSelectedFolder(folder);
    setPreviewVisible(true);
  };

  const closeFolderPreview = () => {
    setSelectedFolder(null);
    setPreviewVisible(false);
    // Add a small delay before resetting debounce to prevent immediate re-trigger
    setTimeout(() => {
      setIsHoverDebounced(false);
    }, 100);
    setHoveredFolderId(null);
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  };

  const createFolder = (name: string, selectedChannels: string[] = []) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: name,
      channelIds: selectedChannels
    };
    
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    
    // Save to chrome storage
    try {
      chrome.storage.sync.set({ folders: updatedFolders }, () => {
        if (chrome.runtime.lastError) {
          console.error('FolderTube: Failed to save new folder:', chrome.runtime.lastError);
        }
      });
    } catch (error) {
      console.error('FolderTube: Error saving new folder:', error);
    }
  };

  const addChannelsToFolder = (folderId: string, newChannelIds: string[]) => {
    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) {
      const updatedFolders = [...folders];
      // Add only channels that aren't already in the folder
      const existingIds = new Set(updatedFolders[folderIndex].channelIds);
      const channelsToAdd = newChannelIds.filter(id => !existingIds.has(id));
      updatedFolders[folderIndex].channelIds.push(...channelsToAdd);
      
      setFolders(updatedFolders);
      
      try {
        chrome.storage.sync.set({ folders: updatedFolders }, () => {
          if (chrome.runtime.lastError) {
            console.error('FolderTube: Failed to add channels to folder:', chrome.runtime.lastError);
          }
        });
      } catch (error) {
        console.error('FolderTube: Error adding channels to folder:', error);
      }
    }
  };

  const getChannelById = (channelId: string): Channel | undefined => {
    return channels.find(ch => ch.id === channelId);
  };

  const handleFolderDragStart = (e: React.DragEvent, folderId: string) => {
    setDraggedFolder(folderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only allow drop if:
    // 1. Dragging a folder (not a channel from within this same folder)
    // 2. Dragging a channel from a different folder or from subscriptions
    const draggingChannelFromSameFolder = draggedChannel && draggedChannelFromFolder === folderId;
    
    if (!draggingChannelFromSameFolder) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverFolder(folderId);
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleFolderDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleFolderDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragOverFolder(null);
    
    // Prevent drops if dragging a channel from the same folder (rearranging within folder)
    const draggingChannelFromSameFolder = draggedChannel && draggedChannelFromFolder === targetFolderId;
    if (draggingChannelFromSameFolder) {
      console.log('FolderTube: Preventing drop of channel within same folder');
      setDraggedFolder(null);
      setDraggedChannel(null);
      setDraggedChannelFromFolder(null);
      return;
    }
    
    setIsUpdating(true);
    
    // Check if this is a drop from native YouTube subscription
    const channelData = e.dataTransfer.getData('application/foldertube-channel');
    if (channelData) {
      try {
        const channel = JSON.parse(channelData);
        console.log('FolderTube: Dropping native YouTube channel:', channel);
        
        const folderIndex = folders.findIndex(f => f.id === targetFolderId);
        if (folderIndex !== -1) {
          const newFolders = [...folders];
          
          // Add to target folder if not already there
          if (!newFolders[folderIndex].channelIds.includes(channel.id)) {
            newFolders[folderIndex].channelIds.push(channel.id);
            
            // Also ensure the channel is in our channels list
            if (!channels.find(ch => ch.id === channel.id)) {
              // Priority order for avatar: dragged data > existing channel > fallback
              const existingChannel = channels.find(ch => ch.id === channel.id || ch.name === channel.name);
              let thumbnail = '';
              
              // Use avatar from drag data if available and valid
              if (channel.avatarUrl && channel.avatarUrl.includes('yt3.ggpht.com')) {
                thumbnail = channel.avatarUrl;
              } else if (existingChannel?.thumbnail) {
                thumbnail = existingChannel.thumbnail;
              } else {
                thumbnail = YouTubeScraper.generateFallbackAvatar(channel.name);
              }
              
              setChannels(prev => [...prev, {
                id: channel.id,
                name: channel.name,
                url: channel.url,
                thumbnail
              }]);
            }
          }
          
          setFolders(newFolders);
          try {
            chrome.storage.sync.set({ folders: newFolders }, () => {
              if (chrome.runtime.lastError) {
                console.error('FolderTube: Failed to assign channel:', chrome.runtime.lastError);
              }
              setTimeout(() => setIsUpdating(false), 300);
            });
          } catch (error) {
            console.error('FolderTube: Error assigning channel:', error);
          }
        }
        return;
      } catch (error) {
        console.error('FolderTube: Error parsing channel data:', error);
      }
    }
    
    console.log('FolderTube: Drop event on folder:', targetFolderId, 'dragged channel:', draggedChannel, 'dragged folder:', draggedFolder, 'from folder:', draggedChannelFromFolder);

    if (draggedFolder && draggedFolder !== targetFolderId) {
      const draggedIndex = folders.findIndex(f => f.id === draggedFolder);
      const targetIndex = folders.findIndex(f => f.id === targetFolderId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newFolders = [...folders];
        const [removed] = newFolders.splice(draggedIndex, 1);
        newFolders.splice(targetIndex, 0, removed);
        
        setFolders(newFolders);
        try {
          chrome.storage.sync.set({ folders: newFolders }, () => {
            if (chrome.runtime.lastError) {
              console.error('FolderTube: Failed to reorder folders:', chrome.runtime.lastError);
            }
            setTimeout(() => setIsUpdating(false), 300);
          });
        } catch (error) {
          console.error('FolderTube: Error reordering folders:', error);
        }
      }
    } else if (draggedChannel) {
      // Handle moving channel to folder
      const folderIndex = folders.findIndex(f => f.id === targetFolderId);
      if (folderIndex !== -1) {
        const newFolders = [...folders];
        
        // Remove from previous folder if it was in one
        if (draggedChannelFromFolder) {
          const fromFolderIndex = newFolders.findIndex(f => f.id === draggedChannelFromFolder);
          if (fromFolderIndex !== -1) {
            newFolders[fromFolderIndex].channelIds = newFolders[fromFolderIndex].channelIds.filter(id => id !== draggedChannel);
          }
        }
        
        // Add to target folder if not already there
        if (!newFolders[folderIndex].channelIds.includes(draggedChannel)) {
          newFolders[folderIndex].channelIds.push(draggedChannel);
        }
        
        setFolders(newFolders);
        try {
          chrome.storage.sync.set({ folders: newFolders }, () => {
            if (chrome.runtime.lastError) {
              console.error('FolderTube: Failed to assign channel:', chrome.runtime.lastError);
            }
            setTimeout(() => setIsUpdating(false), 300);
          });
        } catch (error) {
          console.error('FolderTube: Error assigning channel:', error);
        }
      }
    }
    
    setDraggedFolder(null);
    setDraggedChannel(null);
    setDraggedChannelFromFolder(null);
    
    setTimeout(() => {
      setIsUpdating(false);
    }, 300);
  };

  const handleChannelDragStart = (e: React.DragEvent, channelId: string, fromFolderId?: string) => {
    console.log('FolderTube: Starting drag for channel:', channelId, 'from folder:', fromFolderId);
    
    e.stopPropagation();
    
    if (fromFolderId) {
      setDraggedChannelFromFolder(fromFolderId);
    }
    setDraggedChannel(channelId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', channelId);
  };

  const deleteFolder = (folderId: string) => {
    if (confirm('Are you sure you want to delete this folder?')) {
      const updatedFolders = folders.filter(f => f.id !== folderId);
      setFolders(updatedFolders);
      
      try {
        chrome.storage.sync.set({ folders: updatedFolders }, () => {
          if (chrome.runtime.lastError) {
            console.error('FolderTube: Failed to delete folder:', chrome.runtime.lastError);
          }
        });
      } catch (error) {
        console.error('FolderTube: Error deleting folder:', error);
      }
    }
  };

  const startEditingFolder = (folderId: string, currentName: string) => {
    setEditingFolderId(folderId);
    setEditingName(currentName);
  };

  const saveEditingFolder = () => {
    if (editingFolderId && editingName.trim()) {
      const folderIndex = folders.findIndex(f => f.id === editingFolderId);
      if (folderIndex !== -1) {
        const newFolders = [...folders];
        newFolders[folderIndex].name = editingName.trim();
        setFolders(newFolders);
        
        try {
          chrome.storage.sync.set({ folders: newFolders }, () => {
            if (chrome.runtime.lastError) {
              console.error('FolderTube: Failed to rename folder:', chrome.runtime.lastError);
            }
          });
        } catch (error) {
          console.error('FolderTube: Error renaming folder:', error);
        }
      }
    }
    setEditingFolderId(null);
    setEditingName('');
  };

  const handleEditFolderName = (folderId: string, newName: string) => {
    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) {
      const newFolders = [...folders];
      newFolders[folderIndex].name = newName;
      setFolders(newFolders);
      
      // Update selected folder if it's being previewed
      if (selectedFolder && selectedFolder.id === folderId) {
        setSelectedFolder({ ...selectedFolder, name: newName });
      }
      
      try {
        chrome.storage.sync.set({ folders: newFolders }, () => {
          if (chrome.runtime.lastError) {
            console.error('FolderTube: Failed to rename folder:', chrome.runtime.lastError);
          }
        });
      } catch (error) {
        console.error('FolderTube: Error renaming folder:', error);
      }
    }
  };

  const cancelEditingFolder = () => {
    setEditingFolderId(null);
    setEditingName('');
  };

  const removeChannelFromFolder = (folderId: string, channelId: string) => {
    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) {
      const newFolders = [...folders];
      newFolders[folderIndex].channelIds = newFolders[folderIndex].channelIds.filter(id => id !== channelId);
      setFolders(newFolders);
      
      // Also remove the channel from the channels list to prevent it from showing in subscriptions
      setChannels(prevChannels => prevChannels.filter(ch => ch.id !== channelId));
      
      try {
        chrome.storage.sync.set({ folders: newFolders }, () => {
          if (chrome.runtime.lastError) {
            console.error('FolderTube: Failed to remove channel:', chrome.runtime.lastError);
          }
        });
      } catch (error) {
        console.error('FolderTube: Error removing channel:', error);
      }
    }
  };



  return (
    <div className="foldertube-folders" style={{ 
      padding: '0',
      position: 'relative'
    }}>
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '4px', margin: '4px 16px' }}>
        {/* Create Folder Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowCreateModal(true);
          }}
          className="foldertube-item"
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            border: '1px solid rgba(0, 0, 0, 0.1)',
            background: 'transparent',
            textAlign: 'left',
            color: '#030303',
            fontSize: '14px',
            fontWeight: '400',
            borderRadius: '18px',
            padding: '10px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span style={{ marginRight: '6px', fontSize: '14px' }}>➕</span>
          New Folder
        </button>
      </div>
      
      {/* Folders List */}
      {folders.map((folder) => (
        <div 
          key={folder.id} 
          className="foldertube-folder"
          draggable
          onDragStart={(e) => handleFolderDragStart(e, folder.id)}
          onDragOver={(e) => {
            // Only handle drag over for the folder header area, not expanded channels
            const target = e.target as HTMLElement;
            const folderItem = e.currentTarget.querySelector('.foldertube-item');
            
            // Check if we're over the folder header area
            if (folderItem && (target === folderItem || folderItem.contains(target))) {
              handleFolderDragOver(e, folder.id);
            } else {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'none';
            }
          }}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e) => {
            // Only handle drops on the folder header area
            const target = e.target as HTMLElement;
            const folderItem = e.currentTarget.querySelector('.foldertube-item');
            
            if (folderItem && (target === folderItem || folderItem.contains(target))) {
              handleFolderDrop(e, folder.id);
            } else {
              e.preventDefault();
              e.stopPropagation();
              console.log('FolderTube: Blocking drop outside folder header');
            }
          }}
          onClick={(e) => {
            // Prevent any default click behavior that might cause jumping
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Don't trigger hover if create modal is open
            if (showCreateModal) {
              return;
            }
            
            // Prevent hover on child elements from triggering
            if (e.currentTarget === e.target || e.target === e.currentTarget.querySelector('.foldertube-item')) {
              // Debounce hover to prevent rapid triggering
              if (!isHoverDebounced && !previewVisible) {
                setIsHoverDebounced(true);
                setHoveredFolderId(folder.id);
                // Clear any existing timeout
                if (hoverTimeout) {
                  clearTimeout(hoverTimeout);
                  setHoverTimeout(null);
                }
                openFolderPreview(folder);
                // Reset debounce after a short delay
                setTimeout(() => setIsHoverDebounced(false), 300);
              }
            }
          }}
          onMouseLeave={(e) => {
            // Only handle if leaving the folder container entirely
            const relatedTarget = e.relatedTarget;
            if (relatedTarget && relatedTarget instanceof Node) {
              if (!e.currentTarget.contains(relatedTarget)) {
                setHoveredFolderId(null);
                // Add a small delay before closing to prevent flickering
                const timeout = setTimeout(() => {
                  closeFolderPreview();
                }, 200);
                setHoverTimeout(timeout);
              }
            } else {
              // If relatedTarget is null or not a Node, close the preview
              setHoveredFolderId(null);
              const timeout = setTimeout(() => {
                closeFolderPreview();
              }, 200);
              setHoverTimeout(timeout);
            }
          }}
          style={{
            margin: '2px 0',
            borderRadius: '8px',
            background: dragOverFolder === folder.id ? 'rgba(0, 0, 0, 0.08)' : 
                       (hoveredFolderId === folder.id && !showCreateModal) ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
            border: dragOverFolder === folder.id ? '2px dashed #606060' : '2px solid transparent',
            transition: isUpdating ? 'none' : 'all 0.2s ease'
          }}
        >
          <div
            className="foldertube-item"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              toggleFolder(folder.id, e);
              return false;
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              return false;
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 12px',
              fontSize: '14px',
              fontWeight: '500',
              position: 'relative',
              cursor: 'pointer'
            }}
          >
            <span
              style={{
                marginRight: '8px',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}
            >
              {expandedFolders.has(folder.id) ? '▼' : '▶'}
            </span>
            <span 
              style={{ 
                marginRight: '8px', 
                fontSize: '16px'
              }}
            >
              📁
            </span>
            {editingFolderId === folder.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveEditingFolder();
                  } else if (e.key === 'Escape') {
                    cancelEditingFolder();
                  }
                }}
                onBlur={saveEditingFolder}
                autoFocus
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '2px 4px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              />
            ) : (
              <span 
                style={{ 
                  flex: 1, 
                  minWidth: 0, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  whiteSpace: 'nowrap'
                }}
              >
                {folder.name}
              </span>
            )}
            <span style={{ 
              opacity: 0.7, 
              fontSize: '12px',
              minWidth: 'auto',
              marginLeft: '8px',
              background: hoveredFolderId === folder.id ? '#e0e0e0' : '#f0f0f0',
              padding: '2px 6px',
              borderRadius: '10px',
              flexShrink: 0
            }}>
              {folder.channelIds.length}
            </span>
            {editingFolderId !== folder.id && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    setAddingToFolderId(folder.id);
                    setShowCreateModal(true);
                    return false;
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    return false;
                  }}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    flexShrink: 0,
                    pointerEvents: 'auto',
                    minWidth: '20px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '4px'
                  }}
                  title="Add channels to folder"
                >
                  ➕
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    startEditingFolder(folder.id, folder.name);
                    return false;
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    return false;
                  }}
                  style={{
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    flexShrink: 0,
                    pointerEvents: 'auto',
                    minWidth: '20px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '4px'
                  }}
                  title="Edit folder name"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    deleteFolder(folder.id);
                    return false;
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    return false;
                  }}
                  style={{
                    background: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    flexShrink: 0,
                    pointerEvents: 'auto',
                    minWidth: '20px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '4px'
                  }}
                  title="Delete folder"
                >
                  🗑️
                </button>
              </>
            )}
          </div>
          
          <div style={{ 
            paddingLeft: '32px', 
            paddingBottom: expandedFolders.has(folder.id) ? '8px' : '0',
            overflow: 'hidden',
            transition: 'all 0.2s ease-out',
            maxHeight: expandedFolders.has(folder.id) ? '2000px' : '0',
            opacity: expandedFolders.has(folder.id) ? 1 : 0
          }}
          onDragOver={(e) => {
            // Block all drag over events in the expanded channel area
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'none';
          }}
          onDrop={(e) => {
            // Block all drops in the expanded channel area
            e.preventDefault();
            e.stopPropagation();
            console.log('FolderTube: Blocking drop in channel area');
          }}>
            {expandedFolders.has(folder.id) && 
              folder.channelIds.map((channelId) => {
                const channel = getChannelById(channelId);
                if (!channel) return null;
                
                return (
                  <div
                    key={channel.id}
                    className="foldertube-channel"
                    draggable
                    onDragStart={(e) => handleChannelDragStart(e, channel.id, folder.id)}
                    onDragOver={(e) => {
                      // Prevent folder drop handlers from being triggered
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'none';
                    }}
                    onDrop={(e) => {
                      // Prevent any drops on individual channels
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('FolderTube: Blocking drop on individual channel');
                    }}
                    onDragEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '14px',
                      padding: '8px 16px',
                      margin: '1px 0',
                      borderRadius: '4px',
                      cursor: 'move',
                      background: 'transparent',
                      position: 'relative',
                      transition: 'background 0.1s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <img
                      src={channel.thumbnail}
                      alt={channel.name}
                      onError={(e) => {
                        console.log(`FolderTube: Avatar failed to load in folder for ${channel.name}, src: ${channel.thumbnail}`);
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNlMGUwZTAiLz4KPHN2ZyB4PSI3IiB5PSI3IiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZmZmZiI+CjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyek0xMyAxN2gtMnYtNmgydjZ6bTAtOGgtMlY3aDJ2MnoiLz4KPC9zdmc+Cjwvc3ZnPgo=';
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        marginRight: '12px',
                        flexShrink: 0
                      }}
                    />
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(channel.url, '_blank', 'noopener,noreferrer');
                      }}
                      style={{ 
                        flex: 1, 
                        minWidth: 0, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        color: '#065fd4',
                        textDecoration: 'none',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {channel.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeChannelFromFolder(folder.id, channel.id);
                      }}
                      style={{
                        marginLeft: '8px',
                        background: 'transparent',
                        color: '#999',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        opacity: 0.7,
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ff4444';
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#999';
                        e.currentTarget.style.opacity = '0.7';
                      }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            }
          </div>
        </div>
      ))}
      
      
      {/* Folder Preview */}
      {selectedFolder && previewVisible && (
        <FolderPreview
          isVisible={previewVisible}
          folderName={selectedFolder.name}
          folderId={selectedFolder.id}
          channels={selectedFolder.channelIds.map(id => getChannelById(id)).filter((ch): ch is Channel => ch !== undefined)}
          onRemoveChannel={removeChannelFromFolder}
          onClose={closeFolderPreview}
          onEditFolderName={handleEditFolderName}
          onMouseEnter={() => {
            // Clear timeout to keep modal open
            if (hoverTimeout) {
              clearTimeout(hoverTimeout);
              setHoverTimeout(null);
            }
          }}
          onMouseLeave={() => {
            // Close modal after delay
            const timeout = setTimeout(() => {
              closeFolderPreview();
            }, 200);
            setHoverTimeout(timeout);
          }}
        />
      )}
      
      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setAddingToFolderId(null);
        }}
        onCreate={(name, channelIds) => {
          if (addingToFolderId) {
            // Adding channels to existing folder
            addChannelsToFolder(addingToFolderId, channelIds);
          } else {
            // Creating new folder
            createFolder(name, channelIds);
          }
        }}
        existingChannels={channels}
        folders={folders}
        editingFolderId={addingToFolderId || undefined}
      />
    </div>
  );
};

export default FolderManager;