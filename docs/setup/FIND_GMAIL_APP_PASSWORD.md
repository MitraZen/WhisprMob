# How to Find or Get Your Gmail App Password

## 🔍 **Why You Can't See It**

Supabase Dashboard **hides the SMTP password** for security reasons. You can't see it once it's entered, but you can:

1. **Generate a new one** (recommended)
2. **Check if you saved it** somewhere
3. **Use the same one** if you remember it

---

## ✅ **Solution: Generate a New Gmail App Password**

Since you can't see the existing password, just **generate a new one** - it's quick and easy!

### **Step 1: Go to Google Account Settings**

1. Visit: **https://myaccount.google.com**
2. Click **"Security"** in the left menu

### **Step 2: Enable 2-Step Verification** (if not already)

1. Under **"Signing in to Google"**
2. Click **"2-Step Verification"**
3. Follow the setup if not already enabled

### **Step 3: Generate App Password**

1. Go back to **Security** page
2. Under **"Signing in to Google"**, find **"App passwords"**
3. Click **"App passwords"**
4. You may need to sign in again
5. Select:
   - **App**: "Mail"
   - **Device**: "Other (Custom name)"
   - **Name**: Enter "Whispr Edge Function" or "Supabase"
6. Click **"Generate"**
7. **Copy the 16-character password** that appears
   - Format: `xxxx xxxx xxxx xxxx` (4 groups of 4 characters)
   - **Important**: Remove spaces when using it → `xxxxxxxxxxxxxxxx`

---

## 📝 **Step 4: Add to Edge Function**

1. **Go to Supabase Dashboard** → **Edge Functions** → **send-reset-code-email**
2. **Click "Settings" or "Secrets"**
3. **Add Environment Variables:**

   ```
   GMAIL_USER = your-email@gmail.com
   GMAIL_APP_PASSWORD = xxxxxxxxxxxxxxxx (16 chars, no spaces)
   ```

4. **Save and Redeploy**

---

## 🔄 **Alternative: Update Supabase SMTP Settings**

If you want to use the new app password in Supabase SMTP settings too:

1. **Go to Supabase Dashboard** → **Authentication** → **Settings** → **SMTP Settings**
2. **Update the SMTP Password field** with your new app password
3. **Save**

---

## ⚠️ **Important Notes**

- **App Password is different** from your regular Gmail password
- **16 characters**, no spaces when entering
- **2-Step Verification required** to generate app passwords
- **You can generate multiple** app passwords (one for Supabase, one for Edge Function, etc.)

---

## 🎯 **Quick Checklist**

- [ ] Go to Google Account → Security
- [ ] Enable 2-Step Verification (if needed)
- [ ] Generate App Password
- [ ] Copy the 16-character password
- [ ] Add to Edge Function as `GMAIL_APP_PASSWORD`
- [ ] Add your Gmail address as `GMAIL_USER`
- [ ] Redeploy Edge Function
- [ ] Test password reset

---

*Once you have the app password, add it to the Edge Function and you're done!* 🎉


