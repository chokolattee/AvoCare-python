export interface AnalysisResult {
  type: string;
  ripeness: string;
  color: string;
  texture: string;
  confidence: number;
  size?: string;
  days_to_ripe?: string;
  recommendation?: string;
  all_probabilities?: {
    [key: string]: number;
  };
}

export type FacingMode = 'user' | 'environment';

export const startCameraStream = async (facingMode: FacingMode = 'environment'): Promise<MediaStream> => {
  console.log('🎥 Requesting camera access with facingMode:', facingMode);
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera not supported in this browser');
  }

  const constraints: MediaStreamConstraints = {
    video: { 
      facingMode: facingMode,
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  
  console.log('✅ Camera access granted');
  return mediaStream;
};

export const stopCameraStream = (stream: MediaStream | null): void => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
};

export const initializeVideo = (
  videoElement: HTMLVideoElement | null, 
  mediaStream: MediaStream
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!videoElement) {
      reject(new Error('Video element not found'));
      return;
    }
    
    console.log('📺 Setting stream to video element');
    videoElement.srcObject = mediaStream;
    videoElement.muted = true;
    videoElement.playsInline = true;
    
    videoElement.onloadedmetadata = () => {
      console.log('▶️ Video metadata loaded, attempting to play');
      videoElement.play()
        .then(() => {
          console.log('✅ Video is playing!');
          resolve();
        })
        .catch((err: Error) => {
          console.error('❌ Play error:', err);
          reject(err);
        });
    };
  });
};

export const captureImageFromVideo = (
  videoElement: HTMLVideoElement | null, 
  canvasElement: HTMLCanvasElement | null
): string => {
  if (!videoElement || !canvasElement) {
    throw new Error('Video or canvas element not found');
  }

  console.log('📸 Capturing image, video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
  
  if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    throw new Error('Video not ready. Please wait a moment and try again.');
  }
  
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  
  const ctx = canvasElement.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  ctx.drawImage(videoElement, 0, 0);
  return canvasElement.toDataURL('image/jpeg');
};

export const readImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as string'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

export const getCameraErrorMessage = (error: Error | DOMException): string => {
  let errorMessage = "Unable to access camera. ";
  
  if (error.name === 'NotAllowedError') {
    errorMessage += "Please grant camera permissions and refresh the page.";
  } else if (error.name === 'NotFoundError') {
    errorMessage += "No camera found on this device.";
  } else if (error.name === 'NotReadableError') {
    errorMessage += "Camera is already in use by another application.";
  } else {
    errorMessage += error.message;
  }
  
  return errorMessage;
};

export const toggleFlash = async (
  stream: MediaStream | null, 
  flashEnabled: boolean
): Promise<boolean> => {
  if (!stream) return false;
  
  try {
    const videoTrack = stream.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    
    // Check if torch/flash is supported
    if (!capabilities.torch) {
      console.log('⚠️ Flash not supported on this device');
      return false;
    }
    
    await videoTrack.applyConstraints({
      // @ts-ignore - torch is not in standard TypeScript definitions
      advanced: [{ torch: flashEnabled }]
    });
    
    console.log(`💡 Flash ${flashEnabled ? 'enabled' : 'disabled'}`);
    return true;
  } catch (error) {
    console.error('❌ Flash toggle error:', error);
    return false;
  }
};

export const checkFlashSupport = (stream: MediaStream | null): boolean => {
  if (!stream) return false;
  
  try {
    const videoTrack = stream.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    return !!capabilities.torch;
  } catch (error) {
    console.error('❌ Flash support check error:', error);
    return false;
  }
};

export const simulateAnalysis = (
  onProgress: (progress: number) => void,
  onComplete: (result: AnalysisResult) => void
): (() => void) => {
  let progress = 0;
  
  const interval = setInterval(() => {
    progress += 5;
    onProgress(progress);
    
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        onComplete({
          type: 'FRUIT',
          size: 'Large',
          color: 'Dark Green',
          texture: 'Rough',
          ripeness: 'Mature',
          confidence: 92
        });
      }, 500);
    }
  }, 100);
  
  return () => clearInterval(interval);
};