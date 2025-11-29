// ============================================
// 📡 NOSTR DATA LAYER - ENCRYPTED STORAGE
// Syncs POS data to Nostr relays with NIP-04/44 encryption
// ============================================

import { nip04, nip44, finalizeEvent, type UnsignedEvent, type Event } from 'nostr-tools';
import type { 
  Product, 
  Category, 
  Unit, 
  Order, 
  LoyaltyMember,
  Branch,
  StoreSettings,
  StoreUser,
} from '~/types';

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
  STORE_SETTINGS: 30078,        // Store settings & config
  
  // Catalog Data (parameterized replaceable)
  PRODUCT: 30100,               // Individual product
  CATEGORY: 30101,              // Product category
  UNIT: 30102,                  // Unit of measurement
  MODIFIER_GROUP: 30103,        // Product modifier groups
  
  // Transactions (regular events - append only)
  ORDER: 30200,                 // Order record
  PAYMENT: 30201,               // Payment proof
  REFUND: 30202,                // Refund record
  
  // Customer & Loyalty
  CUSTOMER: 30300,              // Customer profile
  LOYALTY_POINTS: 30301,        // Loyalty points transaction
  LOYALTY_REWARD: 30302,        // Reward claim
  
  // Inventory
  STOCK_ADJUSTMENT: 30400,      // Stock adjustment record
  INVENTORY_COUNT: 30401,       // Inventory count session
  
  // Staff & Access
  STAFF_MEMBER: 30500,          // Staff profile
  POS_SESSION: 30501,           // POS session log
  AUDIT_LOG: 30502,             // Audit trail
  
  // Branch Management
  BRANCH: 30600,                // Branch details
} as const;

// ============================================
// 🔑 ENCRYPTION HELPERS
// ============================================

interface EncryptedPayload {
  v: number;           // Version (1 = NIP-04, 2 = NIP-44)
  ct: string;          // Ciphertext
  iv?: string;         // IV for NIP-04
}

export function useNostrData() {
  const relay = useNostrRelay();
  // useSecurity() - for future encrypted local storage
  // useNuxtApp().$nostr - for direct nostr access
  
  // State
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const syncStatus = ref<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const lastSyncAt = ref<string | null>(null);

  // Get current user's keys
  const getUserKeys = (): { pubkey: string; privkey: string } | null => {
    if (!import.meta.client) return null;
    
    const stored = localStorage.getItem('nostrUser');
    if (!stored) return null;
    
    try {
      const user = JSON.parse(stored);
      return {
        pubkey: user.pubkey || user.publicKey,
        privkey: user.privkey || user.privateKey || user.nsec,
      };
    } catch {
      return null;
    }
  };

  // ============================================
  // 🔐 ENCRYPTION/DECRYPTION
  // ============================================

  /**
   * Encrypt data for storage (self-encryption using own keys)
   * Uses NIP-44 if available, falls back to NIP-04
   */
  async function encryptData(data: unknown): Promise<string> {
    const keys = getUserKeys();
    if (!keys) {
      // Store unencrypted if no keys (will be encrypted locally by useSecurity)
      return JSON.stringify(data);
    }

    const plaintext = JSON.stringify(data);
    
    try {
      // Try NIP-44 first (more secure)
      if (nip44?.encrypt && nip44?.getConversationKey) {
        // Convert hex privkey to bytes if needed
        const privkeyBytes = typeof keys.privkey === 'string' 
          ? hexToBytes(keys.privkey) 
          : keys.privkey;
        const pubkeyBytes = typeof keys.pubkey === 'string'
          ? hexToBytes(keys.pubkey)
          : keys.pubkey;
        const conversationKey = nip44.getConversationKey(privkeyBytes as Uint8Array, pubkeyBytes as unknown as string);
        const ciphertext = nip44.encrypt(plaintext, conversationKey);
        const payload: EncryptedPayload = { v: 2, ct: ciphertext };
        return JSON.stringify(payload);
      }
    } catch {
      // Fall through to NIP-04
    }

    // Fallback to NIP-04
    const ciphertext = await nip04.encrypt(keys.privkey, keys.pubkey, plaintext);
    const payload: EncryptedPayload = { v: 1, ct: ciphertext };
    return JSON.stringify(payload);
  }

  /**
   * Decrypt data from storage
   */
  async function decryptData<T>(encrypted: string): Promise<T | null> {
    const keys = getUserKeys();
    if (!keys) return null;

    try {
      // Try to parse as encrypted payload
      const payload: EncryptedPayload = JSON.parse(encrypted);
      
      if (payload.v === 2 && nip44?.decrypt && nip44?.getConversationKey) {
        // NIP-44
        const privkeyBytes = typeof keys.privkey === 'string' 
          ? hexToBytes(keys.privkey) 
          : keys.privkey;
        const pubkeyBytes = typeof keys.pubkey === 'string'
          ? hexToBytes(keys.pubkey)
          : keys.pubkey;
        const conversationKey = nip44.getConversationKey(privkeyBytes as Uint8Array, pubkeyBytes as unknown as string);
        const plaintext = nip44.decrypt(payload.ct, conversationKey);
        return JSON.parse(plaintext);
      } else if (payload.v === 1 || payload.ct) {
        // NIP-04
        const plaintext = await nip04.decrypt(keys.privkey, keys.pubkey, payload.ct);
        return JSON.parse(plaintext);
      }
      
      // Not encrypted, parse directly
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
   */
  async function createEvent(
    kind: number,
    content: string,
    tags: string[][] = []
  ): Promise<Event | null> {
    const keys = getUserKeys();
    if (!keys) {
      error.value = 'No Nostr keys available';
      return null;
    }

    const unsignedEvent: UnsignedEvent = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
      pubkey: keys.pubkey,
    };

    try {
      return finalizeEvent(unsignedEvent, keys.privkey as unknown as Uint8Array);
    } catch (e) {
      error.value = `Failed to sign event: ${e}`;
      return null;
    }
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
      ['d', dTag],
      ['encrypted', shouldEncrypt ? 'true' : 'false'],
      ...extraTags,
    ];

    const event = await createEvent(kind, content, tags);
    if (!event) return null;

    const success = await relay.publishEvent(event);
    if (!success) {
      error.value = 'Failed to publish event';
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

    const encryptedTag = [['encrypted', shouldEncrypt ? 'true' : 'false']];
    
    const event = await createEvent(kind, content, [...tags, ...encryptedTag]);
    if (!event) return null;

    const success = await relay.publishEvent(event);
    if (!success) {
      error.value = 'Failed to publish event';
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
    const filter: Record<string, unknown> = {
      kinds,
      authors: options.authors || (keys ? [keys.pubkey] : undefined),
    };

    if (options.dTags) {
      filter['#d'] = options.dTags;
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
      return await relay.queryEvents(filter as Parameters<typeof relay.queryEvents>[0]);
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
    const isEncrypted = event.tags.find(t => t[0] === 'encrypted')?.[1] === 'true';
    
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
      const isEncrypted = event.tags.find(t => t[0] === 'encrypted')?.[1] === 'true';
      const data = isEncrypted 
        ? await decryptData<T>(event.content)
        : JSON.parse(event.content);

      if (data) {
        results.push({ event, data });
      }
    }

    return results;
  }

  // ============================================
  // 🛍️ PRODUCT OPERATIONS
  // ============================================

  async function saveProduct(product: Product): Promise<Event | null> {
    return publishReplaceableEvent(
      NOSTR_KINDS.PRODUCT,
      product,
      product.id,
      [
        ['name', product.name],
        ['sku', product.sku],
        ['category', product.categoryId],
        ['status', product.status],
      ]
    );
  }

  async function getProduct(id: string): Promise<Product | null> {
    const result = await getReplaceableEvent<Product>(NOSTR_KINDS.PRODUCT, id);
    return result?.data || null;
  }

  async function getAllProducts(): Promise<Product[]> {
    const results = await getAllEventsOfKind<Product>(NOSTR_KINDS.PRODUCT);
    return results.map(r => r.data);
  }

  async function deleteProduct(id: string): Promise<boolean> {
    // Publish with empty content to mark as deleted
    const event = await publishReplaceableEvent(
      NOSTR_KINDS.PRODUCT,
      { deleted: true, deletedAt: new Date().toISOString() },
      id,
      [['deleted', 'true']]
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
      [['name', category.name]]
    );
  }

  async function getAllCategories(): Promise<Category[]> {
    const results = await getAllEventsOfKind<Category>(NOSTR_KINDS.CATEGORY);
    return results.map(r => r.data).filter(c => !(c as Category & { deleted?: boolean }).deleted);
  }

  // ============================================
  // 📐 UNIT OPERATIONS
  // ============================================

  async function saveUnit(unit: Unit): Promise<Event | null> {
    return publishReplaceableEvent(
      NOSTR_KINDS.UNIT,
      unit,
      unit.id,
      [['name', unit.name], ['symbol', unit.symbol]]
    );
  }

  async function getAllUnits(): Promise<Unit[]> {
    const results = await getAllEventsOfKind<Unit>(NOSTR_KINDS.UNIT);
    return results.map(r => r.data).filter(u => !(u as Unit & { deleted?: boolean }).deleted);
  }

  // ============================================
  // 🧾 ORDER OPERATIONS
  // ============================================

  async function saveOrder(order: Order): Promise<Event | null> {
    return publishEvent(
      NOSTR_KINDS.ORDER,
      order,
      [
        ['d', order.id],
        ['status', order.status],
        ['method', order.paymentMethod || 'unknown'],
        ['t', order.date],
        ['amount', order.total.toString()],
        order.customerPubkey ? ['p', order.customerPubkey] : [],
      ].filter(t => t.length > 0) as string[][]
    );
  }

  async function getOrder(id: string): Promise<Order | null> {
    const events = await queryEvents([NOSTR_KINDS.ORDER], { dTags: [id], limit: 1 });
    if (events.length === 0) return null;

    const event = events[0]!;
    const isEncrypted = event.tags.find(t => t[0] === 'encrypted')?.[1] === 'true';
    
    return isEncrypted 
      ? await decryptData<Order>(event.content)
      : JSON.parse(event.content);
  }

  async function getAllOrders(options: { since?: number; limit?: number } = {}): Promise<Order[]> {
    const results = await getAllEventsOfKind<Order>(NOSTR_KINDS.ORDER, options);
    // Sort by date descending
    return results
      .map(r => r.data)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async function getOrdersByStatus(status: string): Promise<Order[]> {
    const allOrders = await getAllOrders();
    return allOrders.filter(o => o.status === status);
  }

  async function getOrdersByCustomer(customerPubkey: string): Promise<Order[]> {
    const allOrders = await getAllOrders();
    return allOrders.filter(o => o.customerPubkey === customerPubkey);
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
        ['p', customer.nostrPubkey],
        ['tier', customer.tier],
        ['points', customer.points.toString()],
      ]
    );
  }

  async function getCustomer(pubkey: string): Promise<LoyaltyMember | null> {
    const result = await getReplaceableEvent<LoyaltyMember>(NOSTR_KINDS.CUSTOMER, pubkey);
    return result?.data || null;
  }

  async function getAllCustomers(): Promise<LoyaltyMember[]> {
    const results = await getAllEventsOfKind<LoyaltyMember>(NOSTR_KINDS.CUSTOMER);
    return results.map(r => r.data);
  }

  // ============================================
  // ⚙️ SETTINGS OPERATIONS
  // ============================================

  async function saveSettings(settings: StoreSettings): Promise<Event | null> {
    return publishReplaceableEvent(
      NOSTR_KINDS.STORE_SETTINGS,
      settings,
      'store-settings',
      [],
      true // Always encrypt settings
    );
  }

  async function getSettings(): Promise<StoreSettings | null> {
    const result = await getReplaceableEvent<StoreSettings>(NOSTR_KINDS.STORE_SETTINGS, 'store-settings');
    return result?.data || null;
  }

  // ============================================
  // 🏪 BRANCH OPERATIONS
  // ============================================

  async function saveBranch(branch: Branch): Promise<Event | null> {
    return publishReplaceableEvent(
      NOSTR_KINDS.BRANCH,
      branch,
      branch.id,
      [['name', branch.name], ['code', branch.code]]
    );
  }

  async function getAllBranches(): Promise<Branch[]> {
    const results = await getAllEventsOfKind<Branch>(NOSTR_KINDS.BRANCH);
    return results.map(r => r.data);
  }

  // ============================================
  // 👤 STAFF OPERATIONS
  // ============================================

  async function saveStaff(staff: StoreUser): Promise<Event | null> {
    return publishReplaceableEvent(
      NOSTR_KINDS.STAFF_MEMBER,
      staff,
      staff.id,
      [
        ['name', staff.name],
        ['role', staff.role],
        staff.nostrPubkey ? ['p', staff.nostrPubkey] : [],
      ].filter(t => t.length > 0) as string[][]
    );
  }

  async function getAllStaff(): Promise<StoreUser[]> {
    const results = await getAllEventsOfKind<StoreUser>(NOSTR_KINDS.STAFF_MEMBER);
    return results.map(r => r.data).filter(s => s.isActive);
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
    reason: 'sale' | 'purchase' | 'adjustment' | 'count' | 'waste' | 'return';
    notes?: string;
    staffId: string;
    createdAt: string;
  }

  async function recordStockAdjustment(adjustment: StockAdjustment): Promise<Event | null> {
    return publishEvent(
      NOSTR_KINDS.STOCK_ADJUSTMENT,
      adjustment,
      [
        ['d', adjustment.id],
        ['product', adjustment.productId],
        ['reason', adjustment.reason],
        ['adjustment', adjustment.adjustment.toString()],
      ]
    );
  }

  async function getStockHistory(productId: string, limit = 50): Promise<StockAdjustment[]> {
    const allAdjustments = await getAllEventsOfKind<StockAdjustment>(
      NOSTR_KINDS.STOCK_ADJUSTMENT, 
      { limit }
    );
    return allAdjustments
      .map(r => r.data)
      .filter(a => a.productId === productId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    syncStatus.value = 'syncing';
    error.value = null;

    try {
      const [products, categories, orders, customers] = await Promise.all([
        getAllProducts(),
        getAllCategories(),
        getAllOrders({ limit: 1000 }),
        getAllCustomers(),
      ]);

      syncStatus.value = 'synced';
      lastSyncAt.value = new Date().toISOString();

      return {
        products: products.length,
        categories: categories.length,
        orders: orders.length,
        customers: customers.length,
      };
    } catch (e) {
      syncStatus.value = 'error';
      error.value = `Sync failed: ${e}`;
      return { products: 0, categories: 0, orders: 0, customers: 0 };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Subscribe to real-time updates
   */
  function subscribeToUpdates(
    callbacks: {
      onProduct?: (product: Product) => void;
      onOrder?: (order: Order) => void;
      onCustomer?: (customer: LoyaltyMember) => void;
    }
  ) {
    const keys = getUserKeys();
    if (!keys) return null;

    const filter = {
      kinds: [NOSTR_KINDS.PRODUCT, NOSTR_KINDS.ORDER, NOSTR_KINDS.CUSTOMER],
      authors: [keys.pubkey],
      since: Math.floor(Date.now() / 1000),
    };

    return relay.subscribeToEvents(filter as Parameters<typeof relay.subscribeToEvents>[0], {
      onevent: async (event) => {
        const isEncrypted = event.tags.find(t => t[0] === 'encrypted')?.[1] === 'true';
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
    });
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
