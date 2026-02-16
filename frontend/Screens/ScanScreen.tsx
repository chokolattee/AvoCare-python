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
  LayoutChangeEvent,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ripenessApi, { RipenessResult } from '../Services/ripenessApi';
import leavesApi, { LeavesResult } from '../Services/leavesApi';
import fruitDiseaseApi, { FruitDiseaseResult } from '../Services/fruitDiseaseApi';
import historyService from '../Services/historyService'; 
import { styles } from '../Styles/ScanScreen.syles';


// Updated AnalysisResult interface for ScanScreen.tsx
// Replace the existing interface with this enhanced version

export interface LeafDetection {
  id: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height] normalized (0-1)
  bbox_absolute?: [number, number, number, number]; // [x, y, width, height] in pixels
  all_probabilities: { [key: string]: number };
}

export interface FruitDetection {
  id: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height] normalized (0-1)
  bbox_absolute?: [number, number, number, number]; // [x, y, width, height] in pixels
  all_probabilities: { [key: string]: number };
}

export interface AnalysisResult {
  type: string;
  
  // Fruit-specific fields
  ripeness?: string;
  ripeness_level?: number;
  color?: string;
  texture?: string;
  days_to_ripe?: string;
  recommendation?: string;
  
  // Fruit disease-specific fields
  fruitDiseaseClass?: string;
  fruitDiseaseDetections?: FruitDetection[];
  fruitDiseaseCount?: number;
  
  // Leaf-specific fields
  leafClass?: string;
  bbox?: [number, number, number, number];
  
  // Multi-detection support for leaves
  detections?: LeafDetection[];
  count?: number;
  image_size?: {
    width: number;
    height: number;
  };
  
  // Common fields
  confidence: number;
  all_probabilities?: {
    [key: string]: number;
  };
  
  // ADD THIS:
  color_metrics?: {
    avg_hue: number;
    avg_saturation: number;
    avg_value: number;
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

// Fruit disease colors
const FRUIT_DISEASE_COLORS: { [key: string]: string } = {
  'healthy': '#4CAF50',           // Green - healthy
  'Healthy': '#4CAF50',           // Green - healthy (capitalized)
  'anthracnose': '#F44336',       // Red - disease
  'Anthracnose': '#F44336',       // Red - disease (capitalized)
  'stem end rot': '#FF5722',      // Deep orange - rot
  'Stem End Rot': '#FF5722',      // Deep orange - rot (capitalized)
  'cercospora spot': '#FF9800',   // Orange - spot disease
  'Cercospora Spot': '#FF9800',   // Orange - spot disease (capitalized)
};

// Fruit disease descriptions
const FRUIT_DISEASE_DESCRIPTIONS: { [key: string]: string } = {
  'healthy': 'Fruit is healthy with no visible disease symptoms',
  'Healthy': 'Fruit is healthy with no visible disease symptoms',
  'anthracnose': 'Fungal disease causing dark lesions on fruit surface',
  'Anthracnose': 'Fungal disease causing dark lesions on fruit surface',
  'stem end rot': 'Decay starting at stem end, often due to fungal infection',
  'Stem End Rot': 'Decay starting at stem end, often due to fungal infection',
  'cercospora spot': 'Fungal disease causing circular spots on fruit',
  'Cercospora Spot': 'Fungal disease causing circular spots on fruit',
};

// Fruit disease recommendations
const FRUIT_DISEASE_RECOMMENDATIONS: { [key: string]: string } = {
  'healthy': 'Fruit is in excellent condition. Store properly to maintain freshness.',
  'Healthy': 'Fruit is in excellent condition. Store properly to maintain freshness.',
  'anthracnose': 'Remove infected fruit immediately. Improve air circulation and avoid wetting fruit during irrigation.',
  'Anthracnose': 'Remove infected fruit immediately. Improve air circulation and avoid wetting fruit during irrigation.',
  'stem end rot': 'Remove affected fruit. Ensure proper harvesting techniques and post-harvest handling.',
  'Stem End Rot': 'Remove affected fruit. Ensure proper harvesting techniques and post-harvest handling.',
  'cercospora spot': 'Remove infected fruit. Apply copper-based fungicides and improve drainage.',
  'Cercospora Spot': 'Remove infected fruit. Apply copper-based fungicides and improve drainage.',
};

// Leaf health colors - Updated for better distinction and readability
const LEAF_COLORS: { [key: string]: string } = {
  'healthy': '#4CAF50',           // Green - healthy
  'Healthy': '#4CAF50',           // Green - healthy (capitalized)
  'anthracnose': '#F44336',       // Red - disease
  'Anthracnose': '#F44336',       // Red - disease (capitalized)
  'nutrient deficiency': '#FF9800', // Orange - deficiency
  'Nutrient Deficient': '#FF9800',  // Orange - deficiency (alternate naming)
  'Pest Infested': '#9C27B0',     // Purple - pest
  'pest infested': '#9C27B0',     // Purple - pest (lowercase)
};

// Leaf health descriptions
const LEAF_DESCRIPTIONS: { [key: string]: string } = {
  'healthy': 'Plant is healthy! Continue current care routine',
  'Healthy': 'Plant is healthy! Continue current care routine',
  'anthracnose': 'Fungal disease detected - requires treatment',
  'Anthracnose': 'Fungal disease detected - requires treatment',
  'nutrient deficiency': 'Plant needs additional nutrients',
  'Nutrient Deficient': 'Plant needs additional nutrients',
  'Pest Infested': 'Pest infestation detected - immediate action needed',
  'pest infested': 'Pest infestation detected - immediate action needed',
};

// Leaf health recommendations
const LEAF_RECOMMENDATIONS: { [key: string]: string } = {
  'healthy': 'Maintain regular watering and fertilization schedule. Monitor for any changes.',
  'Healthy': 'Maintain regular watering and fertilization schedule. Monitor for any changes.',
  'anthracnose': 'Remove affected leaves, improve air circulation, and apply fungicide. Avoid overhead watering.',
  'Anthracnose': 'Remove affected leaves, improve air circulation, and apply fungicide. Avoid overhead watering.',
  'nutrient deficiency': 'Apply balanced fertilizer. Consider soil testing to identify specific deficiencies.',
  'Nutrient Deficient': 'Apply balanced fertilizer. Consider soil testing to identify specific deficiencies.',
  'Pest Infested': 'Inspect closely to identify pest type. Apply appropriate pesticide or use natural pest control methods.',
  'pest infested': 'Inspect closely to identify pest type. Apply appropriate pesticide or use natural pest control methods.',
};

// Component for rendering image with accurate bounding boxes (for leaves)
interface ImageWithBoundingBoxesProps {
  imageUri: string;
  detections: LeafDetection[];
  imageSize: { width: number; height: number };
  leafColors: { [key: string]: string };
}

const ImageWithBoundingBoxes: React.FC<ImageWithBoundingBoxesProps> = ({
  imageUri,
  detections,
  imageSize,
  leafColors,
}) => {
  const [containerLayout, setContainerLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerLayout({ width, height });
  };

  // Calculate the actual display dimensions and offsets
  const getDisplayMetrics = () => {
    if (!containerLayout) return null;

    const containerWidth = containerLayout.width;
    const containerHeight = containerLayout.height;
    const containerAspect = containerWidth / containerHeight;
    const imageAspect = imageSize.width / imageSize.height;

    let displayWidth: number, displayHeight: number, offsetX = 0, offsetY = 0;

    if (imageAspect > containerAspect) {
      // Image is wider - fits to container width
      displayWidth = containerWidth;
      displayHeight = containerWidth / imageAspect;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // Image is taller - fits to container height
      displayHeight = containerHeight;
      displayWidth = containerHeight * imageAspect;
      offsetX = (containerWidth - displayWidth) / 2;
    }

    return { displayWidth, displayHeight, offsetX, offsetY };
  };

  const metrics = getDisplayMetrics();

  return (
    <View style={{ width: '100%', height: '100%' }} onLayout={handleLayout}>
      <Image
        source={{ uri: imageUri }}
        style={styles.comparisonImage}
        resizeMode="contain"
      />
      {metrics && detections.map((detection, idx) => {
        // Use absolute bbox if available, otherwise normalized
        const useAbsolute = detection.bbox_absolute !== undefined;
        const bbox = useAbsolute ? detection.bbox_absolute! : detection.bbox;

        // Convert bbox to pixel coordinates in the original image
        let x_px, y_px, w_px, h_px;
        if (useAbsolute) {
          x_px = bbox[0];
          y_px = bbox[1];
          w_px = bbox[2];
          h_px = bbox[3];
        } else {
          x_px = bbox[0] * imageSize.width;
          y_px = bbox[1] * imageSize.height;
          w_px = bbox[2] * imageSize.width;
          h_px = bbox[3] * imageSize.height;
        }

        // Scale to display coordinates
        const scaleX = metrics.displayWidth / imageSize.width;
        const scaleY = metrics.displayHeight / imageSize.height;

        const displayX = x_px * scaleX + metrics.offsetX;
        const displayY = y_px * scaleY + metrics.offsetY;
        const displayW = w_px * scaleX;
        const displayH = h_px * scaleY;

        return (
          <View
            key={detection.id || idx}
            style={[
              styles.boundingBox,
              {
                position: 'absolute',
                left: displayX,
                top: displayY,
                width: displayW,
                height: displayH,
                borderColor: leafColors[detection.class] || '#999',
                borderWidth: idx === 0 ? 3 : 2,
                zIndex: detections.length - idx,
              },
            ]}
          >
            <View
              style={[
                styles.detectionLabel,
                { backgroundColor: leafColors[detection.class] || '#999' }
              ]}
            >
              <Text style={styles.detectionLabelText}>
                #{detection.id} {detection.class}
              </Text>
              <Text style={styles.detectionConfidenceText}>
                {(detection.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Component for rendering image with fruit disease bounding boxes
interface ImageWithFruitBoundingBoxesProps {
  imageUri: string;
  detections: FruitDetection[];
  imageSize: { width: number; height: number };
  diseaseColors: { [key: string]: string };
}

const ImageWithFruitBoundingBoxes: React.FC<ImageWithFruitBoundingBoxesProps> = ({
  imageUri,
  detections,
  imageSize,
  diseaseColors,
}) => {
  const [containerLayout, setContainerLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerLayout({ width, height });
  };

  const getDisplayMetrics = () => {
    if (!containerLayout) return null;

    const containerWidth = containerLayout.width;
    const containerHeight = containerLayout.height;
    const containerAspect = containerWidth / containerHeight;
    const imageAspect = imageSize.width / imageSize.height;

    let displayWidth: number, displayHeight: number, offsetX = 0, offsetY = 0;

    if (imageAspect > containerAspect) {
      displayWidth = containerWidth;
      displayHeight = containerWidth / imageAspect;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      displayHeight = containerHeight;
      displayWidth = containerHeight * imageAspect;
      offsetX = (containerWidth - displayWidth) / 2;
    }

    return { displayWidth, displayHeight, offsetX, offsetY };
  };

  const metrics = getDisplayMetrics();

  return (
    <View style={{ width: '100%', height: '100%' }} onLayout={handleLayout}>
      <Image
        source={{ uri: imageUri }}
        style={styles.comparisonImage}
        resizeMode="contain"
      />
      {metrics && detections.map((detection, idx) => {
        const useAbsolute = detection.bbox_absolute !== undefined;
        const bbox = useAbsolute ? detection.bbox_absolute! : detection.bbox;

        let x_px, y_px, w_px, h_px;
        if (useAbsolute) {
          x_px = bbox[0];
          y_px = bbox[1];
          w_px = bbox[2];
          h_px = bbox[3];
        } else {
          x_px = bbox[0] * imageSize.width;
          y_px = bbox[1] * imageSize.height;
          w_px = bbox[2] * imageSize.width;
          h_px = bbox[3] * imageSize.height;
        }

        const scaleX = metrics.displayWidth / imageSize.width;
        const scaleY = metrics.displayHeight / imageSize.height;

        const displayX = x_px * scaleX + metrics.offsetX;
        const displayY = y_px * scaleY + metrics.offsetY;
        const displayW = w_px * scaleX;
        const displayH = h_px * scaleY;

        return (
          <View
            key={detection.id || idx}
            style={[
              styles.boundingBox,
              {
                position: 'absolute',
                left: displayX,
                top: displayY,
                width: displayW,
                height: displayH,
                borderColor: diseaseColors[detection.class] || '#999',
                borderWidth: idx === 0 ? 3 : 2,
                zIndex: detections.length - idx,
              },
            ]}
          >
            <View
              style={[
                styles.detectionLabel,
                { backgroundColor: diseaseColors[detection.class] || '#999' }
              ]}
            >
              <Text style={styles.detectionLabelText}>
                #{detection.id} {detection.class}
              </Text>
              <Text style={styles.detectionConfidenceText}>
                {(detection.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
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

  // NEW: Enhanced save analysis handler with MongoDB integration
const handleSaveAnalysis = async () => {
  console.log('🔵 handleSaveAnalysis called');
  console.log('🔍 Checking conditions:', {
    hasResult: !!result,
    hasCapturedImage: !!capturedImage,
    resultType: result?.type
  });

  if (!result || !capturedImage) {
    console.log('❌ No analysis to save');
    Alert.alert('Error', 'No analysis to save');
    return;
  }

  // Check if user is logged in
  try {
    console.log('🔑 Checking authentication...');
    // Check for token (matches the key used in AuthScreen.tsx storeAuthData)
    const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('jwt');
    console.log('🔑 Token check:', { hasToken: !!token, tokenLength: token?.length });
    
    if (!token) {
      console.log('❌ No auth token found - user not logged in');
      Alert.alert(
        'Login Required',
        'Please login to save your analyses',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login',
            onPress: () => {
              console.log('Navigate to login');
              // TODO: Navigate to login screen
              // navigation.navigate('Login');
            }
          }
        ]
      );
      return;
    }
    console.log('✅ User authenticated, token found');
  } catch (error) {
    console.error('❌ Error checking auth token:', error);
    Alert.alert('Error', 'Could not verify login status');
    return;
  }

  console.log('💾 Setting saving state to true...');
  setSaving(true);

  try {
    let response;

    console.log('📝 Preparing to save analysis:', {
      type: result.type,
      hasRipeness: !!result.ripeness,
      hasLeafClass: !!result.leafClass,
      hasDiseaseDetections: !!(result.fruitDiseaseDetections?.length),
      imageSize: result.image_size
    });

    // Save based on analysis type
    if (result.type === 'FRUIT' && result.ripeness) {
      console.log('💾 Saving ripeness analysis...');
      
      // Save ripeness analysis
      response = await historyService.saveRipenessAnalysis({
        prediction: {
          ripeness: result.ripeness,
          ripeness_level: result.ripeness_level || 0,
          confidence: result.confidence,
          color: result.color,
          texture: result.texture,
          days_to_ripe: result.days_to_ripe,
          recommendation: result.recommendation,
          bbox: result.bbox || [0.2, 0.2, 0.6, 0.6],
          color_metrics: result.color_metrics || {}
        },
        all_probabilities: result.all_probabilities || {},
        image_size: result.image_size || { width: 800, height: 600 }, // ✅ ADDED FALLBACK
        count: result.fruitDiseaseCount || 1,
        notes: ''
      });

      console.log('✅ Ripeness saved:', response.success);

      // Also save fruit disease analysis if available
      if (result.fruitDiseaseClass && result.fruitDiseaseDetections && result.fruitDiseaseDetections.length > 0) {
        console.log('💾 Saving fruit disease analysis...');
        
        await historyService.saveFruitDiseaseAnalysis({
          prediction: {
            class: result.fruitDiseaseClass,
            confidence: result.fruitDiseaseDetections[0]?.confidence || result.confidence,
            bbox: result.fruitDiseaseDetections[0]?.bbox || result.bbox,
            all_probabilities: result.fruitDiseaseDetections[0]?.all_probabilities || {}
          },
          detections: result.fruitDiseaseDetections,
          recommendation: FRUIT_DISEASE_RECOMMENDATIONS[result.fruitDiseaseClass] || '',
          image_size: result.image_size || { width: 800, height: 600 }, // ✅ ADDED FALLBACK
          count: result.fruitDiseaseCount || 1,
          notes: ''
        });

        console.log('✅ Disease saved');
      }

    } else if (result.type === 'LEAF / STEM' && result.leafClass) {
      console.log('💾 Saving leaf analysis...');
      console.log('📊 Leaf data to save:', {
        leafClass: result.leafClass,
        confidence: result.confidence,
        detectionsCount: result.detections?.length,
        hasImageSize: !!result.image_size,
        imageSize: result.image_size
      });
      
      // ✅ FIXED: Save leaf analysis with all required fields and fallbacks
      response = await historyService.saveLeafAnalysis({
        prediction: {
          class: result.leafClass,
          confidence: result.confidence,
          bbox: result.bbox || [0.25, 0.25, 0.5, 0.5],
          all_probabilities: result.all_probabilities || {}
        },
        detections: result.detections || [],
        recommendation: result.recommendation || LEAF_RECOMMENDATIONS[result.leafClass] || '',
        image_size: result.image_size || { width: 800, height: 600 }, // ✅ ADDED FALLBACK
        count: result.count || 1,
        notes: ''
      });

      console.log('✅ Leaf analysis save response:', { 
        success: response?.success, 
        message: response?.message,
        analysisId: response?.analysis?.id
      });
    } else {
      // Handle unsupported analysis types
      console.error('❌ Unsupported analysis type:', result.type);
      throw new Error(`Cannot save analysis type: ${result.type}. Please analyze a fruit or leaf first.`);
    }

    console.log('📊 Final save response:', { 
      success: response?.success, 
      message: response?.message 
    });

    if (response?.success) {
      console.log('🎉 Save successful! Showing success alert...');
      Alert.alert(
        'Success! 🎉',
        'Your analysis has been saved to your history',
        [
          {
            text: 'View History',
            onPress: () => {
              // TODO: Navigate to history screen
              // navigation.navigate('History');
            }
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    } else {
      // ✅ IMPROVED: Show specific error message
      throw new Error(response?.message || 'Failed to save analysis');
    }

  } catch (error) {
    console.error('❌ Save analysis error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // ✅ IMPROVED: Show detailed error message
    Alert.alert(
      'Save Failed',
      error instanceof Error ? error.message : 'Could not save analysis. Please try again.',
      [{ text: 'OK' }]
    );
  } finally {
    console.log('🔵 Setting saving state to false...');
    setSaving(false);
    console.log('✅ Save process completed');
  }
};

  // Health check on mount
  useEffect(() => {
    const checkBackendHealth = async () => {
      const isFruitHealthy = await ripenessApi.checkHealth();
      const isLeavesHealthy = await leavesApi.checkHealth();
      const isFruitDiseaseHealthy = await fruitDiseaseApi.checkHealth();

      if (!isFruitHealthy || !isLeavesHealthy || !isFruitDiseaseHealthy) {
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
        console.log('📤 Sending to fruit ripeness and disease APIs...');
        
        // Call both ripeness and disease APIs in parallel
        const [ripenessApiResult, diseaseApiResult] = await Promise.all([
          ripenessApi.predictRipeness(imageToAnalyze),
          fruitDiseaseApi.predictFruitDisease(imageToAnalyze),
        ]);

        if (!ripenessApiResult.success || !ripenessApiResult.prediction) {
          throw new Error(ripenessApiResult.error || 'Fruit ripeness analysis failed');
        }

        if (!diseaseApiResult.success || !diseaseApiResult.prediction) {
          throw new Error(diseaseApiResult.error || 'Fruit disease analysis failed');
        }

        console.log(`✅ Ripeness detected: ${ripenessApiResult.prediction.ripeness}`);
        console.log(`✅ Disease detected on ${diseaseApiResult.count || 1} fruit(s)`);
        console.log('📊 Disease Detections:', diseaseApiResult.detections);

        analysisResult = {
          type: 'FRUIT',
          // Ripeness fields
          ripeness: ripenessApiResult.prediction.ripeness,
          ripeness_level: ripenessApiResult.prediction.ripeness_level,
          color: ripenessApiResult.prediction.color,
          texture: ripenessApiResult.prediction.texture,
          confidence: ripenessApiResult.prediction.confidence,
          days_to_ripe: ripenessApiResult.prediction.days_to_ripe,
          recommendation: ripenessApiResult.prediction.recommendation,
          all_probabilities: ripenessApiResult.all_probabilities,
          bbox: ripenessApiResult.prediction.bbox || [0.2, 0.2, 0.6, 0.6],
          color_metrics: ripenessApiResult.prediction.color_metrics,
          
          // Fruit disease fields
          fruitDiseaseClass: diseaseApiResult.prediction.class,
          fruitDiseaseDetections: diseaseApiResult.detections || [],
          fruitDiseaseCount: diseaseApiResult.count || 1,
          image_size: diseaseApiResult.image_size,
        };
      } else if (activeTab === 'LEAF / STEM') {
        console.log('📤 Sending to leaf disease API...');
        const apiResult: LeavesResult = await leavesApi.predictLeaves(imageToAnalyze);

        if (!apiResult.success || !apiResult.prediction) {
          throw new Error(apiResult.error || 'Leaf analysis failed');
        }

        console.log(`✅ Detected ${apiResult.count || 1} leaves`);
        console.log('📊 Detections:', apiResult.detections);

        analysisResult = {
          type: 'LEAF / STEM',
          leafClass: apiResult.prediction.class,
          confidence: apiResult.prediction.confidence,
          recommendation: LEAF_RECOMMENDATIONS[apiResult.prediction.class],
          all_probabilities: apiResult.prediction.all_probabilities,
          bbox: apiResult.prediction.bbox || [0.25, 0.25, 0.5, 0.5],
          
          // Multi-detection fields
          detections: apiResult.detections || [],
          count: apiResult.count || 1,
          image_size: apiResult.image_size,
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
              resizeMode="contain"
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
                  {activeTab === 'FRUIT' ? 'Detecting ripeness & disease...' : 'Detecting health status...'}
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

        {/* Results Card - Fruit (with both ripeness and disease) */}
        {result && capturedImage && result.type === 'FRUIT' && result.ripeness && (
          <View style={styles.resultCard}>
            {/* Ripeness Level Indicator */}
            <View style={[styles.ripnessIndicator, { backgroundColor: RIPENESS_COLORS[result.ripeness] }]}>
              <Text style={styles.ripenessLevel}>{result.ripeness.toUpperCase()}</Text>
              <Text style={styles.ripenessDescription}>{RIPENESS_DESCRIPTIONS[result.ripeness]}</Text>
            </View>

            {/* Disease Detection Banner */}
            {result.fruitDiseaseDetections && result.fruitDiseaseDetections.length > 0 && (
              <View style={styles.detectionBanner}>
                <Ionicons name="warning-outline" size={20} color="#fff" />
                <Text style={styles.detectionBannerText}>
                  Disease Analysis: {result.fruitDiseaseDetections.length} Fruit(s) Scanned
                </Text>
              </View>
            )}

            {/* Side-by-Side Image Comparison for Ripeness */}
            <View style={styles.comparisonContainer}>
              <Text style={styles.comparisonTitle}>🥑 Ripeness Detection</Text>
              <View style={styles.imageComparisonRow}>
                {/* Original Image */}
                <View style={styles.imageComparisonItem}>
                  <Text style={styles.imageComparisonLabel}>Original</Text>
                  <View style={styles.imageComparisonBox}>
                    <Image
                      source={{ uri: capturedImage }}
                      style={styles.comparisonImage}
                      resizeMode="contain"
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
                      resizeMode="contain"
                    />
                    {/* Bounding Box Overlay for Fruit Ripeness */}
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
                          <Text style={styles.detectionLabelText}>{result.ripeness.toUpperCase()}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.comparisonHint}>
                The bounding box highlights the analyzed fruit area for ripeness
              </Text>
            </View>

            {/* Disease Detection Comparison */}
            {result.fruitDiseaseDetections && result.fruitDiseaseDetections.length > 0 && result.image_size && (
              <View style={styles.comparisonContainer}>
                <Text style={styles.comparisonTitle}>
                  🔬 Disease Detection ({result.fruitDiseaseDetections.length} fruit(s))
                </Text>
                <View style={styles.imageComparisonRow}>
                  {/* Original Image */}
                  <View style={styles.imageComparisonItem}>
                    <Text style={styles.imageComparisonLabel}>Original</Text>
                    <View style={styles.imageComparisonBox}>
                      <Image
                        source={{ uri: capturedImage }}
                        style={styles.comparisonImage}
                        resizeMode="contain"
                      />
                    </View>
                  </View>

                  {/* Detected/Annotated Image with disease bounding boxes */}
                  <View style={styles.imageComparisonItem}>
                    <Text style={styles.imageComparisonLabel}>Disease Detected</Text>
                    <View style={styles.imageComparisonBox}>
                      <ImageWithFruitBoundingBoxes
                        imageUri={capturedImage}
                        detections={result.fruitDiseaseDetections}
                        imageSize={result.image_size}
                        diseaseColors={FRUIT_DISEASE_COLORS}
                      />
                    </View>
                  </View>
                </View>
                <Text style={styles.comparisonHint}>
                  Each fruit is analyzed for disease symptoms with confidence scores
                </Text>
              </View>
            )}

            {/* Individual Fruit Disease Cards */}
            {result.fruitDiseaseDetections && result.fruitDiseaseDetections.length > 0 && (
              <View style={styles.detectionsListContainer}>
                <Text style={styles.detectionsListTitle}>🩺 Disease Analysis by Fruit</Text>
                {result.fruitDiseaseDetections.map((detection, idx) => (
                  <View
                    key={detection.id || idx}
                    style={[
                      styles.detectionCard,
                      { 
                        borderLeftColor: FRUIT_DISEASE_COLORS[detection.class] || '#999',
                        backgroundColor: `${FRUIT_DISEASE_COLORS[detection.class] || '#999'}08`,
                      }
                    ]}
                  >
                    <View style={styles.detectionCardHeader}>
                      <View style={styles.detectionCardTitleRow}>
                        <Text style={[
                          styles.detectionCardNumber,
                          { color: FRUIT_DISEASE_COLORS[detection.class] || '#4CAF50' }
                        ]}>
                          #{detection.id}
                        </Text>
                        <Text style={[
                          styles.detectionCardClass,
                          { color: FRUIT_DISEASE_COLORS[detection.class] || '#333' }
                        ]}>
                          {detection.class}
                        </Text>
                        {idx === 0 && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                          </View>
                        )}
                      </View>
                      <View style={[
                        styles.confidenceBadge,
                        { backgroundColor: `${FRUIT_DISEASE_COLORS[detection.class] || '#999'}20` }
                      ]}>
                        <Text style={[
                          styles.confidenceBadgeText,
                          { color: FRUIT_DISEASE_COLORS[detection.class] || '#333' }
                        ]}>
                          {(detection.confidence * 100).toFixed(1)}%
                        </Text>
                      </View>
                    </View>

                    {/* Mini probability breakdown */}
                    {detection.all_probabilities && (
                      <View style={styles.miniProbabilityContainer}>
                        {Object.entries(detection.all_probabilities)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .slice(0, 3)
                          .map(([className, prob]) => (
                            <View key={className} style={styles.miniProbabilityRow}>
                              <Text style={styles.miniProbabilityLabel}>{className}</Text>
                              <View style={styles.miniProbabilityBar}>
                                <View
                                  style={[
                                    styles.miniProbabilityFill,
                                    {
                                      width: `${(prob as number) * 100}%`,
                                      backgroundColor: FRUIT_DISEASE_COLORS[className] || '#999'
                                    }
                                  ]}
                                />
                              </View>
                              <Text style={styles.miniProbabilityValue}>
                                {((prob as number) * 100).toFixed(0)}%
                              </Text>
                            </View>
                          ))}
                      </View>
                    )}

                    {/* Disease-specific recommendation */}
                    <View style={styles.miniRecommendation}>
                      <Text style={styles.miniRecommendationText}>
                        {FRUIT_DISEASE_RECOMMENDATIONS[detection.class] || 'Monitor fruit condition closely.'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

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

            {/* Disease Summary Card */}
            {result.fruitDiseaseClass && (
              <View style={styles.diseaseDetailsCard}>
                <Text style={styles.diseaseDetailsTitle}>🩺 Disease Status</Text>
                <Text style={styles.diseaseDetailsDescription}>
                  {FRUIT_DISEASE_DESCRIPTIONS[result.fruitDiseaseClass] || 'Disease analysis completed.'}
                </Text>
              </View>
            )}

            <View style={styles.resultInfo}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>RIPENESS LEVEL</Text>
                <Text style={styles.resultValue}>{(result.ripeness_level ?? 0) + 1} / 3</Text>
              </View>
              {result.fruitDiseaseClass && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>DISEASE STATUS</Text>
                  <Text style={styles.resultValue}>{result.fruitDiseaseClass}</Text>
                </View>
              )}
              {result.fruitDiseaseCount && result.fruitDiseaseCount > 1 && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>FRUITS ANALYZED</Text>
                  <Text style={styles.resultValue}>{result.fruitDiseaseCount}</Text>
                </View>
              )}
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
                <Text style={styles.resultLabel}>RIPENESS CONFIDENCE</Text>
                <Text style={styles.resultValue}>{(result.confidence * 100).toFixed(1)}%</Text>
              </View>
            </View>

            {/* Probability Breakdown */}
            {result.all_probabilities && (
              <View style={styles.probabilityCard}>
                <Text style={styles.probabilityTitle}>📊 Ripeness Analysis Breakdown</Text>
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
                <Text style={styles.recommendationTitle}>💡 Ripeness Recommendation</Text>
                <Text style={styles.recommendationText}>{result.recommendation}</Text>
              </View>
            )}

            {/* Disease Recommendation */}
            {result.fruitDiseaseClass && FRUIT_DISEASE_RECOMMENDATIONS[result.fruitDiseaseClass] && (
              <View style={styles.recommendationCard}>
                <Text style={styles.recommendationTitle}>🩺 Disease Management</Text>
                <Text style={styles.recommendationText}>
                  {FRUIT_DISEASE_RECOMMENDATIONS[result.fruitDiseaseClass]}
                </Text>
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

        {/* Enhanced Results Card - Leaf/Stem with Multiple Detections */}
        {result && capturedImage && result.type === 'LEAF / STEM' && result.leafClass && (
          <View style={styles.resultCard}>
            {/* Detection Count Banner */}
            {result.detections && result.detections.length > 1 && (
              <View style={styles.detectionBanner}>
                <Ionicons name="leaf-outline" size={20} color="#fff" />
                <Text style={styles.detectionBannerText}>
                  {result.detections.length} Leaves Detected
                </Text>
              </View>
            )}

            {/* Primary Health Status Indicator */}
            <View style={[styles.ripnessIndicator, { backgroundColor: LEAF_COLORS[result.leafClass] }]}>
              <Text style={styles.ripenessLevel}>{result.leafClass.toUpperCase()}</Text>
              <Text style={styles.ripenessDescription}>{LEAF_DESCRIPTIONS[result.leafClass]}</Text>
            </View>

            {/* Multi-Detection Image Comparison */}
            <View style={styles.comparisonContainer}>
              <Text style={styles.comparisonTitle}>
                🔬 Multi-Leaf Detection ({result.detections?.length || 1} leaves)
              </Text>
              <View style={styles.imageComparisonRow}>
                {/* Original Image */}
                <View style={styles.imageComparisonItem}>
                  <Text style={styles.imageComparisonLabel}>Original</Text>
                  <View style={styles.imageComparisonBox}>
                    <Image
                      source={{ uri: capturedImage }}
                      style={styles.comparisonImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                {/* Detected/Annotated Image with ALL bounding boxes */}
                <View style={styles.imageComparisonItem}>
                  <Text style={styles.imageComparisonLabel}>Detected</Text>
                  <View style={styles.imageComparisonBox}>
                    {result.image_size ? (
                      <ImageWithBoundingBoxes
                        imageUri={capturedImage}
                        detections={result.detections || []}
                        imageSize={result.image_size}
                        leafColors={LEAF_COLORS}
                      />
                    ) : (
                      <Image
                        source={{ uri: capturedImage }}
                        style={styles.comparisonImage}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.comparisonHint}>
                Each leaf is detected and classified independently with confidence scores
              </Text>
            </View>

            {/* Individual Detection Cards */}
            {result.detections && result.detections.length > 0 && (
              <View style={styles.detectionsListContainer}>
                <Text style={styles.detectionsListTitle}>📋 Individual Leaf Analysis</Text>
                {result.detections.map((detection, idx) => (
                  <View
                    key={detection.id || idx}
                    style={[
                      styles.detectionCard,
                      { 
                        borderLeftColor: LEAF_COLORS[detection.class] || '#999',
                        backgroundColor: `${LEAF_COLORS[detection.class] || '#999'}08`, // 8% opacity background
                      }
                    ]}
                  >
                    <View style={styles.detectionCardHeader}>
                      <View style={styles.detectionCardTitleRow}>
                        <Text style={[
                          styles.detectionCardNumber,
                          { color: LEAF_COLORS[detection.class] || '#4CAF50' }
                        ]}>
                          #{detection.id}
                        </Text>
                        <Text style={[
                          styles.detectionCardClass,
                          { color: LEAF_COLORS[detection.class] || '#333' }
                        ]}>
                          {detection.class}
                        </Text>
                        {idx === 0 && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                          </View>
                        )}
                      </View>
                      <View style={[
                        styles.confidenceBadge,
                        { backgroundColor: `${LEAF_COLORS[detection.class] || '#999'}20` }
                      ]}>
                        <Text style={[
                          styles.confidenceBadgeText,
                          { color: LEAF_COLORS[detection.class] || '#333' }
                        ]}>
                          {(detection.confidence * 100).toFixed(1)}%
                        </Text>
                      </View>
                    </View>

                    {/* Mini probability breakdown for this detection */}
                    {detection.all_probabilities && (
                      <View style={styles.miniProbabilityContainer}>
                        {Object.entries(detection.all_probabilities)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .slice(0, 3) // Show top 3
                          .map(([className, prob]) => (
                            <View key={className} style={styles.miniProbabilityRow}>
                              <Text style={styles.miniProbabilityLabel}>{className}</Text>
                              <View style={styles.miniProbabilityBar}>
                                <View
                                  style={[
                                    styles.miniProbabilityFill,
                                    {
                                      width: `${(prob as number) * 100}%`,
                                      backgroundColor: LEAF_COLORS[className] || '#999'
                                    }
                                  ]}
                                />
                              </View>
                              <Text style={styles.miniProbabilityValue}>
                                {((prob as number) * 100).toFixed(0)}%
                              </Text>
                            </View>
                          ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Overall Disease Details Card */}
            <View style={styles.diseaseDetailsCard}>
              <Text style={styles.diseaseDetailsTitle}>📋 Primary Diagnosis</Text>
              <Text style={styles.diseaseDetailsDescription}>
                {result.leafClass === 'Healthy'
                  ? 'No disease detected on the primary leaf. The plant appears to be in good health with no visible signs of disease or pest infestation.'
                  : result.leafClass === 'Anthracnose'
                    ? 'Anthracnose is a fungal disease that causes dark lesions on leaves and stems. It thrives in warm, humid conditions and can spread rapidly if not treated.'
                    : result.leafClass === 'Nutrient Deficient'
                      ? 'Nutrient deficiency occurs when the plant lacks essential minerals like nitrogen, phosphorus, or potassium. This manifests as yellowing leaves, stunted growth, or discoloration.'
                      : 'Pest infestation detected. Pests can damage leaves, stems, and fruits, leading to reduced plant health and yield. Common pests include aphids, thrips, and mites.'}
              </Text>
            </View>

            {/* Summary Statistics */}
            <View style={styles.resultInfo}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>LEAVES DETECTED</Text>
                <Text style={styles.resultValue}>{result.detections?.length || 1}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>PRIMARY STATUS</Text>
                <Text style={styles.resultValue}>{result.leafClass}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>PRIMARY CONFIDENCE</Text>
                <Text style={styles.resultValue}>{(result.confidence * 100).toFixed(1)}%</Text>
              </View>
              {result.detections && result.detections.length > 1 && (
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>AVERAGE CONFIDENCE</Text>
                  <Text style={styles.resultValue}>
                    {(result.detections.reduce((sum, d) => sum + d.confidence, 0) / result.detections.length * 100).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Aggregated Probability Breakdown */}
            {result.all_probabilities && (
              <View style={styles.probabilityCard}>
                <Text style={styles.probabilityTitle}>📊 Primary Leaf Analysis</Text>
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