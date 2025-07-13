import React, { useState, useEffect } from 'react';
import dummyData from '../dummy-data.json';

interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}

interface Channel {
  id: string;
  name: string;
  thumbnail: string;
}

const FolderManager: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [channels] = useState<Channel[]>(dummyData.channels);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [draggedFolder, setDraggedFolder] = useState<string | null>(null);
  const [draggedChannel, setDraggedChannel] = useState<string | null>(null);
  const [draggedChannelFromFolder, setDraggedChannelFromFolder] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [hoveredFolder, setHoveredFolder] = useState<string | null>(null);

  useEffect(() => {
    // Load folders from chrome storage or use dummy data
    try {
      chrome.storage.sync.get(['folders'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('FolderTube: Storage error:', chrome.runtime.lastError);
          setFolders(dummyData.folders);
          return;
        }
        
        if (result.folders) {
          setFolders(result.folders);
        } else {
          setFolders(dummyData.folders);
          // Save initial dummy data
          chrome.storage.sync.set({ folders: dummyData.folders }, () => {
            if (chrome.runtime.lastError) {
              console.error('FolderTube: Failed to save initial data:', chrome.runtime.lastError);
            }
          });
        }
      });
    } catch (error) {
      console.error('FolderTube: Error accessing storage:', error);
      setFolders(dummyData.folders);
    }
  }, []);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const createFolder = () => {
    const name = prompt('Enter folder name:');
    if (name && name.trim()) {
      const newFolder: Folder = {
        id: `folder-${Date.now()}`,
        name: name.trim(),
        channelIds: []
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
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folderId);
  };

  const handleFolderDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleFolderDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    setDragOverFolder(null);

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
          });
        } catch (error) {
          console.error('FolderTube: Error assigning channel:', error);
        }
      }
    }
    
    setDraggedFolder(null);
    setDraggedChannel(null);
    setDraggedChannelFromFolder(null);
  };

  const handleChannelDragStart = (e: React.DragEvent, channelId: string, fromFolderId?: string) => {
    if (fromFolderId) {
      setDraggedChannelFromFolder(fromFolderId);
    }
    setDraggedChannel(channelId);
    e.dataTransfer.effectAllowed = 'move';
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

  const removeChannelFromFolder = (folderId: string, channelId: string) => {
    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) {
      const newFolders = [...folders];
      newFolders[folderIndex].channelIds = newFolders[folderIndex].channelIds.filter(id => id !== channelId);
      setFolders(newFolders);
      
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
    <div className="foldertube-folders" style={{ padding: '0' }}>
      {/* Create Folder Button */}
      <button
        onClick={createFolder}
        className="foldertube-item"
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          border: 'none',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textAlign: 'left',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          borderRadius: '8px',
          margin: '8px 12px',
          padding: '12px 16px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
        }}
      >
        <span style={{ marginRight: '8px', fontSize: '16px' }}>✨</span>
        Create New Folder
      </button>
      
      {/* Folders List */}
      {folders.map((folder) => (
        <div 
          key={folder.id} 
          className="foldertube-folder"
          draggable
          onDragStart={(e) => handleFolderDragStart(e, folder.id)}
          onDragOver={(e) => handleFolderDragOver(e, folder.id)}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e) => handleFolderDrop(e, folder.id)}
          onMouseEnter={() => setHoveredFolder(folder.id)}
          onMouseLeave={() => setHoveredFolder(null)}
          style={{
            margin: '4px 12px',
            borderRadius: '8px',
            background: dragOverFolder === folder.id ? '#e3f2fd' : 
                       hoveredFolder === folder.id ? '#f8f9fa' : 'transparent',
            border: dragOverFolder === folder.id ? '2px dashed #1976d2' : '2px solid transparent',
            transition: 'all 0.2s ease'
          }}
        >
          <div
            onClick={() => toggleFolder(folder.id)}
            className="foldertube-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '10px 12px',
              fontSize: '14px',
              fontWeight: '500',
              position: 'relative'
            }}
          >
            <span style={{ marginRight: '8px', fontSize: '16px' }}>
              {expandedFolders.has(folder.id) ? '📂' : '📁'}
            </span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {folder.name}
            </span>
            <span style={{ 
              opacity: 0.7, 
              fontSize: '12px',
              minWidth: 'auto',
              marginLeft: '8px',
              background: hoveredFolder === folder.id ? '#e0e0e0' : '#f0f0f0',
              padding: '2px 6px',
              borderRadius: '10px',
              flexShrink: 0
            }}>
              {folder.channelIds.length}
            </span>
            {hoveredFolder === folder.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFolder(folder.id);
                }}
                style={{
                  marginLeft: '8px',
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  flexShrink: 0
                }}
              >
                🗑️
              </button>
            )}
          </div>
          
          {expandedFolders.has(folder.id) && (
            <div style={{ paddingLeft: '16px', paddingBottom: '8px' }}>
              {folder.channelIds.map((channelId) => {
                const channel = getChannelById(channelId);
                if (!channel) return null;
                
                return (
                  <div
                    key={channel.id}
                    className="foldertube-channel"
                    draggable
                    onDragStart={(e) => handleChannelDragStart(e, channel.id, folder.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '14px',
                      padding: '8px 12px',
                      margin: '2px 0',
                      borderRadius: '6px',
                      cursor: 'move',
                      background: '#f8f9fa',
                      border: '1px solid transparent',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e9ecef';
                      e.currentTarget.style.border = '1px solid #dee2e6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.border = '1px solid transparent';
                    }}
                  >
                    <img
                      src={channel.thumbnail}
                      alt={channel.name}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        marginRight: '12px',
                        flexShrink: 0
                      }}
                    />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              })}
            </div>
          )}
        </div>
      ))}
      
      {/* Unassigned channels section */}
      <div style={{ 
        margin: '16px 12px 8px 12px', 
        borderTop: '2px solid #e0e0e0', 
        paddingTop: '12px',
        background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
        borderRadius: '8px',
        padding: '12px'
      }}>
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '14px',
          color: '#2d3436',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '8px', fontSize: '16px' }}>📺</span>
          Available Channels
        </div>
        <div>
          {channels.filter(channel => 
            !folders.some(folder => folder.channelIds.includes(channel.id))
          ).map((channel) => (
            <div
              key={channel.id}
              className="foldertube-item"
              draggable
              onDragStart={(e) => handleChannelDragStart(e, channel.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                cursor: 'move',
                padding: '8px',
                margin: '2px 0',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.7)',
                border: '1px dashed rgba(255, 255, 255, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <img
                src={channel.thumbnail}
                alt={channel.name}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  marginRight: '12px',
                  flexShrink: 0
                }}
              />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {channel.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FolderManager;