# Username Change Implementation Guide

## 📋 Current State

**Status**: Username changes are **completely disabled**

### Current Implementation:
1. **EditProfileModal** (`src/components/Profile/Modals/EditProfileModal.tsx`):
   - Username field is **disabled** (`editable={false}`)
   - Shows message: "Username cannot be changed"
   - Username is **removed** from save data (line 85: `delete dataToSave.username`)

2. **Database Schema**:
   - No field to track if username has been changed
   - `user_profiles` table has `username` field but no `has_changed_username` flag

---

## 🎯 Desired Behavior

Users should be allowed **one username change**:

1. **First Change**: If user has never changed username, allow one change
2. **After First Change**: Once changed, username becomes permanent (cannot change again)
3. **UI Feedback**: Show appropriate messages based on change status

---

## 🔧 Implementation Steps

### Step 1: Database Migration

Add a field to track username changes:

```sql
-- Add column to track if username has been changed
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS has_changed_username BOOLEAN DEFAULT FALSE;
```

### Step 2: Update TypeScript Types

Update `src/types/profile.types.ts` (or wherever ProfileData is defined):

```typescript
export interface ProfileData {
  username: string;
  hasChangedUsername?: boolean; // Add this field
  // ... other fields
}
```

### Step 3: Update EditProfileModal

Modify `src/components/Profile/Modals/EditProfileModal.tsx`:

**Changes needed:**
1. Check `hasChangedUsername` to determine if username field should be editable
2. Add username availability check (similar to SignUpScreen)
3. Show appropriate messages based on change status
4. Allow username in save data if `hasChangedUsername === false`

### Step 4: Update Profile Update Logic

Modify `src/hooks/useProfileData.ts` or `src/services/buddiesService.ts`:

**Changes needed:**
1. When username is changed:
   - Check username availability
   - Update username in database
   - Set `has_changed_username = true`
   - Optionally store `original_username`

### Step 5: Update Profile Data Loading

Ensure `hasChangedUsername` is loaded when fetching profile data.

---

## 📝 Implementation Details

### UI States:

1. **Never Changed Username** (`hasChangedUsername === false`):
   - Username field: **Editable**
   - Hint: "You can change your username once. Choose carefully."
   - Show username availability check

2. **Already Changed Username** (`hasChangedUsername === true`):
   - Username field: **Disabled**
   - Hint: "Username cannot be changed. You've already used your one-time change."

### Validation:

1. **Username Availability**: Check if username is already taken (case-insensitive)
2. **Username Format**: Same validation as signup (min 3 chars, alphanumeric + underscore)
3. **Change Limit**: Only allow change if `hasChangedUsername === false`

### Database Update:

When username is changed:
```typescript
{
  username: newUsername,
  has_changed_username: true,
  updated_at: new Date().toISOString()
}
```

---

## 🔍 Current Code Locations

### Files to Modify:

1. **`src/components/Profile/Modals/EditProfileModal.tsx`**
   - Lines 79-99: `handleSave` function
   - Lines 240-253: Username field UI

2. **`src/hooks/useProfileData.ts`**
   - Lines 132-281: `loadProfileData` function
   - Lines 290-316: `updateProfileData` function

3. **`src/services/buddiesService.ts`**
   - `updateUserProfile` method (need to check if it exists)

4. **Database Schema**
   - Add `has_changed_username` column

---

## ✅ Testing Checklist

- [ ] User who never changed username can edit username field
- [ ] Username availability check works correctly
- [ ] After changing username, field becomes disabled
- [ ] User who already changed username cannot change again
- [ ] Database correctly updates `has_changed_username` flag
- [ ] Profile data correctly loads `hasChangedUsername` status
- [ ] UI messages are appropriate for each state
- [ ] Username validation matches signup validation

---

## 🚨 Important Considerations

1. **Existing Users**: All existing users should have `has_changed_username = false` (default)
2. **Username Uniqueness**: Must check availability before allowing change
3. **Error Handling**: Handle cases where username is already taken
4. **Cache Invalidation**: Invalidate profile cache after username change
5. **User Experience**: Show clear feedback about the one-time limit

---

## 📊 Flow Diagram

```
User opens Edit Profile Modal
    ↓
Check hasChangedUsername
    ↓
┌─────────────────────────┐
│ hasChangedUsername?     │
└─────────────────────────┘
    │
    ├─ false → Username editable
    │           ↓
    │      User changes username
    │           ↓
    │      Check availability
    │           ↓
    │      Save with has_changed_username = true
    │
    └─ true → Username disabled
              Show "Already changed" message
```

---

## 💡 Implementation Priority

**High Priority**: Core functionality
- Database migration
- EditProfileModal changes
- Profile update logic

**Medium Priority**: UX improvements
- Username availability check UI
- Loading states
- Error messages

**Low Priority**: Nice-to-have
- Username change history
- Admin tools to reset username changes

