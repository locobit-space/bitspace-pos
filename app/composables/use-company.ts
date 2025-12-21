// ============================================
// 🏪 COMPANY CODE COMPOSABLE
// Enables cross-device staff login via simple 6-digit code
// ============================================

import { ref, computed } from "vue";

// Storage keys
const STORAGE_KEYS = {
  COMPANY_CODE: "bitspace_company_code",
  COMPANY_CODE_HASH: "bitspace_company_code_hash",
  COMPANY_OWNER_PUBKEY: "bitspace_company_owner_pubkey",
} as const;

// Singleton state
const companyCode = ref<string | null>(null);
const companyCodeHash = ref<string | null>(null);
const ownerPubkey = ref<string | null>(null);
const isInitialized = ref(false);

export function useCompany() {
  // ============================================
  // 🔢 CODE GENERATION
  // ============================================

  /**
   * Generate a new 6-digit company code
   */
  function generateCompanyCode(): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  }

  /**
   * Simple fallback hash for insecure contexts (non-HTTPS)
   * Uses djb2 algorithm - not cryptographically secure but works for basic hashing
   */
  function fallbackHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return Math.abs(hash).toString(16).padStart(16, "0").slice(0, 16);
  }

  /**
   * Hash the company code for use in event tags
   * This allows querying without exposing the actual code
   */
  async function hashCompanyCode(code: string): Promise<string> {
    const input = `bitspace:company:${code}`;

    // Check if crypto.subtle is available (only in secure contexts)
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return hashHex.slice(0, 16); // Use first 16 chars for shorter tag
    }

    // Fallback for insecure contexts (e.g., HTTP on local network)
    console.warn("[Company] crypto.subtle not available, using fallback hash");
    return fallbackHash(input);
  }

  /**
   * Derive an encryption key from the company code
   * Used for encrypting/decrypting user data
   */
  async function deriveKeyFromCode(code: string): Promise<CryptoKey | null> {
    // Check if crypto.subtle is available
    if (typeof crypto === "undefined" || !crypto.subtle) {
      console.warn(
        "[Company] crypto.subtle not available - encryption disabled"
      );
      return null;
    }

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(code),
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    // Use a fixed salt (since all devices need same key from same code)
    const salt = encoder.encode("bitspace-pos-company-v1");

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  // ============================================
  // 🔐 ENCRYPTION/DECRYPTION
  // ============================================

  /**
   * Encrypt data using company code
   */
  async function encryptWithCode<T>(
    data: T,
    code: string
  ): Promise<string | null> {
    const key = await deriveKeyFromCode(code);
    if (!key) {
      console.warn(
        "[Company] Encryption unavailable - crypto.subtle not available"
      );
      return null;
    }

    const encoder = new TextEncoder();
    const plaintext = JSON.stringify(data);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(plaintext)
    );

    // Combine IV + ciphertext and encode as base64
    const combined = new Uint8Array(
      iv.length + new Uint8Array(ciphertext).length
    );
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt data using company code
   */
  async function decryptWithCode<T>(
    encrypted: string,
    code: string
  ): Promise<T | null> {
    try {
      const key = await deriveKeyFromCode(code);
      if (!key) {
        console.warn(
          "[Company] Decryption unavailable - crypto.subtle not available"
        );
        return null;
      }

      const decoder = new TextDecoder();

      // Decode base64
      const combined = new Uint8Array(
        atob(encrypted)
          .split("")
          .map((c) => c.charCodeAt(0))
      );

      // Extract IV and ciphertext
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
      );

      return JSON.parse(decoder.decode(plaintext)) as T;
    } catch (error) {
      console.error("[Company] Decryption failed:", error);
      return null;
    }
  }

  // ============================================
  // 💾 STORAGE
  // ============================================

  /**
   * Set and save the company code
   */
  async function setCompanyCode(code: string, pubkey?: string): Promise<void> {
    companyCode.value = code;
    companyCodeHash.value = await hashCompanyCode(code);
    if (pubkey) {
      ownerPubkey.value = pubkey;
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.COMPANY_CODE, code);
    localStorage.setItem(STORAGE_KEYS.COMPANY_CODE_HASH, companyCodeHash.value);
    if (pubkey) {
      localStorage.setItem(STORAGE_KEYS.COMPANY_OWNER_PUBKEY, pubkey);
    }

    console.log(
      "[Company] Set company code:",
      code,
      "Hash:",
      companyCodeHash.value?.slice(0, 8)
    );
  }

  /**
   * Load company code from storage
   */
  function loadCompanyCode(): void {
    if (!import.meta.client) return;

    const storedCode = localStorage.getItem(STORAGE_KEYS.COMPANY_CODE);
    const storedHash = localStorage.getItem(STORAGE_KEYS.COMPANY_CODE_HASH);
    const storedPubkey = localStorage.getItem(
      STORAGE_KEYS.COMPANY_OWNER_PUBKEY
    );

    if (storedCode) companyCode.value = storedCode;
    if (storedHash) companyCodeHash.value = storedHash;
    if (storedPubkey) ownerPubkey.value = storedPubkey;

    isInitialized.value = true;
  }

  /**
   * Clear company code (for logout/reset)
   */
  function clearCompanyCode(): void {
    companyCode.value = null;
    companyCodeHash.value = null;
    ownerPubkey.value = null;

    localStorage.removeItem(STORAGE_KEYS.COMPANY_CODE);
    localStorage.removeItem(STORAGE_KEYS.COMPANY_CODE_HASH);
    localStorage.removeItem(STORAGE_KEYS.COMPANY_OWNER_PUBKEY);
  }

  /**
   * Check if a code is valid (matches stored hash)
   */
  async function validateCode(code: string): Promise<boolean> {
    if (!companyCodeHash.value) return false;
    const inputHash = await hashCompanyCode(code);
    return inputHash === companyCodeHash.value;
  }

  // ============================================
  // 🏪 COMPANY SETUP
  // ============================================

  /**
   * Initialize company for owner (generates new code if needed)
   */
  async function initializeCompany(ownerPubkeyHex: string): Promise<string> {
    // Check if already have a code
    if (companyCode.value) {
      return companyCode.value;
    }

    // Generate new code
    const newCode = generateCompanyCode();
    await setCompanyCode(newCode, ownerPubkeyHex);

    console.log("[Company] Initialized company with code:", newCode);
    return newCode;
  }

  // Auto-initialize
  if (typeof window !== "undefined") {
    loadCompanyCode();
  }

  return {
    // State
    companyCode: computed(() => companyCode.value),
    companyCodeHash: computed(() => companyCodeHash.value),
    ownerPubkey: computed(() => ownerPubkey.value),
    hasCompanyCode: computed(() => !!companyCode.value),
    isInitialized: computed(() => isInitialized.value),

    // Code management
    generateCompanyCode,
    hashCompanyCode,
    setCompanyCode,
    loadCompanyCode,
    clearCompanyCode,
    validateCode,
    initializeCompany,

    // Encryption
    deriveKeyFromCode,
    encryptWithCode,
    decryptWithCode,
  };
}
