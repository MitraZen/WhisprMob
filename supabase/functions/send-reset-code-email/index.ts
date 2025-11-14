// Supabase Edge Function to send password reset code email
// Deploy this function in Supabase Dashboard: Edge Functions > New Function
// @ts-nocheck - Deno types are not available in TypeScript, but this works in Deno runtime

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
    const { email, code } = await req.json()

    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key (for admin operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Email content
    const emailSubject = 'Your Whispr Password Reset Code'
    const plainTextBody = [
      'Reset Your Password',
      '',
      `Your reset code is: ${code}`,
      '',
      'Enter this 6-digit code in the app to reset your password.',
      'This code expires in 15 minutes.',
      '',
      'If you didn\'t request this, you can ignore this email.',
      '',
      '— The Whispr Team',
    ].join('\n')
    const emailBody = `
      <h2>Reset Your Password</h2>
      <p>You requested to reset your password for your Whispr account.</p>
      <p style="font-size: 24px; font-weight: bold; color: #007AFF; text-align: center; padding: 20px; background: #f0f9ff; border-radius: 8px; margin: 20px 0;">
        Your reset code is: <strong>${code}</strong>
      </p>
      <p>Enter this 6-digit code in the app to reset your password.</p>
      <p><strong>This code will expire in 15 minutes.</strong></p>
      <p>If you didn't request this, please ignore this email.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">This is an automated message from Whispr. Please do not reply.</p>
    `.trim()

    // Use Resend API for email sending
    // Get Resend credentials from environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Whispr <noreply@resend.dev>'
    
    if (!resendApiKey) {
      console.error('❌ Resend API key not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Resend API not configured. Please set RESEND_API_KEY environment variable in Supabase Edge Function settings.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      console.log('Sending email via Resend API...')
      
      // Call Resend API
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFromEmail,
          to: [email],
          subject: emailSubject,
          text: plainTextBody,
          html: emailBody,
        }),
      })

      const resendData = await resendResponse.json()

      if (!resendResponse.ok) {
        console.error('❌ Resend API error:', resendData)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to send email: ${resendData.message || 'Unknown error'}` 
          }),
          { status: resendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('✅ Email sent successfully via Resend API:', resendData)
      return new Response(
        JSON.stringify({ success: true, message: 'Reset code email sent successfully', data: resendData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
      
    } catch (resendError) {
      console.error('❌ Resend API error:', resendError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to send email: ${resendError.message || 'Unknown error'}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

