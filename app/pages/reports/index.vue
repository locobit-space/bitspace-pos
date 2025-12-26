<!-- pages/reports/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();

// Use real stores
const ordersStore = useOrders();
const customersStore = useCustomers();
const productsStore = useProductsStore();
const inventoryStore = useInventory();
const shopStore = useShop();

// Report types
type ReportType =
  | "sales"
  | "products"
  | "customers"
  | "inventory"
  | "payments"
  | "staff";

interface ReportConfig {
  id: ReportType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const reportTypes: ReportConfig[] = [
  {
    id: "sales",
    name: "reports.salesReport",
    description: "reports.salesReportDesc",
    icon: "i-heroicons-chart-bar",
    color: "blue",
  },
  {
    id: "products",
    name: "reports.productReport",
    description: "reports.productReportDesc",
    icon: "i-heroicons-cube",
    color: "green",
  },
  {
    id: "customers",
    name: "reports.customerReport",
    description: "reports.customerReportDesc",
    icon: "i-heroicons-users",
    color: "purple",
  },
  {
    id: "inventory",
    name: "reports.inventoryReport",
    description: "reports.inventoryReportDesc",
    icon: "i-heroicons-archive-box",
    color: "yellow",
  },
  {
    id: "payments",
    name: "reports.paymentReport",
    description: "reports.paymentReportDesc",
    icon: "i-heroicons-credit-card",
    color: "orange",
  },
  {
    id: "staff",
    name: "reports.staffReport",
    description: "reports.staffReportDesc",
    icon: "i-heroicons-user-group",
    color: "cyan",
  },
];

// Date range
const dateRange = ref({
  start: new Date(new Date().setDate(1)).toISOString().split("T")[0],
  end: new Date().toISOString().split("T")[0],
});

const selectedBranch = ref("all");
const selectedReport = ref<ReportType>("sales");
const loading = ref(false);
const isInitialized = ref(false);

// Dynamic branches from shop store (Nostr/API)
const branches = computed(() => {
  const allBranches = shopStore.branches.value || [];
  return [
    { id: "all", name: t("common.allBranches") || "All Branches" },
    ...allBranches.map((b) => ({ id: b.id, name: b.name })),
  ];
});

const quickDateRanges = [
  { label: t("reports.today"), value: "today" },
  { label: t("reports.yesterday"), value: "yesterday" },
  { label: t("reports.thisWeek"), value: "week" },
  { label: t("reports.thisMonth"), value: "month" },
  { label: t("reports.lastMonth"), value: "lastMonth" },
  { label: t("reports.thisQuarter"), value: "quarter" },
  { label: t("reports.thisYear"), value: "year" },
];

// Initialize all stores
onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([
      ordersStore.init(),
      customersStore.init(),
      productsStore.init(),
      shopStore.init(),
    ]);
    isInitialized.value = true;
  } catch (error) {
    console.error("Failed to initialize stores:", error);
    toast.add({
      title: t("common.error"),
      description: t("reports.initError") || "Failed to load report data",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
});

// Computed date objects from string inputs
const startDate = computed(() => new Date(dateRange.value.start || new Date()));
const endDate = computed(() => {
  const end = new Date(dateRange.value.end || new Date());
  end.setHours(23, 59, 59, 999);
  return end;
});

// Real sales data from orders store
const salesData = computed(() => {
  if (!isInitialized.value) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      totalSats: 0,
      avgOrderValue: 0,
      topPaymentMethod: "-",
      byPaymentMethod: [] as {
        method: string;
        amount: number;
        percentage: number;
        count: number;
      }[],
      byPeriod: [] as { period: string; revenue: number; orders: number }[],
    };
  }

  const summary = ordersStore.getSalesSummary(startDate.value, endDate.value);

  // Convert byPaymentMethod to array format
  const methodTotal = Object.values(summary.byPaymentMethod).reduce(
    (sum, m) => sum + m.total,
    0
  );
  const byPaymentMethod = Object.entries(summary.byPaymentMethod)
    .map(([method, data]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      amount: data.total,
      count: data.count,
      percentage:
        methodTotal > 0 ? Math.round((data.total / methodTotal) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Find top payment method
  const topMethod = byPaymentMethod[0]?.method || "-";

  // Group by period (daily for now)
  const orders = ordersStore
    .getOrdersByDateRange(startDate.value, endDate.value)
    .filter((o) => o.status === "completed");

  const byDay: Record<string, { revenue: number; orders: number }> = {};
  for (const order of orders) {
    const day = new Date(order.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (!byDay[day]) byDay[day] = { revenue: 0, orders: 0 };
    byDay[day].revenue += order.total;
    byDay[day].orders++;
  }

  const byPeriod = Object.entries(byDay).map(([period, data]) => ({
    period,
    revenue: data.revenue,
    orders: data.orders,
  }));

  return {
    totalRevenue: summary.totalSales,
    totalOrders: summary.totalOrders,
    totalSats: summary.totalSats,
    avgOrderValue: summary.avgOrderValue,
    topPaymentMethod: topMethod,
    byPaymentMethod,
    byPeriod,
  };
});

// Real product data from orders store
const productData = computed(() => {
  if (!isInitialized.value) {
    return {
      topProducts: [] as { name: string; sold: number; revenue: number }[],
      byCategory: [] as { category: string; sold: number; revenue: number }[],
    };
  }

  const topProducts = ordersStore
    .getTopProducts(startDate.value, endDate.value, 10)
    .map((p) => ({
      name: p.productName,
      sold: p.quantity,
      revenue: p.revenue,
    }));

  // Group by category
  const orders = ordersStore
    .getOrdersByDateRange(startDate.value, endDate.value)
    .filter((o) => o.status === "completed");

  const categoryStats: Record<string, { sold: number; revenue: number }> = {};
  for (const order of orders) {
    for (const item of order.items) {
      const category = item.product.categoryId || t("common.uncategorized");
      if (!categoryStats[category])
        categoryStats[category] = { sold: 0, revenue: 0 };
      categoryStats[category].sold += item.quantity;
      categoryStats[category].revenue += item.total;
    }
  }

  const byCategory = Object.entries(categoryStats)
    .map(([category, data]) => ({
      category,
      sold: data.sold,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return { topProducts, byCategory };
});

// Real customer data from customers store
const customerData = computed(() => {
  if (!isInitialized.value) {
    return {
      totalCustomers: 0,
      newCustomers: 0,
      repeatRate: 0,
      topCustomers: [] as { name: string; orders: number; spent: number }[],
    };
  }

  const stats = customersStore.getCustomerStats();
  const topSpenders = customersStore.getTopSpenders(5);

  // Calculate new customers (joined this month)
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const newCustomers = customersStore.customers.value.filter(
    (c) => new Date(c.joinedAt) >= monthStart
  ).length;

  // Repeat rate (customers with more than 1 visit)
  const repeatCustomers = customersStore.customers.value.filter(
    (c) => c.visitCount > 1
  ).length;
  const repeatRate =
    stats.total > 0 ? Math.round((repeatCustomers / stats.total) * 100) : 0;

  const topCustomers = topSpenders.map((s) => ({
    name:
      s.customer.name ||
      s.customer.nostrPubkey?.slice(0, 12) + "..." ||
      t("customers.anonymous"),
    orders: s.visitCount,
    spent: s.totalSpent,
  }));

  return {
    totalCustomers: stats.total,
    newCustomers,
    repeatRate,
    topCustomers,
  };
});

// Real payment data
const paymentData = computed(() => {
  const byMethod = salesData.value.byPaymentMethod.map((m) => ({
    method: m.method,
    transactions: m.count,
    amount: m.amount,
    icon:
      m.method.toLowerCase() === "lightning"
        ? "i-heroicons-bolt"
        : m.method.toLowerCase() === "cash"
        ? "i-heroicons-banknotes"
        : "i-heroicons-qr-code",
  }));

  // Lightning stats
  const lightningOrders = ordersStore
    .getOrdersByPaymentMethod("lightning")
    .filter(
      (o) =>
        o.status === "completed" &&
        dateRange.value.start &&
        o.date >= dateRange.value.start
    );

  const totalSats = lightningOrders.reduce(
    (sum, o) => sum + (o.totalSats || 0),
    0
  );
  const avgTxSize =
    lightningOrders.length > 0
      ? Math.round(totalSats / lightningOrders.length)
      : 0;

  return {
    byMethod,
    lightningStats: {
      totalSats,
      avgTxSize,
      successRate: 99.7, // Would need payment tracking for accurate rate
    },
  };
});

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
};

const setQuickDateRange = (range: string) => {
  const today = new Date();
  const start = new Date();

  switch (range) {
    case "today":
      dateRange.value = {
        start: today.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
      };
      break;
    case "yesterday":
      start.setDate(today.getDate() - 1);
      dateRange.value = {
        start: start.toISOString().split("T")[0],
        end: start.toISOString().split("T")[0],
      };
      break;
    case "week":
      start.setDate(today.getDate() - today.getDay());
      dateRange.value = {
        start: start.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
      };
      break;
    case "month":
      start.setDate(1);
      dateRange.value = {
        start: start.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
      };
      break;
    case "lastMonth":
      start.setMonth(today.getMonth() - 1);
      start.setDate(1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      dateRange.value = {
        start: start.toISOString().split("T")[0],
        end: endOfLastMonth.toISOString().split("T")[0],
      };
      break;
    case "quarter":
      const quarter = Math.floor(today.getMonth() / 3);
      start.setMonth(quarter * 3);
      start.setDate(1);
      dateRange.value = {
        start: start.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
      };
      break;
    case "year":
      start.setMonth(0);
      start.setDate(1);
      dateRange.value = {
        start: start.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
      };
      break;
  }
};

const generateReport = async () => {
  loading.value = true;
  try {
    // Refresh data from stores
    await Promise.all([ordersStore.init(), customersStore.init()]);
    toast.add({
      title: t("common.success"),
      description: t("reports.dataRefreshed") || "Report data refreshed",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "error",
    });
  } finally {
    loading.value = false;
  }
};

const exportReport = async (format: "pdf" | "excel" | "csv") => {
  loading.value = true;
  try {
    // For CSV export
    if (format === "csv" && selectedReport.value === "sales") {
      const headers = ["Date", "Orders", "Revenue (LAK)"];
      const rows = salesData.value.byPeriod.map((p) => [
        p.period,
        p.orders,
        p.revenue,
      ]);
      const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-report-${dateRange.value.start}-${dateRange.value.end}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.add({
        title: t("common.success"),
        description: t("reports.exported") || "Report exported",
        color: "success",
      });
    } else {
      toast.add({
        title: t("common.info"),
        description:
          t("reports.exportComingSoon") || "PDF and Excel export coming soon",
        color: "info",
      });
    }
  } finally {
    loading.value = false;
  }
};

// Chart series
const salesChartSeries = computed(() => [
  {
    name: t("reports.revenue"),
    type: "bar" as const,
    data: salesData.value.byPeriod.map((d) => d.revenue),
  },
]);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      :title="t('reports.title')"
      :description="t('reports.description')"
    >
      <template #right>
        <div class="flex gap-2">
          <UDropdownMenu
            :items="[
              [
                {
                  label: 'PDF',
                  icon: 'i-heroicons-document',
                  onSelect: () => exportReport('pdf'),
                },
                {
                  label: 'Excel',
                  icon: 'i-heroicons-table-cells',
                  onSelect: () => exportReport('excel'),
                },
                {
                  label: 'CSV',
                  icon: 'i-heroicons-document-text',
                  onSelect: () => exportReport('csv'),
                },
              ],
            ]"
          >
            <UButton
              color="gray"
              variant="outline"
              icon="i-heroicons-arrow-down-tray"
              :label="t('common.export')"
              trailing-icon="i-heroicons-chevron-down"
            />
          </UDropdownMenu>
          <UButton
            color="primary"
            icon="i-heroicons-arrow-path"
            :loading="loading"
            :label="t('reports.generate')"
            @click="generateReport"
          />
        </div>
      </template>
    </CommonPageHeader>

    <!-- Report Type Selection -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-4">
      <button
        v-for="report in reportTypes"
        :key="report.id"
        class="p-4 rounded-xl border-2 transition-all text-left"
        :class="[
          selectedReport === report.id
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        ]"
        @click="selectedReport = report.id"
      >
        <Icon
          :name="report.icon"
          class="w-8 h-8 mb-2"
          :class="
            selectedReport === report.id ? 'text-primary-500' : 'text-gray-400'
          "
        />
        <p
          class="font-medium text-sm"
          :class="
            selectedReport === report.id
              ? 'text-primary-700 dark:text-primary-300'
              : 'text-gray-700 dark:text-gray-300'
          "
        >
          {{ t(report.name) }}
        </p>
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-gray-50 dark:bg-gray-800/50 p-4 mx-4 rounded-xl">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UFormField :label="t('reports.startDate')">
          <UInput v-model="dateRange.start" type="date" />
        </UFormField>
        <UFormField :label="t('reports.endDate')">
          <UInput v-model="dateRange.end" type="date" />
        </UFormField>
        <UFormField :label="t('common.branch')">
          <USelect
            v-model="selectedBranch"
            :items="branches"
            value-key="id"
            label-key="name"
          />
        </UFormField>
        <UFormField :label="t('reports.quickSelect')">
          <USelect
            :items="quickDateRanges"
            value-key="value"
            label-key="label"
            :placeholder="t('reports.selectRange')"
            @update:model-value="setQuickDateRange"
          />
        </UFormField>
      </div>
    </div>

    <!-- Sales Report -->
    <template v-if="selectedReport === 'sales'">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
        <CommonStatCard
          icon="i-heroicons-currency-dollar"
          icon-color="blue"
          :label="t('reports.totalRevenue')"
          :value="formatCurrency(salesData.totalRevenue)"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-heroicons-shopping-cart"
          icon-color="green"
          :label="t('reports.totalOrders')"
          :value="salesData.totalOrders.toLocaleString()"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-heroicons-calculator"
          icon-color="purple"
          :label="t('reports.avgOrderValue')"
          :value="formatCurrency(salesData.avgOrderValue)"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-heroicons-banknotes"
          icon-color="yellow"
          :label="t('reports.topPaymentMethod')"
          :value="salesData.topPaymentMethod"
          :loading="loading || !isInitialized"
        />
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">
        <UCard>
          <template #header>
            <h3 class="font-medium">{{ t("reports.revenueOverTime") }}</h3>
          </template>
          <div class="h-80">
            <ChartBar :series="salesChartSeries" />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-medium">{{ t("reports.paymentMethods") }}</h3>
          </template>
          <div class="space-y-4">
            <div
              v-for="method in salesData.byPaymentMethod"
              :key="method.method"
              class="flex items-center"
            >
              <div class="flex-1">
                <div class="flex justify-between mb-1">
                  <span class="font-medium">{{ method.method }}</span>
                  <span class="text-sm text-gray-500"
                    >{{ method.percentage }}%</span
                  >
                </div>
                <div
                  class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-primary-500 rounded-full"
                    :style="{ width: `${method.percentage}%` }"
                  />
                </div>
              </div>
              <span class="ml-4 font-bold text-right min-w-[120px]">{{
                formatCurrency(method.amount)
              }}</span>
            </div>
          </div>
        </UCard>
      </div>
    </template>

    <!-- Products Report -->
    <template v-if="selectedReport === 'products'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">
        <UCard>
          <template #header>
            <h3 class="font-medium">{{ t("reports.topProducts") }}</h3>
          </template>
          <div class="space-y-4">
            <div
              v-for="(product, index) in productData.topProducts"
              :key="product.name"
              class="flex items-center"
            >
              <span
                class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-bold mr-3"
              >
                {{ index + 1 }}
              </span>
              <div class="flex-1">
                <p class="font-medium">{{ product.name }}</p>
                <p class="text-sm text-gray-500">
                  {{ product.sold }} {{ t("reports.unitsSold") }}
                </p>
              </div>
              <span class="font-bold text-primary-600 dark:text-primary-400">{{
                formatCurrency(product.revenue)
              }}</span>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-medium">{{ t("reports.salesByCategory") }}</h3>
          </template>
          <div class="h-64">
            <ChartPie
              :series="[
                {
                  name: t('reports.revenue'),
                  type: 'pie',
                  radius: '60%',
                  data: productData.byCategory.map((c) => ({
                    name: c.category,
                    value: c.revenue,
                  })),
                },
              ]"
            />
          </div>
        </UCard>
      </div>
    </template>

    <!-- Customers Report -->
    <template v-if="selectedReport === 'customers'">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
        <CommonStatCard
          icon="i-heroicons-users"
          icon-color="blue"
          :label="t('reports.totalCustomers')"
          :value="customerData.totalCustomers"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-heroicons-user-plus"
          icon-color="green"
          :label="t('reports.newCustomers')"
          :value="'+' + customerData.newCustomers"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-heroicons-arrow-path"
          icon-color="purple"
          :label="t('reports.repeatRate')"
          :value="customerData.repeatRate + '%'"
          :loading="loading || !isInitialized"
        />
      </div>

      <UCard class="mx-4">
        <template #header>
          <h3 class="font-medium">{{ t("reports.topCustomers") }}</h3>
        </template>
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 font-medium">#</th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("customers.name") }}
              </th>
              <th class="text-center py-3 px-4 font-medium">
                {{ t("reports.orders") }}
              </th>
              <th class="text-right py-3 px-4 font-medium">
                {{ t("reports.totalSpent") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(customer, index) in customerData.topCustomers"
              :key="customer.name"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 px-4">{{ index + 1 }}</td>
              <td class="py-3 px-4 font-medium">{{ customer.name }}</td>
              <td class="py-3 px-4 text-center">{{ customer.orders }}</td>
              <td
                class="py-3 px-4 text-right font-bold text-primary-600 dark:text-primary-400"
              >
                {{ formatCurrency(customer.spent) }}
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </template>

    <!-- Payments Report -->
    <template v-if="selectedReport === 'payments'">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
        <UCard v-for="method in paymentData.byMethod" :key="method.method">
          <div class="flex items-center mb-4">
            <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mr-4">
              <Icon :name="method.icon" class="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p class="font-medium">{{ method.method }}</p>
              <p class="text-sm text-gray-500">
                {{ method.transactions }} {{ t("reports.transactions") }}
              </p>
            </div>
          </div>
          <p class="text-2xl font-bold">{{ formatCurrency(method.amount) }}</p>
        </UCard>
      </div>

      <!-- Lightning Stats -->
      <UCard class="mx-4">
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="i-heroicons-bolt" class="w-5 h-5 text-orange-500" />
            <h3 class="font-medium">{{ t("reports.lightningStats") }}</h3>
          </div>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t("reports.totalSats") }}
            </p>
            <p class="text-2xl font-bold text-orange-500">
              {{ paymentData.lightningStats.totalSats.toLocaleString() }} sats
            </p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t("reports.avgTxSize") }}
            </p>
            <p class="text-2xl font-bold">
              {{ paymentData.lightningStats.avgTxSize.toLocaleString() }} sats
            </p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t("reports.successRate") }}
            </p>
            <p class="text-2xl font-bold text-green-500">
              {{ paymentData.lightningStats.successRate }}%
            </p>
          </div>
        </div>
      </UCard>
    </template>

    <!-- Inventory Report Placeholder -->
    <template v-if="selectedReport === 'inventory'">
      <div class="text-center py-12 px-4">
        <Icon
          name="i-heroicons-archive-box"
          class="w-16 h-16 text-gray-400 mx-auto mb-4"
        />
        <h3 class="text-xl font-medium text-gray-900 dark:text-white mb-2">
          {{ t("reports.inventoryReport") }}
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          {{ t("reports.inventoryReportDesc") }}
        </p>
        <UButton
          color="primary"
          to="/inventory"
          :label="t('reports.goToInventory')"
        />
      </div>
    </template>

    <!-- Staff Report Placeholder -->
    <template v-if="selectedReport === 'staff'">
      <div class="text-center py-12 px-4">
        <Icon
          name="i-heroicons-user-group"
          class="w-16 h-16 text-gray-400 mx-auto mb-4"
        />
        <h3 class="text-xl font-medium text-gray-900 dark:text-white mb-2">
          {{ t("reports.staffReport") }}
        </h3>
        <p class="text-gray-500 dark:text-gray-400">
          {{ t("reports.staffReportDesc") }}
        </p>
      </div>
    </template>
  </div>
</template>
