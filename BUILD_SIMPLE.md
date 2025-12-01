# Simple Build Process

## 🚀 **Quick Build**

Just run:
```cmd
build.bat
```

This will:
1. ✅ Read version from `build.gradle`
2. ✅ Clean previous builds
3. ✅ Build AAB (App Bundle)
4. ✅ Build APK
5. ✅ Copy both to `builds\latest\` with correct naming

---

## 📝 **Custom Version**

You can also specify version manually:
```cmd
build.bat 2.19.0 122 P6
```

---

## 🔧 **Manual Build (If Needed)**

If you prefer to build manually:

```cmd
cd android
gradlew clean
gradlew bundleRelease --no-daemon
gradlew assembleRelease --no-daemon
cd ..
```

Then copy files:
```cmd
copy android\app\build\outputs\bundle\release\app-release.aab builds\latest\Whispr_v2.19.0_P6_2025-12-01_01-43.aab
copy android\app\build\outputs\apk\release\app-release.apk builds\latest\Whispr_v2.19.0_P6_2025-12-01_01-43.apk
```

---

## ✅ **That's It!**

No PowerShell, no complex scripts - just a simple batch file that does everything in one command.



