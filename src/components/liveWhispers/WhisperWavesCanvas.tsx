import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Text } from 'react-native';
import LiveWhisperBubble from './LiveWhisperBubble';
import { TextWhispr } from '@/services/textWhisperServiceClean';

interface WhisperWavesCanvasProps {
  whisprs: TextWhispr[];
  onWhisprPress: (whispr: TextWhispr) => void;
  currentUserId?: string; // Current user ID to identify own whispers
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Grid configuration
const PADDING = 20; // Left/right padding
const SPACING = 10; // Space between bubbles
const COLUMNS = SCREEN_WIDTH < 360 ? 2 : SCREEN_WIDTH > 414 ? 4 : 3; // Responsive columns
const BASE_SIZE = (SCREEN_WIDTH - (PADDING * 2) - (SPACING * (COLUMNS - 1))) / COLUMNS;

// Time calculations (10 minutes = full size/opacity)
const MAX_TIME_MINUTES = 10;
const MIN_SIZE_FACTOR = 0.6; // Minimum 60% size
const MIN_OPACITY = 0.4; // Minimum 40% opacity

interface BubbleLayout {
  whispr: TextWhispr;
  size: number;
  opacity: number;
  position: { x: number; y: number };
}

const WhisperWavesCanvas: React.FC<WhisperWavesCanvasProps> = ({
  whisprs,
  onWhisprPress,
  currentUserId,
}) => {
  // Filter out expired whispers and calculate layout
  const bubbleLayouts = useMemo(() => {
    const now = Date.now();
    
    // Filter expired whispers
    const activeWhisprs = whisprs.filter(whispr => {
      const expires = new Date(whispr.expires_at).getTime();
      return expires > now;
    });

    // Sort by creation time (newest first)
    const sortedWhisprs = [...activeWhisprs].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeB - timeA; // Newest first
    });

    // Calculate layout for each bubble
    const layouts: BubbleLayout[] = sortedWhisprs.map((whispr, index) => {
      // Calculate time left in minutes
      const expires = new Date(whispr.expires_at).getTime();
      const timeLeftMs = expires - now;
      const timeLeftMinutes = Math.max(0, timeLeftMs / 60000);

      // Calculate size factor (100% → 60% over 10 minutes)
      const sizeFactor = Math.max(
        MIN_SIZE_FACTOR,
        Math.min(1, timeLeftMinutes / MAX_TIME_MINUTES)
      );
      const size = BASE_SIZE * sizeFactor;

      // Calculate opacity (100% → 40% over 10 minutes)
      const opacity = Math.max(
        MIN_OPACITY,
        Math.min(1, timeLeftMinutes / MAX_TIME_MINUTES)
      );

      // Calculate grid position
      const col = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      const x = PADDING + (col * (BASE_SIZE + SPACING)) + ((BASE_SIZE - size) / 2);
      const y = PADDING + (row * (BASE_SIZE + SPACING)) + ((BASE_SIZE - size) / 2);

      return {
        whispr,
        size,
        opacity,
        position: { x, y },
      };
    });

    return layouts;
  }, [whisprs]);

  // Calculate content height
  const contentHeight = useMemo(() => {
    if (bubbleLayouts.length === 0) return SCREEN_WIDTH;
    const rows = Math.ceil(bubbleLayouts.length / COLUMNS);
    return PADDING + (rows * (BASE_SIZE + SPACING)) + PADDING;
  }, [bubbleLayouts.length]);

  // Empty state
  if (bubbleLayouts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>💭</Text>
        <Text style={styles.emptyText}>No live whispers yet</Text>
        <Text style={styles.emptySubtext}>Be the first to share your thoughts!</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { minHeight: contentHeight },
      ]}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={5}
    >
      {bubbleLayouts.map((layout) => {
        const isOwnWhisper = currentUserId && layout.whispr.user_id === currentUserId;
        return (
          <LiveWhisperBubble
            key={layout.whispr.id}
            whispr={layout.whispr}
            size={layout.size}
            opacity={layout.opacity}
            position={layout.position}
            onPress={onWhisprPress}
            isOwnWhisper={isOwnWhisper}
          />
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100, // Extra space at bottom for floating button
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
});

export default WhisperWavesCanvas;

