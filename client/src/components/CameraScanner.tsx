import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, FlashlightIcon, RotateCcw, CheckCircle2, Loader2, AlertCircle, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CameraScannerProps {
  onScanComplete: (data: any) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface DetectedRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  stable: boolean;
}

export default function CameraScanner({ onScanComplete, onClose, isOpen }: CameraScannerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const detectionWorkerRef = useRef<Worker>();
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [detectedRect, setDetectedRect] = useState<DetectedRectangle | null>(null);
  const [stability, setStability] = useState(0);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [guidance, setGuidance] = useState("Position business card in frame");
  
  // Stability tracking for auto-capture
  const stableFramesRef = useRef(0);
  const lastRectRef = useRef<DetectedRectangle | null>(null);
  const STABILITY_THRESHOLD = 8; // Reduced for faster capture
  const MIN_CONFIDENCE = 0.3; // Lowered for better detection
  const AUTO_CAPTURE_DELAY = 200; // Faster capture

  // Initialize camera when component opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      cleanup();
    }
    
    return cleanup;
  }, [isOpen]);

  const initializeCamera = async () => {
    setIsInitializing(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadedmetadata', () => {
          setHasPermission(true);
          setIsInitializing(false);
          startDetection();
        });
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setIsInitializing(false);
      toast({
        title: "❌ Camera Access Denied",
        description: "Please allow camera access to scan business cards.",
        variant: "destructive",
      });
    }
  };

  const startDetection = () => {
    if (!videoRef.current || !canvasRef.current || !overlayCanvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const overlayCtx = overlayCanvas.getContext('2d')!;
    
    // Optimize canvas size for mobile performance (max 640px width)
    const maxWidth = 640;
    const aspectRatio = video.videoHeight / video.videoWidth;
    canvas.width = Math.min(video.videoWidth, maxWidth);
    canvas.height = canvas.width * aspectRatio;
    overlayCanvas.width = video.offsetWidth;
    overlayCanvas.height = video.offsetHeight;
    
    let frameCount = 0;
    const DETECTION_THROTTLE = 3; // Only process every 3rd frame for mobile performance
    
    const detectFrame = () => {
      if (!video.paused && !video.ended) {
        frameCount++;
        
        // Throttle detection to ~15-20 FPS instead of 60 FPS
        if (frameCount % DETECTION_THROTTLE === 0) {
          // Draw current frame to processing canvas (downscaled)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Real-time document detection
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const detectedRect = detectBusinessCard(imageData, canvas.width, canvas.height);
          
          // Update overlay
          drawOverlay(overlayCtx, detectedRect, overlayCanvas.width, overlayCanvas.height);
          
          // Check stability and auto-capture
          checkStabilityAndCapture(detectedRect);
        }
        
        animationFrameRef.current = requestAnimationFrame(detectFrame);
      }
    };
    
    detectFrame();
  };

  const detectBusinessCard = (imageData: ImageData, width: number, height: number): DetectedRectangle | null => {
    try {
      const data = imageData.data;
      const edges = findEdges(data, width, height);
      const rect = findLargestRectangle(edges, width, height);
      
      // Debug logging every 30 frames to avoid spam
      if (Math.random() < 0.03) {
        console.log('🔍 Detection attempt:', { 
          hasRect: !!rect, 
          confidence: rect?.confidence, 
          minConfidence: MIN_CONFIDENCE,
          willReturn: rect && rect.confidence > MIN_CONFIDENCE
        });
      }
      
      if (rect && rect.confidence > MIN_CONFIDENCE) {
        console.log('✅ Business card detected!', rect);
        return rect;
      }
      
      return null;
    } catch (error) {
      console.error('Detection error:', error);
      return null;
    }
  };

  const findEdges = (data: Uint8ClampedArray, width: number, height: number): boolean[][] => {
    const edges: boolean[][] = [];
    const threshold = 100;
    
    for (let y = 1; y < height - 1; y++) {
      edges[y] = [];
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const current = data[idx] + data[idx + 1] + data[idx + 2];
        
        // Check neighboring pixels for edge detection
        const neighbors = [
          data[((y - 1) * width + x) * 4] + data[((y - 1) * width + x) * 4 + 1] + data[((y - 1) * width + x) * 4 + 2],
          data[((y + 1) * width + x) * 4] + data[((y + 1) * width + x) * 4 + 1] + data[((y + 1) * width + x) * 4 + 2],
          data[(y * width + (x - 1)) * 4] + data[(y * width + (x - 1)) * 4 + 1] + data[(y * width + (x - 1)) * 4 + 2],
          data[(y * width + (x + 1)) * 4] + data[(y * width + (x + 1)) * 4 + 1] + data[(y * width + (x + 1)) * 4 + 2]
        ];
        
        const edgeStrength = neighbors.reduce((sum, neighbor) => sum + Math.abs(current - neighbor), 0);
        edges[y][x] = edgeStrength > threshold;
      }
    }
    
    return edges;
  };

  const findLargestRectangle = (edges: boolean[][], width: number, height: number): DetectedRectangle | null => {
    let bestRect: DetectedRectangle | null = null;
    const minWidth = width * 0.3;
    const minHeight = height * 0.2;
    const maxWidth = width * 0.9;
    const maxHeight = height * 0.7;
    
    // Sample different rectangular regions
    for (let y = 0; y < height * 0.3; y += 20) {
      for (let x = 0; x < width * 0.3; x += 20) {
        for (let w = minWidth; w < maxWidth && x + w < width; w += 30) {
          for (let h = minHeight; h < maxHeight && y + h < height; h += 30) {
            // Check aspect ratio (business cards are typically 1.75:1)
            const aspectRatio = w / h;
            if (aspectRatio < 1.2 || aspectRatio > 2.2) continue;
            
            // Calculate edge density around perimeter
            let edgeScore = 0;
            let perimeter = 0;
            
            // Check edges
            for (let px = x; px < x + w && px < width; px++) {
              if (y < edges.length && edges[Math.floor(y)] && edges[Math.floor(y)][px]) edgeScore++;
              if (y + h < edges.length && edges[Math.floor(y + h)] && edges[Math.floor(y + h)][px]) edgeScore++;
              perimeter += 2;
            }
            
            for (let py = y; py < y + h && py < height; py++) {
              if (py < edges.length && edges[py] && edges[py][Math.floor(x)]) edgeScore++;
              if (py < edges.length && edges[py] && edges[py][Math.floor(x + w)]) edgeScore++;
              perimeter += 2;
            }
            
            const confidence = perimeter > 0 ? (edgeScore / perimeter) * (w * h) / (width * height) : 0;
            
            if (!bestRect || confidence > bestRect.confidence) {
              bestRect = {
                x: x / width,
                y: y / height,
                width: w / width,
                height: h / height,
                confidence,
                stable: false
              };
            }
          }
        }
      }
    }
    
    return bestRect;
  };

  const drawOverlay = (ctx: CanvasRenderingContext2D, rect: DetectedRectangle | null, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    
    if (rect) {
      const x = rect.x * width;
      const y = rect.y * height;
      const w = rect.width * width;
      const h = rect.height * height;
      
      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, width, height);
      
      // Clear detected area
      ctx.clearRect(x, y, w, h);
      
      // Draw detection border
      ctx.strokeStyle = rect.stable ? '#22c55e' : '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      
      // Corner indicators
      const cornerSize = 20;
      ctx.fillStyle = rect.stable ? '#22c55e' : '#3b82f6';
      
      // Top-left
      ctx.fillRect(x - 2, y - 2, cornerSize, 4);
      ctx.fillRect(x - 2, y - 2, 4, cornerSize);
      
      // Top-right
      ctx.fillRect(x + w - cornerSize + 2, y - 2, cornerSize, 4);
      ctx.fillRect(x + w - 2, y - 2, 4, cornerSize);
      
      // Bottom-left
      ctx.fillRect(x - 2, y + h - 2, cornerSize, 4);
      ctx.fillRect(x - 2, y + h - cornerSize + 2, 4, cornerSize);
      
      // Bottom-right
      ctx.fillRect(x + w - cornerSize + 2, y + h - 2, cornerSize, 4);
      ctx.fillRect(x + w - 2, y + h - cornerSize + 2, 4, cornerSize);
    }
  };

  const checkStabilityAndCapture = (rect: DetectedRectangle | null) => {
    if (!rect) {
      stableFramesRef.current = 0;
      setStability(0);
      setGuidance("Position business card in frame");
      return;
    }
    
    // Debug logging for stability tracking
    if (Math.random() < 0.05) {
      console.log('📐 Stability check:', { 
        stable: stableFramesRef.current, 
        threshold: STABILITY_THRESHOLD,
        confidence: rect.confidence 
      });
    }
    
    const lastRect = lastRectRef.current;
    
    if (lastRect) {
      // Check if rectangles are similar (IoU overlap)
      const overlap = calculateIoU(lastRect, rect);
      
      if (overlap > 0.8) {
        stableFramesRef.current++;
      } else {
        stableFramesRef.current = 0;
      }
    } else {
      stableFramesRef.current = 1;
    }
    
    lastRectRef.current = rect;
    
    const stabilityPercent = (stableFramesRef.current / STABILITY_THRESHOLD) * 100;
    setStability(Math.min(stabilityPercent, 100));
    
    if (stableFramesRef.current >= STABILITY_THRESHOLD) {
      rect.stable = true;
      setGuidance("Perfect! Auto-capturing...");
      
      if (!isScanning) {
        console.log('🎯 Triggering auto-capture in', AUTO_CAPTURE_DELAY, 'ms');
        setTimeout(() => {
          captureAndProcess();
        }, AUTO_CAPTURE_DELAY);
      }
    } else if (stabilityPercent > 50) {
      setGuidance("Hold steady...");
    } else {
      setGuidance("Position business card in frame");
    }
    
    setDetectedRect(rect);
  };

  const calculateIoU = (rect1: DetectedRectangle, rect2: DetectedRectangle): number => {
    const x1 = Math.max(rect1.x, rect2.x);
    const y1 = Math.max(rect1.y, rect2.y);
    const x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
    const y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
    
    if (x2 <= x1 || y2 <= y1) return 0;
    
    const intersection = (x2 - x1) * (y2 - y1);
    const union = rect1.width * rect1.height + rect2.width * rect2.height - intersection;
    
    return intersection / union;
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current || isScanning) return;
    
    console.log('📸 Starting capture and process...');
    setIsScanning(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      
      // Capture current frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get captured image as blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'business-card.jpg', { type: 'image/jpeg' });
          await processBusinessCard(file);
        }
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error('Capture error:', error);
      toast({
        title: "❌ Capture failed",
        description: "Could not capture image. Please try again.",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  };

  const processBusinessCard = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        const response = await fetch('/api/business-card/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData: base64Data,
            fileName: file.name
          })
        });

        const result = await response.json();
        
        if (result.success && result.data) {
          toast({
            title: "✅ Business card scanned!",
            description: "Redirecting to workshop registration...",
          });
          
          cleanup();
          onScanComplete(result.data);
        } else {
          throw new Error(result.error || 'Failed to process business card');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('OCR error:', error);
      toast({
        title: "❌ Scan failed",
        description: "Could not process business card. Please try manual entry.",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      
      if ('torch' in capabilities) {
        await track.applyConstraints({
          // @ts-ignore - torch is experimental but supported on many devices
          advanced: [{ torch: !torchEnabled }]
        });
        setTorchEnabled(!torchEnabled);
      }
    } catch (error) {
      console.error('Torch toggle failed:', error);
    }
  };

  const testOCR = async () => {
    if (isScanning) return;
    
    console.log('🧪 Testing OCR with mock data...');
    setIsScanning(true);
    
    try {
      const response = await fetch('/api/business-card/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testData: {
            fullName: 'Captain John Maritime',
            company: 'QaaqConnect Workshop',
            designation: 'Maritime Engineer',
            email: 'john@workshop.example.com',
            phone: '+1234567890'
          }
        })
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('✅ Test OCR successful:', result.data);
        toast({
          title: "✅ Test successful!",
          description: "OCR working correctly. Using test data...",
        });
        
        cleanup();
        onScanComplete(result.data);
      } else {
        throw new Error(result.error || 'Test failed');
      }
    } catch (error) {
      console.error('❌ Test OCR failed:', error);
      toast({
        title: "❌ Test failed",
        description: "OCR test unsuccessful. Check logs.",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  };

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (detectionWorkerRef.current) {
      detectionWorkerRef.current.terminate();
    }
    
    setHasPermission(false);
    setDetectedRect(null);
    setStability(0);
    setIsScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Camera View */}
      <div className="relative w-full h-full">
        {hasPermission && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
          </>
        )}
        
        {/* Loading State */}
        {isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Initializing camera...</p>
            </div>
          </div>
        )}
        
        {/* Header Controls */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 bg-gradient-to-b from-black/50 to-transparent">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-white font-semibold">Business Card Scanner</h2>
            <p className="text-white/80 text-sm">{guidance}</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={testOCR}
              className="text-white hover:bg-white/20"
              disabled={isScanning}
            >
              <Zap className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTorch}
              className="text-white hover:bg-white/20"
            >
              <FlashlightIcon className={`h-5 w-5 ${torchEnabled ? 'text-yellow-400' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
          {/* Stability Indicator */}
          {detectedRect && (
            <div className="mb-4">
              <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    stability >= 100 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${stability}%` }}
                />
              </div>
              <p className="text-white/80 text-xs mt-1 text-center">
                {stability >= 100 ? 'Ready to scan' : `Stability: ${Math.round(stability)}%`}
              </p>
            </div>
          )}
          
          {/* Status */}
          {isScanning && (
            <div className="text-center text-white mb-4">
              <CheckCircle2 className="h-8 w-8 animate-pulse mx-auto mb-2 text-green-400" />
              <p>Processing business card...</p>
            </div>
          )}
          
          {!hasPermission && !isInitializing && (
            <div className="text-center text-white">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
              <p className="mb-4">Camera access required to scan business cards</p>
              <Button onClick={initializeCamera} className="bg-blue-600 hover:bg-blue-700">
                Enable Camera
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}