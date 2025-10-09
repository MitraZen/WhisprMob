# 📧 SMTP Setup Guide for Supabase Password Reset

## 🚨 **Issue:** 
Email template is configured but still getting 500 errors. This usually means **SMTP is not configured**.

## 🔧 **Solution: Set up Custom SMTP**

### **Option 1: Gmail SMTP (Recommended for Testing)**

1. **Go to Supabase Dashboard** → **Authentication** → **Settings** → **SMTP Settings**

2. **Configure Gmail SMTP:**
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-gmail@gmail.com
SMTP Pass: your-app-password (not regular password!)
Sender Name: Whispr App
Sender Email: your-gmail@gmail.com
```

3. **Get Gmail App Password:**
   - Go to Google Account settings
   - Enable 2-factor authentication
   - Generate an "App Password" for Supabase
   - Use this app password, not your regular Gmail password

### **Option 2: SendGrid (Production Recommended)**

1. **Sign up for SendGrid** (free tier available)
2. **Get API key** from SendGrid dashboard
3. **Configure in Supabase:**
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: your-sendgrid-api-key
Sender Name: Whispr App
Sender Email: your-verified-email@domain.com
```

### **Option 3: Mailgun**

```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP User: your-mailgun-username
SMTP Pass: your-mailgun-password
Sender Name: Whispr App
Sender Email: your-verified-email@domain.com
```

## 🎯 **Quick Test Setup (Gmail):**

1. **Use your personal Gmail account**
2. **Enable 2FA** in Google Account
3. **Generate App Password** for "Supabase"
4. **Configure SMTP** in Supabase Dashboard
5. **Test password reset**

## ⚠️ **Important Notes:**

- **Default Supabase email** often doesn't work reliably
- **Custom SMTP is required** for production apps
- **Gmail has daily limits** (500 emails/day for free accounts)
- **SendGrid/Mailgun** are better for production

## 🧪 **After SMTP Setup:**

The password reset should return **Status 200** instead of 500, and users should receive actual emails.

## 🔍 **Alternative Diagnosis:**

If you don't want to set up SMTP right now, you can also check:
1. **Supabase project logs** for more detailed error information
2. **Try a different Supabase project** to see if it's project-specific
3. **Contact Supabase support** if the issue persists


