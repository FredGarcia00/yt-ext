import React, { useState, useEffect } from 'react';
import { YouTubeScraper } from '../utils/youtube-scraper';
import { CacheService } from '../utils/cache-service';
import FolderPreview from './FolderPreview';
import CreateFolderModal from './CreateFolderModal';
import { aiCategorizer } from '../utils/aiCategorizer';
import { SupabaseAuthService } from '../utils/supabase-auth-service';
import { YouTubeAccountDetector } from '../utils/youtube-account-detector';

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

const HeaderFolderManager: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addingToFolderId, setAddingToFolderId] = useState<string | null>(null);
  const [isAISorting, setIsAISorting] = useState(false);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);

  // Save folders to Supabase backend ONLY - no local storage fallbacks
  const saveFoldersToStorage = async (newFolders: Folder[]) => {
    try {
      // MUST have authentication to save
      let auth = await SupabaseAuthService.getCurrentAuth();
      
      if (!auth) {
        console.log('FolderTube: [HeaderFolderManager] No authentication found, attempting to authenticate...');
        
        const authResult = await SupabaseAuthService.authenticate();
        if (authResult.success && authResult.email && authResult.channelId) {
          auth = {
            email: authResult.email,
            channelId: authResult.channelId,
            channelName: authResult.channelName || 'Unknown'
          };
          console.log('FolderTube: [HeaderFolderManager] ✅ Authentication successful');
        } else {
          console.error('FolderTube: [HeaderFolderManager] ❌ Authentication failed:', authResult.error);
          throw new Error(`Authentication required: ${authResult.error}`);
        }
      }
      
      console.log('FolderTube: [HeaderFolderManager] Saving folders to Supabase for:', auth.email);
      
      const result = await SupabaseAuthService.saveFolders(newFolders, {
        email: auth.email,
        channelId: auth.channelId
      });
      
      if (!result.success) {
        console.error('FolderTube: [HeaderFolderManager] ❌ Failed to save folders to Supabase:', result.error);
        throw new Error(`Backend save failed: ${result.error}`);
      } else {
        console.log('FolderTube: [HeaderFolderManager] ✅ Folders saved to Supabase backend successfully');
      }
    } catch (error) {
      console.error('FolderTube: [HeaderFolderManager] ❌ Save error:', error);
      // Show error to user instead of silent failure
      alert(`Failed to save folders: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your internet connection and try again.`);
      throw error;
    }
  };

  // Load folders from Supabase for current account
  const loadFoldersForCurrentAccount = async () => {
    try {
      // MUST have authentication to use the extension
      const auth = await SupabaseAuthService.getCurrentAuth();
      if (!auth) {
        console.warn('FolderTube: [HeaderFolderManager] No authentication - cannot load folders');
        setFolders([]);
        return;
      }

      console.log('FolderTube: [HeaderFolderManager] Loading folders from Supabase for:', auth.email);
      const supabaseData = await SupabaseAuthService.loadFolders();
      
      if (supabaseData.success && supabaseData.folders) {
        // Convert Supabase format to component format
        const convertedFolders = supabaseData.folders.map((folder: any) => ({
          id: folder.id || folder.folder_id || `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: folder.folder_name || folder.name,
          channelIds: folder.channel_ids || folder.channelIds || []
        }));
        
        setFolders(convertedFolders);
        console.log('FolderTube: [HeaderFolderManager] ✅ Loaded', convertedFolders.length, 'folders from Supabase');
        
        // Smart preload videos for folders
        try {
          const folderChannelIds = convertedFolders.map((folder: Folder) => folder.channelIds);
          await CacheService.smartPreload(folderChannelIds);
        } catch (error) {
          console.warn('FolderTube: Smart preload failed:', error);
        }
      } else {
        console.warn('FolderTube: [HeaderFolderManager] Failed to load from Supabase:', supabaseData.error);
        setFolders([]);
      }
    } catch (error) {
      console.error('FolderTube: [HeaderFolderManager] ❌ Error loading folders:', error);
      setFolders([]);
    }
  };

  useEffect(() => {
    // Initial load
    const initialAccountId = YouTubeAccountDetector.getCurrentPageChannelId();
    setCurrentAccountId(initialAccountId);
    loadFoldersForCurrentAccount();

    // Set up account change detection
    const handleAccountChange = (newAccountId: string | null) => {
      console.log('FolderTube: [HeaderFolderManager] 🔄 Account changed:', { from: currentAccountId, to: newAccountId });
      
      if (newAccountId !== currentAccountId) {
        setCurrentAccountId(newAccountId);
        
        // Clear current folders immediately to prevent bleeding
        setFolders([]);
        
        // Clear cached authentication for account isolation
        SupabaseAuthService.clearAuth();
        
        // Clear subscription cache in background
        chrome.runtime.sendMessage({ type: 'clearSubscriptionCache' }, () => {
          console.log('FolderTube: [HeaderFolderManager] Cleared subscription cache');
        });
        
        // Load folders for new account after a brief delay
        setTimeout(() => {
          loadFoldersForCurrentAccount();
        }, 100);
      }
    };

    // Start monitoring account changes (simplified)
    YouTubeAccountDetector.startMonitoring();
    
    // Periodic check for account changes instead of callback system
    const checkInterval = setInterval(() => {
      const currentChannelId = YouTubeAccountDetector.getCurrentPageChannelId();
      if (currentChannelId !== currentAccountId) {
        handleAccountChange(currentChannelId);
      }
    }, 2000);

    // Cleanup on unmount
    return () => {
      clearInterval(checkInterval);
    };
  }, [currentAccountId]);

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

  const createFolder = async (name: string, selectedChannels: string[] = []) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: name,
      channelIds: selectedChannels
    };
    
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    
    // Save to chrome storage (using account-specific key)
    await saveFoldersToStorage(updatedFolders);
  };

  const addChannelsToFolder = async (folderId: string, newChannelIds: string[]) => {
    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) {
      // First, remove these channels from any other folders they might be in
      const updatedFolders = folders.map(folder => {
        if (folder.id === folderId) {
          // Add only channels that aren't already in the target folder
          const existingIds = new Set(folder.channelIds);
          const channelsToAdd = newChannelIds.filter(id => !existingIds.has(id));
          return {
            ...folder,
            channelIds: [...folder.channelIds, ...channelsToAdd]
          };
        } else {
          // Remove the channels from any other folder
          return {
            ...folder,
            channelIds: folder.channelIds.filter(id => !newChannelIds.includes(id))
          };
        }
      });
      
      setFolders(updatedFolders);
      
      // Save to chrome storage (using account-specific key)
      await saveFoldersToStorage(updatedFolders);
    }
  };

  const getChannelById = (channelId: string): Channel | undefined => {
    return channels.find(ch => ch.id === channelId);
  };

  const closeFolderPreview = () => {
    setSelectedFolder(null);
    setPreviewVisible(false);
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  };

  const handleEditFolderName = async (folderId: string, newName: string) => {
    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) {
      const newFolders = [...folders];
      newFolders[folderIndex].name = newName;
      setFolders(newFolders);
      
      // Update selected folder if it's being previewed
      if (selectedFolder && selectedFolder.id === folderId) {
        setSelectedFolder({ ...selectedFolder, name: newName });
      }
      
      // Save to chrome storage (using account-specific key)
      await saveFoldersToStorage(newFolders);
    }
  };

  const removeChannelFromFolder = async (folderId: string, channelId: string) => {
    const folderIndex = folders.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) {
      const newFolders = [...folders];
      newFolders[folderIndex].channelIds = newFolders[folderIndex].channelIds.filter(id => id !== channelId);
      setFolders(newFolders);
      
      // Save to chrome storage (using account-specific key)
      await saveFoldersToStorage(newFolders);
    }
  };

  const handleAISort = async () => {
    if (isAISorting || channels.length === 0) {
      return;
    }
    
    setIsAISorting(true);
    
    try {
      // Check if user has premium (for now, assume all users can use AI features)
      const isPremium = true;
      const maxCategories = isPremium ? 20 : 5;
      
      // For now, skip API calls and use simple name-based categorization for testing
      
      const channelMetadata = channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        description: channel.name, // Use name as description for keyword matching
        topicIds: [],
        keywords: [channel.name.toLowerCase()]
      }));
      
      
      // Categorize channels using AI
      const categorizedChannels = aiCategorizer.categorizeChannels(channelMetadata);
      
      // Create folders for non-empty categories
      const newFolders: Folder[] = [];
      let categoryCount = 0;
      
      for (const [categoryId, channelIds] of categorizedChannels) {
        if (categoryId === 'uncategorized' || channelIds.length === 0) continue;
        if (categoryCount >= maxCategories) break;
        
        const category = aiCategorizer.getCategoryById(categoryId);
        if (category) {
          const folderName = `${category.icon} ${category.name}`;
          const folder: Folder = {
            id: `ai-folder-${categoryId}-${Date.now()}`,
            name: folderName,
            channelIds: channelIds
          };
          newFolders.push(folder);
          categoryCount++;
        }
      }
      
      // Add uncategorized folder if there are uncategorized channels
      const uncategorizedChannels = categorizedChannels.get('uncategorized') || [];
      if (uncategorizedChannels.length > 0) {
        const folder: Folder = {
          id: `ai-folder-uncategorized-${Date.now()}`,
          name: '📂 Other',
          channelIds: uncategorizedChannels
        };
        newFolders.push(folder);
      }
      
      
      if (newFolders.length === 0) {
        alert('No categories found for your channels. Try subscribing to channels with more specific content.');
        return;
      }
      
      // Add new folders to existing ones
      const updatedFolders = [...folders, ...newFolders];
      setFolders(updatedFolders);
      
      // Save to chrome storage (using account-specific key)
      await saveFoldersToStorage(updatedFolders);
      alert(`Successfully created ${newFolders.length} AI-organized folders!`);
      
    } catch (error) {
      console.error('FolderTube: AI categorization failed:', error);
      alert('AI categorization failed. Please try again.');
    } finally {
      setIsAISorting(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      height: '40px'
    }}>
      {/* Collections Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowCreateModal(true);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          backgroundColor: '#6d28d9',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          height: '36px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#5b21b6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#6d28d9';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 7V17C3 19.2091 4.79086 21 7 21H17C19.2091 21 21 19.2091 21 17V9C21 6.79086 19.2091 5 17 5H13L11 3H7C4.79086 3 3 4.79086 3 7Z" 
            fill="currentColor"/>
        </svg>
        Collections
      </button>

      {/* AI Sort Button */}
      <button
        onClick={handleAISort}
        disabled={isAISorting || channels.length === 0}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          backgroundColor: isAISorting ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: isAISorting || channels.length === 0 ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          height: '36px',
          opacity: channels.length === 0 ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!isAISorting && channels.length > 0) {
            e.currentTarget.style.backgroundColor = '#059669';
          }
        }}
        onMouseLeave={(e) => {
          if (!isAISorting && channels.length > 0) {
            e.currentTarget.style.backgroundColor = '#10b981';
          }
        }}
        title={channels.length === 0 ? 'No subscriptions found' : 'Automatically organize subscriptions into folders'}
      >
        {isAISorting ? (
          <>
            <div style={{
              width: '14px',
              height: '14px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            AI Sorting...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 1 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5Z" 
                fill="currentColor"/>
              <circle cx="9.5" cy="9.5" r="2.5" fill="#10b981"/>
              <circle cx="19" cy="19" r="2" fill="currentColor"/>
            </svg>
            AI Sort
          </>
        )}
      </button>

      {/* Folder List */}
      {folders.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          maxWidth: '500px',
          overflow: 'hidden'
        }}>
          {folders.slice(0, 3).map((folder) => (
            <button
              key={folder.id}
              onMouseEnter={() => {
                setSelectedFolder(folder);
                setPreviewVisible(true);
                if (hoverTimeout) {
                  clearTimeout(hoverTimeout);
                  setHoverTimeout(null);
                }
              }}
              onMouseLeave={() => {
                const timeout = setTimeout(() => {
                  closeFolderPreview();
                }, 300);
                setHoverTimeout(timeout);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                backgroundColor: '#f8f9fa',
                color: '#1a1a1a',
                border: '1px solid #e0e0e0',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                height: '32px',
                whiteSpace: 'nowrap'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e3f2fd';
                e.currentTarget.style.borderColor = '#6d28d9';
                e.currentTarget.style.color = '#6d28d9';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#e0e0e0';
                e.currentTarget.style.color = '#1a1a1a';
              }}
            >
              <span style={{ fontSize: '14px' }}>
                {folder.name.split(' ')[0]}
              </span>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>
                {folder.name.split(' ').slice(1).join(' ')}
              </span>
              <span style={{
                fontSize: '10px',
                color: '#666',
                backgroundColor: '#e0e0e0',
                padding: '1px 4px',
                borderRadius: '8px',
                marginLeft: '2px'
              }}>
                {folder.channelIds.length}
              </span>
            </button>
          ))}
          {folders.length > 3 && (
            <div style={{
              padding: '6px 8px',
              fontSize: '12px',
              color: '#666',
              backgroundColor: '#f0f0f0',
              borderRadius: '12px',
              fontWeight: '500'
            }}>
              +{folders.length - 3} more
            </div>
          )}
        </div>
      )}

      {/* Folder Count Badge */}
      {folders.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '12px',
          fontSize: '12px',
          color: '#606060',
          fontWeight: '500'
        }}>
          <span>📁</span>
          <span>{folders.length}</span>
        </div>
      )}

      {/* Folder Preview */}
      {selectedFolder && previewVisible && (
        <FolderPreview
          isVisible={previewVisible}
          selectedFolderId={selectedFolder.id}
          folders={folders}
          getChannelById={getChannelById}
          onRemoveChannel={removeChannelFromFolder}
          onClose={closeFolderPreview}
          onEditFolderName={handleEditFolderName}
          onMouseEnter={() => {
            if (hoverTimeout) {
              clearTimeout(hoverTimeout);
              setHoverTimeout(null);
            }
          }}
          onMouseLeave={() => {
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
            addChannelsToFolder(addingToFolderId, channelIds);
          } else {
            createFolder(name, channelIds);
          }
        }}
        existingChannels={channels}
        folders={folders}
        editingFolderId={addingToFolderId || undefined}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

export default HeaderFolderManager;