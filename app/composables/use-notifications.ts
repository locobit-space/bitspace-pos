// ============================================
// 🔔 NOTIFICATION SYSTEM
// Real-time notifications for POS events
// ============================================

import type { POSNotification, NotificationPriority } from "~/types";
import { db } from "~/db/db";
import { NOSTR_KINDS } from "~/types/nostr-kinds";

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

    // Truncate long messages for toast (max 120 characters)
    const maxLength = 120;
    let description = notification.message;
    let actions = undefined;

    if (notification.message.length > maxLength) {
      description = notification.message.slice(0, maxLength) + "...";
      // Add action to view full notification
      actions = [
        {
          label: "View More",
          click: () => {
            isNotificationCenterOpen.value = true;
          },
        },
      ];
    }

    toast.add({
      title: notification.title,
      description,
      color,
      icon: iconMap[notification.type] || "i-heroicons-bell",
      actions,
      timeout: notification.message.length > maxLength ? 6000 : 4000, // Longer for truncated messages
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
    initPosAlerts,
  };
};

/**
 * Initialize system notifications from Nostr
 * Subscribes to the official Bitspace announcement channel
 * Includes both initial fetch and real-time subscription
 */
async function initSystemNotifications() {
  const { $nostr } = useNuxtApp();
  const notificationsStore = useNotifications();

  // Track processed event IDs to prevent duplicates from multiple relays
  const processedEventIds = new Set<string>();

  // Announcement tags to listen for
  const ANNOUNCEMENT_TAGS = [
    "bnos.space-announcement", // General announcements
    "bnos.space-update", // Version updates
    "bnos.space-feature", // New features
    "bnos.space-maintenance", // Scheduled maintenance
    "bnos.space-security", // Security alerts
    "bnos.space-bugfix", // Important bug fixes
    // for dev
    // "test-announcement",
  ];

  // Map announcement tags to notification properties
  const getAnnouncementConfig = (tags: string[]) => {
    // Check tag priority (security > maintenance > update > feature > bugfix > general)
    if (tags.some((t) => t === "bnos.space-security")) {
      return {
        type: "alert" as const,
        priority: "high" as NotificationPriority,
        icon: "🔒",
        defaultTitle: "Security Alert",
      };
    }
    if (tags.some((t) => t === "bnos.space-maintenance")) {
      return {
        type: "system" as const,
        priority: "medium" as NotificationPriority,
        icon: "🔧",
        defaultTitle: "Maintenance Notice",
      };
    }
    if (tags.some((t) => t === "bnos.space-update")) {
      return {
        type: "system_update" as const,
        priority: "medium" as NotificationPriority,
        icon: "🚀",
        defaultTitle: "System Update",
      };
    }
    if (tags.some((t) => t === "bnos.space-feature")) {
      return {
        type: "system_update" as const,
        priority: "low" as NotificationPriority,
        icon: "✨",
        defaultTitle: "New Feature",
      };
    }
    if (tags.some((t) => t === "bnos.space-bugfix")) {
      return {
        type: "system" as const,
        priority: "low" as NotificationPriority,
        icon: "🐛",
        defaultTitle: "Bug Fix",
      };
    }
    // Default for bnos.space-announcement or unknown
    return {
      type: "system_update" as const,
      priority: "medium" as NotificationPriority,
      icon: "📢",
      defaultTitle: "System Announcement",
    };
  };

  // Helper to process incoming events (with deduplication)
  const processEvent = (event: any) => {
    // Skip if already processed this event ID (from another relay)
    if (processedEventIds.has(event.id)) {
      return;
    }
    processedEventIds.add(event.id);

    // Also check if we already have this notification in storage
    const existing = notificationsStore.notifications.value.find(
      (n) => n.data?.nostrEventId === event.id
    );

    if (!existing) {
      // Extract tags from the event
      const eventTags =
        event.tags
          ?.filter((tag: string[]) => tag[0] === "t")
          .map((tag: string[]) => tag[1]) || [];

      // Get announcement configuration based on tags
      const config = getAnnouncementConfig(eventTags);

      // Parse title from content (first line or use default)
      const contentLines = event.content.split("\n");
      const title = contentLines[0]?.startsWith("#")
        ? contentLines[0].replace(/^#+\s*/, "")
        : `${config.icon} ${config.defaultTitle}`;
      const message = contentLines[0]?.startsWith("#")
        ? contentLines.slice(1).join("\n").trim()
        : event.content;

      // Create notification with dynamic type and priority
      notificationsStore.addNotification({
        type: config.type,
        title,
        message: message || event.content,
        priority: config.priority,
        data: {
          nostrEventId: event.id,
          pubkey: event.pubkey,
          timestamp: event.created_at,
          tags: eventTags,
          category:
            eventTags.find((t: string) => t.startsWith("bnos.space-")) ||
            "announcement",
        },
      });
    }
  };

  try {
    const filter = {
      kinds: [NOSTR_KINDS.TEXT_NOTE],
      "#t": ANNOUNCEMENT_TAGS,
      limit: 10,
    };

    // Get all relay URLs (deduplicated)
    const allRelays = [
      ...new Set([...useNostrRelay().DEFAULT_RELAYS.map((r) => r.url)]),
    ];

    if (allRelays.length === 0) {
      console.error("[Notifications] No relays configured");
      return;
    }

    // Initial fetch of recent announcements
    const events = await $nostr.pool.querySync(allRelays, filter);

    // Deduplicate events by ID before processing
    const uniqueEvents = new Map<string, any>();
    for (const event of events) {
      if (!uniqueEvents.has(event.id)) {
        uniqueEvents.set(event.id, event);
      }
    }

    // Sort by timestamp (newest first) and process
    Array.from(uniqueEvents.values())
      .sort((a: any, b: any) => b.created_at - a.created_at)
      .forEach(processEvent);

    // Set up real-time subscription for new announcements
    const realtimeFilter = {
      kinds: [NOSTR_KINDS.TEXT_NOTE],
      "#t": ANNOUNCEMENT_TAGS,
      since: Math.floor(Date.now() / 1000), // Only new events from now
    };

    // Subscribe to real-time updates (fewer relays for real-time to reduce duplicates)
    $nostr.pool.subscribeMany(allRelays.slice(0, 2), [realtimeFilter], {
      onevent(event: any) {
        processEvent(event);
      },
      oneose() {
        // End of stored events, subscription continues for real-time
        console.log("[Notifications] Real-time subscription active");
      },
    });
  } catch (e) {
    console.error("Failed to initialize system notifications:", e);
  }
}

/**
 * Initialize POS alerts from Nostr
 * Listens for real-time alerts from customer orders (waiter calls, bill requests, new orders)
 *
 * IMPORTANT: Subscribes using company owner's pubkey, NOT individual staff pubkey.
 * Customer alerts are always tagged with company owner's pubkey from order.vue.
 *
 * Features:
 * - Uses company.ownerPubkey for subscription (matches customer alert targeting)
 * - Reliable relay selection (uses same relays as customer for consistency)
 * - Parameterized replaceable events (kind 30050) for better relay propagation
 * - Automatic reconnection on failure
 * - Duplicate event prevention
 * - Graceful error handling
 */
async function initPosAlerts() {
  const { $nostr } = useNuxtApp();
  const notificationsStore = useNotifications();
  const company = useCompany();

  // Get company code hash for filtering kitchen alerts
  const companyCodeHash = company.companyCodeHash.value;
  const ownerPubkey = company.ownerPubkey.value;

  if (!companyCodeHash && !ownerPubkey) {
    console.warn(
      "[POS Alerts] ⚠️ No company code or owner pubkey found - POS alerts disabled. Set up company profile in settings."
    );
    return;
  }

  // Track processed event IDs to prevent duplicates
  const processedEventIds = new Set<string>();

  // Helper to process incoming POS_ALERT events
  const processAlert = (event: any) => {
    // Skip if already processed
    if (processedEventIds.has(event.id)) {
      console.log("[POS Alerts] ⏭️ Skipping duplicate event:", event.id);
      return;
    }
    processedEventIds.add(event.id);

    try {
      const data = JSON.parse(event.content);
      console.log("[POS Alerts] 🔔 Processing alert:", data.type, data);

      const tableName = data.tableName || `Table ${data.tableNumber}`;

      // Add notification based on alert type
      if (data.type === "waiter-call") {
        notificationsStore.addNotification({
          type: "alert",
          title: `🔔 ${tableName} needs assistance!`,
          message: "Customer called for waiter",
          priority: "high",
          actionUrl: "/tables",
          data: {
            tableNumber: data.tableNumber,
            tableName: data.tableName,
            serviceType: "waiter_call",
            nostrEventId: event.id,
          },
        });
      } else if (data.type === "bill-request") {
        notificationsStore.addNotification({
          type: "alert",
          title: `💰 ${tableName} requesting bill!`,
          message: `${data.orderCount || 0} orders - Total: ${data.total || 0}`,
          priority: "high",
          actionUrl: "/pos",
          data: {
            tableNumber: data.tableNumber,
            tableName: data.tableName,
            sessionId: data.sessionId,
            sessionTotal: data.total,
            orderCount: data.orderCount,
            serviceType: "bill_request",
            nostrEventId: event.id,
          },
        });
      } else if (data.type === "new-order") {
        notificationsStore.addNotification({
          type: "order",
          title: `🆕 New Order from ${tableName}`,
          message: `Order #${data.orderCode || data.orderId}`,
          priority: "high",
          actionUrl: "/orders",
          data: {
            tableNumber: data.tableNumber,
            tableName: data.tableName,
            orderId: data.orderId,
            orderCode: data.orderCode,
            total: data.total,
            sessionId: data.sessionId,
            nostrEventId: event.id,
          },
        });
      } else if (data.type === "order-ready") {
        // Kitchen alert: Order is ready for pickup/serving
        notificationsStore.addNotification({
          type: "order",
          title: `✅ Order Ready!`,
          message: `Order #${data.orderNumber || data.orderId.slice(-6)} - ${
            data.customer || "Customer"
          } (${data.items || 0} items)`,
          priority: "high",
          actionUrl: "/orders",
          data: {
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            customer: data.customer,
            total: data.total,
            items: data.items,
            status: data.status,
            nostrEventId: event.id,
          },
        });
      } else if (data.type === "order-served") {
        // Kitchen alert: Order has been served/completed
        notificationsStore.addNotification({
          type: "order",
          title: `🎉 Order Served`,
          message: `Order #${data.orderNumber || data.orderId.slice(-6)} - ${
            data.customer || "Customer"
          } completed`,
          priority: "medium",
          actionUrl: "/orders",
          data: {
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            customer: data.customer,
            total: data.total,
            items: data.items,
            status: data.status,
            nostrEventId: event.id,
          },
        });
      }
    } catch (e) {
      console.error("[POS Alerts] ❌ Failed to process alert:", e);
    }
  };

  try {
    // Use SAME relays as customer (from use-nostr-relay config)
    // This ensures customer publishes and POS subscribes to identical relay set
    const relayConfig = useNostrRelay();

    // CRITICAL: Initialize relays first to add them to the pool
    await relayConfig.init();

    // Use the ACTUAL configured relays (not static defaults)
    let allRelays = relayConfig.writeRelays.value;

    // Fallback to defaults if no custom relays configured
    if (!allRelays || allRelays.length === 0) {
      console.warn(
        "[POS Alerts] ⚠️ No write relays configured, falling back to defaults"
      );
      allRelays = relayConfig.DEFAULT_RELAYS.map((r) => r.url);
    }

    // Subscribe to POS_ALERT events targeted at company owner
    // Using kind 1050 (Regular) for reliable delivery and storage
    const { NOSTR_KINDS } = await import("~/types/nostr-kinds");

    // Build filters array dynamically based on what we have
    const filters: any[] = [];

    // Filter 1: Watch company code hash channel (for kitchen alerts)
    if (companyCodeHash) {
      filters.push({
        kinds: [NOSTR_KINDS.POS_ALERT],
        "#c": [companyCodeHash],
      });
    }

    // Filter 2: Watch direct p-tags (for customer alerts tagged with owner pubkey)
    if (ownerPubkey) {
      filters.push({
        kinds: [NOSTR_KINDS.POS_ALERT],
        "#p": [ownerPubkey],
      });
    }

    console.log(
      `[POS Alerts] 🔔 Subscribing to alerts with ${filters.length} filter(s)`,
      {
        companyCodeHash: companyCodeHash?.slice(0, 8),
        ownerPubkey: ownerPubkey?.slice(0, 8),
        relays: allRelays,
      }
    );

    // Subscribe to real-time alerts using OR logic (pass array of filters)
    const sub = $nostr.pool.subscribeMany(allRelays, filters, {
      onevent(event: any) {
        console.log("[POS Alerts] 📥 Event received from relay:", event.id?.slice(0, 8), event);
        processAlert(event);
      },
      oneose() {
        console.log("[POS Alerts] ✅ Subscription active (EOSE received)");
      },
    });

    // Cleanup on page unload
    if (import.meta.client) {
      window.addEventListener("beforeunload", () => {
        sub?.close();
      });
    }
  } catch (e) {
    console.error("[POS Alerts] ❌ Failed to initialize:", e);
  }
}
