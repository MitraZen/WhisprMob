# Whispr App Flow Diagram

## 🎯 **Visual App Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                        LANDING PAGE (/)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Sign Up   │  │   Sign In   │  │   Start Whispr-ing     │  │
│  │   Button    │  │   Button    │  │      Button            │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AUTH PAGE (/auth)                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Toggle: Sign Up ↔ Sign In                                 │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │
│  │  │ Email   │ │Password │ │Username │ │Display  │          │ │
│  │  │         │ │         │ │(SignUp) │ │Name     │          │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │           Submit Button (with loading)                │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                PROFILE COMPLETION (/profile-completion)        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Profile Form:                                             │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │
│  │  │ Gender  │ │   DOB   │ │ Country │ │   Bio   │          │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │           Complete Profile Button                     │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WHISPR NOTES (/whispr-notes)                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Main App Functionality:                                  │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  Send Anonymous Messages                              │ │ │
│  │  │  Mood-based Matching                                 │ │ │
│  │  │  Real-time Updates                                    │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BUDDIES (/buddies)                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ┌─────────────┐                    ┌─────────────────────┐ │ │
│  │  │   Sidebar   │                    │   Chat Interface   │ │ │
│  │  │             │                    │                     │ │
│  │  │ • Buddy List│                    │ • Message History  │ │ │
│  │  │ • Search    │                    │ • Typing Indicators│ │ │
│  │  │ • Filters   │                    │ • Message Input    │ │ │
│  │  │ • Actions   │                    │ • Real-time Updates│ │ │
│  │  └─────────────┘                    └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CHAT (/chat/[buddyId])                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Individual Chat Screen:                                   │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │  Chat Header (Buddy Info)                             │ │ │
│  │  │  Message List with Timestamps                         │ │ │
│  │  │  Typing Indicators                                     │ │ │
│  │  │  Message Input with Send Button                       │ │ │
│  │  │  Real-time Message Updates                            │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PROFILE (/profile/[userId])                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Profile View:                                             │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │
│  │  │ Profile │ │ Display │ │   Age   │ │Location │          │ │
│  │  │ Picture │ │  Name   │ │         │ │         │          │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │                    Bio/Description                     │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SETTINGS (/settings)                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Account Management:                                       │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │
│  │  │ Profile │ │ Privacy │ │  Theme  │ │ Delete  │          │ │
│  │  │ Editing │ │Settings │ │Preferences│ │Account │          │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

## 🔄 **Authentication Flow**

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Landing   │───▶│    Auth     │───▶│  Profile    │
│    Page     │    │    Page     │    │ Completion  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                 │                 │
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Sign Up   │    │   Sign In    │    │   Complete   │
│   Button    │    │   Button    │    │   Profile    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                 │                 │
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Auth      │    │   Auth      │    │   Whispr     │
│   Form      │    │   Form      │    │   Notes      │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 🎯 **Key User Paths**

### **New User Path:**
```
Landing → Sign Up → Profile Completion → Whispr Notes → Buddies → Chat
```

### **Returning User Path:**
```
Landing → Sign In → Whispr Notes → Buddies → Chat
```

### **Profile Management Path:**
```
Settings → Profile Editing → Save Changes
```

### **Chat Flow:**
```
Buddies List → Select Buddy → Chat Interface → Send Messages
```

## 📱 **Mobile App Considerations**

### **Screen Adaptations:**
- **Landing**: Full-screen with prominent auth buttons
- **Auth**: Single-column form layout
- **Profile Completion**: Step-by-step wizard
- **Whispr Notes**: Full-screen messaging interface
- **Buddies**: Tab-based navigation with chat
- **Chat**: Full-screen chat with keyboard handling
- **Profile**: Scrollable profile view
- **Settings**: List-based settings menu

### **Mobile-Specific Features:**
- **Push Notifications**: For new messages
- **Camera Integration**: For profile pictures
- **Location Services**: For country selection
- **Biometric Auth**: Fingerprint/Face ID
- **Offline Support**: Message queuing
- **Deep Linking**: Direct chat links

This visual flow diagram shows the complete structure and navigation paths of the Whispr website that you can use as a reference for developing the mobile app.
