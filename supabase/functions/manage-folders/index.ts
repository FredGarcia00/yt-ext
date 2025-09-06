import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Managing folders - Method:', req.method)
    console.log('Managing folders - URL:', req.url)

    if (req.method === 'GET') {
      // Handle GET requests - load folders
      const url = new URL(req.url)
      const email = url.searchParams.get('email')
      const youtubeChannelId = url.searchParams.get('youtubeChannelId')
      const operation = url.searchParams.get('operation')

      console.log('GET request params:', { email, youtubeChannelId, operation })

      if (!email || !youtubeChannelId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing email or youtubeChannelId parameter',
            folders: [] 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      // For now, return empty folders array (no persistent storage yet)
      return new Response(
        JSON.stringify({ 
          success: true, 
          folders: [] 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

    } else if (req.method === 'POST') {
      // Handle POST requests - save folders
      const body = await req.json()
      const { email, youtubeChannelId, folderName, channelIds, folderMetadata, operation } = body

      console.log('POST request body:', { email, youtubeChannelId, folderName, operation })

      if (!email || !youtubeChannelId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing youtubeChannelId or email parameter' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      // For now, just return success (no persistent storage yet)
      console.log('Folder save success:', { folderName, channelCount: channelIds?.length || 0 })
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Folder saved successfully' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

    } else if (req.method === 'DELETE') {
      // Handle DELETE requests - delete folders
      const body = await req.json()
      const { email, youtubeChannelId, folderName, operation } = body

      console.log('DELETE request body:', { email, youtubeChannelId, folderName, operation })

      if (!email || !youtubeChannelId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing youtubeChannelId or email parameter' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      // For now, just return success
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Folder deleted successfully' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405
      }
    )

  } catch (error) {
    console.error('Error in manage-folders:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})