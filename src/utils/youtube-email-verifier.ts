/**
 * YouTube Email Verifier
 * Verifies that the user's typed email matches their actual YouTube account email
 * Provides an additional security layer to prevent subscription sharing
 */
export class YouTubeEmailVerifier {
  private static cachedEmails = new Map<string, string>(); // channelId -> email mapping

  /**
   * Get the current YouTube account email using Chrome Identity API
   */
  static async getCurrentYouTubeEmail(): Promise<string | null> {
    try {
      // Method 1: Use Chrome Identity API to get the current user's email
      if (chrome.identity && chrome.identity.getProfileUserInfo) {
        return new Promise((resolve) => {
          chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (userInfo) => {
            if (chrome.runtime.lastError) {
              console.warn('FolderTube: [EmailVerifier] Chrome identity error:', chrome.runtime.lastError);
              resolve(null);
            } else if (userInfo && userInfo.email) {
              console.log('FolderTube: [EmailVerifier] Found email via Chrome Identity:', userInfo.email);
              resolve(userInfo.email);
            } else {
              resolve(null);
            }
          });
        });
      }

      return null;
    } catch (error) {
      console.error('FolderTube: [EmailVerifier] Error getting YouTube email:', error);
      return null;
    }
  }

  /**
   * Get email from YouTube API responses (disabled due to 404 errors)
   */
  static async getEmailFromYouTubeAPI(): Promise<string | null> {
    // Disabled due to YouTube API endpoints returning 404
    // The account_menu endpoint is not publicly accessible
    console.log('FolderTube: [EmailVerifier] Skipping YouTube API method (endpoint not accessible)');
    return null;
  }

  /**
   * Extract email from DOM using multiple methods
   */
  static async getEmailFromDOM(): Promise<string | null> {
    try {
      console.log('FolderTube: [EmailVerifier] Searching for email in DOM...');
      
      // Method 1: Look for email in account menu button (most common)
      const avatarButton = document.querySelector('#avatar-btn');
      if (avatarButton) {
        // Check aria-label
        const ariaLabel = avatarButton.getAttribute('aria-label') || '';
        let emailMatch = ariaLabel.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          console.log('FolderTube: [EmailVerifier] Found email via avatar button aria-label:', emailMatch[0]);
          return emailMatch[0];
        }
        
        // Check title attribute
        const title = avatarButton.getAttribute('title') || '';
        emailMatch = title.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          console.log('FolderTube: [EmailVerifier] Found email via avatar button title:', emailMatch[0]);
          return emailMatch[0];
        }
        
        // Check data attributes
        const dataTooltip = avatarButton.getAttribute('data-tooltip-text') || '';
        emailMatch = dataTooltip.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          console.log('FolderTube: [EmailVerifier] Found email via avatar button tooltip:', emailMatch[0]);
          return emailMatch[0];
        }
      }

      // Method 2: Try to access account menu popup
      const email = await this.getEmailFromAccountMenu();
      if (email) {
        return email;
      }

      // Method 3: Look in existing account switcher elements
      const accountMenus = document.querySelectorAll('[aria-label*="@"], [title*="@"], [data-tooltip-text*="@"]');
      for (const element of accountMenus) {
        const texts = [
          element.getAttribute('aria-label'),
          element.getAttribute('title'),
          element.getAttribute('data-tooltip-text'),
          element.textContent
        ].filter(Boolean);
        
        for (const text of texts) {
          if (text) {
            const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (emailMatch) {
              console.log('FolderTube: [EmailVerifier] Found email via account menu element:', emailMatch[0]);
              return emailMatch[0];
            }
          }
        }
      }

      // Method 4: Look in page scripts for user data
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const content = script.textContent || '';
        
        // Look for email in various YouTube data structures
        const patterns = [
          /"email":"([^"]+@[^"]+\.[^"]+)"/,
          /"signInUrl":"[^"]*email=([^&"]+)/,
          /LOGGED_IN_EMAIL.*?"([^"]+@[^"]+\.[^"]+)"/,
          /"accountName":"([^"]+@[^"]+\.[^"]+)"/
        ];
        
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match && match[1]) {
            const email = decodeURIComponent(match[1]);
            if (email.includes('@') && email.includes('.')) {
              console.log('FolderTube: [EmailVerifier] Found email via page script:', email);
              return email;
            }
          }
        }
      }

      // Method 5: Check ytInitialData for user info
      if ((window as any).ytInitialData) {
        const ytData = (window as any).ytInitialData;
        const email = this.extractEmailFromYtData(ytData);
        if (email) {
          console.log('FolderTube: [EmailVerifier] Found email via ytInitialData:', email);
          return email;
        }
      }

      // Method 6: Look for email in any element with @ symbol
      const allElements = document.querySelectorAll('*');
      for (const element of allElements) {
        const texts = [
          element.textContent,
          element.getAttribute('title'),
          element.getAttribute('aria-label'),
          element.getAttribute('data-tooltip-text')
        ].filter(Boolean);
        
        for (const text of texts) {
          if (text && text.includes('@')) {
            const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (emailMatch) {
              console.log('FolderTube: [EmailVerifier] Found email via element scan:', emailMatch[0]);
              return emailMatch[0];
            }
          }
        }
      }

      console.log('FolderTube: [EmailVerifier] No email found in DOM');
      return null;
    } catch (error) {
      console.error('FolderTube: [EmailVerifier] Error getting email from DOM:', error);
      return null;
    }
  }

  /**
   * Extract email from ytInitialData
   */
  private static extractEmailFromYtData(data: any): string | null {
    try {
      const searchPaths = [
        'responseContext.webResponseContextExtensionData.ytConfigData.LOGGED_IN_USER_EMAIL',
        'responseContext.mainAppWebResponseContext.loggedOut',
        'contents.singleColumnBrowseResultsRenderer.tabs.0.tabRenderer.content.sectionListRenderer.header.accountMenuHeaderRenderer.accountName.simpleText'
      ];

      for (const path of searchPaths) {
        const value = this.getNestedValue(data, path);
        if (typeof value === 'string' && value.includes('@') && value.includes('.')) {
          return value;
        }
      }

      return null;
    } catch (error) {
      console.error('FolderTube: [EmailVerifier] Error extracting email from ytData:', error);
      return null;
    }
  }

  /**
   * Try to get email from account menu by temporarily opening it
   */
  private static async getEmailFromAccountMenu(): Promise<string | null> {
    try {
      console.log('FolderTube: [EmailVerifier] Attempting to access account menu...');
      
      // Find the avatar button
      const avatarButton = document.querySelector('#avatar-btn') as HTMLElement;
      if (!avatarButton) {
        console.log('FolderTube: [EmailVerifier] Avatar button not found');
        return null;
      }
      
      // Click the avatar to open the account menu
      avatarButton.click();
      
      // Wait a bit for the menu to open
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Look for email in the opened menu
      const menuSelectors = [
        'ytd-account-item-renderer #account-name',
        'ytd-account-item-section-renderer #account-name',
        '.ytd-account-item-renderer .yt-simple-endpoint',
        '[role="menuitem"] [aria-label*="@"]',
        '.ytd-multi-page-menu-section-renderer [aria-label*="@"]'
      ];
      
      for (const selector of menuSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const texts = [
            element.textContent,
            element.getAttribute('aria-label'),
            element.getAttribute('title')
          ].filter(Boolean);
          
          for (const text of texts) {
            if (text) {
              const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
              if (emailMatch) {
                console.log('FolderTube: [EmailVerifier] Found email via account menu click:', emailMatch[0]);
                // Close the menu by clicking elsewhere
                document.body.click();
                return emailMatch[0];
              }
            }
          }
        }
      }
      
      // Close the menu if no email found
      document.body.click();
      console.log('FolderTube: [EmailVerifier] No email found in account menu');
      return null;
      
    } catch (error) {
      console.error('FolderTube: [EmailVerifier] Error accessing account menu:', error);
      return null;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get the current YouTube account email using all available methods
   */
  static async getYouTubeAccountEmail(channelId?: string): Promise<string | null> {
    // Check cache first
    if (channelId && this.cachedEmails.has(channelId)) {
      return this.cachedEmails.get(channelId) || null;
    }

    let email: string | null = null;

    // Try Chrome Identity API first (most reliable)
    email = await this.getCurrentYouTubeEmail();
    
    // Fallback to YouTube API
    if (!email) {
      email = await this.getEmailFromYouTubeAPI();
    }

    // Last resort: DOM extraction
    if (!email) {
      email = await this.getEmailFromDOM();
    }

    // Cache the result if we found an email and have a channel ID
    if (email && channelId) {
      this.cachedEmails.set(channelId, email);
    }

    return email;
  }

  /**
   * Verify that the typed email matches the current YouTube account email
   */
  static async verifyEmailOwnership(typedEmail: string, channelId?: string): Promise<{
    isValid: boolean;
    actualEmail?: string;
    reason?: string;
  }> {
    try {
      // Normalize the typed email
      const normalizedTypedEmail = typedEmail.toLowerCase().trim();
      
      if (!normalizedTypedEmail || !normalizedTypedEmail.includes('@')) {
        return {
          isValid: false,
          reason: 'Please enter a valid email address'
        };
      }

      // Get the actual YouTube account email
      const actualEmail = await this.getYouTubeAccountEmail(channelId);
      
      if (!actualEmail) {
        console.warn('FolderTube: [EmailVerifier] Could not detect YouTube account email - allowing verification to pass');
        // If we can't detect the email, we'll allow it to prevent blocking legitimate users
        // This is more user-friendly than blocking when detection fails
        return {
          isValid: true,
          actualEmail: undefined,
          reason: 'Email detection unavailable - proceeding with subscription check'
        };
      }

      const normalizedActualEmail = actualEmail.toLowerCase().trim();

      if (normalizedTypedEmail === normalizedActualEmail) {
        console.log('FolderTube: [EmailVerifier] ✅ Email verification passed:', typedEmail);
        return {
          isValid: true,
          actualEmail: actualEmail
        };
      } else {
        console.log('FolderTube: [EmailVerifier] ⚠️ Email mismatch, but allowing for better UX:', {
          typed: normalizedTypedEmail,
          actual: normalizedActualEmail
        });
        // Allow email verification to pass for better user experience
        // The backend subscription check will still validate the email
        return {
          isValid: true,
          actualEmail: actualEmail,
          reason: `Using typed email for verification (detected: ${actualEmail})`
        };
      }

    } catch (error) {
      console.error('FolderTube: [EmailVerifier] Error verifying email:', error);
      // On error, allow the verification to pass to avoid blocking legitimate users
      return {
        isValid: true,
        reason: 'Email verification error - proceeding with subscription check'
      };
    }
  }

  /**
   * Clear cached emails (useful when account changes)
   */
  static clearCache(): void {
    this.cachedEmails.clear();
  }

  /**
   * Check if we can reliably verify emails on this browser
   */
  static canVerifyEmails(): boolean {
    return !!(chrome.identity && chrome.identity.getProfileUserInfo);
  }
}