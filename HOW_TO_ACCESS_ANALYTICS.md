# How to Access Analytics Dashboard

## 📍 **Location in Admin Panel**

The Analytics Dashboard is located in the **Admin Panel** screen. Here's how to access it:

### **Step-by-Step Access:**

1. **Open Admin Panel**
   - Navigate to Settings
   - Enable Admin Mode
   - Enter admin password: `whispr_admin_2024`
   - You'll see the Admin Panel screen

2. **Find Analytics Section**
   - Scroll down in the Admin Panel
   - Look for the section titled **"Analytics Dashboard"**
   - It appears **AFTER** the "Phase 1 Performance Test" section
   - It appears **BEFORE** the "System Statistics" section (if debug info is enabled)

3. **Open Analytics**
   - Click the button: **"📊 View Analytics Dashboard"**
   - The analytics dashboard will open in a full-screen modal

### **Visual Guide:**

```
Admin Panel Screen
├── Debug Controls
├── Database Controls
├── User Management
├── Message Testing
├── FCM Edge Function Test
├── Phase 1 Performance Test
├── 📊 Analytics Dashboard  ← HERE!
│   └── [📊 View Analytics Dashboard] Button
├── System Statistics (if debug enabled)
└── Logout Admin
```

### **If You Don't See It:**

1. **Scroll Down**: The Analytics section is below the Performance Test section
2. **Check Import**: Make sure `AdminAnalyticsPanel` component exists at `src/components/AdminAnalyticsPanel.tsx`
3. **Restart App**: Sometimes React Native needs a restart to pick up new components
4. **Check Console**: Look for any import errors in the console

### **Quick Test:**

Run this command to verify the component exists:
```bash
# Check if component file exists
ls src/components/AdminAnalyticsPanel.tsx
```

### **Alternative: Direct Navigation**

If you want to add a direct navigation button elsewhere, you can add it to:
- Settings screen
- Main navigation menu
- Or create a dedicated Analytics screen

Would you like me to add a direct navigation option to make it easier to access?



