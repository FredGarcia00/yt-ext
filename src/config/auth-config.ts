/**
 * Authentication Configuration - Server-Side Validation
 * Simplified for server-based token validation only
 */

// Environment-based configuration
const ENV = process.env.NODE_ENV || 'production';

// Server endpoints for different environments
const SERVER_ENDPOINTS = {
  production: {
    api: 'https://eqwcmgtfprcixhcjxskf.supabase.co/functions/v1'
  },
  development: {
    api: 'http://localhost:3001'
  }
};

// Get current environment endpoints
const CURRENT_ENV = SERVER_ENDPOINTS[ENV as keyof typeof SERVER_ENDPOINTS] || SERVER_ENDPOINTS.production;

export const AUTH_CONFIG = {
  // Server validation endpoint
  VALIDATE_TOKEN_URL: `${CURRENT_ENV.api}/authenticate-youtube-channel`,
  
  // Token configuration
  TOKEN: {
    // Token expiry (24 hours in milliseconds)
    EXPIRY: 24 * 60 * 60 * 1000,
    
    // Refresh threshold (refresh if less than 6 hours remaining)
    REFRESH_THRESHOLD: 6 * 60 * 60 * 1000
  },
  
  // UI Messages
  MESSAGES: {
    AUTH_REQUIRED: 'Please authenticate with your Google account to use AI features',
    AUTH_SUCCESS: 'Successfully authenticated! You can now use AI features.',
    AUTH_FAILED: 'Authentication failed. Please try again.',
    TOKEN_EXPIRED: 'Your authentication has expired. Please sign in again.',
    SERVER_ERROR: 'Unable to validate authentication. Please try again.',
    SUBSCRIPTION_REQUIRED: 'A FolderTube Pro subscription is required to use this feature.'
  }
};