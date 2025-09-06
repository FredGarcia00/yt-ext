import React, { useState, useEffect } from 'react';
import { YouTubeScraper } from '../utils/youtube-scraper';
import { YouTubeAPI } from '../utils/youtube-api';
import { aiCategorizer } from '../utils/aiCategorizer';
import { showCollectionsView, isCollectionsViewActive } from '../content-collections';
import { SupabaseAuthService } from '../utils/supabase-auth-service';
import { SupabaseBackend } from '../utils/supabase-backend';
import { YouTubeAccountDetector } from '../utils/youtube-account-detector';
// import { YouTubeEmailVerifier } from '../utils/youtube-email-verifier'; // Unused

interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}


const HeaderAISort: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isAISorting, setIsAISorting] = useState(false);
  const [aiSortsRemaining, setAiSortsRemaining] = useState(0);
  const [hasVerifiedSubscription, setHasVerifiedSubscription] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [subscriptionUncertain, setSubscriptionUncertain] = useState(false);

  // Function to show paywall modal with subscription options
  const showErrorMessage = (message: string, type: 'error' | 'warning' | 'info' = 'error') => {
    const announcement = document.createElement('div');
    announcement.textContent = message;
    const colors = {
      error: '#dc2626',
      warning: '#f59e0b',
      info: '#2563eb'
    };
    announcement.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${colors[type]};
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      text-align: center;
    `;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 5000);
  };

  const showPaywallModal = () => {
    const paywall = document.createElement('div');
    paywall.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 16px;
      text-align: center;
      max-width: 450px;
      max-height: 80vh;
      overflow-y: auto;
    `;
    
    modal.innerHTML = `
      <h2 style="color: #1f2937; margin-bottom: 20px;">🚀 FolderTube Pro Required</h2>
      <p style="color: #666; margin-bottom: 30px; line-height: 1.5;">
        AI Sort organizes your YouTube subscriptions automatically using advanced AI.<br><br>
        <strong>Choose your plan:</strong>
      </p>
      
      <div style="display: flex; gap: 20px; margin-bottom: 30px;">
        <div style="flex: 1; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px;">
          <h3 style="color: #1f2937; margin-bottom: 10px;">Monthly</h3>
          <div style="font-size: 24px; font-weight: bold; color: #10b981; margin-bottom: 10px;">$3.99/mo</div>
          <button id="monthly-btn" style="background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; width: 100%; font-weight: 600;">
            Choose Monthly
          </button>
        </div>
        
        <div style="flex: 1; border: 2px solid #10b981; border-radius: 12px; padding: 20px; position: relative;">
          <div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
            SAVE 17%
          </div>
          <h3 style="color: #1f2937; margin-bottom: 10px;">Yearly</h3>
          <div style="font-size: 24px; font-weight: bold; color: #10b981; margin-bottom: 10px;">$39.99/yr</div>
          <button id="yearly-btn" style="background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; width: 100%; font-weight: 600;">
            Choose Yearly
          </button>
        </div>
      </div>
      
      <div style="margin-bottom: 20px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
        <h4 style="color: #1f2937; margin-bottom: 10px;">Already have a subscription?</h4>
        <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
          Authenticate with your Google account to verify your YouTube subscription.
        </p>
        <button id="authenticate-btn" style="background: #4285f4; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Authenticate with Google
        </button>
      </div>
    `;
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕ Close';
    closeButton.style.cssText = `
      background: #6b7280; 
      color: white; 
      border: none; 
      padding: 12px 24px; 
      border-radius: 8px; 
      font-weight: 600; 
      cursor: pointer;
      margin-top: 10px;
    `;
    closeButton.onclick = () => paywall.remove();
    
    modal.appendChild(closeButton);
    paywall.appendChild(modal);
    document.body.appendChild(paywall);
    
    // Add event listeners
    const monthlyBtn = modal.querySelector('#monthly-btn') as HTMLButtonElement;
    const yearlyBtn = modal.querySelector('#yearly-btn') as HTMLButtonElement;
    const authenticateBtn = modal.querySelector('#authenticate-btn') as HTMLButtonElement;
    
    if (monthlyBtn) {
      monthlyBtn.onclick = () => {
        window.open('https://buy.stripe.com/test_00weV6f5d6rh3Ii9nVdZ601', '_blank');
        paywall.remove();
      };
    }
    
    if (yearlyBtn) {
      yearlyBtn.onclick = () => {
        window.open('https://buy.stripe.com/test_6oU9AM6yH7vl2Ee6bJdZ600', '_blank');
        paywall.remove();
      };
    }
    
    if (authenticateBtn) {
      authenticateBtn.onclick = async () => {
        try {
          // Show loading state
          authenticateBtn.disabled = true;
          authenticateBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="m12 6 0 6 4 2"/>
            </svg>
            Authenticating...
          `;
          
          console.log('FolderTube: [Paywall] Starting YouTube OAuth authentication...');
          
          // Use the background script for OAuth authentication
          const authResult = await new Promise<any>((resolve, reject) => {
            chrome.runtime.sendMessage(
              { type: 'authenticateYouTube' },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error('FolderTube: [Paywall] Auth error:', chrome.runtime.lastError);
                  reject(chrome.runtime.lastError);
                  return;
                }
                resolve(response);
              }
            );
          });
          
          console.log('FolderTube: [Paywall] OAuth result:', authResult);
          
          if (authResult.success && authResult.email && authResult.channelId) {
            // Check if this authenticated email has a subscription
            const subscriptionCheck = await new Promise<{ hasSubscription: boolean }>((resolve, reject) => {
              chrome.runtime.sendMessage({
                type: 'checkEmailSubscription',
                email: authResult.email
              }, (response) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                  return;
                }
                resolve(response);
              });
            });
            
            console.log('FolderTube: [Paywall] Subscription check:', subscriptionCheck);
            
            if (subscriptionCheck.hasSubscription) {
              paywall.remove();
              
              // Show success message
              const announcement = document.createElement('div');
              announcement.textContent = `✅ Welcome back ${authResult.channelName}! Your subscription is active.`;
              announcement.style.cssText = `
                position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
                background: #10b981; color: white; padding: 12px 24px; border-radius: 24px;
                font-size: 14px; font-weight: 500; z-index: 10000; text-align: center; max-width: 400px;
              `;
              document.body.appendChild(announcement);
              setTimeout(() => announcement.remove(), 3000);
              
              // Continue with AI Sort after successful authentication
              setTimeout(() => {
                performAISort();
              }, 500);
            } else {
              // Authenticated but no subscription
              paywall.remove();
              
              const announcement = document.createElement('div');
              announcement.textContent = `✅ Authenticated as ${authResult.channelName}. Please purchase a subscription to use AI Sort.`;
              announcement.style.cssText = `
                position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
                background: #f59e0b; color: white; padding: 12px 24px; border-radius: 24px;
                font-size: 14px; font-weight: 500; z-index: 10000; text-align: center; max-width: 400px;
              `;
              document.body.appendChild(announcement);
              setTimeout(() => announcement.remove(), 4000);
            }
          } else {
            throw new Error(authResult.error || 'Authentication failed');
          }
          
        } catch (error) {
          console.error('FolderTube: [Paywall] Authentication error:', error);
          
          // Reset button state
          authenticateBtn.disabled = false;
          authenticateBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Authenticate with Google
          `;
          
          showErrorMessage('Authentication failed. Please try again.', 'error');
        }
      };
    }
  };

  useEffect(() => {
    // SESSION STORAGE: Use session-based storage that clears on tab close
    const setupSessionStorage = () => {
      console.log('💥 Setting up session-based storage (clears on tab close)');
      
      // Use sessionStorage for UI state (clears on tab close)
      sessionStorage.removeItem('foldertube_subscription_state');
      sessionStorage.removeItem('foldertube_auth_timestamp');
      console.log('💥 Cleared session storage');
    };
    
    // Verify subscription status - Simplified using backend service
    const verifySubscriptionStatus = async () => {
      console.log('FolderTube: Starting subscription verification');
      
      // Start with checking state
      setIsCheckingSubscription(true);
      setHasVerifiedSubscription(false);
      setSubscriptionUncertain(false);
      setAiSortsRemaining(0);
      setFolders([]);
      
      try {
        // Step 1: Check authentication using simplified method
        const authInfo = await SupabaseAuthService.getCurrentAuth();
        
        if (!authInfo || !authInfo.email || !authInfo.channelId) {
          console.log('FolderTube: No authentication found - user needs to sign in');
          setHasVerifiedSubscription(false);
          setSubscriptionUncertain(true); // Show lock icon
          setIsCheckingSubscription(false);
          return;
        }
        
        console.log('FolderTube: ✅ Authentication found:', {
          email: authInfo.email.substring(0, 10) + '...',
          channelId: authInfo.channelId.substring(0, 15) + '...'
        });
        
        // Step 2: Check subscription using backend service
        const subscriptionResult = await SupabaseBackend.checkSubscription(authInfo.email);
        
        if (!subscriptionResult.hasSubscription) {
          console.log('FolderTube: No active subscription found for this email');
          setHasVerifiedSubscription(false);
          setSubscriptionUncertain(false); // Show upgrade button
          setIsCheckingSubscription(false);
          return;
        }
        
        console.log('FolderTube: ✅ Active subscription confirmed');
        
        // Step 3: Check AI usage limits
        const usageLimits = await SupabaseBackend.checkUsageLimits();
        
        console.log('FolderTube: Usage limits:', usageLimits);
        
        // Step 4: Set up verified subscriber access
        setHasVerifiedSubscription(true);
        setSubscriptionUncertain(false);
        setAiSortsRemaining(usageLimits.remainingUses || 999);
        
        // Folders will be loaded on-demand when Collections button is clicked
        setFolders([]);
        
      } catch (error) {
        console.error('FolderTube: Subscription verification error:', error);
        // On error, show lock icon (uncertain state)
        setHasVerifiedSubscription(false);
        setSubscriptionUncertain(true);
        setAiSortsRemaining(0);
        setFolders([]);
      } finally {
        setIsCheckingSubscription(false);
      }
    };
    
    // Set up session storage and verify subscription
    setupSessionStorage();
    console.log('💥 Starting subscription verification with OAuth token management');
    verifySubscriptionStatus();
    
    // Listen for account changes with IMMEDIATE UI state reset
    const handleAccountChange = async () => {
      console.log('🔧 ACCOUNT CHANGE: Immediate UI state reset to prevent account bleeding');
      
      // IMMEDIATE: Reset UI state first (prevents showing wrong buttons)
      setHasVerifiedSubscription(false);
      setSubscriptionUncertain(true); // Show lock icon immediately
      setAiSortsRemaining(0);
      setFolders([]);
      setIsCheckingSubscription(true);
      
      try {
        // Show immediate user feedback
        const announcement = document.createElement('div');
        announcement.textContent = '🔄 Account changed - Verifying access...';
        announcement.style.cssText = `
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: #f59e0b;
          color: white;
          padding: 12px 24px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 500;
          z-index: 99999;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
        `;
        document.body.appendChild(announcement);
        
        // Clear subscription cache for fresh verification
        await new Promise<void>((resolve) => {
          chrome.runtime.sendMessage({ type: 'clearSubscriptionCache' }, () => {
            resolve();
          });
        });
        
        // Remove the announcement after a moment
        setTimeout(() => {
          announcement.remove();
        }, 2000);
        
        // Re-run subscription verification for the new account after a short delay
        setTimeout(() => {
          verifySubscriptionStatus();
        }, 1000);
        
      } catch (error) {
        console.error('🔧 Error during account change handling:', error);
        // Even if there's an error, we've already reset the UI state to safe defaults
      }
    };
    
    // Start aggressive account monitoring (Nuclear Option)
    YouTubeAccountDetector.startMonitoring();
    YouTubeAccountDetector.onAccountChange(handleAccountChange);
    window.addEventListener('foldertube:google-account-changed', handleAccountChange);
    
    // ENHANCED: More responsive state validation
    const stateValidationInterval = setInterval(() => {
      // Check for account changes more frequently and reset UI immediately if needed
      if (hasVerifiedSubscription && !isCheckingSubscription) {
        // Quick account detection check
        const currentAccountId = YouTubeAccountDetector.getCurrentAccountId();
        const currentChannelId = YouTubeAccountDetector.getCurrentChannelId();
        
        // If we can't detect account properly, immediately reset UI
        if (!currentAccountId && !currentChannelId) {
          console.log('🔧 PERIODIC CHECK: Account detection failed - immediate UI reset');
          setHasVerifiedSubscription(false);
          setSubscriptionUncertain(true);
          setAiSortsRemaining(0);
          setFolders([]);
        }
      }
      
      // Also check if user is on non-paid account but UI shows they're verified
      if (hasVerifiedSubscription && !isCheckingSubscription) {
        // Do a quick auth check to make sure we're still authenticated
        SupabaseAuthService.getCurrentAuth().then(auth => {
          if (!auth || !auth.email) {
            console.log('🔧 PERIODIC CHECK: Auth lost - resetting UI');
            setHasVerifiedSubscription(false);
            setSubscriptionUncertain(true);
            setAiSortsRemaining(0);
            setFolders([]);
          }
        }).catch(() => {
          // If auth check fails, reset UI to safe state
          setHasVerifiedSubscription(false);
          setSubscriptionUncertain(true);
          setAiSortsRemaining(0);
          setFolders([]);
        });
      }
    }, 2000); // Check every 2 seconds (more responsive)
    
    return () => {
      YouTubeAccountDetector.removeAccountChangeCallback(handleAccountChange);
      window.removeEventListener('foldertube:google-account-changed', handleAccountChange);
      clearInterval(stateValidationInterval);
    };
  }, []);

  // Listen for folder updates after AI Sort creates new folders
  useEffect(() => {
    if (!hasVerifiedSubscription) {
      return;
    }

    const handleFolderUpdate = async () => {
      console.log('FolderTube: Folder update event - reloading from Supabase');
      try {
        const folderData = await SupabaseAuthService.loadFolders();
        if (folderData.success && folderData.folders) {
          const convertedFolders = folderData.folders.map((folder: any) => ({
            id: folder.id || folder.folder_id,
            name: folder.folder_name || folder.name,
            channelIds: folder.channel_ids || folder.channelIds || []
          }));
          setFolders(convertedFolders);
          console.log('FolderTube: Updated folders after AI Sort:', convertedFolders.length);
        }
      } catch (error) {
        console.error('FolderTube: Error updating folders after AI Sort:', error);
      }
    };
    
    window.addEventListener('foldertube:folders-updated', handleFolderUpdate);

    return () => {
      window.removeEventListener('foldertube:folders-updated', handleFolderUpdate);
    };
  }, [hasVerifiedSubscription]);

  // Extract the core AI Sort logic into a separate function
  const performAISort = async () => {
    setIsAISorting(true);
    
    // Create announcement element
    const announcement = document.createElement('div');
    announcement.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #6d28d9;
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(109, 40, 217, 0.3);
    `;
    document.body.appendChild(announcement);
    
    try {
      // STEP 1: SIMPLIFIED AUTHENTICATION CHECK
      announcement.textContent = 'Verifying authentication...';
      
      let currentAuth = await SupabaseAuthService.getCurrentAuth();
      
      if (!currentAuth) {
        console.log('FolderTube: [AI Sort] No authentication found - requesting sign in...');
        announcement.textContent = 'Please sign in with Google';
        announcement.style.background = '#ef4444';
        setTimeout(() => {
          announcement.remove();
          showPaywallModal();
        }, 2000);
        setIsAISorting(false);
        return;
      }
      
      console.log('FolderTube: [AI Sort] ✅ Authentication found:', {
        email: currentAuth.email?.substring(0, 10) + '...',
        channelId: currentAuth.channelId?.substring(0, 15) + '...'
      });
      
      // STEP 2: VERIFY SUBSCRIPTION USING BACKEND
      announcement.textContent = 'Verifying subscription...';
      
      const subscriptionCheck = await SupabaseBackend.checkSubscription(currentAuth.email);
      
      if (!subscriptionCheck.hasSubscription) {
        console.log('FolderTube: [AI Sort] ❌ No active subscription');
        announcement.textContent = '❌ Active subscription required';
        announcement.style.background = '#ef4444';
        setTimeout(() => {
          announcement.remove();
          showPaywallModal();
        }, 2000);
        setIsAISorting(false);
        return;
      }
      
      console.log('FolderTube: [AI Sort] ✅ Subscription verified');
      
      // STEP 3: NOW start AI categorization (after all checks pass)
      announcement.textContent = 'AI is categorizing your channels...';

      // Get current channels
      const channels = await YouTubeScraper.getSubscriptions();
      
      announcement.textContent = "Fetching channel details from YouTube...";
      
      // Check if API quota is available before making calls
      const quotaCheck = await chrome.storage.local.get(['quotaExceeded', 'apiCallsToday']);
      const quotaExceeded = quotaCheck.quotaExceeded;
      const apiCallsToday = quotaCheck.apiCallsToday || 0;
      
      // Get real channel metadata from YouTube API (if quota available)
      const channelIds = channels.map((c: any) => c.id).filter(Boolean);
      let channelDetails: any[] = [];
      
      if (quotaExceeded || apiCallsToday > 8000) { // Leave buffer for video fetching
        console.log('FolderTube: Skipping channel details API calls to preserve quota');
        announcement.textContent = "Using channel names only for categorization to preserve API quota...";
      } else {
        try {
          // Batch fetch channel details from YouTube API
          channelDetails = await YouTubeAPI.getChannelDetails(channelIds);
          console.log('FolderTube: Got channel details for', channelDetails.length, 'channels');
        } catch (error: any) {
          console.warn('FolderTube: Failed to get channel details, using basic data:', error);
          channelDetails = [];
          // If it's a 403 error, show a more specific message
          if (error.message?.includes('403') || error.message?.includes('forbidden')) {
            announcement.textContent = "API quota exceeded. Using channel names for categorization...";
          }
        }
      }
      
      announcement.textContent = "Analyzing recent video content for better categorization...";
      
      // Continue with the rest of the AI Sort logic...
      // (This will be moved from the current location below)
      
      // Fetch recent video titles for enhanced categorization (only if quota available)
      const videoTitlesMap = new Map<string, string[]>();
      
      if (!quotaExceeded && apiCallsToday < 8500) { // Conservative quota usage
        const sampleSize = Math.min(channelIds.length, 20); // Reduced sample size to save quota
        
        // Batch fetch video titles more efficiently
        const batchSize = 3; // Smaller batches to be more conservative
        for (let i = 0; i < sampleSize; i += batchSize) {
          const batch = channelIds.slice(i, Math.min(i + batchSize, sampleSize));
          announcement.textContent = `Analyzing video content (${Math.min(i + batchSize, sampleSize)}/${sampleSize})...`;
          
          await Promise.all(batch.map(async (channelId: string) => {
            const channel = channels.find((c: any) => c.id === channelId);
            
            try {
              const channelVideos = await YouTubeAPI.getChannelVideos(channelId, channel?.name || 'Unknown', false, true);
              
              if (channelVideos?.videos && channelVideos.videos.length > 0) {
                // Get fewer video titles to save quota (up to 5)
                const allVideoTitles = channelVideos.videos.slice(0, 5).map(video => video.title);
                videoTitlesMap.set(channelId, allVideoTitles);
                console.log(`FolderTube: Got ${allVideoTitles.length} video titles for ${channel?.name}`);
              }
            } catch (error) {
              console.warn(`FolderTube: Failed to get videos for channel ${channelId}:`, error);
              // Continue without video titles for this channel
            }
          }));
          
          // Longer delay between batches to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } else {
        console.log('FolderTube: Skipping video title fetching to preserve quota');
        announcement.textContent = "Analyzing channel names for categorization (quota preserved)...";
      }
      
      // Convert channels to ChannelMetadata format with real YouTube data
      const channelMetadata = channels.map((channel: any) => {
        const apiData = channelDetails.find(d => d.id === channel.id);
        return {
          id: channel.id,
          name: channel.name,
          description: apiData?.description || '',
          videoTitles: videoTitlesMap.get(channel.id) || [],
          subscriberCount: apiData?.subscriberCount || 0,
          videoCount: apiData?.videoCount || 0,
          viewCount: apiData?.viewCount || 0,
          country: apiData?.country || '',
          customUrl: apiData?.customUrl || '',
          publishedAt: apiData?.publishedAt || '',
          thumbnails: apiData?.thumbnails || channel.thumbnails,
          keywords: apiData?.keywords || []
        };
      });
      
      announcement.textContent = "AI is organizing your subscriptions into folders...";
      
      // Run AI categorization with enhanced data
      const aiResult = await aiCategorizer.categorizeChannels(channelMetadata);
      
      // Transform AI result to folder structure with metadata
      console.log('FolderTube: [AI Sort] AI Result Map:', aiResult);
      console.log('FolderTube: [AI Sort] Available channels:', channels.map((c: any) => `${c.name} (${c.id})`));
      
      const createdFolders = Array.from(aiResult.entries()).map(([category, channelIds]) => {
        console.log(`FolderTube: [AI Sort] Processing category "${category}" with channel IDs:`, channelIds);
        
        // channelIds are already IDs, not names - verify they exist in our channels array
        const validChannelIds = channelIds.filter((channelId: string) => {
          const exists = channels.some((c: any) => c.id === channelId);
          if (!exists) {
            console.warn(`FolderTube: [AI Sort] Channel ID "${channelId}" not found in subscriptions`);
          }
          return exists;
        });
        
        console.log(`FolderTube: [AI Sort] Folder "${category}" has ${validChannelIds.length} valid channels`);
        
        return {
          id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: category,
          channelIds: validChannelIds,
          createdAt: new Date().toISOString()
        };
      }).filter(folder => folder.channelIds.length > 0);
      
      console.log('FolderTube: [AI Sort] Created folders:', createdFolders);
      
      // Auth already validated at the beginning - no need to check again
      // Using the currentAuth from the beginning of the function
      
      // Basic auth parameter validation (more permissive)
      if (!currentAuth.email || !currentAuth.channelId ||
          !currentAuth.email.includes('@') || 
          currentAuth.email.trim().length < 5 || 
          currentAuth.channelId.trim().length < 10) {
        console.error('🔧 [AI Sort] ❌ INVALID AUTH PARAMS:', {
          email: currentAuth.email ? currentAuth.email.substring(0, 10) + '...' : 'MISSING',
          channelId: currentAuth.channelId ? currentAuth.channelId.substring(0, 15) + '...' : 'MISSING',
          emailValid: !!currentAuth.email?.includes('@'),
          channelIdValid: !!currentAuth.channelId && currentAuth.channelId.length >= 10
        });
        announcement.textContent = '❌ Authentication incomplete - please sign in with Google';
        announcement.style.background = '#ef4444';
        setTimeout(() => {
          announcement.remove();
          showPaywallModal();
        }, 3000);
        return;
      }
      
      console.log('FolderTube: [AI Sort] ✅ Valid auth confirmed for backend operations:', {
        email: currentAuth.email.substring(0, 10) + '...',
        channelId: currentAuth.channelId.substring(0, 15) + '...'
      });
      
      // Debug: Log the exact auth object being passed
      console.log('FolderTube: [AI Sort] DEBUG - Full currentAuth object:', JSON.stringify({
        hasEmail: !!currentAuth.email,
        hasChannelId: !!currentAuth.channelId,
        emailLength: currentAuth.email?.length,
        channelIdLength: currentAuth.channelId?.length,
        emailIncludesAt: currentAuth.email?.includes('@'),
        channelIdStartsWithUC: currentAuth.channelId?.startsWith('UC'),
        authKeys: Object.keys(currentAuth)
      }));
      
      // Increment AI usage using backend service
      const usageResult = await SupabaseBackend.recordAIUsage();
      console.log('FolderTube: [AI Sort] AI usage recorded:', usageResult);
      
      // Update remaining uses if available
      if (usageResult.remainingUsage !== undefined) {
        setAiSortsRemaining(usageResult.remainingUsage);
      }
      
      // Save folders to Supabase using the validated authenticated session
      console.log('FolderTube: [AI Sort] Saving folders with auth:', {
        email: currentAuth.email?.substring(0, 15) + '...',
        channelId: currentAuth.channelId?.substring(0, 20) + '...'
      });
      const saveResult = await SupabaseAuthService.saveFolders(createdFolders, currentAuth);
      
      if (saveResult.success) {
        console.log('FolderTube: [AI Sort] Folders saved successfully to Supabase');
        setFolders(createdFolders);
        
        // Save to local storage (replace existing folders to avoid duplicates)
        await chrome.storage.local.set({ folders: createdFolders });
        
        announcement.textContent = `✅ Created ${createdFolders.length} folders with AI!`;
        announcement.style.background = '#10b981';
        
        // Record AI usage via background script
        try {
          if (currentAuth) {
            await new Promise<any>((resolve, reject) => {
              chrome.runtime.sendMessage({
                type: 'incrementAIUsage',
                email: currentAuth.email,
                channelId: currentAuth.channelId
              }, (response) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                  return;
                }
                resolve(response);
              });
            });
            console.log('FolderTube: [AI Sort] AI usage recorded successfully');
          }
        } catch (error) {
          console.warn('FolderTube: [AI Sort] Failed to record AI usage:', error);
        }
        
        // Trigger folder update event for UI refresh
        window.dispatchEvent(new CustomEvent('foldertube:folders-updated'));
        
        // Auto-navigate to Collections view after short delay
        setTimeout(() => {
          announcement.remove();
          if (!isCollectionsViewActive()) {
            showCollectionsView();
          }
        }, 2000);
      } else {
        console.error('💥 [AI Sort] ❌ CLOUD SYNC FAILED - BLOCKING ALL FOLDER OPERATIONS');
        console.error('💥 [AI Sort] Backend error:', JSON.stringify(saveResult.error));
        
        // CRITICAL: DO NOT SAVE LOCALLY - This is a security violation
        // Delete any folders that might have been created
        console.log('💥 [AI Sort] Cleaning up - removing any local folders');
        await chrome.storage.local.remove(['folders']);
        setFolders([]); // Clear UI state
        
        // Show clear error message
        announcement.textContent = '❌ Subscription verification failed - AI Sort blocked';
        announcement.style.background = '#ef4444';
        
        // Log detailed error for debugging
        console.error('💥 [AI Sort] Subscription/Auth failure details:', JSON.stringify({
          error: saveResult.error,
          email: currentAuth.email?.substring(0, 10) + '...',
          channelId: currentAuth.channelId?.substring(0, 15) + '...',
          fullSaveResult: saveResult
        }));
        
        setTimeout(() => {
          announcement.remove();
          // Show paywall since backend verification failed
          showPaywallModal();
        }, 3000);
        
        // STOP HERE - NO LOCAL SAVING ALLOWED
        return;
      }
      
    } catch (error) {
      console.error('FolderTube: [AI Sort] Error during AI categorization:', error);
      const announcement = document.createElement('div');
      announcement.textContent = '❌ AI Sort failed. Please try again.';
      announcement.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
      `;
      document.body.appendChild(announcement);
      setTimeout(() => announcement.remove(), 3000);
    } finally {
      setIsAISorting(false);
    }
  };

  const handleAISort = async () => {
    console.log('💥🔥 AI SORT: STRICT VERIFICATION - NO BYPASSES ALLOWED');
    
    // STEP 1: Check component state first (fail-fast)
    if (!hasVerifiedSubscription) {
      console.log('💥 AI Sort blocked - no verified subscription in component state');
      showPaywallModal();
      return;
    }
    
    // STEP 1.5: QUICK SUBSCRIPTION CHECK (streamlined for paid users)
    console.log('🔧 Quick subscription verification for AI sort...');
    
    try {
      const quickAuth = await SupabaseAuthService.getCurrentAuth();
      if (!quickAuth) {
        console.log('🔧 No authentication - showing sign-in modal');
        showPaywallModal();
        return;
      }
      
      console.log('🔧 Auth found for AI sort:', {
        email: quickAuth.email?.substring(0, 10) + '...',
        channelId: quickAuth.channelId?.substring(0, 15) + '...'
      });
      
    } catch (error) {
      console.error('🔧 Auth check error:', error);
      showPaywallModal();
      return;
    }
    
    console.log('🔧 ✅ Auth verified - proceeding with AI sort');
    
    // Proceed with AI sort using verified authentication
    await performAISort();
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      height: '100%'
    }}>
      {/* Only show content for verified subscribers or loading state */}
      {isCheckingSubscription ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: '#f3f4f6',
          color: '#6b7280',
          border: 'none',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          <div style={{
            width: '14px',
            height: '14px',
            border: '2px solid rgba(107, 114, 128, 0.3)',
            borderTop: '2px solid #6b7280',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Verifying...
        </div>
      ) : hasVerifiedSubscription ? (
        /* Verified subscribers see full AI Sort + Collections */
        <>
          {/* AI Sort Button - Only for verified subscribers */}
          <button
            onClick={handleAISort}
            disabled={isAISorting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isAISorting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(109, 40, 217, 0.3)',
              opacity: isAISorting ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isAISorting) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(109, 40, 217, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(109, 40, 217, 0.3)';
            }}
          >
            {isAISorting ? (
              <>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                AI Sorting...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 1 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5Z" 
                    fill="currentColor"/>
                  <circle cx="9.5" cy="9.5" r="2.5" fill="#10b981"/>
                  <circle cx="19" cy="19" r="2" fill="currentColor"/>
                </svg>
                AI Sort {aiSortsRemaining > 0 && aiSortsRemaining < 999 && `(${aiSortsRemaining} remaining)`}
              </>
            )}
          </button>

          {/* Collections Button - Always visible for verified subscribers */}
          <button
            id="collections-button"
            onClick={async () => {
              // Lazy load folders if not already loaded
              if (folders.length === 0) {
                console.log('🔍 Collections clicked - loading folders on demand...');
                try {
                  const folderData = await SupabaseAuthService.loadFolders();
                  if (folderData.success && folderData.folders && folderData.folders.length > 0) {
                    const convertedFolders = folderData.folders.map((folder: any) => ({
                      id: folder.id || folder.folder_id,
                      name: folder.folder_name || folder.name,
                      channelIds: folder.channel_ids || folder.channelIds || []
                    }));
                    setFolders(convertedFolders);
                    console.log('🔍 ✅ Loaded', convertedFolders.length, 'folders on demand');
                  } else {
                    console.log('🔍 No folders found - user may need to run AI Sort first');
                    showErrorMessage('No collections found. Run AI Sort to create your first collection!', 'info');
                    return;
                  }
                } catch (error) {
                  console.error('🔍 ❌ Error loading folders on demand:', error);
                  showErrorMessage('Failed to load collections. Please try refreshing.', 'error');
                  return;
                }
              }
              
              if (!isCollectionsViewActive()) {
                showCollectionsView();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'white',
              color: '#6d28d9',
              border: '2px solid #6d28d9',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#6d28d9';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.color = '#6d28d9';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" fill="currentColor"/>
            </svg>
            Collections {folders.length > 0 && `(${folders.length})`}
          </button>
        </>
      ) : subscriptionUncertain ? (
        /* Users with uncertain subscription status see lock icon */
        <button
          onClick={showPaywallModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 114, 128, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(107, 114, 128, 0.3)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C13.1 2 14 2.9 14 4V8H16C17.1 8 18 8.9 18 10V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V10C6 8.9 6.9 8 8 8H10V4C10 2.9 10.9 2 12 2M12 4C11.4 4 11 4.4 11 5V8H13V5C13 4.4 12.6 4 12 4M8 10V20H16V10H8Z"/>
          </svg>
          🔒 AI Sort
        </button>
      ) : (
        /* Confirmed non-subscribers see upgrade button */
        <button
          onClick={showPaywallModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.3)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V7C3 8.1 3.9 9 5 9H21ZM19 19H5V21H19V19ZM3 11V17H21V11H3Z"/>
          </svg>
          Get FolderTube Pro
        </button>
      )}

      {/* Add CSS animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes glow {
          0% { box-shadow: 0 0 10px rgba(109, 40, 217, 0.5); }
          50% { box-shadow: 0 0 20px rgba(109, 40, 217, 0.8), 0 0 30px rgba(109, 40, 217, 0.6); }
          100% { box-shadow: 0 0 10px rgba(109, 40, 217, 0.5); }
        }
      `}</style>
    </div>
  );
};

export default HeaderAISort;
