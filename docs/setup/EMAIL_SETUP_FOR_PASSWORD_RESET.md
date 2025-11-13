# Email Setup for Password Reset Codes

## 🔴 **CRITICAL: Email Not Sending**

The password reset code system is implemented, but **emails are not being sent** because we removed the call to Supabase's `/auth/v1/recover` endpoint (which was sending GitHub links).

## ✅ **Solution Options**

### **Option 1: Supabase Edge Function (Recommended)**

Create a Supabase Edge Function to send emails with the reset code.

#### **Step 1: Create Edge Function**

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **"New Function"**
3. Name it: `send-reset-code-email`
4. Copy the code from `supabase/functions/send-reset-code-email/index.ts`
5. Deploy the function

#### **Step 2: Configure Environment Variables**

The Edge Function needs these environment variables (set in Supabase Dashboard):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (from Settings → API)

#### **Step 3: Configure SMTP**

1. Go to **Supabase Dashboard** → **Authentication** → **Settings** → **SMTP Settings**
2. Configure your SMTP provider (Gmail, SendGrid, Mailgun, etc.)
3. Test the configuration

#### **Step 4: Test**

The app will automatically call this Edge Function when generating reset codes.

---

### **Option 2: Database Function with Email Extension**

Create a PostgreSQL function that sends emails using `pg_net` extension.

#### **Step 1: Enable pg_net Extension**

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

#### **Step 2: Create Email Function**

```sql
CREATE OR REPLACE FUNCTION send_reset_code_email(user_email TEXT, reset_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  email_body TEXT;
  email_subject TEXT;
  webhook_url TEXT;
BEGIN
  email_subject := 'Your Whispr Password Reset Code';
  email_body := format('
    <h2>Reset Your Password</h2>
    <p>Your reset code is: <strong>%s</strong></p>
    <p>Enter this 6-digit code in the app to reset your password.</p>
    <p>This code expires in 15 minutes.</p>
  ', reset_code);
  
  -- Use a webhook service (like Zapier, Make.com, or custom API) to send email
  -- Replace with your email service webhook URL
  webhook_url := 'https://your-email-service.com/send';
  
  PERFORM net.http_post(
    url := webhook_url,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'to', user_email,
      'subject', email_subject,
      'html', email_body
    )::text
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Note**: This requires a third-party email service webhook.

---

### **Option 3: Third-Party Email Service (SendGrid, Mailgun, etc.)**

Integrate directly with an email service provider.

#### **Example: Using SendGrid**

1. Sign up for SendGrid (free tier available)
2. Get API key
3. Update `sendResetCodeEmail()` in `AuthService` to call SendGrid API directly

```typescript
// In AuthService.sendResetCodeEmail()
const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personalizations: [{
      to: [{ email: email }],
    }],
    from: { email: 'noreply@whispr.app' },
    subject: 'Your Whispr Password Reset Code',
    content: [{
      type: 'text/html',
      value: `<h2>Reset Your Password</h2><p>Your code is: <strong>${code}</strong></p>`,
    }],
  }),
});
```

---

### **Option 4: Temporary Testing Solution**

For development/testing, the code is logged to console. You can:

1. Check app logs to see the generated code
2. Manually enter the code in the app
3. Complete the password reset flow

**Console Output:**
```
⚠️ EMAIL NOT SENT - Code generated but email service not configured
Reset code for user@example.com: 123456
```

---

## 🚀 **Quick Setup (Recommended: Edge Function)**

1. **Copy Edge Function code** from `supabase/functions/send-reset-code-email/index.ts`
2. **Create Edge Function** in Supabase Dashboard
3. **Set environment variables** (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
4. **Configure SMTP** in Supabase Dashboard
5. **Test** by requesting a password reset

---

## ⚠️ **Important Notes**

- **Do NOT** use `/auth/v1/recover` endpoint - it sends link-based emails
- **Do NOT** expose the service role key in client-side code
- **Do** test email delivery before going to production
- **Do** monitor email sending for errors

---

## 📝 **Current Status**

- ✅ Code generation works
- ✅ Code storage in database works
- ✅ Code verification works
- ❌ Email sending not configured (needs setup)

---

*After setting up email, password reset will work completely in-app!*


