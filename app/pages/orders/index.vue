<!-- pages/orders/index.vue -->
<script setup lang="ts">
import type { Order } from "~/types";
const { t } = useI18n();

// State management (replace with actual Pinia/composables)
const orders = ref<Order[]>([
  {
    id: "ORD-1001",
    branch: "Vientiane Center",
    customer: "John Doe",
    total: 150.75,
    status: "completed",
    date: "2023-07-15",
  },
  {
    id: "ORD-1002",
    branch: "Luang Prabang",
    customer: "Jane Smith",
    total: 89.5,
    status: "pending",
    date: "2023-07-16",
  },
  {
    id: "ORD-1003",
    branch: "Pakse",
    customer: "Mike Johnson",
    total: 220.0,
    status: "processing",
    date: "2023-07-17",
  },
]);

const searchQuery = ref("");
const statusFilter = ref("all");
const branches = ["Vientiane Center", "Luang Prabang", "Pakse"];
const statusOptions = [
  { value: "all", label: t("orders.status.all") },
  { value: "pending", label: t("orders.status.pending") },
  { value: "processing", label: t("orders.status.processing") },
  { value: "completed", label: t("orders.status.completed") },
  { value: "cancelled", label: t("orders.status.cancelled") },
];

const filteredOrders = computed(() => {
  return orders.value.filter((order) => {
    const matchesSearch =
      order.id.includes(searchQuery.value) ||
      order.customer.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesStatus =
      statusFilter.value === "all" || order.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  });
});

const deleteOrder = (id: string) => {
  orders.value = orders.value.filter((order) => order.id !== id);
};
</script>

<template>
  <div>
    <CommonPageHeader
      :title="t('orders.title')"
      :description="t('orders.description')"
    >
      <template #right>
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          :label="t('orders.newOrder')"
          to="/orders/create"
        />
      </template>
    </CommonPageHeader>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 mb-6">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        :placeholder="t('common.search')"
      />
      <USelect
        v-model="statusFilter"
        :options="statusOptions"
        :placeholder="t('orders.filterStatus')"
      />
      <USelect :placeholder="t('branches.selectBranch')" :options="branches" />
    </div>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-800">
            <th class="text-left py-3 px-4">{{ t("orders.id") }}</th>
            <th class="text-left py-3 px-4">{{ t("orders.customer") }}</th>
            <th class="text-left py-3 px-4">{{ t("branches.branch") }}</th>
            <th class="text-left py-3 px-4">{{ t("orders.date") }}</th>
            <th class="text-left py-3 px-4">{{ t("orders.total") }}</th>
            <th class="text-left py-3 px-4">{{ t("orders.status") }}</th>
            <th class="text-right py-3 px-4">{{ t("common.actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in filteredOrders"
            :key="order.id"
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <td class="py-3 px-4">{{ order.id }}</td>
            <td class="py-3 px-4">{{ order.customer }}</td>
            <td class="py-3 px-4">{{ order.branch }}</td>
            <td class="py-3 px-4">{{ order.date }}</td>
            <td class="py-3 px-4">₭{{ order.total.toFixed(2) }}</td>
            <td class="py-3 px-4">
              <UBadge
                :label="t(`orders.status.${order.status}`)"
                :color="
                  {
                    pending: 'yellow',
                    processing: 'blue',
                    completed: 'green',
                    cancelled: 'red',
                  }[order.status]
                "
              />
            </td>
            <td class="py-3 px-4 text-right">
              <div class="flex justify-end space-x-2">
                <UButton
                  icon="i-heroicons-eye"
                  color="gray"
                  variant="ghost"
                  :to="`/orders/${order.id}`"
                />
                <UButton
                  icon="i-heroicons-pencil-square"
                  color="gray"
                  variant="ghost"
                />
                <UButton
                  icon="i-heroicons-trash"
                  color="red"
                  variant="ghost"
                  @click="deleteOrder(order.id)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex justify-between items-center px-4 mt-6">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ t("common.showing") }} {{ filteredOrders.length }}
        {{ t("common.of") }} {{ orders.length }} {{ t("common.entries") }}
      </span>
      <UPagination :page-count="10" :total="orders.length" />
    </div>
  </div>
</template>
