import React, { useState, useEffect } from 'react';
import { YouTubeScraper } from '../utils/youtube-scraper';
import { YouTubeAPI } from '../utils/youtube-api';
import { aiCategorizer } from '../utils/aiCategorizer';
import { showCollectionsView, isCollectionsViewActive } from '../content-collections';

interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}


const HeaderAISort: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isAISorting, setIsAISorting] = useState(false);
  const [aiSortsRemaining, setAiSortsRemaining] = useState(5);

  useEffect(() => {
    // Load AI sort usage data
    const loadUsageData = async () => {
      const today = new Date().toDateString();
      const result = await chrome.storage.local.get(['aiSortsToday', 'lastAiSortDate']);
      
      if (result.lastAiSortDate !== today) {
        // Reset for new day
        await chrome.storage.local.set({ aiSortsToday: 0, lastAiSortDate: today });
        setAiSortsRemaining(5);
      } else {
        const used = result.aiSortsToday || 0;
        setAiSortsRemaining(Math.max(0, 5 - used));
      }
    };
    
    loadUsageData();
  }, []);

  useEffect(() => {
    const loadFolders = async () => {
      try {
        // Check if extension context is still valid
        if (!chrome.storage) {
          console.warn('FolderTube: Extension context invalidated, cannot load folders');
          return;
        }
        
        const result = await chrome.storage.local.get(['folders']);
        if (result.folders) {
          setFolders(result.folders);
        }
      } catch (error) {
        // Handle extension context invalidation gracefully
        if ((error as Error).message?.includes('Extension context invalidated')) {
          console.warn('FolderTube: Extension was reloaded. Header component disabled until page refresh.');
          return;
        }
        
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

    // Only add listener if extension context is valid
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        try {
          chrome.storage.onChanged.removeListener(handleStorageChange);
        } catch (error) {
          // Ignore errors when removing listeners during context invalidation
          console.log('FolderTube: Could not remove storage listener, extension context may be invalidated');
        }
      };
    }
  }, []);

  const handleAISort = async () => {
    // Check if extension context is still valid
    if (!chrome.storage) {
      console.warn('FolderTube: Extension context invalidated, cannot perform AI sort');
      const announcement = document.createElement('div');
      announcement.textContent = 'Extension was updated. Please refresh the page to continue.';
      announcement.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #ff9800;
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
        cursor: pointer;
      `;
      announcement.onclick = () => window.location.reload();
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 5000);
      return;
    }
    
    // Check if user has remaining sorts
    if (aiSortsRemaining <= 0) {
      // Show message that limit is reached
      const announcement = document.createElement('div');
      announcement.textContent = 'AI Sort limit reached. Try again tomorrow!';
      announcement.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #dc2626;
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
      `;
      document.body.appendChild(announcement);
      
      setTimeout(() => announcement.remove(), 3000);
      return;
    }
    
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
      
      // Check if API quota is available before making calls
      const quotaCheck = await chrome.storage.local.get(['quotaExceeded', 'apiCallsToday']);
      const quotaExceeded = quotaCheck.quotaExceeded;
      const apiCallsToday = quotaCheck.apiCallsToday || 0;
      
      // Get real channel metadata from YouTube API (if quota available)
      const channelIds = channels.map((c: any) => c.id).filter(Boolean);
      let channelDetails: any[] = [];
      
      if (quotaExceeded || apiCallsToday > 8000) { // Leave buffer for video fetching
        console.log('FolderTube: Skipping channel details API calls to preserve quota');
        announcement.textContent = "Using channel names only for categorization to preserve API quota...";
      } else {
        try {
          // Batch fetch channel details from YouTube API
          channelDetails = await YouTubeAPI.getChannelDetails(channelIds);
          console.log('FolderTube: Got channel details for', channelDetails.length, 'channels');
        } catch (error: any) {
          console.warn('FolderTube: Failed to get channel details, using basic data:', error);
          channelDetails = [];
          // If it's a 403 error, show a more specific message
          if (error.message?.includes('403') || error.message?.includes('forbidden')) {
            announcement.textContent = "API quota exceeded. Using channel names for categorization...";
          }
        }
      }
      
      announcement.textContent = "Analyzing recent video content for better categorization...";
      
      // Fetch recent video titles for enhanced categorization (only if quota available)
      const videoTitlesMap = new Map<string, string[]>();
      
      if (!quotaExceeded && apiCallsToday < 8500) { // Conservative quota usage
        const sampleSize = Math.min(channelIds.length, 20); // Reduced sample size to save quota
        
        // Batch fetch video titles more efficiently
        const batchSize = 3; // Smaller batches to be more conservative
        for (let i = 0; i < sampleSize; i += batchSize) {
          const batch = channelIds.slice(i, Math.min(i + batchSize, sampleSize));
          announcement.textContent = `Analyzing video content (${Math.min(i + batchSize, sampleSize)}/${sampleSize})...`;
          
          await Promise.all(batch.map(async (channelId: string) => {
            const channel = channels.find((c: any) => c.id === channelId);
            
            try {
              const channelVideos = await YouTubeAPI.getChannelVideos(channelId, channel?.name || 'Unknown', false, true);
              
              if (channelVideos?.videos && channelVideos.videos.length > 0) {
                // Get fewer video titles to save quota (up to 5)
                const allVideoTitles = channelVideos.videos.slice(0, 5).map(video => video.title);
                videoTitlesMap.set(channelId, allVideoTitles);
                console.log(`FolderTube: Got ${allVideoTitles.length} video titles for ${channel?.name}`);
              }
            } catch (error) {
              console.warn(`FolderTube: Failed to get videos for channel ${channelId}:`, error);
              // Continue without video titles for this channel
            }
          }));
          
          // Longer delay between batches to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } else {
        console.log('FolderTube: Skipping video title fetching to preserve quota');
        announcement.textContent = "Analyzing channel names for categorization (quota preserved)...";
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
      
      // Update usage counter
      const today = new Date().toDateString();
      const usageResult = await chrome.storage.local.get(['aiSortsToday', 'lastAiSortDate']);
      const currentUsage = (usageResult.lastAiSortDate === today ? usageResult.aiSortsToday || 0 : 0) + 1;
      await chrome.storage.local.set({ aiSortsToday: currentUsage, lastAiSortDate: today });
      setAiSortsRemaining(Math.max(0, 5 - currentUsage));
      
      // Dispatch refresh event
      window.dispatchEvent(new CustomEvent('foldertube:refresh'));
      
      // Add glow effect to Collections button
      setTimeout(() => {
        const collectionsButton = document.getElementById('collections-button');
        if (collectionsButton) {
          // Add glow effect
          collectionsButton.style.animation = 'glow 2s ease-in-out 3';
          collectionsButton.style.boxShadow = '0 0 20px rgba(109, 40, 217, 0.8)';
          
          // Remove glow after animation
          setTimeout(() => {
            collectionsButton.style.animation = '';
            collectionsButton.style.boxShadow = '';
          }, 6000);
        }
      }, 500);
      
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
            AI Sort {aiSortsRemaining > 0 && `(${aiSortsRemaining} remaining today)`}
          </>
        )}
      </button>

      {/* Collections Button */}
      {folders.length > 0 && (
        <button
          id="collections-button"
          onClick={() => {
            if (!isCollectionsViewActive()) {
              showCollectionsView();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'white',
            color: '#6d28d9',
            border: '2px solid #6d28d9',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#6d28d9';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.color = '#6d28d9';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="currentColor"/>
          </svg>
          Collections
        </button>
      )}

      {/* Add CSS animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glow {
          0% { box-shadow: 0 0 10px rgba(109, 40, 217, 0.5); }
          50% { box-shadow: 0 0 20px rgba(109, 40, 217, 0.8), 0 0 30px rgba(109, 40, 217, 0.6); }
          100% { box-shadow: 0 0 10px rgba(109, 40, 217, 0.5); }
        }
      `}</style>
    </div>
  );
};

export default HeaderAISort;