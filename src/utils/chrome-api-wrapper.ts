/**
 * Chrome API wrapper that handles extension context invalidation gracefully
 */

interface ChromeAPIError extends Error {
  isConnectionError?: boolean;
  isContextInvalidated?: boolean;
}

class ExtensionContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtensionContextError';
  }
}

// Notification functionality has been disabled

function isExtensionError(error: any): error is ChromeAPIError {
  if (!error) return false;
  const message = error.message || error.toString();
  return message.includes('Extension context invalidated') || 
         message.includes('Could not establish connection') ||
         message.includes('Receiving end does not exist') ||
         message.includes('Chrome identity API not available') ||
         message.includes('The message port closed before a response was received') ||
         error.name === 'ExtensionContextError';
}

function handleChromeError(error: any, operation: string): never {
  // Better error logging for object errors
  if (error && typeof error === 'object') {
    // Only log non-extension errors in detail
    if (!isExtensionError(error)) {
      const errorDetails = {
        message: error.message || 'Unknown error',
        name: error.name || 'Error',
        stack: error.stack || 'No stack trace'
      };
      console.warn(`FolderTube: Chrome API error in ${operation}:`, error.message || error.toString() || 'Unknown error');
      console.warn('Error details:', errorDetails);
    }
  } else {
    console.warn(`FolderTube: Chrome API error in ${operation}:`, error);
  }
  
  if (isExtensionError(error)) {
    // Silently handle extension context errors without logging
    throw new ExtensionContextError(`Extension context invalidated`);
  }
  
  throw error;
}

// Storage API wrappers
export const chromeStorage = {
  local: {
    async get(keys?: string | string[] | null): Promise<any> {
      try {
        if (!chrome?.storage?.local) {
          throw new ExtensionContextError('Chrome storage API not available');
        }
        return await chrome.storage.local.get(keys);
      } catch (error) {
        return handleChromeError(error, 'storage.local.get');
      }
    },

    async set(items: { [key: string]: any }): Promise<void> {
      try {
        if (!chrome?.storage?.local) {
          throw new ExtensionContextError('Chrome storage API not available');
        }
        await chrome.storage.local.set(items);
      } catch (error) {
        handleChromeError(error, 'storage.local.set');
      }
    },

    async remove(keys: string | string[]): Promise<void> {
      try {
        if (!chrome?.storage?.local) {
          throw new ExtensionContextError('Chrome storage API not available');
        }
        await chrome.storage.local.remove(keys);
      } catch (error) {
        handleChromeError(error, 'storage.local.remove');
      }
    },

    async getBytesInUse(keys?: string | string[] | null): Promise<number> {
      try {
        if (!chrome?.storage?.local) {
          throw new ExtensionContextError('Chrome storage API not available');
        }
        return await chrome.storage.local.getBytesInUse(keys);
      } catch (error) {
        return handleChromeError(error, 'storage.local.getBytesInUse');
      }
    }
  },

  sync: {
    async get(keys?: string | string[] | null): Promise<any> {
      try {
        if (!chrome?.storage?.sync) {
          throw new ExtensionContextError('Chrome storage API not available');
        }
        return await chrome.storage.sync.get(keys);
      } catch (error) {
        return handleChromeError(error, 'storage.sync.get');
      }
    },

    async set(items: { [key: string]: any }): Promise<void> {
      try {
        if (!chrome?.storage?.sync) {
          throw new ExtensionContextError('Chrome storage API not available');
        }
        await chrome.storage.sync.set(items);
      } catch (error) {
        handleChromeError(error, 'storage.sync.set');
      }
    },

    async remove(keys: string | string[]): Promise<void> {
      try {
        if (!chrome?.storage?.sync) {
          throw new ExtensionContextError('Chrome storage API not available');
        }
        await chrome.storage.sync.remove(keys);
      } catch (error) {
        handleChromeError(error, 'storage.sync.remove');
      }
    },

    async getBytesInUse(keys?: string | string[] | null): Promise<number> {
      try {
        if (!chrome?.storage?.sync) {
          throw new ExtensionContextError('Chrome storage API not available');
        }
        return await chrome.storage.sync.getBytesInUse(keys);
      } catch (error) {
        return handleChromeError(error, 'storage.sync.getBytesInUse');
      }
    },

    onChanged: {
      addListener(callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void): void {
        if (chrome?.storage?.sync?.onChanged) {
          chrome.storage.sync.onChanged.addListener(callback);
        }
      },
      removeListener(callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void): void {
        if (chrome?.storage?.sync?.onChanged) {
          chrome.storage.sync.onChanged.removeListener(callback);
        }
      }
    },

    QUOTA_BYTES: chrome?.storage?.sync?.QUOTA_BYTES || 102400
  }
};

// Runtime API wrappers
export const chromeRuntime = {
  async sendMessage(message: any): Promise<any> {
    try {
      if (!chrome?.runtime?.sendMessage) {
        throw new ExtensionContextError('Chrome runtime API not available');
      }
      
      return await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      return handleChromeError(error, 'runtime.sendMessage');
    }
  },

  onMessage: {
    addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void): void {
      if (chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener(callback);
      }
    },
    removeListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void): void {
      if (chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(callback);
      }
    }
  }
};

// Identity API wrappers
export const chromeIdentity = {
  async getAuthToken(options?: { interactive?: boolean }): Promise<string> {
    try {
      if (!chrome?.identity?.getAuthToken) {
        throw new ExtensionContextError('Chrome identity API not available');
      }
      
      return await new Promise((resolve, reject) => {
        try {
          chrome.identity.getAuthToken(options || {}, (token) => {
            if (chrome.runtime.lastError) {
              const error = chrome.runtime.lastError;
              if (isExtensionError(error)) {
                reject(new ExtensionContextError('Extension context invalidated during auth'));
              } else {
                reject(new Error(error.message || 'Auth token request failed'));
              }
            } else if (token) {
              resolve(token as string);
            } else {
              reject(new Error('No token received from Chrome Identity API'));
            }
          });
        } catch (syncError) {
          if (isExtensionError(syncError)) {
            reject(new ExtensionContextError('Extension context invalidated'));
          } else {
            reject(syncError);
          }
        }
      });
    } catch (error) {
      return handleChromeError(error, 'identity.getAuthToken');
    }
  },

  removeCachedAuthToken(options: { token: string }, callback?: () => void): void {
    if (chrome?.identity?.removeCachedAuthToken) {
      if (callback) {
        chrome.identity.removeCachedAuthToken(options, callback);
      } else {
        chrome.identity.removeCachedAuthToken(options);
      }
    }
  }
};

// Check if extension context is valid
export function isExtensionContextValid(): boolean {
  return !!(chrome && chrome.storage && chrome.runtime);
}

// Export error types
export { ExtensionContextError };

// Utility functions to control reload notifications
// Notification control functions disabled
export function setSuppressReloadNotification(_suppress: boolean): void {
  // No-op - notifications are disabled
}

export function resetReloadNotificationState(): void {
  // No-op - notifications are disabled
}