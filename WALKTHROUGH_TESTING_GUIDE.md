# 🧪 **Walkthrough System Testing Guide**

## **Quick Testing Steps**

### **1. Reset Walkthroughs (Start Fresh)**
```typescript
// Add this to any component temporarily for testing
import { useWalkthrough } from '@/store/WalkthroughContext';

const TestComponent = () => {
  const { resetAllWalkthroughs } = useWalkthrough();
  
  const handleReset = async () => {
    await resetAllWalkthroughs();
    console.log('✅ All walkthroughs reset - they will show again');
  };

  return (
    <TouchableOpacity onPress={handleReset}>
      <Text>Reset Walkthroughs</Text>
    </TouchableOpacity>
  );
};
```

### **2. Manual Walkthrough Trigger**
```typescript
// Add this to any screen to manually start a walkthrough
import { useWalkthrough } from '@/store/WalkthroughContext';

const TestScreen = () => {
  const { showWalkthrough } = useWalkthrough();
  
  const handleStartTour = async () => {
    await showWalkthrough('main_app_tour');
  };

  return (
    <TouchableOpacity onPress={handleStartTour}>
      <Text>Start Main App Tour</Text>
    </TouchableOpacity>
  );
};
```

### **3. Check Walkthrough Status**
```typescript
// Check if a walkthrough has been completed
import WalkthroughService from '@/services/walkthroughService';

const checkStatus = async () => {
  const isCompleted = await WalkthroughService.isWalkthroughCompleted('main_app_tour');
  console.log('Main app tour completed:', isCompleted);
  
  const stats = await WalkthroughService.getCompletionStats();
  console.log('Completion stats:', stats);
};
```

---

## **🔧 Testing Methods**

### **Method 1: Integration Testing**

1. **Add WalkthroughProvider to AppNavigator:**
```typescript
// AppNavigator.tsx
import { WalkthroughProvider } from '@/store/WalkthroughContext';

const AppNavigator = () => {
  return (
    <WalkthroughProvider>
      {/* Your existing app content */}
    </WalkthroughProvider>
  );
};
```

2. **Add WalkthroughManager to WhisprNotesScreen:**
```typescript
// WhisprNotesScreen.tsx
import { WalkthroughManager } from '@/components/WalkthroughManager';

export const WhisprNotesScreen = ({ onNavigate, user }) => {
  return (
    <View>
      {/* Your existing content */}
      
      {/* This will auto-show the main app tour */}
      <WalkthroughManager 
        walkthroughId="main_app_tour" 
        autoShow={true}
        context="whispr_notes"
      />
    </View>
  );
};
```

3. **Test the flow:**
   - Open the app
   - Navigate to Whispr Notes screen
   - The walkthrough should automatically appear

### **Method 2: Component Testing**

Create a test screen to test individual components:

```typescript
// TestWalkthroughScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WalkthroughManager } from '@/components/WalkthroughManager';
import { WalkthroughTrigger } from '@/components/WalkthroughTrigger';
import { useWalkthrough } from '@/store/WalkthroughContext';

export const TestWalkthroughScreen = () => {
  const { 
    showWalkthrough, 
    hideWalkthrough, 
    resetAllWalkthroughs,
    isVisible,
    currentWalkthrough 
  } = useWalkthrough();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Walkthrough Testing</Text>
      
      {/* Test buttons */}
      <TouchableOpacity 
        style={styles.button}
        onPress={() => showWalkthrough('main_app_tour')}
      >
        <Text>Start Main App Tour</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => showWalkthrough('first_message')}
      >
        <Text>Start First Message Tour</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => showWalkthrough('buddy_chat')}
      >
        <Text>Start Buddy Chat Tour</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => resetAllWalkthroughs()}
      >
        <Text>Reset All Walkthroughs</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => hideWalkthrough()}
      >
        <Text>Hide Walkthrough</Text>
      </TouchableOpacity>
      
      {/* Status display */}
      <Text style={styles.status}>
        Walkthrough Visible: {isVisible ? 'Yes' : 'No'}
      </Text>
      <Text style={styles.status}>
        Current Tour: {currentWalkthrough?.name || 'None'}
      </Text>
      
      {/* Manual trigger test */}
      <WalkthroughTrigger 
        walkthroughId="main_app_tour"
        text="Test Trigger"
        icon="help-circle"
        size="medium"
      />
      
      {/* Auto-show test */}
      <WalkthroughManager 
        walkthroughId="main_app_tour" 
        autoShow={true}
        context="test"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
});
```

### **Method 3: Console Testing**

Add console logs to track walkthrough behavior:

```typescript
// In WalkthroughContext.tsx, add logging
const showWalkthrough = async (walkthroughId: string): Promise<void> => {
  try {
    console.log('🎯 Starting walkthrough:', walkthroughId);
    dispatch({ type: 'SET_LOADING', payload: true });
    
    const walkthrough = WalkthroughService.getWalkthrough(walkthroughId);
    if (!walkthrough) {
      throw new Error(`Walkthrough with ID '${walkthroughId}' not found`);
    }

    console.log('✅ Walkthrough found:', walkthrough.name);
    dispatch({ type: 'SHOW_WALKTHROUGH', payload: walkthrough });
  } catch (error) {
    console.error('❌ Walkthrough error:', error);
    dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false });
  }
};
```

---

## **📱 Testing Scenarios**

### **Scenario 1: First-Time User**
1. **Reset all walkthroughs**
2. **Open app** → Should see main app tour
3. **Complete tour** → Should not show again
4. **Navigate to different screens** → Should see contextual tours

### **Scenario 2: Returning User**
1. **Complete some walkthroughs**
2. **Close and reopen app** → Should not see completed tours
3. **Navigate to new features** → Should see relevant tours

### **Scenario 3: Tour Navigation**
1. **Start any tour**
2. **Test Next/Previous buttons**
3. **Test Skip button**
4. **Test Finish button**
5. **Verify completion is saved**

### **Scenario 4: Error Handling**
1. **Try to start non-existent tour** → Should handle gracefully
2. **Test with network issues** → Should handle storage errors
3. **Test rapid navigation** → Should not cause crashes

---

## **🐛 Common Issues & Solutions**

### **Issue: Walkthrough not showing**
**Solution:**
```typescript
// Check if walkthrough is completed
const shouldShow = await WalkthroughService.shouldShowWalkthrough('main_app_tour');
console.log('Should show:', shouldShow);

// Reset if needed
await WalkthroughService.resetAllWalkthroughs();
```

### **Issue: Auto-show not working**
**Solution:**
```typescript
// Make sure WalkthroughManager is properly placed
<WalkthroughManager 
  walkthroughId="main_app_tour" 
  autoShow={true}  // Make sure this is true
  context="whispr_notes"
/>
```

### **Issue: Styling problems**
**Solution:**
```typescript
// Check theme context is available
import { useTheme } from '@/store/ThemeContext';

// Make sure theme is properly initialized
```

### **Issue: Performance problems**
**Solution:**
```typescript
// Check for memory leaks
// Make sure to cleanup subscriptions
useEffect(() => {
  return () => {
    // Cleanup code
  };
}, []);
```

---

## **📊 Testing Checklist**

- [ ] **WalkthroughProvider** is added to app root
- [ ] **WalkthroughManager** is added to key screens
- [ ] **Auto-show logic** works correctly
- [ ] **Manual triggers** work correctly
- [ ] **Navigation** (Next/Previous/Skip) works
- [ ] **Completion persistence** works
- [ ] **Reset functionality** works
- [ ] **Error handling** works gracefully
- [ ] **Styling** looks good on all screen sizes
- [ ] **Animations** are smooth
- [ ] **Performance** is acceptable
- [ ] **Memory usage** is reasonable

---

## **🚀 Quick Test Commands**

```typescript
// Add these to any component for quick testing
const quickTests = {
  // Reset everything
  reset: () => WalkthroughService.resetAllWalkthroughs(),
  
  // Check status
  status: () => WalkthroughService.getCompletionStats(),
  
  // Start specific tour
  startMain: () => showWalkthrough('main_app_tour'),
  startMessage: () => showWalkthrough('first_message'),
  startChat: () => showWalkthrough('buddy_chat'),
  
  // Check if should show
  shouldShow: (id) => WalkthroughService.shouldShowWalkthrough(id),
};
```

---

## **🎯 Expected Results**

After testing, you should see:
- ✅ **Smooth animations** when walkthroughs appear
- ✅ **Proper navigation** between steps
- ✅ **Persistent completion** state
- ✅ **Contextual auto-show** behavior
- ✅ **Manual triggers** working
- ✅ **Error handling** for edge cases
- ✅ **Good performance** and responsiveness

**Happy testing!** 🧪✨
