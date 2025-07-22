import ReactDOM from 'react-dom/client';
import './content.css';
import SidebarFolderSection from './components/SidebarFolderSection';

console.log('FolderTube: Sidebar content script loaded');

const CONTAINER_ID = 'foldertube-sidebar-container';

function injectSidebarUI() {
  console.log('FolderTube: Attempting to inject sidebar UI...');
  
  // Find the guide (sidebar) section
  const guide = document.querySelector('#guide-inner-content');
  if (!guide) {
    console.log('FolderTube: Guide not found, retrying...');
    return false;
  }

  // Check if already injected
  if (document.getElementById(CONTAINER_ID)) {
    console.log('FolderTube: Sidebar UI already injected');
    return true;
  }

  // Find the subscriptions section
  const subscriptionsSection = guide.querySelector('#sections > ytd-guide-section-renderer:nth-child(2)');
  
  if (!subscriptionsSection) {
    console.log('FolderTube: Subscriptions section not found, retrying...');
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
    
    console.log('FolderTube: Sidebar UI injected successfully');
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
      console.log('FolderTube: Re-injecting sidebar after navigation');
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
    console.log('FolderTube: Sidebar MutationObserver attached');
  } else {
    // Retry attaching observer
    setTimeout(setupSidebarMutationObserver, 1000);
  }
}

// Start injection when DOM is ready
console.log('FolderTube: Document readyState:', document.readyState);

if (document.readyState === 'loading') {
  console.log('FolderTube: Waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('FolderTube: DOMContentLoaded fired');
    attemptSidebarInjection();
    setupSidebarMutationObserver();
  });
} else {
  console.log('FolderTube: Document already loaded, injecting sidebar immediately');
  attemptSidebarInjection();
  setupSidebarMutationObserver();
}