import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Platform, LayoutChangeEvent,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ripenessApi, { RipenessResult, AvocadoDetection } from '../Services/ripenessApi';
import leavesApi, { LeavesResult } from '../Services/leavesApi';
import fruitDiseaseApi, { FruitDiseaseResult } from '../Services/fruitDiseaseApi';
import historyService from '../Services/historyService';
import { styles } from '../Styles/ScanScreen.syles';

// ─────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────

export interface LeafDetection {
  id: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
  bbox_absolute?: [number, number, number, number];
  all_probabilities: { [key: string]: number };
}

export interface FruitDetection {
  id: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
  bbox_absolute?: [number, number, number, number];
  all_probabilities: { [key: string]: number };
}

export interface AnalysisResult {
  type: string;

  // Fruit ripeness (two-stage pipeline)
  ripeness?: string;
  ripeness_level?: number;
  texture?: string;
  days_to_ripe?: string;
  recommendation?: string;
  avocadoDetections?: AvocadoDetection[];
  annotated_image?: string;   // base64 annotated image from server

  // Fruit disease
  fruitDiseaseClass?: string;
  fruitDiseaseDetections?: FruitDetection[];
  fruitDiseaseCount?: number;

  // Leaf
  leafClass?: string;
  bbox?: [number, number, number, number];
  detections?: LeafDetection[];
  count?: number;
  image_size?: { width: number; height: number };

  confidence: number;
  all_probabilities?: { [key: string]: number };
}

type TabType = 'FRUIT' | 'LEAF / STEM' | 'PEST' | 'DISEASE';

// ─────────────────────────────────────────────────────────────
// Colour / label maps
// ─────────────────────────────────────────────────────────────

const RIPENESS_COLORS: { [key: string]: string } = {
  underripe : '#9CCC65',
  ripe      : '#FB8C00',
  overripe  : '#E53935',
};
const RIPENESS_DESCRIPTIONS: { [key: string]: string } = {
  underripe : 'Not ready — needs 4-7 days to ripen',
  ripe      : 'Perfect to eat now! Best flavour & texture',
  overripe  : 'Past peak — great for guacamole or smoothies',
};
const RIPENESS_EMOJI: { [key: string]: string } = {
  underripe: '🟢', ripe: '🟠', overripe: '🔴',
};

const FRUIT_DISEASE_COLORS: { [key: string]: string } = {
  healthy: '#4CAF50', Healthy: '#4CAF50',
  anthracnose: '#F44336', Anthracnose: '#F44336',
  'stem end rot': '#FF5722', 'Stem End Rot': '#FF5722',
  'cercospora spot': '#FF9800', 'Cercospora Spot': '#FF9800',
};
const FRUIT_DISEASE_DESCRIPTIONS: { [key: string]: string } = {
  healthy: 'Fruit is healthy with no visible disease symptoms',
  Healthy: 'Fruit is healthy with no visible disease symptoms',
  anthracnose: 'Fungal disease causing dark lesions on fruit surface',
  Anthracnose: 'Fungal disease causing dark lesions on fruit surface',
  'stem end rot': 'Decay starting at stem end, often due to fungal infection',
  'Stem End Rot': 'Decay starting at stem end, often due to fungal infection',
  'cercospora spot': 'Fungal disease causing circular spots on fruit',
  'Cercospora Spot': 'Fungal disease causing circular spots on fruit',
};
const FRUIT_DISEASE_RECOMMENDATIONS: { [key: string]: string } = {
  healthy: 'Fruit is in excellent condition. Store properly to maintain freshness.',
  Healthy: 'Fruit is in excellent condition. Store properly to maintain freshness.',
  anthracnose: 'Remove infected fruit immediately. Improve air circulation.',
  Anthracnose: 'Remove infected fruit immediately. Improve air circulation.',
  'stem end rot': 'Remove affected fruit. Ensure proper harvesting techniques.',
  'Stem End Rot': 'Remove affected fruit. Ensure proper harvesting techniques.',
  'cercospora spot': 'Remove infected fruit. Apply copper-based fungicides.',
  'Cercospora Spot': 'Remove infected fruit. Apply copper-based fungicides.',
};

const LEAF_COLORS: { [key: string]: string } = {
  healthy: '#4CAF50', Healthy: '#4CAF50',
  anthracnose: '#F44336', Anthracnose: '#F44336',
  'nutrient deficiency': '#FF9800', 'Nutrient Deficient': '#FF9800',
  'Pest Infested': '#9C27B0', 'pest infested': '#9C27B0',
};
const LEAF_DESCRIPTIONS: { [key: string]: string } = {
  healthy: 'Plant is healthy! Continue current care routine',
  Healthy: 'Plant is healthy! Continue current care routine',
  anthracnose: 'Fungal disease detected — requires treatment',
  Anthracnose: 'Fungal disease detected — requires treatment',
  'nutrient deficiency': 'Plant needs additional nutrients',
  'Nutrient Deficient': 'Plant needs additional nutrients',
  'Pest Infested': 'Pest infestation detected — immediate action needed',
  'pest infested': 'Pest infestation detected — immediate action needed',
};
const LEAF_RECOMMENDATIONS: { [key: string]: string } = {
  healthy: 'Maintain regular watering and fertilization schedule.',
  Healthy: 'Maintain regular watering and fertilization schedule.',
  anthracnose: 'Remove affected leaves, improve air circulation, and apply fungicide.',
  Anthracnose: 'Remove affected leaves, improve air circulation, and apply fungicide.',
  'nutrient deficiency': 'Apply balanced fertilizer. Consider soil testing.',
  'Nutrient Deficient': 'Apply balanced fertilizer. Consider soil testing.',
  'Pest Infested': 'Inspect closely and apply appropriate pesticide or natural control.',
  'pest infested': 'Inspect closely and apply appropriate pesticide or natural control.',
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const ImageWithBoundingBoxes: React.FC<{
  imageUri: string;
  detections: LeafDetection[];
  imageSize: { width: number; height: number };
  leafColors: { [key: string]: string };
}> = ({ imageUri, detections, imageSize, leafColors }) => {
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const getMetrics = () => {
    if (!layout) return null;
    const cAsp = layout.width / layout.height;
    const iAsp = imageSize.width / imageSize.height;
    let dw: number, dh: number, ox = 0, oy = 0;
    if (iAsp > cAsp) { dw = layout.width; dh = layout.width / iAsp; oy = (layout.height - dh) / 2; }
    else              { dh = layout.height; dw = layout.height * iAsp; ox = (layout.width - dw) / 2; }
    return { dw, dh, ox, oy };
  };
  const m = getMetrics();
  return (
    <View style={{ width: '100%', height: '100%' }} onLayout={e => setLayout(e.nativeEvent.layout)}>
      <Image source={{ uri: imageUri }} style={styles.comparisonImage} resizeMode="contain" />
      {m && detections.map((det, idx) => {
        const useAbs = det.bbox_absolute !== undefined;
        const b = useAbs ? det.bbox_absolute! : det.bbox;
        const xp = useAbs ? b[0] : b[0] * imageSize.width;
        const yp = useAbs ? b[1] : b[1] * imageSize.height;
        const wp = useAbs ? b[2] : b[2] * imageSize.width;
        const hp = useAbs ? b[3] : b[3] * imageSize.height;
        const sx = m.dw / imageSize.width; const sy = m.dh / imageSize.height;
        return (
          <View key={det.id || idx} style={[styles.boundingBox, {
            position:'absolute', left:xp*sx+m.ox, top:yp*sy+m.oy, width:wp*sx, height:hp*sy,
            borderColor: leafColors[det.class] || '#999', borderWidth: idx===0?3:2, zIndex: detections.length-idx,
          }]}>
            <View style={[styles.detectionLabel, { backgroundColor: leafColors[det.class]||'#999' }]}>
              <Text style={styles.detectionLabelText}>#{det.id} {det.class}</Text>
              <Text style={styles.detectionConfidenceText}>{(det.confidence*100).toFixed(0)}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const AvocadoBBoxOverlay: React.FC<{
  imageUri: string;
  detections: AvocadoDetection[];
  imageSize: { width: number; height: number };
}> = ({ imageUri, detections, imageSize }) => {
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const getMetrics = () => {
    if (!layout) return null;
    const cAsp = layout.width / layout.height;
    const iAsp = imageSize.width / imageSize.height;
    let dw: number, dh: number, ox = 0, oy = 0;
    if (iAsp > cAsp) { dw = layout.width; dh = layout.width / iAsp; oy = (layout.height - dh) / 2; }
    else              { dh = layout.height; dw = layout.height * iAsp; ox = (layout.width - dw) / 2; }
    return { dw, dh, ox, oy };
  };
  const m = getMetrics();
  return (
    <View style={{ width: '100%', height: '100%' }} onLayout={e => setLayout(e.nativeEvent.layout)}>
      <Image source={{ uri: imageUri }} style={styles.comparisonImage} resizeMode="contain" />
      {m && detections.map((det, idx) => {
        // bbox = [x,y,w,h] normalised
        const [xN, yN, wN, hN] = det.bbox;
        const colour = RIPENESS_COLORS[det.class] || '#999';
        return (
          <View key={det.id || idx} style={[styles.boundingBox, {
            position: 'absolute',
            left: xN * m.dw + m.ox, top: yN * m.dh + m.oy,
            width: wN * m.dw, height: hN * m.dh,
            borderColor: colour, borderWidth: idx===0?4:2, zIndex: detections.length-idx,
          }]}>
            <View style={{
              position:'absolute', top:-26, left:0,
              backgroundColor: colour, paddingHorizontal:6, paddingVertical:2,
              borderRadius:4, flexDirection:'row', alignItems:'center', gap:4,
            }}>
              <Text style={{ color:'#fff', fontSize:10, fontWeight:'700' }}>
                #{det.id} {det.class.toUpperCase()}
              </Text>
              <Text style={{ color:'rgba(255,255,255,0.9)', fontSize:9 }}>
                {(det.ripeness_confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const ImageWithFruitBoundingBoxes: React.FC<{
  imageUri: string;
  detections: FruitDetection[];
  imageSize: { width: number; height: number };
  diseaseColors: { [key: string]: string };
}> = ({ imageUri, detections, imageSize, diseaseColors }) => {
  const [layout, setLayout] = useState<{ width: number; height: number } | null>(null);
  const getMetrics = () => {
    if (!layout) return null;
    const cAsp = layout.width / layout.height;
    const iAsp = imageSize.width / imageSize.height;
    let dw: number, dh: number, ox = 0, oy = 0;
    if (iAsp > cAsp) { dw = layout.width; dh = layout.width/iAsp; oy=(layout.height-dh)/2; }
    else              { dh = layout.height; dw = layout.height*iAsp; ox=(layout.width-dw)/2; }
    return { dw, dh, ox, oy };
  };
  const m = getMetrics();
  return (
    <View style={{ width:'100%', height:'100%' }} onLayout={e=>setLayout(e.nativeEvent.layout)}>
      <Image source={{ uri: imageUri }} style={styles.comparisonImage} resizeMode="contain" />
      {m && detections.map((det, idx) => {
        const useAbs = det.bbox_absolute !== undefined;
        const b = useAbs ? det.bbox_absolute! : det.bbox;
        const xp = useAbs?b[0]:b[0]*imageSize.width; const yp = useAbs?b[1]:b[1]*imageSize.height;
        const wp = useAbs?b[2]:b[2]*imageSize.width; const hp = useAbs?b[3]:b[3]*imageSize.height;
        const sx = m.dw/imageSize.width; const sy = m.dh/imageSize.height;
        return (
          <View key={det.id||idx} style={[styles.boundingBox,{
            position:'absolute', left:xp*sx+m.ox, top:yp*sy+m.oy, width:wp*sx, height:hp*sy,
            borderColor:diseaseColors[det.class]||'#999', borderWidth:idx===0?3:2, zIndex:detections.length-idx,
          }]}>
            <View style={[styles.detectionLabel,{backgroundColor:diseaseColors[det.class]||'#999'}]}>
              <Text style={styles.detectionLabelText}>#{det.id} {det.class}</Text>
              <Text style={styles.detectionConfidenceText}>{(det.confidence*100).toFixed(0)}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Main ScanScreen
// ─────────────────────────────────────────────────────────────

const ScanScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning,      setScanning]      = useState(false);
  const [analyzing,     setAnalyzing]     = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [result,        setResult]        = useState<AnalysisResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<TabType>('FRUIT');
  const [facing,        setFacing]        = useState<CameraType>('back');
  const [flash,         setFlash]         = useState<'off'|'on'>('off');
  const [saving,        setSaving]        = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // ── Save analysis ────────────────────────────────────────────
  const handleSaveAnalysis = async () => {
    if (!result || !capturedImage) { Alert.alert('Error', 'No analysis to save'); return; }
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('jwt');
      if (!token) { Alert.alert('Login Required', 'Please login to save your analyses'); return; }
    } catch { Alert.alert('Error', 'Could not verify login status'); return; }

    setSaving(true);
    try {
      let response: any;
      if (result.type === 'FRUIT' && result.ripeness) {
        response = await historyService.saveRipenessAnalysis({
          prediction: {
            ripeness: result.ripeness,
            ripeness_level: result.ripeness_level || 0,
            confidence: result.confidence,
            texture: result.texture,
            days_to_ripe: result.days_to_ripe,
            recommendation: result.recommendation,
            bbox: result.bbox || [0.2, 0.2, 0.6, 0.6],
          },
          all_probabilities: result.all_probabilities || {},
          image_size: result.image_size || { width: 800, height: 600 },
          count: result.avocadoDetections?.length || 1,
          notes: '',
        });
        if (result.fruitDiseaseClass && result.fruitDiseaseDetections?.length) {
          await historyService.saveFruitDiseaseAnalysis({
            prediction: {
              class: result.fruitDiseaseClass,
              confidence: result.fruitDiseaseDetections[0]?.confidence || result.confidence,
              bbox: result.fruitDiseaseDetections[0]?.bbox || result.bbox,
              all_probabilities: result.fruitDiseaseDetections[0]?.all_probabilities || {},
            },
            detections: result.fruitDiseaseDetections,
            recommendation: FRUIT_DISEASE_RECOMMENDATIONS[result.fruitDiseaseClass] || '',
            image_size: result.image_size || { width: 800, height: 600 },
            count: result.fruitDiseaseCount || 1,
            notes: '',
          });
        }
      } else if (result.type === 'LEAF / STEM' && result.leafClass) {
        response = await historyService.saveLeafAnalysis({
          prediction: {
            class: result.leafClass,
            confidence: result.confidence,
            bbox: result.bbox || [0.25, 0.25, 0.5, 0.5],
            all_probabilities: result.all_probabilities || {},
          },
          detections: result.detections || [],
          recommendation: result.recommendation || LEAF_RECOMMENDATIONS[result.leafClass] || '',
          image_size: result.image_size || { width: 800, height: 600 },
          count: result.count || 1,
          notes: '',
        });
      } else {
        throw new Error(`Cannot save analysis type: ${result.type}`);
      }
      if (response?.success) { Alert.alert('Saved! 🎉', 'Analysis saved to your history.'); }
      else { throw new Error(response?.message || 'Failed to save analysis'); }
    } catch (e) {
      Alert.alert('Save Failed', e instanceof Error ? e.message : 'Please try again.');
    } finally { setSaving(false); }
  };

  // ── Health check ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await Promise.all([
        ripenessApi.checkHealth(),
        leavesApi.checkHealth(),
        fruitDiseaseApi.checkHealth(),
      ]);
    })();
  }, []);

  // ── Camera helpers ───────────────────────────────────────────
  const startCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert('Permission Required', 'Camera access needed.'); return; }
    }
    setScanning(true);
  };
  const stopCamera   = () => { setScanning(false); setFlash('off'); };
  const switchCamera = () => setFacing(c => c==='back'?'front':'back');
  const handleFlash  = () => setFlash(c => c==='off'?'on':'off');

  const captureImage = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) { setCapturedImage(photo.uri); stopCamera(); setTimeout(() => analyzeImage(photo.uri), 100); }
    } catch { Alert.alert('Error', 'Failed to capture image'); }
  };

  const handleFileUpload = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4,3], quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        setCapturedImage(res.assets[0].uri);
        setTimeout(() => analyzeImage(res.assets[0].uri), 100);
      }
    } catch { Alert.alert('Error', 'Failed to upload image'); }
  };

  // ── Core analysis ────────────────────────────────────────────
  const analyzeImage = async (imageUri?: string) => {
    const img = imageUri || capturedImage;
    if (!img) { Alert.alert('Error', 'No image selected'); return; }

    setAnalyzing(true); setProgress(0);
    const progressInterval = setInterval(() => {
      setProgress(p => { if (p >= 90) { clearInterval(progressInterval); return 90; } return p + 10; });
    }, 200);

    try {
      let analysisResult: AnalysisResult;

      if (activeTab === 'FRUIT') {
        const [ripenessApiResult, diseaseApiResult] = await Promise.all([
          ripenessApi.predictRipeness(img),
          fruitDiseaseApi.predictFruitDisease(img),
        ]);

        if (!ripenessApiResult.success || !ripenessApiResult.prediction)
          throw new Error(ripenessApiResult.error || 'Fruit ripeness analysis failed');
        if (!diseaseApiResult.success || !diseaseApiResult.prediction)
          throw new Error(diseaseApiResult.error || 'Fruit disease analysis failed');

        const primary          = ripenessApiResult.prediction;
        const avocadoDetections: AvocadoDetection[] = (ripenessApiResult.detections ?? []) as AvocadoDetection[];

        analysisResult = {
          type             : 'FRUIT',
          ripeness         : primary.ripeness,
          ripeness_level   : primary.ripeness_level,
          texture          : primary.texture,
          confidence       : primary.confidence,
          days_to_ripe     : primary.days_to_ripe,
          recommendation   : primary.recommendation,
          all_probabilities: ripenessApiResult.all_probabilities,
          bbox             : primary.bbox,
          avocadoDetections,
          annotated_image  : ripenessApiResult.annotated_image,
          fruitDiseaseClass     : diseaseApiResult.prediction.class,
          fruitDiseaseDetections: diseaseApiResult.detections || [],
          fruitDiseaseCount     : diseaseApiResult.count || 1,
          image_size            : ripenessApiResult.image_size || diseaseApiResult.image_size,
        };

      } else if (activeTab === 'LEAF / STEM') {
        const apiResult: LeavesResult = await leavesApi.predictLeaves(img);
        if (!apiResult.success || !apiResult.prediction)
          throw new Error(apiResult.error || 'Leaf analysis failed');

        analysisResult = {
          type             : 'LEAF / STEM',
          leafClass        : apiResult.prediction.class,
          confidence       : apiResult.prediction.confidence,
          recommendation   : LEAF_RECOMMENDATIONS[apiResult.prediction.class],
          all_probabilities: apiResult.prediction.all_probabilities,
          bbox             : apiResult.prediction.bbox || [0.25, 0.25, 0.5, 0.5],
          detections       : apiResult.detections || [],
          count            : apiResult.count || 1,
          image_size       : apiResult.image_size,
        };
      } else {
        throw new Error(`${activeTab} analysis not yet implemented`);
      }

      clearInterval(progressInterval); setProgress(100);
      setTimeout(() => { setAnalyzing(false); setResult(analysisResult); }, 500);

    } catch (error) {
      clearInterval(progressInterval);
      setAnalyzing(false);
      Alert.alert(
        'Analysis Failed',
        error instanceof Error ? error.message : 'Could not analyse the image.',
        [{ text:'Retry', onPress:()=>analyzeImage(img) }, { text:'Cancel', onPress:resetScan }]
      );
    }
  };

  const resetScan = () => { setCapturedImage(null); setResult(null); setAnalyzing(false); setProgress(0); };
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (capturedImage && !analyzing) { setResult(null); setTimeout(() => analyzeImage(capturedImage), 100); }
  };

  // ── Guards ───────────────────────────────────────────────────
  if (!permission) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  if (!permission.granted) return (
    <View style={styles.centerContainer}>
      <Ionicons name="camera-outline" size={64} color="#ccc" />
      <Text style={styles.errorTitle}>Camera Access Required</Text>
      <Text style={styles.errorText}>Please grant camera permissions to scan</Text>
      <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
        <Text style={styles.permissionButtonText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Tabs */}
        <View style={styles.topTabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.topTabContentContainer}>
            {(['FRUIT','LEAF / STEM','PEST','DISEASE'] as TabType[]).map(tab => (
              <TouchableOpacity key={tab} disabled={analyzing}
                style={[styles.topTab, activeTab===tab && styles.topTabActive]}
                onPress={() => handleTabChange(tab)}>
                <Text style={[styles.topTabText, activeTab===tab && styles.topTabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Camera / Preview */}
        <View style={styles.cameraArea}>
          {(scanning || capturedImage) && (
            <View style={styles.frameOverlay}>
              <View style={[styles.frameCorner, styles.topLeft]} />
              <View style={[styles.frameCorner, styles.topRight]} />
              <View style={[styles.frameCorner, styles.bottomLeft]} />
              <View style={[styles.frameCorner, styles.bottomRight]} />
            </View>
          )}

          {scanning && !capturedImage && (
            <>
              <CameraView ref={cameraRef} style={styles.camera} facing={facing} enableTorch={flash==='on'} />
              <View style={styles.cameraControls}>
                <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
                  <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.controlButton, flash==='on' && styles.controlButtonActive]}
                  onPress={handleFlash}>
                  <Ionicons name={flash==='on'?'flash':'flash-outline'} size={28} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.cameraStatus}>
                <View style={styles.cameraStatusDot} />
                <Text style={styles.cameraStatusText}>Camera Active</Text>
              </View>
              <Text style={styles.scanInstruction}>
                {activeTab==='FRUIT' ? 'Position avocado(s) in frame' : 'Position leaf/stem in frame'}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={stopCamera}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          {capturedImage && !scanning && (
            <Image source={{ uri: capturedImage }} style={styles.capturedImage} resizeMode="contain" />
          )}

          {!scanning && !capturedImage && (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>{activeTab==='FRUIT'?'🥑':'🌿'}</Text>
              <Text style={styles.placeholderTitle}>Ready to Scan</Text>
              <Text style={styles.placeholderText}>
                {activeTab==='FRUIT'
                  ? 'Scan one or multiple avocados — each is detected and classified individually'
                  : 'Start camera or upload an image of a leaf or stem'}
              </Text>
            </View>
          )}

          {analyzing && (
            <View style={styles.progressOverlay}>
              <View style={styles.progressCard}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.progressText}>{progress}% Analyzing</Text>
                <Text style={styles.progressSubtext}>
                  {activeTab==='FRUIT'
                    ? 'Detecting avocados → classifying ripeness…'
                    : 'Detecting leaf health status…'}
                </Text>
              </View>
            </View>
          )}

          {capturedImage && !analyzing && !result && (
            <TouchableOpacity onPress={resetScan} style={styles.resetButton}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* ════════════════════════════════════════════════════
            FRUIT RESULT CARD
        ════════════════════════════════════════════════════ */}
        {result && capturedImage && result.type==='FRUIT' && result.ripeness && (() => {
          const avocados = result.avocadoDetections || [];
          const hasMult  = avocados.length > 1;
          return (
            <View style={styles.resultCard}>

              {/* Count banner */}
              <View style={[localStyles.countBanner, { backgroundColor: hasMult?'#1565C0':'#2E7D32' }]}>
                <Ionicons name="scan-outline" size={20} color="#fff" />
                <Text style={localStyles.countBannerText}>
                  {avocados.length} Avocado{avocados.length!==1?'s':''} Detected
                  {hasMult?' — Tap each card to explore':''}
                </Text>
              </View>

              {/* Image comparison */}
              <View style={styles.comparisonContainer}>
                <Text style={styles.comparisonTitle}>
                  🥑 Ripeness Detection{avocados.length>1?` (${avocados.length} avocados)`:''}
                </Text>
                <View style={styles.imageComparisonRow}>
                  <View style={styles.imageComparisonItem}>
                    <Text style={styles.imageComparisonLabel}>Original</Text>
                    <View style={styles.imageComparisonBox}>
                      <Image source={{ uri: capturedImage }} style={styles.comparisonImage} resizeMode="contain" />
                    </View>
                  </View>
                  <View style={styles.imageComparisonItem}>
                    <Text style={styles.imageComparisonLabel}>Detected</Text>
                    <View style={styles.imageComparisonBox}>
                      {result.annotated_image ? (
                        <Image source={{ uri: result.annotated_image }}
                               style={styles.comparisonImage} resizeMode="contain" />
                      ) : result.image_size && avocados.length > 0 ? (
                        <AvocadoBBoxOverlay
                          imageUri={capturedImage}
                          detections={avocados}
                          imageSize={result.image_size}
                        />
                      ) : (
                        <Image source={{ uri: capturedImage }}
                               style={styles.comparisonImage} resizeMode="contain" />
                      )}
                    </View>
                  </View>
                </View>
                <Text style={styles.comparisonHint}>
                  {avocados.length>1
                    ? 'Each avocado outlined with its ripeness colour and confidence score'
                    : 'Bounding box highlights the analysed avocado area'}
                </Text>
              </View>

              {/* Per-avocado cards */}
              {avocados.length > 0 && (
                <View style={styles.detectionsListContainer}>
                  <Text style={styles.detectionsListTitle}>
                    🥑 Ripeness Results — {avocados.length} Avocado{avocados.length!==1?'s':''}
                  </Text>
                  {avocados.map((avo, idx) => (
                    <View key={avo.id || idx} style={[styles.detectionCard, {
                      borderLeftColor: RIPENESS_COLORS[avo.class]||'#999',
                      backgroundColor: `${RIPENESS_COLORS[avo.class]||'#999'}12`,
                    }]}>
                      <View style={styles.detectionCardHeader}>
                        <View style={styles.detectionCardTitleRow}>
                          <Text style={[styles.detectionCardNumber,
                            { color: RIPENESS_COLORS[avo.class]||'#4CAF50' }]}>#{avo.id}</Text>
                          <Text style={{ fontSize:18 }}>{RIPENESS_EMOJI[avo.class]}</Text>
                          <Text style={[styles.detectionCardClass,
                            { color: RIPENESS_COLORS[avo.class]||'#333' }]}>
                            {avo.class.toUpperCase()}
                          </Text>
                          {idx===0 && (
                            <View style={styles.primaryBadge}>
                              <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                            </View>
                          )}
                        </View>
                        <View style={[styles.confidenceBadge,
                          { backgroundColor:`${RIPENESS_COLORS[avo.class]||'#999'}25` }]}>
                          <Text style={[styles.confidenceBadgeText,
                            { color: RIPENESS_COLORS[avo.class]||'#333' }]}>
                            {(avo.ripeness_confidence * 100).toFixed(1)}%
                          </Text>
                        </View>
                      </View>

                      {/* Meta chips */}
                      <View style={localStyles.metaRow}>
                        <View style={localStyles.metaChip}>
                          <Ionicons name="time-outline" size={12} color="#666" />
                          <Text style={localStyles.metaChipText}>{avo.days_to_ripe}</Text>
                        </View>
                        <View style={localStyles.metaChip}>
                          <Ionicons name="hand-left-outline" size={12} color="#666" />
                          <Text style={localStyles.metaChipText}>{avo.texture}</Text>
                        </View>
                        <View style={localStyles.metaChip}>
                          <Ionicons name="eye-outline" size={12} color="#666" />
                          <Text style={localStyles.metaChipText}>
                            Det: {(avo.detection_confidence*100).toFixed(0)}%
                          </Text>
                        </View>
                      </View>

                      {/* ── REPLACED: single final-confidence bar instead of per-class probability bars ── */}
                      <View style={[localStyles.finalConfidenceRow, {
                        backgroundColor: `${RIPENESS_COLORS[avo.class]||'#999'}15`,
                        borderColor: `${RIPENESS_COLORS[avo.class]||'#999'}40`,
                      }]}>
                        <Text style={localStyles.finalConfidenceLabel}>Final Confidence</Text>
                        <View style={[localStyles.finalConfidenceBar, { backgroundColor: '#e0e0e0' }]}>
                          <View style={[localStyles.finalConfidenceFill, {
                            width: `${avo.ripeness_confidence * 100}%`,
                            backgroundColor: RIPENESS_COLORS[avo.class] || '#999',
                          }]} />
                        </View>
                        <Text style={[localStyles.finalConfidenceValue, {
                          color: RIPENESS_COLORS[avo.class] || '#333',
                        }]}>
                          {(avo.ripeness_confidence * 100).toFixed(1)}%
                        </Text>
                      </View>

                      {/* Recommendation */}
                      <View style={[localStyles.recChip,{
                        backgroundColor:`${RIPENESS_COLORS[avo.class]||'#4CAF50'}18`,
                        borderColor: RIPENESS_COLORS[avo.class]||'#4CAF50',
                      }]}>
                        <Text style={[localStyles.recChipText,
                          { color: RIPENESS_COLORS[avo.class]||'#1B5E20' }]}>
                          💡 {avo.recommendation}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Legend */}
              <View style={localStyles.legendCard}>
                <Text style={localStyles.legendTitle}>Ripeness Colour Guide</Text>
                <View style={localStyles.legendRow}>
                  {Object.entries(RIPENESS_COLORS).map(([cls, col]) => (
                    <View key={cls} style={localStyles.legendItem}>
                      <View style={[localStyles.legendDot, { backgroundColor: col }]} />
                      <Text style={localStyles.legendLabel}>{cls}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Disease banner */}
              {result.fruitDiseaseDetections && result.fruitDiseaseDetections.length > 0 && (
                <View style={styles.detectionBanner}>
                  <Ionicons name="warning-outline" size={20} color="#fff" />
                  <Text style={styles.detectionBannerText}>
                    Disease Analysis: {result.fruitDiseaseDetections.length} Fruit(s) Scanned
                  </Text>
                </View>
              )}

              {/* Disease comparison */}
              {result.fruitDiseaseDetections && result.fruitDiseaseDetections.length > 0 && result.image_size && (
                <View style={styles.comparisonContainer}>
                  <Text style={styles.comparisonTitle}>
                    🔬 Disease Detection ({result.fruitDiseaseDetections.length} fruit(s))
                  </Text>
                  <View style={styles.imageComparisonRow}>
                    <View style={styles.imageComparisonItem}>
                      <Text style={styles.imageComparisonLabel}>Original</Text>
                      <View style={styles.imageComparisonBox}>
                        <Image source={{ uri: capturedImage }} style={styles.comparisonImage} resizeMode="contain" />
                      </View>
                    </View>
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
                </View>
              )}

              {/* Disease per-fruit cards */}
              {result.fruitDiseaseDetections && result.fruitDiseaseDetections.length > 0 && (
                <View style={styles.detectionsListContainer}>
                  <Text style={styles.detectionsListTitle}>🩺 Disease Analysis by Fruit</Text>
                  {result.fruitDiseaseDetections.map((det, idx) => (
                    <View key={det.id||idx} style={[styles.detectionCard,{
                      borderLeftColor:FRUIT_DISEASE_COLORS[det.class]||'#999',
                      backgroundColor:`${FRUIT_DISEASE_COLORS[det.class]||'#999'}08`,
                    }]}>
                      <View style={styles.detectionCardHeader}>
                        <View style={styles.detectionCardTitleRow}>
                          <Text style={[styles.detectionCardNumber,
                            { color:FRUIT_DISEASE_COLORS[det.class]||'#4CAF50' }]}>#{det.id}</Text>
                          <Text style={[styles.detectionCardClass,
                            { color:FRUIT_DISEASE_COLORS[det.class]||'#333' }]}>{det.class}</Text>
                          {idx===0 && <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>PRIMARY</Text></View>}
                        </View>
                        <View style={[styles.confidenceBadge,
                          { backgroundColor:`${FRUIT_DISEASE_COLORS[det.class]||'#999'}20` }]}>
                          <Text style={[styles.confidenceBadgeText,
                            { color:FRUIT_DISEASE_COLORS[det.class]||'#333' }]}>
                            {(det.confidence*100).toFixed(1)}%
                          </Text>
                        </View>
                      </View>
                      {det.all_probabilities && (
                        <View style={styles.miniProbabilityContainer}>
                          {Object.entries(det.all_probabilities)
                            .sort(([clsA, a],[clsB, b]) => clsA === det.class ? -1 : clsB === det.class ? 1 : (b as number)-(a as number)).slice(0,3)
                            .map(([cls,prob])=>(
                              <View key={cls} style={styles.miniProbabilityRow}>
                                <Text style={styles.miniProbabilityLabel}>{cls}</Text>
                                <View style={styles.miniProbabilityBar}>
                                  <View style={[styles.miniProbabilityFill,{
                                    width:`${(prob as number)*100}%`,
                                    backgroundColor:FRUIT_DISEASE_COLORS[cls]||'#999',
                                  }]}/>
                                </View>
                                <Text style={styles.miniProbabilityValue}>
                                  {((prob as number)*100).toFixed(0)}%
                                </Text>
                              </View>
                            ))}
                        </View>
                      )}
                      <View style={styles.miniRecommendation}>
                        <Text style={styles.miniRecommendationText}>
                          {FRUIT_DISEASE_RECOMMENDATIONS[det.class]||'Monitor condition closely.'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.buttonGroup}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveAnalysis} disabled={saving}>
                  <Text style={styles.saveButtonText}>{saving?'SAVING…':'SAVE ANALYSIS'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.scanAgainButton} onPress={resetScan}>
                  <Text style={styles.scanAgainButtonText}>SCAN AGAIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        {/* ════════════════════════════════════════════════════
            LEAF RESULT CARD
        ════════════════════════════════════════════════════ */}
        {result && capturedImage && result.type==='LEAF / STEM' && result.leafClass && (
          <View style={styles.resultCard}>
            {result.detections && result.detections.length > 1 && (
              <View style={styles.detectionBanner}>
                <Ionicons name="leaf-outline" size={20} color="#fff" />
                <Text style={styles.detectionBannerText}>{result.detections.length} Leaves Detected</Text>
              </View>
            )}
            <View style={[styles.ripnessIndicator, { backgroundColor:LEAF_COLORS[result.leafClass]||'#4CAF50' }]}>
              <Text style={styles.ripenessLevel}>{result.leafClass.toUpperCase()}</Text>
              <Text style={styles.ripenessDescription}>{LEAF_DESCRIPTIONS[result.leafClass]}</Text>
            </View>
            <View style={styles.comparisonContainer}>
              <Text style={styles.comparisonTitle}>
                🔬 Leaf Detection ({result.detections?.length||1} leaf/leaves)
              </Text>
              <View style={styles.imageComparisonRow}>
                <View style={styles.imageComparisonItem}>
                  <Text style={styles.imageComparisonLabel}>Original</Text>
                  <View style={styles.imageComparisonBox}>
                    <Image source={{ uri: capturedImage }} style={styles.comparisonImage} resizeMode="contain" />
                  </View>
                </View>
                <View style={styles.imageComparisonItem}>
                  <Text style={styles.imageComparisonLabel}>Detected</Text>
                  <View style={styles.imageComparisonBox}>
                    {result.image_size ? (
                      <ImageWithBoundingBoxes
                        imageUri={capturedImage}
                        detections={result.detections||[]}
                        imageSize={result.image_size}
                        leafColors={LEAF_COLORS}
                      />
                    ) : (
                      <Image source={{ uri: capturedImage }} style={styles.comparisonImage} resizeMode="contain" />
                    )}
                  </View>
                </View>
              </View>
            </View>
            {result.detections && result.detections.length > 0 && (
              <View style={styles.detectionsListContainer}>
                <Text style={styles.detectionsListTitle}>📋 Individual Leaf Analysis</Text>
                {result.detections.map((det, idx) => (
                  <View key={det.id||idx} style={[styles.detectionCard,{
                    borderLeftColor:LEAF_COLORS[det.class]||'#999',
                    backgroundColor:`${LEAF_COLORS[det.class]||'#999'}08`,
                  }]}>
                    <View style={styles.detectionCardHeader}>
                      <View style={styles.detectionCardTitleRow}>
                        <Text style={[styles.detectionCardNumber,{color:LEAF_COLORS[det.class]||'#4CAF50'}]}>#{det.id}</Text>
                        <Text style={[styles.detectionCardClass,{color:LEAF_COLORS[det.class]||'#333'}]}>{det.class}</Text>
                        {idx===0&&<View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>PRIMARY</Text></View>}
                      </View>
                      <View style={[styles.confidenceBadge,{backgroundColor:`${LEAF_COLORS[det.class]||'#999'}20`}]}>
                        <Text style={[styles.confidenceBadgeText,{color:LEAF_COLORS[det.class]||'#333'}]}>
                          {(det.confidence*100).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    {det.all_probabilities && (
                      <View style={styles.miniProbabilityContainer}>
                        {Object.entries(det.all_probabilities)
                          .sort(([clsA, a],[clsB, b]) => clsA === det.class ? -1 : clsB === det.class ? 1 : (b as number)-(a as number)).slice(0,3)
                          .map(([cls,prob])=>(
                            <View key={cls} style={styles.miniProbabilityRow}>
                              <Text style={styles.miniProbabilityLabel}>{cls}</Text>
                              <View style={styles.miniProbabilityBar}>
                                <View style={[styles.miniProbabilityFill,{
                                  width:`${(prob as number)*100}%`,
                                  backgroundColor:LEAF_COLORS[cls]||'#999',
                                }]}/>
                              </View>
                              <Text style={styles.miniProbabilityValue}>{((prob as number)*100).toFixed(0)}%</Text>
                            </View>
                          ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
            <View style={styles.resultInfo}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>LEAVES DETECTED</Text>
                <Text style={styles.resultValue}>{result.detections?.length||1}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>PRIMARY STATUS</Text>
                <Text style={styles.resultValue}>{result.leafClass}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>CONFIDENCE</Text>
                <Text style={styles.resultValue}>{(result.confidence*100).toFixed(1)}%</Text>
              </View>
            </View>
            {result.all_probabilities && (
              <View style={styles.probabilityCard}>
                <Text style={styles.probabilityTitle}>📊 Primary Leaf Analysis</Text>
                {Object.entries(result.all_probabilities).map(([cls,prob])=>(
                  <View key={cls} style={styles.probabilityRow}>
                    <Text style={styles.probabilityLabel}>{cls}</Text>
                    <View style={styles.probabilityBar}>
                      <View style={[styles.probabilityFill,{
                        width:`${(prob as number)*100}%`,
                        backgroundColor:LEAF_COLORS[cls]||'#999',
                      }]}/>
                    </View>
                    <Text style={styles.probabilityValue}>{((prob as number)*100).toFixed(1)}%</Text>
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
                <Text style={styles.saveButtonText}>{saving?'SAVING…':'SAVE ANALYSIS'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scanAgainButton} onPress={resetScan}>
                <Text style={styles.scanAgainButtonText}>SCAN AGAIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action buttons */}
        {!capturedImage && !result && (
          <View style={styles.actionButtons}>
            {scanning ? (
              <TouchableOpacity onPress={captureImage} disabled={analyzing} style={styles.captureButton}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={startCamera} disabled={analyzing}
                  style={[styles.actionButton, styles.primaryButton]}>
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Start Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleFileUpload} disabled={analyzing}
                  style={[styles.actionButton, styles.secondaryButton]}>
                  <Ionicons name="cloud-upload-outline" size={20} color="#4CAF50" />
                  <Text style={styles.secondaryButtonText}>Upload Image</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {!scanning && !capturedImage && (
          <Text style={styles.instructions}>
            {activeTab==='FRUIT'
              ? 'Supports multiple avocados in one shot. Each detected and classified individually.'
              : 'Position the leaf or stem within the frame. Ensure good lighting for best results.'}
          </Text>
        )}

      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Local styles
// ─────────────────────────────────────────────────────────────
const localStyles = StyleSheet.create({
  countBanner: {
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    paddingVertical:10, paddingHorizontal:16, borderRadius:8, marginBottom:12, gap:8,
  },
  countBannerText: { color:'#fff', fontSize:14, fontWeight:'700' },
  metaRow: { flexDirection:'row', flexWrap:'wrap', gap:6, marginTop:8, marginBottom:4 },
  metaChip: {
    flexDirection:'row', alignItems:'center', gap:4,
    backgroundColor:'#f0f0f0', paddingHorizontal:8, paddingVertical:4, borderRadius:12,
  },
  metaChipText: { fontSize:11, color:'#555', fontWeight:'500' },
  recChip: { borderWidth:1, borderRadius:6, paddingHorizontal:10, paddingVertical:6, marginTop:8 },
  recChipText: { fontSize:12, lineHeight:16 },
  legendCard: {
    backgroundColor:'#fafafa', borderRadius:8, padding:12,
    borderWidth:1, borderColor:'#e0e0e0', marginBottom:16,
  },
  legendTitle: { fontSize:12, fontWeight:'600', color:'#555', marginBottom:8 },
  legendRow: { flexDirection:'row', justifyContent:'space-around' },
  legendItem: { flexDirection:'row', alignItems:'center', gap:6 },
  legendDot: { width:12, height:12, borderRadius:6 },
  legendLabel: { fontSize:12, color:'#555', textTransform:'capitalize' },

  // ── NEW: final confidence bar ──────────────────────────────
  finalConfidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  finalConfidenceLabel: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    width: 110,
  },
  finalConfidenceBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  finalConfidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  finalConfidenceValue: {
    fontSize: 13,
    fontWeight: '700',
    width: 48,
    textAlign: 'right',
  },
});

export default ScanScreen;