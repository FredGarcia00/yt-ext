// Supabase backend service for Chrome extension

import { SUPABASE_CONFIG } from '../config/supabase.config'

const SUPABASE_URL = SUPABASE_CONFIG.URL
const SUPABASE_ANON_KEY = SUPABASE_CONFIG.ANON_KEY

export class SupabaseBackend {
  private static currentEmail: string | null = null
  private static currentChannelId: string | null = null

  // Authenticate YouTube channel and bind to email
  static async authenticateYouTubeChannel(email: string, channelId: string, channelName: string, accessToken: string): Promise<any> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/authenticate-youtube-channel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          youtubeChannelId: channelId,
          channelName,
          accessToken
        })
      })

      const data = await response.json()
      if (data.success) {
        this.currentEmail = email
        this.currentChannelId = channelId
        // Store in Chrome storage for persistence
        await chrome.storage.local.set({
          authenticatedEmail: email,
          authenticatedChannelId: channelId
        })
      }
      return data
    } catch (error) {
      console.error('Authentication error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Check subscription and usage limits
  static async checkUsageLimits(): Promise<any> {
    const { email, channelId } = await this.getCredentials()
    if (!email || !channelId) {
      return { hasSubscription: false, canUseAI: false, error: 'Not authenticated' }
    }

    try {
      const params = new URLSearchParams({
        email,
        youtubeChannelId: channelId,
        operation: 'check'
      })

      const response = await fetch(`${SUPABASE_URL}/functions/v1/track-usage-limits?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      return await response.json()
    } catch (error) {
      console.error('Usage check error:', error)
      return { hasSubscription: false, canUseAI: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Record AI usage
  static async recordAIUsage(): Promise<any> {
    const { email, channelId } = await this.getCredentials()
    if (!email || !channelId) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/track-usage-limits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          youtubeChannelId: channelId,
          operation: 'record'
        })
      })

      return await response.json()
    } catch (error) {
      console.error('Usage recording error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Get folders from backend
  static async getFolders(): Promise<any> {
    const { email, channelId } = await this.getCredentials()
    if (!email || !channelId) {
      return { success: false, folders: [], error: 'Not authenticated' }
    }

    try {
      const params = new URLSearchParams({
        email,
        youtubeChannelId: channelId,
        operation: 'get'
      })

      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-user-folders?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      return data.folders || []
    } catch (error) {
      console.error('Get folders error:', error)
      return []
    }
  }

  // Save folder to backend
  static async saveFolder(folderName: string, channelIds: string[], metadata?: any): Promise<any> {
    const { email, channelId } = await this.getCredentials()
    if (!email || !channelId) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-user-folders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          youtubeChannelId: channelId,
          folderName,
          channelIds,
          folderMetadata: metadata || {},
          operation: 'save'
        })
      })

      return await response.json()
    } catch (error) {
      console.error('Save folder error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Delete folder from backend
  static async deleteFolder(folderName: string): Promise<any> {
    const { email, channelId } = await this.getCredentials()
    if (!email || !channelId) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/manage-user-folders`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          youtubeChannelId: channelId,
          folderName,
          operation: 'delete'
        })
      })

      return await response.json()
    } catch (error) {
      console.error('Delete folder error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Check subscription status
  static async checkSubscription(email: string): Promise<any> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      return await response.json()
    } catch (error) {
      console.error('Subscription check error:', error)
      return { hasSubscription: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Helper to get current credentials (made public for auth service)
  static async getCredentials(): Promise<{ email: string | null, channelId: string | null }> {
    try {
      // Always check Chrome storage first to get fresh data
      const stored = await chrome.storage.local.get(['authenticatedEmail', 'authenticatedChannelId'])
      
      if (stored.authenticatedEmail && stored.authenticatedChannelId) {
        this.currentEmail = stored.authenticatedEmail
        this.currentChannelId = stored.authenticatedChannelId
        return { email: this.currentEmail, channelId: this.currentChannelId }
      }
      
      return { email: null, channelId: null }
    } catch (error) {
      console.error('FolderTube: [Backend] Failed to get credentials:', error);
      return { email: null, channelId: null }
    }
  }

  // Clear authentication
  static async clearAuthentication() {
    this.currentEmail = null
    this.currentChannelId = null
    await chrome.storage.local.remove(['authenticatedEmail', 'authenticatedChannelId'])
  }
}