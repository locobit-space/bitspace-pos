<!-- pages/orders/index.vue -->
<!-- 🧾 Orders Management - Connected to Nostr/Dexie -->
<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const currency = useCurrency();

// Use real orders store with Nostr sync
const ordersStore = useOrders();

// Permissions
const { canCreateOrders, canVoidOrders } = usePermissions();

// UI State
const searchQuery = ref("");
const statusFilter = ref("all");
const currentPage = ref(1);
const itemsPerPage = 20;

// Status options
const statusOptions = [
  { value: "all", label: t("orders.status.all") },
  { value: "pending", label: t("orders.status.pending") },
  { value: "processing", label: t("orders.status.processing") },
  { value: "completed", label: t("orders.status.completed") },
  { value: "cancelled", label: t("orders.status.cancelled") },
];

// Filtered orders
const filteredOrders = computed(() => {
  let result = [...ordersStore.orders.value];

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (order) =>
        order.id.toLowerCase().includes(query) ||
        (order.customer && order.customer.toLowerCase().includes(query)) ||
        (order.customerName && order.customerName.toLowerCase().includes(query))
    );
  }

  // Status filter
  if (statusFilter.value !== "all") {
    result = result.filter((order) => order.status === statusFilter.value);
  }

  // Sort by date descending
  result.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return result;
});

// Paginated orders
const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredOrders.value.slice(start, start + itemsPerPage);
});

// Stats
const stats = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = ordersStore.orders.value.filter(
    (o) => new Date(o.date) >= today
  );

  return {
    total: ordersStore.orders.value.length,
    today: todayOrders.length,
    todayRevenue: todayOrders.reduce((sum, o) => sum + o.total, 0),
    pending: ordersStore.pendingOrders.value.length,
  };
});

// Status badge color mapping
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: "yellow",
    processing: "blue",
    completed: "green",
    cancelled: "red",
    refunded: "orange",
  };
  return colors[status] || "gray";
};

// Payment method icon
const getPaymentIcon = (method?: string) => {
  const icons: Record<string, string> = {
    lightning: "⚡",
    cash: "💵",
    qr_static: "📱",
    bolt12: "⚡",
    lnurl: "⚡",
    card: "💳",
  };
  return icons[method || ""] || "💰";
};

// Format date
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Delete order
const deleteOrder = async (id: string) => {
  if (confirm(t("orders.confirmDelete"))) {
    await ordersStore.deleteOrder(id);
  }
};

// Sync orders
const handleSync = async () => {
  await ordersStore.syncWithNostr();
};

// Initialize
onMounted(async () => {
  await ordersStore.init();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      :title="t('orders.title')"
      :description="t('orders.description')"
    >
      <template #right>
        <div class="flex gap-2">
          <!-- Sync Button -->
          <UButton
            v-if="ordersStore.syncPending.value > 0"
            icon="i-heroicons-arrow-path"
            color="amber"
            variant="soft"
            :loading="ordersStore.isLoading.value"
            @click="handleSync"
          >
            {{ ordersStore.syncPending.value }} pending
          </UButton>

          <UButton
            v-if="canCreateOrders"
            icon="i-heroicons-plus"
            color="primary"
            :label="t('orders.newOrder')"
            to="/pos"
          />
        </div>
      </template>
    </CommonPageHeader>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
      <CommonStatCard
        icon="i-heroicons-clipboard-document-list"
        icon-color="blue"
        label="Total Orders"
        :value="stats.total"
      />
      <CommonStatCard
        icon="i-heroicons-calendar-days"
        icon-color="green"
        label="Today"
        :value="stats.today"
      />
      <CommonStatCard
        icon="i-heroicons-banknotes"
        icon-color="yellow"
        label="Today's Revenue"
        :value="currency.format(stats.todayRevenue, 'LAK')"
      />
      <CommonStatCard
        icon="i-heroicons-clock"
        icon-color="yellow"
        label="Pending"
        :value="stats.pending"
      />
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        :placeholder="t('common.search')"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        label-key="label"
        :placeholder="t('orders.filterStatus')"
      />
      <UButton
        icon="i-heroicons-arrow-path"
        color="neutral"
        variant="soft"
        :loading="ordersStore.isLoading.value"
        @click="ordersStore.init()"
      >
        Refresh
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="ordersStore.isLoading.value" class="flex justify-center py-12">
      <div class="flex items-center gap-3 text-gray-500">
        <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
        <span>Loading orders...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredOrders.length === 0" class="text-center py-12">
      <div class="text-6xl mb-4">📋</div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No orders yet
      </h3>
      <p class="text-gray-500 mb-4">Create your first order from the POS</p>
      <UButton to="/pos" color="primary"> Go to POS </UButton>
    </div>

    <!-- Orders Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("orders.id") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("orders.date") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("orders.customer") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              Items
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              Payment
            </th>
            <th
              class="text-right py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("orders.total") }}
            </th>
            <th
              class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("orders.status") }}
            </th>
            <th
              class="text-right py-3 px-4 font-medium text-gray-900 dark:text-white"
            >
              {{ t("common.actions") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in paginatedOrders"
            :key="order.id"
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
            @click="$router.push(`/orders/${order.id}`)"
          >
            <td class="py-3 px-4">
              <code
                class="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
              >
                {{ order.id }}
              </code>
            </td>
            <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
              {{ formatDate(order.date) }}
            </td>
            <td class="py-3 px-4">
              <div
                v-if="order.customer || order.customerName"
                class="font-medium text-gray-900 dark:text-white"
              >
                {{ order.customerName || order.customer }}
              </div>
              <div v-else class="text-gray-400">—</div>
            </td>
            <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
              {{ order.items?.length || 0 }} items
            </td>
            <td class="py-3 px-4">
              <span class="inline-flex items-center gap-1 text-sm">
                <span>{{ getPaymentIcon(order.paymentMethod) }}</span>
                <span class="text-gray-600 dark:text-gray-400 capitalize">
                  {{ order.paymentMethod || "unknown" }}
                </span>
              </span>
            </td>
            <td class="py-3 px-4 text-right">
              <div class="font-bold text-gray-900 dark:text-white">
                {{ currency.format(order.total, "LAK") }}
              </div>
              <div
                v-if="order.totalSats"
                class="text-xs text-amber-600 dark:text-amber-400"
              >
                {{ currency.format(order.totalSats, "SATS") }}
              </div>
            </td>
            <td class="py-3 px-4">
              <UBadge
                :label="t(`orders.status.${order.status}`)"
                :color="getStatusColor(order.status) as 'yellow' | 'blue' | 'green' | 'red' | 'orange' | 'gray'"
                variant="soft"
              />
            </td>
            <td class="py-3 px-4 text-right" @click.stop>
              <div class="flex justify-end gap-1">
                <UButton
                  icon="i-heroicons-eye"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :to="`/orders/${order.id}`"
                />
                <UButton
                  icon="i-heroicons-printer"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :to="`/orders/${order.id}/print`"
                />
                <UButton
                  v-if="canVoidOrders"
                  icon="i-heroicons-trash"
                  color="red"
                  variant="ghost"
                  size="xs"
                  @click="deleteOrder(order.id)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      v-if="filteredOrders.length > 0"
      class="flex justify-between items-center px-4"
    >
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ t("common.showing") }} {{ paginatedOrders.length }}
        {{ t("common.of") }} {{ filteredOrders.length }}
        {{ t("common.entries") }}
      </span>
      <UPagination
        v-model:page="currentPage"
        :items-per-page="itemsPerPage"
        :total="filteredOrders.length"
      />
    </div>

    <!-- Nostr Sync Info -->
    <div class="px-4 pb-4">
      <div
        class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-sm text-gray-500 dark:text-gray-400"
      >
        <div class="flex items-center gap-2">
          <span>📡</span>
          <span
            >Orders are stored locally and synced to Nostr relays when
            online</span
          >
          <UBadge
            v-if="ordersStore.syncPending.value > 0"
            color="amber"
            variant="soft"
            size="xs"
          >
            {{ ordersStore.syncPending.value }} pending sync
          </UBadge>
        </div>
      </div>
    </div>
  </div>
</template>
