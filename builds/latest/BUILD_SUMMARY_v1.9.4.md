# Build Summary - v1.9.4 (Version Code: 95)

## Build Information
- **Version Name:** 1.9.4
- **Version Code:** 95
- **Build Date:** 2025-11-02 01:38
- **Previous Version:** 1.9.3 (Version Code: 94)

## Build Artifacts
- **AAB File:** `Whispr_v1.9.4_v95_2025-11-02_01-38.aab`
- **APK File:** `Whispr_v1.9.4_v95_2025-11-02_01-38.apk`

## Build Location
All files are located in: `builds/latest/`

## Key Changes in This Version
1. **Notification Duplicate Fix**: Fixed issue where first message in a batch was appearing as both a standalone notification and as part of the grouped notification
   - All notifications now use consistent notification IDs based on `buddyName` hash
   - Unified routing through batch system for all messages (single and batched)
   - Consistent deduplication keys to prevent duplicate notifications

2. **Unified Notification Routing**: All messages (single or multiple) now route through the batch system to ensure consistent behavior

## Technical Details
- **Build System:** Gradle 8.14.3
- **Target SDK:** 36
- **Min SDK:** 24
- **Compile SDK:** 36

## Build Status
✅ **SUCCESSFUL**

Both AAB and APK files were built successfully and copied to `builds/latest/` directory.

## Next Steps
1. Test the APK file on a device
2. Upload the AAB file to Google Play Console for review
3. Verify notification behavior with multiple messages from the same sender

---

**Build Completed:** 2025-11-02 01:38

