# 📱 Whispr Mobile App - Screen Flow Documentation

**Last Updated:** January 2025  
**Version:** 2.0.5

This document provides a comprehensive overview of all screens in the Whispr mobile app and how they connect to each other.

---

## 🏗️ **Navigation Architecture**

### **Main Navigation Controller**
- **File:** `src/navigation/AppNavigator.tsx`
- **Type:** Custom state-based navigation (no React Navigation)
- **State Management:** 
  - `currentScreen`: Current active screen
  - `currentParams`: Parameters passed to screens
  - `navigationHistory`: Stack of visited screens

### **Navigation Function**
```typescript
const navigate = (screen: string, params?: any) => {
  setCurrentParams(params ?? null);
  setCurrentScreen(screen);
  // Updates navigation history
};
```

### **Back Navigation**
- Custom `goBack()` function that respects authentication state
- Android hardware back button handling via `SafeNavigation`
- Prevents going back to auth screens when authenticated

---

## 📊 **Complete Screen Flow Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP ENTRY POINT                          │
│                      (App.tsx → AppNavigator)                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION CHECK                         │
│  • isLoading → Loading Screen (ActivityIndicator)              │
│  • isAdminMode → AdminPanel                                    │
│  • !isAuthenticated → WelcomeScreen                            │
│  • isAuthenticated && !isProfileComplete → ProfileCompletion   │
│  • isAuthenticated && isProfileComplete → NotesScreen          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────┐         ┌──────────────────┐
│ UNAUTHENTICATED        │  AUTHENTICATED    │
│    FLOW                │      FLOW         │
└───────────────┘         └──────────────────┘
```

---

## 🔐 **Authentication Flow**

### **1. Welcome Screen** (`welcome`)
- **File:** `src/screens/WelcomeScreen.tsx`
- **Purpose:** App entry point for unauthenticated users
- **Navigation Out:**
  - `onNavigate('signin')` → Sign In Screen
  - `onNavigate('signup')` → Sign Up Screen
- **Guards:** None (public screen)

### **2. Sign In Screen** (`signin`)
- **File:** `src/screens/AuthScreens.tsx` (SignInScreen)
- **Purpose:** User authentication
- **Navigation Out:**
  - `onSignInSuccess()` → Notes Screen (auto-navigate)
  - `onBackToWelcome()` → Welcome Screen
  - `onForgotPassword()` → Password Reset Screen
- **Guards:** None (public screen)

### **3. Sign Up Screen** (`signup`)
- **File:** `src/screens/AuthScreens.tsx` (SignUpScreen)
- **Purpose:** New user registration
- **Navigation Out:**
  - `onSignUpSuccess()` → Notes Screen (auto-navigate)
  - `onBackToWelcome()` → Welcome Screen
- **Guards:** None (public screen)

### **4. Password Reset Flow**

#### **4a. Password Reset Screen** (`passwordReset`)
- **File:** `src/screens/PasswordResetScreen.tsx`
- **Purpose:** Request password reset code
- **Navigation Out:**
  - `onCodeSent(email)` → Verify Reset Code Screen
  - `onBackToSignIn()` → Sign In Screen
- **Guards:** None (public screen)

#### **4b. Verify Reset Code Screen** (`verifyResetCode`)
- **File:** `src/screens/VerifyResetCodeScreen.tsx`
- **Purpose:** Verify password reset code
- **Navigation Out:**
  - `onCodeVerified(code)` → Set New Password Screen
  - `onBack()` → Password Reset Screen
  - `onResendCode()` → Stays on screen (resends code)
- **Guards:** None (public screen)

#### **4c. Set New Password Screen** (`setNewPassword`)
- **File:** `src/screens/SetNewPasswordScreen.tsx`
- **Purpose:** Set new password after code verification
- **Navigation Out:**
  - `onPasswordUpdated()` → Sign In Screen
  - `onBack()` → Verify Reset Code Screen
- **Guards:** None (public screen)

### **5. Profile Completion Screen** (`profileCompletion`)
- **File:** `src/screens/ProfileCompletionScreen.tsx`
- **Purpose:** Complete user profile after signup
- **Navigation Out:**
  - `onComplete()` → Notes Screen
- **Guards:** 
  - Auto-shown when `isAuthenticated && !isProfileComplete`
  - Cannot be skipped

---

## 🏠 **Main App Flow (Authenticated)**

### **6. Notes Screen** (`notes`) - **MAIN SCREEN**
- **File:** `src/screens/WhisprNotesScreen.tsx`
- **Purpose:** Display anonymous Whispr notes feed
- **Navigation Out:**
  - `onNavigate('sendNote')` → Send Note Screen
  - `onNavigate('sentNotes')` → Sent Notes Screen
  - `onNavigate('buddies')` → Buddies Screen (via NavigationMenu)
  - `onNavigate('liveWhisprs')` → Live Whisprs Screen (via NavigationMenu)
  - `onNavigate('settingsHub')` → Settings Hub Screen (via NavigationMenu)
  - `onNavigate('profile')` → Profile Screen
- **Guards:** Requires authentication
- **Features:**
  - Displays anonymous notes feed
  - Pull-to-refresh
  - Note expansion/collapse
  - Share Your Whispr button (pulsing animation)
  - Sent Notes card

### **7. Send Note Screen** (`sendNote`)
- **File:** `src/screens/SendNoteScreen.tsx`
- **Purpose:** Compose and send anonymous Whispr notes
- **Navigation Out:**
  - `onGoBack()` → Previous screen (usually Notes)
  - `onNavigate('notes')` → Notes Screen (after successful send)
- **Guards:** Requires authentication
- **Features:**
  - Mood selection
  - AI enhancement options
  - Draft autosave
  - Character count
  - Success animation

### **8. Sent Notes Screen** (`sentNotes`)
- **File:** `src/screens/SentNotesScreen.tsx`
- **Purpose:** View user's sent notes and their impact
- **Navigation Out:**
  - `onGoBack()` → Previous screen (usually Notes)
- **Guards:** Requires authentication
- **Features:**
  - List of sent notes
  - View note details
  - Delete notes

---

## 👥 **Social Features**

### **9. Buddies Screen** (`buddies`)
- **File:** `src/screens/BuddiesScreen.tsx`
- **Purpose:** List of user's buddies/connections
- **Navigation Out:**
  - `onNavigate('chat', { buddy })` → Chat Screen
  - `onNavigate('buddyRequests')` → Buddy Requests Screen
  - `onNavigate('notes')` → Notes Screen (via NavigationMenu)
  - `onNavigate('liveWhisprs')` → Live Whisprs Screen (via NavigationMenu)
  - `onNavigate('settingsHub')` → Settings Hub Screen (via NavigationMenu)
  - `onNavigate('profile')` → Profile Screen
- **Guards:** Requires authentication
- **Features:**
  - Buddy list with online status
  - Unread message counts
  - Search/filter buddies
  - Pull-to-refresh

### **10. Buddy Requests Screen** (`buddyRequests`)
- **File:** `src/screens/BuddyRequestsScreen.tsx`
- **Purpose:** Manage incoming/outgoing buddy requests
- **Navigation Out:**
  - `onNavigate('buddies')` → Buddies Screen
  - `onNavigate('chat', { buddy })` → Chat Screen (after accepting)
- **Guards:** Requires authentication
- **Features:**
  - Incoming requests
  - Outgoing requests
  - Accept/decline actions

### **11. Chat Screen** (`chat`)
- **File:** `src/screens/UnifiedChatScreen.tsx`
- **Purpose:** One-on-one chat with a buddy
- **Navigation Out:**
  - `onBack()` → Previous screen (usually Buddies)
  - `onNavigate('buddies')` → Buddies Screen
- **Guards:** Requires authentication
- **Parameters:**
  - `buddy`: Buddy object (optional)
  - `buddyId`: Buddy ID (optional, used if buddy not provided)
  - `buddyName`: Buddy name (optional, used if buddy not provided)
  - `fromNotification`: Boolean (indicates navigation from notification)
  - `buddyPromise`: Promise to resolve buddy asynchronously
- **Features:**
  - Real-time messaging
  - Message history
  - Typing indicators
  - Online status
  - Notification navigation support

---

## 📡 **Live Features**

### **12. Live Whisprs Screen** (`liveWhisprs`)
- **File:** `src/screens/LiveWhisprsScreen.tsx`
- **Purpose:** Real-time anonymous whispers feed
- **Navigation Out:**
  - `onNavigate('notes')` → Notes Screen (via NavigationMenu)
  - `onNavigate('buddies')` → Buddies Screen (via NavigationMenu)
  - `onNavigate('settingsHub')` → Settings Hub Screen (via NavigationMenu)
- **Guards:** Requires authentication
- **Features:**
  - Real-time note updates
  - WebSocket connection
  - Live feed display

---

## ⚙️ **Settings & Profile**

### **13. Settings Hub Screen** (`settingsHub`)
- **File:** `src/screens/SettingsHubScreen.tsx`
- **Purpose:** Central settings hub with categorized options
- **Navigation Out:**
  - `onNavigate('settings')` → Settings Screen
  - `onNavigate('profile')` → Profile Screen
  - `onNavigate('notes')` → Notes Screen (via NavigationMenu)
  - `onNavigate('buddies')` → Buddies Screen (via NavigationMenu)
  - `onNavigate('liveWhisprs')` → Live Whisprs Screen (via NavigationMenu)
- **Guards:** Requires authentication
- **Features:**
  - Categorized settings
  - Quick access to common settings

### **14. Settings Screen** (`settings`)
- **File:** `src/screens/SettingsScreen.tsx`
- **Purpose:** App settings and preferences
- **Navigation Out:**
  - `onNavigate('notes')` → Notes Screen
  - `onNavigate('profile')` → Profile Screen
  - `onLogout()` → Welcome Screen (after logout)
- **Guards:** Requires authentication
- **Features:**
  - Theme settings
  - Notification preferences
  - Account settings
  - Logout

### **15. Profile Screen** (`profile`)
- **File:** `src/screens/ProfileScreen.tsx`
- **Purpose:** User profile and statistics
- **Navigation Out:**
  - `onNavigate('notes')` → Notes Screen
  - `onNavigate('settingsHub')` → Settings Hub Screen
  - `onNavigate('settings')` → Settings Screen
  - `onNavigate('achievements')` → Achievements Screen
- **Guards:** Requires authentication
- **Features:**
  - User profile information
  - Statistics
  - Conversation state
  - Profile options

### **16. Achievements Screen** (`achievements`)
- **File:** `src/screens/AchievementsScreen.tsx`
- **Purpose:** User achievements and badges
- **Navigation Out:**
  - `onNavigate('profile')` → Profile Screen
  - `onNavigate('notes')` → Notes Screen
- **Guards:** Requires authentication
- **Features:**
  - Achievement list
  - Progress tracking
  - Badge display

---

## 🔔 **Notifications**

### **17. Notifications Screen** (`notifications`)
- **File:** `src/screens/NotificationsScreen.tsx`
- **Purpose:** View app notifications
- **Navigation Out:**
  - `onGoBack()` → Previous screen
  - `onNavigate('chat', { buddy })` → Chat Screen (from notification tap)
- **Guards:** Requires authentication
- **Features:**
  - Notification list
  - Mark as read
  - Navigate to related content

---

## 🌍 **Location Features**

### **18. Nearby Screen** (`nearby`)
- **File:** `src/modules/nearby/NearbyScreen.tsx`
- **Purpose:** Find nearby users/notes
- **Navigation Out:**
  - `onNavigate('notes')` → Notes Screen
  - `onNavigate('buddies')` → Buddies Screen
- **Guards:** Requires authentication
- **Features:**
  - Location-based discovery
  - Nearby users/notes

---

## 🧪 **Development/Testing Screens**

### **19. WebSocket Test Screen** (`websocketTest`)
- **File:** `src/screens/WebSocketTestScreen.tsx`
- **Purpose:** Test WebSocket connections
- **Navigation Out:** None (standalone)
- **Guards:** Requires authentication
- **Note:** Development/testing only

### **20. Activity Screen** (`activity`)
- **File:** `src/screens/ActivityScreen.tsx`
- **Purpose:** View user activity log
- **Navigation Out:** None (standalone)
- **Guards:** Requires authentication
- **Features:**
  - Activity timeline
  - User actions log

### **21. Mood Selection Screen** (`mood`)
- **File:** `src/navigation/AppNavigator.tsx` (inline component)
- **Purpose:** Select mood for anonymous connection
- **Navigation Out:**
  - `onNavigate('home')` → Home Screen (after selection)
  - `onNavigate('welcome')` → Welcome Screen (back)
- **Guards:** None (public screen)
- **Note:** Legacy screen, may not be actively used

### **22. Admin Panel** (`admin`)
- **File:** `src/screens/AdminPanel.tsx`
- **Purpose:** Admin panel for app management
- **Navigation Out:**
  - `onClose()` → Welcome Screen
- **Guards:** 
  - Requires `isAdminMode === true`
  - Shown automatically when admin mode is enabled

---

## 🧭 **Navigation Menu**

The bottom navigation menu appears on main screens:

### **NavigationMenu Component**
- **File:** `src/components/NavigationMenu.tsx`
- **Screens with Menu:**
  - Notes Screen
  - Buddies Screen
  - Live Whisprs Screen
  - Settings Hub Screen

### **Menu Items:**
1. **Notes** (`notes`) - Document icon
2. **Buddies** (`buddies`) - People icon
3. **Live Whisprs** (`liveWhisprs`) - Radio icon
4. **Settings** (`settingsHub`) - Settings icon

### **Menu Behavior:**
- Active tab highlighted with purple color
- Animated lift effect on active tab
- Smooth transitions between screens

---

## 🔄 **Navigation Patterns**

### **1. Authentication Flow**
```
Welcome → Sign In/Sign Up → Profile Completion → Notes
```

### **2. Password Reset Flow**
```
Sign In → Password Reset → Verify Code → Set New Password → Sign In
```

### **3. Main App Navigation**
```
Notes ↔ Buddies ↔ Live Whisprs ↔ Settings Hub
  ↓       ↓           ↓              ↓
Send    Chat      (various)      Settings
Note                              Profile
  ↓
Sent Notes
```

### **4. Chat Flow**
```
Buddies → Chat (with buddy) → Back to Buddies
  OR
Notification → Chat (with buddyId/buddyName) → Back to Buddies
```

### **5. Note Creation Flow**
```
Notes → Send Note → (Success) → Notes
  OR
Notes → Send Note → (Cancel) → Notes
```

---

## 🛡️ **Authentication Guards**

### **Public Screens** (No authentication required)
- `welcome`
- `signin`
- `signup`
- `passwordReset`
- `verifyResetCode`
- `setNewPassword`
- `mood`

### **Protected Screens** (Authentication required)
All other screens require authentication. If accessed without authentication, user is redirected to `signin`.

### **Auto-Redirect Logic**
- When user becomes authenticated, any auth screens are automatically redirected to `notes`
- When user logs out, redirected to `welcome`
- Back button prevents going back to auth screens when authenticated

---

## 📱 **Notification Navigation**

### **Notification Tap Handling**
When a notification is tapped:
1. Event `navigateToChat` is emitted
2. `AppNavigator` listens for this event
3. Buddy is resolved (by ID, name, or from cache)
4. Navigation to Chat Screen with buddy information
5. If buddy not found, navigates to Buddies Screen

### **Notification Parameters**
- `buddy`: Complete buddy object (preferred)
- `buddyId`: Buddy ID for lookup
- `buddyName`: Buddy name for lookup
- `fromNotification`: Boolean flag
- `buddyPromise`: Promise for async buddy resolution

---

## 🔙 **Back Navigation**

### **Android Hardware Back Button**
- Custom handler via `SafeNavigation.handleBackButton()`
- Respects navigation history
- Prevents going back to auth screens when authenticated
- Falls back to appropriate screen based on auth state

### **Screen Back Handlers**
- Most screens have `onGoBack()` callback
- Some screens use `onNavigate()` to go to specific screen
- NavigationMenu provides quick navigation between main screens

---

## 📝 **Screen Parameters**

### **Common Parameters**
- `user`: Current user object (passed to most authenticated screens)
- `buddy`: Buddy object (for chat-related screens)
- `refreshTrigger`: Trigger for refreshing data (Buddies Screen)

### **Chat Screen Parameters**
- `buddy`: Buddy object
- `buddyId`: Buddy ID
- `buddyName`: Buddy name
- `fromNotification`: Boolean
- `buddyPromise`: Promise<Buddy>

---

## 🎯 **Key Navigation Functions**

### **In AppNavigator:**
- `navigate(screen: string, params?: any)`: Navigate to screen
- `goBack()`: Go back to previous screen
- `setCurrentScreen(screen: string)`: Direct screen change
- `setCurrentParams(params: any)`: Update screen parameters

### **In Screens:**
- `onNavigate(screen: string, params?: any)`: Navigate to another screen
- `onGoBack()`: Go back to previous screen

---

## 📊 **Screen Summary Table**

| Screen ID | Screen Name | File | Auth Required | Navigation Menu |
|-----------|-------------|------|---------------|-----------------|
| `welcome` | Welcome | WelcomeScreen.tsx | ❌ | ❌ |
| `signin` | Sign In | AuthScreens.tsx | ❌ | ❌ |
| `signup` | Sign Up | AuthScreens.tsx | ❌ | ❌ |
| `passwordReset` | Password Reset | PasswordResetScreen.tsx | ❌ | ❌ |
| `verifyResetCode` | Verify Code | VerifyResetCodeScreen.tsx | ❌ | ❌ |
| `setNewPassword` | Set Password | SetNewPasswordScreen.tsx | ❌ | ❌ |
| `profileCompletion` | Profile Completion | ProfileCompletionScreen.tsx | ✅ | ❌ |
| `notes` | Notes | WhisprNotesScreen.tsx | ✅ | ✅ |
| `sendNote` | Send Note | SendNoteScreen.tsx | ✅ | ❌ |
| `sentNotes` | Sent Notes | SentNotesScreen.tsx | ✅ | ❌ |
| `buddies` | Buddies | BuddiesScreen.tsx | ✅ | ✅ |
| `buddyRequests` | Buddy Requests | BuddyRequestsScreen.tsx | ✅ | ❌ |
| `chat` | Chat | UnifiedChatScreen.tsx | ✅ | ❌ |
| `liveWhisprs` | Live Whisprs | LiveWhisprsScreen.tsx | ✅ | ✅ |
| `settingsHub` | Settings Hub | SettingsHubScreen.tsx | ✅ | ✅ |
| `settings` | Settings | SettingsScreen.tsx | ✅ | ❌ |
| `profile` | Profile | ProfileScreen.tsx | ✅ | ❌ |
| `achievements` | Achievements | AchievementsScreen.tsx | ✅ | ❌ |
| `notifications` | Notifications | NotificationsScreen.tsx | ✅ | ❌ |
| `nearby` | Nearby | NearbyScreen.tsx | ✅ | ❌ |
| `websocketTest` | WebSocket Test | WebSocketTestScreen.tsx | ✅ | ❌ |
| `activity` | Activity | ActivityScreen.tsx | ✅ | ❌ |
| `mood` | Mood Selection | AppNavigator.tsx | ❌ | ❌ |
| `admin` | Admin Panel | AdminPanel.tsx | ✅* | ❌ |

*Admin Panel requires `isAdminMode === true`

---

## 🔍 **Finding Navigation Code**

### **Main Navigation Logic:**
- `src/navigation/AppNavigator.tsx` - All screen routing and navigation logic

### **Screen Files:**
- `src/screens/*.tsx` - Individual screen components

### **Navigation Components:**
- `src/components/NavigationMenu.tsx` - Bottom navigation menu

### **Navigation Utilities:**
- `src/utils/safeNavigation.ts` - Safe navigation helpers and back button handling

---

## 📌 **Notes**

1. **No React Navigation**: This app uses a custom state-based navigation system instead of React Navigation library.

2. **Navigation History**: The app maintains a navigation history stack, but it's not a true stack navigator - it's more of a history log.

3. **Authentication Guards**: Most screens check authentication status and redirect to sign-in if not authenticated.

4. **Notification Navigation**: Special handling for deep linking from push notifications to chat screens.

5. **Back Button**: Custom Android back button handling prevents navigation to auth screens when authenticated.

6. **NavigationMenu**: Only appears on main screens (Notes, Buddies, Live Whisprs, Settings Hub).

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Maintained By:** Development Team


