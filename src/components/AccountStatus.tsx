import React, { useState, useEffect } from 'react';
import { SubscriptionService } from '../utils/subscription-service';
import { AccountMonitor } from '../utils/account-monitor';

interface AccountStatusProps {
  onClose?: () => void;
  isInline?: boolean;
}

const AccountStatus: React.FC<AccountStatusProps> = ({ onClose, isInline = false }) => {
  const [email, setEmail] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'expired' | 'none'>('none');
  const [loading, setLoading] = useState(true);
  const [showingPortal, setShowingPortal] = useState(false);

  useEffect(() => {
    loadAccountInfo();
  }, []);

  const loadAccountInfo = async () => {
    try {
      setLoading(true);
      
      // Get account ID and session verification
      const extensionAccountId = await AccountMonitor.getExtensionAccountId();
      setAccountId(extensionAccountId);
      
      console.log('FolderTube: [Account Status] Extension Account ID:', extensionAccountId);
      
      // Verify account session
      const sessionVerification = await AccountMonitor.verifyAccountSession();
      console.log('FolderTube: [Account Status] Session verification:', sessionVerification);
      
      if (!sessionVerification.isValid) {
        console.log('FolderTube: [Account Status] No valid session');
        setSubscriptionStatus('none');
        setEmail(null);
        return;
      }
      
      // Get subscription email from storage
      const stored = await chrome.storage.local.get(['subscriptionEmail']);
      const currentEmail = stored.subscriptionEmail;
      
      if (currentEmail) {
        setEmail(currentEmail);
        
        // Check subscription status through background script
        const hasSubscription = await SubscriptionService.checkSubscription();
        console.log('FolderTube: [Account Status] Subscription status:', hasSubscription);
        
        if (hasSubscription) {
          setSubscriptionStatus('active');
        } else {
          setSubscriptionStatus('expired');
        }
      } else {
        setSubscriptionStatus('none');
      }
    } catch (error) {
      console.error('FolderTube: [Account Status] Error loading account info:', error);
      setSubscriptionStatus('none');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out? This will clear all your data and subscription info.')) {
      console.log('FolderTube: [Account Status] User logout initiated');
      
      // Use AccountMonitor to clear all user data
      await AccountMonitor.logout();
      
      // Reload the component to reflect changes
      loadAccountInfo();
      
      // Trigger page refresh to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };


  const handleChangeEmail = async () => {
    const newEmail = prompt(
      'Enter your FolderTube subscription email address:\n\nThis will be tied to this Chrome profile for security.',
      email || ''
    );
    
    if (newEmail && newEmail.includes('@')) {
      setLoading(true);
      
      try {
        // Save new email and create session
        const response = await chrome.runtime.sendMessage({ 
          type: 'saveSubscriptionEmail', 
          email: newEmail.trim().toLowerCase() 
        });
        
        if (!response.success) {
          alert(response.error || 'Failed to save email');
          return;
        }
        
        console.log('FolderTube: [Account Status] Email updated successfully');
        
        // Reload account info after a moment
        setTimeout(() => {
          loadAccountInfo();
        }, 500);
      } catch (error) {
        console.error('FolderTube: [Account Status] Error updating email:', error);
        alert('Failed to update email. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleManageSubscription = () => {
    setShowingPortal(true);
    
    // Create a nice modal for subscription management
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 40px;
        border-radius: 16px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      ">
        <h2 style="color: #6d28d9; margin-bottom: 20px; font-size: 24px;">
          💳 Manage Your Subscription
        </h2>
        
        <p style="color: #666; margin-bottom: 30px; line-height: 1.6;">
          Your subscription email: <strong>${email}</strong>
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px;">
          <button onclick="window.open('https://buy.stripe.com/test_00weV6f5d6rh3Ii9nVdZ601', '_blank')" style="
            background: #10b981;
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            font-weight: 600;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
            🔄 Renew Subscription
          </button>
          
          <button onclick="window.open('https://billing.stripe.com/p/login', '_blank')" style="
            background: white;
            color: #6d28d9;
            border: 2px solid #6d28d9;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
          " onmouseover="this.style.background='#6d28d9'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='#6d28d9'">
            ⚙️ Billing Portal
          </button>
          
          <button onclick="window.open('mailto:support@foldertube.com?subject=Subscription Support&body=My subscription email: ${email}', '_blank')" style="
            background: white;
            color: #f59e0b;
            border: 2px solid #f59e0b;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
          " onmouseover="this.style.background='#f59e0b'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='#f59e0b'">
            📧 Contact Support
          </button>
        </div>
        
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: #f3f4f6;
          color: #6b7280;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">
          Close
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Remove modal when clicked outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    setShowingPortal(false);
  };

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#666'
      }}>
        Loading account info...
      </div>
    );
  }

  const containerStyle = isInline ? {
    padding: '15px',
    background: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '20px'
  } : {
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
    margin: '20px auto'
  };

  return (
    <div style={containerStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: '#374151'
        }}>
          Account Status
        </h3>
        {!isInline && onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#9ca3af'
            }}
          >
            ×
          </button>
        )}
      </div>
      
      {/* Account ID Info */}
      {accountId && (
        <div style={{
          marginBottom: '15px',
          padding: '10px',
          background: '#f0fdf4',
          borderRadius: '8px',
          fontSize: '13px'
        }}>
          <div style={{ fontWeight: '600', color: '#16a34a', marginBottom: '4px' }}>
            ✓ Chrome Profile Account
          </div>
          <div style={{ color: '#15803d', fontFamily: 'monospace', fontSize: '11px' }}>
            ID: {accountId.substring(0, 20)}...
          </div>
        </div>
      )}
      
      {subscriptionStatus === 'none' ? (
        <div>
          <p style={{ color: '#6b7280', marginBottom: '15px' }}>
            No subscription found
          </p>
          <button
            onClick={handleChangeEmail}
            style={{
              background: '#6d28d9',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Sign in with subscription email
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '15px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: subscriptionStatus === 'active' ? '#10b981' : '#ef4444'
              }}></span>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: subscriptionStatus === 'active' ? '#10b981' : '#ef4444'
              }}>
                {subscriptionStatus === 'active' ? 'Active Subscription' : 'Expired Subscription'}
              </span>
            </div>
            
            <div style={{
              fontSize: '13px',
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              Subscription: {email}
            </div>
            
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              marginBottom: '4px',
              fontStyle: 'italic'
            }}>
              Tied to this Chrome profile
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={handleManageSubscription}
              disabled={showingPortal}
              style={{
                background: 'white',
                color: '#6d28d9',
                border: '1px solid #6d28d9',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: showingPortal ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                opacity: showingPortal ? 0.5 : 1
              }}
            >
              {showingPortal ? 'Loading...' : 'Manage Subscription'}
            </button>
            
            <button
              onClick={handleChangeEmail}
              style={{
                background: 'white',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Change Email
            </button>
            
            <button
              onClick={handleSignOut}
              style={{
                background: 'white',
                color: '#ef4444',
                border: '1px solid #fecaca',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Sign Out
            </button>
          </div>
          
          {subscriptionStatus === 'expired' && (
            <div style={{
              marginTop: '15px',
              padding: '10px',
              background: '#fef2f2',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#991b1b'
            }}>
              Your subscription has expired. 
              <button
                onClick={() => window.open('https://buy.stripe.com/test_00weV6f5d6rh3Ii9nVdZ601', '_blank')}
                style={{
                  marginLeft: '8px',
                  color: '#6d28d9',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: '600'
                }}
              >
                Renew now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountStatus;