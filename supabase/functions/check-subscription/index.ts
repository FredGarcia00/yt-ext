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
    const { email } = await req.json()
    
    console.log('Checking subscription for email:', email)

    if (!email) {
      return new Response(
        JSON.stringify({ hasSubscription: false, error: 'Email required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // For now, let's check if this is your paid account email
    const paidEmails = [
      'fredgonzalezgonzalez15@gmail.com',
      'fredgarcia00@gmail.com'  // Add your actual paid email here
    ]
    
    const hasSubscription = paidEmails.includes(email.toLowerCase().trim())
    
    console.log('Subscription check result:', { email, hasSubscription })

    return new Response(
      JSON.stringify({ hasSubscription }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error checking subscription:', error)
    return new Response(
      JSON.stringify({ hasSubscription: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})