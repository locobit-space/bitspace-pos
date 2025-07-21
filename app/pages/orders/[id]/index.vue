<!-- pages/orders/[id].vue -->
<script setup lang="ts">
import type { Order, OrderItem } from "~/types";
const { t } = useI18n();
const route = useRoute();

// Mock data (replace with API call)
const order = ref<Order>({
  id: route.params.id as string,
  branch: "Vientiane Center",
  customer: "John Doe",
  total: 150.75,
  status: "completed",
  date: "2023-07-15",
  items: [
    { id: 1, name: "Product A", price: 25.99, quantity: 2, total: 51.98 },
    { id: 2, name: "Product B", price: 49.99, quantity: 1, total: 49.99 },
    { id: 3, name: "Product C", price: 12.5, quantity: 3, total: 37.5 },
    { id: 4, name: "Product D", price: 11.28, quantity: 1, total: 11.28 },
  ],
  notes: "Please deliver after 5 PM",
});

const statusOptions = [
  { value: "pending", label: t("orders.status.pending") },
  { value: "processing", label: t("orders.status.processing") },
  { value: "completed", label: t("orders.status.completed") },
  { value: "cancelled", label: t("orders.status.cancelled") },
];

const saveOrder = () => {
  // Save logic here
};
</script>

<template>
  <div>
    <CommonPageHeader
      :title="t('orders.orderDetail')"
      :description="t('orders.orderId', { id: order.id })"
    >
      <template #right>
        <UButton
          icon="i-heroicons-arrow-left"
          color="white"
          :label="t('common.back')"
          to="/orders"
          class="mr-2"
        />
        <UButton
          icon="i-heroicons-printer"
          color="gray"
          :label="t('common.print')"
        />
      </template>
    </CommonPageHeader>

    <div class="grid px-4 grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div>
        <label class="text-sm font-medium text-gray-500 dark:text-gray-400">{{
          t("orders.customer")
        }}</label>
        <p class="mt-1">{{ order.customer }}</p>
      </div>
      <div>
        <label class="text-sm font-medium text-gray-500 dark:text-gray-400">{{
          t("branches.branch")
        }}</label>
        <p class="mt-1">{{ order.branch }}</p>
      </div>
      <div>
        <label class="text-sm font-medium text-gray-500 dark:text-gray-400">{{
          t("orders.date")
        }}</label>
        <p class="mt-1">{{ order.date }}</p>
      </div>
      <div>
        <label class="text-sm font-medium text-gray-500 dark:text-gray-400">{{
          t("orders.status")
        }}</label>
        <USelect v-model="order.status" :items="statusOptions" class="mt-1" />
      </div>
    </div>

    <h3 class="text-lg font-medium px-4 mb-4">{{ t("orders.items") }}</h3>
    <section class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-800">
            <th class="text-left py-3 px-4">{{ t("orders.product") }}</th>
            <th class="text-right py-3 px-4">{{ t("orders.price") }}</th>
            <th class="text-center py-3 px-4">{{ t("orders.quantity") }}</th>
            <th class="text-right py-3 px-4">{{ t("orders.total") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in order.items"
            :key="item.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="py-3 px-4">{{ item.name }}</td>
            <td class="py-3 px-4 text-right">₭{{ item.price.toFixed(2) }}</td>
            <td class="py-3 px-4 text-center">{{ item.quantity }}</td>
            <td class="py-3 px-4 text-right">₭{{ item.total.toFixed(2) }}</td>
          </tr>
          <tr>
            <td colspan="3" class="py-3 px-4 text-right font-medium">
              {{ t("orders.subtotal") }}
            </td>
            <td class="py-3 px-4 text-right">
              ₭{{ (order.total * 0.95).toFixed(2) }}
            </td>
          </tr>
          <tr>
            <td colspan="3" class="py-3 px-4 text-right font-medium">
              {{ t("orders.tax") }} (5%)
            </td>
            <td class="py-3 px-4 text-right">
              ₭{{ (order.total * 0.05).toFixed(2) }}
            </td>
          </tr>
          <tr class="font-semibold">
            <td colspan="3" class="py-3 px-4 text-right">
              {{ t("orders.grandTotal") }}
            </td>
            <td class="py-3 px-4 text-right">₭{{ order.total.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="mt-8 px-4">
      <div class="mt-8">
        <label class="block text-sm font-medium mb-2">{{
          t("orders.notes")
        }}</label>
        <UTextarea v-model="order.notes" />
      </div>

      <div class="flex justify-end space-x-3 mt-8">
        <UButton
          color="red"
          variant="outline"
          :label="t('orders.cancelOrder')"
        />
        <UButton
          color="primary"
          icon="i-heroicons-check"
          :label="t('common.saveChanges')"
          @click="saveOrder"
        />
      </div>
    </section>
  </div>
</template>
