<!-- pages/orders/[id]/index.vue -->
<!-- 🧾 Enterprise Order Detail - Based on Reference Design -->
<script setup lang="ts">
import type { Order, PaymentStatus, PaymentMethod } from "~/types";

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

// Order data from store
const order = ref<Order | null>(null);

// Editable fields
const editableNotes = ref("");
const editableStatus = ref<PaymentStatus>("pending");

// Payment recording
const showRecordPaymentModal = ref(false);
const paymentAmount = ref(0);
const paymentMethod = ref<PaymentMethod>("cash");
const paymentReference = ref("");

// Active sidebar tab
const activeSidebarTab = ref<"payments" | "notes">("payments");

const statusOptions = [
  {
    value: "pending",
    label: t("orders.status.pending") || "Pending",
    color: "amber",
  },
  {
    value: "processing",
    label: t("orders.status.processing") || "Processing",
    color: "blue",
  },
  {
    value: "completed",
    label: t("orders.status.completed") || "Completed",
    color: "green",
  },
  {
    value: "cancelled",
    label: t("orders.status.cancelled") || "Cancelled",
    color: "gray",
  },
  {
    value: "refunded",
    label: t("orders.status.refunded") || "Refunded",
    color: "red",
  },
];

// Status badge styling
const getStatusStyle = (status: string) => {
  const styles: Record<string, string> = {
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    processing:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    completed:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    cancelled:
      "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    refunded:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    partial:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  };
  return styles[status] || styles.pending;
};

const paymentMethodIcons: Record<string, string> = {
  lightning: "i-heroicons-bolt",
  bolt12: "i-heroicons-bolt",
  lnurl: "i-heroicons-bolt",
  cash: "i-heroicons-banknotes",
  onchain: "i-heroicons-cube",
  qr_static: "i-heroicons-qr-code",
  bank: "i-heroicons-building-library",
  bank_transfer: "i-heroicons-building-library",
};

// Computed
const subtotal = computed(() => {
  if (!order.value?.items) return 0;
  return order.value.items.reduce((sum, item) => sum + item.total, 0);
});

const totalTax = computed(() => order.value?.tax || 0);
const totalDiscount = computed(() => order.value?.discount || 0);
const totalTip = computed(() => order.value?.tip || 0);

const itemCount = computed(() => {
  if (!order.value?.items) return 0;
  return order.value.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Payment status calculations
const totalPaid = computed(() => {
  // For now, if completed, full amount paid
  if (order.value?.status === "completed") return order.value.total;
  return 0;
});

const outstandingAmount = computed(() => {
  if (!order.value) return 0;
  return order.value.total - totalPaid.value;
});

const paymentStatus = computed(() => {
  if (!order.value) return "pending";
  if (order.value.status === "completed") return "paid";
  if (totalPaid.value > 0 && totalPaid.value < order.value.total)
    return "partial";
  return "pending";
});

// Get customer initials
const customerInitials = computed(() => {
  const name = order.value?.customer || "WC";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

const markAsPaid = async () => {
  if (!order.value) return;

  isSaving.value = true;
  try {
    await ordersStore.completeOrder(
      order.value.id,
      order.value.paymentMethod || "cash"
    );
    order.value.status = "completed";
    editableStatus.value = "completed";

    toast.add({
      title: "Payment Recorded",
      description: "Order marked as paid",
      color: "green",
      icon: "i-heroicons-check-circle",
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
  router.push(`/orders/refund?orderId=${order.value.id}`);
};

const printOrder = () => {
  router.push(`/orders/${orderId.value}/print`);
};

const exportOrder = () => {
  // TODO: Implement export
  toast.add({
    title: "Export",
    description: "Export feature coming soon",
    color: "info",
  });
};

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Initialize
onMounted(async () => {
  await ordersStore.init();

  // Use async getOrderById which tries: memory → local DB → Nostr relay
  const foundOrder = await ordersStore.getOrderById(orderId.value);
  if (foundOrder) {
    order.value = foundOrder;
    editableNotes.value = foundOrder.notes || "";
    editableStatus.value = foundOrder.status;
    paymentAmount.value = foundOrder.total;
  }

  isLoading.value = false;
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center h-96">
      <div class="text-center">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-10 h-10 animate-spin text-primary-500 mb-4"
        />
        <p class="text-gray-500">Loading order...</p>
      </div>
    </div>

    <!-- Order Not Found -->
    <div
      v-else-if="!order"
      class="flex flex-col items-center justify-center h-96"
    >
      <div class="text-6xl mb-4">🔍</div>
      <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {{ t("orders.notFound") || "Order Not Found" }}
      </h2>
      <p class="text-gray-500 mb-6">
        {{
          t("orders.notFoundDescription") ||
          "The order you're looking for doesn't exist"
        }}
      </p>
      <UButton to="/orders" color="primary" icon="i-heroicons-arrow-left">
        {{ t("orders.backToOrders") || "Back to Orders" }}
      </UButton>
    </div>

    <template v-else>
      <!-- ========== HEADER SECTION ========== -->
      <div
        class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10"
      >
        <div class="max-w-7xl mx-auto px-4 py-4">
          <!-- Breadcrumb & Order ID -->
          <div
            class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          >
            <div class="flex items-center gap-4">
              <!-- Back Button -->
              <UButton
                icon="i-heroicons-chevron-left"
                variant="ghost"
                size="sm"
                to="/orders"
                class="text-gray-500"
              />

              <div>
                <!-- Order Title with Status -->
                <div class="flex items-center gap-3 flex-wrap">
                  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                    Order #{{ order.id.slice(-6).toUpperCase() }}
                  </h1>
                  <span
                    :class="getStatusStyle(order.status)"
                    class="px-3 py-1 rounded-full text-sm font-medium border"
                  >
                    ● {{ t(`orders.status.${order.status}`) || order.status }}
                  </span>
                </div>

                <!-- Order Meta Info -->
                <div
                  class="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap"
                >
                  <span
                    >{{ t("orders.ordered") || "Ordered" }}:
                    {{ formatShortDate(order.date) }}</span
                  >
                  <span>•</span>
                  <span
                    >📦 {{ itemCount }} {{ t("pos.items") || "items" }}</span
                  >
                  <span v-if="order.tableNumber">•</span>
                  <span v-if="order.tableNumber"
                    >🪑 {{ t("orders.table") || "Table" }}
                    {{ order.tableNumber }}</span
                  >
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 flex-wrap">
              <UButton
                icon="i-heroicons-arrow-down-tray"
                variant="outline"
                color="gray"
                @click="exportOrder"
              >
                {{ t("common.export") || "Export" }}
              </UButton>
              <UButton
                icon="i-heroicons-printer"
                variant="outline"
                color="gray"
                @click="printOrder"
              >
                {{ t("common.print") || "Print" }}
              </UButton>

              <!-- Primary Action Button -->
              <UDropdownMenu
                v-if="
                  order.status !== 'completed' && order.status !== 'cancelled'
                "
                :items="[
                  [
                    {
                      label: 'Mark as Paid',
                      icon: 'i-heroicons-check-circle',
                      onClick: markAsPaid,
                    },
                    {
                      label: 'Cancel Order',
                      icon: 'i-heroicons-x-circle',
                      onClick: cancelOrder,
                    },
                  ],
                ]"
              >
                <UButton
                  color="primary"
                  trailing-icon="i-heroicons-chevron-down"
                >
                  {{ t("orders.actions") || "Actions" }}
                </UButton>
              </UDropdownMenu>

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
        </div>
      </div>

      <!-- ========== MAIN CONTENT ========== -->
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="flex flex-col lg:flex-row gap-6">
          <!-- ========== LEFT COLUMN (Main Content) ========== -->
          <div class="flex-1 space-y-6">
            <!-- Customer Card -->
            <div
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <!-- Customer Avatar -->
                  <div
                    class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-lg"
                  >
                    {{ customerInitials }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h3
                        class="font-semibold text-gray-900 dark:text-white text-lg"
                      >
                        {{ order.customer || "Walk-in Customer" }}
                      </h3>
                      <UButton
                        variant="link"
                        size="xs"
                        icon="i-heroicons-arrow-up-right"
                        class="text-gray-400"
                      />
                    </div>
                    <p class="text-sm text-gray-500">
                      {{ order.customerEmail ? "Customer" : "Walk-in" }}
                    </p>
                  </div>
                </div>

                <!-- Customer Quick Actions -->
                <div class="flex items-center gap-2">
                  <UButton
                    v-if="order.customerEmail"
                    icon="i-heroicons-envelope"
                    variant="soft"
                    size="sm"
                    color="gray"
                  >
                    {{ t("common.email") || "Email" }}
                  </UButton>
                  <UButton
                    v-if="order.customerPhone"
                    icon="i-heroicons-phone"
                    variant="soft"
                    size="sm"
                    color="gray"
                  >
                    {{ order.customerPhone }}
                  </UButton>
                </div>
              </div>
            </div>

            <!-- Order Items Table -->
            <div
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <!-- Table Header -->
              <div
                class="px-5 py-4 border-b border-gray-200 dark:border-gray-800"
              >
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ t("orders.items") || "Order Items" }} ({{
                    order.items?.length || 0
                  }})
                </h3>
              </div>

              <!-- Items List -->
              <div class="divide-y divide-gray-100 dark:divide-gray-800">
                <div
                  v-for="item in order.items"
                  :key="item.id"
                  class="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <!-- Product Image -->
                  <div
                    class="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 shadow-sm"
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
                      📦
                    </div>
                  </div>

                  <!-- Product Details -->
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{
                        item.product?.name ||
                        t("orders.unknownProduct") ||
                        "Unknown Product"
                      }}
                    </p>
                    <p class="text-sm text-gray-500">
                      SKU: {{ item.product?.sku || "N/A" }}
                    </p>
                  </div>

                  <!-- Quantity -->
                  <div class="text-center px-4">
                    <span
                      class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium"
                    >
                      {{ item.quantity }}x
                    </span>
                  </div>

                  <!-- Unit Price -->
                  <div class="text-right w-28">
                    <p class="text-sm text-gray-500">
                      {{ formatCurrency(item.price) }}
                    </p>
                  </div>

                  <!-- Total -->
                  <div class="text-right w-32">
                    <p class="font-semibold text-gray-900 dark:text-white">
                      {{ formatCurrency(item.total) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Order Summary -->
              <div class="bg-gray-50 dark:bg-gray-800/50 px-5 py-4 space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">{{
                    t("pos.subtotal") || "Subtotal"
                  }}</span>
                  <span class="text-gray-900 dark:text-white">{{
                    formatCurrency(subtotal)
                  }}</span>
                </div>
                <div v-if="totalTax" class="flex justify-between text-sm">
                  <span class="text-gray-500">{{ t("pos.tax") || "Tax" }}</span>
                  <span class="text-gray-900 dark:text-white">{{
                    formatCurrency(totalTax)
                  }}</span>
                </div>
                <div v-if="totalDiscount" class="flex justify-between text-sm">
                  <span class="text-gray-500">{{
                    t("pos.discount") || "Discount"
                  }}</span>
                  <span class="text-green-600"
                    >-{{ formatCurrency(totalDiscount) }}</span
                  >
                </div>
                <div v-if="totalTip" class="flex justify-between text-sm">
                  <span class="text-gray-500">{{ t("pos.tip") || "Tip" }}</span>
                  <span class="text-gray-900 dark:text-white">{{
                    formatCurrency(totalTip)
                  }}</span>
                </div>
                <div
                  class="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700"
                >
                  <span class="text-gray-900 dark:text-white">{{
                    t("pos.total") || "Total"
                  }}</span>
                  <span class="text-primary-600 dark:text-primary-400">{{
                    formatCurrency(order.total)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Order Notes (Editable) -->
            <div
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
            >
              <h3 class="font-semibold text-gray-900 dark:text-white mb-3">
                {{ t("orders.notes") || "Order Notes" }}
              </h3>
              <UTextarea
                v-model="editableNotes"
                :rows="3"
                :placeholder="
                  t('orders.notesPlaceholder') ||
                  'Add notes about this order...'
                "
                class="w-full"
              />
              <div class="mt-3 flex justify-end">
                <UButton size="sm" :loading="isSaving" @click="saveChanges">
                  {{ t("common.saveNotes") || "Save Notes" }}
                </UButton>
              </div>
            </div>
          </div>

          <!-- ========== RIGHT SIDEBAR ========== -->
          <div class="w-full lg:w-80 space-y-4">
            <!-- Payment Status Card -->
            <div
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <!-- Status Header -->
              <div
                class="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between"
              >
                <span class="text-sm font-medium text-gray-500">STATUS</span>
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-semibold border',
                    paymentStatus === 'paid'
                      ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                      : paymentStatus === 'partial'
                      ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
                      : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
                  ]"
                >
                  ●
                  {{
                    paymentStatus === "paid"
                      ? "Paid"
                      : paymentStatus === "partial"
                      ? "Partially paid"
                      : "Pending"
                  }}
                </span>
              </div>

              <!-- Sidebar Tabs -->
              <div class="flex border-b border-gray-200 dark:border-gray-800">
                <button
                  class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                  :class="
                    activeSidebarTab === 'payments'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  "
                  @click="activeSidebarTab = 'payments'"
                >
                  {{ t("orders.payments") || "Payments" }}
                </button>
                <button
                  class="flex-1 px-4 py-3 text-sm font-medium transition-colors"
                  :class="
                    activeSidebarTab === 'notes'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  "
                  @click="activeSidebarTab = 'notes'"
                >
                  {{ t("orders.notes") || "Notes" }}
                </button>
              </div>

              <!-- Payments Tab -->
              <div v-if="activeSidebarTab === 'payments'" class="p-5 space-y-4">
                <!-- Invoice Info -->
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                  >
                    📄
                  </div>
                  <div class="flex-1">
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Invoice
                    </p>
                    <p class="text-xs text-gray-500">
                      INV-{{ order.id.slice(-6).toUpperCase() }}
                    </p>
                  </div>
                  <p class="font-semibold text-gray-900 dark:text-white">
                    {{ formatCurrency(order.total) }}
                  </p>
                </div>

                <!-- Payment History -->
                <div v-if="order.status === 'completed'" class="space-y-3">
                  <h4
                    class="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    💳 {{ t("orders.paymentReceive") || "Payment Received" }}
                    <span
                      class="bg-gray-100 dark:bg-gray-800 text-xs px-1.5 py-0.5 rounded"
                      >1</span
                    >
                  </h4>
                  <div
                    class="pl-4 border-l-2 border-gray-200 dark:border-gray-700"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          {{ formatShortDate(order.updatedAt || order.date) }}
                        </p>
                        <p class="text-xs text-gray-500 capitalize">
                          {{ order.paymentMethod || "Cash" }}
                        </p>
                      </div>
                      <span class="text-green-600 font-semibold">
                        +{{ formatCurrency(order.total) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Summary -->
                <div
                  class="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2"
                >
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">{{
                      t("orders.paid") || "Paid"
                    }}</span>
                    <span class="text-gray-900 dark:text-white">{{
                      formatCurrency(totalPaid)
                    }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-500">{{
                      t("orders.outstanding") || "Outstanding"
                    }}</span>
                    <span
                      :class="
                        outstandingAmount > 0
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-900 dark:text-white'
                      "
                    >
                      {{ formatCurrency(outstandingAmount) }}
                    </span>
                  </div>
                </div>

                <!-- Record Payment Button -->
                <UButton
                  v-if="
                    order.status !== 'completed' && order.status !== 'cancelled'
                  "
                  color="green"
                  block
                  icon="i-heroicons-plus-circle"
                  @click="markAsPaid"
                  :loading="isSaving"
                >
                  {{ t("orders.recordPayment") || "Record Payment" }}
                </UButton>
              </div>

              <!-- Notes Tab -->
              <div v-if="activeSidebarTab === 'notes'" class="p-5">
                <p
                  v-if="order.notes"
                  class="text-sm text-gray-600 dark:text-gray-400"
                >
                  {{ order.notes }}
                </p>
                <p v-else class="text-sm text-gray-400 italic">
                  No notes added
                </p>
              </div>
            </div>

            <!-- Order Timeline -->
            <div
              class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
            >
              <h3 class="font-semibold text-gray-900 dark:text-white mb-4">
                {{ t("orders.timeline") || "Timeline" }}
              </h3>
              <div class="space-y-4">
                <!-- Created -->
                <div class="flex gap-3">
                  <div class="flex flex-col items-center">
                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                    <div
                      class="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700"
                    ></div>
                  </div>
                  <div class="flex-1 pb-4">
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Order Created
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ formatDate(order.date) }}
                    </p>
                  </div>
                </div>

                <!-- Paid/Completed -->
                <div v-if="order.status === 'completed'" class="flex gap-3">
                  <div class="flex flex-col items-center">
                    <div class="w-3 h-3 rounded-full bg-primary-500"></div>
                  </div>
                  <div class="flex-1">
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Payment Received
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ formatDate(order.updatedAt || order.date) }}
                    </p>
                  </div>
                </div>

                <!-- Cancelled -->
                <div v-if="order.status === 'cancelled'" class="flex gap-3">
                  <div class="flex flex-col items-center">
                    <div class="w-3 h-3 rounded-full bg-red-500"></div>
                  </div>
                  <div class="flex-1">
                    <p
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      Order Cancelled
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ formatDate(order.updatedAt || order.date) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
