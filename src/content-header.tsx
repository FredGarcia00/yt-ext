import ReactDOM from 'react-dom/client';
import './content.css';
import HeaderAISort from './components/HeaderAISort';
import { YouTubeAPIInterceptor } from './utils/youtube-api-interceptor';
import { YouTubeEmailVerifier } from './utils/youtube-email-verifier';
import { SupabaseAuthService } from './utils/supabase-auth-service';
import { YouTubeAccountDetector } from './utils/youtube-account-detector';
import './utils/subscription-debug';


const CONTAINER_ID = 'foldertube-header-container';

// Start YouTube API interception for bulletproof account detection
let headerRoot: ReactDOM.Root | null = null;

function startAccountMonitoring() {
  
  // Start YouTube account monitoring to prevent account bleeding
  SupabaseAuthService.startAccountChangeMonitoring();
  
  // Start YouTube API interception
  YouTubeAPIInterceptor.startInterception();
  
  // Listen for account changes and refresh the UI
  YouTubeAPIInterceptor.onChannelChange((channelId) => {
    
    // Clear email verification cache when account changes
    YouTubeEmailVerifier.clearCache();
    
    // Force refresh the header component to reflect new account data
    refreshHeaderUI();
    
    // Clear all cached data for the UI to reload with new account
    window.dispatchEvent(new CustomEvent('foldertube:account-changed', {
      detail: { channelId }
    }));
  });
  
  // Try immediate channel detection
  const immediateChannelId = YouTubeAPIInterceptor.getCurrentChannelId();
  if (immediateChannelId) {
  } else {
    // Wait for channel detection with extended timeout
    YouTubeAPIInterceptor.waitForChannelDetection(10000).then((channelId) => {
      if (channelId) {
      } else {
        console.warn('FolderTube: Using fallback - no channel detection after 10s');
      }
    });
  }
}

function refreshHeaderUI() {
  // Remove existing container
  const existingContainer = document.getElementById(CONTAINER_ID);
  if (existingContainer && headerRoot) {
    headerRoot.unmount();
    existingContainer.remove();
    headerRoot = null;
  }
  
  // Re-inject header UI
  setTimeout(() => {
    attemptHeaderInjection();
  }, 100);
}

// Add drag-and-drop functionality to YouTube's native subscriptions
function addDragToYouTubeSubscriptions() {
  const allGuideEntries = document.querySelectorAll('ytd-guide-entry-renderer');
  const subscriptionItems = Array.from(allGuideEntries).filter(item => {
    const link = item.querySelector('a[href*="/@"], a[href*="/channel/"]');
    return link !== null;
  });
  
  subscriptionItems.forEach((item) => {
    const element = item as HTMLElement;
    const link = element.querySelector('a[href*="/@"], a[href*="/channel/"]') as HTMLAnchorElement;
    
    if (link && !element.hasAttribute('data-foldertube-drag')) {
      element.setAttribute('data-foldertube-drag', 'true');
      element.draggable = true;
      element.style.cursor = 'move';
      
      // Extract channel info
      const href = link.href;
      const nameElement = element.querySelector('yt-formatted-string, #title');
      const channelName = nameElement?.textContent?.trim() || 'Unknown Channel';
      
      // Extract channel ID
      const channelIdMatch = href.match(/\/channel\/(UC[\w-]+)/);
      const handleMatch = href.match(/\/@([\w-]+)/);
      let channelId = '';
      
      if (channelIdMatch) {
        channelId = channelIdMatch[1];
      } else if (handleMatch) {
        channelId = '@' + handleMatch[1];
      }
      
      element.setAttribute('data-channel-id', channelId);
      
      element.addEventListener('dragstart', (e) => {
        // Try to extract avatar URL from the current element
        let avatarUrl = '';
        const img = element.querySelector('img');
        if (img) {
          const src = img.getAttribute('src') || img.src;
          if (src && src.includes('yt3.ggpht.com')) {
            avatarUrl = src;
          }
        }
        
        const channelData = {
          id: channelId,
          name: channelName,
          url: href,
          avatarUrl: avatarUrl || '' // Include avatar if found
        };
        
        e.dataTransfer?.setData('application/foldertube-channel', JSON.stringify(channelData));
        e.dataTransfer?.setData('text/plain', channelId);
        
        // Visual feedback
        element.style.opacity = '0.5';
      });
      
      element.addEventListener('dragend', () => {
        element.style.opacity = '1';
      });
    }
  });
}

function injectHeaderUI() {
  
  // Wait for the header to be available
  const header = document.querySelector('ytd-masthead');
  if (!header) {
    return false;
  }

  // Check if already injected
  if (document.getElementById(CONTAINER_ID)) {
    return true;
  }
  
  // Add drag functionality to YouTube's native subscriptions
  addDragToYouTubeSubscriptions();

  // Find the search box container
  const searchContainer = header.querySelector('#center, ytd-searchbox');
  
  if (!searchContainer) {
    return false;
  }

  // Create container
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.height = '100%';
  container.style.marginRight = '16px';
  
  // Insert before the search box
  searchContainer.parentNode?.insertBefore(container, searchContainer);
  
  // Mount React app
  try {
    headerRoot = ReactDOM.createRoot(container);
    headerRoot.render(<HeaderAISort />);
    
    return true;
  } catch (error) {
    console.error('FolderTube: Failed to mount header React app:', error);
    container.remove();
    return false;
  }
}

// Initial injection attempt
function attemptHeaderInjection() {
  if (!injectHeaderUI()) {
    // Retry with exponential backoff
    let retries = 0;
    const maxRetries = 10;
    
    const retry = () => {
      if (retries >= maxRetries) {
        console.error('FolderTube: Failed to inject header after maximum retries');
        return;
      }
      
      retries++;
      setTimeout(() => {
        if (!injectHeaderUI()) {
          retry();
        }
      }, Math.min(1000 * Math.pow(2, retries), 10000));
    };
    
    retry();
  }
}

// Debounce helper
let dragTimeout: NodeJS.Timeout | null = null;
function debounceDrag() {
  if (dragTimeout) {
    clearTimeout(dragTimeout);
  }
  dragTimeout = setTimeout(() => {
    addDragToYouTubeSubscriptions();
  }, 500);
}

// MutationObserver to handle YouTube SPA navigation
function setupHeaderMutationObserver() {
  const observer = new MutationObserver(() => {
    // Check if our container was removed
    const containerExists = document.getElementById(CONTAINER_ID);
    const header = document.querySelector('ytd-masthead');
    
    if (header && !containerExists) {
      attemptHeaderInjection();
    }
    
    // Debounce YouTube subscription drag setup
    debounceDrag();
  });

  // Observe the main app container for changes
  const appContainer = document.querySelector('ytd-app');
  if (appContainer) {
    observer.observe(appContainer, {
      childList: true,
      subtree: true
    });
  } else {
    // Retry attaching observer
    setTimeout(setupHeaderMutationObserver, 1000);
  }
}

// Expose YouTubeAccountDetector globally for background script access
(window as any).YouTubeAccountDetector = YouTubeAccountDetector;

// Add message listener for background script communication
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'getCurrentYouTubeChannel') {
    try {
      const channelId = YouTubeAccountDetector.getCurrentPageChannelId();
      sendResponse({ channelId });
    } catch (error) {
      console.error('Content script: Error getting YouTube channel:', error);
      sendResponse({ channelId: null, error: error instanceof Error ? error.message : 'Unknown error' });
    }
    return true; // Keep message channel open for async response
  }
});

// Listen for refresh events from HeaderFolderManager
window.addEventListener('foldertube:refresh', () => {
  addDragToYouTubeSubscriptions();
});

// Start injection when DOM is ready

if (document.readyState === 'loading') {
  console.log('FolderTube: Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    startAccountMonitoring();
    attemptHeaderInjection();
    setupHeaderMutationObserver();
  });
} else {
  startAccountMonitoring();
  attemptHeaderInjection();
  setupHeaderMutationObserver();
}