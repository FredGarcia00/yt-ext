import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { YouTubeScraper } from '../utils/youtube-scraper';

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

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, selectedChannels: string[]) => void;
  existingChannels?: Channel[];
  folders?: Folder[];
  editingFolderId?: string;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreate,
  existingChannels,
  folders = [],
  editingFolderId
}) => {
  const [folderName, setFolderName] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFolders, setShowFolders] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setSelectedChannels(new Set());
      setSearchTerm('');
      
      // Use existing channels if provided, otherwise fetch
      if (existingChannels && existingChannels.length > 0) {
        // Ensure all existing channels have valid thumbnails
        const channelsWithFallbacks = existingChannels.map(channel => {
          // Check if thumbnail is valid
          const isValidThumbnail = channel.thumbnail && 
            channel.thumbnail.length > 10 &&
            (channel.thumbnail.startsWith('http') || 
             channel.thumbnail.startsWith('data:image') ||
             channel.thumbnail.includes('<svg'));
          
          return {
            ...channel,
            thumbnail: isValidThumbnail ? channel.thumbnail : YouTubeScraper.generateFallbackAvatar(channel.name)
          };
        });
        setChannels(channelsWithFallbacks);
        setLoading(false);
      } else {
        loadChannels();
      }
      
      // Focus the input after a delay (only if creating new folder)
      if (!editingFolderId) {
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>('#foldertube-folder-name-input');
          if (input) {
            input.focus({ preventScroll: true });
          }
        }, 100);
      }
    }
  }, [isOpen, existingChannels, editingFolderId]);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const youtubeChannels = await YouTubeScraper.getSubscriptions();
      
      const convertedChannels: Channel[] = youtubeChannels.map(ytChannel => {
        // Use the avatar URL from YouTubeScraper, it already has proper fallback handling
        let thumbnail = ytChannel.avatarUrl;
        
        // Check if the thumbnail is a valid URL or SVG data
        const isValidThumbnail = thumbnail && 
          thumbnail.length > 10 &&
          (thumbnail.startsWith('http') || 
           thumbnail.startsWith('//') ||
           thumbnail.includes('<svg') ||
           (thumbnail.startsWith('data:image') && thumbnail.length > 100));
        
        if (!isValidThumbnail) {
          thumbnail = YouTubeScraper.generateFallbackAvatar(ytChannel.name);
        }
        
        return {
          id: ytChannel.id,
          name: ytChannel.name,
          thumbnail,
          url: ytChannel.url
        };
      });
      setChannels(convertedChannels);
    } catch (err) {
      console.error('FolderTube: Error loading subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (channelId: string) => {
    const newSelected = new Set(selectedChannels);
    if (newSelected.has(channelId)) {
      newSelected.delete(channelId);
    } else {
      newSelected.add(channelId);
    }
    setSelectedChannels(newSelected);
  };

  const handleCreate = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (editingFolderId || folderName.trim()) {
      onCreate(folderName.trim(), Array.from(selectedChannels));
      onClose();
    }
  };

  // Get all channel IDs that are already in folders
  const channelsInFolders = new Set<string>();
  folders.forEach(folder => {
    // Don't exclude channels from the folder we're editing
    if (folder.id !== editingFolderId) {
      folder.channelIds.forEach(channelId => {
        channelsInFolders.add(channelId);
      });
    }
  });

  // Get channels in selected folder
  const channelsInSelectedFolder = selectedFolderId 
    ? folders.find(f => f.id === selectedFolderId)?.channelIds || []
    : [];

  // Filter channels based on view mode
  const filteredChannels = showFolders && selectedFolderId
    ? channels.filter(channel => 
        channelsInSelectedFolder.includes(channel.id) &&
        channel.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : channels.filter(channel =>
        channel.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !channelsInFolders.has(channel.id)
      );

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: '240px',
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000002
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '500px',
        height: 'auto',
        maxHeight: '600px',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            color: '#0f0f0f'
          }}>
            {editingFolderId ? 'Add Channels to Folder' : 'Create New Folder'}
          </h2>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1
        }}>
          {/* Folder Name Input - only show when creating new folder */}
          {!editingFolderId && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#606060'
              }}>
                Folder Name
              </label>
              <input
                id="foldertube-folder-name-input"
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#065fd4';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                }}
              />
            </div>
          )}

          {/* Channel Selection */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#606060'
            }}>
              {editingFolderId ? 'Select Channels to Add' : 'Add Channels (Optional)'}
            </label>
            
            {/* Search */}
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search channels..."
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                marginBottom: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            {/* Folder Toggle */}
            {!editingFolderId && folders.length > 0 && (
              <div style={{
                marginBottom: '12px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowFolders(false);
                    setSelectedFolderId(null);
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: '1px solid',
                    borderColor: !showFolders ? '#065fd4' : '#e0e0e0',
                    borderRadius: '16px',
                    backgroundColor: !showFolders ? '#e3f2fd' : 'white',
                    color: !showFolders ? '#065fd4' : '#606060',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  All Channels
                </button>
                {folders.map(folder => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      setShowFolders(true);
                      setSelectedFolderId(folder.id);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: 500,
                      border: '1px solid',
                      borderColor: showFolders && selectedFolderId === folder.id ? '#065fd4' : '#e0e0e0',
                      borderRadius: '16px',
                      backgroundColor: showFolders && selectedFolderId === folder.id ? '#e3f2fd' : 'white',
                      color: showFolders && selectedFolderId === folder.id ? '#065fd4' : '#606060',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {folder.name} ({folder.channelIds.length})
                  </button>
                ))}
              </div>
            )}

            {/* Channel List */}
            <div style={{
              maxHeight: '250px',
              overflowY: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              padding: '8px'
            }}>
              {loading ? (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#606060',
                  fontSize: '14px'
                }}>
                  Loading channels...
                </div>
              ) : filteredChannels.length === 0 ? (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#606060',
                  fontSize: '14px'
                }}>
                  {showFolders && selectedFolderId 
                    ? 'No channels in this folder match your search'
                    : searchTerm 
                      ? 'No channels found matching your search'
                      : 'No available channels to add'}
                </div>
              ) : (
                filteredChannels.map((channel) => (
                  <div
                    key={channel.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      backgroundColor: selectedChannels.has(channel.id) ? '#e3f2fd' : 'transparent'
                    }}
                    onClick={() => toggleChannel(channel.id)}
                    onMouseEnter={(e) => {
                      if (!selectedChannels.has(channel.id)) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedChannels.has(channel.id)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedChannels.has(channel.id)}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        marginRight: '12px',
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        pointerEvents: 'none'
                      }}
                    />
                    <img
                      src={channel.thumbnail || YouTubeScraper.generateFallbackAvatar(channel.name)}
                      alt={channel.name}
                      onError={(e) => {
                        // Use fallback avatar if loading fails
                        const fallback = YouTubeScraper.generateFallbackAvatar(channel.name);
                        if (e.currentTarget.src !== fallback) {
                          e.currentTarget.src = fallback;
                        }
                      }}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        marginRight: '12px',
                        objectFit: 'cover',
                        backgroundColor: '#f0f0f0' // Temporary background while loading
                      }}
                    />
                    <span style={{
                      fontSize: '14px',
                      color: '#0f0f0f',
                      flex: 1
                    }}>
                      {channel.name}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            {selectedChannels.size > 0 && (
              <div style={{
                marginTop: '8px',
                fontSize: '13px',
                color: '#606060'
              }}>
                {selectedChannels.size} channel{selectedChannels.size > 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#606060',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={editingFolderId ? selectedChannels.size === 0 : !folderName.trim()}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              borderRadius: '6px',
              backgroundColor: (editingFolderId ? selectedChannels.size > 0 : folderName.trim()) ? '#065fd4' : '#e0e0e0',
              color: (editingFolderId ? selectedChannels.size > 0 : folderName.trim()) ? 'white' : '#909090',
              cursor: (editingFolderId ? selectedChannels.size > 0 : folderName.trim()) ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (editingFolderId ? selectedChannels.size > 0 : folderName.trim()) {
                e.currentTarget.style.backgroundColor = '#0450a8';
              }
            }}
            onMouseLeave={(e) => {
              if (editingFolderId ? selectedChannels.size > 0 : folderName.trim()) {
                e.currentTarget.style.backgroundColor = '#065fd4';
              }
            }}
          >
            {editingFolderId ? 'Add to Folder' : 'Create Folder'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateFolderModal;