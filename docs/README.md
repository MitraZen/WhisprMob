# Whispr Mobile App

A React Native mobile application for anonymous messaging and mood-based connections.

## Features

- 🔒 **100% Anonymous**: Complete privacy protection
- 💭 **Mood-Based Matching**: Connect with others who share your emotions
- 🛡️ **End-to-End Encryption**: Secure message transmission
- 💬 **Real-Time Chat**: Instant messaging with WebSocket support
- 📱 **Cross-Platform**: Works on both iOS and Android

## Tech Stack

- **React Native 0.73** with TypeScript
- **React Navigation 6** for navigation
- **React Native Paper** for UI components
- **TanStack Query** for data fetching
- **Zustand** for state management
- **Custom Chat Interface** for messaging
- **Crypto-JS** for encryption
- **AsyncStorage** for local storage

## Getting Started

### Prerequisites

- Node.js 18+
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Quick Setup

**Windows Users:**
```bash
setup.bat
```

**Mac/Linux Users:**
```bash
chmod +x setup.sh
./setup.sh
```

### Manual Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Whispr_Mobile_App_Dev
```

2. Install dependencies:
```bash
npm install
```

3. Install iOS dependencies (iOS only):
```bash
cd ios && pod install && cd ..
```

4. Start the Metro bundler:
```bash
npm start
```

5. Run the app:
```bash
# Android
npm run android

# iOS
npm run ios
```

### Troubleshooting

If you encounter package installation errors:

1. Clear npm cache:
```bash
npm cache clean --force
```

2. Delete node_modules and package-lock.json:
```bash
rm -rf node_modules package-lock.json
```

3. Reinstall:
```bash
npm install
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── navigation/          # Navigation configuration
├── screens/            # Screen components
├── services/           # API and external services
├── store/              # State management
├── types/              # TypeScript type definitions
└── utils/              # Helper functions and utilities
```

## Key Features Implementation

### Anonymous Authentication
- Users create anonymous sessions with mood selection
- No personal information required
- Session data stored locally with encryption

### Mood-Based Connections
- 10 different mood types with emoji representations
- Algorithm matches users with similar moods
- Real-time mood updates

### Secure Messaging
- End-to-end encryption for all messages
- WebSocket for real-time communication
- Message history stored locally

### Privacy Protection
- No user data stored on servers
- Anonymous IDs for user identification
- Encrypted local storage

## Development

### Code Style
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Functional components with hooks
- Custom hooks for reusable logic

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## API Integration

The app integrates with the Whispr API for:
- User management
- Connection matching
- Message delivery
- Real-time updates

API endpoints are configured in `src/services/api.ts`.

## Security Considerations

- All messages are encrypted before transmission
- Anonymous user IDs prevent identity tracking
- Local storage encryption for sensitive data
- Secure WebSocket connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.
