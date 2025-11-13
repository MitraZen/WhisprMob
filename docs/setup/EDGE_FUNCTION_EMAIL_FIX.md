# Edge Function Email Sending Fix

## 🔴 **Issue: Emails Not Being Sent**

The Edge Function was trying to use `supabase.functions.invoke('send-email')` which doesn't exist in Supabase. This has been fixed.

## ✅ **Solution: Use Third-Party Email Service**

The Edge Function now supports multiple email service providers. Choose one:

### **Option 1: SendGrid (Recommended)**

1. **Sign up for SendGrid** (free tier: 100 emails/day)
2. **Get API Key:**
   - Go to SendGrid Dashboard → Settings → API Keys
   - Create API Key with "Mail Send" permissions
   - Copy the API key

3. **Configure in Supabase Edge Function:**
   - Go to Supabase Dashboard → Edge Functions → `send-reset-code-email`
   - Click "Settings" or "Secrets"
   - Add environment variable:
     - Name: `SENDGRID_API_KEY`
     - Value: `your-sendgrid-api-key`
   - Add environment variable:
     - Name: `SENDGRID_FROM_EMAIL`
     - Value: `noreply@yourdomain.com` (must be verified in SendGrid)

4. **Redeploy the function**

### **Option 2: Resend (Alternative)**

1. **Sign up for Resend** (free tier: 3,000 emails/month)
2. **Get API Key:**
   - Go to Resend Dashboard → API Keys
   - Create API Key
   - Copy the key

3. **Configure in Supabase Edge Function:**
   - Add environment variable:
     - Name: `RESEND_API_KEY`
     - Value: `your-resend-api-key`
   - Add environment variable:
     - Name: `RESEND_FROM_EMAIL`
     - Value: `Whispr <noreply@yourdomain.com>`

4. **Redeploy the function**

### **Option 3: Use Supabase SMTP (If Configured)**

If you have SMTP configured in Supabase Dashboard, the function will try to use it, but Supabase doesn't provide a direct email API. You'll need to use one of the above options.

## 🧪 **Testing**

1. **Request password reset** in the app
2. **Check Edge Function logs:**
   - Go to Supabase Dashboard → Edge Functions → `send-reset-code-email` → Logs
   - Look for "Email sent via SendGrid" or "Email sent via Resend"
3. **Check your email inbox** (and spam folder)

## 🐛 **Troubleshooting**

### **No Email Service Configured**
- **Symptom**: Logs show "⚠️ No email service configured"
- **Fix**: Add `SENDGRID_API_KEY` or `RESEND_API_KEY` environment variable

### **SendGrid Errors**
- **401 Unauthorized**: API key is incorrect
- **403 Forbidden**: API key doesn't have "Mail Send" permission
- **400 Bad Request**: From email not verified in SendGrid

### **Function Not Being Called**
- Check that the function name is exactly `send-reset-code-email`
- Check Edge Function logs for errors
- Verify the function is deployed

## 📝 **Quick Setup (SendGrid)**

```bash
# 1. Sign up at sendgrid.com
# 2. Get API key from dashboard
# 3. In Supabase Dashboard:
#    - Edge Functions → send-reset-code-email → Settings
#    - Add Secret: SENDGRID_API_KEY = your-key
#    - Add Secret: SENDGRID_FROM_EMAIL = verified-email@domain.com
# 4. Redeploy function
# 5. Test password reset
```

---

*After configuring email service, password reset emails will be sent with the 6-digit code!*


