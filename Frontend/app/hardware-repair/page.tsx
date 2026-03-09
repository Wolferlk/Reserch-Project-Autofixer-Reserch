/**
 * Main Page Component - PC Shop Recommendation Engine
 * 
 * This is the main React component that provides the UI for:
 * - Repair shop recommendations (Repairs tab)
 * - Product search and recommendations (Products tab)
 * - Hardware component recommendations (Hardware Recommender tab)
 * 
 * Features:
 * - Error type detection from user input
 * - Shop ranking and recommendations
 * - Product search and filtering
 * - Hardware upgrade recommendations with fixing tips
 * - Speech-to-text input support
 * - Location-based filtering (districts in Sri Lanka)
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { detectQueryType, ERROR_TYPE_LABELS } from '@/lib/detect';
import { 
  Shop, 
  ShopDetails,
  Product, 
  FeedbackEvent, 
  SearchFilters, 
  DetectionResult, 
  TabType,
  ErrorDetectionResult,
  ConfirmedErrorType
} from '@/types/recommend';
import ProductDetailsModal from '@/components/ProductDetailsModal';
import { ErrorSuggestions } from '@/components/ErrorSuggestions';
import CompareShopsModal from '@/components/CompareShopsModal';
import BestMatch from '@/components/SmartFixPlan';
import { fetchProductNeedRecommend, ProductNeedResponse } from '@/lib/productNeedApi';

// API Configuration - always target mounted recommendation service
const RAW_API_BASE_URL = (process.env.NEXT_PUBLIC_RECO_API_URL || "http://localhost:8001").replace(/\/+$/, "");
const API_BASE_URL = RAW_API_BASE_URL.endsWith("/recommendation")
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/recommendation`;

// Districts in Sri Lanka - Used for location-based filtering
const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Vanni', 'Batticaloa',
  'Digamadulla', 'Trincomaley', 'Kurunegala', 'Puttalam', 'Anuradhapura',
  'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle'
];

// Error types for detection - Keywords mapping for error type detection
// Used to help classify user queries into specific error categories
const ERROR_TYPES = {
  'GPU Overheat': ['gpu', 'graphics', 'overheat', 'overheating', 'thermal', 'temperature', 'hot', 'fan', 'cooling'],
  'Blue Screen (BSOD)': ['blue screen', 'bsod', 'blue screen of death', 'crash', 'freeze', 'hang', 'stopped working'],
  'Boot Failure': ['boot', 'startup', 'won\'t start', 'not starting', 'power on', 'turn on', 'start up', 'booting'],
  'SSD Upgrade': ['ssd', 'solid state', 'hard drive', 'storage', 'upgrade ssd', 'install ssd', 'new ssd'],
  'RAM Upgrade': ['ram', 'memory', 'upgrade ram', 'install ram', 'add memory', 'more ram', 'new ram'],
  'OS Installation': ['os', 'operating system', 'windows', 'install windows', 'reinstall', 'format', 'fresh install'],
  'Laptop Screen Repair': ['screen', 'display', 'lcd', 'broken screen', 'cracked screen', 'screen repair', 'black screen'],
  'Data Recovery': ['data', 'files', 'recovery', 'lost files', 'deleted', 'corrupted', 'backup', 'retrieve'],
  'PSU / Power Issue': ['power', 'psu', 'power supply', 'won\'t turn on', 'no power', 'charging', 'battery', 'adapter'],
  'Wi-Fi Adapter Upgrade': ['wifi', 'wi-fi', 'wireless', 'internet', 'network', 'adapter', 'connection', 'signal']
};

// Product types for detection - Keywords mapping for product category detection
// Used to identify when user is searching for specific products
const PRODUCT_TYPES = {
  'Laptop': ['laptop', 'notebook', 'computer', 'pc', 'macbook'],
  'RAM': ['ram', 'memory', 'ddr4', 'ddr5', '8gb', '16gb', '32gb'],
  'SSD': ['ssd', 'solid state', 'nvme', 'm.2', 'storage'],
  'GPU': ['gpu', 'graphics card', 'video card', 'rtx', 'gtx', 'amd'],
  'CPU': ['cpu', 'processor', 'intel', 'amd', 'ryzen', 'core'],
  'Motherboard': ['motherboard', 'mobo', 'mainboard'],
  'PSU': ['psu', 'power supply', 'watt', 'power'],
  'Monitor': ['monitor', 'display', 'screen', '4k', '144hz']
};

const HARDWARE_AI_STEPS = [
  'Reading your issue context',
  'Mapping symptoms to hardware signals',
  'Evaluating compatible upgrade paths',
  'Scoring best-fit component options'
];


export default function Home() {
  // ============================================================================
  // State Management
  // ============================================================================
  const [activeTab, setActiveTab] = useState<TabType>('repairs');
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [errorSuggestions, setErrorSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autoSearchTriggered, setAutoSearchTriggered] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    district: '',
    budget: 'medium',
    custom_budget: undefined,
    urgency: 'normal', // Keep for API but hidden from UI
    verified_only: false, // Keep for API but hidden from UI
    open_now: false // Keep for API but hidden from UI
  });

  // Results state
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Store all products for filtering
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendationSummary, setRecommendationSummary] = useState<string>('');
  
  // Product filters state
  const [productFilters, setProductFilters] = useState({
    minPrice: 0,
    maxPrice: 1000000,
    selectedBrand: '',
    selectedGB: ''
  });
  
  // Error detection state
  const [errorDetection, setErrorDetection] = useState<ErrorDetectionResult | null>(null);
  const [confirmedErrorType, setConfirmedErrorType] = useState<ConfirmedErrorType | null>(null);
  const [detectionLoading, setDetectionLoading] = useState(false);
  
  // Hardware recommendation state
  const [hardwareReco, setHardwareReco] = useState<ProductNeedResponse | null>(null);
  const [hardwareRecoLoading, setHardwareRecoLoading] = useState(false);
  const [hardwareRecoError, setHardwareRecoError] = useState<string | null>(null);
  const [typedExtraExplanation, setTypedExtraExplanation] = useState<string>('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [hardwareAiStep, setHardwareAiStep] = useState(0);
  const [hardwareAiElapsedMs, setHardwareAiElapsedMs] = useState(0);
  const [hardwareAiEtaMs, setHardwareAiEtaMs] = useState(0);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Speech recognition
  const recognitionRef = useRef<any>(null);
  const isRecognizingRef = useRef<boolean>(false);
  const startTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setSearchQuery(transcript);
          detectIntent(transcript);
          isRecognizingRef.current = false;
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          isRecognizingRef.current = false;
          setIsListening(false);
          // Don't show error for aborted recognition (user stopped it)
          if (event.error !== 'aborted' && event.error !== 'no-speech') {
            toast.error('Speech recognition failed. Please try again.');
          }
        };

        recognitionRef.current.onend = () => {
          isRecognizingRef.current = false;
          setIsListening(false);
        };

        recognitionRef.current.onstart = () => {
          isRecognizingRef.current = true;
          setIsListening(true);
        };
      }
    }

    // Cleanup on unmount
    return () => {
      // Clear any pending timeout
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      
      if (recognitionRef.current && isRecognizingRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  // Debounced detection logic
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Generate error suggestions based on query - shows similar issues while typing
  const generateErrorSuggestions = useCallback((text: string): string[] => {
    if (!text.trim() || activeTab !== 'repairs') return [];
    
    const lowerText = text.toLowerCase().trim();
    const suggestions: string[] = [];
    const seen = new Set<string>();
    
    // Comprehensive error examples for all error types
    const errorExamples: Record<string, string[]> = {
      'GPU Overheat': [
        'My GPU is overheating during gaming',
        'Computer shuts down due to GPU temperature',
        'Graphics card fan not working',
        'GPU thermal throttling issue',
        'Graphics card getting too hot',
        'PC overheats when playing games'
      ],
      'Blue Screen (BSOD)': [
        'Blue screen error after Windows update',
        'PC crashes with blue screen randomly',
        'BSOD when running certain programs',
        'Blue screen of death on startup',
        'Computer shows blue screen error',
        'Windows blue screen crash'
      ],
      'Boot Failure': [
        'Computer won\'t start or boot up',
        'PC stuck on boot screen',
        'No display on startup',
        'Boot loop problem',
        'Computer not starting',
        'PC won\'t turn on'
      ],
      'SSD Upgrade': [
        'Need to upgrade my SSD for more storage',
        'Running out of storage space, need SSD',
        'Want faster storage, need SSD upgrade',
        'Need to install new SSD',
        'Computer slow, need SSD upgrade'
      ],
      'RAM Upgrade': [
        'Want to add more RAM to my computer',
        'Computer is slow, need more memory',
        'Need to upgrade RAM',
        'Running out of memory, need RAM upgrade',
        'PC lagging, need more RAM'
      ],
      'OS Installation': [
        'Need to reinstall Windows operating system',
        'Want to install fresh Windows',
        'Need Windows installation',
        'Computer needs OS reinstall',
        'Windows corrupted, need reinstall'
      ],
      'Laptop Screen Repair': [
        'Laptop screen is cracked',
        'Display not working properly',
        'Screen flickering issue',
        'Black screen on laptop',
        'Laptop screen broken',
        'Screen not displaying anything'
      ],
      'Data Recovery': [
        'Lost important files, need recovery',
        'Accidentally deleted files',
        'Hard drive corrupted, need data recovery',
        'Can\'t access my files',
        'Files deleted, need recovery',
        'Need to recover lost data'
      ],
      'PSU / Power Issue': [
        'Computer won\'t turn on',
        'Power supply making noise',
        'PC keeps restarting',
        'No power to the computer',
        'Computer not powering on',
        'Power supply unit issue'
      ],
      'Wi-Fi Adapter Upgrade': [
        'WiFi adapter not working, need upgrade',
        'Internet connection problems',
        'WiFi not connecting',
        'Need better WiFi adapter',
        'Network adapter not working'
      ]
    };

    // Find matching error types based on keywords
    const matchedTypes: string[] = [];
    Object.entries(ERROR_TYPES).forEach(([errorType, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        matchedTypes.push(errorType);
      }
    });

    // If we have matches, show examples from matched types
    if (matchedTypes.length > 0) {
      matchedTypes.forEach(errorType => {
        const examples = errorExamples[errorType] || [];
        examples.forEach(example => {
          // Don't add if it's too similar to what user typed
          if (example.toLowerCase() !== lowerText && !seen.has(example)) {
            suggestions.push(example);
            seen.add(example);
          }
        });
      });
    } else {
      // No direct match - show suggestions based on partial text matching
      Object.entries(errorExamples).forEach(([errorType, examples]) => {
        examples.forEach(example => {
          const exampleLower = example.toLowerCase();
          // Check if user's text partially matches or is similar
          const words = lowerText.split(/\s+/).filter(w => w.length > 2);
          const hasCommonWords = words.some(word => exampleLower.includes(word));
          
          if (hasCommonWords && exampleLower !== lowerText && !seen.has(example)) {
            suggestions.push(example);
            seen.add(example);
          }
        });
      });
    }

    // If still no suggestions, show popular/common issues
    if (suggestions.length === 0) {
      const popularIssues = [
        'Computer won\'t turn on',
        'Blue screen error',
        'Computer running slow',
        'Need to upgrade storage',
        'Screen not working',
        'Lost important files'
      ];
      popularIssues.forEach(issue => {
        if (!seen.has(issue)) {
          suggestions.push(issue);
          seen.add(issue);
        }
      });
    }

    return suggestions.slice(0, 5); // Show up to 5 suggestions
  }, [activeTab]);

  // Detect error type using backend API (new NLP endpoint)
  const detectErrorType = useCallback(async (text: string) => {
    if (!text.trim() || activeTab !== 'repairs') {
      setErrorDetection(null);
      return;
    }

    setDetectionLoading(true);
    try {
      let data: any = null;
      let response: Response | null = null;

      // Try primary endpoint
      try {
        response = await fetch(`${API_BASE_URL}/nlp/detect_error_type`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text.trim() })
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            console.warn('Non-JSON response from primary endpoint:', text);
            throw new Error('Invalid response format');
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (primaryError: any) {
        console.warn('Primary endpoint failed, trying legacy:', primaryError.message);
        
        // Fallback to legacy endpoint
        try {
          response = await fetch(`${API_BASE_URL}/detect_error_type`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.trim() })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            console.warn('Non-JSON response from legacy endpoint:', text);
            throw new Error('Invalid response format');
          }
        } catch (legacyError: any) {
          // Silently fail - endpoints may not be available
          // Only log in development mode
          if (process.env.NODE_ENV === 'development') {
            const errorMsg = legacyError?.message || legacyError?.toString() || 'Unknown error';
            console.warn('Both endpoints failed:', errorMsg);
          }
          setErrorDetection(null);
          return;
        }
      }

      // Validate response data structure
      if (!data || typeof data !== 'object') {
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
          console.warn('Invalid response data:', data);
        }
        setErrorDetection(null);
        return;
      }

      setErrorDetection(data);

      // Auto-confirm if high confidence (>= 0.7, lowered from 0.8 for better UX)
      if (data.label && typeof data.confidence === 'number' && data.confidence >= 0.7) {
        setConfirmedErrorType({
          errorType: data.label,
          source: 'detected',
          confidence: data.confidence
        });
        // Also update detectionResult for compatibility
        setDetectionResult({
          type: 'error',
          category: data.label,
          confidence: data.confidence,
          keywords: []
        });
        // Show success toast for high confidence detections
        if (data.confidence >= 0.8) {
          toast.success(`✅ Detected: ${data.label} (${Math.round(data.confidence * 100)}% confidence)`, { duration: 3000 });
        }
      } else if (data.label && typeof data.confidence === 'number' && data.confidence >= 0.5) {
        // Medium confidence - show detection but don't auto-confirm
        setDetectionResult({
          type: 'error',
          category: data.label,
          confidence: data.confidence,
          keywords: []
        });
        setConfirmedErrorType(null);
      } else {
        // Low confidence - don't auto-confirm, let user choose
        setConfirmedErrorType(null);
      }
    } catch (error: any) {
      // Silently handle errors - don't spam console in production
      // Safely extract error message to avoid circular reference issues
      try {
        const errorMsg = error?.message || error?.toString() || 'Unknown error';
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error detection failed:', errorMsg);
        }
      } catch (logError) {
        // If even logging fails, just continue silently
      }
      setErrorDetection(null);
      setConfirmedErrorType(null);
      // Don't show error to user, just log it in dev mode
    } finally {
      setDetectionLoading(false);
    }
  }, [activeTab]);

  const detectIntent = useCallback((text: string) => {
    // Clear previous timeout
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }

    // If text is empty, clear detection immediately
    if (!text.trim()) {
      setDetectionResult(null);
      setErrorSuggestions([]);
      setShowSuggestions(false);
      setErrorDetection(null);
      setConfirmedErrorType(null);
      return;
    }

    // Debounce detection by 300ms for faster response (reduced from 500ms)
    detectionTimeoutRef.current = setTimeout(() => {
      try {
        // Use backend API for error detection (repairs tab)
        if (activeTab === 'repairs') {
          detectErrorType(text).catch((error) => {
            console.error('Error in detectErrorType:', error);
            setErrorDetection(null);
          });
        } else {
          // Use local detection for products
          const result = detectQueryType(text);
          const detection: DetectionResult = {
            type: result.type === 'repair' ? 'error' : result.type,
            category: result.category,
            confidence: result.confidence,
            keywords: []
          };
          setDetectionResult(detection);
        }
        
        // Suggestions disabled - no suggestions while typing
        setShowSuggestions(false);
      } catch (error) {
        console.error('Detection error:', error);
        setDetectionResult(null);
        setErrorSuggestions([]);
        setShowSuggestions(false);
        setErrorDetection(null);
      }
    }, 500);
  }, [activeTab, generateErrorSuggestions, detectErrorType]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Clear tab-specific state when switching tabs
  useEffect(() => {
    // Clear results and state that don't belong to the current tab
    if (activeTab === 'repairs') {
      // Clear products and hardware results when on repairs tab
      setProducts([]);
      setAllProducts([]);
      setHardwareReco(null);
      setHardwareRecoError(null);
      setHardwareRecoLoading(false);
      setTypedExtraExplanation('');
      setIsTypingComplete(false);
    } else if (activeTab === 'products') {
      // Clear shops, hardware results, and repair-specific state when on products tab
      setShops([]);
      setRecommendationSummary('');
      setHardwareReco(null);
      setHardwareRecoError(null);
      setHardwareRecoLoading(false);
      setErrorDetection(null);
      setConfirmedErrorType(null);
      setBestMatch(null);
      setCompareShops([]);
      setTypedExtraExplanation('');
      setIsTypingComplete(false);
    } else if (activeTab === 'hardware') {
      // Clear shops, products, and repair-specific state when on hardware tab
      setShops([]);
      setProducts([]);
      setRecommendationSummary('');
      setErrorDetection(null);
      setConfirmedErrorType(null);
      setDetectionResult(null);
      setBestMatch(null);
      setCompareShops([]);
      setTypedExtraExplanation('');
      setIsTypingComplete(false);
    }
    
    // Clear suggestions and detection loading when switching tabs
    setShowSuggestions(false);
    setErrorSuggestions([]);
    setDetectionLoading(false);
    setLoading(false);
    setError('');
  }, [activeTab]);

  // Typing animation for extra explanation
  useEffect(() => {
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (hardwareReco?.extra_explanation && !hardwareRecoLoading) {
      const fullText = hardwareReco.extra_explanation;
      setTypedExtraExplanation('');
      setIsTypingComplete(false);
      
      let currentIndex = 0;

      const typeNextChar = () => {
        if (currentIndex < fullText.length) {
          setTypedExtraExplanation(fullText.substring(0, currentIndex + 1));
          const currentChar = fullText[currentIndex];
          currentIndex++;
          // Variable typing cadence creates a more realistic AI-generated output effect.
          const baseDelay = 18 + Math.floor(Math.random() * 25);
          const punctuationPause = /[.,!?;:]/.test(currentChar) ? 95 : 0;
          typingTimeoutRef.current = setTimeout(typeNextChar, baseDelay + punctuationPause);
        } else {
          // Typing is complete
          setIsTypingComplete(true);
        }
      };

      // Start typing after a small delay
      typingTimeoutRef.current = setTimeout(typeNextChar, 100);

      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    } else {
      setTypedExtraExplanation('');
      setIsTypingComplete(false);
    }
  }, [hardwareReco?.extra_explanation, hardwareRecoLoading]);

  // Simulated AI pipeline timing for hardware recommendation loading.
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (hardwareRecoLoading) {
      const randomEtaMs = 7000 + Math.floor(Math.random() * 9000);
      const startedAt = Date.now();
      setHardwareAiEtaMs(randomEtaMs);
      setHardwareAiElapsedMs(0);
      setHardwareAiStep(0);

      intervalId = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const progress = Math.min(elapsed / randomEtaMs, 0.98);
        const progressStep = Math.floor(progress * HARDWARE_AI_STEPS.length);
        const jitter = Math.random() > 0.7 ? 1 : 0;
        const nextStep = Math.min(progressStep + jitter, HARDWARE_AI_STEPS.length - 1);
        setHardwareAiElapsedMs(elapsed);
        setHardwareAiStep(prev => Math.max(prev, nextStep));
      }, 240);
    } else {
      setHardwareAiStep(0);
      setHardwareAiElapsedMs(0);
      setHardwareAiEtaMs(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [hardwareRecoLoading]);

  // Auto-search when error detected with high confidence and district selected
  useEffect(() => {
    if (autoSearchTriggered && detectionResult && detectionResult.confidence > 0.5 && filters.district && !loading && activeTab === 'repairs') {
      const timeoutId = setTimeout(async () => {
        toast.info(`🔍 Auto-searching repair centers in ${filters.district}...`, { duration: 2000 });
        setLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/rank_auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error_type: confirmedErrorType?.errorType || detectionResult?.category || '',
              budget: filters.budget,
              urgency: filters.urgency,
              user_district: filters.district,
              top_k: 10
            })
          });

          if (!response.ok) throw new Error('Failed to fetch repairs');
          const data = await response.json();
          setShops(data);
          
          // Show success message with district info
          if (data && data.length > 0) {
            const districtShops = data.filter((s: Shop) => s.district?.toLowerCase() === filters.district.toLowerCase());
            if (districtShops.length > 0) {
              toast.success(`✅ Found ${districtShops.length} repair center(s) in ${filters.district}`, { duration: 3000 });
            } else {
              toast.info(`Found ${data.length} repair center(s) nearby (expanded search)`, { duration: 3000 });
            }
          }
        } catch (error) {
          console.error('Auto-search error:', error);
          toast.error('Auto-search failed. Please try manually.');
        } finally {
          setLoading(false);
          setAutoSearchTriggered(false); // Reset after search completes
        }
      }, 1000); // Small delay to let user see the detection

      return () => clearTimeout(timeoutId);
    }
  }, [autoSearchTriggered, detectionResult, filters.district, filters.budget, filters.urgency, loading, activeTab]);

  // Reset auto-search trigger when district changes or query changes
  useEffect(() => {
    setAutoSearchTriggered(false);
  }, [filters.district]);

  // Speech functions
  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not available');
      return;
    }

    // If already recognizing or starting, just return (prevent multiple starts)
    if (isRecognizingRef.current || startTimeoutRef.current) {
      return;
    }

    try {
      // Stop any existing recognition first (safety measure)
      try {
        if (isRecognizingRef.current) {
          recognitionRef.current.stop();
        }
      } catch (e) {
        // Ignore if already stopped or not started
      }
      
      // Small delay to ensure previous recognition is fully stopped
      // Set flag in timeout to prevent race conditions
      startTimeoutRef.current = setTimeout(() => {
        startTimeoutRef.current = null;
        
        if (!recognitionRef.current) {
          return;
        }

        // Double-check we're not already recognizing
        if (isRecognizingRef.current) {
          return;
        }

        try {
          setError('');
          // The onstart event will set isRecognizingRef and isListening
          recognitionRef.current.start();
        } catch (error: any) {
          // Handle specific error cases
          if (error.name === 'InvalidStateError') {
            // Recognition is already running - this can happen if it started between checks
            // The onstart event handler will update the state, so just log it
            console.log('Recognition state: already active');
            // Don't update state here - let the event handlers manage it
          } else {
            isRecognizingRef.current = false;
            setIsListening(false);
            toast.error('Failed to start speech recognition. Please try again.');
            console.error('Speech recognition start error:', error);
          }
        }
      }, 250);
    } catch (error: any) {
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      console.error('Speech recognition error:', error);
    }
  };

  const stopListening = () => {
    // Clear any pending start timeout
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    if (recognitionRef.current && (isRecognizingRef.current || isListening)) {
      try {
        recognitionRef.current.stop();
        // State will be updated by onend event handler
      } catch (error) {
        // Ignore stop errors, but update state
        isRecognizingRef.current = false;
        setIsListening(false);
      }
    } else {
      // If not actually recognizing, just update state
      isRecognizingRef.current = false;
      setIsListening(false);
    }
  };

  // Generate hardware suggestion examples
  const generateHardwareSuggestions = useCallback((text: string): string[] => {
    if (!text.trim() || activeTab !== 'hardware') return [];
    
    const lowerText = text.toLowerCase().trim();
    const suggestions: string[] = [];
    const seen = new Set<string>();
    
    const hardwareExamples: Record<string, string[]> = {
      'speed': [
        'I want to speed up my pc',
        'pc is running slow',
        'computer takes too long to start',
        'windows boot is very slow',
        'applications load slowly'
      ],
      'gaming': [
        'low fps when gaming',
        'games stutter and lag',
        'pc shuts down while gaming',
        'graphics quality is poor in games',
        'need better gaming performance'
      ],
      'memory': [
        'running out of memory',
        'pc freezes when opening many tabs',
        'need more ram',
        'system hangs with multiple apps',
        'chrome tabs crash due to memory'
      ],
      'storage': [
        'running out of storage space',
        'hard drive is full',
        'need more storage for games',
        'disk space is low',
        'cannot install new programs'
      ],
      'wifi': [
        'wifi keeps disconnecting',
        'internet connection is unstable',
        'weak wifi signal',
        'slow internet speed',
        'network adapter not working'
      ],
      'power': [
        'pc shuts down randomly',
        'computer restarts suddenly',
        'power supply issues',
        'system turns off during heavy use',
        'unstable power delivery'
      ],
      'display': [
        'no display on monitor',
        'screen goes black',
        'monitor flickering',
        'display issues',
        'no signal to monitor'
      ],
      'cooling': [
        'pc overheats',
        'fan noise is very loud',
        'high temperatures',
        'thermal throttling',
        'system gets too hot'
      ]
    };
    
    // Find matching categories
    const matchedCategories: string[] = [];
    Object.entries(hardwareExamples).forEach(([category, examples]) => {
      if (lowerText.includes(category) || examples.some(ex => lowerText.includes(ex.split(' ')[0]))) {
        matchedCategories.push(category);
      }
    });
    
    // Add examples from matched categories
    if (matchedCategories.length > 0) {
      matchedCategories.forEach(category => {
        hardwareExamples[category].forEach(example => {
          if (example.toLowerCase() !== lowerText && !seen.has(example)) {
            suggestions.push(example);
            seen.add(example);
          }
        });
      });
    } else {
      // Show popular examples if no match
      const popularExamples = [
        'I want to speed up my pc',
        'low fps when gaming',
        'wifi keeps disconnecting',
        'pc shuts down while gaming',
        'running out of memory'
      ];
      popularExamples.forEach(example => {
        if (!seen.has(example)) {
          suggestions.push(example);
          seen.add(example);
        }
      });
    }
    
    return suggestions.slice(0, 5);
  }, [activeTab]);

  // Generate product suggestions based on query - shows similar product searches while typing
  const generateProductSuggestions = useCallback((text: string): string[] => {
    if (!text.trim() || activeTab !== 'products') return [];
    
    const lowerText = text.toLowerCase().trim();
    const suggestions: string[] = [];
    const seen = new Set<string>();
    
    const productExamples: Record<string, string[]> = {
      'ram': [
        'Need RAM upgrade',
        'Looking for DDR4 RAM',
        'Want to add more memory',
        'Need 16GB RAM for gaming',
        'Best RAM for my PC',
        'RAM upgrade for laptop'
      ],
      'ssd': [
        'Looking for SSD',
        'Need SSD upgrade',
        'Want faster storage SSD',
        'Best SSD for gaming',
        'Need 1TB SSD',
        'SSD for laptop upgrade'
      ],
      'gpu': [
        'GPU for gaming',
        'Looking for graphics card',
        'Need better GPU',
        'Best GPU for gaming',
        'Graphics card upgrade',
        'NVIDIA or AMD GPU'
      ],
      'cpu': [
        'Need CPU upgrade',
        'Looking for processor',
        'Best CPU for gaming',
        'Intel or AMD CPU',
        'CPU cooler needed',
        'Processor upgrade'
      ],
      'psu': [
        'Need power supply',
        'Looking for PSU',
        'Power supply upgrade',
        'Best PSU for gaming PC',
        'Need 750W PSU',
        'Modular power supply'
      ],
      'monitor': [
        'Looking for monitor',
        'Need gaming monitor',
        'Best monitor for gaming',
        '4K monitor',
        '144Hz monitor',
        'Monitor upgrade'
      ],
      'wifi': [
        'Need WiFi adapter',
        'Looking for network adapter',
        'WiFi card upgrade',
        'Best WiFi adapter',
        'USB WiFi adapter',
        'Wireless adapter'
      ],
      'cooling': [
        'Need CPU cooler',
        'Looking for case fans',
        'PC cooling solution',
        'Liquid cooling',
        'Air cooler for CPU',
        'Case fan upgrade'
      ],
      'motherboard': [
        'Need motherboard',
        'Looking for motherboard',
        'Motherboard upgrade',
        'Best motherboard for gaming',
        'AM4 or LGA motherboard',
        'Motherboard replacement'
      ],
      'storage': [
        'Need more storage',
        'Looking for hard drive',
        'HDD or SSD',
        'External storage',
        'Storage upgrade',
        '1TB hard drive'
      ]
    };
    
    // Find matching categories
    const matchedCategories: string[] = [];
    Object.entries(productExamples).forEach(([category, examples]) => {
      if (lowerText.includes(category) || examples.some(ex => {
        const firstWords = ex.toLowerCase().split(' ').slice(0, 2).join(' ');
        return lowerText.includes(firstWords.split(' ')[0]);
      })) {
        matchedCategories.push(category);
      }
    });
    
    // Add examples from matched categories
    if (matchedCategories.length > 0) {
      matchedCategories.forEach(category => {
        productExamples[category].forEach(example => {
          if (example.toLowerCase() !== lowerText && !seen.has(example)) {
            suggestions.push(example);
            seen.add(example);
          }
        });
      });
    } else {
      // Show popular examples if no match
      const popularExamples = [
        'Need RAM upgrade',
        'Looking for SSD',
        'GPU for gaming',
        'Need power supply',
        'Looking for monitor'
      ];
      popularExamples.forEach(example => {
        if (!seen.has(example)) {
          suggestions.push(example);
          seen.add(example);
        }
      });
    }
    
    // Also check for partial word matches
    const words = lowerText.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      Object.entries(productExamples).forEach(([category, examples]) => {
        examples.forEach(example => {
          const exampleLower = example.toLowerCase();
          const hasCommonWords = words.some(word => exampleLower.includes(word));
          
          if (hasCommonWords && exampleLower !== lowerText && !seen.has(example)) {
            suggestions.push(example);
            seen.add(example);
          }
        });
      });
    }
    
    return suggestions.slice(0, 5);
  }, [activeTab]);

  // Hardware recommendation handler
  async function handleHardwareRecommend(queryText: string, district: string, budget: string) {
    if (!queryText.trim()) {
      toast.error('Please describe your PC issue or need');
      return;
    }

    try {
      setHardwareRecoLoading(true);
      setHardwareRecoError(null);
      setHardwareReco(null);

      // Add 2 second delay with analyzing animation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const res = await fetchProductNeedRecommend({
        text: queryText,
        district,
        budget,
      });

      // Check if the issue is unclear or invalid
      // Be more lenient if spell correction was suggested (user had typos but tried to describe issue)
      const confidenceThreshold = res.spell_correction_suggestion ? 0.10 : 0.15;
      if (!res.component || res.confidence < confidenceThreshold) {
        setHardwareRecoError(
          res.extra_explanation || 
          "Your issue description is not clear enough. Please provide more details about your PC problem or need."
        );
        setHardwareReco(null);
        toast.warning("Issue not clear - Please provide more details about your PC problem.", { 
          duration: 5000 
        });
        return;
      }
      
      setHardwareReco(res);
      
      if (res.component) {
        toast.success(`Recommended: ${res.component}`, { duration: 3000 });
      }
    } catch (err: any) {
      console.error("Failed to get hardware recommendation", err);
      const errorMsg = err?.message ?? "Failed to get hardware recommendation";
      setHardwareRecoError(errorMsg);
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setHardwareRecoLoading(false);
    }
  }

  // Search function
  const handleSearch = async () => {
    // For repairs, ensure we have detection result or detect from query
    if (activeTab === 'repairs' && searchQuery.trim()) {
      // If no detection result yet, try to detect now (sync for search)
      if (!detectionResult) {
        try {
          const result = detectQueryType(searchQuery);
          const detection: DetectionResult = {
            type: result.type === 'repair' ? 'error' : result.type,
            category: result.category,
            confidence: result.confidence,
            keywords: []
          };
          setDetectionResult(detection);
          
          // Show detection message
          if (detection.category && detection.category !== 'General Repair') {
            toast.success(`✅ Detected error type: ${detection.category}`, { duration: 3000 });
          }
        } catch (error) {
          console.error('Detection error during search:', error);
        }
      }
    }
    
    // For products, detect product type from query
    if (activeTab === 'products' && searchQuery.trim()) {
      // Always try to detect product type when searching
      try {
        const result = detectQueryType(searchQuery);
        const detection: DetectionResult = {
          type: result.type === 'repair' ? 'error' : result.type,
          category: result.category,
          confidence: result.confidence,
          keywords: []
        };
        
        // Only update if it's a product type or if we don't have a detection yet
        if (result.type === 'product' || !detectionResult) {
          setDetectionResult(detection);
          
          // Show detection message for products
          if (detection.type === 'product' && detection.category && detection.category !== 'General Product') {
            toast.success(`🛒 Detected product: ${detection.category}`, { duration: 3000 });
          }
        }
      } catch (error) {
        console.error('Detection error during product search:', error);
      }
    }
    
    // Allow products to work without query, but repairs need error type
    if (activeTab === 'repairs' && !searchQuery.trim() && !detectionResult) {
      toast.error('Please describe your issue so we can detect the error type');
      return;
    }

    // For repairs, ensure we have error type
    if (activeTab === 'repairs' && !confirmedErrorType?.errorType && !detectionResult?.category && !searchQuery.trim()) {
      toast.error('Please describe your issue so we can detect the error type');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (activeTab === 'repairs') {
        try {
          await searchRepairs();
        } catch (err: any) {
          // Error already handled in searchRepairs with toast, just log it
          console.error('Search repairs error:', err);
        }
      } else if (activeTab === 'products') {
        await searchProducts();
      } else if (activeTab === 'hardware') {
        // For hardware tab, just trigger the recommendation (no district needed)
        if (searchQuery.trim()) {
          await handleHardwareRecommend(searchQuery, '', filters.budget);
        } else {
          toast.error('Please describe your PC issue or need');
        }
        return; // Don't show loading state for hardware recommendations
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Search failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage, { duration: 5000 });
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchRepairs = async () => {
    // Reset auto-search flag when manually searching
    if (!autoSearchTriggered) {
      setAutoSearchTriggered(false);
    }
    
    // Validate required fields
    const errorType = detectionResult?.category || '';
    const userDistrict = filters.district || '';
    
    if (!errorType.trim()) {
      toast.error('Please describe your issue first. Error type is required.');
      setError('Please describe your issue first. Error type is required.');
      return;
    }
    
    if (!userDistrict.trim()) {
      toast.error('Please select a district first to find repair centers near you.');
      setError('Please select a district first to find repair centers near you.');
      return;
    }
    
    const requestBody = {
      error_type: errorType,
      budget: filters.budget || 'medium',
      urgency: filters.urgency || 'normal',
      user_district: userDistrict,
      top_k: 10
    };
    
    console.log('Sending request to /rank_auto:', requestBody);
    
    const response = await fetch(`${API_BASE_URL}/rank_auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = 'Failed to fetch repairs';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }
      console.error('API Error:', response.status, errorMessage);
      throw new Error(`${errorMessage} (Status: ${response.status})`);
    }
    
    const data = await response.json();
    console.log('Received response from /rank_auto:', data);
    
    // Handle new response format with summary
    if (data && typeof data === 'object' && 'recommendations' in data && 'summary' in data) {
      // New format: RecommendationResponse
      const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
      const summary = data.summary || '';
      
      setShops(recommendations);
      setRecommendationSummary(summary);
      
      // Show success message
      if (recommendations.length > 0) {
        toast.success(`✅ Found ${data.suitable_count || recommendations.length} suitable repair center(s)`, { duration: 3000 });
      } else if (summary) {
        // Show info if summary exists (means we searched but found nothing)
        toast.info('No repair centers found matching your criteria', { duration: 4000 });
      }
    } else if (Array.isArray(data)) {
      // Fallback to old format (array)
      setShops(data);
      setRecommendationSummary('');
      
      // Show success message with district info
      if (data.length > 0) {
        if (filters.district) {
          const districtShops = data.filter((s: Shop) => s.district?.toLowerCase() === filters.district.toLowerCase());
          if (districtShops.length > 0) {
            toast.success(`✅ Found ${districtShops.length} repair center(s) in ${filters.district}`, { duration: 3000 });
          } else {
            toast.info(`Found ${data.length} repair center(s) nearby (expanded search)`, { duration: 3000 });
          }
        } else {
          toast.success(`✅ Found ${data.length} repair center(s)`, { duration: 3000 });
        }
      } else {
        toast.info('No repair centers found', { duration: 3000 });
      }
    } else {
      // Unexpected format
      console.error('Unexpected response format:', data);
      setShops([]);
      setRecommendationSummary('');
      toast.error('Unexpected response format from server', { duration: 3000 });
    }
  };

  const searchProducts = async () => {
    try {
      // Determine what to search for
      let errorType = '';
      let productCategory = '';
      let queryText = searchQuery;

      // Priority 1: If detection result is a product type, use it directly
      if (detectionResult?.type === 'product') {
        productCategory = detectionResult.category;
        // Map product categories to error types for backend compatibility
        const productToError: Record<string, string> = {
          'RAM': 'RAM Upgrade',
          'SSD': 'SSD Upgrade',
          'GPU': 'GPU Overheat',
          'CPU': 'OS Installation',
          'PSU': 'PSU / Power Issue',
          'Wi-Fi Adapter': 'Wi-Fi Adapter Upgrade',
          'Motherboard': 'Boot Failure',
          'Monitor': 'Laptop Screen Repair',
          'Keyboard': 'Keyboard Repair',
          'Mouse': 'General Repair',
          'Laptop': 'General Repair',
          'Desktop': 'General Repair',
          'Cooling': 'GPU Overheat',
          'Case': 'General Repair'
        };
        errorType = productToError[detectionResult.category] || detectionResult.category;
      } else if (detectionResult?.type === 'error') {
        // Priority 2: Map error types to product categories
        const errorToProduct: Record<string, string> = {
          'SSD Upgrade': 'SSD',
          'RAM Upgrade': 'RAM',
          'Wi-Fi Adapter Upgrade': 'Wi-Fi Adapter',
          'GPU Overheat': 'GPU',
          'PSU / Power Issue': 'PSU',
          'Boot Failure': 'Motherboard',
          'Laptop Screen Repair': 'Monitor',
          'Keyboard Repair': 'Keyboard'
        };
        errorType = detectionResult.category;
        productCategory = errorToProduct[detectionResult.category] || '';
      } else if (queryText.trim()) {
        // Priority 3: Try to extract from query text directly
        const lowerQuery = queryText.toLowerCase();
        if (lowerQuery.includes('ram') || lowerQuery.includes('memory')) {
          productCategory = 'RAM';
          errorType = 'RAM Upgrade';
        } else if (lowerQuery.includes('graphic') || lowerQuery.includes('gpu')) {
          productCategory = 'GPU';
          errorType = 'GPU Overheat';
        } else if (lowerQuery.includes('ssd') || lowerQuery.includes('storage')) {
          productCategory = 'SSD';
          errorType = 'SSD Upgrade';
        }
      }

      const response = await fetch(`${API_BASE_URL}/rank_products_auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error_type: errorType,
          product_category: productCategory,
          query: queryText,
          budget: filters.budget,
          district: filters.district,
          user_district: filters.district
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Product API error:', errorText);
        throw new Error(`Failed to fetch products: ${errorText}`);
      }

      const data = await response.json();
      console.log('Products received:', data.length, 'items', data);
      
      if (!data || data.length === 0) {
        toast.warning('No products found. Try a different search term, category, or remove the district filter.');
        setError('No products found. Try adjusting your search criteria.');
      } else {
        toast.success(`Found ${data.length} product(s)`);
        setError('');
      }
      
      const productsData = data || [];
      setAllProducts(productsData); // Store all products
      
      // Calculate max price for filter
      const maxPrice = productsData.length > 0 
        ? Math.max(...productsData.map(p => p.price_lkr || 0))
        : 1000000;
      
      setProductFilters(prev => ({
        ...prev,
        maxPrice: prev.maxPrice === 1000000 ? maxPrice : prev.maxPrice
      }));
      
      // Filters will be applied automatically by useEffect
    } catch (err: any) {
      console.error('Product search error:', err);
      setError(`Failed to search products: ${err.message}`);
      setProducts([]);
      setAllProducts([]);
    }
  };

  // Extract GB from product model or specifications
  const extractGB = (product: Product): string | null => {
    const text = `${product.model || ''} ${product.specifications ? JSON.stringify(product.specifications) : ''}`.toUpperCase();
    const gbMatch = text.match(/(\d+)\s*GB/i);
    return gbMatch ? gbMatch[1] : null;
  };

  // Generate detailed explanation for why a shop is recommended
  const generateShopExplanation = (shop: Shop, errorType?: string): { reason: string; factors: string[] } => {
    const factors: string[] = [];
    const reasonParts: string[] = [];

    // If backend already provided a reason, use it as base
    if (shop.reason) {
      reasonParts.push(shop.reason);
    }

    // Specialization match
    if (shop.specialization && shop.specialization.length > 0) {
      const specializations = Array.isArray(shop.specialization) 
        ? shop.specialization 
        : typeof shop.specialization === 'string' 
          ? shop.specialization.split(',').map(s => s.trim())
          : [];
      
      if (specializations.length > 0) {
        factors.push(`Specializes in: ${specializations.slice(0, 3).join(', ')}`);
        if (errorType) {
          const matchesSpecialization = specializations.some(s => 
            s.toLowerCase().includes(errorType.toLowerCase()) ||
            errorType.toLowerCase().includes(s.toLowerCase())
          );
          if (matchesSpecialization) {
            reasonParts.push(`This shop specializes in ${errorType} repairs, making them highly qualified for your issue.`);
          }
        }
      }
    }

    // Location match
    if (shop.district_match !== undefined && shop.district_match > 0) {
      if (shop.district_match >= 0.8) {
        factors.push('📍 Same district - convenient location');
        reasonParts.push('Located in your district for easy access and quick service.');
      } else if (shop.district_match >= 0.5) {
        factors.push('📍 Nearby district');
        reasonParts.push('Located in a nearby district, still easily accessible.');
      }
    } else if (shop.district) {
      factors.push(`📍 ${shop.district}`);
    }

    // Type match (shop type matches error type)
    if (shop.type_match !== undefined && shop.type_match > 0) {
      if (shop.type_match >= 0.9) {
        factors.push('✅ Perfect service match');
        reasonParts.push('Shop type perfectly matches your repair needs.');
      } else if (shop.type_match >= 0.7) {
        factors.push('✅ Good service match');
        reasonParts.push('Shop offers services that match your repair requirements.');
      }
    }

    // Budget fit
    if (shop.budget_fit !== undefined && shop.budget_fit > 0) {
      if (shop.budget_fit >= 0.8) {
        factors.push('💰 Excellent price match');
        reasonParts.push('Pricing aligns well with your budget preferences.');
      } else if (shop.budget_fit >= 0.6) {
        factors.push('💰 Good price range');
        reasonParts.push('Offers competitive pricing within your budget range.');
      }
    }

    // Rating and reviews
    if (shop.avg_rating && shop.avg_rating >= 4.5) {
      factors.push(`⭐ Excellent rating (${shop.avg_rating.toFixed(1)}/5)`);
      reasonParts.push(`Highly rated with ${shop.avg_rating.toFixed(1)} stars, indicating consistent quality service.`);
    } else if (shop.avg_rating && shop.avg_rating >= 4.0) {
      factors.push(`⭐ Great rating (${shop.avg_rating.toFixed(1)}/5)`);
      reasonParts.push(`Well-rated shop with ${shop.avg_rating.toFixed(1)} stars and positive customer feedback.`);
    } else if (shop.avg_rating) {
      factors.push(`⭐ Rating: ${shop.avg_rating.toFixed(1)}/5`);
    }

    if (shop.reviews && shop.reviews >= 50) {
      factors.push(`📝 ${shop.reviews}+ reviews`);
      reasonParts.push(`Trusted by ${shop.reviews}+ customers with verified reviews.`);
    } else if (shop.reviews && shop.reviews >= 20) {
      factors.push(`📝 ${shop.reviews} reviews`);
    }

    // Verified status
    if (shop.verified === true || shop.verified === 1) {
      factors.push('✅ Verified shop');
      reasonParts.push('Verified shop with confirmed credentials and business legitimacy.');
    }

    // Turnaround time
    if (shop.turnaround_days) {
      if (shop.turnaround_days <= 2) {
        factors.push(`⚡ Fast service (${shop.turnaround_days} days)`);
        reasonParts.push(`Quick turnaround time of ${shop.turnaround_days} days for fast repairs.`);
      } else if (shop.turnaround_days <= 5) {
        factors.push(`⏰ ${shop.turnaround_days} days turnaround`);
        reasonParts.push(`Reasonable turnaround time of ${shop.turnaround_days} days.`);
      } else {
        factors.push(`⏰ ${shop.turnaround_days} days turnaround`);
      }
    }

    // Overall score
    if (shop.score !== undefined) {
      if (shop.score >= 0.9) {
        reasonParts.push('Top-rated match with excellent overall score for your specific needs.');
      } else if (shop.score >= 0.8) {
        reasonParts.push('High-quality match with strong overall score.');
      }
    }

    // Combine reason parts
    let finalReason = reasonParts.length > 0 
      ? reasonParts.join(' ') 
      : `This repair shop is recommended based on their specialization, location, ratings, and customer reviews.`;

    // Add error type context if available
    if (errorType && !finalReason.toLowerCase().includes(errorType.toLowerCase())) {
      finalReason = `Ideal for ${errorType} repairs. ${finalReason}`;
    }

    return {
      reason: finalReason,
      factors: factors.length > 0 ? factors : ['Quality service', 'Good ratings', 'Reliable shop']
    };
  };

  // Apply filters when they change
  useEffect(() => {
    if (allProducts.length > 0) {
      const filtered = allProducts.filter(product => {
        // Price filter
        const price = product.price_lkr || 0;
        if (price < productFilters.minPrice || price > productFilters.maxPrice) {
          return false;
        }

        // Brand filter
        if (productFilters.selectedBrand && product.brand !== productFilters.selectedBrand) {
          return false;
        }

        // GB filter
        if (productFilters.selectedGB) {
          const productGB = extractGB(product);
          if (!productGB || productGB !== productFilters.selectedGB) {
            return false;
          }
        }

        return true;
      });

      setProducts(filtered);
    }
  }, [productFilters, allProducts]);


  // Feedback function
  const handleFeedback = async (feedback: FeedbackEvent) => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback)
      });

      if (response.ok) {
        toast.success('Feedback saved!');
      } else {
        toast.error('Failed to save feedback');
      }
    } catch (err) {
      toast.error('Failed to save feedback');
    }
  };

    // Modal state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [modalType, setModalType] = useState<'shop' | 'product' | null>(null);
  
  // Shop details modal state
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [shopDetailsLoading, setShopDetailsLoading] = useState(false);
  const [shopDetailsError, setShopDetailsError] = useState('');
  
  // Product details modal state
  const [productDetails, setProductDetails] = useState<{product: any; shop: any} | null>(null);
  const [productDetailsLoading, setProductDetailsLoading] = useState(false);
  const [productDetailsError, setProductDetailsError] = useState('');
  
  // Compare shops state
  const [compareShops, setCompareShops] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  
  // Best Match state (recommended repair center)
  const [bestMatch, setBestMatch] = useState<{shops: Shop[]; products: Product[]; summary: string} | null>(null);
  const [bestMatchLoading, setBestMatchLoading] = useState(false);
  
  // Geolocation state
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Ref to track blur timeout for suggestions
  const suggestionBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openModal = async (item: any, type: 'shop' | 'product') => {
    if (!item) {
      console.error('openModal called with null/undefined item');
      toast.error('Unable to open details. Item information is missing.');
      return;
    }
    
    setSelectedItem(item);
    setModalType(type);
    
    // Fetch detailed information for shops
    if (type === 'shop') {
      if (!item.shop_id) {
        console.error('Shop ID is missing:', item);
        setShopDetailsError('Shop ID is missing. Cannot load details.');
        toast.error('Shop ID is missing');
        return;
      }
      
      setShopDetailsLoading(true);
      setShopDetailsError('');
      setShopDetails(null);
      
      try {
        const url = `${API_BASE_URL}/shop_details?shop_id=${encodeURIComponent(item.shop_id)}`;
        console.log('Fetching shop details from:', url);
        console.log('API_BASE_URL:', API_BASE_URL);
        
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        let response: Response;
        try {
          response = await fetch(url, {
            signal: controller.signal,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          // Handle network errors
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timeout - backend server may be slow or unresponsive');
          } else if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
            throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Please ensure the backend is running.`);
          } else {
            throw fetchError;
          }
        }
        
        if (!response.ok) {
          let errorMessage = 'Failed to load shop details';
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          console.error('Shop details API error:', response.status, errorMessage);
          
          // If shop not found (404), create a basic details object from the item
          if (response.status === 404) {
            setShopDetails({
              shop: {
                shop_id: item.shop_id,
                shop_name: item.shop_name || 'Unknown Shop',
                district: item.district || '',
                shop_type: item.shop_type || '',
                average_rating: item.avg_rating || null,
                reviews_count: item.reviews || null,
                verified: item.verified || false,
                address: item.address || null,
                phone_number: item.phone || item.phone_number || null,
                email: null,
                website: null
              },
              products: [],
              feedback: []
            });
            setShopDetailsError(`⚠️ Warning: ${errorMessage}. Showing available information only.`);
            toast.warning('Full shop details not available. Showing limited information.');
          } else {
            setShopDetailsError(errorMessage);
            toast.error(`Failed to load shop details: ${errorMessage}`);
          }
        } else {
          const details = await response.json();
          console.log('Shop details loaded successfully:', details);
          setShopDetails(details);
        }
      } catch (err: any) {
        console.error('Failed to fetch shop details:', err);
        const errorMsg = err?.message || 'Network error. Please check if the backend is running.';
        setShopDetailsError(errorMsg);
        toast.error(`Failed to load shop details: ${errorMsg}`, { duration: 5000 });
        
        // Create fallback details from item if we have basic info
        if (item.shop_id && item.shop_name) {
          setShopDetails({
            shop: {
              shop_id: item.shop_id,
              shop_name: item.shop_name || 'Unknown Shop',
              district: item.district || '',
              shop_type: item.shop_type || '',
              average_rating: item.avg_rating || null,
              reviews_count: item.reviews || null,
              verified: item.verified || false,
              address: item.address || null,
              phone_number: item.phone || item.phone_number || null,
              email: null,
              website: null
            },
            products: [],
            feedback: []
          });
        }
      } finally {
        setShopDetailsLoading(false);
      }
    }
    
    // Fetch detailed information for products
    if (type === 'product') {
      if (!item.product_id) {
        console.error('Product ID is missing:', item);
        setProductDetailsError('Product ID is missing. Cannot load details.');
        toast.error('Product ID is missing');
        return;
      }
      
      setProductDetailsLoading(true);
      setProductDetailsError('');
      setProductDetails(null);
      
      try {
        const url = `${API_BASE_URL}/product_details?product_id=${encodeURIComponent(item.product_id)}`;
        console.log('Fetching product details from:', url);
        console.log('API_BASE_URL:', API_BASE_URL);
        
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        let response: Response;
        try {
          response = await fetch(url, {
            signal: controller.signal,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          // Handle network errors
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timeout - backend server may be slow or unresponsive');
          } else if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
            throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Please ensure the backend is running.`);
          } else {
            throw fetchError;
          }
        }
        
        if (!response.ok) {
          let errorMessage = 'Failed to load product details';
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
          console.error('Product details API error:', response.status, errorMessage);
          setProductDetailsError(errorMessage);
          toast.error(`Failed to load product details: ${errorMessage}`);
        } else {
          const details = await response.json();
          console.log('Product details loaded successfully:', details);
          setProductDetails(details);
        }
      } catch (err: any) {
        console.error('Failed to fetch product details:', err);
        const errorMsg = err?.message || 'Network error. Please check if the backend is running.';
        setProductDetailsError(errorMsg);
        toast.error(`Failed to load product details: ${errorMsg}`, { duration: 5000 });
      } finally {
        setProductDetailsLoading(false);
      }
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setModalType(null);
    setShopDetails(null);
    setShopDetailsLoading(false);
    setShopDetailsError('');
    setProductDetails(null);
    setProductDetailsLoading(false);
    setProductDetailsError('');
  };

  // Compare shops handlers
  const handleCompareChange = (shopId: string, checked: boolean) => {
    if (checked) {
      if (compareShops.length < 3) {
        setCompareShops([...compareShops, shopId]);
      } else {
        toast.error('You can compare up to 3 shops at a time');
      }
    } else {
      setCompareShops(compareShops.filter(id => id !== shopId));
    }
  };

  // Show compare modal when 2-3 shops selected
  useEffect(() => {
    if (compareShops.length >= 2 && compareShops.length <= 3) {
      setShowCompareModal(true);
    } else {
      setShowCompareModal(false);
    }
  }, [compareShops]);

  // Get current location and detect district
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use reverse geocoding API (Nominatim OpenStreetMap - free)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'PC-Recommendation-Engine' // Required by Nominatim
              }
            }
          );
          
          if (!response.ok) {
            throw new Error('Failed to get location data');
          }
          
          const data = await response.json();
          
          // Try to extract district from address
          const address = data.address || {};
          let district = '';
          
          // Check various address fields for district
          if (address.state_district) {
            district = address.state_district;
          } else if (address.district) {
            district = address.district;
          } else if (address.state) {
            district = address.state;
          } else if (address.city) {
            district = address.city;
          }
          
          // Map common city names to districts in Sri Lanka
          const cityToDistrict: Record<string, string> = {
            'Colombo': 'Colombo',
            'Kandy': 'Kandy',
            'Galle': 'Galle',
            'Jaffna': 'Jaffna',
            'Anuradhapura': 'Anuradhapura',
            'Ratnapura': 'Ratnapura',
            'Kurunegala': 'Kurunegala',
            'Negombo': 'Gampaha',
            'Kalutara': 'Kalutara',
            'Matara': 'Matara',
            'Batticaloa': 'Batticaloa',
            'Trincomalee': 'Trincomaley',
            'Polonnaruwa': 'Polonnaruwa',
            'Badulla': 'Badulla',
            'Nuwara Eliya': 'Nuwara Eliya',
            'Hambantota': 'Hambantota',
            'Puttalam': 'Puttalam',
            'Kegalle': 'Kegalle',
            'Monaragala': 'Monaragala',
            'Matale': 'Matale'
          };
          
          // Try to match city name
          const cityName = address.city || address.town || address.village || '';
          if (cityName && cityToDistrict[cityName]) {
            district = cityToDistrict[cityName];
          }
          
          // If district found, set it
          if (district && DISTRICTS.includes(district)) {
            setFilters(prev => ({ ...prev, district }));
            toast.success(`📍 Location detected: ${district}`);
          } else {
            // Fallback: use coordinate-based detection for major cities
            const detectedDistrict = detectDistrictFromCoordinates(latitude, longitude);
            if (detectedDistrict) {
              setFilters(prev => ({ ...prev, district: detectedDistrict }));
              toast.success(`📍 Location detected: ${detectedDistrict}`);
            } else {
              toast.warning('Could not detect district. Please select manually.');
            }
          }
        } catch (error: any) {
          console.error('Location error:', error);
          // Fallback to coordinate-based detection
          const detectedDistrict = detectDistrictFromCoordinates(position.coords.latitude, position.coords.longitude);
          if (detectedDistrict) {
            setFilters(prev => ({ ...prev, district: detectedDistrict }));
            toast.success(`📍 Location detected: ${detectedDistrict}`);
          } else {
            toast.error('Failed to detect district. Please select manually.');
          }
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);
        console.error('Geolocation error:', error);
        toast.error('Failed to get your location. Please select district manually.');
      }
    );
  };

  // Detect district from coordinates (Sri Lanka approximate boundaries)
  const detectDistrictFromCoordinates = (lat: number, lon: number): string | null => {
    // Approximate coordinate ranges for major districts in Sri Lanka
    const districtBounds: Array<{name: string; latMin: number; latMax: number; lonMin: number; lonMax: number}> = [
      { name: 'Colombo', latMin: 6.8, latMax: 6.95, lonMin: 79.8, lonMax: 79.95 },
      { name: 'Gampaha', latMin: 7.0, latMax: 7.3, lonMin: 79.9, lonMax: 80.1 },
      { name: 'Kalutara', latMin: 6.5, latMax: 6.8, lonMin: 79.9, lonMax: 80.1 },
      { name: 'Kandy', latMin: 7.25, latMax: 7.35, lonMin: 80.55, lonMax: 80.65 },
      { name: 'Galle', latMin: 6.0, latMax: 6.1, lonMin: 80.2, lonMax: 80.25 },
      { name: 'Matara', latMin: 5.9, latMax: 6.0, lonMin: 80.5, lonMax: 80.6 },
      { name: 'Jaffna', latMin: 9.6, latMax: 9.7, lonMin: 80.0, lonMax: 80.1 },
      { name: 'Anuradhapura', latMin: 8.3, latMax: 8.35, lonMin: 80.35, lonMax: 80.4 },
      { name: 'Ratnapura', latMin: 6.65, latMax: 6.7, lonMin: 80.4, lonMax: 80.45 },
      { name: 'Kurunegala', latMin: 7.45, latMax: 7.5, lonMin: 80.35, lonMax: 80.4 },
    ];
    
    for (const bounds of districtBounds) {
      if (lat >= bounds.latMin && lat <= bounds.latMax && 
          lon >= bounds.lonMin && lon <= bounds.lonMax) {
        return bounds.name;
      }
    }
    
    return null;
  };

  // Fetch Best Match (recommended repair center)
  const fetchBestMatch = async () => {
    const errorType = confirmedErrorType?.errorType || detectionResult?.category;
    if (!errorType || !filters.district) {
      toast.error('Please confirm the error type and select a district first');
      return;
    }

    setBestMatchLoading(true);
    try {
      // Add 3 second delay for analyzing animation
      const [apiResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/full_recommendation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error_type: errorType,
            budget: filters.budget,
            urgency: filters.urgency,
            user_district: filters.district,
            top_k_shops: 1,
            top_k_products: 3,
            top_k_tools: 0
          })
        }),
        new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay
      ]);

      if (!apiResponse.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to fetch best match';
        try {
          const errorData = await apiResponse.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          const errorText = await apiResponse.text();
          errorMessage = errorText || errorMessage;
        }
        console.error('API Error:', apiResponse.status, errorMessage);
        throw new Error(`${errorMessage} (Status: ${apiResponse.status})`);
      }

      const data = await apiResponse.json();
      setBestMatch({
        shops: data.shops || [],
        products: data.products || [],
        summary: data.summary || ''
      });
      toast.success('Best match found!');
    } catch (error: any) {
      console.error('Best match error:', error);
      toast.error(`Failed to find best match: ${error.message}`);
    } finally {
      setBestMatchLoading(false);
    }
  };

  return (
    <div className="hardware-repair-theme min-h-screen bg-black text-white">
      <div className="container-custom py-10 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent mb-3">
              PC Recommendation Engine
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-cyan-400 to-blue-500 mx-auto rounded-full"></div>
          </div>
          <p className="text-xl text-gray-300 font-medium">
            Find repairs, products, and hardware recommendations for your PC needs
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-lg border border-white/15 p-2 inline-flex gap-2">
            {(['repairs', 'products', 'hardware'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg scale-105'
                    : 'text-gray-300 hover:bg-white/10 hover:scale-102'
                }`}
              >
                {tab === 'hardware' ? 'Hardware Recommender' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Repairs Section */}
        {activeTab === 'repairs' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md rounded-xl shadow-xl border border-cyan-400/30 p-6">
              {/* Section Header */}
              <div className="mb-6 pb-4 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔧</span>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white">Repair Services</h2>
                    <p className="text-sm text-gray-300 mt-1">
                      Get expert PC repair recommendations tailored to your specific issue. 
                      Our AI-powered system matches you with the best repair shops based on specialization, 
                      location, ratings, and customer reviews.
                    </p>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Describe your PC issue
                </label>
                <div className="relative">
                  <textarea
                    value={searchQuery}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setSearchQuery(newValue);
                      detectIntent(newValue);
                      setAutoSearchTriggered(false);
                      
                      // Suggestions disabled - no suggestions while typing
                      setShowSuggestions(false);
                    }}
                    onFocus={() => {
                      // Suggestions disabled - no suggestions while typing
                      setShowSuggestions(false);
                    }}
                    onBlur={() => {
                      if (suggestionBlurTimeoutRef.current) {
                        clearTimeout(suggestionBlurTimeoutRef.current);
                      }
                      suggestionBlurTimeoutRef.current = setTimeout(() => {
                        setShowSuggestions(false);
                        suggestionBlurTimeoutRef.current = null;
                      }, 200);
                    }}
                    placeholder="e.g., 'Blue screen after update', 'GPU overheating during gaming', 'Need SSD upgrade'"
                    rows={3}
                    className="w-full px-3 py-2 pr-20 border border-white/20 bg-black/30 text-gray-100 rounded-md shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  
                  {/* Error Suggestions Dropdown */}
                  {activeTab === 'repairs' && (
                    <div className="relative">
                      <ErrorSuggestions
                        suggestions={errorSuggestions}
                        onSelect={(suggestion) => {
                          if (suggestionBlurTimeoutRef.current) {
                            clearTimeout(suggestionBlurTimeoutRef.current);
                            suggestionBlurTimeoutRef.current = null;
                          }
                          setSearchQuery(suggestion);
                          detectIntent(suggestion);
                          setShowSuggestions(false);
                        }}
                        visible={showSuggestions && errorSuggestions.length > 0 && searchQuery.length >= 2 && searchQuery.length <= 15}
                      />
                    </div>
                  )}

                  {/* Product Suggestions Dropdown */}
                  {activeTab === 'products' && showSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-900/95 border border-white/20 rounded-md shadow-lg max-h-60 overflow-auto backdrop-blur-md">
                      <div className="px-3 py-2 bg-cyan-500/10 border-b border-white/10">
                        <p className="text-xs font-semibold text-cyan-300">🛒 Similar Product Searches</p>
                      </div>
                      {generateProductSuggestions(searchQuery).map((suggestion, idx) => (
                        <button
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (suggestionBlurTimeoutRef.current) {
                              clearTimeout(suggestionBlurTimeoutRef.current);
                              suggestionBlurTimeoutRef.current = null;
                            }
                            setSearchQuery(suggestion);
                            setShowSuggestions(false);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            if (suggestionBlurTimeoutRef.current) {
                              clearTimeout(suggestionBlurTimeoutRef.current);
                              suggestionBlurTimeoutRef.current = null;
                            }
                            setSearchQuery(suggestion);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors border-b border-white/10 last:border-b-0 focus:bg-cyan-500/10 focus:outline-none cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-cyan-400 text-xs">→</span>
                            <span>{suggestion}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {speechSupported && (
                    <div className="absolute right-2 top-2">
                  {/* Voice Button with animation */}
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 z-10 ${
                      isListening 
                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/50' 
                        : 'bg-purple-500 text-white hover:bg-purple-600 shadow-md hover:shadow-lg'
                    } transform hover:scale-105 active:scale-95`}
                  >
                    {/* Pulsing ring when recording */}
                    {isListening && (
                      <>
                        <div className="absolute -inset-1 bg-red-500 rounded-lg animate-ping opacity-75"></div>
                        <div className="absolute -inset-0.5 bg-red-600 rounded-lg animate-pulse"></div>
                      </>
                    )}
                    <span className="relative flex items-center gap-2">
                      {isListening ? (
                        <>
                          <svg 
                            className="w-5 h-5 animate-bounce" 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                          </svg>
                          <span>Recording</span>
                        </>
                      ) : (
                        <>
                          <svg 
                            className="w-5 h-5" 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                          </svg>
                          <span>Voice</span>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Voice Recording Animation Banner */}
            {isListening && (
              <div className="mt-3 relative overflow-hidden bg-gradient-to-r from-red-500 via-red-600 to-red-500 rounded-lg p-4 shadow-lg">
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Pulsing microphone icon */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75"></div>
                      <div className="relative bg-white rounded-full p-3 shadow-lg">
                        <svg 
                          className="w-6 h-6 text-red-600 animate-bounce" 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Recording text and animation */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-lg">Recording...</span>
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                      <p className="text-red-100 text-sm">Speak clearly into your microphone</p>
                    </div>
                  </div>
                  
                  {/* Stop button */}
                  <button
                    onClick={stopListening}
                    className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 transition-colors shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                  >
                    Stop
                  </button>
                </div>
                
                {/* Animated sound wave visualization */}
                <div className="relative mt-4 flex items-center justify-center gap-1 h-10">
                  {[...Array(20)].map((_, i) => {
                    const delay = i * 0.1;
                    const duration = 0.8 + (i % 3) * 0.2;
                    const height = 8 + (i % 5) * 4;
                    return (
                      <div
                        key={i}
                        className="bg-white/60 rounded-full"
                        style={{
                          width: '4px',
                          height: `${height}px`,
                          animation: `wave ${duration}s ease-in-out infinite`,
                          animationDelay: `${delay}s`
                        }}
                      ></div>
                    );
                  })}
                </div>
              </div>
            )}
              </div>

            {/* Error Detection Result with Confirmation - Enhanced */}
            {activeTab === 'repairs' && (errorDetection || detectionLoading || (searchQuery.trim().length > 3 && !errorDetection)) && (
              <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                {detectionLoading ? (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-400 rounded-lg p-5 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <div className="absolute inset-0 animate-ping rounded-full h-6 w-6 border border-blue-400 opacity-75"></div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-900">🔍 Analyzing your issue...</p>
                        <p className="text-xs text-blue-700 mt-1">Detecting error type and matching repair shops</p>
                      </div>
                    </div>
                  </div>
                ) : errorDetection && errorDetection.label ? (
                  <div className={`rounded-xl p-5 shadow-lg border-2 transition-all duration-300 ${
                    errorDetection.confidence >= 0.8 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400' 
                      : errorDetection.confidence >= 0.6
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400'
                      : 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-400'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`p-2.5 rounded-lg shadow-md ${
                            errorDetection.confidence >= 0.8 ? 'bg-green-100' :
                            errorDetection.confidence >= 0.6 ? 'bg-yellow-100' : 'bg-orange-100'
                          }`}>
                            <span className="text-3xl">🎯</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Detected Issue</p>
                            <p className="text-2xl font-bold text-gray-900">{errorDetection.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full shadow-lg ${
                              errorDetection.confidence >= 0.8 ? 'bg-green-500' :
                              errorDetection.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-orange-500'
                            } animate-pulse`}></div>
                            <p className="text-sm font-bold text-gray-800">
                              {Math.round(errorDetection.confidence * 100)}% confidence
                            </p>
                          </div>
                        </div>
                      </div>
                      {confirmedErrorType && confirmedErrorType.errorType === errorDetection.label && (
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-bold shadow-md animate-pulse">
                            ✓ Confirmed
                          </span>
                          <span className="text-xs text-green-700 font-medium">Ready to search</span>
                        </div>
                      )}
                    </div>
                        
                        {/* Multiple Error Types */}
                        {errorDetection.multiple_types && errorDetection.multiple_types.length > 0 && (
                          <div className="mb-4 p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
                            <p className="text-sm font-semibold text-orange-900 mb-2">
                              ⚠️ Multiple Issues Detected:
                            </p>
                            <div className="space-y-2">
                              {errorDetection.multiple_types.map((multiType, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 bg-white border border-orange-200 rounded"
                                >
                                  <span className="text-sm font-medium text-gray-800">
                                    {multiType.label}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    {Math.round(multiType.confidence * 100)}% confidence
                                  </span>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-orange-800 mt-2">
                              Your issue may involve multiple problems. Consider addressing all detected issues.
                            </p>
                          </div>
                        )}
                        
                        {/* Explanation */}
                        {errorDetection.explanation && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-gray-700">{errorDetection.explanation}</p>
                          </div>
                        )}
                        
                        {/* Similar Issues disabled */}
                        
                        {errorDetection.alternatives && errorDetection.alternatives.length > 0 && errorDetection.confidence < 0.8 && (
                          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-xs font-semibold text-purple-900 mb-2">💡 Other possibilities:</p>
                            <div className="flex flex-wrap gap-2">
                              {errorDetection.alternatives.slice(0, 3).map((alt, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setConfirmedErrorType({
                                      errorType: alt.label,
                                      source: 'user_selected',
                                      confidence: alt.confidence
                                    });
                                    setDetectionResult({
                                      type: 'error',
                                      category: alt.label,
                                      confidence: alt.confidence,
                                      keywords: []
                                    });
                                    toast.success(`✓ Selected: ${alt.label}`, { duration: 2000 });
                                  }}
                                  className="px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-xs font-semibold hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm hover:shadow-md"
                                >
                                  {alt.label} <span className="text-purple-600">({Math.round(alt.confidence * 100)}%)</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {!confirmedErrorType || confirmedErrorType.errorType !== errorDetection.label ? (
                          <div className="space-y-2">
                            <button
                              onClick={() => {
                                setConfirmedErrorType({
                                  errorType: errorDetection.label!,
                                  source: 'user_selected',
                                  confidence: errorDetection.confidence
                                });
                                setDetectionResult({
                                  type: 'error',
                                  category: errorDetection.label!,
                                  confidence: errorDetection.confidence,
                                  keywords: []
                                });
                                toast.success(`✓ Confirmed: ${errorDetection.label}`, { duration: 2000 });
                              }}
                              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                            >
                              <span className="text-lg">✓</span>
                              <span>Confirm: {errorDetection.label}</span>
                            </button>
                            <p className="text-xs text-center text-gray-600">
                              Click to confirm this error type and search for repair shops
                            </p>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400 rounded-lg px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <span className="text-green-600 text-xl">✓</span>
                              <span className="text-sm font-bold text-green-800">{errorDetection.label} Confirmed</span>
                            </div>
                            <p className="text-xs text-green-700">Ready to search for repair shops</p>
                          </div>
                        )}
                    </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">Could not detect specific issue</p>
                        {errorDetection && errorDetection.alternatives && errorDetection.alternatives.length > 0 ? (
                          <>
                            <p className="text-xs text-gray-700 mb-2">Did you mean:</p>
                            <div className="flex flex-wrap gap-2">
                              {errorDetection.alternatives.map((alt, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setConfirmedErrorType({
                                      errorType: alt.label,
                                      source: 'user_selected',
                                      confidence: alt.confidence
                                    });
                                    setDetectionResult({
                                      type: 'error',
                                      category: alt.label,
                                      confidence: alt.confidence,
                                      keywords: []
                                    });
                                    toast.success(`Selected: ${alt.label}`);
                                  }}
                                  className="px-3 py-1 bg-white border border-gray-300 rounded-md text-xs hover:bg-purple-50 hover:border-purple-300 transition-colors"
                                >
                                  {alt.label} ({Math.round(alt.confidence * 100)}%)
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-gray-600 italic">Please provide more details about your issue</p>
                        )}
                  </div>
                )}
              </div>
            )}
            
            {/* Legacy Detection Result for Products */}
            {activeTab === 'products' && detectionResult && detectionResult.type === 'product' && (
              <div className="mt-3 animate-in slide-in-from-top-2 duration-300 bg-blue-50 border-2 border-blue-300 rounded-lg p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Product Detected:</p>
                      <p className="text-lg font-bold text-blue-700">{detectionResult.category}</p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-medium">
                    PRODUCT
                  </div>
                </div>
              </div>
            )}

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <div className="flex gap-2">
                    <select
                      value={filters.district}
                      onChange={(e) => setFilters(prev => ({ ...prev, district: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select District</option>
                      {DISTRICTS.map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                    <button
                      onClick={getCurrentLocation}
                      disabled={locationLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      title="Get current location"
                    >
                      {locationLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Locating...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>📍 Get Location</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={loading || (!searchQuery.trim() && !detectionResult)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-md hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold shadow-md hover:shadow-lg"
              >
                {loading ? 'Searching...' : 'Search Repair Shops'}
              </button>
            </div>
          </div>
        )}

        {/* Products Section */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-xl border-2 border-green-200 p-6">
              {/* Section Header */}
              <div className="mb-6 pb-4 border-b-2 border-green-200">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🛒</span>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Product Search</h2>
                    <p className="text-sm text-gray-600">Search for PC components and accessories</p>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What product are you looking for?
                </label>
                <div className="relative">
                  <textarea
                    value={searchQuery}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setSearchQuery(newValue);
                      detectIntent(newValue);
                      setAutoSearchTriggered(false);
                      // Suggestions disabled - no suggestions while typing
                      setShowSuggestions(false);
                    }}
                    onFocus={() => {
                      // Suggestions disabled - no suggestions while typing
                      setShowSuggestions(false);
                    }}
                    onBlur={() => {
                      if (suggestionBlurTimeoutRef.current) {
                        clearTimeout(suggestionBlurTimeoutRef.current);
                      }
                      suggestionBlurTimeoutRef.current = setTimeout(() => {
                        setShowSuggestions(false);
                        suggestionBlurTimeoutRef.current = null;
                      }, 200);
                    }}
                    placeholder="e.g., 'Need RAM upgrade', 'Looking for SSD', 'GPU for gaming'"
                    rows={3}
                    className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  
                  {/* Product Suggestions Dropdown */}
                  {showSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div className="px-3 py-2 bg-green-50 border-b border-gray-200">
                        <p className="text-xs font-semibold text-green-700">🛒 Similar Product Searches</p>
                      </div>
                      {generateProductSuggestions(searchQuery).map((suggestion, idx) => (
                        <button
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (suggestionBlurTimeoutRef.current) {
                              clearTimeout(suggestionBlurTimeoutRef.current);
                              suggestionBlurTimeoutRef.current = null;
                            }
                            setSearchQuery(suggestion);
                            setShowSuggestions(false);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            if (suggestionBlurTimeoutRef.current) {
                              clearTimeout(suggestionBlurTimeoutRef.current);
                              suggestionBlurTimeoutRef.current = null;
                            }
                            setSearchQuery(suggestion);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors border-b border-gray-100 last:border-b-0 focus:bg-green-50 focus:outline-none cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 text-xs">→</span>
                            <span>{suggestion}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {speechSupported && (
                    <div className="absolute right-2 top-2">
                      <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 z-10 ${
                          isListening 
                            ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/50' 
                            : 'bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg'
                        } transform hover:scale-105 active:scale-95`}
                      >
                        {isListening && (
                          <>
                            <div className="absolute -inset-1 bg-red-500 rounded-lg animate-ping opacity-75"></div>
                            <div className="absolute -inset-0.5 bg-red-600 rounded-lg animate-pulse"></div>
                          </>
                        )}
                        <span className="relative flex items-center gap-2">
                          {isListening ? (
                            <>
                              <svg className="w-5 h-5 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                              </svg>
                              <span>Recording</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                              </svg>
                              <span>Voice</span>
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Product Detection Result */}
              {detectionResult && detectionResult.type === 'product' && (
                <div className="mt-3 animate-in slide-in-from-top-2 duration-300 bg-green-50 border-2 border-green-300 rounded-lg p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold text-green-900">Product Detected:</p>
                        <p className="text-lg font-bold text-green-700">{detectionResult.category}</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium">
                      PRODUCT
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <div className="flex gap-2">
                    <select
                      value={filters.district}
                      onChange={(e) => setFilters(prev => ({ ...prev, district: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select District</option>
                      {DISTRICTS.map(district => (
                        <option key={district} value={district}>{district}</option>
                      ))}
                    </select>
                    <button
                      onClick={getCurrentLocation}
                      disabled={locationLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      title="Get current location"
                    >
                      {locationLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Locating...</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>📍 Get Location</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-md hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold shadow-md hover:shadow-lg"
              >
                {loading ? 'Searching...' : !searchQuery.trim() ? 'Browse Products' : 'Search Products'}
              </button>
            </div>
          </div>
        )}

        {/* Hardware Recommender Section */}
        {activeTab === 'hardware' && (
          <div className="space-y-6">
            <div className="bg-slate-950/70 rounded-xl shadow-xl border border-white/15 p-6 backdrop-blur-md">
              {/* Section Header */}
              <div className="mb-6 pb-4 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚙️</span>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Hardware Recommender</h2>
                    <p className="text-sm text-gray-300">Get personalized hardware upgrade recommendations</p>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Describe your PC problem or need
                </label>
                <div className="relative">
                  <textarea
                    value={searchQuery}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setSearchQuery(newValue);
                      detectIntent(newValue);
                      setAutoSearchTriggered(false);
                      // Hardware suggestions disabled
                      setShowSuggestions(false);
                    }}
                    onFocus={() => {
                      // Hardware suggestions disabled
                      setShowSuggestions(false);
                    }}
                    onBlur={() => {
                      if (suggestionBlurTimeoutRef.current) {
                        clearTimeout(suggestionBlurTimeoutRef.current);
                      }
                      suggestionBlurTimeoutRef.current = setTimeout(() => {
                        setShowSuggestions(false);
                        suggestionBlurTimeoutRef.current = null;
                      }, 200);
                    }}
                    placeholder="e.g., 'I want to speed up my pc', 'low fps when gaming', 'wifi keeps disconnecting'"
                    rows={3}
                    className="w-full px-3 py-2 pr-20 border border-white/20 bg-black/30 text-gray-100 rounded-md shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  
                  {speechSupported && (
                    <div className="absolute right-2 top-2">
                      <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 z-10 ${
                          isListening 
                            ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/50' 
                            : 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-md hover:shadow-lg'
                        } transform hover:scale-105 active:scale-95`}
                      >
                        {isListening && (
                          <>
                            <div className="absolute -inset-1 bg-red-500 rounded-lg animate-ping opacity-75"></div>
                            <div className="absolute -inset-0.5 bg-red-600 rounded-lg animate-pulse"></div>
                          </>
                        )}
                        <span className="relative flex items-center gap-2">
                          {isListening ? (
                            <>
                              <svg className="w-5 h-5 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                              </svg>
                              <span>Recording</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                              </svg>
                              <span>Voice</span>
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-4 rounded-md hover:from-cyan-400 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold shadow-md hover:shadow-lg"
              >
                {loading ? 'Analyzing...' : 'Get Hardware Recommendation'}
              </button>
            </div>

            {hardwareRecoLoading && (
              <div className="py-10 px-6 bg-slate-950/75 rounded-xl shadow-xl border border-cyan-400/25 backdrop-blur-md">
                <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-full bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center">
                      <span className="text-lg">🤖</span>
                      <span className="absolute inset-0 rounded-full border border-cyan-300/20 animate-ping"></span>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white">AI is generating your hardware fix plan</p>
                      <p className="text-xs text-gray-300">Live inference trace</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-300">
                    <span className="text-cyan-300 font-medium">{(hardwareAiElapsedMs / 1000).toFixed(1)}s</span>
                    {' / '}
                    ~{Math.max(1, Math.ceil(hardwareAiEtaMs / 1000))}s
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {HARDWARE_AI_STEPS.map((step, index) => (
                    <div key={step} className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${
                        index < hardwareAiStep
                          ? 'bg-emerald-400'
                          : index === hardwareAiStep
                          ? 'bg-cyan-400 animate-pulse'
                          : 'bg-slate-600'
                      }`}></span>
                      <p className={`text-sm ${
                        index <= hardwareAiStep ? 'text-gray-100' : 'text-gray-500'
                      }`}>
                        {step}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="relative h-2 w-full rounded-full bg-slate-800 overflow-hidden mb-3">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-300 transition-all duration-500"
                    style={{
                      width: `${Math.min(96, (hardwareAiElapsedMs / Math.max(hardwareAiEtaMs, 1)) * 100)}%`
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Confidence modeling in progress...</span>
                  <div className="flex items-end gap-1 h-4">
                    {[0, 1, 2, 3, 4, 5].map((bar) => (
                      <span
                        key={bar}
                        className="hardware-ai-bar w-1 rounded-full bg-cyan-400/75"
                        style={{
                          animationDelay: `${bar * 0.15}s`,
                          height: `${8 + ((bar % 3) * 4)}px`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {hardwareRecoError && (
              <div className="bg-red-500/10 border border-red-400/40 text-red-200 px-4 py-3 rounded mb-6">
                {hardwareRecoError}
              </div>
            )}

            {!hardwareRecoLoading && !hardwareRecoError && hardwareReco && hardwareReco.component && (
              <div className="space-y-4">
                {/* Spell Correction Suggestion */}
                {hardwareReco.spell_correction_suggestion && (
                  <div className="bg-cyan-500/10 border border-cyan-400/30 text-cyan-100 px-3 py-2 rounded mb-3">
                    <p className="text-xs font-medium">💡 Did you mean: <span className="font-semibold">"{hardwareReco.spell_correction_suggestion}"</span>?</p>
                  </div>
                )}
                
                {/* Main Recommendation */}
                <div className="bg-slate-950/75 border border-cyan-400/25 rounded-lg p-4 backdrop-blur-md">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🔧</span>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {hardwareReco.component}
                      </h2>
                      {hardwareReco.confidence !== undefined && (
                        <p className="text-xs text-cyan-200 mt-0.5">
                          Confidence: {(hardwareReco.confidence * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </div>

                  {hardwareReco.extra_explanation && (
                    <div className="mb-4">
                      <p className="text-base text-gray-100 leading-relaxed font-medium">
                        {typedExtraExplanation}
                        {typedExtraExplanation.length < hardwareReco.extra_explanation.length && (
                          <span className="inline-block w-0.5 h-4 bg-cyan-400 ml-1 animate-pulse">|</span>
                        )}
                      </p>
                    </div>
                  )}

                  {hardwareReco.definition && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-cyan-200 mb-0.5">What is it:</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{hardwareReco.definition}</p>
                    </div>
                  )}

                  {hardwareReco.why_useful && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-cyan-200 mb-0.5">Why useful:</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{hardwareReco.why_useful}</p>
                    </div>
                  )}

                  {/* Fixing Tips - Always show if available, regardless of confidence */}
                  {hardwareReco.fixing_tips && hardwareReco.fixing_tips.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/15">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">🔧</span>
                        <h3 className="text-lg font-bold text-white">Try These Fixes First</h3>
                      </div>
                      <p className="text-xs text-gray-300 mb-4">
                        Before purchasing an upgrade, try these troubleshooting steps:
                      </p>
                      <div className="space-y-2">
                        {hardwareReco.fixing_tips.map((tip, index) => (
                          <div 
                            key={index} 
                            className="bg-white/5 border-l-4 border-cyan-400 rounded-r-lg p-3 shadow-sm hover:shadow-md transition-shadow border border-white/10"
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 text-cyan-200 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                                {index + 1}
                              </span>
                              <p className="text-sm text-gray-100 leading-relaxed flex-1">{tip}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 bg-amber-500/10 border border-amber-400/40 rounded-lg">
                        <p className="text-xs text-amber-100">
                          <strong>💡 Tip:</strong> If these steps don't resolve the issue, then the upgrade is recommended.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Alternative Recommendations */}
                {hardwareReco.alternatives && hardwareReco.alternatives.length > 1 && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <h3 className="text-xs font-semibold text-gray-100 mb-2">Other Options:</h3>
                    <div className="space-y-1.5">
                      {hardwareReco.alternatives.slice(1).map((alt) => (
                        <div key={alt.label} className="bg-slate-900/80 border border-white/10 rounded p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-100">{alt.label}</span>
                            <span className="text-xs text-cyan-200">
                              {(alt.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!hardwareRecoLoading && !hardwareReco && !hardwareRecoError && (
              <div className="text-center py-16 bg-slate-950/65 rounded-xl shadow-lg border border-white/10 backdrop-blur-md">
                <div className="text-cyan-300/70 text-7xl mb-6">🛠️</div>
                <h3 className="text-2xl font-bold text-white mb-3">
                  Ready to get hardware recommendations?
                </h3>
                <p className="text-gray-300 text-lg mb-8 max-w-md mx-auto">
                  Describe your PC issue above and we'll suggest the best hardware upgrade for you.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse border border-gray-100">
                <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-full mb-2"></div>
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* ChatGPT-style Analysis Summary */}
        {activeTab === 'repairs' && recommendationSummary && shops.length > 0 && !loading && (
          <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border-l-4 border-purple-500 rounded-xl p-6 mb-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                  AI
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Analysis & Recommendations</h3>
                <div className="prose prose-sm max-w-none">
                  {recommendationSummary.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-gray-700 mb-3 last:mb-0 whitespace-pre-line leading-relaxed">
                      {paragraph.split('**').map((part, i) => 
                        i % 2 === 1 ? <strong key={i} className="text-purple-700 font-semibold">{part}</strong> : part
                      )}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Best Match Button */}
        {activeTab === 'repairs' && shops.length > 0 && !loading && !bestMatch && (
          <div className="mb-6 flex justify-center gap-4">
            <button
              onClick={fetchBestMatch}
              disabled={bestMatchLoading}
              className="px-8 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {bestMatchLoading ? 'Finding Best Match...' : '⭐ Find Best Match'}
            </button>
            {compareShops.length >= 2 && (
              <button
                onClick={() => setShowCompareModal(true)}
                className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                🔍 Compare {compareShops.length} Shops
              </button>
            )}
          </div>
        )}

        {/* Best Match Display */}
        {activeTab === 'repairs' && bestMatch && (
          <BestMatch
            shops={bestMatch.shops}
            products={bestMatch.products}
            summary={bestMatch.summary}
            loading={bestMatchLoading}
            onClose={() => setBestMatch(null)}
          />
        )}

        {/* Compare Button - Always visible when shops are selected */}
        {activeTab === 'repairs' && compareShops.length >= 2 && shops.length > 0 && !loading && (
          <div className="mb-4 flex justify-center">
            <button
              onClick={() => setShowCompareModal(true)}
              className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🔍 Compare {compareShops.length} Selected Shops
            </button>
          </div>
        )}

        {/* Repair Results */}
        {activeTab === 'repairs' && shops.length > 0 && !loading && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Recommended Repair Centers
              </h2>
              <span className="px-4 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                {shops.length} Shops
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shops.map((shop, index) => (
                <div key={shop.shop_id} className="bg-white rounded-xl shadow-lg p-6 relative border border-gray-100 hover:shadow-xl hover:border-purple-200 transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute top-4 right-4">
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="mb-4 pr-16">
                    <h3 className="text-xl font-bold text-gray-900">{shop.shop_name}</h3>
                  </div>
                  
                  {shop.avg_rating && (
                    <div className="flex items-center mb-3">
                      <div className="flex items-center">
                        <span className="text-yellow-400 text-lg">⭐</span>
                        <span className="ml-2 text-sm font-semibold text-gray-700">
                          {shop.avg_rating.toFixed(1)}
                        </span>
                        {shop.reviews && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({shop.reviews} reviews)
                          </span>
                        )}
                      </div>
                      {(shop.verified === true || shop.verified === 1) && (
                        <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          ✅ Verified
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-sm text-gray-600 mb-4 space-y-1">
                    <p className="flex items-center">📍 <span className="ml-1 font-medium">{shop.district}</span></p>
                    {shop.turnaround_days && (
                      <p className="flex items-center">⏰ <span className="ml-1">{shop.turnaround_days} days turnaround</span></p>
                    )}
                    {shop.distance && (
                      <p className="flex items-center">🚗 <span className="ml-1">{shop.distance}km away</span></p>
                    )}
                  </div>

                  {/* Explainable Reason - Always show */}
                  {(() => {
                    const explanation = generateShopExplanation(shop, detectionResult?.category);
                    return (
                      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-lg shadow-sm">
                        <p className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                          <span className="mr-2">💡</span>
                          Why this shop is recommended for your issue:
                        </p>
                        <p className="text-sm text-blue-800 leading-relaxed mb-3">{explanation.reason}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {explanation.factors.map((factor, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`compare-${shop.shop_id}`}
                        checked={compareShops.includes(shop.shop_id)}
                        onChange={(e) => handleCompareChange(shop.shop_id, e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                      />
                      <label htmlFor={`compare-${shop.shop_id}`} className="ml-2 text-sm font-medium text-gray-700 cursor-pointer hover:text-purple-600 transition-colors">
                        Compare
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        console.log('Opening shop details for:', shop);
                        if (!shop?.shop_id) {
                          toast.error('Shop ID is missing. Cannot open details.');
                          console.error('Shop object missing shop_id. Full shop object:', JSON.stringify(shop, null, 2));
                          return;
                        }
                        console.log('Shop ID found:', shop.shop_id);
                        openModal(shop, 'shop');
                      }}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      View Details
                    </button>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleFeedback({
                          chosen_id: shop.shop_id,
                          error_type: detectionResult?.category || '',
                          solved: true,
                          user_rating: 5,
                          feedback_type: 'shop'
                        })}
                        className="text-green-600 hover:text-green-700 hover:scale-125 transition-transform duration-200 text-lg"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleFeedback({
                          chosen_id: shop.shop_id,
                          error_type: detectionResult?.category || '',
                          solved: false,
                          user_rating: 1,
                          feedback_type: 'shop'
                        })}
                        className="text-red-600 hover:text-red-700 hover:scale-125 transition-transform duration-200 text-lg"
                      >
                        👎
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Results */}
        {activeTab === 'products' && allProducts.length > 0 && !loading && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Recommended Products
              </h2>
              <div className="flex items-center gap-3">
                {allProducts[0]?.detected_category && (
                  <div className="px-4 py-1.5 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 rounded-full text-xs font-semibold border border-purple-200">
                    {allProducts[0].detected_category}
                    {allProducts[0].detection_confidence && (
                      <span className="ml-2 text-purple-600">
                        {Math.round(allProducts[0].detection_confidence * 100)}%
                      </span>
                    )}
                  </div>
                )}
                <span className="px-4 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                  {products.length} Products
                </span>
              </div>
            </div>
            
            {/* Product Filters */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Price Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range (LKR)
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={productFilters.minPrice}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setProductFilters(prev => ({ ...prev, minPrice: val }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Min"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="number"
                        min="0"
                        value={productFilters.maxPrice}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1000000;
                          setProductFilters(prev => ({ ...prev, maxPrice: val }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Max"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>LKR {productFilters.minPrice.toLocaleString()}</span>
                      <span>LKR {productFilters.maxPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Brand Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand
                  </label>
                  <select
                    value={productFilters.selectedBrand}
                    onChange={(e) => setProductFilters(prev => ({ ...prev, selectedBrand: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">All Brands</option>
                    {Array.from(new Set(allProducts.map(p => p.brand).filter(Boolean))).sort().map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                {/* GB Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Storage/Memory (GB)
                  </label>
                  <select
                    value={productFilters.selectedGB}
                    onChange={(e) => setProductFilters(prev => ({ ...prev, selectedGB: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">All Sizes</option>
                    {Array.from(new Set(
                      allProducts
                        .map(p => {
                          // Extract GB from model or specifications
                          const text = `${p.model || ''} ${p.specifications ? JSON.stringify(p.specifications) : ''}`.toUpperCase();
                          const gbMatch = text.match(/(\d+)\s*GB/i);
                          return gbMatch ? gbMatch[1] : null;
                        })
                        .filter(Boolean)
                    )).sort((a, b) => parseInt(a || '0') - parseInt(b || '0')).map(gb => (
                      <option key={gb} value={gb}>{gb} GB</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    const maxPrice = allProducts.length > 0 
                      ? Math.max(...allProducts.map(p => p.price_lkr || 0))
                      : 1000000;
                    setProductFilters({
                      minPrice: 0,
                      maxPrice: maxPrice,
                      selectedBrand: '',
                      selectedGB: ''
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product, index) => (
                <div key={`${product.product_id || 'product'}-${index}`} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl hover:border-purple-200 transition-all duration-300 transform hover:-translate-y-1">
                  <div className="absolute top-4 right-4">
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="mb-4 pr-16">
                    <h3 className="text-xl font-bold text-gray-900">
                      {product.brand} {product.model}
                    </h3>
                    <p className="text-sm font-semibold text-purple-600 mt-1">{product.category || 'Product'}</p>
                  </div>
                  
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">Price</span>
                      <p className="text-2xl font-bold text-green-600">
                        LKR {product.price_lkr ? product.price_lkr.toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    {product.stock_status && 
                     !(product.stock_status || '').toLowerCase().includes('out') && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-medium">Stock</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                          (product.stock_status || '').toLowerCase().includes('stock') && 
                          !(product.stock_status || '').toLowerCase().includes('out')
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        }`}>
                          {(product.stock_status || 'Unknown').replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                    {product.warranty && (
                      <div className="flex items-center pt-2">
                        <span className="text-sm text-gray-600">🛡️ <span className="ml-1">{product.warranty}</span></span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Available at:</p>
                    <p className="text-sm font-semibold text-gray-900">{product.shop_name || 'Unknown Shop'}</p>
                    {product.district && (
                      <p className="text-xs text-gray-500 mt-1">📍 {product.district}</p>
                    )}
                    {(product.shop_rating || product.avg_rating) && (
                      <div className="flex items-center mt-2">
                        <span className="text-yellow-400">⭐</span>
                        <span className="ml-1 text-sm font-semibold text-gray-700">
                          {(product.shop_rating || product.avg_rating || 0).toFixed(1)}
                        </span>
                        {(product.shop_verified || product.verified) && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            ✅ Verified
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Why recommended?</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {product.match_reason || 'Good price match, verified seller, in stock'}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        if (!product?.product_id) {
                          toast.error('Product ID is missing. Cannot open details.');
                          console.error('Product object missing product_id:', product);
                          return;
                        }
                        openModal(product, 'product');
                      }}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      View Details
                    </button>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleFeedback({
                          chosen_id: product.product_id,
                          error_type: detectionResult?.category || '',
                          solved: true,
                          user_rating: 5,
                          feedback_type: 'product'
                        })}
                        className="text-green-600 hover:text-green-700 hover:scale-125 transition-transform duration-200 text-lg"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleFeedback({
                          chosen_id: product.product_id,
                          error_type: detectionResult?.category || '',
                          solved: false,
                          user_rating: 1,
                          feedback_type: 'product'
                        })}
                        className="text-red-600 hover:text-red-700 hover:scale-125 transition-transform duration-200 text-lg"
                      >
                        👎
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && shops.length === 0 && products.length === 0 && activeTab !== 'hardware' && (
          <div className="text-center py-16 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="text-gray-300 text-7xl mb-6">
              {activeTab === 'repairs' ? '🏪' : '🛒'}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {activeTab === 'repairs' 
                ? 'Ready to find repair centers?'
                : 'Ready to find products?'}
            </h3>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
              {activeTab === 'repairs'
                ? 'Describe your PC issue above to get personalized repair center recommendations.'
                : 'Describe what you need or click "Browse Products" to see all available products.'}
            </p>
            {activeTab === 'products' && (
              <button
                onClick={handleSearch}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Browse All Products
              </button>
            )}
          </div>
        )}

        {/* Enhanced Shop Details Modal */}
        {selectedItem && modalType === 'shop' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedItem.shop_name}</h2>
                  <div className="flex items-center space-x-4 mt-2">
                    {selectedItem.verified && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Verified
                      </span>
                    )}
                    <div className="flex items-center">
                      <span className="text-yellow-400">⭐</span>
                      <span className="ml-1 text-sm text-gray-600">
                        {selectedItem.avg_rating?.toFixed(1) || 'N/A'} ({selectedItem.reviews || 0} reviews)
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">📍 {selectedItem.district}</span>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4">
                {shopDetailsLoading && (
                  <div className="space-y-4">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    </div>
                    <div className="animate-pulse">
                      <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                    <div className="animate-pulse">
                      <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                    <p className="text-center text-gray-500 py-8">Loading details...</p>
                  </div>
                )}

                {shopDetailsError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {shopDetailsError}
                  </div>
                )}

                {shopDetails && !shopDetailsLoading && (
                  <div className="space-y-6">
                    {/* Contact Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">📍 Address</p>
                          <p className="text-gray-900">{shopDetails.shop?.city_address || shopDetails.address || 'Address not available'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">📞 Phone</p>
                          <p className="text-gray-900">{shopDetails.shop?.phone_number || shopDetails.phone || 'Phone not available'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">📧 Email</p>
                          <p className="text-gray-900">{shopDetails.shop?.email || shopDetails.email || 'Email not available'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">🌐 Website</p>
                          {shopDetails.shop?.website || shopDetails.website ? (
                            <a 
                              href={shopDetails.shop?.website || shopDetails.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Visit Website
                            </a>
                          ) : (
                            <span className="text-gray-500">Website not available</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Google Maps Location */}
                      {(() => {
                        // Get location data from shopDetails.shop (API response) or fallback
                        const shopData = shopDetails?.shop || shopDetails || {};
                        
                        const googleMapsUrl = shopData?.google_maps_url;
                        let lat = shopData?.latitude;
                        let lng = shopData?.longitude;
                        
                        // Convert string numbers to actual numbers if needed
                        if (lat != null && typeof lat === 'string' && lat.trim() !== '') {
                          const parsed = parseFloat(lat.trim());
                          lat = !isNaN(parsed) ? parsed : null;
                        }
                        if (lng != null && typeof lng === 'string' && lng.trim() !== '') {
                          const parsed = parseFloat(lng.trim());
                          lng = !isNaN(parsed) ? parsed : null;
                        }
                        
                        // Check if we have valid location data
                        const hasMapsUrl = googleMapsUrl && typeof googleMapsUrl === 'string' && googleMapsUrl.trim() !== '' && !googleMapsUrl.includes('null');
                        const hasCoords = lat != null && lng != null && typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
                        
                        // Only show if we have location data
                        if (!hasMapsUrl && !hasCoords) {
                          return null;
                        }
                        
                        // Build maps URL - prefer google_maps_url, fallback to coordinates
                        const mapsUrl = hasMapsUrl 
                          ? googleMapsUrl.trim()
                          : `https://www.google.com/maps?q=${lat},${lng}`;
                        
                        return (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-600 mb-2">🗺️ Location</p>
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                            >
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Open in Google Maps
                            </a>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Services */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Services</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900 mb-2">{shopDetails.shop?.shop_type || shopDetails.shop_type}</p>
                        {shopDetails.shop?.specialization_services && (
                          <div>
                            <p className="text-sm text-gray-600 mb-2">Specializations:</p>
                            <p className="text-gray-900">{shopDetails.shop.specialization_services}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Products Table */}
                    {shopDetails.products && shopDetails.products.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Products</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {shopDetails.products.map((product: any, index: number) => (
                                <tr key={`${product.product_id || 'product'}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-4 py-3 text-sm text-gray-900">{product.brand || 'N/A'}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{product.model || 'N/A'}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{product.category || 'N/A'}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">LKR {product.price_lkr?.toLocaleString() || 'N/A'}</td>
                                  <td className="px-4 py-3 text-sm">
                                    {product.stock_status && 
                                     !(product.stock_status || '').toLowerCase().includes('out') && (
                                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        product.stock_status === 'in_stock' 
                                          ? 'bg-green-100 text-green-800'
                                          : product.stock_status === 'low_stock'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {product.stock_status?.replace('_', ' ') || 'unknown'}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Recent Feedback */}
                    {shopDetails.feedback && shopDetails.feedback.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Feedback</h3>
                        <div className="space-y-3">
                          {shopDetails.feedback.map((feedback: any, index: number) => (
                            <div key={feedback.feedback_id || index} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    feedback.solved 
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {feedback.solved ? '✅ Solved' : '❌ Not Solved'}
                                  </span>
                                  <span className="text-sm text-gray-600">{feedback.error_type || 'N/A'}</span>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-yellow-400">⭐</span>
                                  <span className="ml-1 text-sm text-gray-600">{feedback.rating || 0}/5</span>
                                </div>
                              </div>
                              {feedback.comment && (
                                <p className="text-sm text-gray-700 mb-2">"{feedback.comment}"</p>
                              )}
                              {feedback.date && (
                                <p className="text-xs text-gray-500">
                                  {new Date(feedback.date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Product Details Modal */}
        {selectedItem && modalType === 'product' && (
          <ProductDetailsModal
            product={selectedItem}
            productDetails={productDetails}
            loading={productDetailsLoading}
            error={productDetailsError}
            onClose={closeModal}
          />
        )}

        {/* Compare Shops Modal */}
        {showCompareModal && (
          <CompareShopsModal
            shops={shops.filter(shop => compareShops.includes(shop.shop_id))}
            onClose={() => {
              setShowCompareModal(false);
              setCompareShops([]);
            }}
          />
        )}

      </div>
    </div>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
