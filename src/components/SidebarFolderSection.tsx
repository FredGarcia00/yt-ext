import React, { useState, useEffect } from 'react';
import { YouTubeScraper, type YouTubeChannel } from '../utils/youtube-scraper';
import { CacheService } from '../utils/cache-service';
import CollectionsModal from './CollectionsModal';

interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}

const SidebarFolderSection: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load folders with smart preloading
        const result = await chrome.storage.local.get(['folders']);
        if (result.folders) {
          setFolders(result.folders);
          
          // Smart preload videos for folders
          try {
            const folderChannelIds = result.folders.map((folder: Folder) => folder.channelIds);
            await CacheService.smartPreload(folderChannelIds);
          } catch (error) {
            console.log('FolderTube: Smart preload failed:', error);
          }
        }

        // Get current channels  
        const scrapedChannels = await YouTubeScraper.getSubscriptions();
        setChannels(scrapedChannels);
        
        // Trigger refresh to add drag functionality to native subscriptions
        window.dispatchEvent(new CustomEvent('foldertube:refresh'));
      } catch (error) {
        console.error('FolderTube: Error loading data:', error);
      }
    };

    loadData();

    // Listen for storage changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.folders) {
        setFolders(changes.folders.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };



  const openCollections = () => {
    setShowCollectionsModal(true);
  };

  return (
    <div style={{ marginTop: '12px' }}>
      {/* Collections Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '36px',
        marginBottom: '8px'
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#0f0f0f',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Collections
        </span>
        <button
          onClick={openCollections}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#0f0f0f" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Folders List */}
      <div style={{ paddingBottom: '8px' }}>
        {folders.map((folder) => (
          <div key={folder.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px 0 24px', // Reduced right padding
                height: '40px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.1s',
                minWidth: 0 // Allow container to shrink
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={openCollections}
            >
              {/* Folder Icon */}
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none"
                style={{ marginRight: '24px', flexShrink: 0 }}
              >
                <path 
                  d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" 
                  fill="#6d28d9"
                />
              </svg>

              {/* Folder Name - Fixed width to prevent overlap */}
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                minWidth: 0, // Allow flex item to shrink
                marginRight: '8px' // Add margin to prevent overlap
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#0f0f0f',
                  fontWeight: '400',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {folder.name}
                </span>
                
                {/* Channel Count Badge */}
                <span style={{
                  fontSize: '12px',
                  color: '#606060',
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  marginLeft: '8px',
                  flexShrink: 0 // Prevent badge from shrinking
                }}>
                  {folder.channelIds.length}
                </span>
              </div>

              {/* Expand/Collapse Arrow */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolderExpansion(folder.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  marginLeft: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  width: '24px',
                  height: '24px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none"
                  style={{
                    transform: expandedFolders.has(folder.id) ? 'rotate(90deg)' : 'rotate(0)',
                    transition: 'transform 0.2s'
                  }}
                >
                  <path 
                    d="M9 6l6 6-6 6" 
                    stroke="#606060" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Expanded Channel List */}
            {expandedFolders.has(folder.id) && (
              <div style={{ 
                paddingLeft: '48px',
                paddingRight: '12px',
                paddingBottom: '8px'
              }}>
                {folder.channelIds.slice(0, 5).map((channelId) => {
                  const channel = channels.find(c => c.id === channelId);
                  if (!channel) return null;

                  return (
                    <a
                      key={channelId}
                      href={channel.url || `https://www.youtube.com/channel/${channelId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'background-color 0.1s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <img 
                        src={channel.avatarUrl} 
                        alt={channel.name}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          marginRight: '12px'
                        }}
                      />
                      <span style={{
                        fontSize: '13px',
                        color: '#0f0f0f',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {channel.name}
                      </span>
                    </a>
                  );
                })}
                {folder.channelIds.length > 5 && (
                  <div style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    color: '#606060'
                  }}>
                    +{folder.channelIds.length - 5} more channels
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Collections Modal */}
      <CollectionsModal
        isOpen={showCollectionsModal}
        onClose={() => setShowCollectionsModal(false)}
        folders={folders}
        channels={channels}
        onRefresh={() => {
          window.dispatchEvent(new CustomEvent('foldertube:refresh'));
        }}
      />
    </div>
  );
};

export default SidebarFolderSection;