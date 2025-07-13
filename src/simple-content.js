// Simple content script without React
console.log('FolderTube: Content script loaded');

function injectFolderUI() {
  console.log('FolderTube: Attempting to inject UI...');
  
  const guideSections = document.querySelectorAll('ytd-guide-section-renderer');
  let subscriptionSection = null;
  
  for (const section of guideSections) {
    const titleText = section.querySelector('#guide-section-title-text');
    if (titleText && titleText.textContent?.includes('Subscriptions')) {
      subscriptionSection = section;
      break;
    }
  }
  
  if (!subscriptionSection) {
    console.log('FolderTube: Subscriptions section not found');
    return false;
  }
  
  console.log('FolderTube: Found subscriptions section');
  
  // Create a simple div instead of React
  const container = document.createElement('div');
  container.id = 'foldertube-root';
  container.innerHTML = '<div style="padding: 8px;">FolderTube Loaded!</div>';
  
  const insertPoint = subscriptionSection.querySelector('#guide-section-title');
  if (insertPoint && insertPoint.parentNode) {
    insertPoint.parentNode.insertBefore(container, insertPoint.nextSibling);
    console.log('FolderTube: UI injected successfully');
    return true;
  }
  
  return false;
}

// Try to inject when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFolderUI);
} else {
  injectFolderUI();
}