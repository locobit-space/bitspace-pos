<!-- pages/dashboard/index.vue -->
<script setup lang="ts">
import type { RecentOrder, SalesMetric, TopProduct } from "~/types";
const { t } = useI18n();
// Mock data - replace with actual API calls
const salesData = ref<SalesMetric[]>([
  { period: "Jan", sales: 4500, orders: 120 },
  { period: "Feb", sales: 5200, orders: 145 },
  { period: "Mar", sales: 4800, orders: 130 },
  { period: "Apr", sales: 6200, orders: 165 },
  { period: "May", sales: 5800, orders: 152 },
  { period: "Jun", sales: 7100, orders: 190 },
  { period: "Jul", sales: 6800, orders: 182 },
]);

const topProducts = ref<TopProduct[]>([
  { id: 1, name: "Smartphone X", sales: 42, revenue: 8400 },
  { id: 2, name: "Laptop Pro", sales: 28, revenue: 5600 },
  { id: 3, name: "Wireless Headphones", sales: 35, revenue: 4200 },
  { id: 4, name: "Smart Watch", sales: 19, revenue: 3800 },
  { id: 5, name: "Tablet Mini", sales: 22, revenue: 3300 },
]);

const recentOrders = ref<RecentOrder[]>([
  {
    id: "ORD-1078",
    customer: "Somsack Sihalath",
    amount: 125.5,
    status: "completed",
    time: "2 hours ago",
  },
  {
    id: "ORD-1077",
    customer: "Khamla Vongsa",
    amount: 89.99,
    status: "processing",
    time: "4 hours ago",
  },
  {
    id: "ORD-1076",
    customer: "Noy Phimmasone",
    amount: 220.0,
    status: "pending",
    time: "6 hours ago",
  },
  {
    id: "ORD-1075",
    customer: "Bounmy Chanthavong",
    amount: 56.75,
    status: "completed",
    time: "1 day ago",
  },
  {
    id: "ORD-1074",
    customer: "Sengphet Khounsavanh",
    amount: 310.25,
    status: "completed",
    time: "1 day ago",
  },
]);

const metrics = ref({
  totalSales: "₭42,850",
  totalOrders: 1084,
  avgOrderValue: "₭395",
  conversionRate: "4.2%",
  currentBranch: "Vientiane Center",
});

const branches = ["Vientiane Center", "Luang Prabang", "Pakse", "Savannakhet"];
const timeRangeOptions = [
  { value: "today", label: t("dashboard.today") },
  { value: "week", label: t("dashboard.thisWeek") },
  { value: "month", label: t("dashboard.thisMonth") },
  { value: "quarter", label: t("dashboard.thisQuarter") },
];

const selectedBranch = ref(metrics.value.currentBranch);
const selectedTimeRange = ref("month");

// Chart data - in a real app, use ApexCharts or similar
const chartData = computed(() => ({
  labels: salesData.value.map((d) => d.period),
  sales: salesData.value.map((d) => d.sales),
  orders: salesData.value.map((d) => d.orders),
}));

// Update metrics when filters change
watch([selectedBranch, selectedTimeRange], () => {
  // In real app, fetch new data based on filters
  console.log(
    "Filters changed:",
    selectedBranch.value,
    selectedTimeRange.value
  );
});

const series = [
  {
    name: "Sales",
    type: "line",
    smooth: true,
    lineStyle: {
      width: 4,
    },
    itemStyle: {
      borderWidth: 10,
      borderType: "solid",
    },
    symbolSize: 16,
    data: salesData.value.map((d) => d.sales),
  },
];
</script>

<template>
  <div>
    <CommonPageHeader
      :title="t('dashboard.title')"
      :description="t('dashboard.description')"
    >
      <template #right>
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          :label="t('orders.newOrder')"
          to="/orders/create"
        />
      </template>

      <template #tabs>
        <UTabs
          variant="link"
          :items="[
            { label: 'Overview', value: 'overview' },
            { label: 'Analytics', value: 'analytics' },
            { label: 'Reports', value: 'reports' },
          ]"
        />
      </template>
    </CommonPageHeader>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
      <USelect
        v-model="selectedBranch"
        :items="branches"
        :placeholder="t('branches.selectBranch')"
      />
      <USelect
        v-model="selectedTimeRange"
        :items="timeRangeOptions"
        :placeholder="t('dashboard.selectTimeRange')"
      />
      <UButton
        icon="i-heroicons-arrow-down-tray"
        variant="ghost"
        :label="t('dashboard.exportReport')"
        class="justify-center"
      />
    </div>

    <!-- Key Metrics -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 px-4 mt-6">
      <UCard>
        <div class="flex items-center">
          <div class="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
            <Icon
              name="sales"
              class="text-blue-500 dark:text-blue-400 text-xl"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
              {{ t("dashboard.totalSales") }}
            </p>
            <p class="text-2xl font-bold">{{ metrics.totalSales }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center">
          <div class="bg-green-100 dark:bg-green-900 p-3 rounded-full">
            <Icon
              name="orders"
              class="text-green-500 dark:text-green-400 text-xl"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
              {{ t("dashboard.totalOrders") }}
            </p>
            <p class="text-2xl font-bold">{{ metrics.totalOrders }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center">
          <div class="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
            <Icon
              name="average"
              class="text-purple-500 dark:text-purple-400 text-xl"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
              {{ t("dashboard.avgOrderValue") }}
            </p>
            <p class="text-2xl font-bold">{{ metrics.avgOrderValue }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center">
          <div class="bg-amber-100 dark:bg-amber-900 p-3 rounded-full">
            <Icon
              name="conversion"
              class="text-amber-500 dark:text-amber-400 text-xl"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
              {{ t("dashboard.conversionRate") }}
            </p>
            <p class="text-2xl font-bold">{{ metrics.conversionRate }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center">
          <div class="bg-cyan-100 dark:bg-cyan-900 p-3 rounded-full">
            <Icon
              name="branch"
              class="text-cyan-500 dark:text-cyan-400 text-xl"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
              {{ t("branches.currentBranch") }}
            </p>
            <p class="text-xl font-bold truncate">
              {{ metrics.currentBranch }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Charts and Tables -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 mt-6">
      <!-- Sales Chart -->
      <UCard :title="t('dashboard.salesOverview')">
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium">
              {{ t("dashboard.salesOverview") }}
            </h3>
            <UButton
              icon="i-heroicons-ellipsis-horizontal"
              color="gray"
              variant="ghost"
            />
          </div>
        </template>

        <!-- Chart Placeholder - Replace with actual chart component -->
        <div class="h-80 flex items-center justify-center rounded-lg">
          <ChartLine :series="series" class="h-full" />
        </div>

        <template #footer>
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ t("dashboard.timeRange") }}
              </p>
              <p class="font-medium">
                {{ selectedTimeRange.label || t("dashboard.thisMonth") }}
              </p>
            </div>
            <UBadge color="green" variant="subtle">
              <span class="font-medium">+12.5%</span>
              {{ t("dashboard.vsLastMonth") }}
            </UBadge>
          </div>
        </template>
      </UCard>

      <!-- Top Products -->
      <UCard :title="t('dashboard.topProducts')">
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium">
              {{ t("dashboard.topProducts") }}
            </h3>
            <UButton
              icon="i-heroicons-ellipsis-horizontal"
              color="gray"
              variant="ghost"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div
            v-for="(product, index) in topProducts"
            :key="product.id"
            class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0"
          >
            <div class="flex items-center">
              <span
                class="text-gray-500 dark:text-gray-400 mr-3 w-6 text-center"
                >{{ index + 1 }}</span
              >
              <div>
                <p class="font-medium">{{ product.name }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ product.sales }} {{ t("dashboard.sales") }}
                </p>
              </div>
            </div>
            <p class="font-bold">₭{{ product.revenue.toLocaleString() }}</p>
          </div>
        </div>

        <template #footer>
          <UButton
            color="gray"
            variant="ghost"
            :label="t('dashboard.viewAllProducts')"
            icon="i-heroicons-arrow-right"
            icon-right
          />
        </template>
      </UCard>

      <!-- Recent Orders -->
      <UCard class="lg:col-span-2" :title="t('dashboard.recentOrders')">
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium">
              {{ t("dashboard.recentOrders") }}
            </h3>
            <UButton
              :label="t('dashboard.viewAllOrders')"
              color="gray"
              variant="ghost"
              to="/orders"
            />
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-800">
                <th class="text-left py-3 px-4">{{ t("orders.id") }}</th>
                <th class="text-left py-3 px-4">{{ t("orders.customer") }}</th>
                <th class="text-right py-3 px-4">{{ t("orders.total") }}</th>
                <th class="text-left py-3 px-4">{{ t("orders.status") }}</th>
                <th class="text-left py-3 px-4">{{ t("orders.time") }}</th>
                <th class="text-right py-3 px-4">{{ t("common.actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in recentOrders"
                :key="order.id"
                class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="py-3 px-4 font-medium">{{ order.id }}</td>
                <td class="py-3 px-4">{{ order.customer }}</td>
                <td class="py-3 px-4 text-right">
                  ₭{{ order.amount.toFixed(2) }}
                </td>
                <td class="py-3 px-4">
                  <UBadge
                    :label="t(`orders.status.${order.status}`)"
                    :color="order.status"
                  />
                </td>
                <td class="py-3 px-4 text-gray-500 dark:text-gray-400">
                  {{ order.time }}
                </td>
                <td class="py-3 px-4 text-right">
                  <UButton
                    icon="i-heroicons-eye"
                    color="gray"
                    variant="ghost"
                    :to="`/orders/${order.id}`"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>
  </div>
</template>
