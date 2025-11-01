# Build Summary v1.9.2 (93)

- AAB: builds/latest/Whispr_v1.9.2_v93_2025-2025-11-01_23-09.aab
- APK: builds/latest/Whispr_v1.9.2_v93_2025-2025-11-01_23-09.apk

Generated: 2025-11-01_23-09

## Build Details
- Version Name: 1.9.2
- Version Code: 93
- Build Type: Release
- Signing: Production Keystore
- AAB Size: 26.89 MB
- APK Size: 54.32 MB

## Changes in this version
- Fixed background notification handler with manual notification display
- Fixed Phase3NotificationLogicService getInstance() method issue
- Fixed addToBatch/addNotificationToBatch method mismatch (added backward compatibility)
- Fixed realtime cleanup race condition with isCleaningUp guard flag
- Fixed clearUserBatch() method call to use correct clearBatchForUser() method
- Fixed Android manifest for FCM notifications (notification channel and color)
- Added missing notification color resource
- Performance improvements and bug fixes
