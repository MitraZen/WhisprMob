# Diagnosing Notification Reminder Not Showing

## 🔍 **Why the Reminder Might Not Show**

The notification reminder has **5 checks** that can prevent it from showing. Here's how to diagnose which one is blocking it:

---

## 📋 **Diagnostic Checklist**

### **Step 1: Check Console Logs**

When you restart the app, look for these console messages in order:

#### **1. App Initialization**
```
🔔 Cleared session prompt flags on app start
```

#### **2. Permission Check Flow**
Look for ONE of these messages:

**A) First-Time User (No reminder, shows native permission dialog):**
```
🔔 Requesting notification permission on app launch...
```

**B) Returning User (Should show reminder):**
```
🔔 Notification reminder already shown this session - skipping
```
OR
```
🔔 Notification reminder within cooldown window - skipping
```
OR
```
🔔 Notifications already enabled - reminder not required
```
OR
```
🔕 User has disabled permission reminders
```

---

## 🎯 **What Each Message Means**

### **Message: "🔔 Requesting notification permission on app launch..."**
**Meaning:** This is a **first-time user** who has never been asked for permission before.

**Why no reminder:** The reminder only shows for **returning users** who were asked before but denied. First-time users get the native permission dialog instead.

**Solution:** This is expected behavior. The reminder will show on the **next app restart** if they deny permission.

---

### **Message: "🔔 Notifications already enabled - reminder not required"**
**Meaning:** Notifications are **already enabled** on the device.

**Why no reminder:** The reminder only shows when notifications are **disabled**. If they're enabled, no reminder is needed.

**How to test:** 
1. Go to device Settings → Apps → Whispr → Notifications
2. Turn OFF notifications
3. Restart the app
4. Reminder should show

---

### **Message: "🔔 Notification reminder already shown this session - skipping"**
**Meaning:** The reminder was already shown in this app session (before you restarted).

**Why no reminder:** Session flag wasn't cleared properly, OR the app didn't fully restart.

**Solution:** 
1. Make sure you **fully closed** the app (swipe away from app switcher)
2. Wait 2-3 seconds
3. Open the app again
4. Check if session flag was cleared: Look for `🔔 Cleared session prompt flags on app start`

---

### **Message: "🔔 Notification reminder within cooldown window - skipping"**
**Meaning:** The reminder was shown **less than 7 days ago**.

**Why no reminder:** There's a **7-day cooldown** between reminders to avoid annoying users.

**How to check:**
- The last shown timestamp is stored in AsyncStorage
- If less than 7 days have passed, reminder won't show

**Solution:** Wait 7 days, OR manually clear the cooldown (see below).

---

### **Message: "🔕 User has disabled permission reminders"**
**Meaning:** User clicked **"Don't Ask Again"** on a previous reminder.

**Why no reminder:** User permanently disabled reminders.

**Solution:** User needs to manually enable notifications in device settings, OR clear the disabled flag (see below).

---

## 🔧 **Manual Diagnostic Steps**

### **Check 1: Is `NOTIFICATION_PERMISSION_ASKED_KEY` set?**

This key must exist for the reminder to show. If it doesn't exist, the app treats you as a first-time user.

**To check:** Look in console for:
- If you see `🔔 Requesting notification permission on app launch...` → Key doesn't exist (first-time user)
- If you see `maybeShowNotificationReminder()` being called → Key exists (returning user)

---

### **Check 2: Are notifications actually disabled?**

The reminder only shows if notifications are **disabled**.

**To check:**
1. Go to device Settings → Apps → Whispr → Notifications
2. Verify notifications are **OFF**
3. If they're ON, turn them OFF and restart the app

---

### **Check 3: Is the 7-day cooldown active?**

The reminder has a 7-day cooldown. If it was shown recently, it won't show again.

**To check:** Look for this console message:
```
🔔 Notification reminder within cooldown window - skipping
```

**To reset (for testing):**
- Clear app data: Settings → Apps → Whispr → Storage → Clear Data
- OR wait 7 days

---

### **Check 4: Did user disable reminders?**

If user clicked "Don't Ask Again", reminders are permanently disabled.

**To check:** Look for this console message:
```
🔕 User has disabled permission reminders
```

**To reset (for testing):**
- Clear app data: Settings → Apps → Whispr → Storage → Clear Data

---

### **Check 5: Was the session flag cleared?**

On app start, session flags should be cleared. If they weren't, the reminder might think it was already shown.

**To check:** Look for this console message on app start:
```
🔔 Cleared session prompt flags on app start
```

If you don't see this message, the app might not have fully restarted.

---

## 🧪 **Testing the Reminder**

### **Scenario 1: First-Time User (Never Asked Before)**
1. **Clear app data** (Settings → Apps → Whispr → Storage → Clear Data)
2. **Open app** → Should see native permission dialog (not reminder)
3. **Deny permission**
4. **Restart app** → Should see reminder

### **Scenario 2: Returning User (Asked Before, Denied)**
1. **Ensure notifications are OFF** (Settings → Apps → Whispr → Notifications)
2. **Ensure `NOTIFICATION_PERMISSION_ASKED_KEY` exists** (should exist if you were asked before)
3. **Clear session flag** (restart app - it clears automatically)
4. **Wait 7 days** OR clear `NOTIFICATION_REMINDER_LAST_SHOWN_KEY` (requires clearing app data)
5. **Restart app** → Should see reminder

### **Scenario 3: User Disabled Reminders**
1. **Clear app data** to reset the disabled flag
2. **Follow Scenario 2** steps

---

## 📊 **Expected Console Log Flow**

### **When Reminder SHOULD Show:**
```
🔔 Cleared session prompt flags on app start
[Auth check happens...]
🔔 Notification reminder shown
[Alert appears]
```

### **When Reminder WON'T Show (First-Time User):**
```
🔔 Cleared session prompt flags on app start
[Auth check happens...]
🔔 Requesting notification permission on app launch...
[Native permission dialog appears]
```

### **When Reminder WON'T Show (Already Enabled):**
```
🔔 Cleared session prompt flags on app start
[Auth check happens...]
🔔 Notifications already enabled - reminder not required
```

### **When Reminder WON'T Show (Cooldown Active):**
```
🔔 Cleared session prompt flags on app start
[Auth check happens...]
🔔 Notification reminder within cooldown window - skipping
```

---

## 🔍 **Quick Diagnostic Questions**

Answer these to identify the issue:

1. **What console message do you see?**
   - [ ] "🔔 Requesting notification permission on app launch..." → First-time user
   - [ ] "🔔 Notifications already enabled" → Notifications are ON
   - [ ] "🔔 Notification reminder within cooldown window" → 7-day cooldown active
   - [ ] "🔕 User has disabled permission reminders" → Reminders disabled
   - [ ] "🔔 Notification reminder already shown this session" → Session flag issue
   - [ ] No message at all → Function not being called

2. **Are notifications enabled in device settings?**
   - [ ] Yes → Turn them OFF and restart
   - [ ] No → Continue to next question

3. **Have you been asked for notification permission before?**
   - [ ] No → You're a first-time user (expected behavior)
   - [ ] Yes → Continue to next question

4. **When was the last time you saw the reminder?**
   - [ ] Never → Check if `NOTIFICATION_PERMISSION_ASKED_KEY` exists
   - [ ] Less than 7 days ago → Cooldown is active (wait or clear data)
   - [ ] More than 7 days ago → Check other conditions

5. **Did you click "Don't Ask Again" before?**
   - [ ] Yes → Reminders are permanently disabled (clear app data to reset)
   - [ ] No → Check other conditions

---

## 🛠️ **Common Issues & Fixes**

### **Issue: "I never see the reminder"**
**Possible causes:**
1. Notifications are already enabled → Turn them OFF in device settings
2. You're a first-time user → Deny permission once, then restart
3. Reminders are disabled → Clear app data to reset
4. Cooldown is active → Wait 7 days or clear app data

### **Issue: "Reminder showed once, then never again"**
**Possible causes:**
1. 7-day cooldown is active → Wait 7 days
2. User clicked "Don't Ask Again" → Clear app data to reset
3. Notifications were enabled → Turn them OFF and restart

### **Issue: "Reminder doesn't show after changing users"**
**This is expected behavior** - the reminder only checks on app launch, not on user login. You need to fully restart the app after changing users.

---

## 📝 **Next Steps**

1. **Check console logs** when you restart the app
2. **Identify which message** you see (from the list above)
3. **Follow the corresponding solution** for that message
4. **If still not working**, check device notification settings

