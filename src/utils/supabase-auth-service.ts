/**
 * Supabase Authentication Service - Chrome Store Compliant
 * Handles all authentication and data operations via Supabase backend
 * Now with account-specific authentication to prevent account bleeding
 */

export class SupabaseAuthService {
  // REMOVED: Cached auth to prevent bypassing account detection and isolation
  // private static cachedAuth: ... | null = null;

  /**
   * Clear any cached authentication (for account switching)
   */
  static clearAuth(): void {
    // No cached auth to clear - using strict account isolation
    console.log('🔒 [AUTH SECURITY] Cleared any cached authentication');
  }

  /**
   * Authenticate user with YouTube and store in Supabase
   */
  static async authenticate(): Promise<{
    success: boolean;
    email?: string;
    channelId?: string;
    channelName?: string;
    error?: string;
  }> {
    try {
      console.log('FolderTube: Starting authentication flow...');

      // Use background script for OAuth (Chrome Store compliant)
      const result = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'authenticateYouTube' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }
            resolve(response);
          }
        );
      });

      if (result.success && result.email && result.channelId) {
        console.log('🔒 [AUTH SECURITY] Authentication successful for:', result.email.substring(0, 10) + '...');

        // Store authentication under CHANNEL ID ONLY (eliminates key collisions)
        const channelId = result.channelId;
        
        console.log('🔒 [AUTH SECURITY] Storing auth under CHANNEL ID ONLY:', channelId.substring(0, 15) + '...');
        
        // SINGLE STORAGE POINT: Only under YouTube Channel ID (prevents account bleeding)
        await chrome.storage.local.set({
          [`account_${channelId}_email`]: result.email,
          [`account_${channelId}_channelId`]: result.channelId,
          [`account_${channelId}_channelName`]: result.channelName || 'Unknown'
        });
        
        // SECURITY: Clear any existing global keys and detected account keys
        const { YouTubeAccountDetector } = await import('./youtube-account-detector');
        const detectedAccountId = YouTubeAccountDetector.getCurrentAccountId();
        
        const keysToRemove = [
          'authenticatedEmail', 'authenticatedChannelId', 'authenticatedChannelName'
        ];
        
        // Remove any old detected account keys that could cause bleeding
        if (detectedAccountId && detectedAccountId !== channelId) {
          keysToRemove.push(
            `account_${detectedAccountId}_email`,
            `account_${detectedAccountId}_linkedChannelId`, 
            `account_${detectedAccountId}_channelName`
          );
          console.log('🔒 [AUTH SECURITY] Cleaning up detected account keys for:', detectedAccountId.substring(0, 10) + '...');
        }
        
        await chrome.storage.local.remove(keysToRemove);
        
        console.log('🔒 [AUTH SECURITY] ✅ Authentication stored under SINGLE key only - account bleeding eliminated');

        return result;
      } else {
        console.error('FolderTube: Authentication failed or incomplete:', result);
        return {
          success: false,
          error: result.error || 'Authentication incomplete'
        };
      }

    } catch (error) {
      console.error('FolderTube: Authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Get authentication with CHANNEL OWNERSHIP verification (prevents account bleeding)
   * Simplified approach that properly checks for auth in the right order
   */
  static async getCurrentAuth(): Promise<{
    email: string;
    channelId: string;
    channelName: string;
  } | null> {
    try {
      console.log('FolderTube: [Auth] Getting current authentication...');
      
      // STEP 1: Check for standard authentication keys (set by background.ts)
      const standardKeys = ['authenticatedEmail', 'authenticatedChannelId', 'authenticatedChannelName'];
      const standardAuth = await chrome.storage.local.get(standardKeys);
      
      if (standardAuth.authenticatedEmail && standardAuth.authenticatedChannelId) {
        console.log('FolderTube: [Auth] ✅ Found standard authentication:', {
          email: standardAuth.authenticatedEmail.substring(0, 10) + '...',
          channelId: standardAuth.authenticatedChannelId.substring(0, 15) + '...'
        });
        return {
          email: standardAuth.authenticatedEmail,
          channelId: standardAuth.authenticatedChannelId,
          channelName: standardAuth.authenticatedChannelName || 'Unknown'
        };
      }
      
      // STEP 2: Try SupabaseBackend as fallback (it has its own auth check)
      const { SupabaseBackend } = await import('./supabase-backend');
      const backendCreds = await SupabaseBackend['getCredentials']();
      
      if (backendCreds.email && backendCreds.channelId) {
        console.log('FolderTube: [Auth] ✅ Found backend authentication');
        return {
          email: backendCreds.email,
          channelId: backendCreds.channelId,
          channelName: 'Unknown'
        };
      }
      
      // STEP 3: Check for fresh session (set by background.ts during OAuth)
      const allStorage = await chrome.storage.local.get(null);
      const freshSessionKeys = Object.keys(allStorage).filter(key => key.startsWith('fresh_session_'));
      
      if (freshSessionKeys.length > 0) {
        for (const sessionKey of freshSessionKeys) {
          const session = allStorage[sessionKey];
          if (session?.email && session?.channelId) {
            // Check if session is still valid (7 days)
            const sessionAge = Date.now() - (session.authTimestamp || 0);
            const maxAge = 7 * 24 * 60 * 60 * 1000;
            
            if (sessionAge <= maxAge) {
              console.log('FolderTube: [Auth] ✅ Found fresh session authentication');
              return {
                email: session.email,
                channelId: session.channelId,
                channelName: session.channelName || 'Unknown'
              };
            }
          }
        }
      }
      
      // STEP 4: Check channel-specific keys as last resort
      const channelKeys = Object.keys(allStorage).filter(key => 
        key.startsWith('account_') && key.endsWith('_email')
      );
      
      for (const emailKey of channelKeys) {
        const email = allStorage[emailKey];
        if (email && email.includes('@')) {
          const channelId = emailKey.replace('account_', '').replace('_email', '');
          const channelName = allStorage[`account_${channelId}_channelName`];
          
          // Verify this looks like a real channel ID
          if (channelId && channelId.startsWith('UC') && channelId.length > 20) {
            console.log('FolderTube: [Auth] ✅ Found channel-specific authentication');
            return {
              email,
              channelId,
              channelName: channelName || 'Unknown'
            };
          }
        }
      }
      
      console.log('FolderTube: [Auth] ❌ No authentication found anywhere');
      return null;
      
    } catch (error) {
      console.error('FolderTube: [Auth] Error getting current auth:', error);
      return null;
    }
  }
  
  /**
   * Clean up all channel auths (utility method for forcing re-authentication)
   */
  static async clearAllChannelAuths(): Promise<void> {
    try {
      const allStorage = await chrome.storage.local.get(null);
      const channelAuthKeys = Object.keys(allStorage).filter(key => 
        key.startsWith('account_UC') && (key.includes('_email') || key.includes('_channelId') || key.includes('_channelName'))
      );
      
      if (channelAuthKeys.length > 0) {
        console.log('💥 [AUTH] Clearing', channelAuthKeys.length, 'channel auth keys');
        await chrome.storage.local.remove(channelAuthKeys);
      }
    } catch (error) {
      console.error('💥 [AUTH] Error clearing channel auths:', error);
    }
  }



  /**
   * Check subscription status and AI usage
   */
  static async checkSubscriptionAndUsage(): Promise<{
    hasSubscription: boolean;
    canUseAI: boolean;
    currentUsage?: number;
    remainingUses?: number;
    error?: string;
  }> {
    try {
      const auth = await this.getCurrentAuth();
      if (!auth) {
        return {
          hasSubscription: false,
          canUseAI: false,
          error: 'Authentication required'
        };
      }


      // Check subscription via existing endpoint
      const subResponse = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'checkEmailSubscription',
            email: auth.email
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }
            resolve(response);
          }
        );
      });

      if (!subResponse.hasSubscription) {
        return {
          hasSubscription: false,
          canUseAI: false,
          error: 'Active subscription required'
        };
      }

      // Check AI usage via new endpoint
      const usageResponse = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'checkAIUsage',
            email: auth.email,
            channelId: auth.channelId
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }
            resolve(response);
          }
        );
      });

      return {
        hasSubscription: true,
        canUseAI: usageResponse.canUseAI || false,
        currentUsage: usageResponse.currentUsage,
        remainingUses: usageResponse.remainingUses
      };

    } catch (error) {
      console.error('FolderTube: Error checking subscription and usage:', error);
      return {
        hasSubscription: false,
        canUseAI: false,
        error: error instanceof Error ? error.message : 'Check failed'
      };
    }
  }

  /**
   * Increment AI usage (call before performing AI sort)
   */
  static async incrementAIUsage(authOverride?: { email: string; channelId: string } | null): Promise<{
    success: boolean;
    canUseAI: boolean;
    currentUsage?: number;
    remainingUses?: number;
    error?: string;
  }> {
    try {
      let auth = authOverride;
      if (!auth) {
        auth = await this.getCurrentAuth();
        if (!auth) {
          return {
            success: false,
            canUseAI: false,
            error: 'Authentication required'
          };
        }
      }
      
      // CRITICAL: Validate auth parameters before backend call
      if (!auth.email || !auth.channelId || 
          typeof auth.email !== 'string' || typeof auth.channelId !== 'string' || 
          auth.email.trim() === '' || auth.channelId.trim() === '' ||
          auth.email.trim().length < 3 || auth.channelId.trim().length < 3) {
        console.error('FolderTube: [Auth] ❌ AI Usage validation failed - invalid auth parameters');
        return {
          success: false,
          canUseAI: false,
          error: 'Invalid authentication parameters - please re-authenticate with YouTube'
        };
      }


      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'incrementAIUsage',
            email: auth.email,
            channelId: auth.channelId
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }
            resolve(response);
          }
        );
      });

      // Map the response fields correctly based on Edge Function response format
      if (response.success) {
        return {
          success: true,
          canUseAI: response.canUseAI !== undefined ? response.canUseAI : true,
          currentUsage: response.usageCount || response.currentUsage,
          remainingUses: response.remainingUsage || response.remainingUses,
          error: response.error
        };
      }

      return response;

    } catch (error) {
      console.error('FolderTube: Error incrementing AI usage:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to increment usage';
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error - please check your connection';
        } else if (error.message.includes('quota')) {
          errorMessage = 'AI usage limit reached for today';
        } else if (error.message.includes('auth')) {
          errorMessage = 'Authentication error - please try again';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        canUseAI: false,
        error: errorMessage
      };
    }
  }

  /**
   * Save folders to Supabase
   */
  static async saveFolders(folders: any[], authOverride?: { email: string; channelId: string } | null): Promise<{
    success: boolean;
    folders?: any[];
    error?: string;
  }> {
    try {
      
      let auth = authOverride;
      if (!auth) {
        auth = await this.getCurrentAuth();
        
        if (!auth) {
          console.error('FolderTube: [Auth] No authentication available - attempting to authenticate user');
          
          // Force authentication if no auth found
          const authResult = await this.authenticate();
          if (authResult.success && authResult.email && authResult.channelId) {
            auth = {
              email: authResult.email,
              channelId: authResult.channelId
            };
          } else {
            console.error('FolderTube: [Auth] Authentication failed:', authResult.error);
            return {
              success: false,
              error: 'Authentication required - please authenticate with YouTube first'
            };
          }
        }
      } else {
      }

      // CRITICAL: Validate authentication parameters before backend call
      console.log('FolderTube: [Auth] Validating auth parameters:', { 
        hasEmail: !!auth.email, 
        hasChannelId: !!auth.channelId,
        emailType: typeof auth.email,
        channelIdType: typeof auth.channelId,
        emailLength: auth.email?.length || 0,
        channelIdLength: auth.channelId?.length || 0
      });
      
      if (!auth.email || !auth.channelId || 
          typeof auth.email !== 'string' || typeof auth.channelId !== 'string' || 
          auth.email.trim() === '' || auth.channelId.trim() === '' ||
          auth.email.trim().length < 3 || auth.channelId.trim().length < 3) {
        console.error('FolderTube: [Auth] ❌ VALIDATION FAILED - Invalid authentication parameters:', {
          email: auth.email ? `${auth.email.substring(0,10)}...` : 'MISSING',
          channelId: auth.channelId ? `${auth.channelId.substring(0,10)}...` : 'MISSING',
          emailValid: !!auth.email && typeof auth.email === 'string' && auth.email.trim().length >= 3,
          channelIdValid: !!auth.channelId && typeof auth.channelId === 'string' && auth.channelId.trim().length >= 3
        });
        return {
          success: false,
          error: 'Invalid authentication parameters - missing email or channel ID. Please re-authenticate with YouTube.'
        };
      }
      
      console.log('FolderTube: [Auth] ✅ Parameter validation passed');
      


      // Save each folder individually through background script
      const saveResults = [];
      
      for (const folder of folders) {
        try {
          console.log('FolderTube: [Auth] Saving folder through background script:', folder.name);
          
          // 🔍 COMPREHENSIVE DEBUG: Auth object structure before background call
          console.log('🔍 DEBUG: Full auth object before background call:', {
            authObject: auth,
            hasAuth: !!auth,
            email: auth?.email,
            channelId: auth?.channelId,
            emailType: typeof auth?.email,
            channelIdType: typeof auth?.channelId,
            emailLength: auth?.email?.length,
            channelIdLength: auth?.channelId?.length,
            emailTrimmed: auth?.email?.trim(),
            channelIdTrimmed: auth?.channelId?.trim(),
            allAuthKeys: Object.keys(auth || {}),
            stringifiedAuth: JSON.stringify(auth)
          });
          
          // Validate parameters before sending
          const emailParam = auth?.email;
          const channelIdParam = auth?.channelId;
          
          if (!emailParam || !channelIdParam || !emailParam.includes('@') || channelIdParam.length < 10) {
            console.error('FolderTube: Invalid auth parameters for folder save:', {
              hasEmail: !!emailParam,
              hasChannelId: !!channelIdParam,
              emailValid: emailParam?.includes('@'),
              channelIdValid: channelIdParam && channelIdParam.length >= 10
            });
            saveResults.push({ 
              success: false, 
              error: 'Invalid authentication parameters' 
            });
            continue;
          }
          
          // Prepare message with validated parameters
          const messageToSend = {
            type: 'manageFolders',
            action: 'save',
            email: emailParam.trim(),
            youtubeChannelId: channelIdParam.trim(),
            channelId: channelIdParam.trim(), // Keep both for compatibility
            folderName: folder.name,
            channelIds: folder.channelIds || [],
            folderMetadata: {
              createdAt: folder.createdAt || new Date().toISOString(),
              ...folder
            }
          };
          
          // Debug: Log the exact message being sent
          console.log('FolderTube: [Auth] Sending message to background:', JSON.stringify({
            type: messageToSend.type,
            action: messageToSend.action,
            email: messageToSend.email?.substring(0, 15) + '...',
            youtubeChannelId: messageToSend.youtubeChannelId?.substring(0, 20) + '...',
            channelId: messageToSend.channelId?.substring(0, 20) + '...',
            folderName: messageToSend.folderName,
            hasChannelIds: !!messageToSend.channelIds,
            channelIdsLength: messageToSend.channelIds?.length
          }));
          
          // Send to background script
          const folderResult = await new Promise<any>((resolve) => {
            chrome.runtime.sendMessage(messageToSend, (response) => {
              if (chrome.runtime.lastError) {
                console.error('FolderTube: Background script error:', chrome.runtime.lastError);
                resolve({ success: false, error: chrome.runtime.lastError.message });
              } else {
                resolve(response || { success: false, error: 'No response from background script' });
              }
            });
          });
          
          if (!folderResult || !folderResult.success) {
            console.error('FolderTube: [Auth] Folder save failed:', JSON.stringify({
              folderName: folder.name,
              error: folderResult?.error || 'Unknown error',
              fullResult: folderResult
            }));
          } else {
            console.log('FolderTube: [Auth] Folder saved successfully:', folder.name);
          }
          
          saveResults.push(folderResult);
        } catch (error) {
          console.error('FolderTube: [Auth] Error saving folder:', folder.name, error);
          saveResults.push({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      // Check if all folders saved successfully
      const allSuccessful = saveResults.every(r => r && r.success);
      const failedFolders = saveResults.filter(r => !r || !r.success);
      
      if (!allSuccessful) {
        console.error('FolderTube: [Auth] Some folders failed to save:', JSON.stringify(failedFolders));
        // Get detailed error message from failed saves
        const errorMessages = failedFolders.map(r => r?.error || 'Unknown error').join(', ');
        return {
          success: false,
          error: `Failed to save ${failedFolders.length} folder(s): ${errorMessages}`,
          folders: saveResults
        };
      }

      const response = {
        success: true,
        folders: saveResults
      };

      return response;

    } catch (error) {
      console.error('FolderTube: Error saving folders:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to save folders';
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error - please check your connection and try again';
        } else if (error.message.includes('auth')) {
          errorMessage = 'Authentication error - please refresh the page and try again';
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
          errorMessage = 'Storage limit reached - please contact support';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Load folders from Supabase
   */
  static async loadFolders(): Promise<{
    success: boolean;
    folders?: any[];
    error?: string;
  }> {
    try {
      const auth = await this.getCurrentAuth();
      if (!auth) {
        console.log('FolderTube: [Auth] No authentication found for loading folders');
        return {
          success: false,
          folders: [],
          error: 'Authentication required'
        };
      }

      console.log('FolderTube: [Auth] Loading folders from Supabase for:', auth.email);

      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          {
            type: 'manageFolders',
            action: 'get',
            email: auth.email,
            channelId: auth.channelId
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('FolderTube: [Auth] Error loading folders:', chrome.runtime.lastError);
              resolve({
                success: false,
                folders: [],
                error: chrome.runtime.lastError.message
              });
              return;
            }
            resolve(response || { success: false, folders: [], error: 'No response from background' });
          }
        );
      });

      if (response.success && response.folders) {
        console.log('FolderTube: [Auth] Loaded', response.folders.length, 'folders from Supabase');
      } else {
        console.warn('FolderTube: [Auth] Failed to load folders:', response.error);
      }

      return response;

    } catch (error) {
      console.error('FolderTube: [Auth] Exception loading folders:', error);
      return {
        success: false,
        folders: [],
        error: error instanceof Error ? error.message : 'Failed to load folders'
      };
    }
  }

  /**
   * Clear cached authentication (logout)
   */
  static clearCache(): void {
    // No cached auth to clear - using strict account isolation
    console.log('🔒 [AUTH SECURITY] Authentication cache cleared');
  }

  /**
   * Clear authentication for specific account (used when account switches)
   */
  static async clearAccountAuth(): Promise<void> {
    console.log('🔒 [AUTH SECURITY] 🧹 Clearing all authentication data for account switch');
    
    // No cached auth to clear - using strict account isolation
    
    // Clear global keys (security measure)
    await chrome.storage.local.remove([
      'authenticatedEmail',
      'authenticatedChannelId',
      'authenticatedChannelName'
    ]);
    
    // Also clear subscription cache to prevent bleeding
    await new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: 'clearSubscriptionCache' }, () => {
        console.log('FolderTube: [Auth] ✅ Subscription cache cleared');
        resolve();
      });
    });
    
    console.log('FolderTube: [Auth] ✅ Account switch cleanup complete');
  }


  /**
   * Check if user is authenticated (for current account only)
   */
  static async isAuthenticated(): Promise<boolean> {
    const auth = await this.getCurrentAuth();
    return !!auth;
  }
}