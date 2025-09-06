import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from '../config/supabase.config'

// Get Supabase configuration from environment variables
const supabaseUrl = SUPABASE_CONFIG.URL
const supabaseAnonKey = SUPABASE_CONFIG.ANON_KEY

// Create client with auth disabled to prevent any authentication popups
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false // This prevents Supabase from checking URL for auth
  }
})

export class SupabaseYouTubeAPI {
  private static readonly FUNCTION_URL = `${supabaseUrl}/functions/v1/youtube-proxy`

  static async getChannelVideos(channelId: string, channelName: string): Promise<any> {
    const params = new URLSearchParams({
      action: 'get-channel-videos',
      channelId,
      channelName
    })

    try {
      const response = await fetch(`${this.FUNCTION_URL}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Supabase YouTube API error:', error)
      throw error
    }
  }

  static async searchChannels(query: string): Promise<any> {
    const params = new URLSearchParams({
      action: 'search-channels',
      q: query
    })

    try {
      const response = await fetch(`${this.FUNCTION_URL}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Supabase channel search error:', error)
      throw error
    }
  }

  static async getChannelDetails(channelIds: string[]): Promise<any> {
    const params = new URLSearchParams({
      action: 'get-channel-details',
      ids: channelIds.join(',')
    })

    try {
      const response = await fetch(`${this.FUNCTION_URL}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Supabase channel details error:', error)
      throw error
    }
  }
}