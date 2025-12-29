// ============================================
// 🔔 NOTIFICATION SYSTEM
// Real-time notifications for POS events
// ============================================

import type { POSNotification, NotificationPriority } from "~/types";
import { db } from "~/db/db";

// Singleton state (shared across all composable instances)
const notifications = ref<POSNotification[]>([]);
const unreadCount = ref(0);
const isNotificationCenterOpen = ref(false);
const lastLowStockCheck = ref<number>(0);
const LOW_STOCK_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes between checks

export const useNotifications = () => {
  const sound = useSound();
  const { t } = useI18n();
  const toast = useToast();

  // ============================================
  // 📋 NOTIFICATION MANAGEMENT
  // ============================================

  /**
   * Add a new notification
   */
  function addNotification(
    notification: Omit<POSNotification, "id" | "read" | "createdAt">
  ): POSNotification {
    const newNotification: POSNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Add to beginning of array
    notifications.value.unshift(newNotification);
    unreadCount.value++;

    // Keep only last 100 notifications
    if (notifications.value.length > 100) {
      notifications.value = notifications.value.slice(0, 100);
    }

    // Play sound based on type
    playNotificationSound(notification.type);

    // Show toast notification
    showToast(newNotification);

    // Save to localStorage
    saveNotifications();

    return newNotification;
  }

  /**
   * Play sound based on notification type
   */
  function playNotificationSound(type: POSNotification["type"]) {
    switch (type) {
      case "payment":
        sound.playSuccess();
        break;
      case "order":
        sound.playNotification();
        break;
      case "stock":
      case "alert":
        sound.playLowStockAlert();
        break;
      case "loyalty":
        sound.playCashRegister();
        break;
      case "ai_insight":
      case "system":
        sound.playNotification();
        break;
      default:
        sound.playNotification();
    }
  }

  // Type for toast colors
  type ToastColor =
    | "primary"
    | "red"
    | "gray"
    | "orange"
    | "amber"
    | "yellow"
    | "lime"
    | "green"
    | "emerald"
    | "teal"
    | "cyan"
    | "sky"
    | "blue"
    | "indigo"
    | "violet"
    | "purple"
    | "fuchsia"
    | "pink"
    | "rose";

  /**
   * Show toast notification
   */
  function showToast(notification: POSNotification) {
    const colorMap: Record<POSNotification["type"], ToastColor> = {
      payment: "green",
      order: "blue",
      stock: "yellow",
      loyalty: "purple",
      ai_insight: "cyan",
      alert: "orange",
      system: "gray",
      system_update: "indigo",
    };

    const iconMap: Record<POSNotification["type"], string> = {
      payment: "i-heroicons-bolt",
      order: "i-heroicons-shopping-bag",
      stock: "i-heroicons-archive-box",
      loyalty: "i-heroicons-star",
      ai_insight: "i-heroicons-sparkles",
      alert: "i-heroicons-exclamation-triangle",
      system: "i-heroicons-cog-6-tooth",
      system_update: "i-heroicons-megaphone",
    };

    // Use red for critical priority
    const color =
      notification.priority === "critical"
        ? "red"
        : colorMap[notification.type];

    toast.add({
      title: notification.title,
      description: notification.message,
      color,
      icon: iconMap[notification.type] || "i-heroicons-bell",
    });
  }

  /**
   * Mark notification as read
   */
  function markAsRead(id: string) {
    const notification = notifications.value.find((n) => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
      saveNotifications();
    }
  }

  /**
   * Mark all notifications as read
   */
  function markAllAsRead() {
    notifications.value.forEach((n) => {
      n.read = true;
    });
    unreadCount.value = 0;
    saveNotifications();
  }

  /**
   * Delete a notification
   */
  function deleteNotification(id: string) {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      const notification = notifications.value[index];
      if (!notification?.read) {
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
      notifications.value.splice(index, 1);
      saveNotifications();
    }
  }

  /**
   * Clear all notifications
   */
  function clearAll() {
    notifications.value = [];
    unreadCount.value = 0;
    saveNotifications();
  }

  // ============================================
  // 💾 PERSISTENCE
  // ============================================

  /**
   * Save notifications to localStorage
   */
  function saveNotifications() {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(
      "bnos_space_notifications",
      JSON.stringify(notifications.value)
    );
  }

  /**
   * Load notifications from localStorage
   */
  function loadNotifications() {
    if (typeof localStorage === "undefined") return;
    const saved = localStorage.getItem("bnos_space_notifications");
    if (saved) {
      try {
        notifications.value = JSON.parse(saved);
        unreadCount.value = notifications.value.filter((n) => !n.read).length;
      } catch {
        notifications.value = [];
        unreadCount.value = 0;
      }
    }
  }

  // ============================================
  // 🎯 CONVENIENCE METHODS
  // ============================================

  /**
   * Notify payment received
   */
  function notifyPaymentReceived(
    amount: number,
    currency: string,
    orderId?: string
  ) {
    addNotification({
      type: "payment",
      title: t("notifications.paymentReceived"),
      message: t("notifications.paymentReceivedMessage", {
        amount: `${amount} ${currency}`,
      }),
      data: { amount, currency, orderId },
    });
  }

  /**
   * Notify new order
   */
  function notifyNewOrder(orderId: string, customerName?: string) {
    addNotification({
      type: "order",
      title: t("notifications.newOrder"),
      message: customerName
        ? t("notifications.newOrderFromCustomer", { customer: customerName })
        : t("notifications.newOrderReceived"),
      data: { orderId, customerName },
    });
  }

  /**
   * Notify low stock (with priority)
   */
  function notifyLowStock(
    productName: string,
    currentStock: number,
    minStock: number,
    productId?: string,
    branchName?: string
  ) {
    // Calculate priority based on how low the stock is
    let priority: NotificationPriority = "medium";
    if (currentStock === 0) {
      priority = "critical";
    } else if (currentStock <= minStock * 0.25) {
      priority = "high";
    } else if (currentStock <= minStock * 0.5) {
      priority = "medium";
    } else {
      priority = "low";
    }

    const branchInfo = branchName ? ` (${branchName})` : "";

    addNotification({
      type: "stock",
      title:
        currentStock === 0
          ? t("notifications.outOfStock")
          : t("notifications.lowStock"),
      message:
        currentStock === 0
          ? t("notifications.outOfStockMessage", { product: productName }) +
            branchInfo
          : t("notifications.lowStockMessage", {
              product: productName,
              stock: currentStock,
            }) + branchInfo,
      data: { productName, currentStock, minStock, productId, branchName },
      priority,
      actionUrl: "/inventory",
    });
  }

  /**
   * Check all products for low stock and create notifications
   * Call this on app init and after stock changes
   */
  async function checkLowStock(force: boolean = false): Promise<number> {
    // Throttle checks to avoid spamming
    const now = Date.now();
    if (!force && now - lastLowStockCheck.value < LOW_STOCK_CHECK_INTERVAL) {
      return 0;
    }
    lastLowStockCheck.value = now;

    try {
      // Get all branch stock records
      const branchStocks = await db.branchStock.toArray();
      const products = await db.products.toArray();
      const branches = await db.branches.toArray();

      // Create maps for quick lookups (parse product data to check trackStock)
      const productMap = new Map<
        string,
        {
          id: string;
          name: string;
          trackStock: boolean;
          productType: string;
          stock: number;
        }
      >();
      for (const p of products) {
        try {
          const data = JSON.parse(p.data);
          productMap.set(p.id, {
            id: p.id,
            name: p.name,
            trackStock: data.trackStock !== false, // Default true if not set
            productType: data.productType || "good",
            stock: p.stock,
          });
        } catch {
          productMap.set(p.id, {
            id: p.id,
            name: p.name,
            trackStock: true,
            productType: "good",
            stock: p.stock,
          });
        }
      }
      const branchMap = new Map(branches.map((b) => [b.id, b.name]));

      // Track which products already have unread low stock notifications
      const existingAlerts = new Set(
        notifications.value
          .filter((n) => n.type === "stock" && !n.read && n.data?.productId)
          .map((n) => `${n.data?.productId}_${n.data?.branchName || ""}`)
      );

      let alertCount = 0;

      // Check branch-specific stock
      for (const bs of branchStocks) {
        if (bs.currentStock <= bs.minStock) {
          const alertKey = `${bs.productId}_${
            branchMap.get(bs.branchId) || ""
          }`;
          if (!existingAlerts.has(alertKey)) {
            const product = productMap.get(bs.productId);
            // Skip if product doesn't track stock or is a service/digital/subscription
            if (
              product &&
              product.trackStock &&
              product.productType !== "service" &&
              product.productType !== "digital" &&
              product.productType !== "subscription"
            ) {
              notifyLowStock(
                product.name,
                bs.currentStock,
                bs.minStock,
                bs.productId,
                branchMap.get(bs.branchId)
              );
              alertCount++;
            }
          }
        }
      }

      // Also check products without branch stock (legacy/main stock)
      for (const [productId, product] of productMap) {
        // Skip if product doesn't track stock
        if (
          !product.trackStock ||
          product.productType === "service" ||
          product.productType === "digital" ||
          product.productType === "subscription"
        ) {
          continue;
        }

        if (product.stock <= 0) {
          const alertKey = `${productId}_`;
          if (
            !existingAlerts.has(alertKey) &&
            !branchStocks.some((bs) => bs.productId === productId)
          ) {
            // Only notify if there's no branch stock tracking for this product
            notifyLowStock(product.name, product.stock, 1, productId);
            alertCount++;
          }
        }
      }

      return alertCount;
    } catch (e) {
      console.error("Failed to check low stock:", e);
      return 0;
    }
  }

  /**
   * Get low stock summary for quick stats (only for products that track stock)
   */
  async function getLowStockSummary(): Promise<{
    outOfStock: number;
    critical: number;
    low: number;
    total: number;
  }> {
    try {
      const branchStocks = await db.branchStock.toArray();
      const products = await db.products.toArray();

      // Build a set of products that track stock
      const trackedProducts = new Set<string>();
      for (const p of products) {
        try {
          const data = JSON.parse(p.data);
          const trackStock = data.trackStock !== false;
          const productType = data.productType || "good";
          if (
            trackStock &&
            productType !== "service" &&
            productType !== "digital" &&
            productType !== "subscription"
          ) {
            trackedProducts.add(p.id);
          }
        } catch {
          trackedProducts.add(p.id); // Default to tracked if parse fails
        }
      }

      let outOfStock = 0;
      let critical = 0;
      let low = 0;

      for (const bs of branchStocks) {
        // Skip products that don't track stock
        if (!trackedProducts.has(bs.productId)) continue;

        if (bs.currentStock === 0) {
          outOfStock++;
        } else if (bs.currentStock <= bs.minStock * 0.25) {
          critical++;
        } else if (bs.currentStock <= bs.minStock) {
          low++;
        }
      }

      return {
        outOfStock,
        critical,
        low,
        total: outOfStock + critical + low,
      };
    } catch {
      return { outOfStock: 0, critical: 0, low: 0, total: 0 };
    }
  }

  /**
   * Notify loyalty points earned
   */
  function notifyLoyaltyPoints(customerName: string, points: number) {
    addNotification({
      type: "loyalty",
      title: t("notifications.loyaltyPoints"),
      message: t("notifications.loyaltyPointsMessage", {
        customer: customerName,
        points,
      }),
      data: { customerName, points },
    });
  }

  /**
   * Notify AI insight
   */
  function notifyAIInsight(
    title: string,
    message: string,
    data?: Record<string, unknown>
  ) {
    addNotification({
      type: "ai_insight",
      title,
      message,
      data,
    });
  }

  /**
   * Toggle notification center
   */
  function toggleNotificationCenter() {
    isNotificationCenterOpen.value = !isNotificationCenterOpen.value;
  }

  // ============================================
  // 🚀 INITIALIZATION
  // ============================================

  // Load saved notifications on mount
  if (typeof window !== "undefined") {
    loadNotifications();
  }

  return {
    // State
    notifications: computed(() => notifications.value),
    unreadCount: computed(() => unreadCount.value),
    isNotificationCenterOpen,

    // Methods
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    toggleNotificationCenter,

    // Convenience methods
    notifyPaymentReceived,
    notifyNewOrder,
    notifyLowStock,
    notifyLoyaltyPoints,
    notifyAIInsight,

    // Low stock monitoring
    checkLowStock,
    getLowStockSummary,

    // System Announcements
    initSystemNotifications,
  };
};

/**
 * Initialize system notifications from Nostr
 * Subscribes to the official Bitspace announcement channel
 */
async function initSystemNotifications() {
  const { $nostr } = useNuxtApp();
  const notificationsStore = useNotifications();

  // BITSPACE OFFICIAL ADMIN PUBKEY (Placeholder - Replace with actual key)
  // For now, this is a random key. In production, this should be the specific admin key.
  const ADMIN_PUBKEY = "npub1..."; // TODO: User to provide or set in config

  if (!ADMIN_PUBKEY) return;

  // We actually need the hex pubkey usually, assuming we have a hex converter or the user provides hex.
  // For this implementation, I'll assume we look for a specific consistent tag
  // OR just listen to any event with #bitspace-announcement for now if key is not strict.
  // Better to use the tag `#bitspace-announcement` as the primary filter.

  try {
    const filter = {
      kinds: [1],
      "#t": [
        "bnos.space-announcement",
        "bitspace-announcement",
        "bnospace-announcement",
        "bnos-space-announcement",
      ],
      limit: 10, // Get last 10 announcements
    };

    const events = await $nostr.pool.querySync(
      [
        "wss://relay.bnos.space",
        "wss://nos.lol",
        ...useNostrRelay().DEFAULT_RELAYS.map((r) => r.url),
      ],
      filter
    );

    events.forEach((event: any) => {
      // Check if we already have this notification to avoid duplicates
      // We use the Nostr event ID as part of our internal ID or check against it
      const existing = notificationsStore.notifications.value.find(
        (n) => n.data?.nostrEventId === event.id
      );

      if (!existing) {
        // Create notification
        notificationsStore.addNotification({
          type: "system_update",
          title: "📢 System Announcement", // Could parse from content if formatted
          message: event.content,
          priority: "medium", // Default
          data: {
            nostrEventId: event.id,
            pubkey: event.pubkey,
            timestamp: event.created_at,
          },
        });
      }
    });

    // Real-time subscription could go here
  } catch (e) {
    console.error("Failed to fetch system notifications:", e);
  }
}
