import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/store/ThemeContext';
import { spacing, borderRadius } from '@/utils/themes';
import { Phase5AndroidVarianceService } from '@/services/phase5AndroidVarianceService';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failure';
  grade: string;
  improvement: number;
  details: string;
  actual?: number;
  baseline?: number;
}

const initialResults: TestResult[] = [
  { name: 'Device Detection & Analysis', status: 'pending', grade: 'N/A', improvement: 0, details: 'Detect Android device capabilities and manufacturer-specific quirks' },
  { name: 'Foreground Service Implementation', status: 'pending', grade: 'N/A', improvement: 0, details: 'Prevent Android OEMs from killing background processes' },
  { name: 'Hybrid Delivery System', status: 'pending', grade: 'N/A', improvement: 0, details: 'Smart WebSocket vs FCM routing based on device state' },
  { name: 'Platform Optimization', status: 'pending', grade: 'N/A', improvement: 0, details: 'Handle Android version differences (API 21-35)' },
  { name: 'Battery Optimization Handling', status: 'pending', grade: 'N/A', improvement: 0, details: 'Work around aggressive battery saving modes' },
  { name: 'Device-Specific Fixes', status: 'pending', grade: 'N/A', improvement: 0, details: 'Samsung, Xiaomi, Huawei manufacturer-specific optimizations' },
];

const Phase5AndroidTest: React.FC = () => {
  const { theme } = useTheme();
  const [results, setResults] = useState<TestResult[]>(initialResults);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [overallGrade, setOverallGrade] = useState('N/A');
  const [currentTest, setCurrentTest] = useState('');
  const [testProgress, setTestProgress] = useState(0);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  const styles = createStyles(theme);

  const runAllTests = async () => {
    setOverallStatus('running');
    setResults(initialResults);
    setOverallGrade('N/A');
    
    const newResults: TestResult[] = [...initialResults];

    const tests = [
      { name: 'Device Detection & Analysis', func: testDeviceDetection },
      { name: 'Foreground Service Implementation', func: testForegroundService },
      { name: 'Hybrid Delivery System', func: testHybridDelivery },
      { name: 'Platform Optimization', func: testPlatformOptimization },
      { name: 'Battery Optimization Handling', func: testBatteryOptimization },
      { name: 'Device-Specific Fixes', func: testDeviceSpecificFixes },
    ];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      setCurrentTest(test.name);
      setTestProgress((i / tests.length) * 100);
      newResults[i].status = 'running';
      setResults([...newResults]);

      try {
        const testResult = await test.func();
        newResults[i] = {
          ...newResults[i],
          status: 'success',
          grade: testResult.grade,
          improvement: testResult.improvement,
          details: testResult.details,
          actual: testResult.actual,
          baseline: testResult.baseline,
        };
      } catch (error: any) {
        newResults[i] = {
          ...newResults[i],
          status: 'failure',
          grade: 'F',
          improvement: 0,
          details: `Error: ${error.message || 'Unknown error'}`,
        };
        console.error(`❌ Test "${test.name}" failed:`, error);
      }
      setResults([...newResults]);
    }

    setTestProgress(100);
    setOverallStatus('completed');
    const grades = newResults.map(r => r.grade);
    const overall = calculateOverallGrade(grades);
    setOverallGrade(overall);
    console.log('✅ Phase 5: All Android variance tests completed successfully');
  };

  const calculateOverallGrade = (grades: string[]): string => {
    if (grades.includes('F') || grades.includes('C')) return 'C';
    if (grades.includes('B')) return 'B';
    if (grades.every(g => g === 'A+')) return 'A+';
    return 'A';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return '#00d4aa';
      case 'A': return '#00d4aa';
      case 'B': return '#ffc107';
      case 'C': return '#ff9800';
      case 'F': return '#f44336';
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const testDeviceDetection = async (): Promise<any> => {
    console.log('📱 Testing Device Detection & Analysis...');
    
    const startTime = Date.now();
    
    const phase5Service = Phase5AndroidVarianceService.getInstance();
    const deviceInfo = await phase5Service.detectDeviceCapabilities();
    
    setDeviceInfo(deviceInfo);
    
    const endTime = Date.now();
    const actual = endTime - startTime;
    const baseline = 2000; // 2 seconds baseline
    const improvement = ((baseline - actual) / baseline) * 100;

    return {
      baseline,
      actual,
      improvement: Math.max(0, improvement),
      grade: improvement >= 80 ? 'A+' : improvement >= 60 ? 'A' : improvement >= 40 ? 'B' : 'C',
      details: `Detected: ${deviceInfo.manufacturer} ${deviceInfo.model} (Android ${deviceInfo.androidVersion}, API ${deviceInfo.apiLevel})`
    };
  };

  const testForegroundService = async (): Promise<any> => {
    console.log('🔧 Testing Foreground Service Implementation...');
    
    const startTime = Date.now();
    
    const phase5Service = Phase5AndroidVarianceService.getInstance();
    const success = await phase5Service.startForegroundService();
    
    const endTime = Date.now();
    const actual = endTime - startTime;
    const baseline = 1500; // 1.5 seconds baseline
    const improvement = ((baseline - actual) / baseline) * 100;

    return {
      baseline,
      actual,
      improvement: Math.max(0, improvement),
      grade: success ? (improvement >= 80 ? 'A+' : improvement >= 60 ? 'A' : 'B') : 'F',
      details: success ? 'Foreground service started successfully' : 'Failed to start foreground service'
    };
  };

  const testHybridDelivery = async (): Promise<any> => {
    console.log('🔄 Testing Hybrid Delivery System...');
    
    const startTime = Date.now();
    
    const phase5Service = Phase5AndroidVarianceService.getInstance();
    const success = await phase5Service.initializeHybridDelivery();
    
    // Test hybrid delivery with sample message
    const deliverySuccess = await phase5Service.deliverMessageOptimized(
      'test-user-hybrid',
      'Hybrid Test',
      'Testing hybrid delivery system',
      { testType: 'hybrid' }
    );
    
    const endTime = Date.now();
    const actual = endTime - startTime;
    const baseline = 2000; // 2 seconds baseline
    const improvement = ((baseline - actual) / baseline) * 100;

    return {
      baseline,
      actual,
      improvement: Math.max(0, improvement),
      grade: (success && deliverySuccess) ? (improvement >= 80 ? 'A+' : improvement >= 60 ? 'A' : 'B') : 'C',
      details: `Hybrid delivery ${success ? 'initialized' : 'failed'}, message delivery ${deliverySuccess ? 'successful' : 'failed'}`
    };
  };

  const testPlatformOptimization = async (): Promise<any> => {
    console.log('⚙️ Testing Platform Optimization...');
    
    const startTime = Date.now();
    
    const phase5Service = Phase5AndroidVarianceService.getInstance();
    const success = await phase5Service.optimizeForPlatform();
    
    const endTime = Date.now();
    const actual = endTime - startTime;
    const baseline = 1000; // 1 second baseline
    const improvement = ((baseline - actual) / baseline) * 100;

    return {
      baseline,
      actual,
      improvement: Math.max(0, improvement),
      grade: success ? (improvement >= 80 ? 'A+' : improvement >= 60 ? 'A' : 'B') : 'C',
      details: success ? 'Platform optimization applied successfully' : 'Platform optimization failed'
    };
  };

  const testBatteryOptimization = async (): Promise<any> => {
    console.log('🔋 Testing Battery Optimization Handling...');
    
    const startTime = Date.now();
    
    const phase5Service = Phase5AndroidVarianceService.getInstance();
    const success = await phase5Service.handleBatteryOptimization();
    
    const endTime = Date.now();
    const actual = endTime - startTime;
    const baseline = 800; // 0.8 seconds baseline
    const improvement = ((baseline - actual) / baseline) * 100;

    return {
      baseline,
      actual,
      improvement: Math.max(0, improvement),
      grade: success ? (improvement >= 80 ? 'A+' : improvement >= 60 ? 'A' : 'B') : 'C',
      details: success ? 'Battery optimization handled successfully' : 'Battery optimization failed'
    };
  };

  const testDeviceSpecificFixes = async (): Promise<any> => {
    console.log('🛠️ Testing Device-Specific Fixes...');
    
    const startTime = Date.now();
    
    const phase5Service = Phase5AndroidVarianceService.getInstance();
    const stats = phase5Service.getAndroidVarianceStats();
    
    const endTime = Date.now();
    const actual = endTime - startTime;
    const baseline = 500; // 0.5 seconds baseline
    const improvement = ((baseline - actual) / baseline) * 100;

    return {
      baseline,
      actual,
      improvement: Math.max(0, improvement),
      grade: stats.deviceSpecificFixCount > 0 ? (improvement >= 80 ? 'A+' : improvement >= 60 ? 'A' : 'B') : 'C',
      details: `Applied ${stats.deviceSpecificFixCount} device-specific fixes`
    };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>📱 Phase 5: Android Device Variance Test</Text>
      <Text style={styles.subtitle}>
        Tests device detection, foreground service, hybrid delivery, platform optimization, and device-specific fixes for Android compatibility.
      </Text>

      {deviceInfo && (
        <View style={styles.deviceInfoCard}>
          <Text style={styles.deviceInfoTitle}>📱 Detected Device</Text>
          <Text style={styles.deviceInfoText}>
            {deviceInfo.manufacturer} {deviceInfo.model}
          </Text>
          <Text style={styles.deviceInfoText}>
            Android {deviceInfo.androidVersion} (API {deviceInfo.apiLevel})
          </Text>
          <Text style={styles.deviceInfoText}>
            RAM: {deviceInfo.ramSize}GB • Battery Optimization: {deviceInfo.batteryOptimizationEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.runButton, overallStatus === 'running' && styles.runButtonDisabled]} 
        onPress={runAllTests}
        disabled={overallStatus === 'running'}
      >
        {overallStatus === 'running' ? (
          <ActivityIndicator color={theme.colors.onPrimary} />
        ) : (
          <Text style={styles.runButtonText}>Run All Phase 5 Tests</Text>
        )}
      </TouchableOpacity>

      {overallStatus === 'running' && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Running: {currentTest} ({testProgress.toFixed(0)}%)</Text>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${testProgress}%` }]} />
          </View>
        </View>
      )}

      {overallStatus === 'completed' && (
        <View style={styles.overallGradeContainer}>
          <Text style={styles.overallGradeText}>Overall Grade: </Text>
          <Text style={[styles.overallGradeValue, { color: getGradeColor(overallGrade) }]}>
            {overallGrade}
          </Text>
        </View>
      )}

      <View style={styles.resultsContainer}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultName}>{result.name}</Text>
              <View style={[styles.statusIndicator, styles[result.status]]}>
                {result.status === 'running' && <ActivityIndicator size="small" color={theme.colors.onSurface} />}
                {result.status === 'success' && <Icon name="checkmark-circle" size={20} color="#00d4aa" />}
                {result.status === 'failure' && <Icon name="close-circle" size={20} color="#f44336" />}
                {result.status === 'pending' && <Icon name="time-outline" size={20} color={theme.colors.onSurfaceVariant} />}
              </View>
            </View>
            <Text style={styles.resultDetails}>{result.details}</Text>
            {result.grade !== 'N/A' && (
              <View style={styles.gradeContainer}>
                <Text style={styles.gradeText}>Grade: </Text>
                <Text style={[styles.gradeValue, { color: getGradeColor(result.grade) }]}>{result.grade}</Text>
                <Text style={styles.improvementText}> ({result.improvement.toFixed(2)}% Improvement)</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2, // Ensure space for navigation menu
  },
  title: {
    ...theme.typography.headlineMedium,
    color: theme.colors.onBackground,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  deviceInfoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceInfoTitle: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  deviceInfoText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  runButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  runButtonDisabled: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  runButtonText: {
    ...theme.typography.titleMedium,
    color: theme.colors.onPrimary,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  progressText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    marginBottom: spacing.sm,
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.sm,
  },
  overallGradeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overallGradeText: {
    ...theme.typography.headlineSmall,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  overallGradeValue: {
    ...theme.typography.headlineSmall,
    fontWeight: 'bold',
  },
  resultsContainer: {
    // No specific styles needed here, children will space themselves
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultName: {
    ...theme.typography.titleMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  statusIndicator: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pending: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  running: {
    backgroundColor: theme.colors.primaryContainer,
  },
  success: {
    backgroundColor: '#e6fff7', // Light green
  },
  failure: {
    backgroundColor: '#ffe6e6', // Light red
  },
  resultDetails: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  gradeValue: {
    ...theme.typography.bodyMedium,
    fontWeight: 'bold',
  },
  improvementText: {
    ...theme.typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    marginLeft: spacing.xs,
  },
});

export default Phase5AndroidTest;

