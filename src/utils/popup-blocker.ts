// Popup blocker utility to prevent unauthorized popups
export class PopupBlocker {
  private static blockedDomains = [
    'accounts.google.com/gsi', // Google One Tap
    'accounts.google.com/o/oauth2/auth', // Google OAuth
    'accounts.google.com/signin/oauth' // Google Sign-in
  ];

  private static blockedScripts = [
    'accounts.google.com/gsi/client', // Google One Tap client script
    'apis.google.com/js/platform.js' // Google Platform script
  ];

  static init() {
    // Block Google One Tap initialization
    if ((window as any).google) {
      delete (window as any).google.accounts;
    }
    Object.defineProperty(window, 'google', {
      get() {
        return {
          accounts: undefined // Prevent Google One Tap from loading
        };
      },
      set() {
        // Ignore attempts to set google object
      }
    });

    // Override window.open to block unauthorized popups
    const originalOpen = window.open;
    window.open = function(...args: any[]) {
      const url = args[0]?.toString() || '';
      
      // Check if URL contains blocked domains
      const isBlocked = PopupBlocker.blockedDomains.some(domain => 
        url.toLowerCase().includes(domain)
      );
      
      if (isBlocked) {
        console.warn('FolderTube: Blocked unauthorized popup attempt:', url);
        return null;
      }
      
      // Allow YouTube and other whitelisted domains
      const allowedDomains = ['youtube.com', 'googleapis.com', 'supabase.co'];
      const isAllowed = allowedDomains.some(domain => url.includes(domain));
      
      if (!url || isAllowed) {
        return originalOpen.apply(window, args as any);
      }
      
      console.warn('FolderTube: Blocked unknown popup:', url);
      return null;
    };

    // Monitor for iframe and script injections
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // Block iframes
          if (node instanceof HTMLIFrameElement) {
            const src = node.src || '';
            const isBlocked = PopupBlocker.blockedDomains.some(domain => 
              src.toLowerCase().includes(domain)
            );
            
            if (isBlocked) {
              console.warn('FolderTube: Removing unauthorized iframe:', src);
              node.remove();
            }
          }
          
          // Block scripts
          if (node instanceof HTMLScriptElement) {
            const src = node.src || '';
            const isBlocked = PopupBlocker.blockedScripts.some(script => 
              src.toLowerCase().includes(script)
            );
            
            if (isBlocked) {
              console.warn('FolderTube: Removing unauthorized script:', src);
              node.remove();
            }
          }

          // Block Google One Tap divs
          if (node instanceof HTMLDivElement) {
            const id = node.id || '';
            const className = node.className || '';
            
            // Check for Google One Tap specific identifiers
            if (id === 'credential_picker_container' || 
                id === 'g_id_onload' ||
                className.includes('g_id_') ||
                className.includes('g-signin') ||
                node.hasAttribute('data-client_id')) {
              console.warn('FolderTube: Removing Google One Tap element');
              node.remove();
            }
            
          }
        });
      });
    });

    // Start observing the document
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      // Wait for body to be available
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    }

    console.log('FolderTube: Popup blocker initialized');
  }
}