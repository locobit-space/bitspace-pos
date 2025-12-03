<!-- pages/pos/index.vue -->
<!-- 🛒 Full-Featured POS Terminal - Lightning + Nostr -->
<script setup lang="ts">
import type {
  Product,
  ProductVariant,
  ProductModifier,
  PaymentMethod,
  AppliedCoupon,
  Order,
  OrderType,
} from "~/types";

definePageMeta({
  layout: "blank",
});

// ============================================
// Composables
// ============================================
const pos = usePOS();
const productsStore = useProducts();
const ordersStore = useOrders();
const lightning = useLightning();
const currency = useCurrency();
const offline = useOffline();
const sound = useSound();
const receipt = useReceipt();
const { t } = useI18n();

// ============================================
// UI State
// ============================================
const showPaymentModal = ref(false);
const showReceiptModal = ref(false);
const showDiscountModal = ref(false);
const showCustomItemModal = ref(false);
const showHeldOrdersModal = ref(false);
const showSettingsModal = ref(false);
const showNumpad = ref(false);
const showProductOptionsModal = ref(false);
const showItemNotesModal = ref(false);
const showMobileCart = ref(false); // Mobile cart slide-up panel
const showExtras = ref(false); // Toggle for coupon/discount/tip section
const showTableSwitcher = ref(false); // Table switcher modal
const numpadTarget = ref<{ index: number; currentQty: number } | null>(null);
const numpadValue = ref("");
const isProcessing = ref(false);

// Completed order for receipt
const completedOrder = ref<Order | null>(null);
const completedPaymentMethod = ref<PaymentMethod>('cash');

// Default payment method (when clicking specific payment buttons)
const defaultPaymentMethod = ref<PaymentMethod | null>(null);

// Coupon
const appliedCoupon = ref<AppliedCoupon | null>(null);

// Product options selection
const selectedProduct = ref<Product | null>(null);
const selectedVariant = ref<ProductVariant | null>(null);
const selectedModifiers = ref<ProductModifier[]>([]);
const productQuantity = ref(1);

// Item notes
const editingItemIndex = ref<number | null>(null);
const itemNotesValue = ref("");

// Custom item form
const customItem = ref({ name: "", price: 0 });

// Discount form
const discountType = ref<"percentage" | "fixed">("percentage");
const discountValue = ref(0);

// Held orders storage
const heldOrders = ref<
  Array<{
    id: string;
    items: typeof pos.cartItems.value;
    total: number;
    createdAt: string;
    tableNumber?: string;
  }>
>([]);

// Tables data (loaded from localStorage)
const tables = ref<Array<{
  id: string;
  name: string;
  status: 'available' | 'occupied' | 'reserved';
  seats: number;
}>>([]);

// Current time display
const currentTime = ref(new Date());
let timeInterval: ReturnType<typeof setInterval>;

// Order types for selector
const orderTypes: Array<{ value: OrderType; label: string; icon: string }> = [
  { value: 'dine_in', label: 'Dine In', icon: '🍽️' },
  { value: 'take_away', label: 'Take Away', icon: '🥡' },
  { value: 'delivery', label: 'Delivery', icon: '🛵' },
  { value: 'pickup', label: 'Pickup', icon: '🏃' },
];

// ============================================
// Computed
// ============================================
const formattedTotal = computed(() =>
  currency.format(pos.total.value, pos.selectedCurrency.value)
);

const formattedTotalSats = computed(() =>
  currency.format(pos.totalSats.value, "SATS")
);

// Available tables for switching
const availableTables = computed(() => 
  tables.value.filter(t => t.status === 'available' || t.name === pos.tableNumber.value)
);

// Current table info
const currentTable = computed(() => 
  tables.value.find(t => t.name === pos.tableNumber.value)
);

const formattedTime = computed(() => {
  return currentTime.value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
});

const formattedDate = computed(() => {
  return currentTime.value.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
});

// Calculate selected product total price
const selectedProductPrice = computed(() => {
  if (!selectedProduct.value) return 0;
  return pos.calculateItemPrice(
    selectedProduct.value,
    selectedVariant.value || undefined,
    selectedModifiers.value
  );
});

// Category icons mapping
const categoryIcons: Record<string, string> = {
  all: "🏪",
  drinks: "🍹",
  food: "🍽️",
  desserts: "🍰",
  snacks: "🍿",
  favorites: "⭐",
};

// Tip options
const tipOptions = [
  { label: "No Tip", value: 0 },
  { label: "5%", value: 5 },
  { label: "10%", value: 10 },
  { label: "15%", value: 15 },
  { label: "20%", value: 20 },
];

// ============================================
// Product Methods
// ============================================
const selectProduct = (product: Product) => {
  // If product has variants or modifiers, show options modal
  if (product.hasVariants && product.variants && product.variants.length > 0) {
    selectedProduct.value = product;
    // Select default variant
    selectedVariant.value =
      product.variants.find((v) => v.isDefault) || product.variants[0] || null;
    selectedModifiers.value = [];
    productQuantity.value = 1;
    showProductOptionsModal.value = true;
  } else if (product.modifierGroups && product.modifierGroups.length > 0) {
    selectedProduct.value = product;
    selectedVariant.value = null;
    // Select default modifiers
    selectedModifiers.value = product.modifierGroups.flatMap((g) =>
      g.modifiers.filter((m) => m.isDefault)
    );
    productQuantity.value = 1;
    showProductOptionsModal.value = true;
  } else {
    // No options, add directly
    pos.addToCart(product);
  }
};

const addProductWithOptions = () => {
  if (!selectedProduct.value) return;

  pos.addToCart(selectedProduct.value, productQuantity.value, {
    variant: selectedVariant.value || undefined,
    modifiers:
      selectedModifiers.value.length > 0 ? selectedModifiers.value : undefined,
  });

  // Play scan beep
  sound.playScanBeep();

  // Reset and close
  showProductOptionsModal.value = false;
  selectedProduct.value = null;
  selectedVariant.value = null;
  selectedModifiers.value = [];
  productQuantity.value = 1;
};

const toggleModifier = (modifier: ProductModifier) => {
  const index = selectedModifiers.value.findIndex((m) => m.id === modifier.id);
  if (index === -1) {
    selectedModifiers.value.push(modifier);
  } else {
    selectedModifiers.value.splice(index, 1);
  }
};

const handleQuantityChange = (index: number, delta: number) => {
  const item = pos.cartItems.value[index];
  if (item) {
    pos.updateQuantity(index, item.quantity + delta);
  }
};

const openNumpad = (index: number, currentQty: number) => {
  numpadTarget.value = { index, currentQty };
  numpadValue.value = currentQty.toString();
  showNumpad.value = true;
};

const handleNumpadInput = (value: string) => {
  if (value === "C") {
    numpadValue.value = "";
  } else if (value === "DEL") {
    numpadValue.value = numpadValue.value.slice(0, -1);
  } else if (value === "OK") {
    if (numpadTarget.value !== null) {
      const qty = parseInt(numpadValue.value) || 0;
      pos.updateQuantity(numpadTarget.value.index, qty);
    }
    showNumpad.value = false;
    numpadTarget.value = null;
  } else {
    numpadValue.value += value;
  }
};

// ============================================
// Item Notes
// ============================================
const openItemNotes = (index: number) => {
  editingItemIndex.value = index;
  itemNotesValue.value = pos.cartItems.value[index]?.notes || "";
  showItemNotesModal.value = true;
};

const saveItemNotes = () => {
  if (editingItemIndex.value !== null) {
    pos.updateItemNotes(editingItemIndex.value, itemNotesValue.value);
  }
  showItemNotesModal.value = false;
  editingItemIndex.value = null;
  itemNotesValue.value = "";
};

// ============================================
// Quick Actions
// ============================================
const holdOrder = () => {
  if (pos.cartItems.value.length === 0) return;

  heldOrders.value.push({
    id: `HOLD-${Date.now()}`,
    items: [...pos.cartItems.value],
    total: pos.total.value,
    createdAt: new Date().toISOString(),
  });

  pos.clearCart();
};

const recallOrder = (orderId: string) => {
  const order = heldOrders.value.find((o) => o.id === orderId);
  if (order) {
    order.items.forEach((item) => {
      pos.addToCart(item.product, item.quantity, {
        variant: item.selectedVariant,
        modifiers: item.selectedModifiers,
        notes: item.notes,
      });
    });
    heldOrders.value = heldOrders.value.filter((o) => o.id !== orderId);
    showHeldOrdersModal.value = false;
  }
};

const deleteHeldOrder = (orderId: string) => {
  heldOrders.value = heldOrders.value.filter((o) => o.id !== orderId);
};

const applyDiscount = () => {
  if (discountValue.value > 0) {
    pos.applyDiscount(discountType.value, discountValue.value);
  }
  showDiscountModal.value = false;
  discountValue.value = 0;
};

// ============================================
// Coupon Methods
// ============================================
const handleCouponApply = (coupon: AppliedCoupon) => {
  appliedCoupon.value = coupon;
  // Apply as fixed discount
  pos.applyDiscount("fixed", coupon.discountAmount);
};

const handleCouponRemove = () => {
  if (appliedCoupon.value) {
    // Remove the discount
    pos.applyDiscount("fixed", 0);
    appliedCoupon.value = null;
  }
};

const addCustomItem = () => {
  if (customItem.value.name && customItem.value.price > 0) {
    const product: Product = {
      id: `custom-${Date.now()}`,
      name: customItem.value.name,
      sku: "CUSTOM",
      categoryId: "custom",
      unitId: "piece",
      price: customItem.value.price,
      stock: 999,
      minStock: 0,
      branchId: "main",
      status: "active",
      image: "📦",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    pos.addToCart(product);
    customItem.value = { name: "", price: 0 };
    showCustomItemModal.value = false;
  }
};

// ============================================
// Payment Methods
// ============================================
const proceedToPayment = (method?: PaymentMethod) => {
  if (pos.cartItems.value.length === 0) return;
  sound.playNotification();
  defaultPaymentMethod.value = method || null;
  showPaymentModal.value = true;
  
  // Notify customer display that payment is pending
  pos.setPaymentState({
    status: 'pending',
    amount: pos.total.value,
    satsAmount: pos.totalSats.value,
  });
};

const handlePaymentComplete = async (method: PaymentMethod, proof: unknown) => {
  isProcessing.value = true;

  try {
    const order = pos.createOrder(method);
    order.status = "completed";

    // Add payment proof if available
    if (proof) {
      order.paymentProof = {
        id: `proof_${Date.now()}`,
        orderId: order.id,
        paymentHash: (proof as { paymentHash?: string })?.paymentHash || "",
        preimage: (proof as { preimage?: string })?.preimage || "",
        amount: order.totalSats || 0,
        receivedAt: new Date().toISOString(),
        method,
        isOffline: !navigator.onLine,
      };
    }

    // Save order to local DB and sync to Nostr
    await ordersStore.createOrder(order);

    // Update POS session totals
    pos.updateSessionTotals(order);

    // Play success sound
    if (method === "lightning" || method === "bolt12" || method === "lnurl") {
      sound.playLightningZap();
    } else if (method === "cash") {
      sound.playCashRegister();
    } else {
      sound.playOrderComplete();
    }

    // Store offline payment proof if needed
    if (!navigator.onLine) {
      const paymentProof = lightning.createPaymentProof(
        order.id,
        method === "cash"
          ? "cash-" + order.id
          : (proof as { preimage?: string })?.preimage || "",
        method === "cash" ? "cash-payment" : "lightning-payment",
        order.total,
        method,
        true
      );
      await offline.storeOfflinePayment(order, paymentProof);
    }

    // Store completed order for receipt modal
    completedOrder.value = order;
    completedPaymentMethod.value = method;
    
    // Generate e-bill for customer display
    const generatedReceipt = receipt.generateReceipt(order, order.paymentProof);
    receipt.storeEBill(generatedReceipt);
    const eBillUrl = receipt.generateEBillUrl(generatedReceipt.id);
    
    pos.clearCart();
    showPaymentModal.value = false;
    
    // Show receipt options
    showReceiptModal.value = true;
    
    // Notify customer display that payment is complete with e-bill
    pos.setPaymentState({ 
      status: 'paid',
      eBillUrl: eBillUrl,
      eBillId: generatedReceipt.id,
      amount: order.total,
      satsAmount: order.totalSats,
    });
  } catch (e) {
    console.error("Payment error:", e);
    sound.playError();
    pos.setPaymentState({ status: 'cancelled' });
  } finally {
    isProcessing.value = false;
  }
};

const cancelPayment = () => {
  showPaymentModal.value = false;
  isProcessing.value = false;
  pos.setPaymentState({ status: 'idle' });
};

// ============================================
// Table Switching Functions  
// ============================================
const loadTables = () => {
  try {
    const stored = localStorage.getItem('tables');
    if (stored) {
      tables.value = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load tables:', e);
  }
};

const switchTable = (table: typeof tables.value[0]) => {
  // If there's an existing table with items, hold the current order
  if (pos.tableNumber.value && pos.cartItems.value.length > 0 && pos.tableNumber.value !== table.name) {
    heldOrders.value.push({
      id: Date.now().toString(),
      items: [...pos.cartItems.value],
      total: pos.total.value,
      createdAt: new Date().toISOString(),
      tableNumber: pos.tableNumber.value,
    });
    pos.clearCart();
  }

  // Switch to new table
  pos.tableNumber.value = table.name;
  pos.setOrderType('dine_in');
  
  // Check if there's a held order for this table and restore it
  const heldIndex = heldOrders.value.findIndex(o => o.tableNumber === table.name);
  if (heldIndex !== -1) {
    const held = heldOrders.value[heldIndex];
    if (held) {
      held.items.forEach((item) => {
        pos.addToCart(item.product, item.quantity, {
          variant: item.selectedVariant,
          modifiers: item.selectedModifiers,
          notes: item.notes,
        });
      });
      heldOrders.value.splice(heldIndex, 1);
    }
  }
  
  // Update table status
  const tableIndex = tables.value.findIndex(t => t.id === table.id);
  if (tableIndex !== -1 && tables.value[tableIndex]) {
    tables.value[tableIndex].status = 'occupied';
    localStorage.setItem('tables', JSON.stringify(tables.value));
  }
  
  showTableSwitcher.value = false;
};

const clearTableSelection = () => {
  pos.tableNumber.value = '';
};

// ============================================
// Lifecycle
// ============================================
const route = useRoute();

onMounted(async () => {
  await currency.init("LAK");
  await offline.init();
  await productsStore.init();
  await ordersStore.init();

  if (!pos.isSessionActive.value) {
    pos.startSession("main", "staff-1", 0);
  }

  // Load tables from localStorage
  loadTables();

  // Handle table context from query params
  if (route.query.tableId) {
    pos.tableNumber.value = route.query.tableName as string || route.query.tableId as string;
    pos.setOrderType('dine_in');
    
    // If action is 'pay', open payment modal
    if (route.query.action === 'pay' && pos.cartItems.value.length > 0) {
      setTimeout(() => proceedToPayment(), 500);
    }
  }

  timeInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 60000);
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
});
</script>

<template>
  <div
    class="h-screen flex flex-col lg:flex-row bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden"
  >
    <!-- ============================================ -->
    <!-- LEFT PANEL - Products -->
    <!-- ============================================ -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header Bar -->
      <header
        class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/50 px-2 sm:px-4 py-2 sm:py-3"
      >
        <div class="flex items-center justify-between">
          <!-- Logo & Status -->
          <div class="flex items-center gap-2 sm:gap-4">
            <div class="flex items-center gap-2">
              <div>
                <div
                  class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-base sm:text-xl shadow-lg shadow-amber-500/20"
                >
                  ⚡
                </div>
              </div>
              <div class="hidden sm:block">
                <h1
                  class="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 bg-clip-text text-transparent"
                >
                  BitSpace POS
                </h1>
                <p class="text-xs text-gray-500 dark:text-gray-500">
                  Lightning Powered
                </p>
              </div>
            </div>

            <!-- Connection Status -->
            <div
              class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              :class="
                offline.isOnline.value
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20'
              "
            >
              <span class="relative flex h-2 w-2">
                <span
                  class="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                  :class="
                    offline.isOnline.value ? 'bg-emerald-400' : 'bg-amber-400'
                  "
                />
                <span
                  class="relative inline-flex rounded-full h-2 w-2"
                  :class="
                    offline.isOnline.value ? 'bg-emerald-500' : 'bg-amber-500'
                  "
                />
              </span>
              {{ offline.isOnline.value ? "Online" : "Offline" }}
            </div>

            <!-- Mobile status indicator -->
            <span 
              class="sm:hidden flex h-2.5 w-2.5 rounded-full"
              :class="offline.isOnline.value ? 'bg-emerald-500' : 'bg-amber-500'"
            />

            <!-- Pending Sync -->
            <div
              v-if="offline.pendingCount.value > 0"
              class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20"
            >
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-3 h-3 animate-spin"
              />
              {{ offline.pendingCount.value }} pending
            </div>
          </div>

          <!-- Right Side -->
          <div class="flex items-center gap-4">
            <!-- Date & Time -->
            <div class="text-right hidden md:block">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ formattedTime }}
              </div>
              <div class="text-xs text-gray-500">{{ formattedDate }}</div>
            </div>

            <div class="h-8 w-px bg-gray-300 dark:bg-gray-800" />

            <!-- BTC Price -->
            <div
              class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-200/50 dark:bg-gray-800/50"
            >
              <span class="text-amber-500">₿</span>
              <span class="text-sm font-medium">{{
                currency.btcPriceFormatted.value
              }}</span>
            </div>

            <!-- Currency Selector -->
            <USelect
              v-model="pos.selectedCurrency.value"
              :items="['LAK', 'THB', 'USD', 'SATS']"
              size="sm"
              class="w-24"
            />

            <!-- Dashboard Link -->
            <UTooltip text="Go to Dashboard">
              <NuxtLink to="/">
                <UButton
                  icon="i-heroicons-squares-2x2"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                />
              </NuxtLink>
            </UTooltip>

            <!-- Shift Management Link -->
            <UTooltip text="Shift Management">
              <NuxtLink to="/pos/shift">
                <UButton
                  icon="i-heroicons-banknotes"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                />
              </NuxtLink>
            </UTooltip>

            <!-- Table Management Link -->
            <UTooltip text="Tables">
              <NuxtLink to="/pos/tables">
                <UButton
                  icon="i-heroicons-table-cells"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                />
              </NuxtLink>
            </UTooltip>

            <!-- Kitchen Display Link -->
            <UTooltip text="Kitchen Display">
              <NuxtLink to="/kitchen">
                <UButton
                  icon="i-heroicons-fire"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                />
              </NuxtLink>
            </UTooltip>

            <!-- Settings Button -->
            <UTooltip text="Quick Settings">
              <UButton
                icon="i-heroicons-cog-6-tooth"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="showSettingsModal = true"
              />
            </UTooltip>

            <!-- Lightning Settings Link -->
            <UTooltip text="Lightning Settings">
              <NuxtLink to="/settings/lightning">
                <UButton
                  icon="i-heroicons-bolt"
                  :color="lightning.isConnected.value ? 'primary' : 'yellow'"
                  variant="ghost"
                  size="sm"
                />
              </NuxtLink>
            </UTooltip>
          </div>
        </div>

        <!-- Search & Quick Actions -->
        <div class="mt-3 flex gap-3">
          <!-- Search -->
          <div class="relative flex-1 max-w-md">
            <UInput
              v-model="productsStore.searchQuery.value"
              placeholder="Search products... (SKU or name)"
              icon="i-heroicons-magnifying-glass"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex gap-2">
            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              @click="showCustomItemModal = true"
            >
              <UIcon name="i-heroicons-plus" class="w-4 h-4" />
              <span class="hidden sm:inline">Custom</span>
            </UButton>

            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              :disabled="pos.cartItems.value.length === 0"
              @click="holdOrder"
            >
              <UIcon name="i-heroicons-pause" class="w-4 h-4" />
              <span class="hidden sm:inline">Hold</span>
            </UButton>

            <UButton
              v-if="heldOrders.length > 0"
              size="sm"
              color="amber"
              variant="soft"
              @click="showHeldOrdersModal = true"
            >
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              <span>{{ heldOrders.length }}</span>
            </UButton>
          </div>
        </div>

        <!-- Categories -->
        <div class="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            v-for="cat in productsStore.categories.value"
            :key="cat.id"
            class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200"
            :class="
              productsStore.selectedCategory.value === cat.id
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white dark:text-black shadow-lg shadow-amber-500/25'
                : 'bg-gray-200/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            "
            @click="productsStore.selectedCategory.value = cat.id"
          >
            <span>{{ categoryIcons[cat.id] || "📁" }}</span>
            <span>{{ cat.name }}</span>
          </button>
        </div>
      </header>

      <!-- Products Grid -->
      <div class="flex-1 p-4 overflow-auto bg-gray-50 dark:bg-transparent">
        <div
          v-if="productsStore.filteredProducts.value.length === 0"
          class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500"
        >
          <span class="text-6xl mb-4">🔍</span>
          <p class="text-lg">No products found</p>
          <p class="text-sm mt-2">Try a different search or category</p>
        </div>

        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
        >
          <button
            v-for="product in productsStore.filteredProducts.value"
            :key="product.id"
            class="group relative bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700/50 hover:border-amber-500/50 dark:hover:border-amber-500/30 rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/10 dark:hover:shadow-amber-500/5"
            @click="selectProduct(product)"
          >
            <!-- Favorite Badge -->
            <button
              v-if="productsStore.isFavorite(product.id)"
              class="absolute top-2 right-2 text-amber-400"
              @click.stop="productsStore.toggleFavorite(product.id)"
            >
              ⭐
            </button>

            <!-- Product Image/Emoji -->
            <div
              class="text-4xl mb-3 group-hover:scale-110 transition-transform"
            >
              {{ product.image || "📦" }}
            </div>

            <!-- Product Info -->
            <div class="space-y-1">
              <h3
                class="font-medium text-gray-900 dark:text-white text-sm leading-tight line-clamp-2"
              >
                {{ product.name }}
              </h3>
              <p class="text-xs text-gray-400 dark:text-gray-500">
                {{ product.sku }}
              </p>
            </div>

            <!-- Price -->
            <div class="mt-3 space-y-0.5">
              <div
                class="text-amber-600 dark:text-amber-400 font-bold text-base"
              >
                {{
                  currency.format(
                    product.prices?.[pos.selectedCurrency.value] ||
                      product.price,
                    pos.selectedCurrency.value
                  )
                }}
              </div>
              <div class="text-xs text-gray-500">
                ≈ {{ currency.format(product.prices?.SATS || 0, "SATS") }}
              </div>
            </div>

            <!-- Stock indicator -->
            <div
              v-if="product.stock <= product.minStock"
              class="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-600 dark:text-red-400"
            >
              Low
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- MOBILE CART TOGGLE (visible on small screens) -->
    <!-- ============================================ -->
    <button
      v-if="pos.cartItems.value.length > 0"
      class="lg:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 text-white rounded-2xl shadow-2xl shadow-amber-500/40 dark:shadow-amber-900/50 ring-1 ring-white/20 backdrop-blur-sm active:scale-95 transition-all duration-200 hover:shadow-amber-500/50"
      @click="showMobileCart = true"
    >
      <span class="text-xl drop-shadow-sm">🛒</span>
      <span class="font-bold text-white/90">{{ pos.itemCount.value }}</span>
      <span class="w-px h-4 bg-white/30" />
      <span class="font-semibold">{{ currency.format(pos.total.value, pos.selectedCurrency.value) }}</span>
    </button>

    <!-- ============================================ -->
    <!-- RIGHT PANEL - Cart (Desktop) / Slide-up (Mobile) -->
    <!-- ============================================ -->
    <!-- Desktop Cart Panel -->
    <div
      class="hidden lg:flex w-[380px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800/50 flex-col"
    >
      <!-- Cart Header -->
      <div
        class="p-4 border-gray-200 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl"
            >
              🛒
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white">
                Current Order
              </h2>
              <p class="text-xs text-gray-500">
                {{ pos.itemCount.value }} items
              </p>
            </div>
          </div>

          <UButton
            v-if="pos.cartItems.value.length > 0"
            icon="i-heroicons-trash"
            color="red"
            variant="ghost"
            size="xs"
            @click="pos.clearCart"
          />
        </div>

        <!-- Order Type Selector -->
        <div class="mt-3 flex gap-1.5">
          <button
            v-for="type in orderTypes"
            :key="type.value"
            class="flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition-all"
            :class="pos.orderType.value === type.value 
              ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'"
            @click="pos.setOrderType(type.value)"
          >
            <span class="text-lg">{{ type.icon }}</span>
            <span>{{ type.label }}</span>
          </button>
        </div>

        <!-- Table Number (for dine-in) -->
        <div v-if="pos.orderType.value === 'dine_in'" class="mt-2">
          <!-- Table Quick Selector (when tables exist) -->
          <div v-if="tables.length > 0" class="flex gap-2">
            <button
              class="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
              :class="currentTable 
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30 hover:ring-emerald-500/50' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'"
              @click="showTableSwitcher = true"
            >
              <UIcon name="i-heroicons-table-cells" class="w-4 h-4" />
              <span v-if="currentTable" class="font-medium">{{ currentTable.name }}</span>
              <span v-else>Select Table</span>
              <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 ml-auto opacity-50" />
            </button>
            <button
              v-if="pos.tableNumber.value"
              title="Clear table"
              class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              @click="clearTableSelection"
            >
              <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
            </button>
          </div>
          <!-- Fallback input (when no tables configured) -->
          <UInput
            v-else
            v-model="pos.tableNumber.value"
            placeholder="Table # (optional)"
            size="xs"
            icon="i-heroicons-table-cells"
            class="w-full"
          />
        </div>

        <!-- Delivery/Pickup Info -->
        <div v-if="pos.orderType.value === 'delivery'" class="mt-2 space-y-2">
          <UInput
            v-model="pos.customerPhone.value"
            placeholder="Customer phone"
            size="xs"
            icon="i-heroicons-phone"
            class="w-full"
          />
          <UInput
            v-model="pos.deliveryAddress.value"
            placeholder="Delivery address"
            size="xs"
            icon="i-heroicons-map-pin"
            class="w-full"
          />
        </div>

        <!-- Pickup Info -->
        <div v-if="pos.orderType.value === 'pickup'" class="mt-2">
          <UInput
            v-model="pos.customerPhone.value"
            placeholder="Customer phone (for pickup notification)"
            size="xs"
            icon="i-heroicons-phone"
            class="w-full"
          />
        </div>
      </div>

      <!-- Cart Items -->
      <div class="flex-1 overflow-auto p-3 bg-gray-50 dark:bg-gray-950/50">
        <!-- Empty State -->
        <div
          v-if="pos.cartItems.value.length === 0"
          class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500"
        >
          <div
            class="w-20 h-20 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-4xl mb-4"
          >
            🛒
          </div>
          <p class="text-base font-medium text-gray-500">Cart is empty</p>
          <p class="text-sm mt-1">Tap products to add</p>
        </div>

        <!-- Cart Items List -->
        <div v-else class="bg-white dark:bg-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
          <div
            v-for="(item, index) in pos.cartItems.value"
            :key="`${item.product.id}-${index}`"
            class="p-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
          >
            <div class="flex gap-3">
              <!-- Product Image -->
              <div class="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-xl flex-shrink-0">
                {{ item.product.image || "📦" }}
              </div>

              <!-- Product Details -->
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start gap-2">
                  <div class="flex-1 min-w-0">
                    <h4
                      class="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate"
                    >
                      {{ item.product.name }}
                    </h4>
                    <!-- Variant & Modifiers -->
                    <div
                      v-if="
                        item.selectedVariant ||
                        (item.selectedModifiers &&
                          item.selectedModifiers.length > 0)
                      "
                      class="mt-0.5"
                    >
                      <span
                        v-if="item.selectedVariant"
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium mr-1"
                      >
                        {{ item.selectedVariant.shortName }}
                      </span>
                      <span
                        v-for="mod in item.selectedModifiers"
                        :key="mod.id"
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 mr-1"
                      >
                        {{ mod.name }}
                      </span>
                    </div>
                  </div>
                  <button
                    class="text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0 transition-colors"
                    @click="pos.removeFromCart(index)"
                  >
                    <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                  </button>
                </div>

                <p class="text-xs text-gray-500 mt-0.5">
                  {{ currency.format(item.price, pos.selectedCurrency.value) }}
                  each
                </p>

                <!-- Item Notes (if any) -->
                <div
                  v-if="item.notes"
                  class="mt-1.5 px-2 py-1 rounded-lg bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-xs"
                >
                  📝 {{ item.notes }}
                </div>

                <!-- Quantity Controls & Total -->
                <div class="flex items-center justify-between mt-2">
                  <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                    <button
                      class="w-7 h-7 rounded-md hover:bg-white dark:hover:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 transition-colors"
                      @click="handleQuantityChange(index, -1)"
                    >
                      −
                    </button>
                    <button
                      class="w-8 h-7 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white"
                      @click="openNumpad(index, item.quantity)"
                    >
                      {{ item.quantity }}
                    </button>
                    <button
                      class="w-7 h-7 rounded-md hover:bg-white dark:hover:bg-gray-600 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 transition-colors"
                      @click="handleQuantityChange(index, 1)"
                    >
                      +
                    </button>

                    <!-- Add/Edit Note Button -->
                    <button
                      class="ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors"
                      :class="
                        item.notes
                          ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                          : 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      "
                      :title="item.notes ? 'Edit note' : 'Add note'"
                      @click="openItemNotes(index)"
                    >
                      📝
                    </button>
                  </div>

                  <div
                    class="text-amber-600 dark:text-amber-400 font-bold text-sm"
                  >
                    {{
                      currency.format(item.total, pos.selectedCurrency.value)
                    }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Extras Toggle Bar (Coupon/Discount/Tip) -->
      <div
        v-if="pos.cartItems.value.length > 0"
        class="border-t border-gray-200 dark:border-gray-800/50"
      >
        <!-- Toggle Header -->
        <button
          class="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
          @click="showExtras = !showExtras"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Extras</span>
            <!-- Active indicators -->
            <div class="flex items-center gap-1.5">
              <span 
                v-if="appliedCoupon" 
                class="px-1.5 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-600 dark:text-green-400 rounded"
              >
                🎟️ {{ appliedCoupon.coupon.code }}
              </span>
              <span 
                v-if="pos.tipAmount.value > 0" 
                class="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded"
              >
                ⚡ Tip
              </span>
            </div>
          </div>
          <UIcon 
            :name="showExtras ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" 
            class="w-4 h-4 text-gray-400 transition-transform"
          />
        </button>

        <!-- Collapsible Content -->
        <Transition name="collapse">
          <div v-if="showExtras" class="px-4 pb-3 space-y-3">
            <!-- Quick Actions Row -->
            <div class="flex gap-2">
              <!-- Coupon Button -->
              <button
                class="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                :class="appliedCoupon 
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 ring-1 ring-green-500/30' 
                  : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'"
                @click="appliedCoupon ? handleCouponRemove() : null"
              >
                <span>🎟️</span>
                <span v-if="appliedCoupon">{{ appliedCoupon.coupon.code }} ✓</span>
                <span v-else>Coupon</span>
              </button>

              <!-- Discount Button -->
              <button
                class="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"
                @click="showDiscountModal = true"
              >
                <span>🏷️</span>
                <span>Discount</span>
              </button>
            </div>

            <!-- Coupon Input (shows when no coupon applied) -->
            <div v-if="!appliedCoupon" class="-mt-1">
              <PosCouponInput
                :subtotal="pos.subtotal.value"
                :currency="pos.selectedCurrency.value"
                :applied-coupon="appliedCoupon"
                @apply="handleCouponApply"
                @remove="handleCouponRemove"
              />
            </div>

            <!-- Tip Options -->
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                <span>⚡</span> Quick Tip
              </p>
              <div class="grid grid-cols-5 gap-1.5">
                <button
                  v-for="tip in tipOptions"
                  :key="tip.value"
                  class="py-2 rounded-lg text-xs font-medium transition-all"
                  :class="
                    pos.tipAmount.value ===
                    (tip.value === 0
                      ? 0
                      : Math.round((pos.subtotal.value * tip.value) / 100))
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 scale-105'
                      : 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                  "
                  @click="pos.setTipPercentage(tip.value)"
                >
                  {{ tip.label }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Cart Summary -->
      <div
        class="p-4 border-t border-gray-200 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl"
      >
        <!-- Summary Lines -->
        <div class="space-y-1.5 text-sm mb-3">
          <div class="flex justify-between text-gray-500 dark:text-gray-400">
            <span>Subtotal</span>
            <span>{{
              currency.format(pos.subtotal.value, pos.selectedCurrency.value)
            }}</span>
          </div>
          <div
            v-if="appliedCoupon"
            class="flex justify-between text-green-600 dark:text-green-400"
          >
            <span class="flex items-center gap-1">
              <span>🎟️</span> {{ appliedCoupon.coupon.code }}
            </span>
            <span>-{{ currency.format(appliedCoupon.discountAmount, pos.selectedCurrency.value) }}</span>
          </div>
          <div
            v-if="pos.tipAmount.value > 0"
            class="flex justify-between text-amber-600 dark:text-amber-400"
          >
            <span class="flex items-center gap-1">
              <span>⚡</span> Tip
            </span>
            <span>+{{ currency.format(pos.tipAmount.value, pos.selectedCurrency.value) }}</span>
          </div>
        </div>

        <!-- Total -->
        <div
          class="flex items-end justify-between mb-4 pt-3 border-t border-gray-200 dark:border-gray-800/50"
        >
          <div>
            <p class="text-xs text-gray-500 mb-1">Total</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ formattedTotal }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500 mb-1">≈ Sats</p>
            <p class="text-lg font-semibold text-amber-600 dark:text-amber-400">
              {{ formattedTotalSats }}
            </p>
          </div>
        </div>

        <!-- Payment Buttons -->
        <div class="space-y-2">
          <UButton
            block
            size="lg"
            :disabled="pos.cartItems.value.length === 0"
            class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white dark:text-black font-semibold shadow-lg shadow-amber-500/25"
            @click="proceedToPayment('lightning')"
          >
            <span class="flex items-center gap-2">
              <span class="text-lg">⚡</span>
              <span>Pay with Lightning</span>
            </span>
          </UButton>

          <div class="grid grid-cols-2 gap-2">
            <UButton
              block
              size="md"
              color="neutral"
              variant="soft"
              :disabled="pos.cartItems.value.length === 0"
              @click="proceedToPayment('cash')"
            >
              💵 {{ t("payment.methods.cash") }}
            </UButton>
            <UButton
              block
              size="md"
              color="neutral"
              variant="soft"
              :disabled="pos.cartItems.value.length === 0"
              @click="proceedToPayment('qr_static')"
            >
              📱 {{ t("payment.methods.staticQR") }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- MOBILE CART SLIDE-UP PANEL -->
    <!-- ============================================ -->
    <Transition name="slide-up">
      <div
        v-if="showMobileCart"
        class="lg:hidden fixed inset-0 z-50"
      >
        <!-- Backdrop with blur -->
        <div 
          class="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-md"
          @click="showMobileCart = false"
        />
        
        <!-- Cart Panel - Glass effect -->
        <div class="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-t-[2rem] max-h-[85vh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
          <!-- Drag Handle -->
          <div class="flex justify-center pt-3 pb-2">
            <div class="w-10 h-1 bg-gray-300/80 dark:bg-gray-600 rounded-full" />
          </div>
          
          <!-- Cart Header - Cleaner -->
          <div class="px-5 pb-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                <span class="text-xl">🛒</span>
              </div>
              <div>
                <h2 class="font-bold text-gray-900 dark:text-white">Your Order</h2>
                <p class="text-xs text-amber-600 dark:text-amber-400 font-medium">{{ pos.itemCount.value }} items</p>
              </div>
            </div>
            <button 
              class="w-9 h-9 rounded-full bg-gray-100/80 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700 transition-colors"
              @click="showMobileCart = false"
            >
              <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
            </button>
          </div>

          <!-- Order Type Selector (Mobile) -->
          <div class="px-4 pb-4">
            <div class="flex gap-1.5">
              <button
                v-for="type in orderTypes"
                :key="type.value"
                class="flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition-all"
                :class="pos.orderType.value === type.value 
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'"
                @click="pos.setOrderType(type.value)"
              >
                <span class="text-lg">{{ type.icon }}</span>
                <span>{{ type.label }}</span>
              </button>
            </div>
            
            <!-- Table Selector (for dine-in, mobile) -->
            <div v-if="pos.orderType.value === 'dine_in' && tables.length > 0" class="mt-2">
              <button
                class="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all"
                :class="currentTable 
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'"
                @click="showTableSwitcher = true"
              >
                <span class="text-lg">🍽️</span>
                <span v-if="currentTable" class="font-medium">{{ currentTable.name }}</span>
                <span v-else>Select Table</span>
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 ml-auto opacity-50" />
              </button>
            </div>
          </div>

          <!-- Cart Items (Scrollable) -->
          <div class="flex-1 overflow-y-auto px-4 pb-3 bg-gray-50/50 dark:bg-gray-950/50">
            <div v-if="pos.cartItems.value.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400">
              <div class="w-20 h-20 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center mb-4">
                <span class="text-4xl">🛒</span>
              </div>
              <p class="font-medium text-gray-500">Cart is empty</p>
              <p class="text-sm text-gray-400 mt-1">Tap products to add</p>
            </div>
            <div v-else class="space-y-2 pt-2">
              <div
                v-for="(item, index) in pos.cartItems.value"
                :key="`mobile-${item.product.id}-${index}`"
                class="bg-white dark:bg-gray-800 rounded-xl p-3"
              >
                <div class="flex items-center gap-3">
                  <!-- Product Icon -->
                  <div class="w-11 h-11 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-xl flex-shrink-0">
                    {{ item.product.image || '📦' }}
                  </div>
                  
                  <!-- Product Info -->
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm text-gray-900 dark:text-white truncate">{{ item.product.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ currency.format(item.price, pos.selectedCurrency.value) }}</p>
                  </div>
                  
                  <!-- Quantity Controls -->
                  <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                    <button 
                      class="w-7 h-7 rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold transition-colors flex items-center justify-center text-lg"
                      @click="handleQuantityChange(index, -1)"
                    >−</button>
                    <span class="w-7 text-center font-bold text-sm text-gray-900 dark:text-white">{{ item.quantity }}</span>
                    <button 
                      class="w-7 h-7 rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold transition-colors flex items-center justify-center text-lg"
                      @click="handleQuantityChange(index, 1)"
                    >+</button>
                  </div>
                  
                  <!-- Total Price -->
                  <p class="font-bold text-amber-600 dark:text-amber-400 text-sm min-w-[4rem] text-right tabular-nums">
                    {{ currency.format(item.total, pos.selectedCurrency.value) }}
                  </p>
                </div>
                
                <!-- Item Notes & Actions Row -->
                <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                  <!-- Notes display or add button -->
                  <button
                    class="flex items-center gap-1.5 text-xs transition-colors"
                    :class="item.notes 
                      ? 'text-yellow-600 dark:text-yellow-400' 
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
                    @click="openItemNotes(index)"
                  >
                    <span>📝</span>
                    <span v-if="item.notes" class="truncate max-w-[150px]">{{ item.notes }}</span>
                    <span v-else>Add note</span>
                  </button>
                  
                  <!-- Remove button -->
                  <button
                    class="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    @click="pos.removeFromCart(index)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Cart Footer - Glass effect -->
          <div class="px-5 py-4 bg-gradient-to-t from-white via-white to-white/80 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900/80 border-t border-gray-100 dark:border-gray-800">
            <!-- Summary -->
            <div class="flex justify-between items-end mb-4">
              <div>
                <p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Total</p>
                <p class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{{ formattedTotal }}</p>
              </div>
              <div class="text-right">
                <div class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-full">
                  <span class="text-amber-500">⚡</span>
                  <span class="text-sm font-semibold text-amber-600 dark:text-amber-400">{{ formattedTotalSats }}</span>
                </div>
              </div>
            </div>
            <!-- Action Buttons -->
            <div class="grid grid-cols-5 gap-2.5">
              <UButton
                color="neutral"
                variant="soft"
                size="lg"
                class="col-span-2 !bg-gray-100 hover:!bg-gray-200 dark:!bg-gray-800 dark:hover:!bg-gray-700 !text-gray-600 dark:!text-gray-300 font-semibold"
                @click="pos.clearCart(); showMobileCart = false"
              >
                Clear
              </UButton>
              <UButton
                color="primary"
                size="lg"
                class="col-span-3 !bg-gradient-to-r !from-amber-500 !to-orange-500 hover:!from-amber-600 hover:!to-orange-600 !text-white font-semibold shadow-lg shadow-amber-500/25"
                :disabled="pos.cartItems.value.length === 0"
                @click="showMobileCart = false; proceedToPayment()"
              >
                <span class="flex items-center gap-2">
                  <span>Pay Now</span>
                  <span class="text-amber-200">→</span>
                </span>
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ============================================ -->
    <!-- MODALS -->
    <!-- ============================================ -->

    <!-- Payment Modal -->
    <UModal v-model:open="showPaymentModal">
      <template #content>
        <div
          class="p-6 bg-white dark:bg-gray-900 min-w-[400px] max-w-lg max-h-[85vh] overflow-y-auto"
        >
          <PaymentSelector
            v-if="showPaymentModal"
            :amount="pos.total.value"
            :sats-amount="pos.totalSats.value"
            :currency="pos.selectedCurrency.value"
            :order-id="'ORD-' + Date.now().toString(36).toUpperCase()"
            :default-method="defaultPaymentMethod || undefined"
            @paid="handlePaymentComplete"
            @cancel="cancelPayment"
          />
        </div>
      </template>
    </UModal>

    <!-- Receipt Actions Modal -->
    <UModal v-model:open="showReceiptModal" :dismissable="false">
      <template #content>
        <div
          class="p-6 bg-white dark:bg-gray-900 min-w-[400px] max-w-lg"
        >
          <ReceiptActions
            v-if="showReceiptModal && completedOrder"
            :order="completedOrder"
            :payment-method="completedPaymentMethod"
            @close="showReceiptModal = false"
            @done="showReceiptModal = false; completedOrder = null"
          />
        </div>
      </template>
    </UModal>

    <!-- Discount Modal -->
    <UModal v-model:open="showDiscountModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3
            class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
          >
            <span>🏷️</span> Apply Discount
          </h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-500 dark:text-gray-400 mb-2"
                >Discount Type</label
              >
              <div class="flex gap-2">
                <UButton
                  :color="discountType === 'percentage' ? 'primary' : 'neutral'"
                  :variant="discountType === 'percentage' ? 'solid' : 'outline'"
                  class="flex-1"
                  @click="discountType = 'percentage'"
                >
                  % Percentage
                </UButton>
                <UButton
                  :color="discountType === 'fixed' ? 'primary' : 'neutral'"
                  :variant="discountType === 'fixed' ? 'solid' : 'outline'"
                  class="flex-1"
                  @click="discountType = 'fixed'"
                >
                  Fixed Amount
                </UButton>
              </div>
            </div>

            <div>
              <label
                class="block text-sm text-gray-500 dark:text-gray-400 mb-2"
              >
                {{
                  discountType === "percentage"
                    ? "Discount %"
                    : "Discount Amount"
                }}
              </label>
              <UInput
                v-model.number="discountValue"
                type="number"
                :placeholder="
                  discountType === 'percentage' ? 'e.g., 10' : 'e.g., 5000'
                "
              />
            </div>

            <div class="flex gap-2 pt-2">
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                @click="showDiscountModal = false"
              >
                Cancel
              </UButton>
              <UButton color="primary" class="flex-1" @click="applyDiscount">
                Apply
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Custom Item Modal -->
    <UModal v-model:open="showCustomItemModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3
            class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
          >
            <span>📦</span> Add Custom Item
          </h3>

          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-500 dark:text-gray-400 mb-2"
                >Item Name</label
              >
              <UInput
                v-model="customItem.name"
                placeholder="e.g., Special Order"
              />
            </div>

            <div>
              <label
                class="block text-sm text-gray-500 dark:text-gray-400 mb-2"
              >
                Price ({{ pos.selectedCurrency.value }})
              </label>
              <UInput
                v-model.number="customItem.price"
                type="number"
                placeholder="e.g., 50000"
              />
            </div>

            <div class="flex gap-2 pt-2">
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                @click="showCustomItemModal = false"
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                class="flex-1"
                :disabled="!customItem.name || customItem.price <= 0"
                @click="addCustomItem"
              >
                Add to Cart
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Held Orders Modal -->
    <UModal v-model:open="showHeldOrdersModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3
            class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
          >
            <span>⏸️</span> Held Orders
          </h3>

          <div
            v-if="heldOrders.length === 0"
            class="text-center py-8 text-gray-400 dark:text-gray-500"
          >
            <span class="text-4xl block mb-2">📋</span>
            No held orders
          </div>

          <div v-else class="space-y-3 max-h-96 overflow-auto">
            <div
              v-for="order in heldOrders"
              :key="order.id"
              class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700/30"
            >
              <div class="flex justify-between items-start mb-2">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ order.id }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ new Date(order.createdAt).toLocaleTimeString() }}
                  </p>
                </div>
                <p class="font-bold text-amber-600 dark:text-amber-400">
                  {{ currency.format(order.total, pos.selectedCurrency.value) }}
                </p>
              </div>

              <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {{ order.items.length }} items
              </p>

              <div class="flex gap-2">
                <UButton
                  size="sm"
                  color="primary"
                  class="flex-1"
                  @click="recallOrder(order.id)"
                >
                  Recall
                </UButton>
                <UButton
                  size="sm"
                  color="red"
                  variant="ghost"
                  @click="deleteHeldOrder(order.id)"
                >
                  <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Numpad Modal -->
    <UModal v-model:open="showNumpad">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Enter Quantity
          </h3>

          <div
            class="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-4 text-center"
          >
            <span class="text-3xl font-bold text-gray-900 dark:text-white">{{
              numpadValue || "0"
            }}</span>
          </div>

          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="key in [
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                'C',
                '0',
                'DEL',
              ]"
              :key="key"
              class="h-14 rounded-xl font-bold text-lg transition-colors"
              :class="
                key === 'C'
                  ? 'bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-500/30'
                  : key === 'DEL'
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
              "
              @click="handleNumpadInput(key)"
            >
              {{ key }}
            </button>
          </div>

          <UButton
            block
            size="lg"
            color="primary"
            class="mt-4"
            @click="handleNumpadInput('OK')"
          >
            Confirm
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Settings Modal -->
    <UModal v-model:open="showSettingsModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h2
            class="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"
          >
            <span>⚙️</span> POS Settings
          </h2>

          <div class="space-y-6">
            <!-- Currency Setting -->
            <div>
              <label class="block text-sm text-gray-500 dark:text-gray-400 mb-2"
                >Default Currency</label
              >
              <USelect
                v-model="pos.selectedCurrency.value"
                :items="['LAK', 'THB', 'USD', 'SATS']"
              />
            </div>

            <!-- Lightning Provider -->
            <div>
              <label class="block text-sm text-gray-500 dark:text-gray-400 mb-2"
                >Lightning Provider</label
              >
              <USelect :items="['LNbits', 'Alby', 'NWC']" />
            </div>

            <!-- Session Info -->
            <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm text-gray-500 dark:text-gray-400"
                  >Session Status</span
                >
                <UBadge
                  :color="pos.isSessionActive.value ? 'success' : 'error'"
                  variant="soft"
                >
                  {{ pos.isSessionActive.value ? "Active" : "Inactive" }}
                </UBadge>
              </div>

              <div v-if="pos.currentSession.value" class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">Total Sales</span>
                  <span class="text-gray-900 dark:text-white font-medium">
                    {{
                      currency.format(
                        pos.currentSession.value.totalSales,
                        pos.selectedCurrency.value
                      )
                    }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Orders</span>
                  <span class="text-gray-900 dark:text-white font-medium">{{
                    pos.currentSession.value.totalOrders
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Cash Sales</span>
                  <span class="text-gray-900 dark:text-white font-medium">
                    {{
                      currency.format(
                        pos.currentSession.value.cashSales,
                        pos.selectedCurrency.value
                      )
                    }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Lightning Sales</span>
                  <span class="text-amber-600 dark:text-amber-400 font-medium">
                    {{
                      currency.format(
                        pos.currentSession.value.lightningSales,
                        pos.selectedCurrency.value
                      )
                    }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Offline Mode Info -->
            <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div class="flex items-center gap-2 mb-2">
                <span>📴</span>
                <span class="font-medium text-gray-900 dark:text-white"
                  >Offline Mode</span
                >
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Payments are stored locally and synced when online.
              </p>
              <p class="text-sm text-amber-600 dark:text-amber-400 mt-2">
                {{ offline.pendingCount.value }} payments pending sync
              </p>
            </div>

            <!-- Close Button -->
            <UButton
              block
              color="neutral"
              variant="outline"
              @click="showSettingsModal = false"
            >
              Close
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Product Options Modal (Variants & Modifiers) -->
    <UModal v-model:open="showProductOptionsModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900 max-h-[80vh] overflow-auto">
          <div v-if="selectedProduct" class="space-y-5">
            <!-- Product Header -->
            <div class="flex items-center gap-4">
              <div class="text-4xl">{{ selectedProduct.image || "📦" }}</div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ selectedProduct.name }}
                </h3>
                <p class="text-sm text-gray-500">
                  {{ selectedProduct.description || selectedProduct.sku }}
                </p>
              </div>
            </div>

            <!-- Size/Variant Selection -->
            <div
              v-if="
                selectedProduct.hasVariants &&
                selectedProduct.variants &&
                selectedProduct.variants.length > 0
              "
            >
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                📏 Select Size
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="variant in selectedProduct.variants"
                  :key="variant.id"
                  class="p-3 rounded-xl border-2 text-center transition-all"
                  :class="
                    selectedVariant?.id === variant.id
                      ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  "
                  @click="selectedVariant = variant"
                >
                  <div class="text-lg font-bold">{{ variant.shortName }}</div>
                  <div class="text-xs text-gray-500">{{ variant.name }}</div>
                  <div
                    v-if="variant.priceModifier !== 0"
                    class="text-xs mt-1"
                    :class="
                      variant.priceModifier > 0
                        ? 'text-amber-600'
                        : 'text-green-600'
                    "
                  >
                    {{ variant.priceModifier > 0 ? "+" : ""
                    }}{{
                      variant.priceModifierType === "percentage"
                        ? `${variant.priceModifier}%`
                        : currency.format(
                            variant.priceModifier,
                            pos.selectedCurrency.value
                          )
                    }}
                  </div>
                </button>
              </div>
            </div>

            <!-- Modifier Groups -->
            <div
              v-if="
                selectedProduct.modifierGroups &&
                selectedProduct.modifierGroups.length > 0
              "
            >
              <div
                v-for="group in selectedProduct.modifierGroups"
                :key="group.id"
                class="mb-4"
              >
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  {{ group.name }}
                  <span v-if="group.required" class="text-red-500">*</span>
                  <span
                    v-if="group.type === 'multiple'"
                    class="text-xs text-gray-500 ml-1"
                  >
                    (select {{ group.minSelect || 0 }}-{{
                      group.maxSelect || "any"
                    }})
                  </span>
                </label>
                <div class="space-y-2">
                  <button
                    v-for="mod in group.modifiers"
                    :key="mod.id"
                    class="w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all"
                    :class="
                      selectedModifiers.some((m) => m.id === mod.id)
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    "
                    @click="toggleModifier(mod)"
                  >
                    <div class="flex items-center gap-3">
                      <div
                        class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        :class="
                          selectedModifiers.some((m) => m.id === mod.id)
                            ? 'border-amber-500 bg-amber-500'
                            : 'border-gray-300 dark:border-gray-600'
                        "
                      >
                        <UIcon
                          v-if="selectedModifiers.some((m) => m.id === mod.id)"
                          name="i-heroicons-check"
                          class="w-3 h-3 text-white"
                        />
                      </div>
                      <span class="text-gray-900 dark:text-white">{{
                        mod.name
                      }}</span>
                    </div>
                    <span
                      v-if="mod.price !== 0"
                      class="text-sm"
                      :class="
                        mod.price > 0 ? 'text-amber-600' : 'text-green-600'
                      "
                    >
                      {{ mod.price > 0 ? "+" : ""
                      }}{{
                        currency.format(mod.price, pos.selectedCurrency.value)
                      }}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Quantity -->
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Quantity
              </label>
              <div class="flex items-center gap-3">
                <button
                  class="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xl font-bold"
                  @click="productQuantity = Math.max(1, productQuantity - 1)"
                >
                  −
                </button>
                <span
                  class="w-16 text-center text-2xl font-bold text-gray-900 dark:text-white"
                >
                  {{ productQuantity }}
                </span>
                <button
                  class="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xl font-bold"
                  @click="productQuantity++"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Total & Actions -->
            <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div class="flex items-center justify-between mb-4">
                <span class="text-gray-500">Total</span>
                <span
                  class="text-2xl font-bold text-amber-600 dark:text-amber-400"
                >
                  {{
                    currency.format(
                      selectedProductPrice * productQuantity,
                      pos.selectedCurrency.value
                    )
                  }}
                </span>
              </div>
              <div class="flex gap-2">
                <UButton
                  color="neutral"
                  variant="outline"
                  class="flex-1"
                  @click="showProductOptionsModal = false"
                >
                  Cancel
                </UButton>
                <UButton
                  color="primary"
                  class="flex-1 bg-gradient-to-r from-amber-500 to-orange-500"
                  @click="addProductWithOptions"
                >
                  Add to Cart
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Item Notes Modal -->
    <UModal v-model:open="showItemNotesModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900">
          <h3
            class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"
          >
            <span>📝</span> Item Notes
          </h3>

          <div class="space-y-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Add special instructions for kitchen (e.g., "no onions", "extra
              spicy", "allergies")
            </p>

            <UTextarea
              v-model="itemNotesValue"
              placeholder="Enter notes for this item..."
              :rows="3"
              autofocus
            />

            <!-- Quick Notes -->
            <div>
              <p class="text-xs text-gray-500 mb-2">Quick notes:</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="quickNote in [
                    'No ice',
                    'Extra spicy',
                    'Less sugar',
                    'No onions',
                    'Gluten free',
                    'Vegan',
                  ]"
                  :key="quickNote"
                  class="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  @click="
                    itemNotesValue = itemNotesValue
                      ? `${itemNotesValue}, ${quickNote}`
                      : quickNote
                  "
                >
                  {{ quickNote }}
                </button>
              </div>
            </div>

            <div class="flex gap-2 pt-2">
              <UButton
                color="neutral"
                variant="outline"
                class="flex-1"
                @click="showItemNotesModal = false"
              >
                Cancel
              </UButton>
              <UButton color="primary" class="flex-1" @click="saveItemNotes">
                Save Notes
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============================================ -->
    <!-- Table Switcher Modal -->
    <!-- ============================================ -->
    <UModal v-model:open="showTableSwitcher">
      <template #content>
        <div class="p-6 max-h-[80vh] overflow-auto">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-xl">
              🍽️
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Select Table
              </h3>
              <p class="text-sm text-gray-500">
                {{ availableTables.length }} tables available
              </p>
            </div>
          </div>

          <!-- Current table badge -->
          <div v-if="currentTable" class="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30">
            <div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <UIcon name="i-heroicons-check-circle" class="w-5 h-5" />
              <span class="font-medium">Current: {{ currentTable.name }}</span>
              <span class="text-sm opacity-75">({{ currentTable.seats }} seats)</span>
            </div>
          </div>

          <!-- Tables grid -->
          <div v-if="tables.length > 0" class="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <button
              v-for="table in tables"
              :key="table.id"
              :disabled="table.status === 'occupied' && table.name !== pos.tableNumber.value"
              class="relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :class="[
                table.name === pos.tableNumber.value
                  ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 ring-2 ring-amber-500/50'
                  : table.status === 'available'
                    ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-amber-500/50'
                    : table.status === 'reserved'
                      ? 'bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-500/30'
                      : 'bg-gray-100 dark:bg-gray-800/50 ring-1 ring-gray-200 dark:ring-gray-700'
              ]"
              @click="switchTable(table)"
            >
              <!-- Table icon based on status -->
              <div class="text-2xl">
                {{ table.status === 'reserved' ? '📋' : table.status === 'occupied' ? '🍽️' : '🪑' }}
              </div>
              
              <!-- Table name -->
              <span class="font-semibold text-sm" :class="table.name === pos.tableNumber.value ? 'text-white' : 'text-gray-900 dark:text-white'">
                {{ table.name }}
              </span>
              
              <!-- Seats -->
              <span class="text-xs" :class="table.name === pos.tableNumber.value ? 'text-white/75' : 'text-gray-500'">
                {{ table.seats }} seats
              </span>

              <!-- Status badge -->
              <span
                v-if="table.status !== 'available' && table.name !== pos.tableNumber.value"
                class="absolute top-1 right-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                :class="table.status === 'reserved' ? 'bg-purple-500 text-white' : 'bg-gray-500 text-white'"
              >
                {{ table.status === 'reserved' ? 'Reserved' : 'In use' }}
              </span>

              <!-- Current indicator -->
              <span
                v-if="table.name === pos.tableNumber.value"
                class="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg"
              >
                <UIcon name="i-heroicons-check" class="w-3 h-3" />
              </span>
            </button>
          </div>

          <!-- Empty state -->
          <div v-else class="text-center py-8">
            <div class="text-4xl mb-3">🪑</div>
            <p class="text-gray-500 dark:text-gray-400 mb-2">No tables configured</p>
            <p class="text-sm text-gray-400 dark:text-gray-500">
              Go to Tables page to set up your floor plan
            </p>
            <UButton
              color="primary"
              variant="soft"
              class="mt-4"
              @click="navigateTo('/pos/tables')"
            >
              Set up Tables
            </UButton>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <UButton
              color="neutral"
              variant="outline"
              class="flex-1"
              @click="showTableSwitcher = false"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-arrow-top-right-on-square"
              @click="navigateTo('/pos/tables')"
            >
              Manage Tables
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Slide-up transition for mobile cart */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}

.slide-up-enter-from > div:last-child,
.slide-up-leave-to > div:last-child {
  transform: translateY(100%);
}

/* Collapse transition for extras section */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease-out;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
