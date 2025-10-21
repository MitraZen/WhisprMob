import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const { to, notification, data } = await req.json()

    if (!to || !notification) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, notification' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get FCM server key from environment
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
    if (!fcmServerKey) {
      console.error('FCM_SERVER_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'FCM server key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare FCM message
    const fcmMessage = {
      to,
      notification: {
        title: notification.title,
        body: notification.body,
        sound: 'default',
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      data: data || {},
      priority: 'high',
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          default_sound: true,
          default_vibrate_timings: true,
          default_light_settings: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    }

    console.log('Sending FCM message:', JSON.stringify(fcmMessage, null, 2))

    // Send to FCM
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmMessage),
    })

    const fcmResult = await fcmResponse.json()
    console.log('FCM response:', fcmResult)

    if (!fcmResponse.ok) {
      console.error('FCM error:', fcmResult)
      return new Response(
        JSON.stringify({ error: 'Failed to send FCM notification', details: fcmResult }),
        { 
          status: fcmResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, fcmResult }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-fcm-notification function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

