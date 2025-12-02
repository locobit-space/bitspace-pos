<!-- pages/orders/[id]/index.vue -->
<script setup lang="ts">
import type { Order, OrderItem, PaymentStatus, PaymentMethod } from "~/types";

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const { t } = useI18n();
const route = useRoute();
const { formatCurrency } = useCurrency();

const orderId = computed(() => route.params.id as string);

// Active tab
const activeTab = ref<'details' | 'payment' | 'receipt' | 'history'>('details');

// Mock data (replace with API call)
const order = ref({
  id: orderId.value,
  orderNumber: `ORD-${orderId.value}`,
  branch: "Vientiane Center",
  branchId: "branch-001",
  customer: "ທ້າວ ສົມໃຈ ວົງສະຫວັນ",
  customerId: "cust-001",
  customerPubkey: "npub1abc123...",
  total: 1500000,
  totalSats: 3500,
  subtotal: 1400000,
  tax: 100000,
  discount: 0,
  tip: 0,
  currency: 'LAK' as const,
  status: "completed" as PaymentStatus,
  paymentMethod: "lightning" as PaymentMethod,
  paymentHash: "abc123def456...",
  preimage: "xyz789...",
  date: "2024-01-20",
  time: "14:30:45",
  items: [
    { id: "1", productId: "prod-001", name: "Latte", sku: "LAT-001", price: 35000, quantity: 2, total: 70000 },
    { id: "2", productId: "prod-002", name: "Croissant", sku: "CRO-001", price: 25000, quantity: 3, total: 75000 },
    { id: "3", productId: "prod-003", name: "Cappuccino", sku: "CAP-001", price: 40000, quantity: 1, total: 40000 },
    { id: "4", productId: "prod-004", name: "Sandwich", sku: "SAN-001", price: 55000, quantity: 2, total: 110000 },
  ],
  notes: "ລູກຄ້າ VIP - ໃຫ້ສ່ວນຫຼຸດ 10%",
  loyaltyPointsEarned: 150,
  eReceiptId: "rcpt-001",
  isOffline: false,
  createdAt: "2024-01-20T14:30:45Z",
  updatedAt: "2024-01-20T14:35:00Z",
});

// Order history/timeline
const orderHistory = ref([
  { id: 1, action: 'created', description: 'Order created', timestamp: '2024-01-20 14:30:45', user: 'POS Terminal' },
  { id: 2, action: 'payment_initiated', description: 'Lightning invoice generated', timestamp: '2024-01-20 14:31:00', user: 'System' },
  { id: 3, action: 'payment_received', description: 'Payment received (3,500 sats)', timestamp: '2024-01-20 14:31:15', user: 'Lightning' },
  { id: 4, action: 'completed', description: 'Order completed', timestamp: '2024-01-20 14:31:20', user: 'System' },
  { id: 5, action: 'receipt_sent', description: 'E-Receipt sent via Nostr DM', timestamp: '2024-01-20 14:31:25', user: 'System' },
]);

const statusOptions = [
  { value: "pending", label: t("orders.status.pending") },
  { value: "processing", label: t("orders.status.processing") },
  { value: "completed", label: t("orders.status.completed") },
  { value: "cancelled", label: t("orders.status.cancelled") },
  { value: "refunded", label: t("orders.status.refunded") },
];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  refunded: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  offline_pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

const paymentMethodIcons: Record<string, string> = {
  lightning: 'i-heroicons-bolt',
  bolt12: 'i-heroicons-bolt',
  lnurl: 'i-heroicons-bolt',
  cash: 'i-heroicons-banknotes',
  onchain: 'i-heroicons-cube',
  qr_static: 'i-heroicons-qr-code',
};

// Actions
const saveOrder = () => {
  // TODO: Save order changes
  console.log('Saving order:', order.value);
};

const cancelOrder = () => {
  if (confirm(t('orders.cancelConfirmation') || 'Are you sure you want to cancel this order?')) {
    order.value.status = 'cancelled';
    saveOrder();
  }
};

const refundOrder = () => {
  if (confirm(t('orders.refundConfirmation') || 'Are you sure you want to refund this order?')) {
    // TODO: Implement refund logic
    order.value.status = 'refunded';
  }
};

const printOrder = () => {
  navigateTo(`/orders/${orderId.value}/print`);
};

const sendReceipt = () => {
  // TODO: Send receipt via Nostr DM
  console.log('Sending receipt to:', order.value.customerPubkey);
};

const viewCustomer = () => {
  navigateTo(`/customers/${order.value.customerId}`);
};
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div class="flex items-center gap-4">
        <UButton 
          icon="i-heroicons-arrow-left" 
          variant="ghost" 
          to="/orders"
          :aria-label="t('common.back')"
        />
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ order.orderNumber }}</h1>
            <span :class="statusColors[order.status]" class="px-3 py-1 rounded-full text-sm font-medium">
              {{ t(`orders.status.${order.status}`) }}
            </span>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {{ order.date }} {{ order.time }} • {{ order.branch }}
          </p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <UButton 
          icon="i-heroicons-printer" 
          variant="outline"
          @click="printOrder"
        >
          {{ t('common.print') || 'Print' }}
        </UButton>
        <UButton 
          v-if="order.customerPubkey"
          icon="i-heroicons-paper-airplane" 
          variant="outline"
          @click="sendReceipt"
        >
          {{ t('receipt.sendNostr') }}
        </UButton>
        <UButton 
          v-if="order.status === 'completed'"
          icon="i-heroicons-arrow-uturn-left" 
          variant="outline"
          color="red"
          @click="refundOrder"
        >
          {{ t('orders.refund') || 'Refund' }}
        </UButton>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('orders.total') }}</p>
          <p class="text-xl font-bold text-primary-600 dark:text-primary-400">{{ formatCurrency(order.total) }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">⚡ Sats</p>
          <p class="text-xl font-bold text-amber-600 dark:text-amber-400">{{ order.totalSats?.toLocaleString() }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('pos.items') }}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{{ order.items.length }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('loyalty.points') }}</p>
          <p class="text-xl font-bold text-green-600 dark:text-green-400">+{{ order.loyaltyPointsEarned }}</p>
        </div>
      </UCard>
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <nav class="flex gap-4 overflow-x-auto">
        <button
          v-for="tab in ['details', 'payment', 'receipt', 'history']"
          :key="tab"
          class="px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
          :class="activeTab === tab 
            ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
          @click="activeTab = tab as any"
        >
          {{ t(`orders.tabs.${tab}`) || tab.charAt(0).toUpperCase() + tab.slice(1) }}
        </button>
      </nav>
    </div>

    <!-- Details Tab -->
    <div v-if="activeTab === 'details'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Order Items -->
      <UCard class="lg:col-span-2">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('orders.items') || 'Order Items' }}</h3>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th class="pb-3 font-medium">{{ t('products.product') }}</th>
                <th class="pb-3 font-medium text-right">{{ t('products.price') }}</th>
                <th class="pb-3 font-medium text-center">{{ t('inventory.quantity') }}</th>
                <th class="pb-3 font-medium text-right">{{ t('orders.total') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="item in order.items" :key="item.id" class="text-sm">
                <td class="py-3">
                  <p class="font-medium text-gray-900 dark:text-white">{{ item.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.sku }}</p>
                </td>
                <td class="py-3 text-right text-gray-600 dark:text-gray-400">{{ formatCurrency(item.price) }}</td>
                <td class="py-3 text-center text-gray-600 dark:text-gray-400">{{ item.quantity }}</td>
                <td class="py-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(item.total) }}</td>
              </tr>
            </tbody>
            <tfoot class="border-t border-gray-200 dark:border-gray-700">
              <tr class="text-sm">
                <td colspan="3" class="py-2 text-right text-gray-600 dark:text-gray-400">{{ t('pos.subtotal') }}</td>
                <td class="py-2 text-right font-medium">{{ formatCurrency(order.subtotal) }}</td>
              </tr>
              <tr v-if="order.discount > 0" class="text-sm">
                <td colspan="3" class="py-2 text-right text-gray-600 dark:text-gray-400">{{ t('orders.discount') || 'Discount' }}</td>
                <td class="py-2 text-right font-medium text-red-600">-{{ formatCurrency(order.discount) }}</td>
              </tr>
              <tr class="text-sm">
                <td colspan="3" class="py-2 text-right text-gray-600 dark:text-gray-400">{{ t('pos.tax') }}</td>
                <td class="py-2 text-right font-medium">{{ formatCurrency(order.tax) }}</td>
              </tr>
              <tr v-if="order.tip > 0" class="text-sm">
                <td colspan="3" class="py-2 text-right text-gray-600 dark:text-gray-400">{{ t('pos.tip') }}</td>
                <td class="py-2 text-right font-medium">{{ formatCurrency(order.tip) }}</td>
              </tr>
              <tr class="text-base font-semibold">
                <td colspan="3" class="py-3 text-right text-gray-900 dark:text-white">{{ t('pos.total') }}</td>
                <td class="py-3 text-right text-primary-600 dark:text-primary-400">{{ formatCurrency(order.total) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </UCard>

      <!-- Order Info -->
      <div class="space-y-4">
        <!-- Customer -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('orders.customer') }}</h3>
          </template>

          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <span class="text-lg font-bold text-primary-600 dark:text-primary-400">{{ order.customer.charAt(0) }}</span>
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ order.customer }}</p>
                <p v-if="order.customerPubkey" class="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[150px]">
                  {{ order.customerPubkey }}
                </p>
              </div>
            </div>
            <UButton 
              v-if="order.customerId"
              variant="outline" 
              size="sm" 
              block 
              icon="i-heroicons-user"
              @click="viewCustomer"
            >
              {{ t('customers.viewProfile') || 'View Profile' }}
            </UButton>
          </div>
        </UCard>

        <!-- Status -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('orders.status') }}</h3>
          </template>

          <div class="space-y-3">
            <USelect 
              v-model="order.status" 
              :items="statusOptions" 
              value-key="value"
              label-key="label"
            />
            <UButton 
              v-if="order.status !== 'cancelled' && order.status !== 'completed'"
              variant="outline" 
              color="red" 
              size="sm" 
              block 
              icon="i-heroicons-x-mark"
              @click="cancelOrder"
            >
              {{ t('orders.cancelOrder') }}
            </UButton>
          </div>
        </UCard>

        <!-- Notes -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('orders.notes') }}</h3>
          </template>

          <UTextarea v-model="order.notes" :rows="3" :placeholder="t('orders.notesPlaceholder')" />
        </UCard>

        <UButton 
          block 
          icon="i-heroicons-check" 
          @click="saveOrder"
        >
          {{ t('common.saveChanges') || 'Save Changes' }}
        </UButton>
      </div>
    </div>

    <!-- Payment Tab -->
    <div v-if="activeTab === 'payment'">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('pos.payment') }}</h3>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div class="p-2 rounded-full" :class="order.paymentMethod === 'lightning' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'">
                <UIcon :name="paymentMethodIcons[order.paymentMethod] || 'i-heroicons-banknotes'" class="w-6 h-6" :class="order.paymentMethod === 'lightning' ? 'text-amber-600' : 'text-green-600'" />
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white capitalize">{{ order.paymentMethod }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('pos.paymentMethod') }}</p>
              </div>
            </div>

            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ t('orders.total') }}</p>
              <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">{{ formatCurrency(order.total) }}</p>
              <p v-if="order.totalSats" class="text-lg text-amber-600">⚡ {{ order.totalSats.toLocaleString() }} sats</p>
            </div>

            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ t('orders.status') }}</p>
              <span :class="statusColors[order.status]" class="px-3 py-1 rounded-full text-sm font-medium">
                {{ t(`orders.status.${order.status}`) }}
              </span>
            </div>
          </div>

          <div v-if="order.paymentMethod === 'lightning'" class="space-y-4">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ t('receipt.paymentProof') || 'Payment Hash' }}</p>
              <p class="font-mono text-sm text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {{ order.paymentHash }}
              </p>
            </div>
            <div v-if="order.preimage">
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Preimage</p>
              <p class="font-mono text-sm text-gray-900 dark:text-white break-all bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {{ order.preimage }}
              </p>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Receipt Tab -->
    <div v-if="activeTab === 'receipt'">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('receipt.title') }}</h3>
            <div class="flex gap-2">
              <UButton size="sm" variant="outline" icon="i-heroicons-printer" @click="printOrder">
                {{ t('receipt.print') }}
              </UButton>
              <UButton v-if="order.customerPubkey" size="sm" variant="outline" icon="i-heroicons-paper-airplane" @click="sendReceipt">
                {{ t('receipt.sendNostr') }}
              </UButton>
            </div>
          </div>
        </template>

        <div class="max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <!-- Receipt Preview -->
          <div class="text-center border-b border-dashed border-gray-300 dark:border-gray-600 pb-4 mb-4">
            <h2 class="text-xl font-bold">BitSpace Coffee</h2>
            <p class="text-sm text-gray-500">{{ order.branch }}</p>
          </div>

          <div class="text-sm space-y-1 border-b border-dashed border-gray-300 dark:border-gray-600 pb-4 mb-4">
            <p><strong>{{ t('orders.id') }}:</strong> {{ order.orderNumber }}</p>
            <p><strong>{{ t('orders.date') }}:</strong> {{ order.date }} {{ order.time }}</p>
            <p><strong>{{ t('orders.customer') }}:</strong> {{ order.customer }}</p>
          </div>

          <div class="border-b border-dashed border-gray-300 dark:border-gray-600 pb-4 mb-4">
            <div v-for="item in order.items" :key="item.id" class="flex justify-between text-sm py-1">
              <span>{{ item.quantity }}x {{ item.name }}</span>
              <span>{{ formatCurrency(item.total) }}</span>
            </div>
          </div>

          <div class="text-sm space-y-1">
            <div class="flex justify-between">
              <span>{{ t('pos.subtotal') }}</span>
              <span>{{ formatCurrency(order.subtotal) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('pos.tax') }}</span>
              <span>{{ formatCurrency(order.tax) }}</span>
            </div>
            <div class="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>{{ t('pos.total') }}</span>
              <span>{{ formatCurrency(order.total) }}</span>
            </div>
            <div v-if="order.totalSats" class="flex justify-between text-amber-600">
              <span>⚡ Sats</span>
              <span>{{ order.totalSats.toLocaleString() }}</span>
            </div>
          </div>

          <div class="text-center mt-6 pt-4 border-t border-dashed border-gray-300 dark:border-gray-600">
            <p class="text-sm text-gray-500">{{ t('receipt.thankYou') }}</p>
            <p class="text-xs text-gray-400 mt-2">⚡ Powered by Lightning Network</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- History Tab -->
    <div v-if="activeTab === 'history'">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('orders.history') || 'Order History' }}</h3>
        </template>

        <div class="space-y-4">
          <div v-for="event in orderHistory" :key="event.id" class="flex gap-4">
            <div class="flex flex-col items-center">
              <div class="w-3 h-3 rounded-full bg-primary-500"></div>
              <div class="w-0.5 h-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div class="flex-1 pb-4">
              <div class="flex items-center justify-between">
                <p class="font-medium text-gray-900 dark:text-white">{{ event.description }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ event.timestamp }}</p>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ event.user }}</p>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
