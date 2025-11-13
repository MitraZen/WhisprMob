import { BackHandler, Alert } from 'react-native';

/**
 * Safe back navigation utility
 * Prevents users from accidentally navigating to sign-in screens
 */
export class SafeNavigation {
  
  /**
   * Handle Android back button with custom navigation flow
   * @param currentScreen - Current screen name
   * @param navigationHistory - Array of screen names in navigation history
   * @param isAuthenticated - Whether user is currently authenticated
   * @param onGoBack - Callback to handle safe back navigation
   * @param fallbackScreen - Screen to navigate to if no safe back option
   */
  static handleBackButton(
    currentScreen: string,
    navigationHistory: string[],
    isAuthenticated: boolean,
    onGoBack: (screen: string) => void,
    fallbackScreen: string = 'notes'
  ): boolean {
    
    // Handle unauthenticated auth screens - navigate to welcome
    if (!isAuthenticated) {
      switch (currentScreen) {
        case 'signup':
        case 'signin':
          // From signup/signin screens, go back to welcome
          onGoBack('welcome');
          return true;
          
        case 'welcome':
          // At welcome screen, show exit confirmation
          Alert.alert(
            'Exit App',
            'Are you sure you want to exit Whispr?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() }
            ]
          );
          return true;
          
        default:
          // For other unauthenticated screens, try to go back to welcome
          if (navigationHistory.includes('welcome')) {
            onGoBack('welcome');
            return true;
          }
          // If no welcome in history, show exit confirmation
          Alert.alert(
            'Exit App',
            'Are you sure you want to exit Whispr?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() }
            ]
          );
          return true;
      }
    }
    
    // Custom back button behavior based on current screen (authenticated users)
    switch (currentScreen) {
      case 'buddies':
        // Buddies screen -> Notes screen
        onGoBack('notes');
        return true;
        
      case 'liveWhisprs':
        // Live Whispers screen -> Buddies screen
        onGoBack('buddies');
        return true;
        
      case 'settingsHub':
        // Settings Hub screen -> Notes screen
        onGoBack('notes');
        return true;
        
      case 'notes':
        // Notes screen -> Show exit confirmation
        Alert.alert(
          'Exit App',
          'Are you sure you want to exit Whispr?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() }
          ]
        );
        return true;
        
      default:
        // For other screens, use the original safe navigation logic
        if (navigationHistory.length > 1) {
          const safeHistory = navigationHistory.filter(screen => 
            !['signin', 'signup', 'welcome'].includes(screen)
          );
          
          if (safeHistory.length > 1) {
            // Go back to the last safe screen
            const previousSafeScreen = safeHistory[safeHistory.length - 2];
            onGoBack(previousSafeScreen);
            return true;
          } else {
            // No safe screens in history, go to fallback
            onGoBack(fallbackScreen);
            return true;
          }
        }
        break;
    }
    
    // Fallback: show exit confirmation
    Alert.alert(
      'Exit App',
      'Are you sure you want to exit Whispr?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() }
      ]
    );
    return true;
  }
  
  /**
   * Get safe navigation history by filtering out auth screens
   * @param navigationHistory - Original navigation history
   * @param isAuthenticated - Whether user is authenticated
   */
  static getSafeNavigationHistory(
    navigationHistory: string[],
    isAuthenticated: boolean
  ): string[] {
    if (!isAuthenticated) {
      return navigationHistory;
    }
    
    return navigationHistory.filter(screen => 
      !['signin', 'signup', 'welcome'].includes(screen)
    );
  }
  
  /**
   * Check if a screen is safe to navigate back to
   * @param screen - Screen name to check
   * @param isAuthenticated - Whether user is authenticated
   */
  static isSafeScreen(screen: string, isAuthenticated: boolean): boolean {
    if (!isAuthenticated) {
      return true; // All screens are safe for unauthenticated users
    }
    
    // Auth screens are not safe for authenticated users
    return !['signin', 'signup', 'welcome'].includes(screen);
  }
  
  /**
   * Get the appropriate fallback screen based on authentication status
   * @param isAuthenticated - Whether user is authenticated
   * @param isProfileComplete - Whether user profile is complete
   */
  static getFallbackScreen(
    isAuthenticated: boolean,
    isProfileComplete: boolean
  ): string {
    if (!isAuthenticated) {
      return 'welcome';
    }
    
    if (!isProfileComplete) {
      return 'profileCompletion';
    }
    
    return 'notes';
  }
}

export default SafeNavigation;

