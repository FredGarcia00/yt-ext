import ReactDOM from 'react-dom/client';
import './content.css';
import FolderManager from './components/FolderManager';

console.log('FolderTube: Content script loaded');

const CONTAINER_ID = 'foldertube-root';



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

function injectFolderUI() {
  console.log('FolderTube: Attempting to inject UI...');
  
  // Wait for the guide (sidebar) to be available
  const guide = document.querySelector('ytd-guide-renderer');
  if (!guide) {
    console.log('FolderTube: Guide not found, retrying...');
    return false;
  }

  // Check if already injected
  if (document.getElementById(CONTAINER_ID)) {
    console.log('FolderTube: Already injected');
    return true;
  }
  
  // Add drag functionality to YouTube's native subscriptions
  addDragToYouTubeSubscriptions();

  // Find the subscriptions section specifically
  let subscriptionsSection = null;
  let insertionPoint = null;
  
  console.log('FolderTube: Searching for subscriptions section...');
  
  // Look for all sections and find the one that actually contains subscriptions
  const sections = guide.querySelectorAll('ytd-guide-section-renderer');
  for (const section of sections) {
    const titleElements = section.querySelectorAll('yt-formatted-string, #guide-section-title');
    let hasSubscriptionsTitle = false;
    
    // Check if this section has "Subscriptions" in its title
    for (const titleEl of titleElements) {
      if (titleEl.textContent?.trim() === 'Subscriptions') {
        hasSubscriptionsTitle = true;
        break;
      }
    }
    
    // If this section has "Subscriptions" title, set insertion point before the section
    if (hasSubscriptionsTitle) {
      subscriptionsSection = section;
      insertionPoint = section;
      console.log('FolderTube: Found subscriptions section, will inject before it');
      break;
    }
  }
  
  // Fallback: Look for the section that contains the most channel links
  if (!subscriptionsSection) {
    let maxChannelLinks = 0;
    for (const section of sections) {
      const channelLinks = section.querySelectorAll('a[href*="/@"], a[href*="/channel/"]');
      if (channelLinks.length > maxChannelLinks && channelLinks.length >= 3) {
        maxChannelLinks = channelLinks.length;
        subscriptionsSection = section;
        insertionPoint = section;
        console.log('FolderTube: Found subscriptions section by channel count');
      }
    }
  }
  
  if (!subscriptionsSection || !insertionPoint) {
    console.log('FolderTube: Subscriptions section not found, retrying...');
    return false;
  }

  // Create container and inject before the subscriptions section
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.className = 'foldertube-container';
  container.style.margin = '0';
  container.style.marginBottom = '8px';
  container.style.borderRadius = '0';
  container.style.overflow = 'hidden';
  container.style.background = 'transparent';
  container.style.border = 'none';
  container.style.boxShadow = 'none';
  
  
  // Insert before the subscriptions section
  let injectionSuccessful = false;
  
  if (insertionPoint && insertionPoint.parentNode) {
    insertionPoint.parentNode.insertBefore(container, insertionPoint);
    injectionSuccessful = true;
    console.log('FolderTube: Injected above subscriptions section');
  }
  
  if (!injectionSuccessful) {
    console.error('FolderTube: Could not inject above subscriptions section');
    return false;
  }
  
  // Mount React app
  try {
    const root = ReactDOM.createRoot(container);
    root.render(
      <div style={{ 
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
        paddingBottom: '8px',
        marginBottom: '8px'
      }}>
        <div style={{ 
          padding: '10px 24px 6px 24px', 
          fontSize: '14px', 
          fontWeight: '500',
          margin: 0,
          color: '#606060',
          display: 'flex',
          alignItems: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.007px',
          position: 'relative'
        }}>
          <span style={{ marginRight: '8px', fontSize: '16px' }}>📁</span>
          FolderTube
          <span style={{ 
            marginLeft: 'auto', 
            fontSize: '11px', 
            opacity: 0.7,
            background: 'rgba(0,0,0,0.05)',
            padding: '2px 6px',
            borderRadius: '2px',
            textTransform: 'lowercase'
          }}>
            beta
          </span>
        </div>
        <FolderManager />
      </div>
    );
    
    console.log('FolderTube: UI injected successfully');
    
    return true;
  } catch (error) {
    console.error('FolderTube: Failed to mount React app:', error);
    container.remove();
    return false;
  }
}

// Initial injection attempt
function attemptInjection() {
  if (!injectFolderUI()) {
    // Retry with exponential backoff
    let retries = 0;
    const maxRetries = 10;
    
    const retry = () => {
      if (retries >= maxRetries) {
        console.error('FolderTube: Failed to inject after maximum retries');
        return;
      }
      
      retries++;
      setTimeout(() => {
        if (!injectFolderUI()) {
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
function setupMutationObserver() {
  const observer = new MutationObserver(() => {
    // Check if our container was removed
    const containerExists = document.getElementById(CONTAINER_ID);
    const guide = document.querySelector('ytd-guide-renderer');
    
    if (guide && !containerExists) {
      console.log('FolderTube: Re-injecting after navigation');
      attemptInjection();
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
    console.log('FolderTube: MutationObserver attached');
  } else {
    // Retry attaching observer
    setTimeout(setupMutationObserver, 1000);
  }
}

// Listen for refresh events from FolderManager
window.addEventListener('foldertube:refresh', () => {
  addDragToYouTubeSubscriptions();
});

// Start injection when DOM is ready
console.log('FolderTube: Document readyState:', document.readyState);

if (document.readyState === 'loading') {
  console.log('FolderTube: Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('FolderTube: DOMContentLoaded fired');
    attemptInjection();
    setupMutationObserver();
  });
} else {
  console.log('FolderTube: Document already loaded, injecting immediately');
  attemptInjection();
  setupMutationObserver();
}