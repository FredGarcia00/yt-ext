import ReactDOM from 'react-dom/client';
import './content.css';
import FolderManager from './components/FolderManager';

const CONTAINER_ID = 'foldertube-root';

function injectFolderUI() {
  // First, make sure the sidebar is expanded
  const sidebarContent = document.querySelector('#sections');
  if (!sidebarContent) {
    console.log('FolderTube: Sidebar not found, retrying...');
    return false;
  }
  
  // Find all guide sections and look for the subscriptions one
  const guideSections = document.querySelectorAll('ytd-guide-section-renderer');
  let subscriptionSection = null;
  
  console.log(`FolderTube: Found ${guideSections.length} guide sections`);
  
  for (const section of guideSections) {
    // Try multiple selectors for the title
    const titleText = section.querySelector('#guide-section-title-text, h3#guide-section-title, .title');
    const sectionContent = section.textContent || '';
    
    console.log(`FolderTube: Checking section with text: "${sectionContent.substring(0, 50)}..."`);
    
    if ((titleText && titleText.textContent?.includes('Subscriptions')) || 
        sectionContent.includes('Subscriptions')) {
      subscriptionSection = section;
      console.log('FolderTube: Found subscriptions section!');
      break;
    }
  }
  
  if (!subscriptionSection) {
    console.log('FolderTube: Subscriptions section not found, retrying...');
    return false;
  }

  // Check if already injected
  if (document.getElementById(CONTAINER_ID)) {
    return true;
  }

  // Create container
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.className = 'foldertube-container';
  
  // Insert after the subscriptions header
  const insertPoint = subscriptionSection.querySelector('#guide-section-title');
  if (insertPoint && insertPoint.parentNode) {
    insertPoint.parentNode.insertBefore(container, insertPoint.nextSibling);
    
    // Mount React app
    try {
      const root = ReactDOM.createRoot(container);
      root.render(<FolderManager />);
      
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
    // Check if the subscription section appears or if our container was removed
    const containerExists = document.getElementById(CONTAINER_ID);
    
    // Find subscriptions section
    const guideSections = document.querySelectorAll('ytd-guide-section-renderer');
    let subscriptionSection = null;
    
    for (const section of guideSections) {
      const titleText = section.querySelector('#guide-section-title-text, h3#guide-section-title, .title');
      const sectionContent = section.textContent || '';
      
      if ((titleText && titleText.textContent?.includes('Subscriptions')) || 
          sectionContent.includes('Subscriptions')) {
        subscriptionSection = section;
        break;
      }
    }
    
    if (subscriptionSection && !containerExists) {
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