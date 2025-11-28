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
    <!-- Left Panel - Products -->
    <div class="flex-1 flex flex-col">
      <!-- Header -->
      <header class="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">⚡</span>
              <h1 class="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                BitSpace POS
              </h1>
            </div>
            
            <!-- Online/Offline Status -->
            <div 
              class="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
              :class="offline.isOnline.value ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'"
            >
              <span class="w-2 h-2 rounded-full" :class="offline.isOnline.value ? 'bg-green-400' : 'bg-orange-400'" />
              {{ offline.isOnline.value ? 'Online' : 'Offline Mode' }}
            </div>

            <!-- Pending Sync Badge -->
            <div v-if="offline.pendingCount.value > 0" class="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
              {{ offline.pendingCount.value }} pending sync
            </div>
          </div>

          <div class="flex items-center gap-4">
            <!-- Currency Selector -->
            <USelect
              v-model="pos.selectedCurrency.value"
              :items="['LAK', 'THB', 'USD', 'SATS']"
              size="sm"
              class="w-24"
            />
            
            <!-- BTC Price -->
            <div class="text-sm text-gray-400">
              BTC: {{ currency.btcPriceFormatted.value }}
            </div>

            <UButton
              icon="i-heroicons-cog-6-tooth"
              color="neutral"
              variant="ghost"
              @click="showSettingsModal = true"
            />
          </div>
        </div>

        <!-- Search & Categories -->
        <div class="mt-4 flex gap-4">
          <UInput
            v-model="searchQuery"
            placeholder="Search products..."
            icon="i-heroicons-magnifying-glass"
            class="w-64"
          />
          
          <div class="flex gap-2">
            <UButton
              v-for="cat in categories"
              :key="cat.id"
              :color="selectedCategory === cat.id ? 'primary' : 'neutral'"
              :variant="selectedCategory === cat.id ? 'solid' : 'ghost'"
              size="sm"
              @click="selectedCategory = cat.id"
            >
              {{ cat.name }}
            </UButton>
          </div>
        </div>
      </header>

      <!-- Products Grid -->
      <div class="flex-1 p-6 overflow-auto">
        <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <button
            v-for="product in filteredProducts"
            :key="product.id"
            class="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-amber-500/50 rounded-xl p-4 text-left transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/10"
            @click="selectProduct(product)"
          >
            <div class="text-4xl mb-3">{{ product.image }}</div>
            <div class="font-medium text-white mb-1">{{ product.name }}</div>
            <div class="text-amber-400 font-bold">
              {{ currency.format(product.prices?.[pos.selectedCurrency.value as keyof typeof product.prices] || product.price, pos.selectedCurrency.value) }}
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {{ currency.format(product.prices?.SATS || 0, 'SATS') }}
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Right Panel - Cart -->
    <div class="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
      <!-- Cart Header -->
      <div class="p-4 border-b border-gray-800">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <span>🛒</span>
            Current Order
          </h2>
          <UBadge color="primary" variant="subtle">
            {{ pos.itemCount.value }} items
          </UBadge>
        </div>
      </div>

      <!-- Cart Items -->
      <div class="flex-1 overflow-auto p-4">
        <div v-if="pos.cartItems.value.length === 0" class="text-center text-gray-500 py-12">
          <span class="text-4xl block mb-4">🛒</span>
          <p>Cart is empty</p>
          <p class="text-sm mt-2">Tap products to add</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="item in pos.cartItems.value"
            :key="item.product.id"
            class="bg-gray-800 rounded-lg p-3"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="font-medium">{{ item.product.name }}</div>
                <div class="text-sm text-gray-400">
                  {{ currency.format(item.price, pos.selectedCurrency.value) }} each
                </div>
              </div>
              <button
                class="text-gray-500 hover:text-red-400"
                @click="pos.removeFromCart(item.product.id)"
              >
                <UIcon name="i-heroicons-x-mark" />
              </button>
            </div>
            
            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center gap-2">
                <button
                  class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center"
                  @click="handleQuantityChange(item.product.id, -1)"
                >
                  -
                </button>
                <span class="w-8 text-center font-medium">{{ item.quantity }}</span>
                <button
                  class="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center"
                  @click="handleQuantityChange(item.product.id, 1)"
                >
                  +
                </button>
              </div>
              <div class="font-bold text-amber-400">
                {{ currency.format(item.total, pos.selectedCurrency.value) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tip Section -->
      <div v-if="pos.cartItems.value.length > 0" class="px-4 py-3 border-t border-gray-800">
        <div class="text-sm text-gray-400 mb-2">Add Tip ⚡</div>
        <div class="flex gap-2">
          <button
            v-for="tip in tipOptions"
            :key="tip"
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="pos.tipAmount.value === (tip === 0 ? 0 : Math.round(pos.subtotal.value * tip / 100))
              ? 'bg-amber-500 text-black'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'"
            @click="pos.setTipPercentage(tip)"
          >
            {{ tip === 0 ? 'No tip' : `${tip}%` }}
          </button>
        </div>
      </div>

      <!-- Cart Summary -->
      <div class="p-4 border-t border-gray-800 bg-gray-850">
        <div class="space-y-2 text-sm">
          <div class="flex justify-between text-gray-400">
            <span>Subtotal</span>
            <span>{{ currency.format(pos.subtotal.value, pos.selectedCurrency.value) }}</span>
          </div>
          <div v-if="pos.tipAmount.value > 0" class="flex justify-between text-gray-400">
            <span>Tip</span>
            <span>{{ currency.format(pos.tipAmount.value, pos.selectedCurrency.value) }}</span>
          </div>
        </div>

        <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
          <div>
            <div class="text-sm text-gray-400">Total</div>
            <div class="text-2xl font-bold text-white">{{ formattedTotal }}</div>
            <div class="text-sm text-amber-400">≈ {{ formattedTotalSats }}</div>
          </div>
        </div>

        <!-- Payment Buttons -->
        <div class="mt-4 space-y-2">
          <UButton
            block
            size="lg"
            color="primary"
            :disabled="pos.cartItems.value.length === 0"
            class="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400"
            @click="proceedToPayment"
          >
            <span class="flex items-center gap-2">
              <span>⚡</span>
              Pay with Lightning
            </span>
          </UButton>

          <UButton
            block
            size="lg"
            color="neutral"
            variant="outline"
            :disabled="pos.cartItems.value.length === 0"
            @click="processPayment('cash')"
          >
            💵 Cash Payment
          </UButton>
        </div>

        <!-- Clear Cart -->
        <button
          v-if="pos.cartItems.value.length > 0"
          class="w-full mt-3 text-sm text-gray-500 hover:text-red-400"
          @click="pos.clearCart"
        >
          Clear Cart
        </button>
      </div>
    </div>

    <!-- Payment Modal -->
    <UModal v-model:open="showPaymentModal">
      <template #content>
        <div class="p-6">
          <PaymentLightning
            v-if="showPaymentModal"
            :amount="pos.totalSats.value"
            :fiat-amount="pos.total.value"
            :currency="pos.selectedCurrency.value"
            :order-id="'ORD-' + Date.now().toString(36)"
            @paid="() => { pos.clearCart(); showPaymentModal = false; }"
            @cancel="cancelPayment"
          />
        </div>
      </template>
    </UModal>

    <!-- Settings Modal -->
    <UModal v-model:open="showSettingsModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-xl font-bold mb-4">⚙️ POS Settings</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-400 mb-2">Default Currency</label>
              <USelect
                v-model="pos.selectedCurrency.value"
                :items="['LAK', 'THB', 'USD', 'SATS']"
              />
            </div>

            <div>
              <label class="block text-sm text-gray-400 mb-2">Lightning Provider</label>
              <USelect
                :items="['lnbits', 'alby', 'nwc']"
                model-value="lnbits"
              />
            </div>

            <div class="pt-4 border-t border-gray-700">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-400">Session Status</span>
                <UBadge :color="pos.isSessionActive.value ? 'success' : 'error'">
                  {{ pos.isSessionActive.value ? 'Active' : 'Inactive' }}
                </UBadge>
              </div>
              
              <div v-if="pos.currentSession.value" class="mt-2 text-sm text-gray-500">
                Total Sales: {{ currency.format(pos.currentSession.value.totalSales, pos.selectedCurrency.value) }}
                <br>
                Orders: {{ pos.currentSession.value.totalOrders }}
              </div>
            </div>

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
.bg-gray-850 {
  background-color: rgb(26, 32, 44);
}
</style>
