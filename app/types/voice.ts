// ============================================
// 🎤 VOICE ORDER ENTRY TYPES
// AI-Powered Voice-to-Order System
// ============================================

import type { OrderType, Product } from "./index";

/**
 * Supported voice recognition languages
 */
export type VoiceLanguage = "en-US" | "lo-LA" | "th-TH";

/**
 * Voice command action types
 */
export type VoiceAction =
  | "add" // Add items to cart
  | "remove" // Remove items from cart
  | "modify" // Modify existing items
  | "clear" // Clear cart
  | "set_customer" // Set customer information
  | "set_order_type" // Set order type (dine-in, takeout, etc.)
  | "set_table" // Set table number
  | "confirm" // Confirm order
  | "cancel" // Cancel voice input
  | "help" // Request help
  | "unknown"; // Unable to determine action

/**
 * Product size modifiers
 */
export type VoiceSize = "small" | "medium" | "large" | "extra-large";

/**
 * Temperature modifiers
 */
export type VoiceTemperature = "hot" | "iced" | "cold" | "warm";

/**
 * Parsed order item from voice input
 */
export interface ParsedOrderItem {
  // Product identification
  productQuery: string; // What the user said
  productId?: string; // Matched product ID (undefined if not found)
  product?: Product; // Matched product object
  confidence: number; // 0-1 confidence score

  // Quantity
  quantity: number;

  // Modifiers
  modifiers?: {
    size?: VoiceSize;
    temperature?: VoiceTemperature;
    custom?: string; // Free-form modifiers like "extra sugar"
  };

  // Special instructions
  notes?: string;

  // Alternative matches (for disambiguation)
  alternatives?: Array<{
    productId: string;
    product: Product;
    confidence: number;
  }>;
}

/**
 * Complete voice command structure
 */
export interface VoiceCommand {
  // Action to perform
  action: VoiceAction;

  // Items to add/remove/modify
  items?: ParsedOrderItem[];

  // Customer information
  customerName?: string;
  customerPhone?: string;
  customerId?: string;

  // Order details
  orderType?: OrderType;
  tableNumber?: string;
  deliveryAddress?: string;
  scheduledTime?: string;

  // Special notes
  notes?: string;

  // Metadata
  confidence: number; // Overall confidence 0-1
  rawTranscript: string; // Original speech text
  language: VoiceLanguage; // Detected language
  timestamp: string; // When parsed

  // AI assistance
  processedBy: "pattern" | "ai" | "hybrid"; // How this was parsed
  aiReasoning?: string; // If AI was used, why
}

/**
 * Voice recognition state
 */
export interface VoiceRecognitionState {
  // Status
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  hasPermission: boolean;

  // Transcription
  transcript: string; // Final transcript
  interimTranscript: string; // Real-time partial transcript
  confidence: number; // Speech recognition confidence

  // Error handling
  error: VoiceError | null;
  retryCount: number;

  // Audio level (for visualization)
  audioLevel: number; // 0-100

  // Metadata
  startedAt?: string;
  lastUpdateAt?: string;
}

/**
 * Voice error types
 */
export type VoiceErrorType =
  | "not-supported" // Browser doesn't support Web Speech API
  | "no-speech" // No speech detected
  | "aborted" // User cancelled
  | "audio-capture" // Microphone access denied
  | "network" // Network error (for AI fallback)
  | "not-allowed" // Permission denied
  | "service-not-allowed" // Service not available
  | "bad-grammar" // Recognition error
  | "language-not-supported" // Language not supported
  | "timeout" // Recognition timeout
  | "parser-error" // Failed to parse command
  | "product-not-found" // No products matched
  | "ambiguous" // Multiple matches, need clarification
  | "unknown"; // Unknown error

/**
 * Voice error with details
 */
export interface VoiceError {
  type: VoiceErrorType;
  message: string;
  details?: string;
  canRetry: boolean;
  timestamp: string;
}

/**
 * Voice settings configuration
 */
export interface VoiceSettings {
  // Feature flags
  enabled: boolean;
  aiEnhancement: boolean; // Use AI for complex orders
  showTranscript: boolean; // Show real-time transcript
  autoConfirm: boolean; // Auto-confirm high-confidence orders
  soundEffects: boolean; // Play beep/success sounds

  // Language
  language: VoiceLanguage | "auto"; // Speech recognition language

  // Confidence thresholds
  minConfidence: number; // Minimum confidence to accept (0-1)
  autoConfirmThreshold: number; // Auto-confirm if above this (0-1)
  aiThreshold: number; // Use AI if below this (0-1)

  // Timeouts (milliseconds)
  silenceTimeout: number; // Stop listening after silence
  maxDuration: number; // Maximum recording duration

  // AI settings (if enabled)
  aiProvider?: "openai" | "claude" | "local"; // AI provider
  aiModel?: string; // Model name (e.g., "gpt-4-turbo")
  aiApiKey?: string; // API key (encrypted in storage)
}

/**
 * Voice command pattern for matching
 */
export interface VoicePattern {
  // Pattern identification
  id: string;
  action: VoiceAction;

  // Pattern matching
  patterns: string[]; // Regex or text patterns
  language: VoiceLanguage | "all";

  // Examples
  examples: string[];

  // Priority (higher = matched first)
  priority: number;

  // Extraction rules
  extractQuantity?: boolean;
  extractProduct?: boolean;
  extractModifiers?: boolean;
  extractCustomer?: boolean;
}

/**
 * Voice analytics event
 */
export interface VoiceAnalytics {
  // Event identification
  id: string;
  eventType:
    | "voice-started"
    | "voice-stopped"
    | "command-parsed"
    | "command-applied"
    | "error"
    | "retry";

  // Command details
  command?: VoiceCommand;
  error?: VoiceError;

  // Performance metrics
  duration?: number; // milliseconds
  processingTime?: number; // milliseconds
  confidence?: number;

  // Context
  language?: string;
  wasSuccessful: boolean;
  retryCount?: number;

  // Metadata
  timestamp: string;
  sessionId?: string;
}

/**
 * Voice order preview for confirmation
 */
export interface VoiceOrderPreview {
  // Command being previewed
  command: VoiceCommand;

  // Matched products with details
  items: Array<{
    item: ParsedOrderItem;
    subtotal: number;
    formattedName: string;
    issues?: string[]; // Warnings like "Low stock", "Not found"
  }>;

  // Order summary
  itemCount: number;
  subtotal: number;
  total: number;
  currency: string;

  // Validation
  isValid: boolean;
  warnings: string[];
  errors: string[];

  // Confidence indicators
  overallConfidence: number;
  needsReview: boolean; // True if confidence is low
}

/**
 * Voice command history
 */
export interface VoiceCommandHistory {
  id: string;
  command: VoiceCommand;
  preview: VoiceOrderPreview;
  appliedToCart: boolean;
  timestamp: string;
  duration: number; // milliseconds
}

/**
 * Voice session for tracking multiple commands
 */
export interface VoiceSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  commands: VoiceCommandHistory[];
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageConfidence: number;
  totalDuration: number; // milliseconds
}
