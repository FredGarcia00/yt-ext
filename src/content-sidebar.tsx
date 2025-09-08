import ReactDOM from 'react-dom/client';
import './content.css';
import './content-collections.css';
import SidebarFolderSection from './components/SidebarFolderSection';
import { SupabaseAuthService } from './utils/supabase-auth-service';
import { YouTubeAccountDetector } from './utils/youtube-account-detector';

// Export collections functionality for global access
import * as collectionsModule from './content-collections';
(window as any).FolderTubeCollections = collectionsModule;

// Expose YouTubeAccountDetector globally for background script access (backup)
(window as any).YouTubeAccountDetector = YouTubeAccountDetector;

// Add message listener for background script communication (backup)
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'getCurrentYouTubeChannel') {
    try {
      const channelId = YouTubeAccountDetector.getCurrentPageChannelId();
      sendResponse({ channelId });
    } catch (error) {
      console.error('Content script (sidebar): Error getting YouTube channel:', error);
      sendResponse({ channelId: null, error: error instanceof Error ? error.message : 'Unknown error' });
    }
    return true; // Keep message channel open for async response
  }
});


const CONTAINER_ID = 'foldertube-sidebar-container';

function injectSidebarUI() {
  
  // Start YouTube account monitoring to prevent account bleeding  
  SupabaseAuthService.startAccountChangeMonitoring();
  
  // Find the guide (sidebar) section
  const guide = document.querySelector('#guide-inner-content');
  if (!guide) {
    return false;
  }

  // Check if already injected
  if (document.getElementById(CONTAINER_ID)) {
    return true;
  }

  // Find the subscriptions section
  const subscriptionsSection = guide.querySelector('#sections > ytd-guide-section-renderer:nth-child(2)');
  
  if (!subscriptionsSection) {
    return false;
  }

  // Create container
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  
  // Create a wrapper that matches YouTube's styling
  const sectionWrapper = document.createElement('ytd-guide-section-renderer');
  sectionWrapper.className = 'style-scope ytd-guide-renderer';
  sectionWrapper.appendChild(container);
  
  // Insert before the subscriptions section
  subscriptionsSection.parentNode?.insertBefore(sectionWrapper, subscriptionsSection);
  
  // Mount React app
  try {
    const root = ReactDOM.createRoot(container);
    root.render(<SidebarFolderSection />);
    
    return true;
  } catch (error) {
    console.error('FolderTube: Failed to mount sidebar React app:', error);
    sectionWrapper.remove();
    return false;
  }
}

// Initial injection attempt
function attemptSidebarInjection() {
  if (!injectSidebarUI()) {
    // Retry with exponential backoff
    let retries = 0;
    const maxRetries = 10;
    
    const retry = () => {
      if (retries >= maxRetries) {
        console.error('FolderTube: Failed to inject sidebar after maximum retries');
        return;
      }
      
      retries++;
      setTimeout(() => {
        if (!injectSidebarUI()) {
          retry();
        }
      }, Math.min(1000 * Math.pow(2, retries), 10000));
    };
    
    retry();
  }
}

// MutationObserver to handle YouTube SPA navigation
function setupSidebarMutationObserver() {
  const observer = new MutationObserver(() => {
    // Check if our container was removed
    const containerExists = document.getElementById(CONTAINER_ID);
    const guide = document.querySelector('#guide-inner-content');
    
    if (guide && !containerExists) {
      attemptSidebarInjection();
    }
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
    setTimeout(setupSidebarMutationObserver, 1000);
  }
}

// Start injection when DOM is ready

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    attemptSidebarInjection();
    setupSidebarMutationObserver();
  });
} else {
  attemptSidebarInjection();
  setupSidebarMutationObserver();
}