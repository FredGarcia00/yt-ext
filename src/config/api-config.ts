/**
 * API Configuration
 * This file is simplified since API keys are now handled server-side via Supabase
 */

export class ApiConfig {
  /**
   * Legacy method - kept for compatibility
   * Always returns null since API keys are handled by Supabase
   */
  static async getYouTubeApiKey(): Promise<string | null> {
    console.log('FolderTube: API keys are now handled by Supabase proxy');
    return null;
  }
  
  /**
   * Legacy method - no longer stores API keys client-side
   */
  static async setYouTubeApiKey(_apiKey: string): Promise<void> {
    console.log('FolderTube: API key configuration has been moved to Supabase');
    // No-op - API keys are managed server-side
  }
  
  /**
   * Legacy method - no longer needed
   */
  static async clearYouTubeApiKey(): Promise<void> {
    console.log('FolderTube: API key configuration has been moved to Supabase');
    // No-op - API keys are managed server-side
  }
}