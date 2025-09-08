import React, { useState, useEffect } from 'react';
import { YouTubeScraper } from '../utils/youtube-scraper';
import { YouTubeAPI } from '../utils/youtube-api';
import { aiCategorizer } from '../utils/aiCategorizer';
import { showCollectionsView, isCollectionsViewActive } from '../content-collections';
import { YouTubeAccountDetector } from '../utils/youtube-account-detector';

interface Folder {
  id: string;
  name: string;
  channelIds: string[];
}

type ButtonState = 'LOCKED' | 'AUTHENTICATING' | 'READY' | 'SORTING';

const HeaderAISort: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [buttonState, setButtonState] = useState<ButtonState>('LOCKED');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Channel mismatch modal - prevents account bleeding
  const showChannelMismatchModal = (tokenChannelId: string, currentChannelId: string) => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 16px;
      text-align: center;
      max-width: 550px;
      margin: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    `;
    
    modalContent.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
        <h2 style="color: #dc2626; margin-bottom: 10px; font-size: 22px;">Channel Security Warning</h2>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="color: #dc2626; margin: 0; font-weight: 600; font-size: 14px;">Account Bleeding Detected!</p>
        </div>
      </div>
      
      <div style="text-align: left; margin-bottom: 25px; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;">
        <div style="margin-bottom: 12px;">
          <strong style="color: #1f2937;">Your Subscription Channel:</strong><br>
          <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${tokenChannelId}</span>
        </div>
        <div>
          <strong style="color: #1f2937;">Current YouTube Channel:</strong><br>
          <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${currentChannelId}</span>
        </div>
      </div>
      
      <div style="background: #fffbeb; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; margin-bottom: 25px; text-align: left;">
        <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px;">🔒 Why This Matters:</h4>
        <p style="color: #92400e; margin: 0; font-size: 13px; line-height: 1.4;">
          To prevent unauthorized access to paid features, FolderTube Pro ensures your subscription is used only on the correct YouTube channel. This prevents subscription sharing between different channels.
        </p>
      </div>
      
      <div style="margin-bottom: 25px;">
        <h4 style="color: #1f2937; margin-bottom: 15px;">To Fix This Issue:</h4>
        <div style="text-align: left;">
          <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
            <div style="background: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">1</div>
            <div style="flex: 1;">
              <strong style="color: #1f2937;">Switch to Your Subscription Channel:</strong><br>
              <span style="color: #6b7280; font-size: 14px;">Click your profile picture on YouTube and switch to the channel ending in <strong>...${tokenChannelId.slice(-8)}</strong></span>
            </div>
          </div>
          <div style="text-align: center; margin: 12px 0; color: #9ca3af;">— OR —</div>
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="background: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">2</div>
            <div style="flex: 1;">
              <strong style="color: #1f2937;">Purchase Subscription for Current Channel:</strong><br>
              <span style="color: #6b7280; font-size: 14px;">Buy a new subscription for channel ending in <strong>...${currentChannelId.slice(-8)}</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: center;';
    
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '🔄 Try Again';
    refreshButton.style.cssText = `
      background: #3b82f6; color: white; border: none; padding: 12px 24px; 
      border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;
    `;
    refreshButton.onmouseover = () => refreshButton.style.background = '#2563eb';
    refreshButton.onmouseout = () => refreshButton.style.background = '#3b82f6';
    refreshButton.onclick = () => {
      modal.remove();
      // Trigger authentication again after user fixes the account mismatch
      setTimeout(() => showPaywallModal(), 500);
    };
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕ Close';
    closeButton.style.cssText = `
      background: #6b7280; color: white; border: none; padding: 12px 24px; 
      border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s;
    `;
    closeButton.onmouseover = () => closeButton.style.background = '#4b5563';
    closeButton.onmouseout = () => closeButton.style.background = '#6b7280';
    closeButton.onclick = () => modal.remove();
    
    buttonContainer.appendChild(refreshButton);
    buttonContainer.appendChild(closeButton);
    modalContent.appendChild(buttonContainer);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  };

  const showPaywallModal = () => {
    // Simple authentication info without DOM detection
    const accountWarningHTML = `
      <div style="background: #e0f2fe; border: 1px solid #0288d1; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
        <h4 style="color: #01579b; margin: 0 0 8px 0; font-size: 14px;">🔐 Authentication Required</h4>
        <p style="color: #01579b; margin: 0; font-size: 12px; line-height: 1.4;">
          Sign in with your Google account to verify your YouTube subscription and unlock AI Sort features.
        </p>
      </div>
    `;

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
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    `;
    
    modal.innerHTML = `
      <h2 style="color: #1f2937; margin-bottom: 20px;">🚀 FolderTube Pro Required</h2>
      ${accountWarningHTML}
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
          // Set authenticating state
          setButtonState('AUTHENTICATING');
          
          // Show loading state in modal
          authenticateBtn.disabled = true;
          authenticateBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="m12 6 0 6 4 2"/>
            </svg>
            Authenticating...
          `;
          
          console.log('FolderTube: [Paywall] ⚡ Starting OAuth authentication...');
          console.log('FolderTube: [Paywall] 🔍 Sending handleAIAuthentication message to background script');
          
          // Use session-based authentication with enhanced debugging
          const authResult = await new Promise<any>((resolve, reject) => {
            const startTime = Date.now();
            
            // Get current page's channel ID for authentication
            const currentPageChannelId = YouTubeAccountDetector.getCurrentPageChannelId();
            
            if (!currentPageChannelId) {
              console.error('FolderTube: [Paywall] ❌ Cannot detect YouTube channel on current page');
              reject(new Error('Cannot detect YouTube channel on current page. Please try from a YouTube channel page or video.'));
              return;
            }
            
            console.log('FolderTube: [Paywall] 🎯 Authenticating for channel:', currentPageChannelId);
            
            chrome.runtime.sendMessage(
              { 
                type: 'handleAIAuthentication',
                currentPageChannelId: currentPageChannelId
              },
              (response) => {
                const duration = Date.now() - startTime;
                console.log(`FolderTube: [Paywall] 📨 Background response received in ${duration}ms`);
                
                if (chrome.runtime.lastError) {
                  console.error('FolderTube: [Paywall] ❌ Chrome runtime error:', chrome.runtime.lastError);
                  reject(chrome.runtime.lastError);
                  return;
                }
                
                if (!response) {
                  console.error('FolderTube: [Paywall] ❌ No response from background script');
                  reject(new Error('No response from background script'));
                  return;
                }
                
                console.log('FolderTube: [Paywall] 📋 Background script response:', JSON.stringify(response, null, 2));
                resolve(response);
              }
            );
          });
          
          console.log('FolderTube: [Paywall] 🎯 Final authentication result:', authResult);
          
          if (authResult.success) {
            // Authentication successful and subscription verified
            setButtonState('READY');
            setIsAuthenticated(true);
            setHasSubscription(true);
            
            paywall.remove();
            
            // Show success message
            const announcement = document.createElement('div');
            announcement.textContent = `✅ Authentication successful! You can now use AI Sort.`;
            announcement.style.cssText = `
              position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
              background: #10b981; color: white; padding: 12px 24px; border-radius: 24px;
              font-size: 14px; font-weight: 500; z-index: 10000; text-align: center; max-width: 400px;
            `;
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 3000);
            
            // User can now click the unlocked AI Sort button manually
          } else {
            // Authentication failed or no subscription
            setButtonState('LOCKED');
            paywall.remove();
            
            // Handle channel mismatch specifically
            if (authResult.channelMismatch) {
              console.log('FolderTube: [Channel Mismatch] Token channel ID:', authResult.tokenChannelId);
              console.log('FolderTube: [Channel Mismatch] Current page channel ID:', authResult.currentChannelId);
              
              // Show enhanced channel mismatch modal
              showChannelMismatchModal(authResult.tokenChannelId, authResult.currentChannelId);
            } else {
              // Regular authentication error
              const errorMessage = authResult.error || 'Authentication failed';
              const announcement = document.createElement('div');
              announcement.textContent = `❌ ${errorMessage}`;
              announcement.style.cssText = `
                position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
                background: #ef4444; color: white; padding: 12px 24px; border-radius: 24px;
                font-size: 14px; font-weight: 500; z-index: 10000; text-align: center; max-width: 450px;
              `;
              document.body.appendChild(announcement);
              setTimeout(() => announcement.remove(), 4000);
            }
          }
          
        } catch (error) {
          console.error('FolderTube: [Paywall] Authentication error:', error);
          
          // Reset to locked state
          setButtonState('LOCKED');
          
          // Reset button state in modal
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
    // Start YouTube page monitoring for account changes
    YouTubeAccountDetector.startMonitoring();
    
    checkAuthStatus();
    
    // Check periodically
    const interval = setInterval(checkAuthStatus, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const checkAuthStatus = async () => {
    try {
      // Get current page's channel ID
      const currentPageChannelId = YouTubeAccountDetector.getCurrentPageChannelId();
      
      if (!currentPageChannelId) {
        console.log('FolderTube: [HeaderAISort] No channel detected on current page');
        setIsAuthenticated(false);
        setHasSubscription(false);
        setButtonState('LOCKED');
        setIsLoading(false);
        return;
      }

      console.log('FolderTube: [HeaderAISort] Checking auth for channel:', currentPageChannelId);
      
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { 
            type: 'checkAuthenticationStatus',
            currentPageChannelId: currentPageChannelId
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('Auth check error:', chrome.runtime.lastError);
              resolve({ success: false });
            } else {
              resolve(response || { success: false });
            }
          }
        );
      });
      
      if (response.success && response.authenticated && response.hasSubscription) {
        setIsAuthenticated(true);
        setHasSubscription(true);
        setButtonState('READY');
      } else {
        setIsAuthenticated(false);
        setHasSubscription(false);
        setButtonState('LOCKED');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
      setHasSubscription(false);
      setButtonState('LOCKED');
    } finally {
      setIsLoading(false);
    }
  };


  // Extract the core AI Sort logic into a separate function
  const performAISort = async () => {
    setButtonState('SORTING');
    
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
      // STEP 1: Get authenticated user from session (already validated by handleAISort)
      announcement.textContent = 'Getting session data...';
      
      // Get current page's channel ID
      const currentPageChannelId = YouTubeAccountDetector.getCurrentPageChannelId();
      
      if (!currentPageChannelId) {
        console.error('FolderTube: [AI Sort] ❌ Cannot detect YouTube channel on current page');
        announcement.textContent = '❌ Cannot detect YouTube channel on page';
        announcement.style.background = '#ef4444';
        setTimeout(() => {
          announcement.remove();
          showErrorMessage('Cannot detect YouTube channel. Please try from a YouTube channel page or video.', 'error');
        }, 2000);
        setButtonState('LOCKED');
        return;
      }
      
      console.log('FolderTube: [AI Sort] 🎯 Validating access for channel:', currentPageChannelId);
      
      const sessionResponse = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage(
          { 
            type: 'checkAuthenticationStatus',
            currentPageChannelId: currentPageChannelId
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error('AI Sort: Session check error:', chrome.runtime.lastError);
              resolve({ success: false });
            } else {
              resolve(response || { success: false });
            }
          }
        );
      });
      
      if (!sessionResponse.success || !sessionResponse.authenticated || !sessionResponse.hasSubscription) {
        console.error('FolderTube: [AI Sort] ❌ SECURITY VIOLATION: Invalid session or no subscription');
        console.error('FolderTube: [AI Sort] Session details:', {
          success: sessionResponse.success,
          authenticated: sessionResponse.authenticated,
          hasSubscription: sessionResponse.hasSubscription
        });
        
        announcement.textContent = '❌ Authentication or subscription required';
        announcement.style.background = '#ef4444';
        setTimeout(() => {
          announcement.remove();
          showErrorMessage('Valid subscription required to use AI Sort', 'error');
        }, 2000);
        setButtonState('LOCKED');
        return;
      }
      
      const currentAuth = {
        email: sessionResponse.email,
        channelId: sessionResponse.channelId,
        channelName: sessionResponse.channelName || 'Unknown'
      };
      
      console.log('FolderTube: [AI Sort] Using session data:', {
        email: currentAuth.email.substring(0, 10) + '...',
        channelId: currentAuth.channelId.substring(0, 15) + '...'
      });
      
      // Authentication and account validation already handled by handleAISort
      // Session data is our source of truth
      
      console.log('FolderTube: [AI Sort] ✅ Authentication and subscription verified via session');
      
      // Subscription check already handled by handleAIAuthentication
      
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
      
      
      // Usage tracking is handled by the session service
      
      // Save folders using background script
      console.log('FolderTube: [AI Sort] Saving folders with auth:', {
        email: currentAuth.email?.substring(0, 15) + '...',
        channelId: currentAuth.channelId?.substring(0, 20) + '...'
      });
      
      const saveResult = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({
          type: 'saveFolders',
          folders: createdFolders,
          auth: currentAuth
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Save folders error:', chrome.runtime.lastError);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false });
          }
        });
      });
      
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
      setButtonState('READY');
    }
  };

  const handleAISort = async () => {
    // Block clicks based on current state
    if (buttonState === 'SORTING' || buttonState === 'AUTHENTICATING') return;
    
    // If locked, show paywall modal for authentication
    if (buttonState === 'LOCKED') {
      showPaywallModal();
      return;
    }
    
    // If ready, proceed with AI Sort
    if (buttonState === 'READY') {
      console.log('AI Sort: Starting AI categorization');
      await performAISort();
      return;
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      height: '100%'
    }}>
      {/* Single AI Sort button handles everything */}
      {isLoading ? (
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
          Loading...
        </div>
      ) : (
        /* Show AI Sort button for everyone - it handles auth internally */
        <>
          {/* AI Sort Button with State-Based Rendering */}
          <button
            onClick={handleAISort}
            disabled={buttonState === 'SORTING' || buttonState === 'AUTHENTICATING'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: buttonState === 'LOCKED' 
                ? 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)'
                : 'linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: buttonState === 'SORTING' || buttonState === 'AUTHENTICATING' 
                ? 'not-allowed' 
                : buttonState === 'LOCKED' 
                  ? 'pointer'
                  : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: buttonState === 'LOCKED'
                ? '0 2px 8px rgba(107, 114, 128, 0.3)'
                : '0 2px 8px rgba(109, 40, 217, 0.3)',
              opacity: buttonState === 'SORTING' || buttonState === 'AUTHENTICATING' ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (buttonState !== 'SORTING' && buttonState !== 'AUTHENTICATING') {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = buttonState === 'LOCKED'
                  ? '0 4px 12px rgba(107, 114, 128, 0.4)'
                  : '0 4px 12px rgba(109, 40, 217, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = buttonState === 'LOCKED'
                ? '0 2px 8px rgba(107, 114, 128, 0.3)'
                : '0 2px 8px rgba(109, 40, 217, 0.3)';
            }}
          >
            {buttonState === 'LOCKED' && (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,17C10.89,17 10,16.1 10,15C10,13.89 10.89,13 12,13A2,2 0 0,1 14,15A2,2 0 0,1 12,17M18,20V10H6V20H18M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
                </svg>
Sign In to Use AI Sort
              </>
            )}
            {buttonState === 'AUTHENTICATING' && (
              <>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Authenticating...
              </>
            )}
            {buttonState === 'READY' && (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16 6.5 6.5 0 1 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5Z" 
                    fill="currentColor"/>
                  <circle cx="9.5" cy="9.5" r="2.5" fill="#10b981"/>
                  <circle cx="19" cy="19" r="2" fill="currentColor"/>
                </svg>
                AI Sort
              </>
            )}
            {buttonState === 'SORTING' && (
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
            )}
          </button>
          
          {/* Collections Button - Show when authenticated and has subscription */}
          {isAuthenticated && hasSubscription && (
            <button
              id="collections-button"
              onClick={async () => {
                // Lazy load folders if not already loaded
                if (folders.length === 0) {
                  console.log('🔍 Collections clicked - loading folders on demand...');
                  try {
                    const folderData = await new Promise<any>((resolve) => {
                      chrome.runtime.sendMessage({ type: 'loadFolders' }, (response) => {
                        if (chrome.runtime.lastError) {
                          console.error('Load folders error:', chrome.runtime.lastError);
                          resolve({ success: false });
                        } else {
                          resolve(response || { success: false });
                        }
                      });
                    });
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
          )}
        </>
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
