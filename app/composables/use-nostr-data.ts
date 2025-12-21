// ============================================
// 📡 NOSTR DATA LAYER - ENCRYPTED STORAGE
// Syncs POS data to Nostr relays with NIP-04/44 encryption
// Uses centralized useEncryption module for all crypto operations
// ============================================

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
} from "~/types";

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
// 📋 NOSTR EVENT KINDS FOR POS
// Using parameterized replaceable events (kind 30000-39999)
// ============================================

export const NOSTR_KINDS = {
  // Store Configuration (replaceable, single per pubkey)
  STORE_SETTINGS: 30078, // Store settings & config

  // Catalog Data (parameterized replaceable)
  PRODUCT: 30100, // Individual product
  CATEGORY: 30101, // Product category
  UNIT: 30102, // Unit of measurement
  MODIFIER_GROUP: 30103, // Product modifier groups

  // Transactions (regular events - append only)
  ORDER: 30200, // Order record
  PAYMENT: 30201, // Payment proof
  REFUND: 30202, // Refund record

  // Customer & Loyalty
  CUSTOMER: 30300, // Customer profile
  LOYALTY_POINTS: 30301, // Loyalty points transaction
  LOYALTY_REWARD: 30302, // Reward claim

  // Inventory
  STOCK_ADJUSTMENT: 30400, // Stock adjustment record
  INVENTORY_COUNT: 30401, // Inventory count session

  // Staff & Access
  STAFF_MEMBER: 30500, // Staff profile
  POS_SESSION: 30501, // POS session log
  AUDIT_LOG: 30502, // Audit trail
  COMPANY_INDEX: 30503, // Company code → owner pubkey mapping (public, unencrypted)

  // Branch Management
  BRANCH: 30600, // Branch details
} as const;

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

    // 1. Try nostrUser localStorage (users who logged in with nsec)
    const stored = localStorage.getItem("nostrUser");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        const pubkey = user.pubkey || user.publicKey;
        const privkey = user.privateKey || user.privkey || user.nsec;
        if (pubkey) {
          return { pubkey, privkey: privkey || null };
        }
      } catch {
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
    if (company.companyCode.value) {
      try {
        const encrypted = await company.encryptWithCode(
          data,
          company.companyCode.value
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
            plaintext
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

      // Version 4: Company Code Encryption (cross-device sync)
      if (payload.v === 4 && payload.cc && company.companyCode.value) {
        try {
          const decrypted = await company.decryptWithCode<T>(
            payload.cc,
            company.companyCode.value
          );
          return decrypted;
        } catch (e) {
          console.warn("[NostrData] Company code decrypt failed:", e);
          // Fall through to other methods
        }
      }

      // Version 3: Local AES-256-GCM (no Nostr keys needed)
      if (payload.v === 3 && payload.algorithm === "aes-256-gcm") {
        const result = await encryption.decrypt<T>(payload);
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
            { nostrPrivkey: keys.privkey, nostrPubkey: keys.pubkey }
          );
          return result.success ? result.data || null : null;
        }

        // Version 1: NIP-04
        if (payload.v === 1 || payload.ct) {
          const result = await encryption.decrypt<T>(
            {
              ciphertext: payload.ct,
              algorithm: "nip-04",
              version: 1,
              encryptedAt: "",
            },
            { nostrPrivkey: keys.privkey, nostrPubkey: keys.pubkey }
          );
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
        if (win.nostr?.nip04?.decrypt && (payload.v === 1 || payload.ct)) {
          try {
            const plaintext = await win.nostr.nip04.decrypt(
              keys.pubkey,
              payload.ct
            );
            return JSON.parse(plaintext) as T;
          } catch (e) {
            console.warn("[NostrData] NIP-07 decrypt failed:", e);
            // Fall through
          }
        }
      }

      // Not encrypted, return as-is
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
    tags: string[][] = []
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
        return finalizeEvent(unsignedEvent, hexToBytes(keys.privkey));
      } catch (e) {
        error.value = `Failed to sign event: ${e}`;
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
          return null;
        }
      }
    }

    error.value =
      "No signing method available (no privkey and no NIP-07 extension)";
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
    shouldEncrypt: boolean = true
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
    shouldEncrypt: boolean = true
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
    } = {}
  ): Promise<Event[]> {
    const keys = getUserKeys();

    // IMPORTANT: Always filter by current user's pubkey to avoid getting other users' data
    // If no keys available, return empty array instead of querying all authors
    if (!keys && !options.authors) {
      console.warn(
        "No user keys available and no authors specified - skipping query to avoid fetching other users data"
      );
      return [];
    }

    const filter: Record<string, unknown> = {
      kinds,
      authors: options.authors || [keys!.pubkey],
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
        filter as Parameters<typeof relay.queryEvents>[0]
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
    dTag: string
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
    options: { since?: number; limit?: number } = {}
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

  async function saveProduct(product: Product): Promise<Event | null> {
    return publishReplaceableEvent(NOSTR_KINDS.PRODUCT, product, product.id, [
      ["name", product.name],
      ["sku", product.sku],
      ["category", product.categoryId],
      ["status", product.status],
    ]);
  }

  async function getProduct(id: string): Promise<Product | null> {
    const result = await getReplaceableEvent<Product>(NOSTR_KINDS.PRODUCT, id);
    return result?.data || null;
  }

  async function getAllProducts(): Promise<Product[]> {
    const results = await getAllEventsOfKind<Product>(NOSTR_KINDS.PRODUCT);
    return results.map((r) => r.data);
  }

  async function deleteProduct(id: string): Promise<boolean> {
    // Publish with empty content to mark as deleted
    const event = await publishReplaceableEvent(
      NOSTR_KINDS.PRODUCT,
      { deleted: true, deletedAt: new Date().toISOString() },
      id,
      [["deleted", "true"]]
    );
    return event !== null;
  }

  // ============================================
  // 📁 CATEGORY OPERATIONS
  // ============================================

  async function saveCategory(category: Category): Promise<Event | null> {
    return publishReplaceableEvent(
      NOSTR_KINDS.CATEGORY,
      category,
      category.id,
      [["name", category.name]]
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
    return publishReplaceableEvent(NOSTR_KINDS.UNIT, unit, unit.id, [
      ["name", unit.name],
      ["symbol", unit.symbol],
    ]);
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

  async function saveOrder(order: Order): Promise<Event | null> {
    return publishEvent(
      NOSTR_KINDS.ORDER,
      order,
      [
        ["d", order.id],
        ["status", order.status],
        ["method", order.paymentMethod || "unknown"],
        ["t", order.date],
        ["amount", order.total.toString()],
        order.customerPubkey ? ["p", order.customerPubkey] : [],
      ].filter((t) => t.length > 0) as string[][]
    );
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

  async function getAllOrders(
    options: { since?: number; limit?: number } = {}
  ): Promise<Order[]> {
    const results = await getAllEventsOfKind<Order>(NOSTR_KINDS.ORDER, options);
    // Sort by date descending
    return results
      .map((r) => r.data)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async function getOrdersByStatus(status: string): Promise<Order[]> {
    const allOrders = await getAllOrders();
    return allOrders.filter((o) => o.status === status);
  }

  async function getOrdersByCustomer(customerPubkey: string): Promise<Order[]> {
    const allOrders = await getAllOrders();
    return allOrders.filter((o) => o.customerPubkey === customerPubkey);
  }

  // ============================================
  // 👥 CUSTOMER/LOYALTY OPERATIONS
  // ============================================

  async function saveCustomer(customer: LoyaltyMember): Promise<Event | null> {
    return publishReplaceableEvent(
      NOSTR_KINDS.CUSTOMER,
      customer,
      customer.nostrPubkey,
      [
        ["p", customer.nostrPubkey],
        ["tier", customer.tier],
        ["points", customer.points.toString()],
      ]
    );
  }

  async function getCustomer(pubkey: string): Promise<LoyaltyMember | null> {
    const result = await getReplaceableEvent<LoyaltyMember>(
      NOSTR_KINDS.CUSTOMER,
      pubkey
    );
    return result?.data || null;
  }

  async function getAllCustomers(): Promise<LoyaltyMember[]> {
    const results = await getAllEventsOfKind<LoyaltyMember>(
      NOSTR_KINDS.CUSTOMER
    );
    return results.map((r) => r.data);
  }

  // ============================================
  // ⚙️ SETTINGS OPERATIONS
  // ============================================

  async function saveSettings(settings: StoreSettings): Promise<Event | null> {
    return publishReplaceableEvent(
      NOSTR_KINDS.STORE_SETTINGS,
      settings,
      "store-settings",
      [],
      true // Always encrypt settings
    );
  }

  async function getSettings(): Promise<StoreSettings | null> {
    const result = await getReplaceableEvent<StoreSettings>(
      NOSTR_KINDS.STORE_SETTINGS,
      "store-settings"
    );
    return result?.data || null;
  }

  // ============================================
  // 🏪 BRANCH OPERATIONS
  // ============================================

  async function saveBranch(branch: Branch): Promise<Event | null> {
    return publishReplaceableEvent(NOSTR_KINDS.BRANCH, branch, branch.id, [
      ["name", branch.name],
      ["code", branch.code],
    ]);
  }

  async function getAllBranches(): Promise<Branch[]> {
    const results = await getAllEventsOfKind<Branch>(NOSTR_KINDS.BRANCH);
    return results.map((r) => r.data);
  }

  // ============================================
  // 👤 STAFF OPERATIONS
  // ============================================

  async function saveStaff(staff: StoreUser): Promise<Event | null> {
    // Get company code hash for tagging (if available)
    const company = useCompany();
    const companyTag = company.companyCodeHash.value
      ? ["c", company.companyCodeHash.value]
      : [];

    return publishReplaceableEvent(
      NOSTR_KINDS.STAFF_MEMBER,
      staff,
      staff.id,
      [
        ["name", staff.name],
        ["role", staff.role],
        staff.pubkeyHex ? ["p", staff.pubkeyHex] : [],
        companyTag,
      ].filter((t) => t.length > 0) as string[][]
    );
  }

  async function getAllStaff(): Promise<StoreUser[]> {
    const results = await getAllEventsOfKind<StoreUser>(
      NOSTR_KINDS.STAFF_MEMBER
    );
    return results.map((r) => r.data).filter((s) => s.isActive);
  }

  /**
   * Fetch staff by company code (for cross-device sync without owner nsec)
   * @param companyCode - The 6-digit company code
   * @param ownerPubkey - The owner's pubkey to query
   */
  async function fetchStaffByCompanyCode(
    companyCode: string,
    ownerPubkey: string
  ): Promise<StoreUser[]> {
    const company = useCompany();
    const codeHash = await company.hashCompanyCode(companyCode);

    console.log(
      "[NostrData] Fetching staff by company code hash:",
      codeHash.slice(0, 8)
    );

    // Query events with company code tag from specific owner
    const filter: Record<string, unknown> = {
      kinds: [NOSTR_KINDS.STAFF_MEMBER],
      authors: [ownerPubkey],
      "#c": [codeHash],
    };

    try {
      const events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0]
      );
      console.log(
        "[NostrData] Found",
        events.length,
        "staff events with company code"
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
                  companyCode
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
    companyCodeHash: string
  ): Promise<Event | null> {
    const keys = getUserKeys();
    if (!keys) {
      console.error("[NostrData] No keys available to publish company index");
      return null;
    }

    // Publish unencrypted, public event that maps company code hash → owner pubkey
    const content = JSON.stringify({
      type: "company-index",
      ownerPubkey: keys.pubkey,
      companyCodeHash,
      createdAt: new Date().toISOString(),
    });

    const tags = [
      ["d", companyCodeHash], // Use code hash as d-tag for replaceability
      ["c", companyCodeHash], // Also as c-tag for filtering
      ["client", "bitspace-pos"],
    ];

    const event = await createEvent(NOSTR_KINDS.COMPANY_INDEX, content, tags);
    if (!event) return null;

    const success = await relay.publishEvent(event);
    if (!success) {
      error.value = "Failed to publish company index";
      return null;
    }

    console.log(
      "[NostrData] Published company index:",
      companyCodeHash.slice(0, 8)
    );
    return event;
  }

  /**
   * Discover owner pubkey by company code (works without being logged in)
   * Queries public company index events by company code hash
   */
  async function discoverOwnerByCompanyCode(
    companyCode: string
  ): Promise<string | null> {
    const company = useCompany();
    const codeHash = await company.hashCompanyCode(companyCode);

    console.log(
      "[NostrData] Discovering owner by company code hash:",
      codeHash.slice(0, 8)
    );

    // Query public events with company code tag - NO author filter since we don't know who owns it
    const filter = {
      kinds: [NOSTR_KINDS.COMPANY_INDEX],
      "#c": [codeHash],
      limit: 1,
    };

    try {
      const events = await relay.queryEvents(
        filter as Parameters<typeof relay.queryEvents>[0]
      );

      if (events.length === 0) {
        console.log("[NostrData] No company index found for code");
        return null;
      }

      const event = events[0]!;
      const data = JSON.parse(event.content);

      if (data.ownerPubkey) {
        console.log(
          "[NostrData] Found owner pubkey:",
          data.ownerPubkey.slice(0, 8)
        );
        return data.ownerPubkey;
      }

      // Fallback: use event author as owner
      return event.pubkey;
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
    adjustment: StockAdjustment
  ): Promise<Event | null> {
    return publishEvent(NOSTR_KINDS.STOCK_ADJUSTMENT, adjustment, [
      ["d", adjustment.id],
      ["product", adjustment.productId],
      ["reason", adjustment.reason],
      ["adjustment", adjustment.adjustment.toString()],
    ]);
  }

  async function getStockHistory(
    productId: string,
    limit = 50
  ): Promise<StockAdjustment[]> {
    const allAdjustments = await getAllEventsOfKind<StockAdjustment>(
      NOSTR_KINDS.STOCK_ADJUSTMENT,
      { limit }
    );
    return allAdjustments
      .map((r) => r.data)
      .filter((a) => a.productId === productId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

  /**
   * Subscribe to real-time updates
   */
  function subscribeToUpdates(callbacks: {
    onProduct?: (product: Product) => void;
    onOrder?: (order: Order) => void;
    onCustomer?: (customer: LoyaltyMember) => void;
  }) {
    const keys = getUserKeys();
    if (!keys) return null;

    const filter = {
      kinds: [NOSTR_KINDS.PRODUCT, NOSTR_KINDS.ORDER, NOSTR_KINDS.CUSTOMER],
      authors: [keys.pubkey],
      since: Math.floor(Date.now() / 1000),
    };

    return relay.subscribeToEvents(
      filter as Parameters<typeof relay.subscribeToEvents>[0],
      {
        onevent: async (event) => {
          const isEncrypted =
            event.tags.find((t) => t[0] === "encrypted")?.[1] === "true";
          const data = isEncrypted
            ? await decryptData(event.content)
            : JSON.parse(event.content);

          if (!data) return;

          switch (event.kind) {
            case NOSTR_KINDS.PRODUCT:
              callbacks.onProduct?.(data as Product);
              break;
            case NOSTR_KINDS.ORDER:
              callbacks.onOrder?.(data as Order);
              break;
            case NOSTR_KINDS.CUSTOMER:
              callbacks.onCustomer?.(data as LoyaltyMember);
              break;
          }
        },
      }
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

    // Products
    saveProduct,
    getProduct,
    getAllProducts,
    deleteProduct,

    // Categories
    saveCategory,
    getAllCategories,

    // Units
    saveUnit,
    getAllUnits,

    // Orders
    saveOrder,
    getOrder,
    getAllOrders,
    getOrdersByStatus,
    getOrdersByCustomer,

    // Customers
    saveCustomer,
    getCustomer,
    getAllCustomers,

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

    // Sync
    fullSync,
    subscribeToUpdates,

    // Constants
    NOSTR_KINDS,
  };
}
