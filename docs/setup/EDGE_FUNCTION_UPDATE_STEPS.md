# Step-by-Step: Update Edge Function in Supabase Dashboard

## 📋 **What You Need to Do**

You have **two options** depending on whether the Edge Function already exists:

---

## ✅ **Option A: Edge Function Already Exists**

If `send-reset-code-email` function already exists in Supabase:

### **Step 1: Update the Function Code**

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Edge Functions**
   - Click **"Edge Functions"** in the left sidebar
   - Find **"send-reset-code-email"** in the list
   - Click on it

3. **Edit the Code**
   - You'll see a code editor
   - **Delete all existing code**
   - **Copy the entire code** from `supabase/functions/send-reset-code-email/index.ts` in your project
   - **Paste it** into the editor
   - Click **"Deploy"** or **"Save"**

### **Step 2: Add Environment Variables**

1. **In the same Edge Function page**, look for:
   - **"Settings"** tab, OR
   - **"Secrets"** tab, OR
   - **"Environment Variables"** section

2. **Add these variables:**
   ```
   GMAIL_USER = your-email@gmail.com
   GMAIL_APP_PASSWORD = xxxxxxxxxxxxxxxx (16-character app password, no spaces)
   ```

3. **Click "Save"**

---

## ✅ **Option B: Create New Edge Function**

If the function doesn't exist yet:

### **Step 1: Create the Function**

1. **Go to Supabase Dashboard** → **Edge Functions**
2. **Click "New Function"** or **"Create Function"**
3. **Name it**: `send-reset-code-email`
4. **Copy the entire code** from `supabase/functions/send-reset-code-email/index.ts`
5. **Paste it** into the code editor
6. **Click "Deploy"**

### **Step 2: Add Environment Variables**

1. **After deployment**, go to the function's **"Settings"** or **"Secrets"** tab
2. **Add:**
   ```
   GMAIL_USER = your-email@gmail.com
   GMAIL_APP_PASSWORD = xxxxxxxxxxxxxxxx
   ```
3. **Save**

---

## 🎯 **Quick Visual Guide**

```
Supabase Dashboard
  └── Edge Functions (left sidebar)
      └── send-reset-code-email
          ├── Code Editor (paste updated code)
          ├── Deploy/Save button
          └── Settings/Secrets tab
              ├── GMAIL_USER = your-email@gmail.com
              └── GMAIL_APP_PASSWORD = xxxxxxxxxxxxxxxx
```

---

## 📝 **What Code to Use**

The code is already in your project at:
- **File**: `supabase/functions/send-reset-code-email/index.ts`
- **Just copy the entire file content** and paste it into Supabase Dashboard

---

## ✅ **After Updating**

1. **Function is deployed** ✅
2. **Environment variables are set** ✅
3. **Test**: Request password reset in app
4. **Check logs**: Edge Functions → send-reset-code-email → Logs
5. **Check email**: You should receive the 6-digit code!

---

## 🐛 **If You Can't Find "Settings" or "Secrets"**

Some Supabase versions have different UI:
- Look for **"Configuration"** tab
- Or **"Environment Variables"** section
- Or click the **gear icon** ⚙️ next to the function name

---

*That's it! Just update the code and add the Gmail credentials.* 🎉


