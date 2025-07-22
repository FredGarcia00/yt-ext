import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { YouTubeAPI } from '../utils/youtube-api';
import type { YouTubeChannel } from '../utils/youtube-scraper';
import type { VideoData } from '../utils/cache-service';
import { formatRelativeTime, formatViewCount } from '../utils/format-helpers';

interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}

interface CollectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  channels: YouTubeChannel[];
  onRefresh?: () => void;
}

const CollectionsModal: React.FC<CollectionsModalProps> = ({
  isOpen,
  onClose,
  folders,
  channels
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderVideos, setFolderVideos] = useState<Map<string, { [channelId: string]: VideoData[] }>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  useEffect(() => {
    if (!isOpen) return;
    
    // Auto-select first folder if none selected
    if (!selectedFolderId && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }
  }, [isOpen, folders, selectedFolderId]);

  const loadFolderVideos = async (folderId: string) => {
    if (loading.has(folderId) || folderVideos.has(folderId)) return;
    
    setLoading(prev => new Set([...prev, folderId]));
    
    try {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;
      
      const channelVideoGroups: { [channelId: string]: VideoData[] } = {};
      
      // Get videos from each channel in the folder (limit to prevent overload)
      for (const channelId of folder.channelIds.slice(0, 10)) {
        try {
          const channel = getChannelById(channelId);
          const channelName = channel?.name || 'Unknown';
          const channelVideoData = await YouTubeAPI.getChannelVideos(channelId, channelName);
          if (channelVideoData && channelVideoData.videos) {
            // Store videos grouped by channel
            channelVideoGroups[channelId] = channelVideoData.videos.slice(0, 4); // Limit per channel
          }
        } catch (error) {
          console.log(`Failed to load videos for channel ${channelId}:`, error);
        }
      }
      
      // Store the grouped videos instead of a flat array
      setFolderVideos(prev => new Map(prev.set(folderId, channelVideoGroups as any)));
    } catch (error) {
      console.error('Failed to load folder videos:', error);
    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    if (selectedFolderId) {
      loadFolderVideos(selectedFolderId);
    }
  }, [selectedFolderId]);

  const getChannelById = (id: string) => channels.find(c => c.id === id);

  if (!isOpen) return null;

  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '1200px',
        height: '80%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>Collections</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar - Folder List */}
          <div style={{
            width: '300px',
            borderRight: '1px solid #e0e0e0',
            backgroundColor: '#f9f9f9',
            overflow: 'auto'
          }}>
            <div style={{ padding: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                Your Folders ({folders.length})
              </h3>
              {folders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    backgroundColor: selectedFolderId === folder.id ? '#e3f2fd' : 'transparent',
                    border: selectedFolderId === folder.id ? '1px solid #2196f3' : '1px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedFolderId !== folder.id) {
                      e.currentTarget.style.backgroundColor = '#f0f0f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFolderId !== folder.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px' }}>
                    {folder.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {folder.channelIds.length} channels
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content - Selected Folder */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {selectedFolder ? (
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>{selectedFolder.name}</h3>
                
                {/* Channels in Folder */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', marginBottom: '12px' }}>
                    Channels ({selectedFolder.channelIds.length})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedFolder.channelIds.map(channelId => {
                      const channel = getChannelById(channelId);
                      return (
                        <div
                          key={channelId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '20px',
                            fontSize: '13px',
                            gap: '8px'
                          }}
                        >
                          {channel?.avatarUrl && (
                            <img
                              src={channel.avatarUrl}
                              alt={channel.name}
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%'
                              }}
                            />
                          )}
                          <span>{channel?.name || channelId}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Videos Organized by Channel */}
                <div>
                  <h4 style={{ fontSize: '16px', marginBottom: '12px' }}>Recent Videos by Channel</h4>
                  {loading.has(selectedFolder.id) ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                      Loading videos...
                    </div>
                  ) : (
                    <div>
                      {Object.entries(folderVideos.get(selectedFolder.id) || {}).map(([channelId, videos]) => {
                        const channel = getChannelById(channelId);
                        if (!videos || videos.length === 0) return null;
                        
                        return (
                          <div key={channelId} style={{ marginBottom: '32px' }}>
                            {/* Channel Header */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              marginBottom: '12px',
                              padding: '8px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '8px'
                            }}>
                              {channel?.avatarUrl && (
                                <img
                                  src={channel.avatarUrl}
                                  alt={channel.name}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    marginRight: '12px'
                                  }}
                                />
                              )}
                              <div>
                                <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                                  {channel?.name || 'Unknown Channel'}
                                </h5>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  {videos.length} recent videos
                                </div>
                              </div>
                            </div>
                            
                            {/* Channel Videos */}
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(4, 1fr)', 
                              gap: '12px',
                              marginLeft: '20px'
                            }}>
                              {videos.map(video => (
                                <div
                                  key={video.id}
                                  style={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                  }}
                                  onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank')}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    style={{
                                      width: '100%',
                                      height: '140px',
                                      objectFit: 'cover'
                                    }}
                                  />
                                  <div style={{ padding: '10px' }}>
                                    <div style={{
                                      fontSize: '13px',
                                      fontWeight: '500',
                                      lineHeight: '1.3',
                                      marginBottom: '6px',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden'
                                    }}>
                                      {video.title}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#666' }}>
                                      {formatViewCount(video.viewCount)} views • {formatRelativeTime(video.publishedAt)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                Select a folder to view its contents
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default CollectionsModal;