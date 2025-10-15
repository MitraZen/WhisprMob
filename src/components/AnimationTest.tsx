import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LottieView from 'lottie-react-native';

const AnimationTest: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const testAnimation = () => {
    setError(null);
    setSuccess(false);
    
    try {
      // Test if we can require the animation file
      const animationSource = require('../../assets/animations/whisperParticles.json');
      console.log('Animation file loaded successfully:', animationSource);
      setSuccess(true);
    } catch (err) {
      console.error('Animation file load error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Animation Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={testAnimation}>
        <Text style={styles.buttonText}>Test Animation Load</Text>
      </TouchableOpacity>

      {success && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>✅ Animation file loaded successfully!</Text>
          <LottieView
            source={require('../../assets/animations/whisperParticles.json')}
            autoPlay
            loop
            style={styles.testAnimation}
            onAnimationFailure={(error: string) => {
              console.log('Lottie animation failed:', error);
              setError('Animation playback failed');
            }}
          />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Error: {error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#d4edda',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  successText: {
    color: '#155724',
    fontSize: 16,
    marginBottom: 10,
  },
  testAnimation: {
    width: 200,
    height: 200,
    alignSelf: 'center',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 15,
    borderRadius: 8,
  },
  errorText: {
    color: '#721c24',
    fontSize: 16,
  },
});

export default AnimationTest;
