# Test Reset Link Locally

## 🧪 **Quick Local Test**

1. **Save `simple-web-reset.html`** to your desktop
2. **Open it in a browser** (double-click the file)
3. **Copy a reset link** from your email
4. **Extract the token** from the URL and test manually

## 🔗 **Reset Link Format**

Reset links look like:
```
https://axkktejoldizpveydidx.supabase.co/auth/v1/verify?token=TOKEN&type=recovery&redirect_to=REDIRECT_URL
```

## 🎯 **What You Need:**

1. **Host the HTML file** somewhere public
2. **Update Supabase Site URL** to: `https://your-domain.com/simple-web-reset.html`
3. **Test the complete flow**

## 🚀 **Free Hosting Options:**

- **GitHub Pages** (free, easy)
- **Netlify** (free, drag & drop)
- **Vercel** (free, fast)
- **Firebase Hosting** (free)

## 📱 **Alternative: Reset Codes**

Instead of links, use 6-digit codes:
1. Generate random code (123456)
2. Store in database with expiry
3. Send code via email
4. User enters code in app
5. App validates and allows reset

Would you like me to implement the reset code approach instead?


