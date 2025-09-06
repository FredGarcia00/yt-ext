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

export function showExtensionReloadNotification(): void {
  // Notification disabled - return early without showing anything
  return;
}

export async function safeStorageGet(keys: string | string[]): Promise<any> {
  if (!isExtensionContextValid()) {
    throw new Error('Extension context invalidated');
  }
  
  try {
    return await chrome.storage.local.get(keys);
  } catch (error) {
    // Notification disabled - just throw the error
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
    // Notification disabled - just throw the error
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
    // Notification disabled - just throw the error
    throw error;
  }
}