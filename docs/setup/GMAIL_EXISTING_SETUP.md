# Using Existing Gmail SMTP Configuration

## ✅ **Your Gmail SMTP is Already Working!**

Since your Gmail SMTP is already configured in Supabase Dashboard, you just need to add the same credentials to the Edge Function.

---

## 🔧 **Quick Setup (2 minutes)**

### **Step 1: Get Your Gmail Credentials**

Your Gmail SMTP is already configured in Supabase. You need to use the **same credentials** in the Edge Function:

1. **Go to Supabase Dashboard** → **Authentication** → **Settings** → **SMTP Settings**
2. **Note down your Gmail credentials:**
   - **SMTP User**: `your-email@gmail.com`
   - **SMTP Pass**: `your-app-password` (the 16-character app password)

---

### **Step 2: Add to Edge Function**

1. **Go to Supabase Dashboard** → **Edge Functions** → **send-reset-code-email**
2. **Click "Settings" or "Secrets"**
3. **Add Environment Variables:**

   **Option A: Use GMAIL_ prefix (Recommended)**
   ```
   GMAIL_USER = [same as SMTP User in Supabase]
   GMAIL_APP_PASSWORD = [same as SMTP Pass in Supabase]
   ```

   **Option B: Use SMTP_ prefix (Alternative)**
   ```
   SMTP_USER = [same as SMTP User in Supabase]
   SMTP_PASSWORD = [same as SMTP Pass in Supabase]
   ```

4. **Redeploy the function**

---

## ✅ **That's It!**

The Edge Function will now:
- ✅ Use the **same Gmail account** that's already working
- ✅ Send the **6-digit code** (not a link!)
- ✅ Work with your **existing SMTP configuration**

---

## 🧪 **Test**

1. Request password reset in app
2. Check Edge Function logs for: `✅ Email sent successfully via Gmail SMTP`
3. Check email inbox - you should receive the code!

---

## 📝 **Important**

- Use the **exact same credentials** as in Supabase SMTP Settings
- The **App Password** (not your regular Gmail password)
- Remove any spaces from the app password when entering

---

*After adding the credentials, your existing Gmail setup will send the 6-digit codes!* 🎉


