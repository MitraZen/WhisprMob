# Whispr Mobile App - Version 1.2.14 Release Notes

## 🎉 Major Fixes and Improvements

This release focuses on resolving critical buddy functionality issues and improving the overall user experience.

### 🐛 Bug Fixes

- **Fixed Buddy Addition Delays:**
  - Resolved issue where senders would see new buddies appear late after accepting requests
  - Implemented real-time triggers for instant buddy notifications
  - Added proper conflict handling for existing buddy relationships

- **Fixed Cascade Delete Issues:**
  - Resolved problems with buddy deletion not properly cleaning up related data
  - Fixed SQL ambiguity errors in delete_buddy_safely function
  - Improved bidirectional relationship management

### ✨ Enhancements

- **Improved Buddy Creation:** New `create_buddy_relationship_safe()` function handles conflicts gracefully
- **Enhanced Real-time Updates:** Added triggers for instant buddy creation/deletion notifications
- **Better Error Handling:** More robust error handling throughout buddy management
- **Performance Improvements:** Added indexes for faster buddy lookups

### 🛠️ Technical Updates

- **Version Bump:**
  - `package.json` updated to `1.2.14`
  - Android `version.properties` updated to `VERSION_NAME=1.2.14` and `VERSION_CODE=33`
- **Database Functions:** New and improved PostgreSQL functions for buddy management
- **Real-time Triggers:** Added pg_notify triggers for instant UI updates

## 🚀 Ready for Play Store Upload!

This version provides a more stable and responsive buddy management experience.
