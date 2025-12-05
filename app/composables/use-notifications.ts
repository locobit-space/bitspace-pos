// ============================================
// 🔔 NOTIFICATION SYSTEM
// Real-time notifications for POS events
// ============================================

import type { POSNotification } from '~/types';

// Singleton state (shared across all composable instances)
const notifications = ref<POSNotification[]>([]);
const unreadCount = ref(0);
const isNotificationCenterOpen = ref(false);

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
  function addNotification(notification: Omit<POSNotification, 'id' | 'read' | 'createdAt'>): POSNotification {
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
  function playNotificationSound(type: POSNotification['type']) {
    switch (type) {
      case 'payment':
        sound.playSuccess();
        break;
      case 'order':
        sound.playNotification();
        break;
      case 'stock':
        sound.playLowStockAlert();
        break;
      case 'loyalty':
        sound.playCashRegister();
        break;
      case 'ai_insight':
        sound.playNotification();
        break;
      default:
        sound.playNotification();
    }
  }

  // Type for toast colors
  type ToastColor = 'primary' | 'red' | 'gray' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose';

  /**
   * Show toast notification
   */
  function showToast(notification: POSNotification) {
    const colorMap: Record<POSNotification['type'], ToastColor> = {
      payment: 'green',
      order: 'blue',
      stock: 'yellow',
      loyalty: 'purple',
      ai_insight: 'cyan',
    };

    const iconMap: Record<POSNotification['type'], string> = {
      payment: 'i-heroicons-bolt',
      order: 'i-heroicons-shopping-bag',
      stock: 'i-heroicons-archive-box',
      loyalty: 'i-heroicons-star',
      ai_insight: 'i-heroicons-sparkles',
    };

    toast.add({
      title: notification.title,
      description: notification.message,
      color: colorMap[notification.type],
      icon: iconMap[notification.type] || 'i-heroicons-bell',
    });
  }

  /**
   * Mark notification as read
   */
  function markAsRead(id: string) {
    const notification = notifications.value.find(n => n.id === id);
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
    notifications.value.forEach(n => {
      n.read = true;
    });
    unreadCount.value = 0;
    saveNotifications();
  }

  /**
   * Delete a notification
   */
  function deleteNotification(id: string) {
    const index = notifications.value.findIndex(n => n.id === id);
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
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('bitspace_notifications', JSON.stringify(notifications.value));
  }

  /**
   * Load notifications from localStorage
   */
  function loadNotifications() {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem('bitspace_notifications');
    if (saved) {
      try {
        notifications.value = JSON.parse(saved);
        unreadCount.value = notifications.value.filter(n => !n.read).length;
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
  function notifyPaymentReceived(amount: number, currency: string, orderId?: string) {
    addNotification({
      type: 'payment',
      title: t('notifications.paymentReceived'),
      message: t('notifications.paymentReceivedMessage', { amount: `${amount} ${currency}` }),
      data: { amount, currency, orderId },
    });
  }

  /**
   * Notify new order
   */
  function notifyNewOrder(orderId: string, customerName?: string) {
    addNotification({
      type: 'order',
      title: t('notifications.newOrder'),
      message: customerName 
        ? t('notifications.newOrderFromCustomer', { customer: customerName })
        : t('notifications.newOrderReceived'),
      data: { orderId, customerName },
    });
  }

  /**
   * Notify low stock
   */
  function notifyLowStock(productName: string, currentStock: number, minStock: number) {
    addNotification({
      type: 'stock',
      title: t('notifications.lowStock'),
      message: t('notifications.lowStockMessage', { product: productName, stock: currentStock }),
      data: { productName, currentStock, minStock },
    });
  }

  /**
   * Notify loyalty points earned
   */
  function notifyLoyaltyPoints(customerName: string, points: number) {
    addNotification({
      type: 'loyalty',
      title: t('notifications.loyaltyPoints'),
      message: t('notifications.loyaltyPointsMessage', { customer: customerName, points }),
      data: { customerName, points },
    });
  }

  /**
   * Notify AI insight
   */
  function notifyAIInsight(title: string, message: string, data?: Record<string, unknown>) {
    addNotification({
      type: 'ai_insight',
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
  if (typeof window !== 'undefined') {
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
  };
};
