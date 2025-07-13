import ReactDOM from 'react-dom/client';
import './content.css';
import FolderManager from './components/FolderManager';

const CONTAINER_ID = 'foldertube-root';

function injectFolderUI() {
  // Wait for the guide (sidebar) to be available
  const guide = document.querySelector('ytd-guide-renderer');
  if (!guide) {
    console.log('FolderTube: Guide not found, retrying...');
    return false;
  }

  // Check if already injected
  if (document.getElementById(CONTAINER_ID)) {
    return true;
  }

  // Find the primary guide section (contains Home, Shorts, Subscriptions)
  const primarySection = guide.querySelector('ytd-guide-section-renderer:first-of-type');
  if (!primarySection) {
    console.log('FolderTube: Primary section not found, retrying...');
    return false;
  }

  // Create container and inject after the primary section
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.className = 'foldertube-container';
  container.style.margin = '12px';
  container.style.borderRadius = '8px';
  container.style.overflow = 'hidden';
  container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  container.style.background = 'white';
  container.style.border = '1px solid #e0e0e0';
  
  // Insert after primary section
  if (primarySection.parentNode) {
    primarySection.parentNode.insertBefore(container, primarySection.nextSibling);
    
    // Mount React app
    try {
      const root = ReactDOM.createRoot(container);
      root.render(
        <div>
          <div style={{ 
            padding: '12px 24px 8px 24px', 
            fontSize: '16px', 
            fontWeight: '600',
            margin: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '8px 8px 0 0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <span style={{ marginRight: '8px', fontSize: '18px' }}>📁</span>
            FolderTube
            <span style={{ 
              marginLeft: 'auto', 
              fontSize: '12px', 
              opacity: 0.8,
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 6px',
              borderRadius: '10px'
            }}>
              Beta
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
  
  return false;
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

// Start injection when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    attemptInjection();
    setupMutationObserver();
  });
} else {
  attemptInjection();
  setupMutationObserver();
}