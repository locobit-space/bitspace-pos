// composables/use-pos.ts
// 🛒 POS Cart & Session Management

import { ref, computed, watch } from 'vue';
import type { 
  Product, 
  ProductVariant,
  ProductModifier,
  Cart, 
  CartItem, 
  Order, 
  POSSession,
  CurrencyCode,
  PaymentMethod 
} from '~/types';
import { useCurrency } from './use-currency';

export const usePOS = () => {
  // Initialize currency composable
  const currency = useCurrency();

  // Cart State
  const cartItems = ref<CartItem[]>([]);
  const selectedCurrency = ref<CurrencyCode>('LAK');
  const tipAmount = ref(0);
  const taxRate = ref(0); // 0% default for Laos
  const customerNote = ref('');
  const customerPubkey = ref<string | null>(null);

  // Session State
  const currentSession = ref<POSSession | null>(null);
  const isSessionActive = computed(() => currentSession.value?.status === 'active');

  // ============================================
  // Price Calculation Helpers
  // ============================================

  /**
   * Calculate final price with variant and modifiers
   */
  const calculateItemPrice = (
    product: Product,
    variant?: ProductVariant,
    modifiers?: ProductModifier[]
  ): number => {
    let basePrice = product.prices?.[selectedCurrency.value] || product.price;

    // Add variant price modifier
    if (variant) {
      if (variant.priceModifierType === 'fixed') {
        basePrice += variant.priceModifier;
      } else {
        basePrice += basePrice * (variant.priceModifier / 100);
      }
    }

    // Add modifier prices
    if (modifiers && modifiers.length > 0) {
      modifiers.forEach(mod => {
        basePrice += mod.price;
      });
    }

    return basePrice;
  };

  /**
   * Generate unique cart item key (product + variant + modifiers)
   */
  const getCartItemKey = (
    productId: string,
    variant?: ProductVariant,
    modifiers?: ProductModifier[]
  ): string => {
    let key = productId;
    if (variant) key += `-${variant.id}`;
    if (modifiers && modifiers.length > 0) {
      key += `-${modifiers.map(m => m.id).sort().join(',')}`;
    }
    return key;
  };

  // ============================================
  // Cart Operations
  // ============================================

  /**
   * Add product to cart with optional variant and modifiers
   */
  const addToCart = (
    product: Product, 
    quantity: number = 1,
    options?: {
      variant?: ProductVariant;
      modifiers?: ProductModifier[];
      notes?: string;
    }
  ) => {
    const variant = options?.variant;
    const modifiers = options?.modifiers;
    const notes = options?.notes;

    // Find existing item with same product + variant + modifiers
    const itemKey = getCartItemKey(product.id, variant, modifiers);
    const existingItem = cartItems.value.find(item => {
      const existingKey = getCartItemKey(
        item.product.id, 
        item.selectedVariant, 
        item.selectedModifiers
      );
      return existingKey === itemKey && item.notes === notes;
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.total = existingItem.quantity * existingItem.price;
    } else {
      const price = calculateItemPrice(product, variant, modifiers);
      
      cartItems.value.push({
        product,
        quantity,
        price,
        total: quantity * price,
        selectedVariant: variant,
        selectedModifiers: modifiers,
        notes,
      });
    }
  };

  /**
   * Remove product from cart by index
   */
  const removeFromCart = (index: number) => {
    if (index >= 0 && index < cartItems.value.length) {
      cartItems.value.splice(index, 1);
    }
  };

  /**
   * Remove by product ID (removes first match)
   */
  const removeFromCartById = (productId: string) => {
    const index = cartItems.value.findIndex(item => item.product.id === productId);
    if (index !== -1) {
      cartItems.value.splice(index, 1);
    }
  };

  /**
   * Update item quantity by index
   */
  const updateQuantity = (index: number, quantity: number) => {
    const item = cartItems.value[index];
    if (item) {
      if (quantity <= 0) {
        removeFromCart(index);
      } else {
        item.quantity = quantity;
        item.total = item.quantity * item.price;
      }
    }
  };

  /**
   * Update item quantity by product ID (for backward compatibility)
   */
  const updateQuantityById = (productId: string, quantity: number) => {
    const index = cartItems.value.findIndex(item => item.product.id === productId);
    if (index !== -1) {
      updateQuantity(index, quantity);
    }
  };

  /**
   * Update item notes
   */
  const updateItemNotes = (index: number, notes: string) => {
    const item = cartItems.value[index];
    if (item) {
      item.notes = notes || undefined;
    }
  };

  /**
   * Update item variant
   */
  const updateItemVariant = (index: number, variant: ProductVariant) => {
    const item = cartItems.value[index];
    if (item) {
      item.selectedVariant = variant;
      item.price = calculateItemPrice(item.product, variant, item.selectedModifiers);
      item.total = item.quantity * item.price;
    }
  };

  /**
   * Update item modifiers
   */
  const updateItemModifiers = (index: number, modifiers: ProductModifier[]) => {
    const item = cartItems.value[index];
    if (item) {
      item.selectedModifiers = modifiers;
      item.price = calculateItemPrice(item.product, item.selectedVariant, modifiers);
      item.total = item.quantity * item.price;
    }
  };

  /**
   * Clear cart
   */
  const clearCart = () => {
    cartItems.value = [];
    tipAmount.value = 0;
    customerNote.value = '';
    customerPubkey.value = null;
  };

  /**
   * Set tip amount
   */
  const setTip = (amount: number) => {
    tipAmount.value = amount;
  };

  /**
   * Set tip as percentage
   */
  const setTipPercentage = (percentage: number) => {
    tipAmount.value = Math.round(subtotal.value * (percentage / 100));
  };

  // ============================================
  // Cart Calculations
  // ============================================

  const subtotal = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + item.total, 0);
  });

  const tax = computed(() => {
    return Math.round(subtotal.value * taxRate.value);
  });

  const total = computed(() => {
    return subtotal.value + tax.value + tipAmount.value;
  });

  const totalSats = computed(() => {
    // Only calculate if we have a valid total
    if (total.value <= 0) return 0;
    const sats = currency.toSats(total.value, selectedCurrency.value);
    return sats;
  });

  const itemCount = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
  });

  const cart = computed<Cart>(() => ({
    items: cartItems.value,
    subtotal: subtotal.value,
    tax: tax.value,
    tip: tipAmount.value,
    total: total.value,
    totalSats: totalSats.value,
    currency: selectedCurrency.value,
  }));

  // ============================================
  // Order Creation
  // ============================================

  /**
   * Create order from cart
   */
  const createOrder = (paymentMethod: PaymentMethod): Order => {
    const order: Order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      customer: customerPubkey.value ? `nostr:${customerPubkey.value.slice(0, 8)}` : 'Walk-in',
      customerPubkey: customerPubkey.value || undefined,
      branch: currentSession.value?.branchId || 'default',
      date: new Date().toISOString(),
      total: total.value,
      totalSats: totalSats.value,
      currency: selectedCurrency.value,
      status: 'pending',
      paymentMethod,
      notes: customerNote.value || undefined,
      tip: tipAmount.value > 0 ? tipAmount.value : undefined,
      kitchenStatus: 'new',
      items: cartItems.value.map((item, index) => ({
        id: `${index + 1}`,
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        product: item.product,
        selectedVariant: item.selectedVariant,
        selectedModifiers: item.selectedModifiers,
        notes: item.notes,
        kitchenStatus: 'pending',
      })),
      isOffline: !navigator.onLine,
    };

    return order;
  };

  // ============================================
  // Session Management
  // ============================================

  /**
   * Start new POS session
   */
  const startSession = (branchId: string, staffId: string, openingBalance: number = 0): POSSession => {
    const session: POSSession = {
      id: `SES-${Date.now().toString(36).toUpperCase()}`,
      branchId,
      staffId,
      startedAt: new Date().toISOString(),
      openingBalance,
      totalSales: 0,
      totalOrders: 0,
      cashSales: 0,
      lightningSales: 0,
      status: 'active',
    };

    currentSession.value = session;
    
    // Store in localStorage for persistence
    localStorage.setItem('pos_session', JSON.stringify(session));

    return session;
  };

  /**
   * End current session
   */
  const endSession = (closingBalance: number): POSSession | null => {
    if (!currentSession.value) return null;

    currentSession.value.endedAt = new Date().toISOString();
    currentSession.value.closingBalance = closingBalance;
    currentSession.value.status = 'closed';

    const session = { ...currentSession.value };
    
    // Clear session
    localStorage.removeItem('pos_session');
    currentSession.value = null;

    return session;
  };

  /**
   * Update session totals after order
   */
  const updateSessionTotals = (order: Order) => {
    if (!currentSession.value) return;

    currentSession.value.totalSales += order.total;
    currentSession.value.totalOrders += 1;

    if (order.paymentMethod === 'cash') {
      currentSession.value.cashSales += order.total;
    } else if (order.paymentMethod === 'lightning' || order.paymentMethod === 'bolt12') {
      currentSession.value.lightningSales += order.total;
    }

    localStorage.setItem('pos_session', JSON.stringify(currentSession.value));
  };

  /**
   * Restore session from localStorage
   */
  const restoreSession = () => {
    const stored = localStorage.getItem('pos_session');
    if (stored) {
      try {
        const session = JSON.parse(stored) as POSSession;
        if (session.status === 'active') {
          currentSession.value = session;
        }
      } catch {
        localStorage.removeItem('pos_session');
      }
    }
  };

  // ============================================
  // Quick Actions
  // ============================================

  /**
   * Apply discount
   */
  const applyDiscount = (type: 'percentage' | 'fixed', value: number) => {
    if (type === 'percentage') {
      // Apply percentage discount to each item
      cartItems.value.forEach(item => {
        item.price = item.price * (1 - value / 100);
        item.total = item.quantity * item.price;
      });
    } else {
      // Apply fixed discount proportionally
      const discountRatio = value / subtotal.value;
      cartItems.value.forEach(item => {
        item.price = item.price * (1 - discountRatio);
        item.total = item.quantity * item.price;
      });
    }
  };

  /**
   * Change currency
   */
  const changeCurrency = (newCurrency: CurrencyCode) => {
    const oldCurrency = selectedCurrency.value;
    selectedCurrency.value = newCurrency;

    // Convert prices
    cartItems.value.forEach(item => {
      item.price = currency.convert(item.price, oldCurrency, newCurrency);
      item.total = item.quantity * item.price;
    });

    if (tipAmount.value > 0) {
      tipAmount.value = currency.convert(tipAmount.value, oldCurrency, newCurrency);
    }
  };

  // Initialize on mount
  restoreSession();

  // Watch for currency changes in settings
  watch(selectedCurrency, () => {
    // Could auto-convert prices here
  });

  return {
    // Cart State
    cartItems,
    selectedCurrency,
    tipAmount,
    taxRate,
    customerNote,
    customerPubkey,
    
    // Computed
    subtotal,
    tax,
    total,
    totalSats,
    itemCount,
    cart,

    // Session
    currentSession,
    isSessionActive,

    // Cart Methods
    addToCart,
    removeFromCart,
    removeFromCartById,
    updateQuantity,
    updateQuantityById,
    updateItemNotes,
    updateItemVariant,
    updateItemModifiers,
    clearCart,
    setTip,
    setTipPercentage,
    applyDiscount,
    changeCurrency,
    calculateItemPrice,

    // Order
    createOrder,

    // Session Methods
    startSession,
    endSession,
    updateSessionTotals,
    restoreSession,
  };
};
