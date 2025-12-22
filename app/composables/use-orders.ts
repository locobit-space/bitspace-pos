// ============================================
// 🧾 ORDERS COMPOSABLE
// Order Management with Dexie + Nostr Sync
// + Auto Ingredient Deduction
// ============================================

import type {
  Order,
  PaymentStatus,
  PaymentMethod,
  CurrencyCode,
} from "~/types";
import { db, type LocalOrder } from "~/db/db";

// Singleton state
const orders = ref<Order[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const syncPending = ref(0);

export function useOrders() {
  const nostrData = useNostrData();
  const offline = useOffline();

  // Lazy load recipes to avoid circular dependency
  const getRecipesStore = () => {
    try {
      return useRecipes();
    } catch {
      return null;
    }
  };
  
  // Get current user's pubkey for store order queries
  const getUserPubkey = (): string | null => {
    if (!import.meta.client) return null;
    const nostrPubkeyCookie = useCookie("nostr-pubkey");
    return nostrPubkeyCookie.value || null;
  };

  // ============================================
  // 📊 COMPUTED
  // ============================================

  const pendingOrders = computed(() =>
    orders.value.filter((o) => o.status === "pending")
  );

  const completedOrders = computed(() =>
    orders.value.filter((o) => o.status === "completed")
  );

  const todayOrders = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.value.filter((o) => new Date(o.date) >= today);
  });

  const todayTotal = computed(() =>
    todayOrders.value.reduce((sum, o) => sum + o.total, 0)
  );

  const todayTotalSats = computed(() =>
    todayOrders.value.reduce((sum, o) => sum + (o.totalSats || 0), 0)
  );

  // ============================================
  // 📥 LOAD OPERATIONS
  // ============================================

  /**
   * Load orders from local DB
   */
  async function loadFromLocal(): Promise<Order[]> {
    try {
      const localOrders = await db.localOrders
        .orderBy("createdAt")
        .reverse()
        .limit(500)
        .toArray();

      return localOrders.map((lo) => JSON.parse(lo.data) as Order);
    } catch (e) {
      console.error("Failed to load orders from local DB:", e);
      return [];
    }
  }

  /**
   * Load orders from Nostr
   */
  async function loadFromNostr(
    options: { since?: number; limit?: number } = {}
  ): Promise<Order[]> {
    try {
      return await nostrData.getAllOrders(options);
    } catch (e) {
      console.error("Failed to load orders from Nostr:", e);
      return [];
    }
  }

  /**
   * Initialize - load from local first, then sync with Nostr
   */
  async function init(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // Load from local DB first (fast)
      orders.value = await loadFromLocal();

      // Check for pending orders from customer order pages (localStorage broadcast)
      await pickupPendingCustomerOrders();

      // Then sync with Nostr if online
      if (offline.isOnline.value) {
        await syncWithNostr();
      }

      // Count pending syncs
      const pending = await db.localOrders.where("syncedAt").equals(0).count();
      syncPending.value = pending;

      // Listen for new orders from customer tabs (same browser)
      if (import.meta.client) {
        window.addEventListener('storage', handleStorageEvent);
        window.addEventListener('bitspace-new-order', handleNewOrderEvent as EventListener);
      }
    } catch (e) {
      error.value = `Failed to initialize orders: ${e}`;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Pick up pending orders from localStorage (broadcast by customer order pages)
   */
  async function pickupPendingCustomerOrders(): Promise<void> {
    if (!import.meta.client) return;
    
    const PENDING_ORDERS_KEY = "bitspace_pending_orders";
    try {
      const stored = localStorage.getItem(PENDING_ORDERS_KEY);
      if (!stored) return;
      
      const pendingOrders: Order[] = JSON.parse(stored);
      let importedCount = 0;
      
      for (const order of pendingOrders) {
        // Check if order already exists
        const exists = orders.value.find(o => o.id === order.id);
        if (!exists) {
          // Add to state and save to local DB
          orders.value.unshift(order);
          await saveToLocal(order);
          importedCount++;
          
          // Try to sync to Nostr
          if (offline.isOnline.value) {
            saveToNostr(order).catch(() => {});
          }
        }
      }
      
      // Clear pending orders after pickup
      if (importedCount > 0) {
        localStorage.removeItem(PENDING_ORDERS_KEY);
      }
    } catch (e) {
      console.error("Failed to pickup pending customer orders:", e);
    }
  }

  /**
   * Handle storage event from other tabs
   */
  function handleStorageEvent(event: StorageEvent): void {
    if (event.key === "bitspace_pending_orders" && event.newValue) {
      pickupPendingCustomerOrders();
    }
  }

  /**
   * Handle custom event from same tab
   */
  function handleNewOrderEvent(event: CustomEvent<Order>): void {
    const order = event.detail;
    const exists = orders.value.find(o => o.id === order.id);
    if (!exists) {
      orders.value.unshift(order);
      saveToLocal(order);
    }
  }

  // ============================================
  // 💾 SAVE OPERATIONS
  // ============================================

  /**
   * Save order to local DB
   */
  async function saveToLocal(order: Order): Promise<void> {
    if (!order.id) return; // Skip invalid orders
    const localOrder: LocalOrder = {
      id: order.id,
      data: JSON.stringify(order),
      status: order.status,
      paymentMethod: order.paymentMethod || "unknown",
      total: order.total,
      totalSats: order.totalSats || 0,
      createdAt: new Date(order.date).getTime(),
      syncedAt: 0, // Not synced yet
    };

    await db.localOrders.put(localOrder);
  }

  /**
   * Save order to Nostr
   */
  async function saveToNostr(order: Order): Promise<boolean> {
    try {
      const event = await nostrData.saveOrder(order);
      if (event) {
        // Update local record with nostr event ID
        await db.localOrders.update(order.id, {
          syncedAt: Date.now(),
          nostrEventId: event.id,
        });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to save order to Nostr:", e);
      return false;
    }
  }

  /**
   * Create new order
   * Local save is awaited (critical), Nostr sync is fire-and-forget (resilient)
   */
  async function createOrder(order: Order): Promise<Order> {
    // Add to state immediately
    orders.value.unshift(order);

    // Save to local DB first (critical - must complete)
    await saveToLocal(order);

    // Queue for Nostr sync (fire-and-forget - will retry if failed)
    syncPending.value++;

    // Trigger background sync without blocking
    if (offline.isOnline.value) {
      saveToNostr(order)
        .then((synced) => {
          if (synced) {
            syncPending.value = Math.max(0, syncPending.value - 1);
          }
        })
        .catch((e) => {
          console.warn("[Orders] Background sync failed, will retry:", e);
        });
    }

    return order;
  }

  /**
   * Update order status
   */
  async function updateOrderStatus(
    orderId: string,
    status: PaymentStatus,
    additionalData?: Partial<Order>
  ): Promise<Order | null> {
    const index = orders.value.findIndex((o) => o.id === orderId);
    if (index === -1) return null;

    const order = orders.value[index]!;
    const updatedOrder: Order = {
      ...order,
      ...additionalData,
      status,
    };

    orders.value[index] = updatedOrder;

    // Update local DB
    await saveToLocal(updatedOrder);

    // Sync to Nostr
    if (offline.isOnline.value) {
      await saveToNostr(updatedOrder);
    }

    return updatedOrder;
  }

  /**
   * Complete order with payment proof
   * Auto-deducts ingredients if recipe exists
   */
  async function completeOrder(
    orderId: string,
    paymentMethod: PaymentMethod,
    paymentProof?: {
      paymentHash?: string;
      preimage?: string;
    }
  ): Promise<Order | null> {
    const order = orders.value.find((o) => o.id === orderId);
    if (!order) return null;

    // Try to deduct ingredients for items with recipes
    const recipesStore = getRecipesStore();
    if (recipesStore) {
      for (const item of order.items) {
        await recipesStore.deductIngredientsForSale(
          item.productId,
          item.quantity,
          orderId
        );
      }
    }

    return updateOrderStatus(orderId, "completed", {
      paymentMethod,
      paymentProof: paymentProof
        ? {
            id: `proof_${Date.now()}`,
            orderId,
            paymentHash: paymentProof.paymentHash || "",
            preimage: paymentProof.preimage || "",
            amount: 0,
            receivedAt: new Date().toISOString(),
            method: paymentMethod,
            isOffline: !offline.isOnline.value,
          }
        : undefined,
    });
  }

  /**
   * Void/cancel order
   */
  async function voidOrder(
    orderId: string,
    reason?: string
  ): Promise<Order | null> {
    return updateOrderStatus(orderId, "failed", {
      notes: reason ? `Voided: ${reason}` : "Order voided",
    });
  }

  /**
   * Refund order
   */
  async function refundOrder(
    orderId: string,
    reason?: string
  ): Promise<Order | null> {
    return updateOrderStatus(orderId, "refunded", {
      notes: reason ? `Refunded: ${reason}` : "Order refunded",
    });
  }

  /**
   * Delete order (local only, marks as deleted in Nostr)
   */
  async function deleteOrder(orderId: string): Promise<boolean> {
    try {
      // Remove from local state
      const index = orders.value.findIndex((o) => o.id === orderId);
      if (index !== -1) {
        orders.value.splice(index, 1);
      }

      // Remove from local DB
      await db.localOrders.delete(orderId);

      // TODO: In Nostr, we could publish a deletion event
      // For now, just remove locally

      return true;
    } catch (e) {
      console.error("Failed to delete order:", e);
      error.value = "Failed to delete order";
      return false;
    }
  }

  // ============================================
  // 🔄 SYNC OPERATIONS
  // ============================================

  /**
   * Sync local orders with Nostr
   */
  async function syncWithNostr(): Promise<number> {
    let synced = 0;

    try {
      // Get unsynced orders
      const unsyncedOrders = await db.localOrders
        .filter((o) => !o.syncedAt || o.syncedAt === 0)
        .toArray();

      for (const localOrder of unsyncedOrders) {
        const order = JSON.parse(localOrder.data) as Order;
        const success = await saveToNostr(order);
        if (success) {
          synced++;
        }
      }

      // Fetch new orders from Nostr
      const lastSynced = await db.localOrders
        .orderBy("createdAt")
        .reverse()
        .first();

      const since = lastSynced
        ? Math.floor(lastSynced.createdAt / 1000) - 3600 // 1 hour buffer
        : undefined;

      const nostrOrders = await loadFromNostr({ since });

      // Merge with local
      for (const nostrOrder of nostrOrders) {
        const exists = orders.value.find((o) => o.id === nostrOrder.id);
        if (!exists) {
          orders.value.push(nostrOrder);
          await saveToLocal(nostrOrder);
        }
      }
      
      // Also fetch customer orders tagged to this store (via #p tag)
      // This gets orders from customers who scanned QR and used ephemeral keys
      const userPubkey = getUserPubkey();
      if (userPubkey) {
        const storeOrders = await nostrData.getOrdersForStore(userPubkey);
        for (const storeOrder of storeOrders) {
          const exists = orders.value.find((o) => o.id === storeOrder.id);
          if (!exists) {
            orders.value.push(storeOrder);
            await saveToLocal(storeOrder);
          }
        }
      }

      // Sort by date
      orders.value.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      syncPending.value = Math.max(0, syncPending.value - synced);
      return synced;
    } catch (e) {
      console.error("Sync failed:", e);
      return 0;
    }
  }

  /**
   * Force sync all pending orders
   */
  async function forceSyncAll(): Promise<{ synced: number; failed: number }> {
    isLoading.value = true;
    let synced = 0;
    let failed = 0;

    try {
      const unsyncedOrders = await db.localOrders
        .filter((o) => !o.syncedAt || o.syncedAt === 0)
        .toArray();

      for (const localOrder of unsyncedOrders) {
        const order = JSON.parse(localOrder.data) as Order;
        const success = await saveToNostr(order);
        if (success) {
          synced++;
        } else {
          failed++;
        }
      }

      syncPending.value = failed;
    } finally {
      isLoading.value = false;
    }

    return { synced, failed };
  }

  // ============================================
  // 🔍 QUERY OPERATIONS
  // ============================================

  /**
   * Get order by ID
   */
  function getOrder(id: string): Order | undefined {
    return orders.value.find((o) => o.id === id);
  }

  /**
   * Get orders by date range
   */
  function getOrdersByDateRange(startDate: Date, endDate: Date): Order[] {
    return orders.value.filter((o) => {
      const date = new Date(o.date);
      return date >= startDate && date <= endDate;
    });
  }

  /**
   * Get orders by customer
   */
  function getOrdersByCustomer(customerPubkey: string): Order[] {
    return orders.value.filter((o) => o.customerPubkey === customerPubkey);
  }

  /**
   * Get orders by payment method
   */
  function getOrdersByPaymentMethod(method: PaymentMethod): Order[] {
    return orders.value.filter((o) => o.paymentMethod === method);
  }

  /**
   * Search orders
   */
  function searchOrders(query: string): Order[] {
    const q = query.toLowerCase();
    return orders.value.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        o.items.some((i) => i.product.name.toLowerCase().includes(q))
    );
  }

  // ============================================
  // 📊 ANALYTICS
  // ============================================

  /**
   * Get sales summary for a period
   */
  function getSalesSummary(
    startDate: Date,
    endDate: Date
  ): {
    totalOrders: number;
    totalSales: number;
    totalSats: number;
    avgOrderValue: number;
    byPaymentMethod: Record<string, { count: number; total: number }>;
    byHour: Record<number, { count: number; total: number }>;
  } {
    const periodOrders = getOrdersByDateRange(startDate, endDate).filter(
      (o) => o.status === "completed"
    );

    const byPaymentMethod: Record<string, { count: number; total: number }> =
      {};
    const byHour: Record<number, { count: number; total: number }> = {};

    let totalSales = 0;
    let totalSats = 0;

    for (const order of periodOrders) {
      totalSales += order.total;
      totalSats += order.totalSats || 0;

      // By payment method
      const method = order.paymentMethod || "unknown";
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { count: 0, total: 0 };
      }
      byPaymentMethod[method].count++;
      byPaymentMethod[method].total += order.total;

      // By hour
      const hour = new Date(order.date).getHours();
      if (!byHour[hour]) {
        byHour[hour] = { count: 0, total: 0 };
      }
      byHour[hour].count++;
      byHour[hour].total += order.total;
    }

    return {
      totalOrders: periodOrders.length,
      totalSales,
      totalSats,
      avgOrderValue:
        periodOrders.length > 0 ? totalSales / periodOrders.length : 0,
      byPaymentMethod,
      byHour,
    };
  }

  /**
   * Get top selling products
   */
  function getTopProducts(
    startDate: Date,
    endDate: Date,
    limit = 10
  ): Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }> {
    const periodOrders = getOrdersByDateRange(startDate, endDate).filter(
      (o) => o.status === "completed"
    );

    const productStats: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};

    for (const order of periodOrders) {
      for (const item of order.items) {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            name: item.product.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[item.productId]!.quantity += item.quantity;
        productStats[item.productId]!.revenue += item.total;
      }
    }

    return Object.entries(productStats)
      .map(([productId, stats]) => ({
        productId,
        productName: stats.name,
        quantity: stats.quantity,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  // ============================================
  // 🖨️ RECEIPT GENERATION
  // ============================================

  /**
   * Generate receipt data for printing
   */
  function generateReceiptData(order: Order): {
    header: string[];
    items: Array<{ name: string; qty: number; price: string; total: string }>;
    footer: string[];
    totals: { subtotal: string; tax: string; tip?: string; total: string };
  } {
    const formatPrice = (amount: number, currency: CurrencyCode) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency === "SATS" ? "USD" : currency,
        minimumFractionDigits: currency === "LAK" ? 0 : 2,
      })
        .format(amount)
        .replace("$", currency === "SATS" ? "₿" : "");
    };

    const subtotal = order.items.reduce((sum, i) => sum + i.total, 0);
    const tax = 0; // TODO: Calculate from settings

    return {
      header: [
        order.id,
        new Date(order.date).toLocaleString(),
        `Customer: ${order.customer}`,
      ],
      items: order.items.map((item) => ({
        name:
          item.product.name +
          (item.selectedVariant ? ` (${item.selectedVariant.shortName})` : ""),
        qty: item.quantity,
        price: formatPrice(item.price, order.currency),
        total: formatPrice(item.total, order.currency),
      })),
      totals: {
        subtotal: formatPrice(subtotal, order.currency),
        tax: formatPrice(tax, order.currency),
        tip: order.tip ? formatPrice(order.tip, order.currency) : undefined,
        total: formatPrice(order.total, order.currency),
      },
      footer: [
        order.paymentMethod === "lightning"
          ? "⚡ Paid with Lightning"
          : `Paid with ${order.paymentMethod}`,
        order.totalSats ? `${order.totalSats.toLocaleString()} sats` : "",
        "Thank you for your purchase!",
      ].filter(Boolean),
    };
  }

  return {
    // State
    orders,
    isLoading,
    error,
    syncPending,

    // Computed
    pendingOrders,
    completedOrders,
    todayOrders,
    todayTotal,
    todayTotalSats,

    // Load
    init,
    loadFromLocal,
    loadFromNostr,

    // CRUD
    createOrder,
    updateOrderStatus,
    completeOrder,
    voidOrder,
    refundOrder,
    deleteOrder,

    // Sync
    syncWithNostr,
    forceSyncAll,

    // Query
    getOrder,
    getOrdersByDateRange,
    getOrdersByCustomer,
    getOrdersByPaymentMethod,
    searchOrders,

    // Analytics
    getSalesSummary,
    getTopProducts,

    // Receipt
    generateReceiptData,
  };
}
