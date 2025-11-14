# 📧 Resend Email Setup Guide

## 🎯 Overview

This guide will help you set up Resend for sending password reset emails in your Whispr app.

## ✅ Why Resend?

- **Free Tier**: 3,000 emails/month (100 emails/day)
- **Simple API**: Easy to integrate with Supabase Edge Functions
- **Great Deliverability**: High inbox placement rates
- **Developer-Friendly**: Clean API and excellent documentation

## 🚀 Step-by-Step Setup

### Step 1: Create Resend Account

1. **Sign up for Resend**
   - Visit: https://resend.com
   - Click "Sign Up" and create your account
   - Verify your email address

### Step 2: Get Your API Key

1. **Navigate to API Keys**
   - Go to Resend Dashboard: https://resend.com/api-keys
   - Click **"Create API Key"**

2. **Configure API Key**
   - **Name**: `Whispr Password Reset` (or any name you prefer)
   - **Permission**: Select **"Sending access"**
   - Click **"Add"**

3. **Copy Your API Key**
   - ⚠️ **Important**: Copy the API key immediately - you won't be able to see it again!
   - Format: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 3: Configure Domain (Optional but Recommended)

For production, you should verify your own domain:

1. **Add Domain**
   - Go to: https://resend.com/domains
   - Click **"Add Domain"**
   - Enter your domain (e.g., `yourdomain.com`)

2. **Add DNS Records**
   - Resend will provide DNS records to add:
     - **SPF Record**: `v=spf1 include:resend.com ~all`
     - **DKIM Records**: (provided by Resend)
     - **DMARC Record**: (optional but recommended)

3. **Verify Domain**
   - After adding DNS records, click **"Verify"**
   - Wait for DNS propagation (usually 5-30 minutes)

**Note**: For testing, you can use Resend's default domain: `onboarding@resend.dev` (limited to 100 emails/day)

### Step 4: Configure Supabase Edge Function

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Edge Functions**
   - Click **"Edge Functions"** in the left sidebar
   - Find **`send-reset-code-email`** function
   - Click on it to open

3. **Add Environment Variables**
   - Click **"Settings"** or **"Secrets"** tab
   - Add the following environment variables:

   ```
   RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL = Whispr <noreply@yourdomain.com>
   ```

   **For Testing (using Resend default domain):**
   ```
   RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL = Whispr <onboarding@resend.dev>
   ```

   **For Production (with verified domain):**
   ```
   RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   RESEND_FROM_EMAIL = Whispr <noreply@yourdomain.com>
   ```

4. **Save and Redeploy**
   - Click **"Save"** or **"Deploy"**
   - Wait for deployment to complete

### Step 5: Test the Integration

1. **Request Password Reset**
   - Open your Whispr app
   - Go to "Forgot Password" screen
   - Enter a test email address
   - Click "Send Reset Code"

2. **Check Edge Function Logs**
   - Go to Supabase Dashboard → Edge Functions → `send-reset-code-email`
   - Click **"Logs"** tab
   - Look for: `✅ Email sent successfully via Resend API`

3. **Check Email**
   - Check the recipient's inbox
   - Check spam folder if not in inbox
   - You should see the password reset code email

## 🐛 Troubleshooting

### Error: "Resend API key not configured"

**Solution:**
- Make sure you added `RESEND_API_KEY` in Edge Function settings
- Verify the API key is correct (starts with `re_`)
- Redeploy the function after adding the key

### Error: "Failed to send email: Unauthorized"

**Solution:**
- Check that your API key is correct
- Verify the API key has "Sending access" permission
- Generate a new API key if needed

### Error: "Failed to send email: Invalid 'from' address"

**Solution:**
- For testing: Use `onboarding@resend.dev`
- For production: Verify your domain in Resend first
- Make sure the email format is: `Name <email@domain.com>`

### Email Not Received

**Check:**
1. **Spam Folder**: Check spam/junk folder
2. **Edge Function Logs**: Look for errors in Supabase logs
3. **Resend Dashboard**: Check email logs at https://resend.com/emails
4. **Email Address**: Verify the recipient email is correct

### Rate Limits

**Resend Free Tier Limits:**
- 3,000 emails/month
- 100 emails/day
- If you hit the limit, upgrade to a paid plan

## 📊 Monitoring

### View Email Logs in Resend

1. Go to: https://resend.com/emails
2. See all sent emails with status:
   - ✅ **Delivered**: Email was successfully delivered
   - ⏳ **Pending**: Email is queued for sending
   - ❌ **Bounced**: Email address is invalid
   - 📧 **Opened**: Recipient opened the email

### View Edge Function Logs in Supabase

1. Go to Supabase Dashboard → Edge Functions → `send-reset-code-email`
2. Click **"Logs"** tab
3. See real-time logs of email sending attempts

## 🔒 Security Best Practices

1. **Never commit API keys to Git**
   - API keys are stored in Supabase Edge Function secrets
   - They are encrypted and not visible in code

2. **Use Environment Variables**
   - Always use environment variables for sensitive data
   - Never hardcode API keys in your code

3. **Rotate API Keys Regularly**
   - Generate new API keys periodically
   - Revoke old keys that are no longer in use

4. **Limit API Key Permissions**
   - Only grant "Sending access" permission
   - Don't use admin-level keys for this function

## 📚 Additional Resources

- **Resend Documentation**: https://resend.com/docs
- **Resend API Reference**: https://resend.com/docs/api-reference
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

## ✅ Verification Checklist

- [ ] Resend account created
- [ ] API key generated and copied
- [ ] Domain verified (for production)
- [ ] `RESEND_API_KEY` added to Edge Function
- [ ] `RESEND_FROM_EMAIL` added to Edge Function
- [ ] Edge Function redeployed
- [ ] Test email sent successfully
- [ ] Email received in inbox

## 🎉 Success!

Once you've completed all steps and received a test email, your Resend integration is complete! Your password reset emails will now be sent via Resend's reliable email service.

