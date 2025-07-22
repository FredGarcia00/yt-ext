export class YouTubeAuth {
  private static TOKEN_KEY = 'youtube_access_token';
  private static TOKEN_EXPIRY_KEY = 'youtube_token_expiry';

  static async authenticate(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if chrome.identity is available
      if (!chrome.identity || !chrome.identity.getAuthToken) {
        reject(new Error('Chrome identity API not available'));
        return;
      }
      
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (token) {
          this.saveToken(token as string);
          resolve(token as string);
        } else {
          reject(new Error('Failed to obtain auth token'));
        }
      });
    });
  }

  static async getToken(): Promise<string | null> {
    const stored = await chrome.storage.local.get([this.TOKEN_KEY, this.TOKEN_EXPIRY_KEY]);
    
    if (stored[this.TOKEN_KEY] && stored[this.TOKEN_EXPIRY_KEY]) {
      const now = Date.now();
      if (now < stored[this.TOKEN_EXPIRY_KEY]) {
        return stored[this.TOKEN_KEY];
      }
    }
    
    try {
      const token = await this.authenticate();
      return token;
    } catch (error) {
      // Only log if it's not the expected Chrome identity unavailable error
      if (error instanceof Error && !error.message.includes('Chrome identity API not available')) {
        console.warn('Failed to refresh token:', error.message);
      }
      // Clear invalid tokens
      await chrome.storage.local.remove([this.TOKEN_KEY, this.TOKEN_EXPIRY_KEY]);
      return null;
    }
  }

  private static async saveToken(token: string): Promise<void> {
    const expiryTime = Date.now() + (3600 * 1000);
    await chrome.storage.local.set({
      [this.TOKEN_KEY]: token,
      [this.TOKEN_EXPIRY_KEY]: expiryTime
    });
  }

  static async revokeToken(): Promise<void> {
    const token = await this.getToken();
    if (token) {
      chrome.identity.removeCachedAuthToken({ token: token as string }, () => {
        chrome.storage.local.remove([this.TOKEN_KEY, this.TOKEN_EXPIRY_KEY]);
      });
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }
}