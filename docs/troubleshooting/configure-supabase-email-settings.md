# 📧 Configure Supabase Email Settings for Password Reset

Since `auth.config` table doesn't exist in newer Supabase versions, you need to configure email settings through the **Supabase Dashboard**.

## 🔧 **Step-by-Step Configuration:**

### **1. Access Authentication Settings**
1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Settings**

### **2. Configure Email Settings**
In the **Email** section:

#### **✅ Enable Email Authentication:**
- ✅ **Enable email confirmations**: `OFF` (for password reset to work)
- ✅ **Enable email change confirmations**: `ON` (optional)
- ✅ **Secure email change**: `ON` (recommended)

#### **⚠️ Critical Setting:**
- **Auto Confirm Users**: `DISABLED` ❌
  - This is the key setting that was preventing emails from being sent
  - When enabled, Supabase skips sending emails and auto-confirms users

### **3. Configure Email Templates**
Go to **Authentication** → **Email Templates**:

#### **Reset Password Template:**
- ✅ **Subject**: `Reset Your Password`
- ✅ **Body**: Should contain `{{ .ConfirmationURL }}` or similar
- ✅ **Enabled**: `ON`

Example template:
```html
<h2>Reset your password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

### **4. Configure Site URL**
In **URL Configuration**:
- **Site URL**: Set to your app's URL or `http://localhost:3000` for development
- **Redirect URLs**: Add your app's redirect patterns

### **5. SMTP Configuration (Optional but Recommended)**
For production, configure custom SMTP in **SMTP Settings**:

#### **Popular SMTP Providers:**
- **Gmail**: `smtp.gmail.com:587`
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`

#### **SMTP Settings:**
```
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: your-app-password
```

### **6. Test Configuration**
After configuring:
1. Run the SQL script: `fix-auth-users-import-conflict-v2.sql`
2. Test forgot password in your app
3. Check email (including spam folder)

## 🧪 **Testing Steps:**

### **Test 1: Use the App**
1. Open your Whispr app
2. Go to Sign In screen
3. Enter an email from your imported users
4. Tap "Forgot Password"
5. Check email for reset link

### **Test 2: Use the Test Script**
```bash
node test-forgot-password.js
```

### **Test 3: Check Supabase Logs**
1. Go to **Supabase Dashboard** → **Logs**
2. Filter by **Auth** logs
3. Look for password reset attempts

## 🎯 **Expected Results:**

After configuration:
- ✅ **Status 200** from password reset API
- ✅ **Email sent** to user's inbox
- ✅ **Reset link works** when clicked
- ✅ **User can set new password**
- ✅ **User can login** with new password

## 🚨 **Common Issues:**

### **Issue 1: Still No Email**
- Check spam/junk folder
- Try different email provider (Gmail, Yahoo, Outlook)
- Verify SMTP configuration

### **Issue 2: Reset Link Doesn't Work**
- Check Site URL configuration
- Verify redirect URLs are correct
- Ensure email template has correct `{{ .ConfirmationURL }}`

### **Issue 3: Rate Limiting**
- Wait 1 minute between reset attempts
- Supabase limits: 1 email/minute per address, 5 emails/hour per IP

## 📞 **Need Help?**

If emails still don't work after configuration:
1. Check Supabase Dashboard logs
2. Verify all settings match this guide
3. Test with a fresh email address
4. Consider setting up custom SMTP

**The key is disabling "Auto Confirm Users" - this was the main issue preventing emails from being sent!** 🎯


