<!-- pages/pos/index.vue -->
<!-- 🛒 Full-Featured POS Terminal - Lightning + Nostr -->
<script setup lang="ts">
import type { Product, PaymentMethod } from '~/types';

definePageMeta({
  layout: 'blank',
});

// ============================================
// Composables
// ============================================
const pos = usePOS();
const productsStore = useProducts();
const lightning = useLightning();
const currency = useCurrency();
const offline = useOffline();

// ============================================
// UI State
// ============================================
const showPaymentModal = ref(false);
const showDiscountModal = ref(false);
const showCustomItemModal = ref(false);
const showHeldOrdersModal = ref(false);
const showSettingsModal = ref(false);
const showNumpad = ref(false);
const numpadTarget = ref<{ productId: string; currentQty: number } | null>(null);
const numpadValue = ref('');
const isProcessing = ref(false);

// Custom item form
const customItem = ref({ name: '', price: 0 });

// Discount form
const discountType = ref<'percentage' | 'fixed'>('percentage');
const discountValue = ref(0);

// Held orders storage
const heldOrders = ref<Array<{ id: string; items: typeof pos.cartItems.value; total: number; createdAt: string }>>([]);

// Current time display
const currentTime = ref(new Date());
let timeInterval: ReturnType<typeof setInterval>;

// ============================================
// Computed
// ============================================
const formattedTotal = computed(() => 
  currency.format(pos.total.value, pos.selectedCurrency.value)
);

const formattedTotalSats = computed(() => 
  currency.format(pos.totalSats.value, 'SATS')
);

const formattedTime = computed(() => {
  return currentTime.value.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
});

const formattedDate = computed(() => {
  return currentTime.value.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric'
  });
});

// Category icons mapping
const categoryIcons: Record<string, string> = {
  all: '🏪',
  drinks: '🍹',
  food: '🍽️',
  desserts: '🍰',
  snacks: '🍿',
  favorites: '⭐',
};

// Tip options
const tipOptions = [
  { label: 'No Tip', value: 0 },
  { label: '5%', value: 5 },
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '20%', value: 20 },
];

// ============================================
// Product Methods
// ============================================
const selectProduct = (product: Product) => {
  pos.addToCart(product);
};

const handleQuantityChange = (productId: string, delta: number) => {
  const item = pos.cartItems.value.find(i => i.product.id === productId);
  if (item) {
    pos.updateQuantity(productId, item.quantity + delta);
  }
};

const openNumpad = (productId: string, currentQty: number) => {
  numpadTarget.value = { productId, currentQty };
  numpadValue.value = currentQty.toString();
  showNumpad.value = true;
};

const handleNumpadInput = (value: string) => {
  if (value === 'C') {
    numpadValue.value = '';
  } else if (value === 'DEL') {
    numpadValue.value = numpadValue.value.slice(0, -1);
  } else if (value === 'OK') {
    if (numpadTarget.value) {
      const qty = parseInt(numpadValue.value) || 0;
      pos.updateQuantity(numpadTarget.value.productId, qty);
    }
    showNumpad.value = false;
    numpadTarget.value = null;
  } else {
    numpadValue.value += value;
  }
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
  const order = heldOrders.value.find(o => o.id === orderId);
  if (order) {
    order.items.forEach(item => {
      pos.addToCart(item.product, item.quantity);
    });
    heldOrders.value = heldOrders.value.filter(o => o.id !== orderId);
    showHeldOrdersModal.value = false;
  }
};

const deleteHeldOrder = (orderId: string) => {
  heldOrders.value = heldOrders.value.filter(o => o.id !== orderId);
};

const applyDiscount = () => {
  if (discountValue.value > 0) {
    pos.applyDiscount(discountType.value, discountValue.value);
  }
  showDiscountModal.value = false;
  discountValue.value = 0;
};

const addCustomItem = () => {
  if (customItem.value.name && customItem.value.price > 0) {
    const product: Product = {
      id: `custom-${Date.now()}`,
      name: customItem.value.name,
      sku: 'CUSTOM',
      categoryId: 'custom',
      unitId: 'piece',
      price: customItem.value.price,
      stock: 999,
      minStock: 0,
      branchId: 'main',
      status: 'active',
      image: '📦',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    pos.addToCart(product);
    customItem.value = { name: '', price: 0 };
    showCustomItemModal.value = false;
  }
};

// ============================================
// Payment Methods
// ============================================
const proceedToPayment = () => {
  if (pos.cartItems.value.length === 0) return;
  showPaymentModal.value = true;
};

const processPayment = async (method: PaymentMethod) => {
  isProcessing.value = true;

  try {
    const order = pos.createOrder(method);

    if (method === 'lightning' || method === 'bolt12') {
      // Handled by PaymentLightning component
    } else if (method === 'cash') {
      order.status = 'completed';
      pos.updateSessionTotals(order);
      
      if (!navigator.onLine) {
        const proof = lightning.createPaymentProof(
          order.id,
          'cash-' + order.id,
          'cash-payment',
          order.total,
          'cash',
          true
        );
        await offline.storeOfflinePayment(order, proof);
      }
      
      pos.clearCart();
      showPaymentModal.value = false;
    }
  } catch (e) {
    console.error('Payment error:', e);
  } finally {
    isProcessing.value = false;
  }
};

const cancelPayment = () => {
  showPaymentModal.value = false;
  isProcessing.value = false;
};

// ============================================
// Lifecycle
// ============================================
onMounted(async () => {
  await currency.init('LAK');
  await offline.init();
  await productsStore.init();
  
  if (!pos.isSessionActive.value) {
    pos.startSession('main', 'staff-1', 0);
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
  <div class="h-screen flex bg-gray-950 text-white overflow-hidden">
    <!-- ============================================ -->
    <!-- LEFT PANEL - Products -->
    <!-- ============================================ -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header Bar -->
      <header class="bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 px-4 py-3">
        <div class="flex items-center justify-between">
          <!-- Logo & Status -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl shadow-lg shadow-amber-500/20">
                ⚡
              </div>
              <div>
                <h1 class="text-lg font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  BitSpace POS
                </h1>
                <p class="text-xs text-gray-500">Lightning Powered</p>
              </div>
            </div>
            
            <!-- Connection Status -->
            <div 
              class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              :class="offline.isOnline.value ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'"
            >
              <span class="relative flex h-2 w-2">
                <span 
                  class="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                  :class="offline.isOnline.value ? 'bg-emerald-400' : 'bg-amber-400'"
                />
                <span 
                  class="relative inline-flex rounded-full h-2 w-2"
                  :class="offline.isOnline.value ? 'bg-emerald-500' : 'bg-amber-500'"
                />
              </span>
              {{ offline.isOnline.value ? 'Online' : 'Offline Mode' }}
            </div>

            <!-- Pending Sync -->
            <div 
              v-if="offline.pendingCount.value > 0" 
              class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
            >
              <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
              {{ offline.pendingCount.value }} pending
            </div>
          </div>

          <!-- Right Side -->
          <div class="flex items-center gap-4">
            <!-- Date & Time -->
            <div class="text-right hidden md:block">
              <div class="text-sm font-medium text-white">{{ formattedTime }}</div>
              <div class="text-xs text-gray-500">{{ formattedDate }}</div>
            </div>

            <div class="h-8 w-px bg-gray-800" />

            <!-- BTC Price -->
            <div class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50">
              <span class="text-amber-500">₿</span>
              <span class="text-sm font-medium">{{ currency.btcPriceFormatted.value }}</span>
            </div>

            <!-- Currency Selector -->
            <USelect
              v-model="pos.selectedCurrency.value"
              :items="['LAK', 'THB', 'USD', 'SATS']"
              size="sm"
              class="w-24"
            />
            
            <!-- Settings Button -->
            <UButton
              icon="i-heroicons-cog-6-tooth"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="showSettingsModal = true"
            />
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
            :class="productsStore.selectedCategory.value === cat.id 
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/25' 
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white'"
            @click="productsStore.selectedCategory.value = cat.id"
          >
            <span>{{ categoryIcons[cat.id] || '📁' }}</span>
            <span>{{ cat.name }}</span>
          </button>
        </div>
      </header>

      <!-- Products Grid -->
      <div class="flex-1 p-4 overflow-auto">
        <div 
          v-if="productsStore.filteredProducts.value.length === 0" 
          class="flex flex-col items-center justify-center h-full text-gray-500"
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
            class="group relative bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-amber-500/30 rounded-2xl p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/5"
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
            <div class="text-4xl mb-3 group-hover:scale-110 transition-transform">
              {{ product.image || '📦' }}
            </div>

            <!-- Product Info -->
            <div class="space-y-1">
              <h3 class="font-medium text-white text-sm leading-tight line-clamp-2">
                {{ product.name }}
              </h3>
              <p class="text-xs text-gray-500">{{ product.sku }}</p>
            </div>

            <!-- Price -->
            <div class="mt-3 space-y-0.5">
              <div class="text-amber-400 font-bold text-base">
                {{ currency.format(product.prices?.[pos.selectedCurrency.value] || product.price, pos.selectedCurrency.value) }}
              </div>
              <div class="text-xs text-gray-500">
                ≈ {{ currency.format(product.prices?.SATS || 0, 'SATS') }}
              </div>
            </div>

            <!-- Stock indicator -->
            <div 
              v-if="product.stock <= product.minStock"
              class="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400"
            >
              Low
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- RIGHT PANEL - Cart -->
    <!-- ============================================ -->
    <div class="w-[380px] bg-gray-900 border-l border-gray-800/50 flex flex-col">
      <!-- Cart Header -->
      <div class="p-4 border-b border-gray-800/50 bg-gray-900/80 backdrop-blur-xl">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl">
              🛒
            </div>
            <div>
              <h2 class="text-base font-semibold text-white">Current Order</h2>
              <p class="text-xs text-gray-500">{{ pos.itemCount.value }} items</p>
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
      </div>

      <!-- Cart Items -->
      <div class="flex-1 overflow-auto p-4">
        <!-- Empty State -->
        <div 
          v-if="pos.cartItems.value.length === 0" 
          class="flex flex-col items-center justify-center h-full text-gray-500"
        >
          <div class="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center text-4xl mb-4">
            🛒
          </div>
          <p class="text-base font-medium">Cart is empty</p>
          <p class="text-sm mt-1">Tap products to add</p>
        </div>

        <!-- Cart Items List -->
        <div v-else class="space-y-3">
          <div
            v-for="item in pos.cartItems.value"
            :key="item.product.id"
            class="bg-gray-800/50 rounded-xl p-3 border border-gray-700/30"
          >
            <div class="flex gap-3">
              <!-- Product Image -->
              <div class="text-2xl flex-shrink-0">{{ item.product.image || '📦' }}</div>
              
              <!-- Product Details -->
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start gap-2">
                  <h4 class="font-medium text-white text-sm leading-tight truncate">
                    {{ item.product.name }}
                  </h4>
                  <button
                    class="text-gray-500 hover:text-red-400 flex-shrink-0"
                    @click="pos.removeFromCart(item.product.id)"
                  >
                    <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                  </button>
                </div>
                
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ currency.format(item.price, pos.selectedCurrency.value) }} each
                </p>
                
                <!-- Quantity Controls & Total -->
                <div class="flex items-center justify-between mt-2">
                  <div class="flex items-center gap-1">
                    <button
                      class="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
                      @click="handleQuantityChange(item.product.id, -1)"
                    >
                      −
                    </button>
                    <button
                      class="w-10 h-7 bg-gray-700/50 rounded-lg flex items-center justify-center text-sm font-medium"
                      @click="openNumpad(item.product.id, item.quantity)"
                    >
                      {{ item.quantity }}
                    </button>
                    <button
                      class="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
                      @click="handleQuantityChange(item.product.id, 1)"
                    >
                      +
                    </button>
                  </div>
                  
                  <div class="text-amber-400 font-bold text-sm">
                    {{ currency.format(item.total, pos.selectedCurrency.value) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Discount & Tip Section -->
      <div v-if="pos.cartItems.value.length > 0" class="px-4 py-3 border-t border-gray-800/50 space-y-3">
        <!-- Discount Button -->
        <button
          class="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
          @click="showDiscountModal = true"
        >
          <div class="flex items-center gap-2 text-sm text-gray-400">
            <UIcon name="i-heroicons-tag" class="w-4 h-4" />
            <span>Add Discount</span>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-600" />
        </button>

        <!-- Tip Options -->
        <div>
          <p class="text-xs text-gray-500 mb-2">Add Tip ⚡</p>
          <div class="flex gap-2">
            <button
              v-for="tip in tipOptions"
              :key="tip.value"
              class="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
              :class="pos.tipAmount.value === (tip.value === 0 ? 0 : Math.round(pos.subtotal.value * tip.value / 100))
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/25'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'"
              @click="pos.setTipPercentage(tip.value)"
            >
              {{ tip.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Cart Summary -->
      <div class="p-4 border-t border-gray-800/50 bg-gray-900/80 backdrop-blur-xl">
        <!-- Summary Lines -->
        <div class="space-y-2 text-sm mb-4">
          <div class="flex justify-between text-gray-400">
            <span>Subtotal</span>
            <span>{{ currency.format(pos.subtotal.value, pos.selectedCurrency.value) }}</span>
          </div>
          <div v-if="pos.tipAmount.value > 0" class="flex justify-between text-gray-400">
            <span>Tip</span>
            <span class="text-amber-400">+{{ currency.format(pos.tipAmount.value, pos.selectedCurrency.value) }}</span>
          </div>
        </div>

        <!-- Total -->
        <div class="flex items-end justify-between mb-4 pt-3 border-t border-gray-800/50">
          <div>
            <p class="text-xs text-gray-500 mb-1">Total</p>
            <p class="text-2xl font-bold text-white">{{ formattedTotal }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-gray-500 mb-1">≈ Sats</p>
            <p class="text-lg font-semibold text-amber-400">{{ formattedTotalSats }}</p>
          </div>
        </div>

        <!-- Payment Buttons -->
        <div class="space-y-2">
          <UButton
            block
            size="lg"
            :disabled="pos.cartItems.value.length === 0"
            class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold shadow-lg shadow-amber-500/25"
            @click="proceedToPayment"
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
              @click="processPayment('cash')"
            >
              💵 Cash
            </UButton>
            <UButton
              block
              size="md"
              color="neutral"
              variant="soft"
              :disabled="pos.cartItems.value.length === 0"
              @click="processPayment('bolt12')"
            >
              📱 QR Static
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- MODALS -->
    <!-- ============================================ -->

    <!-- Payment Modal -->
    <UModal v-model:open="showPaymentModal">
      <template #content>
        <div class="p-6 bg-gray-900">
          <PaymentLightning
            v-if="showPaymentModal"
            :amount="pos.totalSats.value"
            :fiat-amount="pos.total.value"
            :currency="pos.selectedCurrency.value"
            :order-id="'ORD-' + Date.now().toString(36).toUpperCase()"
            @paid="() => { pos.clearCart(); showPaymentModal = false; }"
            @cancel="cancelPayment"
          />
        </div>
      </template>
    </UModal>

    <!-- Discount Modal -->
    <UModal v-model:open="showDiscountModal">
      <template #content>
        <div class="p-6 bg-gray-900">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🏷️</span> Apply Discount
          </h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2">Discount Type</label>
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
              <label class="block text-sm text-gray-400 mb-2">
                {{ discountType === 'percentage' ? 'Discount %' : 'Discount Amount' }}
              </label>
              <UInput
                v-model.number="discountValue"
                type="number"
                :placeholder="discountType === 'percentage' ? 'e.g., 10' : 'e.g., 5000'"
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
              <UButton
                color="primary"
                class="flex-1"
                @click="applyDiscount"
              >
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
        <div class="p-6 bg-gray-900">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📦</span> Add Custom Item
          </h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2">Item Name</label>
              <UInput
                v-model="customItem.name"
                placeholder="e.g., Special Order"
              />
            </div>
            
            <div>
              <label class="block text-sm text-gray-400 mb-2">
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
        <div class="p-6 bg-gray-900">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>⏸️</span> Held Orders
          </h3>
          
          <div v-if="heldOrders.length === 0" class="text-center py-8 text-gray-500">
            <span class="text-4xl block mb-2">📋</span>
            No held orders
          </div>
          
          <div v-else class="space-y-3 max-h-96 overflow-auto">
            <div
              v-for="order in heldOrders"
              :key="order.id"
              class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30"
            >
              <div class="flex justify-between items-start mb-2">
                <div>
                  <p class="font-medium text-white">{{ order.id }}</p>
                  <p class="text-xs text-gray-500">
                    {{ new Date(order.createdAt).toLocaleTimeString() }}
                  </p>
                </div>
                <p class="font-bold text-amber-400">
                  {{ currency.format(order.total, pos.selectedCurrency.value) }}
                </p>
              </div>
              
              <p class="text-sm text-gray-400 mb-3">
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
        <div class="p-6 bg-gray-900">
          <h3 class="text-lg font-semibold text-white mb-4">Enter Quantity</h3>
          
          <div class="bg-gray-800 rounded-xl p-4 mb-4 text-center">
            <span class="text-3xl font-bold text-white">{{ numpadValue || '0' }}</span>
          </div>
          
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="key in ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL']"
              :key="key"
              class="h-14 rounded-xl font-bold text-lg transition-colors"
              :class="key === 'C' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 
                      key === 'DEL' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' :
                      'bg-gray-800 text-white hover:bg-gray-700'"
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
        <div class="p-6 bg-gray-900">
          <h2 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span>⚙️</span> POS Settings
          </h2>
          
          <div class="space-y-6">
            <!-- Currency Setting -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Default Currency</label>
              <USelect
                v-model="pos.selectedCurrency.value"
                :items="['LAK', 'THB', 'USD', 'SATS']"
              />
            </div>

            <!-- Lightning Provider -->
            <div>
              <label class="block text-sm text-gray-400 mb-2">Lightning Provider</label>
              <USelect
                :items="['LNbits', 'Alby', 'NWC']"
                model-value="LNbits"
              />
            </div>

            <!-- Session Info -->
            <div class="bg-gray-800/50 rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm text-gray-400">Session Status</span>
                <UBadge :color="pos.isSessionActive.value ? 'success' : 'error'" variant="soft">
                  {{ pos.isSessionActive.value ? 'Active' : 'Inactive' }}
                </UBadge>
              </div>
              
              <div v-if="pos.currentSession.value" class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500">Total Sales</span>
                  <span class="text-white font-medium">
                    {{ currency.format(pos.currentSession.value.totalSales, pos.selectedCurrency.value) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Orders</span>
                  <span class="text-white font-medium">{{ pos.currentSession.value.totalOrders }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Cash Sales</span>
                  <span class="text-white font-medium">
                    {{ currency.format(pos.currentSession.value.cashSales, pos.selectedCurrency.value) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Lightning Sales</span>
                  <span class="text-amber-400 font-medium">
                    {{ currency.format(pos.currentSession.value.lightningSales, pos.selectedCurrency.value) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Offline Mode Info -->
            <div class="bg-gray-800/50 rounded-xl p-4">
              <div class="flex items-center gap-2 mb-2">
                <span>📴</span>
                <span class="font-medium text-white">Offline Mode</span>
              </div>
              <p class="text-sm text-gray-400">
                Payments are stored locally and synced when online.
              </p>
              <p class="text-sm text-amber-400 mt-2">
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
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
