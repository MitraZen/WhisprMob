// Example integration in AppNavigator.tsx
// Add this import at the top
import { WalkthroughProvider } from '@/store/WalkthroughContext';
import { WalkthroughManager } from '@/components/WalkthroughManager';

// Wrap your app content with WalkthroughProvider
const AppNavigator = () => {
  // ... existing code ...

  return (
    <WalkthroughProvider>
      {/* Your existing app content */}
      <View style={styles.container}>
        {/* ... existing screens ... */}
        
        {/* Add WalkthroughManager to main screens */}
        {currentScreen === 'notes' && (
          <WalkthroughManager 
            walkthroughId="main_app_tour" 
            autoShow={true}
            context="whispr_notes"
          />
        )}
        
        {currentScreen === 'buddies' && (
          <WalkthroughManager 
            walkthroughId="buddy_chat" 
            autoShow={true}
            context="buddies"
          />
        )}
      </View>
    </WalkthroughProvider>
  );
};
