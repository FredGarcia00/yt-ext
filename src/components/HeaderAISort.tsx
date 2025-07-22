import React, { useState, useEffect } from 'react';
import { YouTubeScraper } from '../utils/youtube-scraper';
import { YouTubeAPI } from '../utils/youtube-api';
import { aiCategorizer } from '../utils/aiCategorizer';

interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}


const HeaderAISort: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isAISorting, setIsAISorting] = useState(false);

  useEffect(() => {
    const loadFolders = async () => {
      try {
        const result = await chrome.storage.local.get(['folders']);
        if (result.folders) {
          setFolders(result.folders);
        }
      } catch (error) {
        console.error('FolderTube: Error loading folders:', error);
      }
    };

    loadFolders();

    // Listen for storage changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.folders) {
        setFolders(changes.folders.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleAISort = async () => {
    setIsAISorting(true);
    
    try {
      // Announce to user
      const announcement = document.createElement('div');
      announcement.textContent = 'AI is categorizing your channels...';
      announcement.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #6d28d9;
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3);
      `;
      document.body.appendChild(announcement);

      // Get current channels
      const channels = await YouTubeScraper.getSubscriptions();
      
      announcement.textContent = "Fetching channel details from YouTube...";
      
      // Get real channel metadata from YouTube API
      const channelIds = channels.map((c: any) => c.id).filter(Boolean);
      let channelDetails: any[] = [];
      
      try {
        // Batch fetch channel details from YouTube API
        channelDetails = await YouTubeAPI.getChannelDetails(channelIds);
        console.log('FolderTube: Got channel details for', channelDetails.length, 'channels');
      } catch (error) {
        console.warn('FolderTube: Failed to get channel details, using basic data:', error);
        channelDetails = [];
      }
      
      announcement.textContent = "Analyzing recent video content for better categorization...";
      
      // Fetch recent video titles for enhanced categorization
      const videoTitlesMap = new Map<string, string[]>();
      const sampleSize = Math.min(channelIds.length, 30); // Increased sample size for better accuracy
      
      // Batch fetch video titles more efficiently
      const batchSize = 5;
      for (let i = 0; i < sampleSize; i += batchSize) {
        const batch = channelIds.slice(i, Math.min(i + batchSize, sampleSize));
        announcement.textContent = `Analyzing video content (${Math.min(i + batchSize, sampleSize)}/${sampleSize})...`;
        
        await Promise.all(batch.map(async (channelId: string) => {
          const channel = channels.find((c: any) => c.id === channelId);
          
          try {
            const channelVideos = await YouTubeAPI.getChannelVideos(channelId, channel?.name || 'Unknown', false, true);
            
            if (channelVideos?.videos && channelVideos.videos.length > 0) {
              // Get more video titles for better analysis (up to 10)
              const allVideoTitles = channelVideos.videos.slice(0, 10).map(video => video.title);
              videoTitlesMap.set(channelId, allVideoTitles);
              console.log(`FolderTube: Got ${allVideoTitles.length} video titles for ${channel?.name}`);
            }
          } catch (error) {
            console.warn(`FolderTube: Failed to get videos for channel ${channelId}:`, error);
            // Continue without video titles for this channel
          }
        }));
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Convert channels to ChannelMetadata format with real YouTube data
      const channelMetadata = channels.map((channel: any) => {
        const apiData = channelDetails.find(d => d.id === channel.id);
        return {
          id: channel.id,
          name: channel.name,
          thumbnail: channel.avatarUrl,
          description: apiData?.description,
          topicIds: apiData?.topicIds,
          keywords: apiData?.keywords
        };
      });
      
      announcement.textContent = "AI is analyzing and categorizing your channels...";

      // Categorize channels with enhanced video title analysis
      const categorizedMap = aiCategorizer.categorizeChannelsWithVideoTitles(channelMetadata, videoTitlesMap);
      
      // Convert map to folder format
      const categorizedFolders: Folder[] = [];
      for (const [categoryId, channelIds] of categorizedMap) {
        if (channelIds.length > 0) {
          const category = aiCategorizer.getCategoryById(categoryId);
          const folderName = categoryId === 'uncategorized' ? 'Uncategorized' : (category?.name || categoryId);
          categorizedFolders.push({
            id: Date.now().toString() + Math.random().toString(),
            name: folderName,
            channelIds: channelIds
          });
        }
      }
      
      // Save to storage
      await chrome.storage.local.set({ folders: categorizedFolders });
      setFolders(categorizedFolders);
      
      // Update announcement
      announcement.textContent = `Created ${categorizedFolders.length} collections!`;
      announcement.style.background = '#10b981';
      
      setTimeout(() => {
        announcement.remove();
      }, 3000);
      
      // Dispatch refresh event
      window.dispatchEvent(new CustomEvent('foldertube:refresh'));
      
    } catch (error) {
      console.error('FolderTube: Error during AI sort:', error);
    } finally {
      setIsAISorting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      height: '100%'
    }}>
      {/* AI Sort Button */}
      <button
        onClick={handleAISort}
        disabled={isAISorting}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: isAISorting ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 8px rgba(109, 40, 217, 0.3)',
          opacity: isAISorting ? 0.7 : 1
        }}
        onMouseEnter={(e) => {
          if (!isAISorting) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(109, 40, 217, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(109, 40, 217, 0.3)';
        }}
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

      {/* Collections Indicator */}
      {folders.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          backgroundColor: 'rgba(109, 40, 217, 0.1)',
          borderRadius: '20px',
          fontSize: '13px',
          color: '#6d28d9',
          fontWeight: '500'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="#6d28d9"/>
          </svg>
          <span>{folders.length} Collections</span>
        </div>
      )}

      {/* Add CSS animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HeaderAISort;