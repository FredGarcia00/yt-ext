/**
 * Supabase Configuration
 * Centralizes all Supabase-related configuration
 * Uses environment variables for security
 */

interface SupabaseConfig {
  URL: string;
  ANON_KEY: string;
}

// For Chrome extensions, we need to handle env variables differently
// During build, these will be replaced by Vite
const getConfig = (): SupabaseConfig => {
  // Check if running in extension context
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    // In production, these should be injected during build
    return {
      URL: import.meta.env.VITE_SUPABASE_URL || '',
      ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    };
  }
  
  // Development fallback
  return {
    URL: import.meta.env.VITE_SUPABASE_URL || '',
    ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  };
};

export const SUPABASE_CONFIG = getConfig();

// Validate configuration
if (!SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.ANON_KEY) {
  console.warn('FolderTube: Supabase configuration is incomplete. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

// Helper function to check if config is valid
export const isSupabaseConfigured = (): boolean => {
  return Boolean(SUPABASE_CONFIG.URL && SUPABASE_CONFIG.ANON_KEY);
};