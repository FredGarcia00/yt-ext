import { CacheService } from './utils/cache-service';
import { YouTubeAPI } from './utils/youtube-api';

// Track API usage to prevent quota issues
let apiCallsToday = 0;
let lastResetDate = new Date().toDateString();
const MAX_API_CALLS_PER_DAY = 9000; // Leave some buffer from 10,000 quota

// Reset counter daily
function checkDailyReset() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    apiCallsToday = 0;
    lastResetDate = today;
    chrome.storage.local.set({ apiCallsToday: 0, lastResetDate: today });
    
    // Also reset quota exceeded flag
    chrome.storage.local.remove(['quotaExceeded', 'quotaResetTime']);
    console.log('FolderTube: Daily quota reset - API calls available again');
  }
}

// Load saved API usage
chrome.storage.local.get(['apiCallsToday', 'lastResetDate'], (result) => {
  if (result.apiCallsToday !== undefined) {
    apiCallsToday = result.apiCallsToday;
  }
  if (result.lastResetDate) {
    lastResetDate = result.lastResetDate;
  }
  checkDailyReset();
});

// Background refresh for high-priority channels
async function refreshHighPriorityChannels() {
  checkDailyReset();
  
  // Check if we have quota remaining
  if (apiCallsToday >= MAX_API_CALLS_PER_DAY) {
    console.log('FolderTube: Daily API quota reached, skipping background refresh');
    return;
  }
  
  try {
    // Get channels that need refresh
    const channelsToRefresh = await CacheService.getChannelsNeedingRefresh(5);
    
    if (channelsToRefresh.length === 0) {
      console.log('FolderTube: No channels need refresh');
      return;
    }
    
    console.log(`FolderTube: Refreshing ${channelsToRefresh.length} channels in background`);
    
    // Refresh each channel
    for (const channelId of channelsToRefresh) {
      if (apiCallsToday >= MAX_API_CALLS_PER_DAY) {
        break;
      }
      
      try {
        await YouTubeAPI.getChannelVideos(channelId, '', true);
        apiCallsToday++;
        chrome.storage.local.set({ apiCallsToday });
        
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`FolderTube: Failed to refresh channel ${channelId}:`, error);
      }
    }
  } catch (error) {
    console.error('FolderTube: Background refresh error:', error);
  }
}

// Set up periodic refresh (every 30 minutes)
chrome.alarms.create('refreshChannels', { periodInMinutes: 30 });

// Set up daily quota reset at midnight Pacific Time (YouTube's reset time)
function scheduleQuotaReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Midnight
  
  const timeUntilReset = tomorrow.getTime() - now.getTime();
  
  chrome.alarms.create('quotaReset', { 
    when: Date.now() + timeUntilReset,
    periodInMinutes: 24 * 60 // Daily
  });
}

scheduleQuotaReset();

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshChannels') {
    refreshHighPriorityChannels();
  } else if (alarm.name === 'quotaReset') {
    checkDailyReset();
    console.log('FolderTube: Scheduled quota reset completed');
  }
});

// Initial refresh after 5 minutes
setTimeout(() => {
  refreshHighPriorityChannels();
}, 5 * 60 * 1000);

// Listen for API quota updates from content scripts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'apiCallMade') {
    apiCallsToday++;
    chrome.storage.local.set({ apiCallsToday });
    return false; // Synchronous response not needed
  }
  
  if (request.type === 'getApiUsage') {
    sendResponse({ apiCallsToday, maxCalls: MAX_API_CALLS_PER_DAY });
    return false; // Synchronous response
  }
  
  return false; // Default return
});

export { apiCallsToday, MAX_API_CALLS_PER_DAY };