<!-- pages/orders/[id]/index.vue -->
<!-- 🧾 Order Detail - Real Data from Nostr/Dexie -->
<script setup lang="ts">
import type { Order, PaymentStatus } from "~/types";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const { format: formatCurrency } = useCurrency();
const ordersStore = useOrders();

const orderId = computed(() => route.params.id as string);
const isLoading = ref(true);
const isSaving = ref(false);

// Active tab
const activeTab = ref<"details" | "payment" | "receipt" | "history">("details");

// Order data from store
const order = ref<Order | null>(null);

// Editable fields
const editableNotes = ref("");
const editableStatus = ref<PaymentStatus>("pending");

const statusOptions = [
  { value: "pending", label: t("orders.status.pending") || "Pending" },
  { value: "processing", label: t("orders.status.processing") || "Processing" },
  { value: "completed", label: t("orders.status.completed") || "Completed" },
  { value: "cancelled", label: t("orders.status.cancelled") || "Cancelled" },
  { value: "refunded", label: t("orders.status.refunded") || "Refunded" },
];

const kitchenStatusOptions = [
  { value: "new", label: t("kitchen.status.new") || "🆕 New", color: "blue" },
  { value: "preparing", label: t("kitchen.status.preparing") || "👨‍🍳 Preparing", color: "yellow" },
  { value: "ready", label: t("kitchen.status.ready") || "✅ Ready", color: "green" },
  { value: "served", label: t("kitchen.status.served") || "🍽️ Served", color: "gray" },
];

const statusColors: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  refunded: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  offline_pending:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const kitchenStatusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  preparing:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ready: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  served: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const paymentMethodIcons: Record<string, string> = {
  lightning: "i-heroicons-bolt",
  bolt12: "i-heroicons-bolt",
  lnurl: "i-heroicons-bolt",
  cash: "i-heroicons-banknotes",
  onchain: "i-heroicons-cube",
  qr_static: "i-heroicons-qr-code",
  bank_transfer: "i-heroicons-building-library",
};

// Computed
const subtotal = computed(() => {
  if (!order.value?.items) return 0;
  return order.value.items.reduce((sum, item) => sum + item.total, 0);
});

const itemCount = computed(() => {
  if (!order.value?.items) return 0;
  return order.value.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Actions
const saveChanges = async () => {
  if (!order.value) return;

  isSaving.value = true;
  try {
    await ordersStore.updateOrderStatus(order.value.id, editableStatus.value, {
      notes: editableNotes.value,
    });

    toast.add({
      title: t("common.success"),
      description: t("orders.saved") || "Order saved",
      color: "green",
    });
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: String(e),
      color: "red",
    });
  } finally {
    isSaving.value = false;
  }
};

const updateKitchenStatus = async (newStatus: string) => {
  if (!order.value) return;

  isSaving.value = true;
  try {
    await ordersStore.updateOrderStatus(order.value.id, order.value.status, {
      kitchenStatus: newStatus as any,
      preparedAt: newStatus === "ready" ? new Date().toISOString() : undefined,
      servedAt: newStatus === "served" ? new Date().toISOString() : undefined,
    });

    // Update local state
    order.value.kitchenStatus = newStatus as any;

    toast.add({
      title: t("kitchen.statusUpdated") || "Kitchen status updated",
      description: t("kitchen.markedAs", { status: newStatus }) || `Order marked as ${newStatus}`,
      color: "green",
    });
  } catch (e) {
    toast.add({
      title: t("common.error"),
      description: String(e),
      color: "red",
    });
  } finally {
    isSaving.value = false;
  }
};

const cancelOrder = async () => {
  if (!order.value) return;
  if (
    !confirm(
      t("orders.cancelConfirmation") ||
        "Are you sure you want to cancel this order?"
    )
  )
    return;

  await ordersStore.updateOrderStatus(order.value.id, "cancelled");
  order.value.status = "cancelled";
  editableStatus.value = "cancelled";

  toast.add({
    title: t("common.success"),
    description: t("orders.cancelled") || "Order cancelled",
    color: "green",
  });
};

const refundOrder = async () => {
  if (!order.value) return;
  if (
    !confirm(
      t("orders.refundConfirmation") ||
        "Are you sure you want to refund this order?"
    )
  )
    return;

  await ordersStore.refundOrder(order.value.id, "Customer requested refund");
  order.value.status = "refunded";
  editableStatus.value = "refunded";

  toast.add({
    title: t("common.success"),
    description: t("orders.refunded") || "Order refunded",
    color: "green",
  });
};

const printOrder = () => {
  router.push(`/orders/${orderId.value}/print`);
};

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleString();
};

// Initialize
onMounted(async () => {
  await ordersStore.init();

  const foundOrder = ordersStore.getOrder(orderId.value);
  if (foundOrder) {
    order.value = foundOrder;
    editableNotes.value = foundOrder.notes || "";
    editableStatus.value = foundOrder.status;
  }

  isLoading.value = false;
});
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-primary-500"
      />
    </div>

    <!-- Order Not Found -->
    <div v-else-if="!order" class="text-center py-16">
      <div class="text-6xl mb-4">🔍</div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {{ t("orders.notFound") || "Order Not Found" }}
      </h2>
      <p class="text-gray-500 mb-4">
        {{ t("orders.notFoundDescription") || "The order you're looking for doesn't exist" }}
      </p>
      <UButton to="/orders" color="primary">{{ t("orders.backToOrders") || "Back to Orders" }}</UButton>
    </div>

    <template v-else>
      <!-- Page Header -->
      <div
        class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div class="flex items-center gap-4">
          <UButton icon="i-heroicons-arrow-left" variant="ghost" to="/orders" />
          <div>
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                #{{ order.id.slice(-6).toUpperCase() }}
              </h1>
              <span
                :class="statusColors[order.status]"
                class="px-3 py-1 rounded-full text-sm font-medium"
              >
                {{ t(`orders.status.${order.status}`) || order.status }}
              </span>
              <span
                v-if="order.kitchenStatus"
                :class="kitchenStatusColors[order.kitchenStatus]"
                class="px-3 py-1 rounded-full text-sm font-medium"
              >
                {{
                  kitchenStatusOptions.find(
                    (k) => k.value === order?.kitchenStatus
                  )?.label || order.kitchenStatus
                }}
              </span>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ formatDate(order.date) }}
              <span v-if="order.tableNumber">
                • {{ t("orders.table") || "Table" }}: {{ order.tableNumber }}</span
              >
              <span v-if="order.orderType">
                • {{ order.orderType.replace("_", " ") }}</span
              >
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <UButton
            icon="i-heroicons-printer"
            variant="outline"
            @click="printOrder"
          >
            {{ t("common.print") || "Print" }}
          </UButton>
          <UButton
            v-if="order.status === 'completed'"
            icon="i-heroicons-arrow-uturn-left"
            variant="outline"
            color="red"
            @click="refundOrder"
          >
            {{ t("orders.refund") || "Refund" }}
          </UButton>
        </div>
      </div>

      <!-- Kitchen Status Quick Actions -->
      <div
        v-if="order.orderType === 'dine_in' || order.kitchenStatus"
        class="bg-white dark:bg-gray-800 rounded-xl border-gray-200 p-4 border dark:border-gray-700"
      >
        <h3 class="font-semibold mb-3">🍳 {{ t("kitchen.status.title") || "Kitchen Status" }}</h3>
        <div class="flex gap-2 flex-wrap">
          <UButton
            v-for="status in kitchenStatusOptions"
            :key="status.value"
            :color="
              order.kitchenStatus === status.value ? 'primary' : 'neutral'
            "
            :variant="
              order.kitchenStatus === status.value ? 'solid' : 'outline'
            "
            size="sm"
            :loading="isSaving"
            @click="updateKitchenStatus(status.value)"
          >
            {{ status.label }}
          </UButton>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t("orders.total") }}
            </p>
            <p class="text-xl font-bold text-primary-600 dark:text-primary-400">
              {{ formatCurrency(order.total) }}
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">⚡ {{ t("common.sats") || "Sats" }}</p>
            <p class="text-xl font-bold text-amber-600 dark:text-amber-400">
              {{ order.totalSats?.toLocaleString() || "—" }}
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t("pos.items") }}
            </p>
            <p class="text-xl font-bold text-gray-900 dark:text-white">
              {{ itemCount }}
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t("pos.payment") || "Payment" }}</p>
            <p
              class="text-xl font-bold text-gray-900 dark:text-white capitalize"
            >
              {{ order.paymentMethod || "—" }}
            </p>
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
            :class="
              activeTab === tab
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            "
            @click="activeTab = tab as any"
          >
            {{
              t(`orders.tabs.${tab}`) ||
              tab.charAt(0).toUpperCase() + tab.slice(1)
            }}
          </button>
        </nav>
      </div>

      <!-- Details Tab -->
      <div
        v-if="activeTab === 'details'"
        class="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <!-- Order Items -->
        <UCard class="lg:col-span-2">
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t("orders.items") || "Order Items" }}
            </h3>
          </template>

          <div class="space-y-3">
            <div
              v-for="item in order.items"
              :key="item.id"
              class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <!-- Product Image -->
              <div
                class="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0"
              >
                <img
                  v-if="item.product?.image"
                  :src="item.product.image"
                  :alt="item.product.name"
                  class="w-full h-full object-cover"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-2xl"
                >
                  🍽️
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ item.product?.name || t("orders.unknownProduct") || "Unknown Product" }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ formatCurrency(item.price) }} × {{ item.quantity }}
                </p>
                <p v-if="item.notes" class="text-xs text-amber-600 mt-1">
                  📝 {{ item.notes }}
                </p>
              </div>

              <div class="text-right">
                <p class="font-bold text-gray-900 dark:text-white">
                  {{ formatCurrency(item.total) }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4 space-y-2"
          >
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">{{ t("pos.subtotal") }}</span>
              <span>{{ formatCurrency(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-lg font-bold">
              <span>{{ t("pos.total") }}</span>
              <span class="text-primary-600">{{
                formatCurrency(order.total)
              }}</span>
            </div>
          </div>
        </UCard>

        <!-- Order Info Sidebar -->
        <div class="space-y-4">
          <!-- Customer -->
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">{{ t("orders.customer") }}</h3>
            </template>
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center"
              >
                <span class="text-lg font-bold text-primary-600">{{
                  (order.customer || "C").charAt(0)
                }}</span>
              </div>
              <div>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ order.customer || t("orders.walkInCustomer") || "Walk-in Customer" }}
                </p>
                <p v-if="order.customerPhone" class="text-sm text-gray-500">
                  {{ order.customerPhone }}
                </p>
              </div>
            </div>
          </UCard>

          <!-- Status -->
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">{{ t("orders.status") }}</h3>
            </template>
            <div class="space-y-3">
              <USelect
                v-model="editableStatus"
                :items="statusOptions"
                value-key="value"
                label-key="label"
              />
              <UButton
                v-if="
                  order.status !== 'cancelled' &&
                  order.status !== 'completed' &&
                  order.status !== 'refunded'
                "
                variant="outline"
                color="red"
                size="sm"
                block
                icon="i-heroicons-x-mark"
                @click="cancelOrder"
              >
                {{ t("orders.cancelOrder") || "Cancel Order" }}
              </UButton>
            </div>
          </UCard>

          <!-- Notes -->
          <UCard>
            <template #header>
              <h3 class="text-lg font-semibold">{{ t("orders.notes") }}</h3>
            </template>
            <UTextarea
              v-model="editableNotes"
              :rows="3"
              :placeholder="t('orders.notesPlaceholder') || 'Add notes...'"
            />
          </UCard>

          <UButton
            block
            icon="i-heroicons-check"
            :loading="isSaving"
            @click="saveChanges"
          >
            {{ t("common.saveChanges") || "Save Changes" }}
          </UButton>
        </div>
      </div>

      <!-- Payment Tab -->
      <div v-if="activeTab === 'payment'">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">{{ t("pos.payment") }}</h3>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div
                class="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div
                  class="p-2 rounded-full"
                  :class="
                    order.paymentMethod === 'lightning'
                      ? 'bg-amber-100 dark:bg-amber-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                  "
                >
                  <UIcon
                    :name="
                      paymentMethodIcons[order.paymentMethod || ''] ||
                      'i-heroicons-banknotes'
                    "
                    class="w-6 h-6"
                    :class="
                      order.paymentMethod === 'lightning'
                        ? 'text-amber-600'
                        : 'text-green-600'
                    "
                  />
                </div>
                <div>
                  <p
                    class="font-medium text-gray-900 dark:text-white capitalize"
                  >
                    {{ order.paymentMethod || "Unknown" }}
                  </p>
                  <p class="text-sm text-gray-500">
                    {{ t("pos.paymentMethod") }}
                  </p>
                </div>
              </div>

              <div>
                <p class="text-sm text-gray-500 mb-1">
                  {{ t("orders.total") }}
                </p>
                <p class="text-2xl font-bold text-primary-600">
                  {{ formatCurrency(order.total) }}
                </p>
                <p v-if="order.totalSats" class="text-lg text-amber-600">
                  ⚡ {{ order.totalSats.toLocaleString() }} sats
                </p>
              </div>

              <div>
                <p class="text-sm text-gray-500 mb-1">
                  {{ t("orders.status") }}
                </p>
                <span
                  :class="statusColors[order.status]"
                  class="px-3 py-1 rounded-full text-sm font-medium"
                >
                  {{ t(`orders.status.${order.status}`) }}
                </span>
              </div>
            </div>

            <div v-if="order.paymentProof" class="space-y-4">
              <div>
                <p class="text-sm text-gray-500 mb-1">{{ t("orders.paymentHash") || "Payment Hash" }}</p>
                <p
                  class="font-mono text-sm break-all bg-gray-50 dark:bg-gray-800 p-2 rounded"
                >
                  {{ order.paymentProof.paymentHash || "—" }}
                </p>
              </div>
              <div v-if="order.paymentProof.preimage">
                <p class="text-sm text-gray-500 mb-1">{{ t("orders.preimage") || "Preimage" }}</p>
                <p
                  class="font-mono text-sm break-all bg-gray-50 dark:bg-gray-800 p-2 rounded"
                >
                  {{ order.paymentProof.preimage }}
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
              <h3 class="text-lg font-semibold">
                {{ t("receipt.title") || "Receipt" }}
              </h3>
              <UButton
                size="sm"
                variant="outline"
                icon="i-heroicons-printer"
                @click="printOrder"
              >
                {{ t("receipt.print") || "Print" }}
              </UButton>
            </div>
          </template>

          <div
            class="max-w-md mx-auto bg-white dark:bg-gray-900 border rounded-lg p-6"
          >
            <!-- Receipt Preview -->
            <div class="text-center border-b border-dashed pb-4 mb-4">
              <h2 class="text-xl font-bold">BitSpace POS</h2>
              <p class="text-sm text-gray-500">{{ formatDate(order.date) }}</p>
            </div>

            <div class="text-sm space-y-1 border-b border-dashed pb-4 mb-4">
              <p>
                <strong>Order #:</strong> {{ order.id.slice(-6).toUpperCase() }}
              </p>
              <p v-if="order.tableNumber">
                <strong>Table:</strong> {{ order.tableNumber }}
              </p>
              <p>
                <strong>Customer:</strong> {{ order.customer || "Walk-in" }}
              </p>
            </div>

            <div class="border-b border-dashed pb-4 mb-4">
              <div
                v-for="item in order.items"
                :key="item.id"
                class="flex justify-between text-sm py-1"
              >
                <span
                  >{{ item.quantity }}x {{ item.product?.name || "Item" }}</span
                >
                <span>{{ formatCurrency(item.total) }}</span>
              </div>
            </div>

            <div class="text-sm space-y-1">
              <div class="flex justify-between font-bold text-lg pt-2 border-t">
                <span>{{ t("pos.total") }}</span>
                <span>{{ formatCurrency(order.total) }}</span>
              </div>
              <div
                v-if="order.totalSats"
                class="flex justify-between text-amber-600"
              >
                <span>⚡ Sats</span>
                <span>{{ order.totalSats.toLocaleString() }}</span>
              </div>
            </div>

            <div class="text-center mt-6 pt-4 border-t border-dashed">
              <p class="text-sm text-gray-500">Thank you for your order!</p>
              <p class="text-xs text-gray-400 mt-2">⚡ Powered by Lightning</p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- History Tab -->
      <div v-if="activeTab === 'history'">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ t("orders.history") || "Order History" }}
            </h3>
          </template>

          <div class="space-y-4">
            <div class="flex gap-4">
              <div class="flex flex-col items-center">
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
                <div class="w-0.5 h-full bg-gray-200 dark:bg-gray-700"></div>
              </div>
              <div class="flex-1 pb-4">
                <p class="font-medium text-gray-900 dark:text-white">
                  Order Created
                </p>
                <p class="text-sm text-gray-500">
                  {{ formatDate(order.date) }}
                </p>
              </div>
            </div>

            <div v-if="order.preparedAt" class="flex gap-4">
              <div class="flex flex-col items-center">
                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div class="w-0.5 h-full bg-gray-200 dark:bg-gray-700"></div>
              </div>
              <div class="flex-1 pb-4">
                <p class="font-medium text-gray-900 dark:text-white">
                  Order Ready
                </p>
                <p class="text-sm text-gray-500">
                  {{ formatDate(order.preparedAt) }}
                </p>
              </div>
            </div>

            <div v-if="order.servedAt" class="flex gap-4">
              <div class="flex flex-col items-center">
                <div class="w-3 h-3 rounded-full bg-primary-500"></div>
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-white">
                  Order Served
                </p>
                <p class="text-sm text-gray-500">
                  {{ formatDate(order.servedAt) }}
                </p>
              </div>
            </div>

            <div
              v-if="order.status === 'completed' && !order.servedAt"
              class="flex gap-4"
            >
              <div class="flex flex-col items-center">
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-white">
                  Order Completed
                </p>
                <p class="text-sm text-gray-500">Payment received</p>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
