<!-- pages/orders/create.vue -->
<script setup lang="ts">
import type { Product, CartItem, Order, PaymentMethod } from '~/types';

const { t } = useI18n();
const router = useRouter();

// Mock products data
const products = ref<Product[]>([
  {
    id: '1',
    name: 'ເບຍ Beer Lao',
    sku: 'BL001',
    description: 'ເບຍລາວ ປະເພດຂວດ 640ml',
    categoryId: '1',
    unitId: '1',
    price: 12000,
    stock: 150,
    minStock: 20,
    branchId: '1',
    status: 'active',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'ເຂົ້າຈີ່ Grilled Chicken',
    sku: 'GC001',
    description: 'ເຂົ້າຈີ່ປີ້ງ ພ້ອມເຄື່ອງເຈບ',
    categoryId: '2',
    unitId: '2',
    price: 25000,
    stock: 50,
    minStock: 10,
    branchId: '1',
    status: 'active',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  },
  {
    id: '3',
    name: 'ເຂົ້າຫມົກ Khao Mok',
    sku: 'KM001',
    description: 'ເຂົ້າຫມົກປະເພດຊີ້ນຫມູ',
    categoryId: '2',
    unitId: '2',
    price: 20000,
    stock: 30,
    minStock: 5,
    branchId: '1',
    status: 'active',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  },
  {
    id: '4',
    name: 'ນ້ຳດື່ມ Water',
    sku: 'WA001',
    description: 'ນ້ຳດື່ມຂວດ 500ml',
    categoryId: '1',
    unitId: '1',
    price: 3000,
    stock: 200,
    minStock: 50,
    branchId: '1',
    status: 'active',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  },
  {
    id: '5',
    name: 'ກາເຟ Coffee Lao',
    sku: 'CF001',
    description: 'ກາເຟລາວ ຮ້ອນ/ເຢັນ',
    categoryId: '1',
    unitId: '3',
    price: 15000,
    stock: 100,
    minStock: 20,
    branchId: '1',
    status: 'active',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  },
  {
    id: '6',
    name: 'ສົ້ມຕຳ Papaya Salad',
    sku: 'PS001',
    description: 'ສົ້ມຕຳລາວ ລົດຊາດແຊບ',
    categoryId: '2',
    unitId: '2',
    price: 18000,
    stock: 40,
    minStock: 10,
    branchId: '1',
    status: 'active',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  },
]);

const categories = [
  { id: '', name: t('common.all') },
  { id: '1', name: 'ເຄື່ອງດື່ມ / Beverages' },
  { id: '2', name: 'ອາຫານ / Food' },
  { id: '3', name: 'ຂອງຫວານ / Desserts' },
];

// Cart state
const cart = ref<CartItem[]>([]);
const searchQuery = ref('');
const selectedCategory = ref('');
const customerName = ref('');
const customerPhone = ref('');
const customerEmail = ref('');
const orderNotes = ref('');
const selectedPaymentMethod = ref<PaymentMethod>('cash');
const taxRate = 0.1; // 10% tax
const tipAmount = ref(0);

// Payment modal
const showPaymentModal = ref(false);
const processing = ref(false);

const paymentMethods = [
  { value: 'cash', label: t('pos.cash'), icon: 'i-heroicons-banknotes' },
  { value: 'lightning', label: 'Lightning', icon: 'i-heroicons-bolt' },
  { value: 'qr_static', label: 'QR Code', icon: 'i-heroicons-qr-code' },
];

// Filtered products
const filteredProducts = computed(() => {
  return products.value.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesCategory = !selectedCategory.value || product.categoryId === selectedCategory.value;
    return matchesSearch && matchesCategory && product.status === 'active';
  });
});

// Cart calculations
const subtotal = computed(() => cart.value.reduce((sum, item) => sum + item.total, 0));
const tax = computed(() => subtotal.value * taxRate);
const total = computed(() => subtotal.value + tax.value + tipAmount.value);

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('lo-LA', {
    style: 'currency',
    currency: 'LAK',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Add product to cart
const addToCart = (product: Product) => {
  const existingItem = cart.value.find((item) => item.product.id === product.id);
  
  if (existingItem) {
    existingItem.quantity += 1;
    existingItem.total = existingItem.quantity * existingItem.price;
  } else {
    cart.value.push({
      product,
      quantity: 1,
      price: product.price,
      total: product.price,
    });
  }
};

// Update cart item quantity
const updateQuantity = (item: CartItem, delta: number) => {
  const newQuantity = item.quantity + delta;
  
  if (newQuantity <= 0) {
    removeFromCart(item);
  } else if (newQuantity <= item.product.stock) {
    item.quantity = newQuantity;
    item.total = item.quantity * item.price;
  }
};

// Remove from cart
const removeFromCart = (item: CartItem) => {
  const index = cart.value.findIndex((i) => i.product.id === item.product.id);
  if (index !== -1) {
    cart.value.splice(index, 1);
  }
};

// Clear cart
const clearCart = () => {
  cart.value = [];
  tipAmount.value = 0;
  customerName.value = '';
  customerPhone.value = '';
  customerEmail.value = '';
  orderNotes.value = '';
};

// Open payment modal
const openPaymentModal = () => {
  if (cart.value.length === 0) return;
  showPaymentModal.value = true;
};

// Process order
const processOrder = async () => {
  processing.value = true;
  
  try {
    // Generate order ID
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    
    // Create order object
    const order: Partial<Order> = {
      id: orderId,
      customer: customerName.value || 'Walk-in Customer',
      branch: 'Vientiane Center',
      date: new Date().toISOString(),
      total: total.value,
      currency: 'LAK',
      status: 'completed',
      paymentMethod: selectedPaymentMethod.value,
      notes: orderNotes.value,
      tip: tipAmount.value,
      items: cart.value.map((item) => ({
        id: item.product.id,
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        product: item.product,
      })),
    };
    
    // TODO: Save to Nostr/Hasura
    console.log('Order created:', order);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Close modal and redirect
    showPaymentModal.value = false;
    clearCart();
    
    // Navigate to order detail
    router.push(`/orders/${orderId}`);
  } catch (error) {
    console.error('Error processing order:', error);
  } finally {
    processing.value = false;
  }
};

// Keyboard shortcuts
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + P to open payment
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      openPaymentModal();
    }
    // Escape to close modal
    if (e.key === 'Escape') {
      showPaymentModal.value = false;
    }
  };
  
  window.addEventListener('keydown', handleKeydown);
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
});
</script>

<template>
  <div class="flex h-[calc(100vh-4rem)]">
    <!-- Products Section -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('orders.createOrder') }}</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('orders.createOrderDesc') }}</p>
          </div>
          <UButton color="gray" variant="ghost" icon="i-heroicons-arrow-left" :label="t('common.back')" to="/orders" />
        </div>
        
        <!-- Filters -->
        <div class="flex gap-4">
          <UInput
            v-model="searchQuery"
            class="flex-1"
            icon="i-heroicons-magnifying-glass"
            :placeholder="t('products.searchPlaceholder')"
          />
          <USelect
            v-model="selectedCategory"
            :options="categories"
            value-attribute="id"
            option-attribute="name"
            class="w-48"
          />
        </div>
      </div>

      <!-- Products Grid -->
      <div class="flex-1 overflow-y-auto p-4">
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary-500 transition-all duration-200"
            @click="addToCart(product)"
          >
            <div class="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
              <Icon name="i-heroicons-cube" class="w-12 h-12 text-gray-400" />
              <div
                v-if="product.stock <= product.minStock"
                class="absolute top-2 right-2"
              >
                <UBadge color="red" size="xs">{{ t('products.lowStock') }}</UBadge>
              </div>
              <!-- Quick add overlay -->
              <div class="absolute inset-0 bg-primary-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div class="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
                  <Icon name="i-heroicons-plus" class="w-6 h-6 text-primary-500" />
                </div>
              </div>
            </div>
            <div class="p-3">
              <h3 class="font-medium text-gray-900 dark:text-white truncate">{{ product.name }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ product.sku }}</p>
              <div class="flex items-center justify-between mt-2">
                <span class="text-lg font-bold text-primary-600 dark:text-primary-400">{{ formatCurrency(product.price) }}</span>
                <span class="text-xs text-gray-500">{{ t('products.stock') }}: {{ product.stock }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center h-64 text-gray-500">
          <Icon name="i-heroicons-magnifying-glass" class="w-12 h-12 mb-4" />
          <p>{{ t('products.noProducts') }}</p>
        </div>
      </div>
    </div>

    <!-- Cart Section -->
    <div class="w-96 bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col">
      <!-- Cart Header -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-800">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ t('pos.cart') }}
            <span v-if="cart.length" class="text-sm font-normal text-gray-500">({{ cart.length }} {{ t('pos.items') }})</span>
          </h2>
          <UButton
            v-if="cart.length"
            color="gray"
            variant="ghost"
            size="xs"
            icon="i-heroicons-trash"
            @click="clearCart"
          />
        </div>
      </div>

      <!-- Cart Items -->
      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="cart.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500">
          <Icon name="i-heroicons-shopping-cart" class="w-16 h-16 mb-4 opacity-50" />
          <p>{{ t('pos.emptyCart') }}</p>
          <p class="text-sm">{{ t('pos.addProductsHint') }}</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="item in cart"
            :key="item.product.id"
            class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h4 class="font-medium text-gray-900 dark:text-white text-sm">{{ item.product.name }}</h4>
                <p class="text-xs text-gray-500 mt-1">{{ formatCurrency(item.price) }} {{ t('pos.each') }}</p>
              </div>
              <UButton
                color="gray"
                variant="ghost"
                size="xs"
                icon="i-heroicons-x-mark"
                @click="removeFromCart(item)"
              />
            </div>
            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center gap-2">
                <UButton
                  size="xs"
                  color="gray"
                  variant="solid"
                  icon="i-heroicons-minus"
                  @click="updateQuantity(item, -1)"
                />
                <span class="w-8 text-center font-medium">{{ item.quantity }}</span>
                <UButton
                  size="xs"
                  color="gray"
                  variant="solid"
                  icon="i-heroicons-plus"
                  :disabled="item.quantity >= item.product.stock"
                  @click="updateQuantity(item, 1)"
                />
              </div>
              <span class="font-bold text-gray-900 dark:text-white">{{ formatCurrency(item.total) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer Info -->
      <div v-if="cart.length" class="p-4 border-t border-gray-200 dark:border-gray-800">
        <UInput
          v-model="customerName"
          size="sm"
          icon="i-heroicons-user"
          :placeholder="t('orders.customerName')"
          class="mb-2"
        />
        <UInput
          v-model="customerPhone"
          size="sm"
          icon="i-heroicons-phone"
          :placeholder="t('orders.customerPhone')"
        />
      </div>

      <!-- Cart Summary -->
      <div class="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">{{ t('pos.subtotal') }}</span>
            <span class="font-medium">{{ formatCurrency(subtotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">{{ t('pos.tax') }} (10%)</span>
            <span class="font-medium">{{ formatCurrency(tax) }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-gray-500 dark:text-gray-400">{{ t('pos.tip') }}</span>
            <UInput
              v-model.number="tipAmount"
              size="xs"
              class="w-24 text-right"
              type="number"
              :min="0"
            />
          </div>
          <div class="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
            <div class="flex justify-between text-lg font-bold">
              <span>{{ t('pos.total') }}</span>
              <span class="text-primary-600 dark:text-primary-400">{{ formatCurrency(total) }}</span>
            </div>
          </div>
        </div>

        <!-- Payment Button -->
        <UButton
          class="w-full mt-4"
          size="lg"
          color="primary"
          :disabled="cart.length === 0"
          @click="openPaymentModal"
        >
          <template #leading>
            <Icon name="i-heroicons-credit-card" class="w-5 h-5" />
          </template>
          {{ t('pos.proceedToPayment') }}
          <template #trailing>
            <kbd class="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-mono bg-white/20 rounded">⌘P</kbd>
          </template>
        </UButton>
      </div>
    </div>

    <!-- Payment Modal -->
    <UModal v-model:open="showPaymentModal" :ui="{ width: 'max-w-lg' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold">{{ t('pos.payment') }}</h3>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-x-mark"
                @click="showPaymentModal = false"
              />
            </div>
          </template>

          <div class="space-y-6">
            <!-- Order Summary -->
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div class="flex justify-between items-center mb-4">
                <span class="text-gray-500">{{ t('pos.itemsCount') }}</span>
                <span class="font-medium">{{ cart.reduce((sum, item) => sum + item.quantity, 0) }} {{ t('pos.items') }}</span>
              </div>
              <div class="flex justify-between items-center text-xl font-bold">
                <span>{{ t('pos.total') }}</span>
                <span class="text-primary-600 dark:text-primary-400">{{ formatCurrency(total) }}</span>
              </div>
            </div>

            <!-- Payment Method -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {{ t('pos.paymentMethod') }}
              </label>
              <div class="grid grid-cols-3 gap-3">
                <button
                  v-for="method in paymentMethods"
                  :key="method.value"
                  class="flex flex-col items-center p-4 rounded-lg border-2 transition-all"
                  :class="[
                    selectedPaymentMethod === method.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  ]"
                  @click="selectedPaymentMethod = method.value as PaymentMethod"
                >
                  <Icon
                    :name="method.icon"
                    class="w-8 h-8 mb-2"
                    :class="selectedPaymentMethod === method.value ? 'text-primary-500' : 'text-gray-400'"
                  />
                  <span
                    class="text-sm font-medium"
                    :class="selectedPaymentMethod === method.value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'"
                  >
                    {{ method.label }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Lightning Payment Component -->
            <div v-if="selectedPaymentMethod === 'lightning'" class="text-center py-4">
              <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <Icon name="i-heroicons-bolt" class="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <p class="text-gray-600 dark:text-gray-400 mb-2">{{ t('pos.scanToPayLightning') }}</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatCurrency(total) }}</p>
                <p class="text-sm text-gray-500 mt-1">≈ {{ (total / 50000000).toFixed(0) }} sats</p>
              </div>
            </div>

            <!-- QR Code Payment -->
            <div v-if="selectedPaymentMethod === 'qr_static'" class="text-center py-4">
              <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <Icon name="i-heroicons-qr-code" class="w-16 h-16 text-primary-500 mx-auto mb-4" />
                <p class="text-gray-600 dark:text-gray-400 mb-2">{{ t('pos.scanQRCode') }}</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatCurrency(total) }}</p>
              </div>
            </div>

            <!-- Order Notes -->
            <UFormField :label="t('orders.notes')">
              <UTextarea
                v-model="orderNotes"
                :placeholder="t('orders.notesPlaceholder')"
                rows="2"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="gray"
                variant="outline"
                :label="t('common.cancel')"
                @click="showPaymentModal = false"
              />
              <UButton
                color="primary"
                :loading="processing"
                :label="processing ? t('pos.processing') : t('pos.confirmPayment')"
                @click="processOrder"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
