# Gmail SMTP Setup for Password Reset Codes

## ✅ **Yes, You Can Use Gmail!**

You can use your Gmail account to send the 6-digit reset codes. Here's how:

---

## 🔧 **Step-by-Step Setup**

### **Step 1: Get Gmail App Password**

1. **Go to Google Account Settings**
   - Visit: https://myaccount.google.com
   - Click **"Security"** in the left menu

2. **Enable 2-Step Verification** (if not already enabled)
   - Under "Signing in to Google"
   - Click **"2-Step Verification"**
   - Follow the setup process

3. **Generate App Password**
   - Go back to **Security** page
   - Under "Signing in to Google", find **"App passwords"**
   - Click **"App passwords"**
   - Select **"Mail"** as the app
   - Select **"Other (Custom name)"** as the device
   - Enter **"Whispr Edge Function"** as the name
   - Click **"Generate"**
   - **Copy the 16-character password** (format: `xxxx xxxx xxxx xxxx`)
   - **Important**: Remove spaces when using it (just the 16 characters)

---

### **Step 2: Configure Edge Function**

1. **Go to Supabase Dashboard**
   - Navigate to **Edge Functions** → **send-reset-code-email**
   - Click **"Settings"** or **"Secrets"** tab

2. **Add Environment Variables:**
   
   **Variable 1:**
   - Name: `GMAIL_USER`
   - Value: `your-email@gmail.com` (your Gmail address)

   **Variable 2:**
   - Name: `GMAIL_APP_PASSWORD`
   - Value: `xxxxxxxxxxxxxxxx` (the 16-character app password, no spaces)

3. **Save and Redeploy**
   - Click **"Save"** or **"Deploy"**
   - Wait for deployment to complete

---

### **Step 3: Test**

1. **Request password reset** in your app
2. **Check Edge Function logs:**
   - Go to **Edge Functions** → **send-reset-code-email** → **Logs**
   - Look for: `✅ Email sent successfully via Gmail SMTP`
3. **Check your email inbox** (and spam folder)

---

## ⚠️ **Important Notes**

### **Gmail Limits:**
- **Free Gmail**: 500 emails/day
- **Google Workspace**: 2,000 emails/day
- If you exceed limits, Gmail may temporarily block sending

### **Security:**
- ✅ **Use App Password** (not your regular Gmail password)
- ✅ **App Password is safer** - can be revoked without changing main password
- ✅ **2-Step Verification required** - Google requires this for app passwords

### **Troubleshooting:**

**"Authentication failed" error:**
- Make sure you're using the **App Password**, not your regular password
- Verify 2-Step Verification is enabled
- Check that the password has no spaces

**"Connection timeout" error:**
- Check your Gmail account isn't locked
- Try using port 465 instead of 587 (update code if needed)
- Verify Gmail account is active

**Emails going to spam:**
- This is normal for automated emails
- Users should check spam folder
- Consider using a custom domain email for production

---

## 🎯 **Quick Setup Checklist**

- [ ] Enable 2-Step Verification in Google Account
- [ ] Generate Gmail App Password
- [ ] Add `GMAIL_USER` environment variable in Edge Function
- [ ] Add `GMAIL_APP_PASSWORD` environment variable in Edge Function
- [ ] Redeploy Edge Function
- [ ] Test password reset
- [ ] Check email inbox

---

## 📝 **Example Configuration**

**In Supabase Edge Function Settings:**
```
GMAIL_USER = yourname@gmail.com
GMAIL_APP_PASSWORD = abcd efgh ijkl mnop
```

**Note**: Remove spaces from app password when entering:
```
GMAIL_APP_PASSWORD = abcdefghijklmnop
```

---

## 🚀 **After Setup**

Once configured, the Edge Function will:
1. ✅ Generate 6-digit code
2. ✅ Store code in database
3. ✅ Send email via Gmail SMTP with the code
4. ✅ User receives email with code (not a link!)

---

*That's it! Your Gmail account will now send password reset codes directly!* 🎉


