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

    // Use Gmail SMTP (using same credentials as Supabase SMTP config)
    // Get Gmail credentials from environment variables
    const gmailUser = Deno.env.get('GMAIL_USER') || Deno.env.get('SMTP_USER')
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD') || Deno.env.get('SMTP_PASSWORD')
    
    if (!gmailUser || !gmailAppPassword) {
      console.error('❌ Gmail credentials not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Gmail SMTP not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      console.log('Sending email via Gmail SMTP...')
      
      // Use denomailer library for SMTP email sending
      const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')
      
      const client = new SMTPClient({
        connection: {
          hostname: 'smtp.gmail.com',
          port: 465, // Use implicit TLS to avoid STARTTLS handshake issues on 587
          tls: true,
          auth: {
            username: gmailUser,
            password: gmailAppPassword,
          },
        },
      })
      
      await client.send({
        from: gmailUser,
        to: email,
        subject: emailSubject,
        content: plainTextBody,
        html: emailBody,
      })
      
      await client.close()
      
      console.log('✅ Email sent successfully via Gmail SMTP')
      return new Response(
        JSON.stringify({ success: true, message: 'Reset code email sent successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
      
    } catch (gmailError) {
      console.error('❌ Gmail SMTP error:', gmailError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to send email: ${gmailError.message || 'Unknown error'}` 
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

