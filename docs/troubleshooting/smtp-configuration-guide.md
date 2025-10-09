# 📧 SMTP Configuration - Step by Step Guide

## 🎯 **Goal: Complete the forgot password system by configuring SMTP**

## 🔧 **Method 1: Try Default Supabase Email First (Fastest)**

### **Step 1: Check Current SMTP Settings**
1. **Open Supabase Dashboard** in your browser
2. **Go to your project**: `axkktejoldizpveydidx`
3. **Navigate**: Authentication → Settings
4. **Scroll down** to find "SMTP Settings" section

### **Step 2: Try Default Configuration**
1. **Look for "Enable custom SMTP" toggle**
2. **Make sure it's DISABLED/OFF** (try default first)
3. **Leave all SMTP fields empty**
4. **Click "Save"**
5. **Wait 30 seconds** for changes to propagate

### **Step 3: Test Default Configuration**
```bash
node verify-smtp-setup.js
```

**If this works (Status 200), you're done! 🎉**

---

## 🔧 **Method 2: Gmail SMTP Configuration (If Default Doesn't Work)**

### **Step 1: Prepare Gmail Account**
1. **Use your personal Gmail account**
2. **Enable 2-Step Verification**:
   - Go to Google Account → Security
   - Turn on 2-Step Verification (if not already enabled)

### **Step 2: Generate App Password**
1. **Google Account** → **Security** → **2-Step Verification**
2. **Scroll down** to "App passwords"
3. **Click "App passwords"**
4. **Select "Mail"** and **"Other (Custom name)"**
5. **Enter "Supabase"** as the app name
6. **Click "Generate"**
7. **Copy the 16-character password** (format: xxxx xxxx xxxx xxxx)

### **Step 3: Configure SMTP in Supabase**
1. **Back to Supabase Dashboard** → Authentication → Settings
2. **Enable custom SMTP**: ✅ **ON**
3. **Fill in these fields**:
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP User: your-gmail@gmail.com
   SMTP Pass: [paste the 16-character app password]
   Sender Name: Whispr App
   Sender Email: your-gmail@gmail.com
   ```
4. **Click "Save"**
5. **Wait 1-2 minutes** for settings to propagate

### **Step 4: Test Gmail Configuration**
```bash
node verify-smtp-setup.js
```

---

## 🔧 **Method 3: SendGrid (Most Reliable for Production)**

### **Step 1: Create SendGrid Account**
1. **Go to** https://sendgrid.com
2. **Sign up** for free account (100 emails/day free)
3. **Verify your email** and complete setup

### **Step 2: Create API Key**
1. **SendGrid Dashboard** → **Settings** → **API Keys**
2. **Click "Create API Key"**
3. **Name**: "Supabase"
4. **Permissions**: "Full Access" or "Mail Send"
5. **Click "Create & View"**
6. **Copy the API key** (starts with "SG.")

### **Step 3: Configure SendGrid in Supabase**
```
Enable custom SMTP: ✅ ON
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Pass: [paste SendGrid API key]
Sender Name: Whispr App
Sender Email: your-verified-email@domain.com
```

---

## 🧪 **Testing and Verification**

### **After Each Configuration:**
1. **Save settings** in Supabase
2. **Wait 30-60 seconds**
3. **Run verification**:
   ```bash
   node verify-smtp-setup.js
   ```

### **Success Indicators:**
- ✅ **Status 200** for real users (prograktech@gmail.com)
- ✅ **"SUCCESS! Password reset request accepted"** message
- ✅ **Check email inbox/spam** for actual reset email

### **Test in App:**
1. **Open Whispr app**
2. **Go to Sign In screen**
3. **Enter email**: prograktech@gmail.com
4. **Tap "Forgot Password"**
5. **Should show**: "Reset Email Sent! 📧"
6. **Check email** for reset link

---

## 🚨 **Troubleshooting**

### **Still Getting 500 Errors:**
1. **Double-check app password** (16 characters, no spaces)
2. **Verify 2-Step Verification** is enabled
3. **Try different Gmail account**
4. **Wait 2-3 minutes** after saving
5. **Check Supabase logs** for detailed errors

### **Gmail Issues:**
- **Use app password**, not regular password
- **Enable 2-Step Verification** first
- **Try "Less secure app access"** if available (deprecated)

### **Alternative Solutions:**
- **Try Method 1** (default) first - often works
- **Use SendGrid** instead of Gmail
- **Contact Supabase support** if persistent issues

---

## 🎉 **Expected Final Result**

### **API Test Success:**
```
✅ SUCCESS! Password reset request accepted
📧 Check email inbox for reset link
🎉 FORGOT PASSWORD FUNCTIONALITY IS COMPLETE!
```

### **User Experience:**
1. **User taps "Forgot Password"**
2. **Enters email** → **Gets success message**
3. **Receives email** with reset link
4. **Clicks link** → **Sets new password**
5. **Logs in successfully** with all data intact

---

**Let's start with Method 1 (default email) - it's the fastest and might just work!** 🚀


