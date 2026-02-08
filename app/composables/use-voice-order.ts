// composables/use-voice-order.ts
// 🎤 Voice Order Entry - Web Speech API Integration
// Offline-first voice recognition for POS orders

import { ref, computed, onUnmounted } from "vue";
import type {
  VoiceRecognitionState,
  VoiceCommand,
  VoiceError,
  VoiceSettings,
  VoiceOrderPreview,
} from "~/types/voice";
import { parseVoiceCommand } from "~/utils/orderParser";

// Declare Web Speech API types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: any) => any) | null;
  onresult: ((this: SpeechRecognition, ev: any) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export const useVoiceOrder = () => {
  const productsStore = useProducts();
  const posStore = usePOS();

  // Voice recognition state
  const state = ref<VoiceRecognitionState>({
    isListening: false,
    isProcessing: false,
    isSupported: false,
    hasPermission: false,
    transcript: "",
    interimTranscript: "",
    confidence: 0,
    error: null,
    retryCount: 0,
    audioLevel: 0,
  });

  // Settings (can be loaded from user preferences)
  const settings = ref<VoiceSettings>({
    enabled: true,
    aiEnhancement: false,
    showTranscript: true,
    autoConfirm: false,
    soundEffects: true,
    language: "en-US",
    minConfidence: 0.6,
    autoConfirmThreshold: 0.9,
    aiThreshold: 0.5,
    silenceTimeout: 3000,
    maxDuration: 30000,
  });

  // Current command being processed
  const currentCommand = ref<VoiceCommand | null>(null);
  const currentPreview = ref<VoiceOrderPreview | null>(null);

  // Speech recognition instance
  let recognition: SpeechRecognition | null = null;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let maxDurationTimer: ReturnType<typeof setTimeout> | null = null;

  // Check browser support
  const checkSupport = (): boolean => {
    if (typeof window === "undefined") return false;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    state.value.isSupported = !!SpeechRecognitionAPI;
    return state.value.isSupported;
  };

  // Initialize speech recognition
  const initRecognition = () => {
    if (!checkSupport()) {
      const error: VoiceError = {
        type: "not-supported",
        message: "Speech recognition is not supported in this browser",
        canRetry: false,
        timestamp: new Date().toISOString(),
      };
      state.value.error = error;
      return false;
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return false;

    recognition = new SpeechRecognitionAPI();
    recognition.continuous = true; // Keep listening
    recognition.interimResults = true; // Get partial results
    recognition.lang = settings.value.language;
    recognition.maxAlternatives = 3; // Get alternatives

    // Event handlers
    recognition.onstart = handleStart;
    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd;
    recognition.onspeechstart = handleSpeechStart;
    recognition.onspeechend = handleSpeechEnd;

    return true;
  };

  // Update recognition language when settings change
  const updateLanguage = (newLang: "en-US" | "lo-LA" | "th-TH") => {
    settings.value.language = newLang;
    if (recognition) {
      recognition.lang = newLang;
    }
  };

  // Start listening
  const startListening = async (): Promise<boolean> => {
    try {
      // Initialize if needed
      if (!recognition) {
        const initialized = initRecognition();
        if (!initialized) return false;
      }

      // Reset state
      state.value.transcript = "";
      state.value.interimTranscript = "";
      state.value.error = null;
      state.value.confidence = 0;
      state.value.isProcessing = false;

      // Start recognition
      recognition?.start();

      // Set max duration timeout
      maxDurationTimer = setTimeout(() => {
        stopListening();
      }, settings.value.maxDuration);

      return true;
    } catch (err: any) {
      const error: VoiceError = {
        type: "audio-capture",
        message: err.message || "Failed to start voice recognition",
        canRetry: true,
        timestamp: new Date().toISOString(),
      };
      state.value.error = error;
      return false;
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognition && state.value.isListening) {
      recognition.stop();
    }

    clearTimers();
  };

  // Abort recognition
  const abort = () => {
    if (recognition) {
      recognition.abort();
    }
    state.value.isListening = false;
    clearTimers();
  };

  // Clear timers
  const clearTimers = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    if (maxDurationTimer) {
      clearTimeout(maxDurationTimer);
      maxDurationTimer = null;
    }
  };

  // Handle recognition start
  const handleStart = () => {
    state.value.isListening = true;
    state.value.startedAt = new Date().toISOString();
  };

  // Handle speech start (user started speaking)
  const handleSpeechStart = () => {
    // Clear silence timer when user starts speaking
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  // Handle speech end (user stopped speaking)
  const handleSpeechEnd = () => {
    // Start silence timer
    silenceTimer = setTimeout(() => {
      stopListening();
    }, settings.value.silenceTimeout);
  };

  // Handle recognition result
  const handleResult = (event: any) => {
    let interimTranscript = "";
    let finalTranscript = "";

    // Process results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        finalTranscript += transcript + " ";
        state.value.confidence = result[0].confidence || 0;
      } else {
        interimTranscript += transcript;
      }
    }

    // Update state
    if (finalTranscript) {
      state.value.transcript = (
        state.value.transcript + finalTranscript
      ).trim();
    }
    state.value.interimTranscript = interimTranscript;
    state.value.lastUpdateAt = new Date().toISOString();
  };

  // Handle recognition error
  const handleError = (event: any) => {
    let errorType: VoiceError["type"] = "unknown";
    let message = "An error occurred";
    let canRetry = true;

    switch (event.error) {
      case "no-speech":
        errorType = "no-speech";
        message = "No speech detected. Please try again.";
        break;
      case "aborted":
        errorType = "aborted";
        message = "Voice input cancelled";
        canRetry = false;
        break;
      case "audio-capture":
        errorType = "audio-capture";
        message = "Microphone not accessible";
        break;
      case "not-allowed":
        errorType = "not-allowed";
        message = "Microphone permission denied";
        break;
      case "network":
        errorType = "network";
        message = "Network error occurred";
        break;
      default:
        message = event.error || "Unknown error";
    }

    const error: VoiceError = {
      type: errorType,
      message,
      details: event.error,
      canRetry,
      timestamp: new Date().toISOString(),
    };

    state.value.error = error;
    state.value.isListening = false;
  };

  // Handle recognition end
  const handleEnd = () => {
    state.value.isListening = false;
    clearTimers();

    // If we have a transcript, process it
    if (state.value.transcript) {
      processTranscript();
    }
  };

  // Process transcript into command
  const processTranscript = async () => {
    if (!state.value.transcript) return;

    state.value.isProcessing = true;

    try {
      // Initialize products if needed
      if (!productsStore.isInitialized.value) {
        await productsStore.init();
      }

      // Parse command using pattern matching
      const products = productsStore.products.value;
      const language = settings.value.language;
      const command = parseVoiceCommand(
        state.value.transcript,
        products,
        language,
      );

      currentCommand.value = command;

      // Check if we should use AI fallback
      if (
        settings.value.aiEnhancement &&
        command.confidence < settings.value.aiThreshold
      ) {
        // TODO: Implement AI fallback
        command.processedBy = "hybrid";
      }

      // Generate preview
      if (command.items && command.items.length > 0) {
        currentPreview.value = generatePreview(command);
      }

      // Auto-confirm if confidence is high
      if (
        settings.value.autoConfirm &&
        command.confidence >= settings.value.autoConfirmThreshold &&
        currentPreview.value?.isValid
      ) {
        await applyCommand(command);
      }
    } catch (err: any) {
      const error: VoiceError = {
        type: "parser-error",
        message: "Failed to parse voice command",
        details: err.message,
        canRetry: true,
        timestamp: new Date().toISOString(),
      };
      state.value.error = error;
    } finally {
      state.value.isProcessing = false;
    }
  };

  // Generate order preview
  const generatePreview = (command: VoiceCommand): VoiceOrderPreview => {
    const items = (command.items || []).map((item) => {
      const price = item.product?.price || 0;
      const subtotal = price * item.quantity;

      let formattedName = item.productQuery;
      if (item.product) {
        formattedName = item.product.name;
        if (item.modifiers?.size) {
          formattedName += ` (${item.modifiers.size})`;
        }
        if (item.modifiers?.temperature) {
          formattedName += ` - ${item.modifiers.temperature}`;
        }
      }

      const issues: string[] = [];
      if (!item.product) {
        issues.push("Product not found");
      } else if (item.confidence < 0.6) {
        issues.push("Low confidence match");
      }

      return {
        item,
        subtotal,
        formattedName,
        issues: issues.length > 0 ? issues : undefined,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
    const itemCount = items.reduce((sum, i) => sum + i.item.quantity, 0);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation
    items.forEach((item) => {
      if (!item.item.product) {
        errors.push(`Product "${item.item.productQuery}" not found`);
      } else if (item.item.confidence < settings.value.minConfidence) {
        warnings.push(
          `Low confidence for "${item.formattedName}" (${Math.round(item.item.confidence * 100)}%)`,
        );
      }
    });

    const isValid = errors.length === 0 && items.length > 0;
    const overallConfidence =
      items.length > 0
        ? items.reduce((sum, i) => sum + i.item.confidence, 0) / items.length
        : 0;

    return {
      command,
      items,
      itemCount,
      subtotal,
      total: subtotal, // Can add tax/tips later
      currency: "LAK",
      isValid,
      warnings,
      errors,
      overallConfidence,
      needsReview: overallConfidence < settings.value.autoConfirmThreshold,
    };
  };

  // Apply command to cart
  const applyCommand = async (command: VoiceCommand) => {
    if (!command.items || command.items.length === 0) return;

    for (const item of command.items) {
      if (item.product) {
        posStore.addToCart(item.product, item.quantity, {
          notes: item.notes,
        });
      }
    }

    // Apply other command properties
    if (command.orderType) {
      posStore.setOrderType(command.orderType, {
        tableNumber: command.tableNumber,
        deliveryAddress: command.deliveryAddress,
        customerPhone: command.customerPhone,
        scheduledTime: command.scheduledTime,
      });
    }

    if (command.customerName) {
      posStore.setCustomer({
        name: command.customerName,
        phone: command.customerPhone,
      });
    }

    // Reset state
    reset();
  };

  // Retry after error
  const retry = () => {
    state.value.retryCount++;
    state.value.error = null;
    startListening();
  };

  // Reset state
  const reset = () => {
    state.value.transcript = "";
    state.value.interimTranscript = "";
    state.value.confidence = 0;
    state.value.error = null;
    state.value.retryCount = 0;
    currentCommand.value = null;
    currentPreview.value = null;
  };

  // Computed properties
  const isActive = computed(
    () => state.value.isListening || state.value.isProcessing,
  );

  const hasError = computed(() => state.value.error !== null);

  const canRetry = computed(() => state.value.error?.canRetry || false);

  const displayText = computed(() => {
    if (state.value.interimTranscript) {
      return state.value.transcript + " " + state.value.interimTranscript;
    }
    return state.value.transcript;
  });

  // Cleanup on unmount
  onUnmounted(() => {
    abort();
    recognition = null;
  });

  // Initialize on creation
  checkSupport();

  return {
    // State
    state,
    settings,
    currentCommand,
    currentPreview,

    // Computed
    isActive,
    hasError,
    canRetry,
    displayText,

    // Methods
    startListening,
    stopListening,
    abort,
    retry,
    reset,
    applyCommand,
    processTranscript,
    updateLanguage,
  };
};
