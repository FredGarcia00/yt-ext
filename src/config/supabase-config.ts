/**
 * Supabase Configuration
 * Uses environment variables for security
 * Re-exports from the main config file
 */

import { SUPABASE_CONFIG as CONFIG } from './supabase.config';

export const SUPABASE_CONFIG = {
  // Your Supabase project URL from env
  url: CONFIG.URL,
  
  // Your Supabase anon public key from env
  anonKey: CONFIG.ANON_KEY,
  
  // Edge Function URL for YouTube API proxy
  get youtubeApiUrl() {
    return `${this.url}/functions/v1/youtube-proxy`;
  }
};

// Note: YouTube API key should be configured in Supabase Edge Function environment variables
// Never expose API keys in client-side code