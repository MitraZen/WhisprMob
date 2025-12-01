# Simple Development Start

## 🚀 **Quick Start**

Run:
```cmd
start-dev.bat
```

This will:
1. ✅ Stop any running Node processes
2. ✅ Start Metro bundler (in a separate window)
3. ✅ Check connected Android devices
4. ✅ Build and run the app

**All commands run sequentially** - each waits for the previous to complete.

---

## 📝 **Manual Commands (If You Prefer)**

Run these one at a time:

```cmd
taskkill /f /im node.exe
```

```cmd
start cmd /k "npx react-native start --reset-cache"
```

```cmd
adb devices
```

```cmd
npx react-native run-android
```

---

## ✅ **No Background Processes**

- Metro bundler opens in a **separate window** (you can see it and close it)
- All commands run **sequentially**
- Each command **waits** for the previous to finish

