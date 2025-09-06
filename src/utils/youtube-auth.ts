import { chromeStorage, chromeIdentity } from './chrome-api-wrapper';

export class YouTubeAuth {
  private static TOKEN_KEY = 'youtube_access_token';
  private static TOKEN_EXPIRY_KEY = 'youtube_token_expiry';

  static async authenticate(): Promise<string> {
    try {
      const token = await chromeIdentity.getAuthToken({ interactive: true });
      if (token) {
        await this.saveToken(token);
        return token;
      } else {
        throw new Error('Failed to obtain auth token');
      }
    } catch (error) {
      throw error;
    }
  }

  static async getToken(): Promise<string | null> {
    const stored = await chromeStorage.local.get([this.TOKEN_KEY, this.TOKEN_EXPIRY_KEY]);
    
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
      // Only log if it's not an expected extension context error
      if (error instanceof Error && 
          !error.message.includes('Chrome identity API not available') &&
          !error.message.includes('Extension context invalidated') &&
          !error.message.includes('Extension updated')) {
        console.warn('Failed to refresh token:', error.message || error);
      }
      // Clear invalid tokens
      await chromeStorage.local.remove([this.TOKEN_KEY, this.TOKEN_EXPIRY_KEY]);
      return null;
    }
  }

  private static async saveToken(token: string): Promise<void> {
    const expiryTime = Date.now() + (3600 * 1000);
    await chromeStorage.local.set({
      [this.TOKEN_KEY]: token,
      [this.TOKEN_EXPIRY_KEY]: expiryTime
    });
  }

  static async revokeToken(): Promise<void> {
    const token = await this.getToken();
    if (token) {
      chromeIdentity.removeCachedAuthToken({ token: token as string }, () => {
        chromeStorage.local.remove([this.TOKEN_KEY, this.TOKEN_EXPIRY_KEY]).catch(() => {});
      });
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }
}