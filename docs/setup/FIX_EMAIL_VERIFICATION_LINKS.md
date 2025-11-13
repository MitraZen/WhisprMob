# Fix Email Verification Links Redirecting to GitHub

## 🔍 **Issue**

When users sign up, they receive an email confirmation link that redirects to:
```
https://mitrazen.github.io/whispr-password-reset/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

This happens because:
1. ❌ **Supabase Site URL** is set to the GitHub page
2. ❌ **Email confirmation links** redirect to the Site URL
3. ❌ **GitHub page** doesn't handle email confirmation properly

---

## ✅ **Solution Options**

### **Option 1: Disable Email Confirmation (Recommended for Mobile Apps)**

If you want users to sign in immediately after signup without email confirmation:

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Find **Email Auth** section
3. Set **Enable email confirmations** to `OFF`
4. Set **Auto Confirm Users** to `ON` (if available)

**Pros:**
- ✅ Users can sign in immediately
- ✅ No broken email links
- ✅ Better mobile UX

**Cons:**
- ⚠️ Users can sign up with fake emails (mitigated by password reset requiring email)

---

### **Option 2: Update Site URL to Your Confirmation Page** ✅ **IMPLEMENTED**

You've already created a confirmation page at: **https://www.gowhispr.site/auth/confirmed**

Now you need to configure Supabase to use this URL for email confirmation links.

#### **Step 1: Update Supabase Site URL**

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   ```
   https://www.gowhispr.site
   ```
3. Add **Redirect URLs** (one per line):
   ```
   https://www.gowhispr.site/auth/confirmed
   https://www.gowhispr.site/auth/confirmed#*
   ```
   The `#*` wildcard allows Supabase to append the access token and other parameters to your URL.

#### **Step 2: Verify Your Confirmation Page Handles Tokens**

Your page at `https://www.gowhispr.site/auth/confirmed` should handle the confirmation token that Supabase appends to the URL.

**Expected URL format from Supabase:**
```
https://www.gowhispr.site/auth/confirmed#access_token=TOKEN&type=signup&expires_in=3600
```

**Or if there's an error:**
```
https://www.gowhispr.site/auth/confirmed#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

**Recommended:** Update your page to handle both success and error cases (see template below if needed).

#### **Step 4: Update Email Template (Optional)**

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Select **Confirm Signup** template
3. Update the template to be more user-friendly:

```html
<h2>Welcome to Whispr!</h2>
<p>Thank you for signing up. Please confirm your email address by clicking the link below:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email Address</a></p>
<p>If you didn't create an account, you can safely ignore this email.</p>
```

---

### **Option 3: Use Deep Linking (Advanced)**

Configure the app to handle email confirmation via deep links (similar to password reset).

**This requires:**
- Deep link configuration in Android/iOS
- URL scheme handler in the app
- Web page that redirects to `whispr://confirm-email?token=TOKEN`

**Complexity:** High
**Timeline:** 3-5 days

---

## 🎯 **Recommended Approach**

Since you've already created a confirmation page at `https://www.gowhispr.site/auth/confirmed`, **Option 2 (Update Site URL)** is the best approach:

1. ✅ **Professional** - Users see a proper confirmation page
2. ✅ **Email verification enabled** - Better security
3. ✅ **Already implemented** - Page is live and ready
4. ✅ **Better UX** - Clear confirmation message

---

## 📋 **Quick Fix Steps (Option 2 - Using Your Confirmation Page)**

1. **Go to Supabase Dashboard**
2. **Navigate to:** Authentication → URL Configuration
3. **Set Site URL** to: `https://www.gowhispr.site`
4. **Add Redirect URLs:**
   - `https://www.gowhispr.site/auth/confirmed`
   - `https://www.gowhispr.site/auth/confirmed#*`
5. **Save** changes
6. **Test:** Sign up a new user and click the confirmation link in the email
7. **Verify:** The link should redirect to `https://www.gowhispr.site/auth/confirmed` with a success message

---

## 🔍 **Verify the Fix**

After updating Supabase Site URL:

1. **Sign up** a new test user
2. **Check email** for the confirmation link
3. **Click the confirmation link** - it should redirect to `https://www.gowhispr.site/auth/confirmed`
4. **Verify** the page shows "Email Confirmed!" message
5. **Test** signing in - user should be able to sign in after email confirmation
6. **Test** password reset still works (should still use 6-digit codes in-app)

---

## 📝 **Notes**

- **Password reset** is already handled in-app with 6-digit codes (no links needed)
- **Email confirmation** is separate from password reset
- **Site URL** affects all email links (confirmation, password reset, email change)
- **Redirect URLs** must include the exact URL patterns you use

---

## 🆘 **Still Having Issues?**

If email confirmation links still redirect to GitHub:

1. **Verify Site URL** is set to `https://www.gowhispr.site` (not the GitHub URL)
2. **Check Redirect URLs** include `https://www.gowhispr.site/auth/confirmed#*`
3. **Clear browser cache** and try the confirmation link again
4. **Check Supabase logs** (Dashboard → Logs → Auth) for any errors
5. **Verify email template** uses `{{ .ConfirmationURL }}` (should be automatic)
6. **Test with a new signup** - old confirmation links may have expired

### **Troubleshooting Common Issues:**

**Issue:** Link still goes to GitHub
- **Fix:** Make sure Site URL is saved correctly in Supabase Dashboard

**Issue:** Page shows "Invalid Link" or error
- **Fix:** Check that your confirmation page handles URL hash parameters (`#access_token=...`)

**Issue:** Email not received
- **Fix:** Check spam folder, verify SMTP is configured correctly


