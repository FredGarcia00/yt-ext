import ReactDOM from 'react-dom/client';
import './content.css';
import HeaderAISort from './components/HeaderAISort';

console.log('FolderTube: Header content script loaded');

const CONTAINER_ID = 'foldertube-header-container';

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
  console.log('FolderTube: Attempting to inject header UI...');
  
  // Wait for the header to be available
  const header = document.querySelector('ytd-masthead');
  if (!header) {
    console.log('FolderTube: Header not found, retrying...');
    return false;
  }

  // Check if already injected
  if (document.getElementById(CONTAINER_ID)) {
    console.log('FolderTube: Header UI already injected');
    return true;
  }
  
  // Add drag functionality to YouTube's native subscriptions
  addDragToYouTubeSubscriptions();

  // Find the search box container
  const searchContainer = header.querySelector('#center, ytd-searchbox');
  
  if (!searchContainer) {
    console.log('FolderTube: Search container not found, retrying...');
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
    const root = ReactDOM.createRoot(container);
    root.render(<HeaderAISort />);
    
    console.log('FolderTube: Header UI injected successfully');
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
      console.log('FolderTube: Re-injecting header after navigation');
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
    console.log('FolderTube: Header MutationObserver attached');
  } else {
    // Retry attaching observer
    setTimeout(setupHeaderMutationObserver, 1000);
  }
}

// Listen for refresh events from HeaderFolderManager
window.addEventListener('foldertube:refresh', () => {
  addDragToYouTubeSubscriptions();
});

// Start injection when DOM is ready
console.log('FolderTube: Document readyState:', document.readyState);

if (document.readyState === 'loading') {
  console.log('FolderTube: Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('FolderTube: DOMContentLoaded fired');
    attemptHeaderInjection();
    setupHeaderMutationObserver();
  });
} else {
  console.log('FolderTube: Document already loaded, injecting header immediately');
  attemptHeaderInjection();
  setupHeaderMutationObserver();
}