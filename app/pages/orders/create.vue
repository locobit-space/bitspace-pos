<!-- pages/orders/create.vue -->
<!-- 🛒 Enterprise Order System - Full Featured -->
<script setup lang="ts">
import type { Product, CartItem, Order, PaymentMethod, LoyaltyMember } from '~/types';

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const router = useRouter();
const toast = useToast();

// Composables
const productsStore = useProductsStore();
const ordersStore = useOrders();
const customersStore = useCustomers();
const { format: formatCurrency } = useCurrency();

// Initialize
const isLoading = ref(true);
onMounted(async () => {
  await Promise.all([
    productsStore.init(),
    customersStore.init(),
  ]);
  isLoading.value = false;
});

// ============================================
// ORDER STATE
// ============================================
const orderStatus = ref<'draft' | 'confirmed' | 'processing'>('draft');
const orderType = ref<'dine_in' | 'takeaway' | 'delivery' | 'pickup'>('dine_in');
const tableNumber = ref('');

// ============================================
// CUSTOMER (from system)
// ============================================
const showCustomerModal = ref(false);
const customerSearchQuery = ref('');
const selectedCustomer = ref<LoyaltyMember | null>(null);

const filteredCustomers = computed(() => {
  if (!customerSearchQuery.value.trim()) {
    return customersStore.customers.value.slice(0, 10);
  }
  return customersStore.searchCustomers(customerSearchQuery.value);
});

const selectCustomer = (customer: LoyaltyMember) => {
  selectedCustomer.value = customer;
  showCustomerModal.value = false;
  toast.add({
    title: 'Customer Selected',
    description: customer.name || customer.phone || 'Customer',
    color: 'green',
    timeout: 1500,
  });
};

// ============================================
// SHIPPING / SENDER INFO
// ============================================
const showShippingModal = ref(false);
const shippingInfo = ref({
  senderName: '',
  senderPhone: '',
  recipientName: '',
  recipientPhone: '',
  address: '',
  city: '',
  postalCode: '',
  deliveryNotes: '',
  deliveryDate: '',
  deliveryTime: '',
});

// ============================================
// PRODUCT SELECTION MODAL
// ============================================
const showProductModal = ref(false);
const productSearchQuery = ref('');
const selectedProductsInModal = ref<Set<string>>(new Set());
const productQuantities = ref<Record<string, number>>({});

const products = computed(() => productsStore.products.value);

const filteredProducts = computed(() => {
  if (!productSearchQuery.value.trim()) {
    return products.value.filter(p => p.status === 'active');
  }
  const query = productSearchQuery.value.toLowerCase();
  return products.value.filter(p =>
    p.status === 'active' && (
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    )
  );
});

const toggleProductSelection = (productId: string) => {
  if (selectedProductsInModal.value.has(productId)) {
    selectedProductsInModal.value.delete(productId);
    delete productQuantities.value[productId];
  } else {
    selectedProductsInModal.value.add(productId);
    productQuantities.value[productId] = 1;
  }
  // Trigger reactivity
  selectedProductsInModal.value = new Set(selectedProductsInModal.value);
};

const updateProductQuantityInModal = (productId: string, qty: number) => {
  if (qty > 0) {
    productQuantities.value[productId] = qty;
  }
};

const addSelectedProductsToCart = () => {
  for (const productId of selectedProductsInModal.value) {
    const product = products.value.find(p => p.id === productId);
    if (product) {
      const qty = productQuantities.value[productId] || 1;
      addToCartWithQty(product, qty);
    }
  }

  toast.add({
    title: 'Products Added',
    description: `${selectedProductsInModal.value.size} items added to order`,
    color: 'green',
  });

  selectedProductsInModal.value = new Set();
  productQuantities.value = {};
  showProductModal.value = false;
};

// ============================================
// CART STATE
// ============================================
const cart = ref<CartItem[]>([]);
const orderNotes = ref('');
const selectedPaymentMethod = ref<PaymentMethod>('cash');
const taxRate = 0.10;
const discountAmount = ref(0);
const discountType = ref<'fixed' | 'percent'>('fixed');
const deliveryFee = ref(0);

// Cart calculations
const cartItemCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0));
const subtotal = computed(() => cart.value.reduce((sum, item) => sum + item.total, 0));
const discountValue = computed(() => {
  if (discountType.value === 'percent') {
    return subtotal.value * (discountAmount.value / 100);
  }
  return discountAmount.value;
});
const tax = computed(() => (subtotal.value - discountValue.value) * taxRate);
const total = computed(() => subtotal.value - discountValue.value + tax.value + deliveryFee.value);

// Cart actions
const addToCartWithQty = (product: Product, qty: number) => {
  const existingItem = cart.value.find((item) => item.product.id === product.id);

  if (existingItem) {
    existingItem.quantity += qty;
    existingItem.total = existingItem.quantity * existingItem.price;
  } else {
    cart.value.push({
      product,
      quantity: qty,
      price: product.price,
      total: product.price * qty,
    });
  }
};

const updateQuantity = (item: CartItem, qty: number) => {
  if (qty <= 0) {
    removeFromCart(item);
  } else if (qty <= item.product.stock) {
    item.quantity = qty;
    item.total = item.quantity * item.price;
  }
};

const removeFromCart = (item: CartItem) => {
  const index = cart.value.findIndex((i) => i.product.id === item.product.id);
  if (index !== -1) {
    cart.value.splice(index, 1);
  }
};

const clearCart = () => {
  cart.value = [];
  discountAmount.value = 0;
  deliveryFee.value = 0;
  selectedCustomer.value = null;
  orderNotes.value = '';
  shippingInfo.value = {
    senderName: '',
    senderPhone: '',
    recipientName: '',
    recipientPhone: '',
    address: '',
    city: '',
    postalCode: '',
    deliveryNotes: '',
    deliveryDate: '',
    deliveryTime: '',
  };
};

// ============================================
// PAYMENT
// ============================================
const showPaymentModal = ref(false);
const processing = ref(false);

const paymentMethods = [
  { value: 'cash', label: 'Cash', emoji: '💵' },
  { value: 'lightning', label: 'Lightning', emoji: '⚡' },
  { value: 'qr_static', label: 'QR Code', emoji: '📱' },
  { value: 'bank', label: 'Bank Transfer', emoji: '🏦' },
];

const orderTypeOptions = [
  { value: 'dine_in', label: 'Dine In', icon: '🍽️' },
  { value: 'takeaway', label: 'Takeaway', icon: '🥡' },
  { value: 'delivery', label: 'Delivery', icon: '🚚' },
  { value: 'pickup', label: 'Pickup', icon: '🏪' },
];

const statusOptions = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'confirmed', label: 'Confirmed', color: 'blue' },
  { value: 'processing', label: 'Processing', color: 'yellow' },
];

const getStatusStyle = (status: string) => {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
    confirmed: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    processing: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
  };
  return styles[status] || styles.draft;
};

const processOrder = async () => {
  if (cart.value.length === 0) return;
  processing.value = true;

  try {
    const orderData: Order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      customer: selectedCustomer.value?.name || 'Walk-in Customer',
      customerPhone: selectedCustomer.value?.phone || shippingInfo.value.senderPhone,
      customerEmail: selectedCustomer.value?.email,
      branch: 'Default Branch',
      date: new Date().toISOString(),
      total: total.value,
      subtotal: subtotal.value,
      tax: tax.value,
      discount: discountValue.value,
      currency: 'LAK',
      status: orderStatus.value === 'draft' ? 'pending' : 'processing',
      orderType: orderType.value,
      tableNumber: tableNumber.value || undefined,
      paymentMethod: selectedPaymentMethod.value,
      notes: orderNotes.value || undefined,
      shippingAddress: orderType.value === 'delivery' ? shippingInfo.value.address : undefined,
      items: cart.value.map((item) => ({
        id: `ITEM-${Date.now()}-${item.product.id}`,
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        product: item.product,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedOrder = await ordersStore.createOrder(orderData);

    if (selectedPaymentMethod.value === 'cash' || selectedPaymentMethod.value === 'bank') {
      await ordersStore.completeOrder(savedOrder.id, selectedPaymentMethod.value);
    }

    toast.add({
      title: 'Order Created',
      description: `Order #${savedOrder.id.slice(-6).toUpperCase()}`,
      icon: 'i-heroicons-check-circle',
      color: 'green',
    });

    showPaymentModal.value = false;
    clearCart();
    router.push(`/orders/${savedOrder.id}`);
  } catch (error) {
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to create order',
      color: 'red',
    });
  } finally {
    processing.value = false;
  }
};

// Keyboard shortcuts
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'F2') { e.preventDefault(); showProductModal.value = true; }
    if (e.key === 'F3') { e.preventDefault(); showCustomerModal.value = true; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      if (cart.value.length > 0) showPaymentModal.value = true;
    }
    if (e.key === 'Escape') {
      showPaymentModal.value = false;
      showCustomerModal.value = false;
      showProductModal.value = false;
      showShippingModal.value = false;
    }
  };
  window.addEventListener('keydown', handleKeydown);
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- ============ HEADER ============ -->
    <div class=" bg-slate-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
      <div class="max-w-7xl mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <UButton icon="i-heroicons-chevron-left" variant="ghost" color="gray" to="/orders" />
            <span class="text-sm text-gray-500">New Order</span>
            <span class="text-gray-300">›</span>
            <span class="font-medium text-gray-900 dark:text-white">Order #NEW</span>
          </div>
          <div class="flex items-center gap-2">
            <UButton icon="i-heroicons-printer" variant="outline" color="gray" disabled>Print</UButton>
            <UButton v-if="cart.length > 0" icon="i-heroicons-trash" variant="outline" color="red" @click="clearCart">
              Clear</UButton>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="flex gap-6">
        <!-- ============ MAIN CONTENT ============ -->
        <div class="flex-1 space-y-6">
          <!-- Order Title & Status -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Order #NEW</h1>
              <!-- Status Dropdown -->
              <UDropdownMenu :items="[[
                { label: 'Draft', click: () => orderStatus = 'draft' },
                { label: 'Confirmed', click: () => orderStatus = 'confirmed' },
                { label: 'Processing', click: () => orderStatus = 'processing' },
              ]]">
                <button
                  :class="[getStatusStyle(orderStatus), 'px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1']">
                  ● {{statusOptions.find(s => s.value === orderStatus)?.label}}
                  <UIcon name="i-heroicons-chevron-down" class="w-3 h-3" />
                </button>
              </UDropdownMenu>
            </div>

            <!-- Order Type -->
            <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button v-for="type in orderTypeOptions" :key="type.value"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all" :class="[
                  orderType === type.value
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700'
                ]" @click="orderType = type.value as any">
                <span>{{ type.icon }}</span>
                <span>{{ type.label }}</span>
              </button>
            </div>
          </div>

          <!-- Table Number (for Dine In) -->
          <div v-if="orderType === 'dine_in'"
            class="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 border-slate-200 p-4">
            <UIcon name="i-heroicons-square-2-stack" class="w-5 h-5 text-gray-400" />
            <label class="text-sm text-gray-500">Table Number</label>
            <UInput v-model="tableNumber" placeholder="e.g. A1, 5" class="w-32" />
          </div>

          <!-- Customer Section -->
          <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div v-if="selectedCustomer" class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div
                  class="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {{ (selectedCustomer.name || 'C').slice(0, 2).toUpperCase() }}
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ selectedCustomer.name ||
                      'Customer' }}</h3>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700">{{ selectedCustomer.tier
                    }}</span>
                  </div>
                  <p class="text-sm text-gray-500">{{ selectedCustomer.phone || selectedCustomer.email || 'No contact'
                  }}</p>
                  <button class="text-sm text-primary-600 hover:underline flex items-center gap-1 mt-1"
                    @click="showCustomerModal = true">
                    <UIcon name="i-heroicons-pencil" class="w-3 h-3" /> Change Customer
                  </button>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <UButton v-if="selectedCustomer.email" icon="i-heroicons-envelope" variant="soft" color="gray">Email
                </UButton>
                <UButton v-if="selectedCustomer.phone" icon="i-heroicons-phone" variant="soft" color="gray">{{
                  selectedCustomer.phone }}</UButton>
              </div>
            </div>
            <div v-else class="flex items-center justify-between">
              <span class="text-gray-500">No customer selected</span>
              <UButton icon="i-heroicons-user-plus" variant="soft" color="primary" @click="showCustomerModal = true">
                Add Customer (F3)
              </UButton>
            </div>
          </div>

          <!-- Shipping Info (for Delivery) -->
          <div v-if="orderType === 'delivery'"
            class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🚚</span> Delivery Information
              </h3>
              <UButton variant="soft" size="sm" @click="showShippingModal = true">
                {{ shippingInfo.address ? 'Edit' : 'Add Delivery Info' }}
              </UButton>
            </div>
            <div v-if="shippingInfo.address" class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-gray-500">Recipient</p>
                <p class="font-medium">{{ shippingInfo.recipientName }}</p>
                <p>{{ shippingInfo.recipientPhone }}</p>
              </div>
              <div>
                <p class="text-gray-500">Address</p>
                <p class="font-medium">{{ shippingInfo.address }}</p>
                <p>{{ shippingInfo.city }}</p>
              </div>
            </div>
            <div v-else class="text-gray-400 text-sm">No delivery information added</div>
          </div>

          <!-- Product Items Section -->
          <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 class="font-semibold text-gray-900 dark:text-white">Product Items ({{ cart.length }})</h3>
              <UButton icon="i-heroicons-plus" variant="soft" color="primary" @click="showProductModal = true">
                Add Products (F2)
              </UButton>
            </div>

            <!-- Empty State -->
            <div v-if="cart.length === 0" class="p-16 text-center">
              <UIcon name="i-heroicons-shopping-bag" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p class="text-gray-500 font-medium">No items in order</p>
              <p class="text-sm text-gray-400 mt-1">Click "Add Products" to select items</p>
            </div>

            <!-- Items Table -->
            <table v-else class="w-full">
              <thead class="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th class="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Item Details</th>
                  <th class="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-32">Quantity</th>
                  <th class="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase w-28">Unit Price</th>
                  <th class="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase w-32">Total</th>
                  <th class="w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr v-for="item in cart" :key="item.product.id">
                  <td class="py-4 px-5">
                    <div class="flex items-center gap-4">
                      <div
                        class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                        <img v-if="item.product.image" :src="item.product.image" class="w-full h-full object-cover" />
                        <span v-else>📦</span>
                      </div>
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">{{ item.product.name }}</p>
                        <p class="text-xs text-gray-500">SKU: {{ item.product.sku }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-4">
                    <div class="flex items-center justify-center gap-1">
                      <UButton icon="i-heroicons-minus" size="xs" color="gray" variant="soft"
                        @click="updateQuantity(item, item.quantity - 1)" />
                      <input type="number" :value="item.quantity"
                        class="w-14 text-center border border-gray-300 dark:border-gray-600 rounded-lg py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        @change="(e) => updateQuantity(item, parseInt((e.target as HTMLInputElement).value) || 1)" />
                      <UButton icon="i-heroicons-plus" size="xs" color="gray" variant="soft"
                        @click="updateQuantity(item, item.quantity + 1)" />
                    </div>
                  </td>
                  <td class="py-4 px-4 text-right text-sm text-gray-500">{{ formatCurrency(item.price, 'LAK') }}</td>
                  <td class="py-4 px-5 text-right font-semibold">{{ formatCurrency(item.total, 'LAK') }}</td>
                  <td class="py-4 px-2">
                    <UButton icon="i-heroicons-x-mark" size="xs" variant="ghost" color="red"
                      @click="removeFromCart(item)" />
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Order Totals -->
            <div v-if="cart.length > 0" class="border-t p-5 bg-gray-50 dark:bg-gray-800/30">
              <div class="max-w-xs ml-auto space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-gray-500">Subtotal</span><span>{{
                  formatCurrency(subtotal, 'LAK') }}</span></div>
                <div v-if="orderType === 'delivery'" class="flex justify-between">
                  <span class="text-gray-500">Delivery Fee</span>
                  <input v-model.number="deliveryFee" type="number"
                    class="w-24 text-right border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    :min="0" />
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-500">Discount</span>
                  <div class="flex items-center gap-1">
                    <input v-model.number="discountAmount" type="number"
                      class="w-16 text-right border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      :min="0" />
                    <div class="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
                      <button type="button" class="px-2 py-1 text-xs font-medium transition-colors"
                        :class="discountType === 'percent' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'"
                        @click="discountType = 'percent'">%</button>
                      <button type="button"
                        class="px-2 py-1 text-xs font-medium transition-colors border-l border-gray-300 dark:border-gray-600"
                        :class="discountType === 'fixed' ? 'bg-primary-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'"
                        @click="discountType = 'fixed'">₭</button>
                    </div>
                  </div>
                </div>
                <div v-if="discountValue > 0" class="flex justify-between text-green-600"><span>Discount
                    Applied</span><span>-{{ formatCurrency(discountValue, 'LAK') }}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">Tax (10%)</span><span>{{
                  formatCurrency(tax, 'LAK') }}</span></div>
                <div class="flex justify-between text-lg font-bold pt-2 border-t"><span>Total</span><span
                    class="text-primary-600">{{ formatCurrency(total, 'LAK') }}</span></div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="bg-white dark:bg-gray-900 dark:border-gray-700 border-slate-200 rounded-xl border p-5">
            <h3 class="font-semibold mb-3">Order Notes</h3>
            <UTextarea v-model="orderNotes" :rows="2" class="w-full" placeholder="Add notes..." />
          </div>
        </div>

        <!-- ============ RIGHT SIDEBAR ============ -->
        <div class="w-80 space-y-4">
          <!-- Payment Card -->
          <div
            class="bg-white dark:bg-gray-900 dark:border-gray-700 border-slate-200 rounded-xl border overflow-hidden">
            <div class="px-4 py-3 border-b dark:border-gray-700 border-slate-200 flex items-center justify-between">
              <span class="text-sm font-medium text-gray-500 uppercase">Payment</span>
            </div>
            <div class="p-4 space-y-4">
              <div class="grid grid-cols-2 gap-2">
                <button v-for="method in paymentMethods" :key="method.value"
                  class="flex items-center gap-2 p-2 rounded-lg border text-sm transition-all"
                  :class="selectedPaymentMethod === method.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'"
                  @click="selectedPaymentMethod = method.value as PaymentMethod">
                  <span>{{ method.emoji }}</span><span>{{ method.label }}</span>
                </button>
              </div>
              <div class="pt-3 border-t dark:border-gray-700 border-slate-200 space-y-2 text-sm">
                <div class="flex justify-between"><span class="text-gray-500">Paid</span><span>₭0</span></div>
                <div class="flex justify-between font-semibold"><span>Outstanding</span><span>{{ formatCurrency(total,
                  'LAK') }}</span></div>
              </div>
              <UButton block color="green" size="lg" :disabled="cart.length === 0" @click="showPaymentModal = true">
                Record Payment
              </UButton>
            </div>
          </div>

          <!-- Shortcuts -->
          <div class="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-4 text-sm">
            <p class="font-medium mb-2">Shortcuts</p>
            <div class="space-y-1 text-gray-500">
              <div class="flex justify-between"><span>Add Products</span><kbd
                  class="px-1.5 bg-white dark:bg-gray-700 rounded text-xs">F2</kbd></div>
              <div class="flex justify-between"><span>Customer</span><kbd
                  class="px-1.5 bg-white dark:bg-gray-700 rounded text-xs">F3</kbd></div>
              <div class="flex justify-between"><span>Payment</span><kbd
                  class="px-1.5 bg-white dark:bg-gray-700 rounded text-xs">⌘P</kbd></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ CUSTOMER MODAL ============ -->
    <UModal v-model:open="showCustomerModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Customer Lookup</h3>
            <UButton icon="i-heroicons-x-mark" variant="ghost" color="gray" @click="showCustomerModal = false" />
          </div>
          <UInput v-model="customerSearchQuery" icon="i-heroicons-magnifying-glass" placeholder="Search customers..."
            size="lg" autofocus class="mb-4" />
          <div class="max-h-64 overflow-y-auto space-y-2">
            <div v-for="customer in filteredCustomers" :key="customer.id"
              class="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              @click="selectCustomer(customer)">
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold">
                {{ (customer.name || 'C').slice(0, 2).toUpperCase() }}
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-white">{{ customer.name || 'Customer' }}</p>
                <p class="text-sm text-gray-500">{{ customer.phone || customer.email }}</p>
              </div>
              <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700">{{ customer.tier }}</span>
            </div>
            <div v-if="filteredCustomers.length === 0" class="text-center py-8 text-gray-500">No customers found</div>
          </div>
          <div class="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700 flex gap-3">
            <UButton variant="outline" class="flex-1" @click="showCustomerModal = false">Cancel</UButton>
            <UButton color="primary" class="flex-1" icon="i-heroicons-plus">New Customer</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============ PRODUCT SELECTION MODAL ============ -->
    <UModal v-model:open="showProductModal" :ui="{ width: 'sm:max-w-3xl' }">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Select Products</h3>
            <UButton icon="i-heroicons-x-mark" variant="ghost" color="gray" @click="showProductModal = false" />
          </div>
          <UInput v-model="productSearchQuery" icon="i-heroicons-magnifying-glass" placeholder="Search products..."
            size="lg" autofocus class="mb-4" />

          <!-- Product List -->
          <div
            class="max-h-96 overflow-y-auto border border-slate-200 dark:border-gray-700 rounded-lg divide-y divide-slate-200 dark:divide-gray-700">
            <div v-for="product in filteredProducts" :key="product.id"
              class="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedProductsInModal.has(product.id) }"
              @click="toggleProductSelection(product.id)">

              <UCheckbox :model-value="selectedProductsInModal.has(product.id)" @click.stop />

              <div
                class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                <img v-if="product.image" :src="product.image" class="w-full h-full object-cover" />
                <span v-else>📦</span>
              </div>

              <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-white">{{ product.name }}</p>
                <p class="text-sm text-gray-500">SKU: {{ product.sku }}</p>
              </div>

              <div class="text-right">
                <p class="font-semibold text-primary-600">{{ formatCurrency(product.price, 'LAK') }}</p>
                <p class="text-xs text-gray-400">{{ product.stock }} in stock</p>
              </div>

              <!-- Quantity Input (when selected) -->
              <div v-if="selectedProductsInModal.has(product.id)" class="flex items-center gap-2" @click.stop>
                <UInput type="number" :model-value="productQuantities[product.id] ?? 1" :min="1" :max="product.stock"
                  class="w-20" size="sm"
                  @update:model-value="(val) => updateProductQuantityInModal(product.id, Number(val) || 1)" />
              </div>
            </div>
            <div v-if="filteredProducts.length === 0" class="p-8 text-center text-gray-500">No products found</div>
          </div>

          <!-- Footer -->
          <div class="mt-4 pt-4 border-t border-slate-200 dark:border-gray-700 flex items-center justify-between">
            <span class="text-sm text-gray-500">{{ selectedProductsInModal.size }} products selected</span>
            <div class="flex gap-3">
              <UButton variant="outline" @click="showProductModal = false">Cancel</UButton>
              <UButton color="primary" :disabled="selectedProductsInModal.size === 0"
                @click="addSelectedProductsToCart">
                Add to Order
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============ SHIPPING MODAL ============ -->
    <UModal v-model:open="showShippingModal" :ui="{ width: 'sm:max-w-lg' }">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">Delivery Information</h3>
            <UButton icon="i-heroicons-x-mark" variant="ghost" color="gray" @click="showShippingModal = false" />
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Sender Name">
                <UInput v-model="shippingInfo.senderName" placeholder="Your name" />
              </UFormField>
              <UFormField label="Sender Phone">
                <UInput v-model="shippingInfo.senderPhone" placeholder="Phone" />
              </UFormField>
            </div>
            <div class="border-t border-slate-200 dark:border-gray-700 pt-4">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recipient</p>
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Recipient Name">
                  <UInput v-model="shippingInfo.recipientName" placeholder="Recipient name" />
                </UFormField>
                <UFormField label="Recipient Phone">
                  <UInput v-model="shippingInfo.recipientPhone" placeholder="Phone" />
                </UFormField>
              </div>
            </div>
            <UFormField label="Delivery Address">
              <UTextarea v-model="shippingInfo.address" placeholder="Full address" :rows="2" />
            </UFormField>
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="City">
                <UInput v-model="shippingInfo.city" placeholder="City" />
              </UFormField>
              <UFormField label="Postal Code">
                <UInput v-model="shippingInfo.postalCode" placeholder="Postal code" />
              </UFormField>
            </div>
            <UFormField label="Delivery Notes">
              <UTextarea v-model="shippingInfo.deliveryNotes" placeholder="Special instructions..." :rows="2" />
            </UFormField>
          </div>

          <div class="mt-6 flex gap-3">
            <UButton variant="outline" class="flex-1" @click="showShippingModal = false">Cancel</UButton>
            <UButton color="primary" class="flex-1" @click="showShippingModal = false">Save</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- ============ PAYMENT MODAL ============ -->
    <UModal v-model:open="showPaymentModal" :ui="{ width: 'sm:max-w-md' }">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-bold">Record Payment</h3>
            <UButton icon="i-heroicons-x-mark" variant="ghost" @click="showPaymentModal = false" />
          </div>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6 text-center">
            <p class="text-sm text-gray-500 mb-1">Amount Due</p>
            <p class="text-3xl font-bold text-primary-600">{{ formatCurrency(total, 'LAK') }}</p>
          </div>
          <div class="grid grid-cols-2 gap-2 mb-6">
            <button v-for="method in paymentMethods" :key="method.value"
              class="p-3 rounded-lg border text-center transition-all"
              :class="selectedPaymentMethod === method.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200'"
              @click="selectedPaymentMethod = method.value as PaymentMethod">
              <span class="text-2xl">{{ method.emoji }}</span>
              <p class="text-sm mt-1">{{ method.label }}</p>
            </button>
          </div>
          <div class="flex gap-3">
            <UButton variant="outline" class="flex-1" @click="showPaymentModal = false">Cancel</UButton>
            <UButton color="green" class="flex-1" :loading="processing" @click="processOrder">Confirm Payment</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
