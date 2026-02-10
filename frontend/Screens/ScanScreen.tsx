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
import ripenessApi, { RipenessResult } from '../Services/ripenessApi';
import leavesApi, { LeavesResult } from '../Services/leavesApi';
import { styles } from '../Styles/ScanScreen.syles';

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
  bbox?: [number, number, number, number]; // [x, y, width, height] in normalized coordinates (0-1)
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
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  
  // Save analysis handler
  const handleSaveAnalysis = async () => {
    if (!result || !capturedImage) return;
    setSaving(true);
    try {
      // Example: send to backend (adjust endpoint as needed)
      const response = await fetch('http://localhost:5000/api/save-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUri: capturedImage,
          analysis: result,
        }),
      });
      if (!response.ok) throw new Error('Failed to save analysis');
      Alert.alert('Success', 'Analysis saved successfully!');
    } catch (error) {
      Alert.alert('Save Failed', error instanceof Error ? error.message : 'Could not save analysis.');
    } finally {
      setSaving(false);
    }
  };

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
          // Use model bbox if available, otherwise use centered default for visualization
          bbox: apiResult.prediction.bbox || [0.2, 0.2, 0.6, 0.6],
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
          // Use model bbox if available, otherwise use centered default for visualization
          bbox: apiResult.prediction.bbox || [0.25, 0.25, 0.5, 0.5],
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

            {/* Side-by-Side Image Comparison for FRUIT */}
            <View style={styles.comparisonContainer}>
              <Text style={styles.comparisonTitle}>🥑 Ripeness Detection Comparison</Text>
              <View style={styles.imageComparisonRow}>
                {/* Original Image */}
                <View style={styles.imageComparisonItem}>
                  <Text style={styles.imageComparisonLabel}>Original</Text>
                  <View style={styles.imageComparisonBox}>
                    <Image
                      source={{ uri: capturedImage }}
                      style={styles.comparisonImage}
                      resizeMode="cover"
                    />
                  </View>
                </View>

                {/* Detected/Annotated Image */}
                <View style={styles.imageComparisonItem}>
                  <Text style={styles.imageComparisonLabel}>Detected</Text>
                  <View style={styles.imageComparisonBox}>
                    <Image
                      source={{ uri: capturedImage }}
                      style={styles.comparisonImage}
                      resizeMode="cover"
                    />
                    {/* Bounding Box Overlay for Fruit */}
                    {result.bbox && (
                      <View
                        style={[
                          styles.boundingBox,
                          {
                            left: `${result.bbox[0] * 100}%`,
                            top: `${result.bbox[1] * 100}%`,
                            width: `${result.bbox[2] * 100}%`,
                            height: `${result.bbox[3] * 100}%`,
                            borderColor: RIPENESS_COLORS[result.ripeness],
                          },
                        ]}
                      >
                        <View style={[styles.detectionLabel, { backgroundColor: RIPENESS_COLORS[result.ripeness] }]}>
                          <Text style={styles.detectionLabelText}>{result.ripeness}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.comparisonHint}>
                The bounding box highlights the analyzed fruit area
              </Text>
            </View>

            {/* Ripeness Details Card */}
            <View style={styles.diseaseDetailsCard}>
              <Text style={styles.diseaseDetailsTitle}>🥑 Ripeness Details</Text>
              <Text style={styles.diseaseDetailsDescription}>
                {result.ripeness === 'underripe' 
                  ? 'The avocado is still underripe and firm. The skin may be bright green and the fruit will feel hard when gently squeezed. Allow it to ripen at room temperature for 4-7 days.'
                  : result.ripeness === 'ripe'
                  ? 'The avocado is perfectly ripe! The skin has darkened and the fruit yields slightly to gentle pressure. This is the ideal time to enjoy it for maximum flavor and creamy texture.'
                  : 'The avocado is overripe. The skin is very dark and the fruit feels very soft. While it may be too mushy for slicing, it\'s still great for guacamole, smoothies, or baking.'}
              </Text>
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
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveAnalysis} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? 'SAVING...' : 'SAVE ANALYSIS'}</Text>
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

            {/* Side-by-Side Image Comparison */}
            <View style={styles.comparisonContainer}>
              <Text style={styles.comparisonTitle}>🔬 Detection Comparison</Text>
              <View style={styles.imageComparisonRow}>
                {/* Original Image */}
                <View style={styles.imageComparisonItem}>
                  <Text style={styles.imageComparisonLabel}>Original</Text>
                  <View style={styles.imageComparisonBox}>
                    <Image
                      source={{ uri: capturedImage }}
                      style={styles.comparisonImage}
                      resizeMode="cover"
                    />
                  </View>
                </View>

                {/* Detected/Annotated Image */}
                <View style={styles.imageComparisonItem}>
                  <Text style={styles.imageComparisonLabel}>Detected</Text>
                  <View style={styles.imageComparisonBox}>
                    <Image
                      source={{ uri: capturedImage }}
                      style={styles.comparisonImage}
                      resizeMode="cover"
                    />
                    {/* Bounding Box Overlay */}
                    {result.bbox && (
                      <View
                        style={[
                          styles.boundingBox,
                          {
                            left: `${result.bbox[0] * 100}%`,
                            top: `${result.bbox[1] * 100}%`,
                            width: `${result.bbox[2] * 100}%`,
                            height: `${result.bbox[3] * 100}%`,
                            borderColor: LEAF_COLORS[result.leafClass],
                          },
                        ]}
                      >
                        <View style={[styles.detectionLabel, { backgroundColor: LEAF_COLORS[result.leafClass] }]}>
                          <Text style={styles.detectionLabelText}>{result.leafClass}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.comparisonHint}>
                The bounding box highlights the detected disease area
              </Text>
            </View>

            {/* Disease Details Card */}
            <View style={styles.diseaseDetailsCard}>
              <Text style={styles.diseaseDetailsTitle}>📋 Disease Details</Text>
              <Text style={styles.diseaseDetailsDescription}>
                {result.leafClass === 'healthy' 
                  ? 'No disease detected. The plant appears to be in good health with no visible signs of disease or pest infestation.'
                  : result.leafClass === 'anthracnose'
                  ? 'Anthracnose is a fungal disease that causes dark lesions on leaves and stems. It thrives in warm, humid conditions and can spread rapidly if not treated.'
                  : result.leafClass === 'nutrient deficiency'
                  ? 'Nutrient deficiency occurs when the plant lacks essential minerals like nitrogen, phosphorus, or potassium. This manifests as yellowing leaves, stunted growth, or discoloration.'
                  : 'Pest infestation detected. Pests can damage leaves, stems, and fruits, leading to reduced plant health and yield. Common pests include aphids, thrips, and mites.'}
              </Text>
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
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveAnalysis} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? 'SAVING...' : 'SAVE ANALYSIS'}</Text>
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

export default ScanScreen;