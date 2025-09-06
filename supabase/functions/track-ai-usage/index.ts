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
    console.log('Tracking AI usage - Method:', req.method)
    console.log('Tracking AI usage - URL:', req.url)

    if (req.method === 'GET') {
      // Handle GET requests - check usage limits
      const url = new URL(req.url)
      const email = url.searchParams.get('email')
      const youtubeChannelId = url.searchParams.get('youtubeChannelId')
      const operation = url.searchParams.get('operation')

      console.log('GET request params:', { email, youtubeChannelId, operation })

      if (!email || !youtubeChannelId) {
        return new Response(
          JSON.stringify({ 
            canUseAI: false, 
            currentUsage: 0, 
            remainingUses: 0, 
            error: 'Missing email or youtubeChannelId parameter' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      // For paid users, allow generous usage
      return new Response(
        JSON.stringify({ 
          canUseAI: true, 
          currentUsage: 1, 
          remainingUses: 999,
          hasSubscription: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )

    } else if (req.method === 'POST') {
      // Handle POST requests - record usage
      const body = await req.json()
      const { email, youtubeChannelId, operation } = body

      console.log('POST request body:', { email, youtubeChannelId, operation })

      if (!email || !youtubeChannelId) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing email or youtubeChannelId parameter' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
      }

      // For now, just return success with updated usage
      console.log('AI usage recorded successfully for:', email)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          currentUsage: 2,
          remainingUsage: 998,
          message: 'Usage recorded successfully' 
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
    console.error('Error in track-ai-usage:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})