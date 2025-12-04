import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import VisualFeedbackService from '@/services/visualFeedbackService';
import { TextWhispr } from '@/services/textWhisperServiceClean';

interface LiveWhisperBubbleProps {
  whispr: TextWhispr;
  size: number; // Calculated size based on time left
  opacity: number; // Calculated opacity based on time left
  position: { x: number; y: number }; // Grid position
  onPress: (whispr: TextWhispr) => void;
  isOwnWhisper?: boolean; // Whether this is the current user's whisper
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LiveWhisperBubble: React.FC<LiveWhisperBubbleProps> = ({
  whispr,
  size,
  opacity,
  position,
  onPress,
  isOwnWhisper = false,
}) => {
  // Get mood colors
  const moodColors = useMemo(() => 
    VisualFeedbackService.getMoodColors(whispr.mood),
    [whispr.mood]
  );

  // Get mood config for emoji
  const moodConfig = useMemo(() => 
    VisualFeedbackService.getMoodConfig(whispr.mood),
    [whispr.mood]
  );

  // Calculate time left in minutes
  const timeLeftMinutes = useMemo(() => {
    const now = Date.now();
    const expires = new Date(whispr.expires_at).getTime();
    const diff = expires - now;
    if (diff <= 0) return 0;
    return Math.floor(diff / 60000);
  }, [whispr.expires_at]);

  // Format time display
  const timeDisplay = useMemo(() => {
    if (timeLeftMinutes <= 0) return 'Expired';
    if (timeLeftMinutes < 60) return `${timeLeftMinutes}m`;
    const hours = Math.floor(timeLeftMinutes / 60);
    const mins = timeLeftMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }, [timeLeftMinutes]);

  // Calculate glow size (enhanced for own whispers: 150% vs 130%)
  const glowSize = size * (isOwnWhisper ? 1.5 : 1.3);
  const glowOffset = (glowSize - size) / 2;
  const glowColor = isOwnWhisper ? '#10B981' : moodColors.primary; // Green glow for own whispers
  const glowOpacity = isOwnWhisper ? opacity * 0.5 : opacity * 0.3; // Enhanced opacity for own whispers

  // Calculate bubble size (accounting for border)
  const bubbleSize = isOwnWhisper ? size - 4 : size; // Slightly smaller if has border

  return (
    <View
      style={[
        styles.container,
        {
          left: position.x,
          top: position.y,
          width: size,
          height: size,
        },
      ]}
    >
      {/* Enhanced Glow Effect (green for own whispers) */}
      <View
        style={[
          styles.glow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: glowColor,
            opacity: glowOpacity,
            left: -glowOffset,
            top: -glowOffset,
          },
        ]}
      />

      {/* Gradient Bubble with White Border wrapper for own whispers */}
      <TouchableOpacity
        onPress={() => onPress(whispr)}
        activeOpacity={0.8}
        style={[
          styles.bubbleWrapper,
          isOwnWhisper && {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            padding: 2,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <LinearGradient
          colors={[moodColors.primary, moodColors.secondary]}
          style={[
            styles.bubble,
            {
              width: bubbleSize,
              height: bubbleSize,
              borderRadius: bubbleSize / 2,
              opacity,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Emoji (40% of bubble size) */}
          <Text
            style={[
              styles.emoji,
              {
                fontSize: bubbleSize * 0.4,
              },
            ]}
          >
            {moodConfig.emoji}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Label (mood name + time) with indicator for own whispers */}
      <View style={styles.labelContainer}>
        <View style={styles.labelRow}>
          {isOwnWhisper && (
            <View
              style={[
                styles.dotIndicator,
                {
                  backgroundColor: '#10B981', // Green dot
                  opacity,
                },
              ]}
            />
          )}
          <Text
            style={[
              styles.label,
              {
                fontSize: Math.max(10, size * 0.12),
                color: moodColors.text,
                opacity,
                fontWeight: isOwnWhisper ? '700' : '600', // Bolder for own whispers
              },
            ]}
            numberOfLines={1}
          >
            {moodConfig.description}
          </Text>
        </View>
        <Text
          style={[
            styles.timeLabel,
            {
              fontSize: Math.max(9, size * 0.1),
              color: moodColors.text,
              opacity: opacity * 0.8,
            },
          ]}
        >
          {timeDisplay}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  bubbleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emoji: {
    textAlign: 'center',
  },
  labelContainer: {
    position: 'absolute',
    bottom: -30,
    alignItems: 'center',
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
  timeLabel: {
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default React.memo(LiveWhisperBubble);

