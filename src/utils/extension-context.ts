/**
 * Utility functions for handling Chrome extension context invalidation
 */

export function isExtensionContextValid(): boolean {
  try {
    return !!(chrome && chrome.storage && chrome.runtime);
  } catch (error) {
    return false;
  }
}

export function showExtensionReloadNotification(message: string = 'Extension was updated. Please refresh the page to continue.'): void {
  // Remove any existing notifications first
  const existingNotifications = document.querySelectorAll('[data-foldertube-notification="context-invalid"]');
  existingNotifications.forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.setAttribute('data-foldertube-notification', 'context-invalid');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff9800;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
    cursor: pointer;
    transition: opacity 0.3s ease;
  `;
  
  notification.onclick = () => window.location.reload();
  document.body.appendChild(notification);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }
  }, 10000);
}

export async function safeStorageGet(keys: string | string[]): Promise<any> {
  if (!isExtensionContextValid()) {
    throw new Error('Extension context invalidated');
  }
  
  try {
    return await chrome.storage.local.get(keys);
  } catch (error) {
    if ((error as Error).message?.includes('Extension context invalidated')) {
      showExtensionReloadNotification();
    }
    throw error;
  }
}

export async function safeStorageSet(items: { [key: string]: any }): Promise<void> {
  if (!isExtensionContextValid()) {
    throw new Error('Extension context invalidated');
  }
  
  try {
    await chrome.storage.local.set(items);
  } catch (error) {
    if ((error as Error).message?.includes('Extension context invalidated')) {
      showExtensionReloadNotification();
    }
    throw error;
  }
}

export function safeSendMessage(message: any): Promise<any> {
  if (!isExtensionContextValid()) {
    throw new Error('Extension context invalidated');
  }
  
  try {
    return chrome.runtime.sendMessage(message);
  } catch (error) {
    if ((error as Error).message?.includes('Extension context invalidated')) {
      showExtensionReloadNotification();
    }
    throw error;
  }
}