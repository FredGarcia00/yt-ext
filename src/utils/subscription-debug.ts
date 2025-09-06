/**
 * Subscription Debug Tool
 * Quick debugging utilities for subscription issues
 */

export class SubscriptionDebug {
  static async debugCurrentState(): Promise<void> {
    // Silent debugging - no console logs
    const allData = await chrome.storage.local.get();
    
    const debugInfo = {
      hasSubscriptionData: !!(allData.subscriptionEmail || allData.subscription),
      authCount: Object.keys(allData).filter(key => key.includes('auth')).length,
      folderCount: Object.keys(allData).filter(key => key.includes('folder')).length,
      totalKeys: Object.keys(allData).length
    };
    
    // Store debug info silently
    await chrome.storage.local.set({ debugInfo });
  }
  
  static async clearAllData(): Promise<void> {
    await chrome.storage.local.clear();
  }
  
  static async getStorageSummary(): Promise<any> {
    const allData = await chrome.storage.local.get();
    return {
      totalKeys: Object.keys(allData).length,
      keysByType: {
        auth: Object.keys(allData).filter(k => k.includes('auth')),
        folders: Object.keys(allData).filter(k => k.includes('folder')),
        subscription: Object.keys(allData).filter(k => k.includes('subscription'))
      }
    };
  }
}