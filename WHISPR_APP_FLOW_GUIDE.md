# Whispr App Flow Guide

## 🎯 **Complete User Journey & App Flow**

This document outlines the complete app flow for the Whispr website, which you can use as a reference for developing the mobile app.

---

## 📱 **Main App Flow**

### **1. Landing Page (`/`)**
- **Purpose**: First impression and authentication entry point
- **Components**: 
  - Logo with animation
  - App title "Whispr"
  - Subtitle: "Send anonymous messages to the world"
  - **Auth Buttons**: Sign Up & Sign In (prominent, above main CTA)
  - **Main CTA**: "Start Whispr-ing" button
  - Feature cards (Anonymous, Mood-Based, Safe & Secure)

### **2. Authentication Flow**

#### **Auth Page (`/auth`)**
- **Purpose**: User authentication (sign up/sign in)
- **Components**:
  - Toggle between Sign Up and Sign In
  - Email input
  - Password input
  - Username input (sign up only)
  - Display Name input (sign up only)
  - Submit button with loading states
  - Error handling with specific messages

#### **Profile Completion (`/profile-completion`)**
- **Purpose**: Complete user profile after authentication
- **Trigger**: Middleware redirects here if profile is incomplete
- **Components**:
  - Profile form with required fields
  - Gender selection
  - Date of birth
  - Country selection
  - Bio/description
  - Profile picture upload
- **Redirect**: After completion → `/whispr-notes`

---

## 🏠 **Main App Pages**

### **3. Whispr Notes (`/whispr-notes`)**
- **Purpose**: Main app functionality - anonymous messaging
- **Components**:
  - Message input area
  - Send anonymous messages
  - Message history
  - Mood-based matching
  - Real-time updates

### **4. Buddies (`/buddies`)**
- **Purpose**: Manage connections and chat with matched users
- **Components**:
  - Buddy list sidebar
  - Search and filter options
  - Online status indicators
  - Unread message counts
  - Buddy actions (block, delete, clear chat)
  - Chat interface
- **Features**:
  - Pin/unpin buddies
  - Filter by: All, Unread, Pinned, Online
  - Real-time status updates

### **5. Chat (`/chat/[buddyId]`)**
- **Purpose**: Individual chat with a specific buddy
- **Components**:
  - Chat header with buddy info
  - Message list with timestamps
  - Typing indicators
  - Message input with send button
  - Real-time message updates
  - Message status (sent, delivered, read)

### **6. Profile (`/profile/[userId]`)**
- **Purpose**: View user profiles
- **Components**:
  - Profile picture
  - Display name and username
  - Bio/description
  - Personal information (age, location, gender)
  - Profile completion status

### **7. Settings (`/settings`)**
- **Purpose**: User account management
- **Components**:
  - Profile editing
  - Account settings
  - Privacy settings
  - Delete account option
  - Theme preferences

---

## 🔧 **Admin & Debug Pages**

### **8. Admin Dashboard (`/admin`)**
- **Purpose**: Administrative tools and debugging
- **Tabs**:
  - RLS Test
  - Auth Debug
  - Auth Performance
  - Database Setup
  - Database Health
  - PWA Status
  - Chat Debug
  - Notes Test
  - Debug Notes

### **9. Debug Pages**
- **Auth Debug (`/auth-debug`)**: Authentication testing
- **Auth Performance (`/auth-performance`)**: Performance monitoring
- **Database Health (`/database-health`)**: Database monitoring
- **Database Setup (`/database-setup`)**: Database configuration
- **PWA Status (`/pwa-status`)**: PWA functionality
- **Chat Debug (`/chat-debug`)**: Chat system testing
- **RLS Test (`/rls-test`)**: Row Level Security testing
- **Debug Whispr (`/debug-whispr`)**: Notes system debugging

---

## 🔄 **Authentication & Authorization Flow**

### **Middleware Protection**
- **Route**: `src/middleware.ts`
- **Function**: Protects routes and checks profile completion
- **Logic**:
  1. Check if user is authenticated
  2. If authenticated, check profile completion
  3. If profile incomplete → redirect to `/profile-completion`
  4. Allow access to auth pages and home page

### **Auth Provider**
- **File**: `src/components/auth-provider.tsx`
- **Functions**:
  - `signIn()`: Authenticate user
  - `signUp()`: Create new account
  - `signOut()`: Logout user
  - `updateProfile()`: Update user profile
  - `isProfileComplete()`: Check profile status

---

## 📊 **State Management**

### **Zustand Stores**
1. **App Store** (`src/store/app-store.ts`): Global app state
2. **Buddies Store** (`src/store/buddies-store.ts`): Buddy management
3. **Notes Store** (`src/store/notes-store.ts`): Whispr notes

### **Key State Variables**
- User authentication status
- Profile completion status
- Buddy list and status
- Message history
- Online status
- Unread counts

---

## 🎨 **UI Components**

### **Core Components**
- **Navigation**: Main app navigation
- **AuthForm**: Authentication forms
- **ProfileCompletionForm**: Profile setup
- **BuddySidebar**: Buddy list management
- **HybridChatInterface**: Chat functionality
- **WhisprNoteInbox**: Notes system
- **ThemeProvider**: Dark/light mode

### **UI Library**
- **Shadcn UI**: Base components
- **Radix UI**: Advanced components
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations
- **Lucide React**: Icons

---

## 🔌 **API Routes**

### **Chat API (`/api/chat`)**
- **Purpose**: Handle chat messages
- **Methods**: POST
- **Function**: Process and store messages

### **Typing API (`/api/chat/typing`)**
- **Purpose**: Handle typing indicators
- **Methods**: POST
- **Function**: Real-time typing status

### **Delete Account API (`/api/delete-account`)**
- **Purpose**: Secure account deletion
- **Methods**: POST
- **Function**: Delete user account and data

---

## 📱 **Mobile Considerations**

### **Responsive Design**
- Mobile-first approach
- Responsive breakpoints
- Touch-friendly interfaces
- Optimized for small screens

### **PWA Features**
- Service worker
- Offline functionality
- Install prompts
- Push notifications

---

## 🚀 **Key Features to Implement in Mobile App**

### **1. Authentication Flow**
- Sign up/Sign in screens
- Profile completion flow
- Biometric authentication (mobile-specific)

### **2. Main App Screens**
- Whispr Notes (main functionality)
- Buddies list with search/filter
- Individual chat screens
- Profile viewing
- Settings management

### **3. Real-time Features**
- Live message updates
- Typing indicators
- Online status
- Push notifications

### **4. Mobile-Specific Features**
- Camera integration for profile pictures
- Location services
- Push notifications
- Offline message queuing
- Biometric authentication

---

## 📋 **Development Checklist for Mobile App**

### **Core Screens**
- [ ] Landing/Onboarding
- [ ] Authentication (Sign Up/Sign In)
- [ ] Profile Completion
- [ ] Whispr Notes (main screen)
- [ ] Buddies List
- [ ] Chat Interface
- [ ] Profile Viewing
- [ ] Settings

### **Authentication**
- [ ] Email/password authentication
- [ ] Profile creation
- [ ] Profile completion flow
- [ ] Session management

### **Real-time Features**
- [ ] Live messaging
- [ ] Typing indicators
- [ ] Online status
- [ ] Push notifications

### **Mobile Features**
- [ ] Camera integration
- [ ] Location services
- [ ] Offline support
- [ ] Biometric auth
- [ ] Deep linking

---

## 🎯 **User Flow Summary**

```
Landing Page → Auth → Profile Completion → Whispr Notes
     ↓              ↓           ↓              ↓
   Sign Up      Sign In    Complete      Main App
   Sign In      Success    Profile       Features
     ↓              ↓           ↓              ↓
   Auth Page → Profile → Whispr Notes → Buddies/Chat
```

This flow ensures users go through proper onboarding and land directly on the main app functionality after authentication.

---

## 📝 **Notes for Mobile Development**

1. **Follow the same authentication flow** but adapt UI for mobile
2. **Implement the same state management** patterns
3. **Use the same API endpoints** for consistency
4. **Add mobile-specific features** like camera, location, push notifications
5. **Maintain the same user experience** but optimize for touch interfaces
6. **Implement offline functionality** for better mobile experience

This guide provides the complete structure and flow of the Whispr website that you can use as a reference for developing the mobile app.
