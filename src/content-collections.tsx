import ReactDOM from 'react-dom/client';
import CollectionsView from './components/CollectionsView';

let root: ReactDOM.Root | null = null;
let collectionsContainer: HTMLDivElement | null = null;

export function showCollectionsView() {
  console.log('FolderTube: Showing collections view');
  
  // Hide YouTube's main content
  const ytMainContent = document.querySelector('ytd-browse, ytd-watch-flexy, ytd-search');
  if (ytMainContent) {
    (ytMainContent as HTMLElement).style.display = 'none';
  }

  // Create container for collections view
  if (!collectionsContainer) {
    collectionsContainer = document.createElement('div');
    collectionsContainer.id = 'yt-collections-container';
    
    // Ensure the container is visible
    collectionsContainer.style.display = 'block';
    collectionsContainer.style.position = 'relative';
    collectionsContainer.style.width = '100%';
    collectionsContainer.style.minHeight = '100vh';
    collectionsContainer.style.backgroundColor = '#f9f9f9';
    collectionsContainer.style.paddingTop = '80px';
    collectionsContainer.style.boxSizing = 'border-box';
    
    const pageManager = document.querySelector('ytd-page-manager');
    if (pageManager && pageManager.parentNode) {
      pageManager.parentNode.insertBefore(collectionsContainer, pageManager);
    } else {
      // Fallback: insert after the masthead
      const masthead = document.querySelector('ytd-masthead');
      if (masthead && masthead.parentNode) {
        masthead.parentNode.insertBefore(collectionsContainer, masthead.nextSibling);
      } else {
        document.body.appendChild(collectionsContainer);
      }
    }
  }

  // Ensure container is visible
  collectionsContainer.style.display = 'block';

  // Render the collections view
  if (!root) {
    root = ReactDOM.createRoot(collectionsContainer);
  }

  root.render(
    <CollectionsView onClose={hideCollectionsView} />
  );

  // Add active class to body for styling
  document.body.classList.add('yt-collections-active');
  
  console.log('FolderTube: Collections view rendered');
}

export function hideCollectionsView() {
  // Show YouTube's main content
  const ytMainContent = document.querySelector('ytd-browse, ytd-watch-flexy, ytd-search');
  if (ytMainContent) {
    (ytMainContent as HTMLElement).style.display = '';
  }

  // Remove collections container
  if (root) {
    root.unmount();
    root = null;
  }

  if (collectionsContainer && collectionsContainer.parentNode) {
    collectionsContainer.parentNode.removeChild(collectionsContainer);
    collectionsContainer = null;
  }

  // Remove active class from body
  document.body.classList.remove('yt-collections-active');
}

export function isCollectionsViewActive() {
  return document.body.classList.contains('yt-collections-active');
}