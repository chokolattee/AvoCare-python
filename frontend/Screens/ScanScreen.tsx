import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import ripenessApi, { RipenessResult } from '../Services/ripenessApi'; // You'll need to import this
import leavesApi, { LeavesResult } from '../Services/leavesApi';

// Updated AnalysisResult type to handle both fruit and leaf analysis
export interface AnalysisResult {
  type: string;
  // Fruit-specific fields
  ripeness?: string;
  ripeness_level?: number;
  color?: string;
  texture?: string;
  days_to_ripe?: string;
  recommendation?: string;
  // Leaf-specific fields
  leafClass?: string;
  // Common fields
  confidence: number;
  all_probabilities?: {
    [key: string]: number;
  };
}

type TabType = 'FRUIT' | 'LEAF / STEM' | 'PEST' | 'DISEASE';

// Updated to match your 3-class system
const RIPENESS_COLORS: { [key: string]: string } = {
  'underripe': '#9CCC65',     // Light green
  'ripe': '#FB8C00',          // Orange
  'overripe': '#E53935',      // Red
};

const RIPENESS_DESCRIPTIONS: { [key: string]: string } = {
  'underripe': 'Not ready to eat - needs 4-7 days to ripen',
  'ripe': 'Perfect to eat now! Best flavor and texture',
  'overripe': 'Past peak ripeness - great for cooking or smoothies',
};

// Leaf health colors
const LEAF_COLORS: { [key: string]: string } = {
  'healthy': '#4CAF50',
  'anthracnose': '#FF6F00',
  'nutrient deficiency': '#FDD835',
  'Pest Infested': '#E53935',
};

// Leaf health descriptions
const LEAF_DESCRIPTIONS: { [key: string]: string } = {
  'healthy': 'Plant is healthy! Continue current care routine',
  'anthracnose': 'Fungal disease detected - requires treatment',
  'nutrient deficiency': 'Plant needs additional nutrients',
  'Pest Infested': 'Pest infestation detected - immediate action needed',
};

// Leaf health recommendations
const LEAF_RECOMMENDATIONS: { [key: string]: string } = {
  'healthy': 'Maintain regular watering and fertilization schedule. Monitor for any changes.',
  'anthracnose': 'Remove affected leaves, improve air circulation, and apply fungicide. Avoid overhead watering.',
  'nutrient deficiency': 'Apply balanced fertilizer. Consider soil testing to identify specific deficiencies.',
  'Pest Infested': 'Inspect closely to identify pest type. Apply appropriate pesticide or use natural pest control methods.',
};

const ScanScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('FRUIT');
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  
  const cameraRef = useRef<CameraView>(null);

  // Health check on mount
  useEffect(() => {
    const checkBackendHealth = async () => {
      const isFruitHealthy = await ripenessApi.checkHealth();
      const isLeavesHealthy = await leavesApi.checkHealth();
      
      if (!isFruitHealthy || !isLeavesHealthy) {
        console.warn('Backend services may not be fully operational');
      }
    };
    
    checkBackendHealth();
  }, []);

  // Start camera
  const startCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera permission is required to scan');
        return;
      }
    }
    setScanning(true);
  };

  // Stop camera
  const stopCamera = () => {
    setScanning(false);
    setFlash('off');
  };

  // Switch camera
  const switchCamera = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // Toggle flash
  const handleFlashToggle = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  // Capture image
  const captureImage = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      if (photo) {
        setCapturedImage(photo.uri);
        stopCamera();
        // Trigger analysis after setting the image
        setTimeout(() => analyzeImage(photo.uri), 100);
      }
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Error', 'Failed to capture image');
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        // Trigger analysis after setting the image
        setTimeout(() => analyzeImage(result.assets[0].uri), 100);
      }
    } catch (error) {
      console.error('File upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    }
  };

  // Analyze image - Routes to appropriate API based on active tab
  const analyzeImage = async (imageUri?: string) => {
    const imageToAnalyze = imageUri || capturedImage;
    if (!imageToAnalyze) {
      console.warn('⚠️ No image to analyze');
      Alert.alert('Error', 'No image selected');
      return;
    }

    console.log('🔍 Starting analysis with image:', imageToAnalyze);
    console.log('📑 Active tab:', activeTab);
    
    setAnalyzing(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      let analysisResult: AnalysisResult;

      // Route to appropriate API based on active tab
      if (activeTab === 'FRUIT') {
        console.log('📤 Sending to fruit ripeness API...');
        const apiResult: RipenessResult = await ripenessApi.predictRipeness(imageToAnalyze);

        if (!apiResult.success || !apiResult.prediction) {
          throw new Error(apiResult.error || 'Fruit analysis failed');
        }

        analysisResult = {
          type: 'FRUIT',
          ripeness: apiResult.prediction.ripeness,
          ripeness_level: apiResult.prediction.ripeness_level,
          color: apiResult.prediction.color,
          texture: apiResult.prediction.texture,
          confidence: apiResult.prediction.confidence,
          days_to_ripe: apiResult.prediction.days_to_ripe,
          recommendation: apiResult.prediction.recommendation,
          all_probabilities: apiResult.all_probabilities,
        };
      } else if (activeTab === 'LEAF / STEM') {
        console.log('📤 Sending to leaf disease API...');
        const apiResult: LeavesResult = await leavesApi.predictLeaves(imageToAnalyze);

        if (!apiResult.success || !apiResult.prediction) {
          throw new Error(apiResult.error || 'Leaf analysis failed');
        }

        analysisResult = {
          type: 'LEAF / STEM',
          leafClass: apiResult.prediction.class,
          confidence: apiResult.prediction.confidence,
          recommendation: LEAF_RECOMMENDATIONS[apiResult.prediction.class],
          all_probabilities: apiResult.prediction.all_probabilities,
        };
      } else {
        // For PEST and DISEASE tabs - not yet implemented
        throw new Error(`${activeTab} analysis not yet implemented`);
      }

      clearInterval(progressInterval);
      setProgress(100);

      console.log('✅ Analysis successful!', analysisResult);

      setTimeout(() => {
        setAnalyzing(false);
        setResult(analysisResult);
      }, 500);
    } catch (error) {
      console.error('❌ Analysis error:', error);
      setAnalyzing(false);
      Alert.alert(
        'Analysis Failed',
        error instanceof Error ? error.message : 'Could not analyze the image. Please try again.',
        [
          { text: 'Retry', onPress: () => analyzeImage(imageToAnalyze) },
          { text: 'Cancel', onPress: () => resetScan() },
        ]
      );
    }
  };

  // Reset scan
  const resetScan = () => {
    setCapturedImage(null);
    setResult(null);
    setAnalyzing(false);
    setProgress(0);
  };

  // Handle tab change - re-analyze if image exists
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (capturedImage && !analyzing) {
      setResult(null);
      // Re-analyze with new tab
      setTimeout(() => analyzeImage(capturedImage), 100);
    }
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color="#ccc" />
        <Text style={styles.errorTitle}>Camera Access Required</Text>
        <Text style={styles.errorText}>
          Please grant camera permissions to scan fruit and leaves
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Tab Selection - Always visible at top */}
        <View style={styles.topTabContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topTabContentContainer}
          >
            {(['FRUIT', 'LEAF / STEM', 'PEST', 'DISEASE'] as TabType[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.topTab, activeTab === tab && styles.topTabActive]}
                onPress={() => handleTabChange(tab)}
                disabled={analyzing}
              >
                <Text style={[styles.topTabText, activeTab === tab && styles.topTabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Camera/Preview Area */}
        <View style={styles.cameraArea}>
          {/* Camera Frame Overlay */}
          {(scanning || capturedImage) && (
            <View style={styles.frameOverlay}>
              <View style={[styles.frameCorner, styles.topLeft]} />
              <View style={[styles.frameCorner, styles.topRight]} />
              <View style={[styles.frameCorner, styles.bottomLeft]} />
              <View style={[styles.frameCorner, styles.bottomRight]} />
            </View>
          )}

          {/* Camera View */}
          {scanning && !capturedImage && (
            <>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                enableTorch={flash === 'on'}
              />
              
              {/* Camera Controls */}
              <View style={styles.cameraControls}>
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={switchCamera}
                >
                  <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.controlButton, flash === 'on' && styles.controlButtonActive]}
                  onPress={handleFlashToggle}
                >
                  <Ionicons name={flash === 'on' ? 'flash' : 'flash-outline'} size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Camera Status */}
              <View style={styles.cameraStatus}>
                <View style={styles.cameraStatusDot} />
                <Text style={styles.cameraStatusText}>Camera Active</Text>
              </View>

              <Text style={styles.scanInstruction}>
                {activeTab === 'FRUIT' ? 'Position fruit in frame' : 'Position leaf/stem in frame'}
              </Text>

              {/* Stop Camera Button */}
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={stopCamera}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          {/* Captured Image */}
          {capturedImage && !scanning && (
            <Image
              source={{ uri: capturedImage }}
              style={styles.capturedImage}
              resizeMode="cover"
            />
          )}

          {/* Placeholder */}
          {!scanning && !capturedImage && (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>
                {activeTab === 'FRUIT' ? '🥑' : '🌿'}
              </Text>
              <Text style={styles.placeholderTitle}>Ready to Scan</Text>
              <Text style={styles.placeholderText}>
                {activeTab === 'FRUIT' 
                  ? 'Start camera or upload an image of your fruit'
                  : 'Start camera or upload an image of a leaf or stem'
                }
              </Text>
            </View>
          )}

          {/* Analysis Progress */}
          {analyzing && (
            <View style={styles.progressOverlay}>
              <View style={styles.progressCard}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.progressText}>
                  {progress}% Analyzing
                </Text>
                <Text style={styles.progressSubtext}>
                  {activeTab === 'FRUIT' ? 'Detecting ripeness...' : 'Detecting health status...'}
                </Text>
              </View>
            </View>
          )}

          {/* Reset button */}
          {capturedImage && !analyzing && !result && (
            <TouchableOpacity onPress={resetScan} style={styles.resetButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results Card - Fruit */}
        {result && capturedImage && result.type === 'FRUIT' && result.ripeness && (
          <View style={styles.resultCard}>
            {/* Ripeness Level Indicator */}
            <View style={[styles.ripnessIndicator, { backgroundColor: RIPENESS_COLORS[result.ripeness] }]}>
              <Text style={styles.ripenessLevel}>{result.ripeness.toUpperCase()}</Text>
              <Text style={styles.ripenessDescription}>{RIPENESS_DESCRIPTIONS[result.ripeness]}</Text>
            </View>

            <View style={styles.resultInfo}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>RIPENESS LEVEL</Text>
                <Text style={styles.resultValue}>{(result.ripeness_level ?? 0) + 1} / 3</Text>
              </View>
              {result.color && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>COLOR</Text>
                  <Text style={styles.resultValue}>{result.color}</Text>
                </View>
              )}
              {result.texture && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>TEXTURE</Text>
                  <Text style={styles.resultValue}>{result.texture}</Text>
                </View>
              )}
              {result.days_to_ripe && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>READY IN</Text>
                  <Text style={styles.resultValue}>{result.days_to_ripe}</Text>
                </View>
              )}
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>CONFIDENCE</Text>
                <Text style={styles.resultValue}>{(result.confidence * 100).toFixed(1)}%</Text>
              </View>
            </View>

            {/* Probability Breakdown */}
            {result.all_probabilities && (
              <View style={styles.probabilityCard}>
                <Text style={styles.probabilityTitle}>📊 Analysis Breakdown</Text>
                {Object.entries(result.all_probabilities).map(([className, prob]) => (
                  <View key={className} style={styles.probabilityRow}>
                    <Text style={styles.probabilityLabel}>{className}</Text>
                    <View style={styles.probabilityBar}>
                      <View 
                        style={[
                          styles.probabilityFill,
                          { 
                            width: `${(prob as number) * 100}%`,
                            backgroundColor: RIPENESS_COLORS[className] || '#999'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.probabilityValue}>{((prob as number) * 100).toFixed(1)}%</Text>
                  </View>
                ))}
              </View>
            )}

            {result.recommendation && (
              <View style={styles.recommendationCard}>
                <Text style={styles.recommendationTitle}>💡 Recommendation</Text>
                <Text style={styles.recommendationText}>{result.recommendation}</Text>
              </View>
            )}

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.saveButton}>
                <Text style={styles.saveButtonText}>SAVE ANALYSIS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scanAgainButton} onPress={resetScan}>
                <Text style={styles.scanAgainButtonText}>SCAN AGAIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Results Card - Leaf/Stem */}
        {result && capturedImage && result.type === 'LEAF / STEM' && result.leafClass && (
          <View style={styles.resultCard}>
            {/* Health Status Indicator */}
            <View style={[styles.ripnessIndicator, { backgroundColor: LEAF_COLORS[result.leafClass] }]}>
              <Text style={styles.ripenessLevel}>{result.leafClass.toUpperCase()}</Text>
              <Text style={styles.ripenessDescription}>{LEAF_DESCRIPTIONS[result.leafClass]}</Text>
            </View>

            <View style={styles.resultInfo}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>STATUS</Text>
                <Text style={styles.resultValue}>{result.leafClass}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>CONFIDENCE</Text>
                <Text style={styles.resultValue}>{(result.confidence * 100).toFixed(1)}%</Text>
              </View>
            </View>

            {/* Probability Breakdown */}
            {result.all_probabilities && (
              <View style={styles.probabilityCard}>
                <Text style={styles.probabilityTitle}>📊 Analysis Breakdown</Text>
                {Object.entries(result.all_probabilities).map(([className, prob]) => (
                  <View key={className} style={styles.probabilityRow}>
                    <Text style={styles.probabilityLabel}>{className}</Text>
                    <View style={styles.probabilityBar}>
                      <View 
                        style={[
                          styles.probabilityFill,
                          { 
                            width: `${(prob as number) * 100}%`,
                            backgroundColor: LEAF_COLORS[className] || '#999'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.probabilityValue}>{((prob as number) * 100).toFixed(1)}%</Text>
                  </View>
                ))}
              </View>
            )}

            {result.recommendation && (
              <View style={styles.recommendationCard}>
                <Text style={styles.recommendationTitle}>💡 Recommendation</Text>
                <Text style={styles.recommendationText}>{result.recommendation}</Text>
              </View>
            )}

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.saveButton}>
                <Text style={styles.saveButtonText}>SAVE ANALYSIS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scanAgainButton} onPress={resetScan}>
                <Text style={styles.scanAgainButtonText}>SCAN AGAIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {!capturedImage && !result && (
          <View style={styles.actionButtons}>
            {scanning ? (
              <TouchableOpacity
                onPress={captureImage}
                disabled={analyzing}
                style={styles.captureButton}
              >
                <View style={styles.captureInner} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={startCamera}
                  disabled={analyzing}
                  style={[styles.actionButton, styles.primaryButton]}
                >
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Start Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleFileUpload}
                  disabled={analyzing}
                  style={[styles.actionButton, styles.secondaryButton]}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color="#4CAF50" />
                  <Text style={styles.secondaryButtonText}>Upload</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Instructions */}
        {!scanning && !capturedImage && (
          <Text style={styles.instructions}>
            {activeTab === 'FRUIT' 
              ? 'Position the fruit within the frame for best results. Ensure good lighting and focus on the fruit.'
              : 'Position the leaf or stem within the frame. Ensure good lighting and a clear view of any potential issues.'
            }
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  topTabContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  topTabContentContainer: {
    gap: 8,
  },
  topTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  topTabActive: {
    backgroundColor: '#4CAF50',
  },
  topTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  topTabTextActive: {
    color: '#fff',
  },
  ripnessIndicator: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripenessLevel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  ripenessDescription: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  probabilityCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  probabilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  probabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  probabilityLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    width: 100,
    marginRight: 8,
    textTransform: 'capitalize',
  },
  probabilityBar: {
    flex: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
  },
  probabilityFill: {
    height: '100%',
    borderRadius: 10,
  },
  probabilityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    width: 50,
    textAlign: 'right',
  },
  recommendationCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#1b5e20',
    lineHeight: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  cameraArea: {
    width: '100%',
    height: 500,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  frameOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    pointerEvents: 'none',
  },
  frameCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#4CAF50',
  },
  topLeft: {
    top: 20,
    left: 20,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 20,
    right: 20,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 20,
    left: 20,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 20,
    right: 20,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  cameraControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 20,
    gap: 12,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  controlButtonActive: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  cameraStatus: {
    position: 'absolute',
    top: 80,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 20,
  },
  cameraStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  cameraStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  scanInstruction: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 12,
    zIndex: 20,
  },
  capturedImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 20,
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 280,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  progressSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  resetButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  resultCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabContainer: {
    marginBottom: 16,
  },
  tabContentContainer: {
    paddingRight: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  tabActive: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  tabTextActive: {
    color: '#fff',
  },
  resultInfo: {
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  buttonGroup: {
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scanAgainButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  scanAgainButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  actionButtons: {
    padding: 20,
    gap: 12,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#4CAF50',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4CAF50',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    width: '100%',
    maxWidth: 300,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    paddingHorizontal: 20,
    marginTop: 16,
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ScanScreen;