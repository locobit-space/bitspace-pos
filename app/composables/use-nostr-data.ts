// ============================================
// 📡 NOSTR DATA LAYER - ENCRYPTED STORAGE
// Syncs POS data to Nostr relays with NIP-04/44 encryption
// Uses centralized useEncryption module for all crypto operations
// ============================================
import { nip19, nip44 } from "nostr-tools";
import { finalizeEvent, type UnsignedEvent, type Event } from "nostr-tools";
import type {
  Product,
  Category,
  Unit,
  Order,
  LoyaltyMember,
  Branch,
  StoreSettings,
  StoreUser,
  UserPermissions,
} from "~/types";

// Import centralized NOSTR_KINDS
import { NOSTR_KINDS } from "~/types/nostr-kinds";

// ============================================
// 🔧 UTILITY FUNCTIONS
// ============================================

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// ============================================
// 🔑 ENCRYPTION HELPERS
// ============================================

// Encryption payload structure for versioned encryption
interface _EncryptedPayload {
  v: number; // Version (1 = NIP-04, 2 = NIP-44, 3 = AES-256-GCM)
  ct: string; // Ciphertext
  iv?: string; // IV for NIP-04
}

export function useNostrData() {
  const relay = useNostrRelay();
  const encryption = useEncryption();
  // useSecurity() - for future encrypted local storage
  // useNuxtApp().$nostr - for direct nostr access

  // State
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const syncStatus = ref<"idle" | "syncing" | "synced" | "error">("idle");
  const lastSyncAt = ref<string | null>(null);

  // Get current user's keys (pubkey required, privkey optional for NIP-07 users)
  const getUserKeys = (): { pubkey: string; privkey: string | null } | null => {
    if (!import.meta.client) return null;

    // Helper to normalize private key to hex format
    const normalizePrivkey = (
      key: string | null | undefined,
    ): string | null => {
      if (!key) return null;

      // If already hex (64 chars), return as-is
      if (/^[0-9a-f]{64}$/i.test(key)) {
        return key.toLowerCase();
      }

      // If nsec format, decode to hex
      if (key.startsWith("nsec1")) {
        try {
          const { data } = nip19.decode(key);
          return data as string;
        } catch (e) {
          console.error("[NostrData] Failed to decode nsec:", e);
          return null;
        }
      }

      return null;
    };

    // 1. Try nostrUser localStorage (users who logged in with nsec)
    const stored = localStorage.getItem("nostrUser");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        const pubkey = user.pubkey || user.publicKey || user.npub;
        const privkeyRaw = user.privateKey || user.privkey || user.nsec;
        const privkey = normalizePrivkey(privkeyRaw);
        if (pubkey) {
          return { pubkey, privkey };
        }
      } catch (e) {
        console.error("[NostrData] Failed to parse nostrUser:", e);
        // Continue to fallback
      }
    }

    // 2. Try nostr-pubkey cookie (for NIP-07 extension users)
    const nostrCookie = useCookie("nostr-pubkey");
    if (nostrCookie.value) {
      return { pubkey: nostrCookie.value, privkey: null };
    }

    // 3. Try auth state (bitspace_current_user)
    const authState = localStorage.getItem("bitspace_current_user");
    if (authState) {
      try {
        const state = JSON.parse(authState);
        const pubkey = state.user?.nostrPubkey;
        if (pubkey) {
          return { pubkey, privkey: null };
        }
      } catch {
        // Continue
      }
    }

    // 4. Try nostr_user_profile
    const profile = localStorage.getItem("nostr_user_profile");
    if (profile) {
      try {
        const parsed = JSON.parse(profile);
        if (parsed.pubkey) {
          return { pubkey: parsed.pubkey, privkey: null };
        }
      } catch {
        // Fall through
      }
    }

    return null;
  };

  // ============================================
  // 🔐 ENCRYPTION/DECRYPTION (Using centralized module)
  // ============================================

  /**
   * Encrypt data for Nostr storage (self-encryption using own keys)
   * Uses the centralized encryption module with NIP-44 preferred
   * For NIP-07 users (no privkey), falls back to NIP-07 extension or local AES
   * NEW: Also supports company code encryption (v4) for cross-device sync
   */
  async function encryptData(data: unknown): Promise<string> {
    const keys = getUserKeys();
    const company = useCompany();

    // PRIORITY 1: Use company code encryption if available (v4)
    // This allows any device with the company code to decrypt
    // BUT only if the feature is explicitly enabled
    if (company.isCompanyCodeEnabled.value && company.companyCode.value) {
      try {
        const encrypted = await company.encryptWithCode(
          data,
          company.companyCode.value,
        );
        return JSON.stringify({ v: 4, cc: encrypted }); // v4 = company code encryption
      } catch (e) {
        console.warn("[NostrData] Company code encrypt failed:", e);
        // Fall through to other methods
      }
    }

    // No keys at all - use local AES encryption
    if (!keys) {
      const result = await encryption.encrypt(data, {
        algorithm: "aes-256-gcm",
      });
      if (result.success && result.data) {
        return JSON.stringify({ v: 3, ...result.data }); // v3 = local AES
      }
      return JSON.stringify(data);
    }

    // If we have privkey, use direct Nostr encryption
    if (keys.privkey) {
      // Try NIP-44 first (more secure)
      try {
        const result = await encryption.encrypt(data, {
          algorithm: "nip-44",
          nostrPrivkey: keys.privkey,
          nostrPubkey: keys.pubkey,
        });

        if (result.success && result.data) {
          return JSON.stringify({ v: 2, ct: result.data.ciphertext });
        }
      } catch {
        // Fall through to NIP-04
      }

      // Fallback to NIP-04
      try {
        const result = await encryption.encrypt(data, {
          algorithm: "nip-04",
          nostrPrivkey: keys.privkey,
          nostrPubkey: keys.pubkey,
        });

        if (result.success && result.data) {
          return JSON.stringify({ v: 1, ct: result.data.ciphertext });
        }
      } catch {
        // Last resort: plain JSON
      }
    }

    // NIP-07 users (have pubkey but no privkey) - try NIP-07 extension's encrypt
    if (keys.pubkey && !keys.privkey && import.meta.client) {
      const win = window as unknown as {
        nostr?: {
          nip04?: {
            encrypt: (pubkey: string, plaintext: string) => Promise<string>;
          };
        };
      };
      if (win.nostr?.nip04?.encrypt) {
        try {
          const plaintext = JSON.stringify(data);
          const ciphertext = await win.nostr.nip04.encrypt(
            keys.pubkey,
            plaintext,
          );
          return JSON.stringify({ v: 1, ct: ciphertext }); // v1 = NIP-04 from extension
        } catch (e) {
          console.warn("[NostrData] NIP-07 encrypt failed:", e);
          // Fall through to unencrypted
        }
      }
    }

    // Fallback: store unencrypted (will be readable by everyone who knows the d-tag)
    return JSON.stringify(data);
  }

  /**
   * Decrypt data from Nostr storage
   * Supports all encryption versions:
   * - v1=NIP-04, v2=NIP-44, v3=AES-256-GCM, v4=Company Code
   * For NIP-07 users, uses the extension's decrypt method
   */
  async function decryptData<T>(encrypted: string): Promise<T | null> {
    const keys = getUserKeys();
    const company = useCompany();

    try {
      const payload = JSON.parse(encrypted);

      // Detect bdgo-os AES-256-GCM encryption envelope
      // bdgo-os produces: {v:1, encrypted:true, scheme:"bdgoos.local-company-key.v1", alg:"AES-256-GCM", ciphertext:"...", nonce:"...", aad:{...}}
      // This is NOT bnos-space's v1 (NIP-04) — it's a completely different format
      const isBdgoOsEnvelope =
        payload.encrypted === true &&
        payload.scheme === "bdgoos.local-company-key.v1" &&
        payload.ciphertext;

      if (isBdgoOsEnvelope) {
        console.log(
          "[NostrData] 🔒 Detected bdgo-os AES-256-GCM encrypted envelope",
          "kid:",
          payload.kid,
          "domain:",
          payload.domain,
        );

        // 1. Try stored bdgo-os AES key (imported from COMPANY_KEY_GRANT events)
        const rawKey = readBdgoOsKey(payload.kid);
        if (rawKey) {
          try {
            const aesKey = await crypto.subtle.importKey(
              "raw",
              rawKey as BufferSource,
              { name: "AES-GCM" },
              false,
              ["decrypt"],
            );

            const nonceBytes = fromBase64Url(payload.nonce);
            const ciphertextBytes = fromBase64Url(payload.ciphertext);
            const aadBytes = new TextEncoder().encode(
              JSON.stringify(payload.aad),
            );

            const decrypted = await crypto.subtle.decrypt(
              { name: "AES-GCM", iv: nonceBytes, additionalData: aadBytes },
              aesKey,
              ciphertextBytes,
            );

            const plaintext = new TextDecoder().decode(decrypted);
            console.log(
              "[NostrData] ✅ bdgo-os envelope decrypted with imported AES key!",
            );
            return JSON.parse(plaintext) as T;
          } catch (e) {
            console.warn(
              "[NostrData] ❌ Imported AES key decryption failed for bdgo-os envelope:",
              e,
            );
          }
        }

        // 2. Try company code SHA-256 derivation (fallback, may not match bdgo-os random key)
        if (company.companyCode.value) {
          try {
            console.log(
              "[NostrData] 🔑 Attempting company code decryption for bdgo-os envelope...",
            );
            const keyMaterial = new TextEncoder().encode(
              `bitspace:company:${company.companyCode.value}`,
            );
            const hashBuffer = await crypto.subtle.digest(
              "SHA-256",
              keyMaterial,
            );
            const aesKey = await crypto.subtle.importKey(
              "raw",
              hashBuffer as BufferSource,
              { name: "AES-GCM" },
              false,
              ["decrypt"],
            );

            const nonceBytes = fromBase64Url(payload.nonce);
            const ciphertextBytes = fromBase64Url(payload.ciphertext);

            const decrypted = await crypto.subtle.decrypt(
              { name: "AES-GCM", iv: nonceBytes },
              aesKey,
              ciphertextBytes,
            );

            const plaintext = new TextDecoder().decode(decrypted);
            console.log(
              "[NostrData] ✅ bdgo-os envelope decrypted with company code!",
            );
            return JSON.parse(plaintext) as T;
          } catch (e) {
            console.warn(
              "[NostrData] ❌ Company code decryption failed for bdgo-os envelope:",
              e,
            );
          }
        } else {
          console.warn(
            "[NostrData] ❌ No bdgo-os AES key or company code available to decrypt envelope",
          );
        }

        return null;
      }

      // Version 4: Company Code Encryption (cross-device sync)
      if (payload.v === 4 && payload.cc && company.companyCode.value) {
        try {
          const decrypted = await company.decryptWithCode<T>(
            payload.cc,
            company.companyCode.value,
          );
          console.log("[NostrData] ✅ Decrypted v4 company-code payload");
          return decrypted;
        } catch {
          // Expected when switching shops or data from different company
          // Fall through to other methods
        }
      }

      // Version 3: Local AES-256-GCM (no Nostr keys needed)
      if (payload.v === 3 && payload.algorithm === "aes-256-gcm") {
        const result = await encryption.decrypt<T>(payload);
        if (result.success) {
          console.log("[NostrData] ✅ Decrypted v3 AES-256-GCM payload");
        }
        return result.success ? result.data || null : null;
      }

      // Nostr encryption requires at least pubkey
      if (!keys) return null;

      // If we have privkey, use direct decryption
      if (keys.privkey) {
        // Version 2: NIP-44
        if (payload.v === 2) {
          const result = await encryption.decrypt<T>(
            {
              ciphertext: payload.ct,
              algorithm: "nip-44",
              version: 2,
              encryptedAt: "",
            },
            { nostrPrivkey: keys.privkey, nostrPubkey: keys.pubkey },
          );
          if (result.success) {
            console.log("[NostrData] ✅ Decrypted v2 NIP-44 payload");
          }
          return result.success ? result.data || null : null;
        }

        // Version 1: NIP-04 (bnos-space format uses "ct" field)
        if ((payload.v === 1 && payload.ct) || payload.ct) {
          const result = await encryption.decrypt<T>(
            {
              ciphertext: payload.ct,
              algorithm: "nip-04",
              version: 1,
              encryptedAt: "",
            },
            { nostrPrivkey: keys.privkey, nostrPubkey: keys.pubkey },
          );
          if (result.success) {
            console.log("[NostrData] ✅ Decrypted v1 NIP-04 payload");
          }
          return result.success ? result.data || null : null;
        }
      }

      // NIP-07 users (have pubkey but no privkey) - try extension's decrypt
      if (keys.pubkey && !keys.privkey && import.meta.client) {
        const win = window as unknown as {
          nostr?: {
            nip04?: {
              decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
            };
          };
        };
        if (win.nostr?.nip04?.decrypt && payload.ct) {
          try {
            const plaintext = await win.nostr.nip04.decrypt(
              keys.pubkey,
              payload.ct,
            );
            console.log("[NostrData] ✅ Decrypted via NIP-07 extension");
            return JSON.parse(plaintext) as T;
          } catch (e) {
            console.warn("[NostrData] NIP-07 decrypt failed:", e);
          }
        }
      }

      // Not encrypted, return as-is
      if (payload.v && payload.encrypted) {
        console.warn(
          "[NostrData] ❌ Unrecognized encrypted payload, returning null",
          "v:",
          payload.v,
          "scheme:",
          payload.scheme,
        );
        return null;
      }
      return payload as T;
    } catch {
      // Try parsing as plain JSON
      try {
        return JSON.parse(encrypted);
      } catch {
        return null;
      }
    }
  }

  // ============================================
  // 📤 PUBLISH EVENTS
  // ============================================

  /**
   * Create and sign a Nostr event
   * Supports both direct signing (with privkey) and NIP-07 extension signing
   */
  async function createEvent(
    kind: number,
    content: string,
    tags: string[][] = [],
  ): Promise<Event | null> {
    const keys = getUserKeys();
    if (!keys) {
      error.value = "No Nostr keys available";
      return null;
    }

    const unsignedEvent: UnsignedEvent = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
      pubkey: keys.pubkey,
    };
    // If we have privkey, sign directly
    if (keys.privkey) {
      try {
        const privkeyBytes = hexToBytes(keys.privkey);
        const signedEvent = finalizeEvent(unsignedEvent, privkeyBytes);
        return signedEvent;
      } catch (e) {
        error.value = `Failed to sign event: ${e}`;
        console.error("[NostrData] Signing failed:", e);
        return null;
      }
    }

    // NIP-07: Use extension to sign
    if (import.meta.client) {
      const win = window as unknown as {
        nostr?: { signEvent: (event: UnsignedEvent) => Promise<Event> };
      };
      if (win.nostr?.signEvent) {
        try {
          const signedEvent = await win.nostr.signEvent(unsignedEvent);
          return signedEvent as Event;
        } catch (e) {
          error.value = `NIP-07 signing failed: ${e}`;
          console.error("[NostrData] NIP-07 signing failed:", e);
          return null;
        }
      } else {
        console.warn("[NostrData] ⚠️ No NIP-07 extension available");
      }
    }

    error.value =
      "No signing method available (no privkey and no NIP-07 extension)";
    console.error("[NostrData] ❌ No signing method available");
    return null;
  }

  /**
   * Publish a replaceable event (kind 30000+)
   */
  async function publishReplaceableEvent(
    kind: number,
    data: unknown,
    dTag: string,
    extraTags: string[][] = [],
    shouldEncrypt: boolean = true,
  ): Promise<Event | null> {
    const content = shouldEncrypt
      ? await encryptData(data)
      : JSON.stringify(data);

    const tags = [
      ["d", dTag],
      ["encrypted", shouldEncrypt ? "true" : "false"],
      ...extraTags,
    ];

    const event = await createEvent(kind, content, tags);
    if (!event) return null;

    const success = await relay.publishEvent(event);
    if (!success) {
      error.value = "Failed to publish event";
      return null;
    }

    return event;
  }

  /**
   * Publish a regular event (append-only)
   */
  async function publishEvent(
    kind: number,
    data: unknown,
    tags: string[][] = [],
    shouldEncrypt: boolean = true,
  ): Promise<Event | null> {
    const content = shouldEncrypt
      ? await encryptData(data)
      : JSON.stringify(data);

    const encryptedTag = [["encrypted", shouldEncrypt ? "true" : "false"]];

    const event = await createEvent(kind, content, [...tags, ...encryptedTag]);
    if (!event) return null;

    const success = await relay.publishEvent(event);
    if (!success) {
      error.value = "Failed to publish event";
      return null;
    }

    return event;
  }

  // ============================================
  // 📥 QUERY EVENTS
  // ============================================

  /**
   * Query events by kind and optional filters
   */
  async function queryEvents(
    kinds: number[],
    options: {
      authors?: string[];
      dTags?: string[];
      since?: number;
      until?: number;
      limit?: number;
    } = {},
  ): Promise<Event[]> {
    const keys = getUserKeys();
    const company = useCompany();

    // IMPORTANT: Always filter by current user's pubkey to avoid getting other users' data
    // If no keys available, return empty array instead of querying all authors
    if (!keys && !options.authors) {
      console.warn(
        "No user keys available and no authors specified - skipping query to avoid fetching other users data",
      );
      return [];
    }

    // Build authors list
    let authors = options.authors;
    if (!authors) {
      authors = [keys!.pubkey];

      // CRITICAL: Include team members in query when company code is enabled
      if (company.hasCompanyCode.value && company.isCompanyCodeEnabled.value) {
        const ownerPubkey = company.ownerPubkey.value;
        // For STAFF: Add owner pubkey
        if (ownerPubkey && ownerPubkey !== keys!.pubkey) {
          if (!authors.includes(ownerPubkey)) {
            authors.push(ownerPubkey);
          }
        }
      }
    }

    const filter: Record<string, unknown> = {
      kinds,
      authors,
    };

    if (options.dTags) {
      filter["#d"] = options.dTags;
    }
    if (options.since) {
      filter.since = options.since;
    }
    if (options.until) {
      filter.until = options.until;
    }
    if (options.limit) {
      filter.limit = options.limit;
    }

    try {
      return await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0],
      );
    } catch (e) {
      error.value = `Query failed: ${e}`;
      return [];
    }
  }

  /**
   * Get single replaceable event by d-tag
   */
  async function getReplaceableEvent<T>(
    kind: number,
    dTag: string,
  ): Promise<{ event: Event; data: T } | null> {
    const events = await queryEvents([kind], { dTags: [dTag], limit: 1 });

    if (events.length === 0) return null;

    const event = events[0]!;
    const isEncrypted =
      event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";

    const data = isEncrypted
      ? await decryptData<T>(event.content)
      : JSON.parse(event.content);

    if (!data) return null;

    return { event, data };
  }

  /**
   * Get all events of a kind
   */
  async function getAllEventsOfKind<T>(
    kind: number,
    options: { since?: number; limit?: number; authors?: string[] } = {},
  ): Promise<Array<{ event: Event; data: T }>> {
    const events = await queryEvents([kind], options);
    const results: Array<{ event: Event; data: T }> = [];

    for (const event of events) {
      try {
        const isEncrypted =
          event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";
        const data = isEncrypted
          ? await decryptData<T>(event.content)
          : JSON.parse(event.content);

        // Skip if no data or no id (required for DB storage)
        if (data && (data as { id?: string }).id) {
          results.push({ event, data });
        }
      } catch {
        // Skip invalid JSON
      }
    }

    return results;
  }

  // ============================================
  // 🛍️ PRODUCT OPERATIONS
  // ============================================

  const normalizeBdgoOsProduct = (raw: Record<string, unknown> & Partial<Product>): Product => {
    const pricing = raw.pricing as Record<string, number> | undefined;
    const inventory = raw.inventory as Record<string, unknown> | undefined;
    const available = raw.available;
    const status = raw.status;
    const isActive = available !== false && status !== "inactive" && status !== "archived";
    const resolvedPrice = raw.price ?? pricing?.price ?? 0;
    const resolvedCostPrice = raw.costPrice ?? pricing?.costPrice ?? 0;
    const eventCreatedAt = (raw as { created_at?: number }).created_at;
    const now = new Date().toISOString();
    return {
      id: raw.id || "",
      name: raw.name || "",
      sku: raw.sku || "",
      barcode: raw.barcode,
      description: raw.description,
      categoryId: raw.categoryId || "default",
      unitId: raw.unitId || "piece",
      price: resolvedPrice,
      costPrice: resolvedCostPrice || undefined,
      stock: (raw as Record<string, unknown>).stock as number ?? 0,
      minStock: (inventory?.lowStockThreshold as number) ?? raw.minStock ?? 0,
      branchId: raw.branchId || "main",
      status: isActive ? "active" : "inactive",
      image: Array.isArray(raw.images) ? raw.images[0] : raw.image,
      images: Array.isArray(raw.images) ? raw.images : raw.image ? [raw.image] : undefined,
      createdAt: raw.createdAt || (eventCreatedAt ? new Date(eventCreatedAt * 1000).toISOString() : now),
      updatedAt: raw.updatedAt || now,
      productType: (raw as Record<string, unknown>).type === "service" ? "service" : "good",
      trackStock: (raw as Record<string, unknown>).trackInventory !== false && raw.trackStock !== false,
      hasVariants: raw.hasVariants,
      variants: raw.variants,
      tags: raw.tags,
      isPublic: raw.isPublic !== false,
      synced: true,
    };
  };

  const isBdgoOsProduct = (data: Record<string, unknown>): boolean => {
    return "pricing" in data || "trackInventory" in data || "available" in data;
  };

  // ============================================
  // 🏢 CROSS-APP COMPANY ID DISCOVERY
  // ============================================

  const CACHED_COMPANY_IDS_KEY = "bnos_discovered_company_ids";

  const getTagVal = (tags: string[][], name: string) =>
    tags.find((t) => t[0] === name)?.[1];

  const getAllTagVals = (tags: string[][], name: string) =>
    tags.filter((t) => t[0] === name).map((t) => t[1]);

  async function discoverCompanyIdsFromRelay(): Promise<string[]> {
    const keys = getUserKeys();
    if (!keys?.pubkey) return [];

    const cached = localStorage.getItem(CACHED_COMPANY_IDS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { ids: string[]; ts: number };
        if (Date.now() - parsed.ts < 5 * 60 * 1000 && parsed.ids.length > 0) {
          return parsed.ids;
        }
      } catch {}
    }

    try {
      const events = await relay.queryEvents({
        kinds: [NOSTR_KINDS.STORE_SETTINGS],
        authors: [keys.pubkey],
        limit: 50,
      } as Parameters<typeof relay.queryEvents>[0]);

      const ids = new Set<string>();

      for (const event of events) {
        const dTag = getTagVal(event.tags, "d");
        if (dTag) ids.add(dTag);

        for (const cVal of getAllTagVals(event.tags, "c")) {
          if (cVal) ids.add(cVal);
        }
        for (const companyVal of getAllTagVals(event.tags, "company")) {
          if (companyVal) ids.add(companyVal);
        }
        for (const nVal of getAllTagVals(event.tags, "n")) {
          if (nVal) ids.add(nVal);
        }

        try {
          const data = JSON.parse(event.content) as Record<string, unknown>;
          if (data.companyId && typeof data.companyId === "string") ids.add(data.companyId);
          if (data.storeId && typeof data.storeId === "string") ids.add(data.storeId);
          if (data.code && typeof data.code === "string") ids.add(data.code as string);
          if (data.name && typeof data.name === "string") ids.add(data.name as string);
          const meta = data.metadata as Record<string, unknown> | undefined;
          if (meta?.companyId && typeof meta.companyId === "string") ids.add(meta.companyId);
          if (Array.isArray(data.codeAliases)) {
            for (const alias of data.codeAliases) {
              if (typeof alias === "string") ids.add(alias);
            }
          }
        } catch {}
      }

      const company = useCompany();
      if (company.companyCode.value) {
        ids.add(company.companyCode.value);
      }

      const result = [...ids].filter(Boolean);
      console.log("[bnos-space] discovered company IDs from relay", result);

      try {
        localStorage.setItem(CACHED_COMPANY_IDS_KEY, JSON.stringify({ ids: result, ts: Date.now() }));
      } catch {}

      return result;
    } catch (e) {
      console.warn("[bnos-space] failed to discover company IDs", e);
      return [];
    }
  }

  const buildCompanyTags = async (): Promise<string[][]> => {
    const company = useCompany();
    const tags: string[][] = [];

    const discoveredIds = await discoverCompanyIdsFromRelay();
    const seen = new Set<string>();

    for (const id of discoveredIds) {
      if (!seen.has(id)) {
        seen.add(id);
        tags.push(["c", id], ["company", id]);
      }
    }

    if (company.companyCode.value && !seen.has(company.companyCode.value)) {
      tags.push(["c", company.companyCode.value], ["company", company.companyCode.value]);
    }

    return tags;
  };

  // ============================================
  // 🔑 BDGO-OS KEY GRANT IMPORT
  // Fetches kind 30512 (COMPANY_KEY_GRANT) events from relay,
  // NIP-44 decrypts the wrapped AES key, and stores it in
  // localStorage using bdgo-os's key format so decryptData()
  // can decrypt bdgo-os order content.
  // ============================================

  const BDGOOS_KEY_PREFIX = "bdgoos_sensitive_data_key";

  const toBase64Url = (bytes: Uint8Array) => {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary)
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  };

  const fromBase64Url = (value: string) => {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  };

  const storeBdgoOsKey = (keyId: string, rawKey: Uint8Array) => {
    if (!import.meta.client) return;
    localStorage.setItem(`${BDGOOS_KEY_PREFIX}:${keyId}`, toBase64Url(rawKey));
    console.log("[NostrData] 🔑 Stored bdgo-os AES key:", keyId);
  };

  const readBdgoOsKey = (keyId: string): Uint8Array | null => {
    if (!import.meta.client) return null;
    const stored = localStorage.getItem(`${BDGOOS_KEY_PREFIX}:${keyId}`);
    return stored ? fromBase64Url(stored) : null;
  };

  const getBdgoOsKeyIds = (): string[] => {
    if (!import.meta.client) return [];
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${BDGOOS_KEY_PREFIX}:`)) {
        ids.push(key.slice(BDGOOS_KEY_PREFIX.length + 1));
      }
    }
    return ids;
  };

  async function nip44Decrypt(
    senderPubkey: string,
    ciphertext: string,
    recipientPrivkey: string,
  ): Promise<string> {
    type Nip44Window = Window & {
      nostr?: {
        nip44?: {
          decrypt: (pubkey: string, ct: string) => Promise<string>;
        };
      };
    };

    const wnostr = (window as Nip44Window).nostr;
    if (wnostr?.nip44?.decrypt) {
      return wnostr.nip44.decrypt(senderPubkey, ciphertext);
    }

    const conversationKey = nip44.v2.utils.getConversationKey(
      hexToBytes(recipientPrivkey),
      senderPubkey,
    );
    return nip44.v2.decrypt(ciphertext, conversationKey);
  }

  async function importKeyGrantsForCurrentUser(): Promise<number> {
    const keys = getUserKeys();
    if (!keys?.pubkey) {
      console.log("[NostrData] ⏭ Skipping key grant import — no user keys");
      return 0;
    }

    try {
      const events = await relay.queryEvents({
        kinds: [NOSTR_KINDS.COMPANY_KEY_GRANT],
        ["#p"]: [keys.pubkey],
        limit: 100,
      } as Parameters<typeof relay.queryEvents>[0]);

      console.log(
        `[NostrData] 🔑 Found ${events.length} COMPANY_KEY_GRANT events for user`,
      );

      let imported = 0;
      for (const event of events) {
        try {
          const grant = JSON.parse(event.content) as {
            recipientPubkey: string;
            wrappedKey: string;
            keyId: string;
            companyId: string;
            keyVersion?: number;
            revokedAt?: number;
          };

          if (grant.recipientPubkey !== keys.pubkey) continue;
          if (grant.revokedAt) continue;

          if (!keys.privkey) {
            console.warn(
              "[NostrData] ⚠️ Cannot decrypt key grant — no privkey (NIP-07 user needs extension with nip44 support)",
            );
            continue;
          }

          const decryptedBase64Url = await nip44Decrypt(
            event.pubkey,
            grant.wrappedKey,
            keys.privkey,
          );
          const rawKey = fromBase64Url(decryptedBase64Url);

          storeBdgoOsKey(grant.keyId, rawKey);
          imported++;

          console.log(
            `[NostrData] ✅ Imported key grant: kid=${grant.keyId}, company=${grant.companyId}`,
          );
        } catch (e) {
          console.warn("[NostrData] ❌ Failed to import key grant:", e);
        }
      }

      return imported;
    } catch (e) {
      console.warn("[NostrData] ❌ Failed to fetch key grants:", e);
      return 0;
    }
  }

  async function saveProduct(product: Product): Promise<Event | null> {
    const companyTags = await buildCompanyTags();
    const extraTags: string[][] = [
      ["name", product.name],
      ["sku", product.sku],
      ["category", product.categoryId],
      ["status", product.status],
      ["public", product.isPublic !== false ? "true" : "false"],
      ...companyTags,
    ];
    return publishReplaceableEvent(
      NOSTR_KINDS.PRODUCT,
      product,
      product.id,
      extraTags,
      false,
    );
  }

  async function getProduct(id: string): Promise<Product | null> {
    const result = await getReplaceableEvent<Record<string, unknown> & Partial<Product>>(NOSTR_KINDS.PRODUCT, id);
    if (!result?.data) return null;
    const data = result.data;
    if ((data as { deleted?: boolean }).deleted) return null;
    return isBdgoOsProduct(data) ? normalizeBdgoOsProduct(data) : data as Product;
  }

  async function getAllProducts(): Promise<Product[]> {
    const results = await getAllEventsOfKind<Record<string, unknown> & Partial<Product>>(NOSTR_KINDS.PRODUCT);
    return results
      .map((r) => {
        const data = r.data;
        if ((data as { deleted?: boolean }).deleted) return null;
        return isBdgoOsProduct(data) ? normalizeBdgoOsProduct(data) : data as Product;
      })
      .filter((p): p is Product => p !== null);
  }

  /**
   * Get products for a specific owner (for public menu access)
   * This is used when a customer scans a QR code and needs to load the store's products
   */
  async function getProductsForOwner(ownerPubkey: string): Promise<Product[]> {
    const results = await getAllEventsOfKind<Record<string, unknown> & Partial<Product>>(NOSTR_KINDS.PRODUCT, {
      authors: [ownerPubkey],
    });
    return results
      .map((r) => {
        const data = r.data;
        if ((data as { deleted?: boolean }).deleted) return null;
        const product = isBdgoOsProduct(data) ? normalizeBdgoOsProduct(data) : data as Product;
        if (product.status !== "active" || product.isPublic === false) return null;
        return product;
      })
      .filter((p): p is Product => p !== null);
  }

  /**
   * Get categories for a specific owner (for public menu access)
   */
  async function getCategoriesForOwner(
    ownerPubkey: string,
  ): Promise<Category[]> {
    const results = await getAllEventsOfKind<Category>(NOSTR_KINDS.CATEGORY, {
      authors: [ownerPubkey],
    });
    return results
      .map((r) => r.data)
      .filter((c) => !(c as Category & { deleted?: boolean }).deleted);
  }

  async function deleteProduct(id: string): Promise<boolean> {
    const companyTags = await buildCompanyTags();
    const event = await publishReplaceableEvent(
      NOSTR_KINDS.PRODUCT,
      { deleted: true, deletedAt: new Date().toISOString() },
      id,
      [["deleted", "true"], ...companyTags],
    );
    return event !== null;
  }

  // ============================================
  // 📁 CATEGORY OPERATIONS
  // ============================================

  async function saveCategory(category: Category): Promise<Event | null> {
    const companyTags = await buildCompanyTags();
    const tags: string[][] = [["name", category.name], ...companyTags];
    return publishReplaceableEvent(
      NOSTR_KINDS.CATEGORY,
      category,
      category.id,
      tags,
      false,
    );
  }

  async function getAllCategories(): Promise<Category[]> {
    const results = await getAllEventsOfKind<Category>(NOSTR_KINDS.CATEGORY);
    return results
      .map((r) => r.data)
      .filter((c) => !(c as Category & { deleted?: boolean }).deleted);
  }

  // ============================================
  // 📐 UNIT OPERATIONS
  // ============================================

  async function saveUnit(unit: Unit): Promise<Event | null> {
    const companyTags = await buildCompanyTags();
    const tags: string[][] = [["name", unit.name], ["symbol", unit.symbol], ...companyTags];
    return publishReplaceableEvent(NOSTR_KINDS.UNIT, unit, unit.id, tags);
  }

  async function getAllUnits(): Promise<Unit[]> {
    const results = await getAllEventsOfKind<Unit>(NOSTR_KINDS.UNIT);
    return results
      .map((r) => r.data)
      .filter((u) => !(u as Unit & { deleted?: boolean }).deleted);
  }

  // ============================================
  // 🧾 ORDER OPERATIONS
  // ============================================

  const normalizeBdgoOsOrder = (
    raw: Record<string, unknown>,
    eventAuthorPubkey?: string,
  ): Order | null => {
    try {
      const orderCreatedAt =
        typeof raw.createdAt === "number"
          ? raw.createdAt
          : typeof raw.date === "number"
            ? Math.floor((raw.date as number) / 1000)
            : Math.floor(Date.now() / 1000);

      const orderUpdatedAt =
        typeof raw.updatedAt === "number"
          ? raw.updatedAt
          : typeof raw.completedAt === "number"
            ? raw.completedAt
            : orderCreatedAt;

      const items = Array.isArray(raw.items)
        ? (raw.items as Record<string, unknown>[]).map(
            (item: Record<string, unknown>, idx: number) => {
              const product = (item.product as Record<string, unknown>) || {};
              return {
                id:
                  (item.id as string) ||
                  `item_${idx}_${Date.now()}`,
                productId:
                  (item.productId as string) ||
                  (item.product_id as string) ||
                  "",
                quantity: (item.quantity as number) || 1,
                price:
                  (item.unitPrice as number) ||
                  (item.price as number) ||
                  0,
                total:
                  (item.lineTotal as number) ||
                  ((item.quantity as number) || 1) *
                    ((item.unitPrice as number) || (item.price as number) || 0),
                createdAt: new Date(orderCreatedAt * 1000).toISOString(),
                updatedAt: new Date(orderUpdatedAt * 1000).toISOString(),
                product: {
                  id:
                    (item.productId as string) ||
                    (product.id as string) ||
                    "",
                  name:
                    (item.productName as string) ||
                    (product.name as string) ||
                    "Unknown",
                  price:
                    (item.unitPrice as number) ||
                    (product.price as number) ||
                    0,
                  categoryId:
                    (product.categoryId as string) ||
                    (product.cat as string) ||
                    "default",
                  sku: (product.sku as string) || "",
                  status: "active",
                  image: (product.img as string) || (product.image as string) || undefined,
                } as Product,
                notes: (item.notes as string) || (item.note as string) || undefined,
              };
            },
          )
        : [];

      const totals = (raw.totals as Record<string, number>) || {};
      const metadata = (raw.metadata as Record<string, unknown>) || {};
      const total = totals.total || (raw.total as number) || 0;

      return {
        id: (raw.id as string) || (raw.dTag as string) || `bdgo_${Date.now()}`,
        customer:
          (raw.customerName as string) ||
          (raw.customer as string) ||
          "Walk-in",
        branch:
          (raw.branchId as string) ||
          (metadata.branchId as string) ||
          "main",
        date: new Date(orderCreatedAt * 1000).toISOString(),
        total,
        currency: (raw.currency as string) || "LAK",
        status: (raw.status as string) || "pending",
        paymentMethod: (raw.paymentMethod as string) || undefined,
        items,
        notes: (raw.notes as string) || undefined,
        discount: totals.discountAmount || (raw.discount as number) || 0,
        tax: totals.taxAmount || (raw.tax as number) || 0,
        orderType: (raw.type as string) || (raw.orderType as string) || undefined,
        tableNumber: (raw.tableId as string) || (raw.tableNumber as string) || undefined,
        updatedAt: new Date(orderUpdatedAt * 1000).toISOString(),
        tags: ["bdgo-os"],
        isOffline: false,
      } as Order;
    } catch (e) {
      console.warn("[NostrData] Failed to normalize bdgo-os order:", e);
      return null;
    }
  };

  const isBdgoOsOrder = (data: Record<string, unknown>): boolean => {
    return (
      "items" in data &&
      typeof data.items === "object" &&
      ("totals" in data ||
        "orderNumber" in data ||
        "branchId" in data ||
        "covers" in data ||
        ("metadata" in data &&
          typeof (data as Record<string, unknown>).metadata === "object"))
    );
  };

  async function saveOrder(order: Order): Promise<Event | null> {
    const company = useCompany();
    const companyTags = await buildCompanyTags();

    const shouldEncrypt = !company.isCompanyCodeEnabled.value;

    const tags: string[][] = [
      ["d", order.id],
      ["status", order.status],
      ["method", order.paymentMethod || "unknown"],
      ["t", order.date],
      ["amount", order.total.toString()],
      ["t", "order"],
      ["t", "bnos"],
    ];

    if (order.customerPubkey) {
      tags.push(["p", order.customerPubkey]);
    }
    if (order.orderType) {
      tags.push(["order_type", order.orderType]);
    }
    if (order.tableNumber) {
      tags.push(["table", order.tableNumber]);
    }

    tags.push(...companyTags);
    tags.push(
      ...(order.tags || []).map((tag) => ["t", tag]),
    );

    return publishEvent(
      NOSTR_KINDS.ORDER,
      order,
      tags.filter((t) => t.length > 0),
      shouldEncrypt,
    );
  }

  async function savePayment(data: {
    orderId: string;
    orderPubkey: string;
    method: string;
    amount: number;
    currency?: string;
    status?: string;
  }): Promise<Event | null> {
    const company = useCompany();
    const companyTags = await buildCompanyTags();
    const keys = getUserKeys();
    if (!keys) return null;

    const paymentId = `payment_${data.orderId}_${Date.now()}`;
    const paymentData = {
      id: paymentId,
      orderId: data.orderId,
      method: data.method,
      amount: data.amount,
      currency: data.currency || "LAK",
      status: data.status || "completed",
      receivedAt: new Date().toISOString(),
      createdBy: keys.pubkey,
    };

    const tags: string[][] = [
      ["d", paymentId],
      ["a", `30200:${data.orderPubkey}:${data.orderId}`],
      ["e", data.orderId],
      ["t", "payment"],
      ["t", "bnos"],
      ["method", data.method],
      ["amount", data.amount.toString()],
      ...companyTags,
    ];

    const shouldEncrypt = !company.isCompanyCodeEnabled.value;

    return publishEvent(
      NOSTR_KINDS.PAYMENT,
      paymentData,
      tags.filter((t) => t.length > 0),
      shouldEncrypt,
    );
  }

  /**
   * Publish kitchen alert for cross-device notifications
   * Uses POS_ALERT kind (1050) for real-time propagation
   */
  async function publishKitchenAlert(
    alertData: {
      type: string;
      orderId: string;
      orderNumber?: string;
      status: string;
      customer?: string;
      total?: number;
      items?: number;
      timestamp: string;
    },
    _companyCodeHash?: string | null,
  ): Promise<Event | null> {
    try {
      const companyTags = await buildCompanyTags();

      const tags: string[][] = [
        ["type", alertData.type],
        ["order_id", alertData.orderId],
        ["status", alertData.status],
        ...companyTags,
      ];

      // Add optional fields
      if (alertData.orderNumber) {
        tags.push(["order_num", String(alertData.orderNumber)]);
      }

      const event = await createEvent(
        NOSTR_KINDS.POS_ALERT,
        JSON.stringify(alertData),
        tags,
      );

      if (!event) return null;

      const success = await relay.publishEvent(event);
      return success ? event : null;
    } catch (err) {
      console.error("[NostrData] Failed to publish kitchen alert:", err);
      return null;
    }
  }

  async function getOrder(id: string): Promise<Order | null> {
    const events = await queryEvents([NOSTR_KINDS.ORDER], {
      dTags: [id],
      limit: 1,
    });
    if (events.length === 0) return null;

    const event = events[0]!;
    const isEncrypted =
      event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";

    return isEncrypted
      ? await decryptData<Order>(event.content)
      : JSON.parse(event.content);
  }

  const parseOrderEvent = async (
    event: { content: string; tags: string[][]; pubkey: string },
  ): Promise<Order | null> => {
    try {
      const isEncrypted =
        event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";
      const dTag = event.tags.find((t) => t[0] === "d")?.[1];
      const sourceApp = event.tags.find((t) => t[1] === "bdgoos")
        ? "bdgo-os"
        : event.tags.find((t) => t[1] === "bnos")
          ? "bnos-space"
          : "unknown";

      console.log(
        "[NostrData] 🔍 parseOrderEvent:",
        "dTag:",
        dTag?.slice(-8),
        "encrypted:",
        isEncrypted,
        "source:",
        sourceApp,
        "author:",
        event.pubkey.slice(0, 8) + "...",
      );

      let data: unknown = null;
      if (isEncrypted) {
        data = await decryptData(event.content);
        if (!data) {
          console.warn(
            "[NostrData] ❌ Decryption FAILED for order:",
            dTag?.slice(-8),
            "source:",
            sourceApp,
            "— creating minimal order from tags as fallback",
          );
          return buildOrderFromTags(event);
        }
        console.log(
          "[NostrData] ✅ Decryption succeeded for order:",
          dTag?.slice(-8),
          "source:",
          sourceApp,
          "dataKeys:",
          Object.keys(data as object).slice(0, 10).join(","),
        );
      } else {
        data = JSON.parse(event.content);
      }

      if (!data) return null;

      if (
        typeof data === "object" &&
        data !== null &&
        !Array.isArray(data)
      ) {
        const record = data as Record<string, unknown>;
        if (isBdgoOsOrder(record)) {
          console.log(
            "[NostrData] 📦 Normalizing bdgo-os order:",
            dTag?.slice(-8),
            "items:",
            Array.isArray(record.items) ? record.items.length : 0,
          );
          return normalizeBdgoOsOrder(record, event.pubkey);
        }
        if (record.id) {
          return data as Order;
        }
      }

      return null;
    } catch (e) {
      console.warn("[NostrData] parseOrderEvent error:", e);
      return null;
    }
  };

  function buildOrderFromTags(event: {
    content: string;
    tags: string[][];
    pubkey: string;
  }): Order | null {
    const dTag = event.tags.find((t) => t[0] === "d")?.[1];
    if (!dTag) return null;

    const amount = event.tags.find((t) => t[0] === "amount")?.[1];
    const method = event.tags.find((t) => t[0] === "method")?.[1];
    const status = event.tags.find((t) => t[0] === "status")?.[1];
    const table = event.tags.find((t) => t[0] === "table")?.[1];
    const branchTag = event.tags.find((t) => t[0] === "b" || t[0] === "branch")?.[1];
    const companyTag = event.tags.find((t) => t[0] === "c" || t[0] === "company")?.[1];

    console.log(
      "[NostrData] 📋 buildOrderFromTags:",
      "id:",
      dTag.slice(-8),
      "amount:",
      amount,
      "method:",
      method,
      "status:",
      status,
      "company:",
      companyTag,
    );

    return {
      id: dTag,
      customer: "Walk-in",
      branch: branchTag || "main",
      date: new Date(
        ((event as unknown as { created_at?: number }).created_at || 0) * 1000 || Date.now(),
      ).toISOString(),
      total: amount ? parseFloat(amount) : 0,
      currency: "LAK",
      status: (status as string) || "pending",
      paymentMethod: method || undefined,
      items: [],
      notes: "⚠️ Order content encrypted (bdgo-os). Enable company code to decrypt.",
      orderType: undefined,
      tableNumber: table || undefined,
      updatedAt: new Date().toISOString(),
      tags: ["bdgo-os", "encrypted-fallback"],
      isOffline: false,
    } as Order;
  }

  async function getAllOrders(
    options: { since?: number; limit?: number } = {},
  ): Promise<Order[]> {
    const company = useCompany();

    await importKeyGrantsForCurrentUser();

    const seenIds = new Set<string>();
    const orders: Order[] = [];

    const addOrder = (order: Order | null) => {
      if (order && order.id && !seenIds.has(order.id)) {
        seenIds.add(order.id);
        orders.push(order);
      }
    };

    if (
      company.hasCompanyCode.value &&
      company.isCompanyCodeEnabled.value &&
      company.companyCodeHash.value
    ) {
      try {
        const cTags = [company.companyCodeHash.value];

        const discoveredIds = await discoverCompanyIdsFromRelay();
        for (const id of discoveredIds) {
          if (!cTags.includes(id)) {
            cTags.push(id);
          }
        }

        console.log(
          "[NostrData] 📡 getAllOrders: querying with",
          cTags.length,
          "company IDs:",
          cTags.map((t) => t.slice(0, 12) + "..."),
        );

        const filter: Record<string, unknown> = {
          kinds: [NOSTR_KINDS.ORDER],
          "#c": cTags,
        };

        if (options.since) {
          filter.since = options.since;
        }
        if (options.limit) {
          filter.limit = options.limit;
        }

        const events = await relay.queryEvents(
          filter as Parameters<typeof relay.queryEvents>[0],
        );

        console.log(
          "[NostrData] 📡 getAllOrders: received",
          events.length,
          "events from relay",
        );

        for (const event of events) {
          const order = await parseOrderEvent(event);
          if (order) {
            console.log(
              "[NostrData] ✅ Parsed order:",
              order.id.slice(-8),
              "items:",
              order.items?.length || 0,
              "status:",
              order.status,
              "total:",
              order.total,
            );
          }
          addOrder(order);
        }
      } catch (e) {
        console.warn(
          "[NostrData] Company code query failed, falling back to normal query:",
          e,
        );
      }
    }

    try {
      const results = await getAllEventsOfKind<Order>(
        NOSTR_KINDS.ORDER,
        options,
      );
      for (const r of results) {
        const record = r.data as unknown as Record<string, unknown>;
        if (isBdgoOsOrder(record)) {
          addOrder(
            normalizeBdgoOsOrder(record, r.event.pubkey),
          );
        } else {
          addOrder(r.data);
        }
      }
    } catch {
      // Silently continue
    }

    return orders.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async function getOrdersByStatus(status: string): Promise<Order[]> {
    const allOrders = await getAllOrders();
    return allOrders.filter((o) => o.status === status);
  }

  async function getOrdersByCustomer(customerPubkey: string): Promise<Order[]> {
    const allOrders = await getAllOrders();
    return allOrders.filter((o) => o.customerPubkey === customerPubkey);
  }

  /**
   * Query orders on the relay by a custom tag label (e.g. "daily", "booth")
   * Uses the Nostr #t filter — only works when orders are published unencrypted
   * (i.e., team/company-code mode). Falls back to in-memory filter otherwise.
   */
  async function getOrdersByTag(tag: string): Promise<Order[]> {
    try {
      const filter: Record<string, unknown> = {
        kinds: [NOSTR_KINDS.ORDER],
        "#t": [tag],
        limit: 200,
      };

      const events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0],
      );

      const orders: Order[] = [];
      for (const event of events) {
        try {
          const isEncrypted =
            event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";
          const data = isEncrypted
            ? await decryptData<Order>(event.content)
            : JSON.parse(event.content);

          if (data && data.id) {
            orders.push(data);
          }
        } catch {
          // Skip invalid events
        }
      }

      return orders.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    } catch (e) {
      console.error("[NostrData] getOrdersByTag failed:", e);
      return [];
    }
  }

  /**
   * Save order as anonymous customer using ephemeral keypair
   * This allows customers who scanned QR code (no login) to publish orders
   * The order is tagged with owner's pubkey so admin can subscribe to it
   */
  async function saveOrderAsAnonymous(
    order: Order,
    ownerPubkey: string,
  ): Promise<Event | null> {
    if (!import.meta.client) return null;

    try {
      // Generate ephemeral keypair for this session
      const { $nostr } = useNuxtApp();
      const ephemeralKeys = $nostr.generateKeys();

      const companyTags = await buildCompanyTags();

      // Create order event with owner tag
      const content = JSON.stringify(order);
      const tags = [
        ["d", order.id],
        ["p", ownerPubkey], // Tag owner so they can subscribe
        ["status", order.status],
        ["table", order.tableNumber || ""],
        ["t", order.date],
        ["amount", order.total.toString()],
        ["type", "customer-order"], // Mark as customer order
        ["encrypted", "false"],
        ...companyTags,
      ];

      const unsignedEvent: UnsignedEvent = {
        kind: NOSTR_KINDS.ORDER,
        created_at: Math.floor(Date.now() / 1000),
        tags,
        content,
        pubkey: ephemeralKeys.publicKey,
      };

      // Sign with ephemeral key
      const signedEvent = finalizeEvent(
        unsignedEvent,
        hexToBytes(ephemeralKeys.privateKey),
      );

      // Publish to relay
      const success = await relay.publishEvent(signedEvent);
      if (!success) {
        console.error("[NostrData] Failed to publish anonymous order");
        return null;
      }

      return signedEvent;
    } catch (e) {
      console.error("[NostrData] Failed to save anonymous order:", e);
      return null;
    }
  }

  /**
   * Get orders for a store (tagged with owner pubkey)
   * Used by admin/kitchen to fetch customer orders
   */
  async function getOrdersForStore(ownerPubkey: string): Promise<Order[]> {
    try {
      const filter = {
        kinds: [NOSTR_KINDS.ORDER],
        "#p": [ownerPubkey],
        limit: 100,
      };

      const events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0],
      );
      const orders: Order[] = [];

      for (const event of events) {
        const order = await parseOrderEvent(event);
        if (order) {
          orders.push(order);
        }
      }

      return orders.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    } catch (e) {
      console.error("[NostrData] Failed to get store orders:", e);
      return [];
    }
  }

  // ============================================
  // 👥 CUSTOMER/LOYALTY OPERATIONS
  // ============================================

  async function saveCustomer(customer: LoyaltyMember): Promise<Event | null> {
    const companyTags = await buildCompanyTags();
    return publishReplaceableEvent(
      NOSTR_KINDS.CUSTOMER,
      customer,
      customer.nostrPubkey,
      [
        ["p", customer.nostrPubkey],
        ["tier", customer.tier],
        ["points", customer.points.toString()],
        ...companyTags,
      ],
    );
  }

  async function getCustomer(pubkey: string): Promise<LoyaltyMember | null> {
    const result = await getReplaceableEvent<LoyaltyMember>(
      NOSTR_KINDS.CUSTOMER,
      pubkey,
    );
    return result?.data || null;
  }

  async function getAllCustomers(): Promise<LoyaltyMember[]> {
    const results = await getAllEventsOfKind<LoyaltyMember>(
      NOSTR_KINDS.CUSTOMER,
    );
    return results.map((r) => r.data);
  }

  // ============================================
  // 💬 CHAT CONVERSATION OPERATIONS
  // ============================================

  /**
   * Save team chat conversation to Nostr
   * Only syncs team channels (not DMs which stay local)
   */
  async function saveConversation(conversation: {
    id: string;
    type: "direct" | "channel" | "group";
    groupName?: string;
    groupAvatar?: string;
    shopId?: string;
    scope?: "shop" | "company" | "department";
    tags?: string[];
    isReadOnly?: boolean;
    memberPubkeys?: string[];
    isPrivate?: boolean;
  }): Promise<Event | null> {
    const company = useCompany();

    const companyTags = await buildCompanyTags();

    const tags: string[][] = [
      ["type", conversation.type],
      conversation.scope ? ["scope", conversation.scope] : [],
      conversation.shopId ? ["shop", conversation.shopId] : [],
      conversation.groupName ? ["name", conversation.groupName] : [],
      conversation.isReadOnly ? ["read-only", "true"] : [],
      ...companyTags,
      // Add custom tags
      ...(conversation.tags || []).map((t) => ["t", t]),
      // Add member pubkeys for private channels
      ...(conversation.memberPubkeys || []).map((p) => ["p", p]),
    ].filter((t) => t.length > 0) as string[][];

    // Decide encryption: team channels are unencrypted for easy sync
    const shouldEncrypt =
      conversation.isPrivate ||
      !company.isCompanyCodeEnabled.value ||
      conversation.type === "direct";

    return publishReplaceableEvent(
      NOSTR_KINDS.CHAT_CHANNEL,
      conversation,
      conversation.id,
      tags,
      shouldEncrypt,
    );
  }

  /**
   * Get all team conversations (channels) from Nostr
   * Filters by company code hash for team mode
   */
  async function getAllConversations(
    options: {
      companyCodeHash?: string;
      scope?: string;
      shopId?: string;
    } = {},
  ): Promise<
    Array<{
      id: string;
      type: "direct" | "channel" | "group";
      groupName?: string;
      groupAvatar?: string;
      shopId?: string;
      scope?: "shop" | "company" | "department";
      tags?: string[];
      isReadOnly?: boolean;
      memberPubkeys?: string[];
    }>
  > {
    try {
      // Build filter - using standard #t tag for better relay support
      const filter: Record<string, unknown> = {
        kinds: [NOSTR_KINDS.CHAT_CHANNEL],
      };

      if (options.companyCodeHash) {
        // Use standard #t tag format (NIP-12) for better relay support
        const teamTag = `team:${options.companyCodeHash}`;
        filter["#t"] = [teamTag];
      }

      if (options.scope) {
        filter["#scope"] = [options.scope];
      }

      if (options.shopId) {
        filter["#shop"] = [options.shopId];
      }

      // Query with #t tag first
      let events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0],
      );

      // Fallback: also query with #c tag for backward compatibility
      if (options.companyCodeHash && events.length === 0) {
        const fallbackFilter: Record<string, unknown> = {
          kinds: [NOSTR_KINDS.CHAT_CHANNEL],
          "#c": [options.companyCodeHash],
        };
        events = await relay.queryEvents(
          fallbackFilter as Parameters<typeof relay.queryEvents>[0],
        );
      }

      const conversations: Array<{
        id: string;
        type: "direct" | "channel" | "group";
        groupName?: string;
        groupAvatar?: string;
        shopId?: string;
        scope?: "shop" | "company" | "department";
        tags?: string[];
        isReadOnly?: boolean;
        memberPubkeys?: string[];
      }> = [];
      for (const event of events) {
        try {
          const isEncrypted =
            event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";
          const data = isEncrypted
            ? await decryptData<(typeof conversations)[0]>(event.content)
            : JSON.parse(event.content);

          if (data && data.id) {
            conversations.push(data);
          }
        } catch (e) {
          console.warn("[NostrData] Failed to parse conversation:", e);
        }
      }

      return conversations;
    } catch (e) {
      console.error("[NostrData] Failed to get conversations:", e);
      return [];
    }
  }

  /**
   * Get single conversation by ID
   */
  async function getConversationById(id: string): Promise<{
    id: string;
    type: "direct" | "channel" | "group";
    groupName?: string;
    shopId?: string;
    scope?: "shop" | "company" | "department";
    tags?: string[];
    memberPubkeys?: string[];
  } | null> {
    const result = await getReplaceableEvent<{
      id: string;
      type: "direct" | "channel" | "group";
      groupName?: string;
      shopId?: string;
      scope?: "shop" | "company" | "department";
      tags?: string[];
      memberPubkeys?: string[];
    }>(NOSTR_KINDS.CHAT_CHANNEL, id);
    return result?.data || null;
  }

  // ============================================
  // 👥 NIP-29 GROUP CHAT OPERATIONS
  // ============================================

  /**
   * Generate unique group ID
   */
  function generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Publish group metadata (kind 39000)
   * Creates or updates a group's basic information
   */
  async function publishGroupMetadata(params: {
    groupId: string;
    name: string;
    about?: string;
    picture?: string;
    isPrivate?: boolean;
  }): Promise<Event | null> {
    const companyTags = await buildCompanyTags();

    const metadata = {
      id: params.groupId,
      name: params.name,
      about: params.about || "",
      picture: params.picture || "",
      isPrivate: params.isPrivate !== false,
      createdAt: new Date().toISOString(),
    };

    const tags: string[][] = [
      ["d", params.groupId],
      ["name", params.name],
      ["picture", params.picture || ""],
      ["about", params.about || ""],
      params.isPrivate ? ["private"] : ["public"],
      ...companyTags,
    ].filter((t) => t.length > 0 && t[1] !== "") as string[][];

    return publishReplaceableEvent(
      NOSTR_KINDS.GROUP_METADATA,
      metadata,
      params.groupId,
      tags,
      false, // Unencrypted for team visibility
    );
  }

  /**
   * Publish group admins list (kind 39001)
   */
  async function publishGroupAdmins(
    groupId: string,
    adminPubkeys: string[],
  ): Promise<Event | null> {
    const companyTags = await buildCompanyTags();

    const tags: string[][] = [
      ["d", groupId],
      ...adminPubkeys.map((pubkey) => ["p", pubkey, "", "admin"]),
      ...companyTags,
    ].filter((t) => t.length > 0) as string[][];

    return publishReplaceableEvent(
      NOSTR_KINDS.GROUP_ADMINS,
      { groupId, admins: adminPubkeys },
      groupId,
      tags,
      false,
    );
  }

  /**
   * Publish group members list (kind 39002)
   */
  async function publishGroupMembers(
    groupId: string,
    memberPubkeys: string[],
  ): Promise<Event | null> {
    const companyTags = await buildCompanyTags();

    const tags: string[][] = [
      ["d", groupId],
      ...memberPubkeys.map((pubkey) => ["p", pubkey, "", "member"]),
      ...companyTags,
    ].filter((t) => t.length > 0) as string[][];

    return publishReplaceableEvent(
      NOSTR_KINDS.GROUP_MEMBERS,
      { groupId, members: memberPubkeys },
      groupId,
      tags,
      false,
    );
  }

  /**
   * Send group chat message (kind 9)
   */
  async function sendGroupMessage(params: {
    groupId: string;
    content: string;
    replyTo?: string;
  }): Promise<Event | null> {
    const companyTags = await buildCompanyTags();

    const tags: string[][] = [
      ["h", params.groupId], // NIP-29: group reference
      params.replyTo ? ["e", params.replyTo, "", "reply"] : [],
      ...companyTags,
    ].filter((t) => t.length > 0) as string[][];

    return publishEvent(
      NOSTR_KINDS.GROUP_CHAT_MESSAGE,
      { content: params.content },
      tags,
      false, // Plain text for now
    );
  }

  /**
   * Get group metadata
   */
  async function getGroupMetadata(groupId: string): Promise<{
    id: string;
    name: string;
    about: string;
    picture: string;
    isPrivate: boolean;
  } | null> {
    const result = await getReplaceableEvent<{
      id: string;
      name: string;
      about: string;
      picture: string;
      isPrivate: boolean;
    }>(NOSTR_KINDS.GROUP_METADATA, groupId);
    return result?.data || null;
  }

  /**
   * Get group admins
   */
  async function getGroupAdmins(groupId: string): Promise<string[]> {
    const result = await getReplaceableEvent<{
      groupId: string;
      admins: string[];
    }>(NOSTR_KINDS.GROUP_ADMINS, groupId);
    return result?.data?.admins || [];
  }

  /**
   * Get group members
   */
  async function getGroupMembers(groupId: string): Promise<string[]> {
    const result = await getReplaceableEvent<{
      groupId: string;
      members: string[];
    }>(NOSTR_KINDS.GROUP_MEMBERS, groupId);
    return result?.data?.members || [];
  }

  /**
   * Get all groups for current team
   */
  async function getAllGroups(): Promise<
    Array<{
      id: string;
      name: string;
      about: string;
      picture: string;
      isPrivate: boolean;
      memberCount?: number;
    }>
  > {
    const company = useCompany();

    if (!company.companyCodeHash.value) {
      return [];
    }

    try {
      const filter: Record<string, unknown> = {
        kinds: [NOSTR_KINDS.GROUP_METADATA],
        "#c": [company.companyCodeHash.value],
      };

      const events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0],
      );

      const groups: Array<{
        id: string;
        name: string;
        about: string;
        picture: string;
        isPrivate: boolean;
        memberCount?: number;
      }> = [];

      for (const event of events) {
        try {
          const data = JSON.parse(event.content);
          if (data && data.id) {
            groups.push(data);
          }
        } catch (e) {
          console.warn("[NostrData] Failed to parse group:", e);
        }
      }

      return groups;
    } catch (e) {
      console.error("[NostrData] Failed to get groups:", e);
      return [];
    }
  }

  // ============================================
  // 🔄 BDGO-OS DATA MODEL NORMALIZERS
  // Maps bdgo-os entity fields to bnos-space types
  // ============================================

  const isBdgoOsSettings = (data: Record<string, unknown>): boolean => {
    return (
      typeof data.name === "string" &&
      typeof data.currency === "string" &&
      ("storeId" in data ||
        "businessModel" in data ||
        "businessType" in data ||
        "taxInclusive" in data ||
        "currencySymbol" in data)
    );
  };

  const normalizeBdgoOsSettings = (
    raw: Record<string, unknown>,
  ): StoreSettings => {
    const address = raw.address as Record<string, unknown> | undefined;
    return {
      companyName: (raw.name as string) || undefined,
      companyEmail: (raw.email as string) || undefined,
      companyPhone: (raw.phone as string) || undefined,
      companyAddress:
        typeof raw.address === "string"
          ? (raw.address as string)
          : [address?.street, address?.city, address?.country]
              .filter(Boolean)
              .join(", ") || undefined,
      defaultCurrency: (raw.currency as string) || "LAK",
      defaultLanguage: (raw.locale as string) || "en-US",
      timezone: (raw.timezone as string) || "Asia/Vientiane",
      marketplace: {
        shopType: (raw.businessType as string) || undefined,
        platformTag: "bdgo-os",
      },
      updatedAt: new Date().toISOString(),
    } as StoreSettings;
  };

  const isBdgoOsBranch = (data: Record<string, unknown>): boolean => {
    return "storeId" in data && typeof data.storeId === "string";
  };

  const normalizeBdgoOsBranch = (
    raw: Record<string, unknown>,
    event?: Event,
  ): Branch => {
    const address = raw.address as Record<string, unknown> | undefined;
    return {
      id:
        (raw.id as string) ||
        (event ? getTagVal(event.tags, "d") || "" : ""),
      name: (raw.name as string) || "Main Branch",
      code: (raw.code as string) || "main",
      nostrPubkey: (raw.managerPubkey as string) || undefined,
      address:
        typeof raw.address === "string"
          ? (raw.address as string)
          : [address?.street, address?.city, address?.country]
              .filter(Boolean)
              .join(", ") || undefined,
      status:
        raw.status === "active" || raw.status === "inactive"
          ? (raw.status as "active" | "inactive")
          : "active",
    };
  };

  const isBdgoOsStaff = (data: Record<string, unknown>): boolean => {
    return (
      "companyId" in data &&
      typeof data.companyId === "string" &&
      "branchIds" in data &&
      Array.isArray(data.branchIds)
    );
  };

  const normalizeBdgoOsStaff = (
    raw: Record<string, unknown>,
    event?: Event,
  ): StoreUser => {
    const roleMap: Record<string, string> = {
      owner: "owner",
      admin: "admin",
      manager: "admin",
      cashier: "cashier",
      waiter: "staff",
      staff: "staff",
      viewer: "staff",
    };
    const mappedRole =
      roleMap[(raw.role as string) || ""] || "staff";

    const branchIds = Array.isArray(raw.branchIds)
      ? (raw.branchIds as string[])
      : [];
    const createdAt = (raw.createdAt as number) || Date.now() / 1000;

    return {
      id:
        (raw.id as string) ||
        (event ? getTagVal(event.tags, "d") || "" : ""),
      name:
        (raw.displayName as string) ||
        (raw.name as string) ||
        "Staff",
      email: (raw.email as string) || undefined,
      role: mappedRole as StoreUser["role"],
      permissions: {} as UserPermissions,
      branchId: branchIds[0] || undefined,
      isActive: raw.status === "active",
      avatar: (raw.avatar as string) || undefined,
      createdAt: new Date(createdAt * 1000).toISOString(),
      updatedAt: new Date(
        ((raw.updatedAt as number) || createdAt) * 1000,
      ).toISOString(),
      authMethod: "nostr" as const,
      pubkeyHex: (raw.pubkey as string) || undefined,
      npub: (raw.npub as string) || undefined,
    };
  };

  // ============================================
  // ⚙️ SETTINGS OPERATIONS
  // ============================================

  async function saveSettings(settings: StoreSettings): Promise<Event | null> {
    const company = useCompany();
    const companyTags = await buildCompanyTags();
    const bdgoOsTags: string[][] = [
      ["t", "bdgoos"],
      ["t", "pos"],
      ["t", "organization"],
      ["encrypted", "true"],
    ];
    if (settings.companyName) {
      bdgoOsTags.push(["n", settings.companyName]);
    }
    if (company.companyCode.value) {
      bdgoOsTags.push(["n", company.companyCode.value]);
    }
    return publishReplaceableEvent(
      NOSTR_KINDS.STORE_SETTINGS,
      settings,
      "store-settings",
      [...companyTags, ...bdgoOsTags],
      true,
    );
  }

  async function getSettings(): Promise<StoreSettings | null> {
    const company = useCompany();

    const result = await getReplaceableEvent<Record<string, unknown>>(
      NOSTR_KINDS.STORE_SETTINGS,
      "store-settings",
    );

    if (result?.data) {
      return isBdgoOsSettings(result.data)
        ? normalizeBdgoOsSettings(result.data)
        : (result.data as unknown as StoreSettings);
    }

    if (
      company.hasCompanyCode.value &&
      company.isCompanyCodeEnabled.value &&
      company.companyCodeHash.value
    ) {
      try {
        const cTags = [company.companyCodeHash.value];
        const discoveredIds = await discoverCompanyIdsFromRelay();
        for (const id of discoveredIds) {
          if (!cTags.includes(id)) cTags.push(id);
        }

        const events = await relay.queryEvents({
          kinds: [NOSTR_KINDS.STORE_SETTINGS],
          "#c": cTags,
          limit: 20,
        } as Parameters<typeof relay.queryEvents>[0]);

        for (const event of events) {
          const data = await parseEventContent<Record<string, unknown>>(event);
          if (!data) continue;
          return isBdgoOsSettings(data)
            ? normalizeBdgoOsSettings(data)
            : (data as unknown as StoreSettings);
        }
      } catch (e) {
        console.warn("[NostrData] bdgo-os settings query failed:", e);
      }
    }

    return null;
  }

  // ============================================
  // 🏪 BRANCH OPERATIONS
  // ============================================

  async function saveBranch(branch: Branch): Promise<Event | null> {
    const companyTags = await buildCompanyTags();
    const bdgoOsTags: string[][] = [
      ["t", "bdgoos"],
      ["t", "pos"],
      ["t", "organization"],
      ["b", branch.code],
      ["branch", branch.code],
    ];
    if (branch.nostrPubkey) {
      bdgoOsTags.push(["p", branch.nostrPubkey]);
    }
    return publishReplaceableEvent(NOSTR_KINDS.BRANCH, branch, branch.id, [
      ["name", branch.name],
      ["code", branch.code],
      ...companyTags,
      ...bdgoOsTags,
    ]);
  }

  async function getAllBranches(): Promise<Branch[]> {
    const company = useCompany();
    const seenIds = new Set<string>();
    const branches: Branch[] = [];

    const addBranch = (branch: Branch | null) => {
      if (branch && branch.id && !seenIds.has(branch.id)) {
        seenIds.add(branch.id);
        branches.push(branch);
      }
    };

    const ownResults = await getAllEventsOfKind<Record<string, unknown>>(
      NOSTR_KINDS.BRANCH,
    );
    for (const { event, data } of ownResults) {
      addBranch(
        isBdgoOsBranch(data)
          ? normalizeBdgoOsBranch(data, event)
          : (data as unknown as Branch),
      );
    }

    if (
      company.hasCompanyCode.value &&
      company.isCompanyCodeEnabled.value &&
      company.companyCodeHash.value
    ) {
      try {
        const cTags = [company.companyCodeHash.value];
        const discoveredIds = await discoverCompanyIdsFromRelay();
        for (const id of discoveredIds) {
          if (!cTags.includes(id)) cTags.push(id);
        }

        const events = await relay.queryEvents({
          kinds: [NOSTR_KINDS.BRANCH],
          "#c": cTags,
          limit: 200,
        } as Parameters<typeof relay.queryEvents>[0]);

        for (const event of events) {
          try {
            const data = await parseEventContent<Record<string, unknown>>(event);
            if (!data) continue;
            addBranch(
              isBdgoOsBranch(data)
                ? normalizeBdgoOsBranch(data, event)
                : (data as unknown as Branch),
            );
          } catch {}
        }
      } catch (e) {
        console.warn("[NostrData] bdgo-os branch query failed:", e);
      }
    }

    return branches;
  }

  async function parseEventContent<T>(event: Event): Promise<T | null> {
    try {
      const parsed = JSON.parse(event.content);
      const isBdgoEnvelope =
        parsed.encrypted === true &&
        parsed.scheme === "bdgoos.local-company-key.v1" &&
        parsed.ciphertext;

      if (isBdgoEnvelope) {
        const result = await decryptData<T>(event.content);
        return result;
      }

      const isBnosEncrypted =
        (parsed.v === 1 || parsed.v === 2) && parsed.ct;
      if (isBnosEncrypted) {
        const result = await decryptData<T>(event.content);
        return result;
      }

      return parsed as T;
    } catch {
      return null;
    }
  }

  // ============================================
  // 👤 STAFF OPERATIONS
  // ============================================

  async function saveStaff(staff: StoreUser): Promise<Event | null> {
    const company = useCompany();
    const companyTags = await buildCompanyTags();
    const bdgoOsTags: string[][] = [
      ["t", "bdgoos"],
      ["t", "pos"],
      ["t", "staff"],
    ];
    if (staff.branchId) {
      bdgoOsTags.push(["b", staff.branchId], ["branch", staff.branchId]);
    }
    if (company.companyCode.value) {
      bdgoOsTags.push(["n", company.companyCode.value]);
    }

    return publishReplaceableEvent(
      NOSTR_KINDS.STAFF_MEMBER,
      staff,
      staff.id,
      [
        ["name", staff.name],
        ["role", staff.role],
        staff.pubkeyHex ? ["p", staff.pubkeyHex] : [],
        ...companyTags,
        ...bdgoOsTags,
      ].filter((t) => t.length > 0) as string[][],
    );
  }

  async function getAllStaff(): Promise<StoreUser[]> {
    const company = useCompany();
    const seenIds = new Set<string>();
    const staff: StoreUser[] = [];

    const addStaff = (s: StoreUser | null) => {
      if (s && s.id && !seenIds.has(s.id) && s.isActive) {
        seenIds.add(s.id);
        staff.push(s);
      }
    };

    const ownResults = await getAllEventsOfKind<Record<string, unknown>>(
      NOSTR_KINDS.STAFF_MEMBER,
    );
    for (const { event, data } of ownResults) {
      addStaff(
        isBdgoOsStaff(data)
          ? normalizeBdgoOsStaff(data, event)
          : (data as unknown as StoreUser),
      );
    }

    if (
      company.hasCompanyCode.value &&
      company.isCompanyCodeEnabled.value &&
      company.companyCodeHash.value
    ) {
      try {
        const cTags = [company.companyCodeHash.value];
        const discoveredIds = await discoverCompanyIdsFromRelay();
        for (const id of discoveredIds) {
          if (!cTags.includes(id)) cTags.push(id);
        }

        const events = await relay.queryEvents({
          kinds: [NOSTR_KINDS.STAFF_MEMBER],
          "#c": cTags,
          limit: 200,
        } as Parameters<typeof relay.queryEvents>[0]);

        for (const event of events) {
          try {
            const data = await parseEventContent<Record<string, unknown>>(event);
            if (!data) continue;
            addStaff(
              isBdgoOsStaff(data)
                ? normalizeBdgoOsStaff(data, event)
                : (data as unknown as StoreUser),
            );
          } catch {}
        }
      } catch (e) {
        console.warn("[NostrData] bdgo-os staff query failed:", e);
      }
    }

    return staff;
  }

  /**
   * Fetch staff by company code (for cross-device sync without owner nsec)
   * @param companyCode - The 6-digit company code
   * @param ownerPubkey - The owner's pubkey to query
   */
  async function fetchStaffByCompanyCode(
    companyCode: string,
    ownerPubkey: string,
  ): Promise<StoreUser[]> {
    const company = useCompany();
    const codeHash = await company.hashCompanyCode(companyCode);

    // Query events with company code tag from specific owner
    const filter: Record<string, unknown> = {
      kinds: [NOSTR_KINDS.STAFF_MEMBER],
      authors: [ownerPubkey],
      "#c": [codeHash],
    };

    try {
      const events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0],
      );

      const results: StoreUser[] = [];

      for (const event of events) {
        try {
          const isEncrypted =
            event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";

          let data: StoreUser | null = null;

          if (isEncrypted) {
            // Try to decrypt with company code
            try {
              const payload = JSON.parse(event.content);
              // Check if it's company-code encrypted (v4)
              if (payload.v === 4) {
                data = await company.decryptWithCode<StoreUser>(
                  payload.ct,
                  companyCode,
                );
              } else {
                // Fall back to standard decryption
                data = await decryptData<StoreUser>(event.content);
              }
            } catch {
              data = await decryptData<StoreUser>(event.content);
            }
          } else {
            data = JSON.parse(event.content);
          }

          if (data && data.id && data.isActive) {
            results.push(data);
          }
        } catch (e) {
          console.warn("[NostrData] Failed to parse staff event:", e);
        }
      }

      return results;
    } catch (e) {
      console.error("[NostrData] Failed to fetch staff by company code:", e);
      return [];
    }
  }

  // ============================================
  // 🏪 COMPANY INDEX OPERATIONS
  // ============================================

  /**
   * Publish company index for discovery (unencrypted, public)
   * This allows new devices to find owner pubkey by company code
   */
  async function publishCompanyIndex(
    companyCodeHash: string,
  ): Promise<Event | null> {
    const keys = getUserKeys();
    if (!keys) {
      console.error("[NostrData] No keys available to publish company index");
      return null;
    }

    const companyTags = await buildCompanyTags();

    // Publish unencrypted, public event that maps company code hash → owner pubkey
    const content = JSON.stringify({
      type: "company-index",
      ownerPubkey: keys.pubkey,
      companyCodeHash,
      createdAt: new Date().toISOString(),
    });

    const tags = [
      ["d", companyCodeHash], // Use code hash as d-tag for replaceability
      ...companyTags,
      ["client", "bnos.space"],
    ];

    const event = await createEvent(NOSTR_KINDS.COMPANY_INDEX, content, tags);
    if (!event) return null;

    const success = await relay.publishEvent(event);
    if (!success) {
      error.value = "Failed to publish company index";
      return null;
    }
    return event;
  }

  /**
   * Discover owner pubkey by company code (works without being logged in)
   * Queries public company index events by company code hash
   */
  async function discoverOwnerByCompanyCode(
    companyCode: string,
  ): Promise<string | null> {
    const company = useCompany();
    const codeHash = await company.hashCompanyCode(companyCode);

    const filter = {
      kinds: [NOSTR_KINDS.COMPANY_INDEX],
      "#c": [codeHash],
      limit: 10,
    };

    try {
      const events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0],
      );

      if (events.length === 0) return null;

      const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);
      const event = sortedEvents[0]!;
      const data = JSON.parse(event.content);

      return data.ownerPubkey || event.pubkey;
    } catch (e) {
      console.error("[NostrData] Failed to discover owner:", e);
      return null;
    }
  }

  // ============================================
  // 📦 INVENTORY OPERATIONS
  // ============================================

  interface StockAdjustment {
    id: string;
    productId: string;
    previousStock: number;
    newStock: number;
    adjustment: number;
    reason: "sale" | "purchase" | "adjustment" | "count" | "waste" | "return";
    notes?: string;
    staffId: string;
    createdAt: string;
  }

  async function recordStockAdjustment(
    adjustment: StockAdjustment,
  ): Promise<Event | null> {
    const companyTags = await buildCompanyTags();
    return publishReplaceableEvent(
      NOSTR_KINDS.STOCK_ADJUSTMENT,
      adjustment,
      adjustment.id,
      companyTags,
    );
  }

  async function saveProductActivityLog(log: any): Promise<Event | null> {
    const companyTags = await buildCompanyTags();
    return publishReplaceableEvent(NOSTR_KINDS.AUDIT_LOG, log, log.id, companyTags);
  }

  async function getStockHistory(
    productId: string,
    limit = 50,
  ): Promise<StockAdjustment[]> {
    const allAdjustments = await getAllEventsOfKind<StockAdjustment>(
      NOSTR_KINDS.STOCK_ADJUSTMENT,
      { limit },
    );
    return allAdjustments
      .map((r) => r.data)
      .filter((a) => a.productId === productId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  // ============================================
  // 🔄 SYNC OPERATIONS
  // ============================================

  /**
   * Full sync - fetch all data from relays
   */
  async function fullSync(): Promise<{
    products: number;
    categories: number;
    orders: number;
    customers: number;
  }> {
    isLoading.value = true;
    syncStatus.value = "syncing";
    error.value = null;

    try {
      await importKeyGrantsForCurrentUser();

      const [products, categories, orders, customers] = await Promise.all([
        getAllProducts(),
        getAllCategories(),
        getAllOrders({ limit: 1000 }),
        getAllCustomers(),
      ]);

      syncStatus.value = "synced";
      lastSyncAt.value = new Date().toISOString();

      return {
        products: products.length,
        categories: categories.length,
        orders: orders.length,
        customers: customers.length,
      };
    } catch (e) {
      syncStatus.value = "error";
      error.value = `Sync failed: ${e}`;
      return { products: 0, categories: 0, orders: 0, customers: 0 };
    } finally {
      isLoading.value = false;
    }
  }

  async function subscribeToUpdates(callbacks: {
    onProduct?: (product: Product) => void;
    onOrder?: (order: Order) => void;
    onCustomer?: (customer: LoyaltyMember) => void;
  }) {
    const keys = getUserKeys();
    if (!keys) return null;

    const company = useCompany();

    const filter: Record<string, unknown> = {
      kinds: [NOSTR_KINDS.PRODUCT, NOSTR_KINDS.ORDER, NOSTR_KINDS.CUSTOMER],
      since: Math.floor(Date.now() / 1000) - 300,
    };

    if (company.isCompanyCodeEnabled.value && company.companyCodeHash.value) {
      const cTags = [company.companyCodeHash.value];

      discoverCompanyIdsFromRelay()
        .then((discoveredIds) => {
          for (const id of discoveredIds) {
            if (!cTags.includes(id)) cTags.push(id);
          }
        })
        .catch(() => {});

      filter["#c"] = cTags;
      console.log(
        "[NostrData] Subscribing to team + cross-app updates with company tags:",
        cTags.length,
        "IDs",
      );
    } else {
      filter.authors = [keys.pubkey];
      console.log("[NostrData] Subscribing to personal updates only");
    }

    await relay.subscribeToEvents(
      {
        kinds: [NOSTR_KINDS.COMPANY_KEY_GRANT],
        ["#p"]: [keys.pubkey],
        since: Math.floor(Date.now() / 1000) - 300,
      } as Parameters<typeof relay.subscribeToEvents>[0],
      {
        onevent: async (event) => {
          if (event.kind !== NOSTR_KINDS.COMPANY_KEY_GRANT) return;
          if (!keys.privkey) return;

          try {
            const grant = JSON.parse(event.content) as {
              recipientPubkey: string;
              wrappedKey: string;
              keyId: string;
              revokedAt?: number;
            };
            if (grant.recipientPubkey !== keys.pubkey || grant.revokedAt) return;

            const decryptedBase64Url = await nip44Decrypt(
              event.pubkey,
              grant.wrappedKey,
              keys.privkey,
            );
            const rawKey = fromBase64Url(decryptedBase64Url);
            storeBdgoOsKey(grant.keyId, rawKey);

            console.log(
              "[NostrData] 🔑 Real-time key grant imported:",
              grant.keyId,
            );
          } catch (e) {
            console.warn(
              "[NostrData] Failed to process real-time key grant:",
              e,
            );
          }
        },
      },
    );

    return await relay.subscribeToEvents(
      filter as Parameters<typeof relay.subscribeToEvents>[0],
      {
        onevent: async (event) => {
          const isTeamMode = company.isCompanyCodeEnabled.value;
          if (!isTeamMode && event.pubkey === keys.pubkey) {
            return;
          }

          console.log(
            "[NostrData] 📥 Subscription received event:",
            event.kind,
            "from:",
            event.pubkey.slice(0, 8) + "...",
            "isOwn:",
            event.pubkey === keys.pubkey,
          );

          try {
            const isEncrypted =
              event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";

            let data;
            if (isEncrypted) {
              if (company.isCompanyCodeEnabled.value) {
                try {
                  const payload = JSON.parse(event.content);
                  if (payload.v === 4) {
                    data = await company.decryptWithCode(
                      payload.ct,
                      company.companyCode.value || "",
                    );
                  } else {
                    data = await decryptData(event.content);
                  }
                } catch {
                  data = await decryptData(event.content);
                }
              } else {
                data = await decryptData(event.content);
              }
            } else {
              data = JSON.parse(event.content);
            }

            if (!data) return;

            switch (event.kind) {
              case NOSTR_KINDS.PRODUCT:
                callbacks.onProduct?.(data as Product);
                break;
              case NOSTR_KINDS.ORDER: {
                const record = data as unknown as Record<string, unknown>;
                const order = isBdgoOsOrder(record)
                  ? normalizeBdgoOsOrder(record, event.pubkey)
                  : (data as Order);
                if (order) {
                  console.log(
                    "[NostrData] 📨 Real-time order update received:",
                    order.id?.slice(-8),
                    "source:",
                    isBdgoOsOrder(record) ? "bdgo-os" : "bnos-space",
                  );
                  callbacks.onOrder?.(order);
                }
                break;
              }
              case NOSTR_KINDS.CUSTOMER:
                callbacks.onCustomer?.(data as LoyaltyMember);
                break;
            }
          } catch (e) {
            console.warn(
              "[NostrData] Failed to process subscription event:",
              e,
            );
          }
        },
      },
    );
  }

  return {
    // State
    isLoading,
    error,
    syncStatus,
    lastSyncAt,

    // Core
    encryptData,
    decryptData,
    createEvent,
    publishEvent,
    publishReplaceableEvent,
    queryEvents,
    getReplaceableEvent,
    getAllEventsOfKind,
    getUserKeys,

    // Products
    saveProduct,
    getProduct,
    getAllProducts,
    getProductsForOwner,
    deleteProduct,

    // Categories
    saveCategory,
    getAllCategories,
    getCategoriesForOwner,

    // Units
    saveUnit,
    getAllUnits,

    // Orders
    saveOrder,
    savePayment,
    saveOrderAsAnonymous,
    getOrder,
    getAllOrders,
    getOrdersByStatus,
    getOrdersByCustomer,
    getOrdersByTag,
    getOrdersForStore,

    // Customers
    saveCustomer,
    getCustomer,
    getAllCustomers,

    // Chat Conversations (Legacy NIP-28)
    saveConversation,
    getAllConversations,
    getConversationById,

    // Group Chat (NIP-29)
    generateGroupId,
    publishGroupMetadata,
    publishGroupAdmins,
    publishGroupMembers,
    sendGroupMessage,
    getGroupMetadata,
    getGroupAdmins,
    getGroupMembers,
    getAllGroups,

    // Settings
    saveSettings,
    getSettings,

    // Branches
    saveBranch,
    getAllBranches,

    // Staff
    saveStaff,
    getAllStaff,
    fetchStaffByCompanyCode,

    // Company Index (for cross-device discovery)
    publishCompanyIndex,
    discoverOwnerByCompanyCode,

    // Inventory
    recordStockAdjustment,
    getStockHistory,
    saveProductActivityLog,

    // Kitchen Alerts
    publishKitchenAlert,

    // Sync
    fullSync,
    subscribeToUpdates,

    // Cross-app company discovery
    discoverCompanyIdsFromRelay,
    buildCompanyTags,

    // bdgo-os key grant import
    importKeyGrantsForCurrentUser,
    getBdgoOsKeyIds,

    // Constants
    NOSTR_KINDS,
  };
}
