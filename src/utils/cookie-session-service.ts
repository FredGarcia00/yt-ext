/**
 * Cookie-Based Session Service
 * Background-safe authentication using cookies and chrome.storage
 * No DOM dependencies - works in service workers
 */

interface SessionData {
  token: string;
  email: string;
  channelId: string;
  channelName: string;
  expiresAt: number;
  hasSubscription: boolean;
}

interface AuthResult {
  success: boolean;
  session?: SessionData;
  error?: string;
}

export class CookieSessionService {
  private static readonly SESSION_COOKIE_NAME = 'foldertube_session';
  private static readonly SESSION_DOMAIN = '.youtube.com';
  private static readonly SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  /**
   * Initialize the service
   */
  static async initialize(): Promise<void> {
    console.log('CookieSession: Initializing cookie-based session service');
    
    // Clean up expired sessions on startup
    await this.cleanupExpiredSessions();
    
    // Set up periodic cleanup
    chrome.alarms.create('session-cleanup', { periodInMinutes: 60 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'session-cleanup') {
        this.cleanupExpiredSessions();
      }
    });
  }
  
  /**
   * Get current session for the active YouTube account
   */
  static async getCurrentSession(): Promise<SessionData | null> {
    try {
      // Get session cookie
      const cookie = await this.getSessionCookie();
      if (!cookie) {
        console.log('CookieSession: No session cookie found');
        return null;
      }
      
      // Parse session data from cookie value
      try {
        const sessionData = JSON.parse(decodeURIComponent(cookie.value)) as SessionData;
        
        // Check if session is expired
        if (Date.now() >= sessionData.expiresAt) {
          console.log('CookieSession: Session expired');
          await this.clearSession();
          return null;
        }
        
        return sessionData;
      } catch (e) {
        console.error('CookieSession: Invalid session cookie format');
        await this.clearSession();
        return null;
      }
      
    } catch (error) {
      console.error('CookieSession: Error getting current session:', error);
      return null;
    }
  }
  
  /**
   * Create a new session after successful authentication
   */
  static async createSession(authData: {
    token: string;
    email: string;
    channelId: string;
    channelName: string;
    hasSubscription: boolean;
  }): Promise<AuthResult> {
    try {
      const sessionData: SessionData = {
        token: authData.token,
        email: authData.email,
        channelId: authData.channelId,
        channelName: authData.channelName,
        hasSubscription: authData.hasSubscription,
        expiresAt: Date.now() + this.SESSION_DURATION
      };
      
      // Store as cookie
      const cookieValue = encodeURIComponent(JSON.stringify(sessionData));
      
      await new Promise<void>((resolve, reject) => {
        chrome.cookies.set({
          url: 'https://www.youtube.com',
          name: this.SESSION_COOKIE_NAME,
          value: cookieValue,
          domain: this.SESSION_DOMAIN,
          path: '/',
          secure: true,
          httpOnly: false,
          sameSite: 'no_restriction',
          expirationDate: Math.floor(sessionData.expiresAt / 1000)
        }, (cookie) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (cookie) {
            resolve();
          } else {
            reject(new Error('Failed to set session cookie'));
          }
        });
      });
      
      // Also store in chrome.storage for backup
      await chrome.storage.local.set({
        [`session_${sessionData.channelId}`]: sessionData,
        'lastSessionChannel': sessionData.channelId
      });
      
      console.log('CookieSession: Session created successfully');
      return { success: true, session: sessionData };
      
    } catch (error) {
      console.error('CookieSession: Error creating session:', error);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }
  
  /**
   * Check if current session has valid subscription
   */
  static async hasSubscription(): Promise<boolean> {
    const session = await this.getCurrentSession();
    return session?.hasSubscription === true;
  }
  
  /**
   * Clear current session
   */
  static async clearSession(): Promise<void> {
    try {
      // Remove cookie
      await new Promise<void>((resolve) => {
        chrome.cookies.remove({
          url: 'https://www.youtube.com',
          name: this.SESSION_COOKIE_NAME
        }, () => {
          resolve();
        });
      });
      
      // Clear storage backup
      const stored = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(stored).filter(key => 
        key.startsWith('session_') || key === 'lastSessionChannel'
      );
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
      
      console.log('CookieSession: Session cleared');
      
    } catch (error) {
      console.error('CookieSession: Error clearing session:', error);
    }
  }
  
  /**
   * Validate session matches current YouTube account
   */
  static async validateForChannel(channelId: string): Promise<boolean> {
    const session = await this.getCurrentSession();
    if (!session) {
      return false;
    }
    
    return session.channelId === channelId;
  }
  
  /**
   * Get YouTube account identifier from cookies
   */
  static async getYouTubeAccountIdentifier(): Promise<string | null> {
    try {
      // Try to get SAPISID cookie which identifies YouTube account
      const sapisid = await new Promise<chrome.cookies.Cookie | null>((resolve) => {
        chrome.cookies.get({
          url: 'https://www.youtube.com',
          name: 'SAPISID'
        }, (cookie) => {
          resolve(cookie);
        });
      });
      
      if (sapisid?.value) {
        // Create a hash of the cookie value for privacy
        const hash = await this.hashString(sapisid.value);
        return `yt_${hash.substring(0, 16)}`;
      }
      
      // Fallback to HSID
      const hsid = await new Promise<chrome.cookies.Cookie | null>((resolve) => {
        chrome.cookies.get({
          url: 'https://www.youtube.com',
          name: 'HSID'
        }, (cookie) => {
          resolve(cookie);
        });
      });
      
      if (hsid?.value) {
        const hash = await this.hashString(hsid.value);
        return `yt_${hash.substring(0, 16)}`;
      }
      
      return null;
      
    } catch (error) {
      console.error('CookieSession: Error getting YouTube account identifier:', error);
      return null;
    }
  }
  
  /**
   * Check if we need to reauthenticate
   */
  static async needsAuthentication(): Promise<boolean> {
    const session = await this.getCurrentSession();
    
    if (!session) {
      return true;
    }
    
    // Check if session is about to expire (less than 1 day remaining)
    const timeRemaining = session.expiresAt - Date.now();
    if (timeRemaining < 24 * 60 * 60 * 1000) {
      console.log('CookieSession: Session expiring soon, needs refresh');
      return true;
    }
    
    return false;
  }
  
  // Private helper methods
  
  private static async getSessionCookie(): Promise<chrome.cookies.Cookie | null> {
    return new Promise((resolve) => {
      chrome.cookies.get({
        url: 'https://www.youtube.com',
        name: this.SESSION_COOKIE_NAME
      }, (cookie) => {
        resolve(cookie);
      });
    });
  }
  
  private static async cleanupExpiredSessions(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(null);
      const keysToRemove: string[] = [];
      
      for (const [key, value] of Object.entries(stored)) {
        if (key.startsWith('session_') && value) {
          const session = value as SessionData;
          if (Date.now() >= session.expiresAt) {
            keysToRemove.push(key);
          }
        }
      }
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log('CookieSession: Cleaned up', keysToRemove.length, 'expired sessions');
      }
      
    } catch (error) {
      console.error('CookieSession: Error cleaning up sessions:', error);
    }
  }
  
  private static async hashString(str: string): Promise<string> {
    // Simple hash for privacy (not cryptographic)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}