<!-- pages/reports/index.vue -->
<script setup lang="ts">
const { t } = useI18n();

// Report types
type ReportType = 'sales' | 'products' | 'customers' | 'inventory' | 'payments' | 'staff';

interface ReportConfig {
  id: ReportType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const reportTypes: ReportConfig[] = [
  {
    id: 'sales',
    name: 'reports.salesReport',
    description: 'reports.salesReportDesc',
    icon: 'i-heroicons-chart-bar',
    color: 'blue',
  },
  {
    id: 'products',
    name: 'reports.productReport',
    description: 'reports.productReportDesc',
    icon: 'i-heroicons-cube',
    color: 'green',
  },
  {
    id: 'customers',
    name: 'reports.customerReport',
    description: 'reports.customerReportDesc',
    icon: 'i-heroicons-users',
    color: 'purple',
  },
  {
    id: 'inventory',
    name: 'reports.inventoryReport',
    description: 'reports.inventoryReportDesc',
    icon: 'i-heroicons-archive-box',
    color: 'yellow',
  },
  {
    id: 'payments',
    name: 'reports.paymentReport',
    description: 'reports.paymentReportDesc',
    icon: 'i-heroicons-credit-card',
    color: 'orange',
  },
  {
    id: 'staff',
    name: 'reports.staffReport',
    description: 'reports.staffReportDesc',
    icon: 'i-heroicons-user-group',
    color: 'cyan',
  },
];

// Date range
const dateRange = ref({
  start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0],
});

const selectedBranch = ref('');
const selectedReport = ref<ReportType>('sales');
const loading = ref(false);

const branches = [
  { id: '', name: t('common.allBranches') },
  { id: '1', name: 'ສາຂາໃຈກາງ / Central Branch' },
  { id: '2', name: 'ສາຂາຫ້ວຍໂຮ້ງ / Huay Hong Branch' },
];

const quickDateRanges = [
  { label: t('reports.today'), value: 'today' },
  { label: t('reports.yesterday'), value: 'yesterday' },
  { label: t('reports.thisWeek'), value: 'week' },
  { label: t('reports.thisMonth'), value: 'month' },
  { label: t('reports.lastMonth'), value: 'lastMonth' },
  { label: t('reports.thisQuarter'), value: 'quarter' },
  { label: t('reports.thisYear'), value: 'year' },
];

// Mock report data
const salesData = ref({
  totalRevenue: 42850000,
  totalOrders: 1084,
  avgOrderValue: 39527,
  topPaymentMethod: 'Cash',
  byPeriod: [
    { period: 'Jan', revenue: 4500000, orders: 120 },
    { period: 'Feb', revenue: 5200000, orders: 145 },
    { period: 'Mar', revenue: 4800000, orders: 130 },
    { period: 'Apr', revenue: 6200000, orders: 165 },
    { period: 'May', revenue: 5800000, orders: 152 },
    { period: 'Jun', revenue: 7100000, orders: 190 },
    { period: 'Jul', revenue: 9250000, orders: 182 },
  ],
  byPaymentMethod: [
    { method: 'Cash', amount: 25710000, percentage: 60 },
    { method: 'Lightning', amount: 12855000, percentage: 30 },
    { method: 'QR Code', amount: 4285000, percentage: 10 },
  ],
});

const productData = ref({
  topProducts: [
    { name: 'ເບຍ Beer Lao', sold: 420, revenue: 5040000 },
    { name: 'ເຂົ້າຈີ່ Grilled Chicken', sold: 280, revenue: 7000000 },
    { name: 'ກາເຟ Coffee Lao', sold: 350, revenue: 5250000 },
    { name: 'ສົ້ມຕຳ Papaya Salad', sold: 220, revenue: 3960000 },
    { name: 'ນ້ຳດື່ມ Water', sold: 580, revenue: 1740000 },
  ],
  byCategory: [
    { category: 'ເຄື່ອງດື່ມ', sold: 1350, revenue: 12030000 },
    { category: 'ອາຫານ', sold: 650, revenue: 18200000 },
    { category: 'ຂອງຫວານ', sold: 180, revenue: 4500000 },
  ],
});

const customerData = ref({
  totalCustomers: 856,
  newCustomers: 45,
  repeatRate: 68,
  topCustomers: [
    { name: 'ທ່ານ ສົມສັກ ສີຫາລາດ', orders: 48, spent: 5250000 },
    { name: 'ນາງ ຄຳລາ ວົງສາ', orders: 35, spent: 3850000 },
    { name: 'ທ່ານ ບຸນມີ ຈັນທະວົງ', orders: 28, spent: 2950000 },
  ],
});

const paymentData = ref({
  byMethod: [
    { method: 'Cash', transactions: 650, amount: 25710000, icon: 'i-heroicons-banknotes' },
    { method: 'Lightning', transactions: 324, amount: 12855000, icon: 'i-heroicons-bolt' },
    { method: 'QR Code', transactions: 110, amount: 4285000, icon: 'i-heroicons-qr-code' },
  ],
  lightningStats: {
    totalSats: 857000,
    avgTxSize: 2645,
    successRate: 99.7,
  },
});

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('lo-LA', {
    style: 'currency',
    currency: 'LAK',
    minimumFractionDigits: 0,
  }).format(amount);
};

const setQuickDateRange = (range: string) => {
  const today = new Date();
  const start = new Date();
  
  switch (range) {
    case 'today':
      dateRange.value = {
        start: today.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
      break;
    case 'yesterday':
      start.setDate(today.getDate() - 1);
      dateRange.value = {
        start: start.toISOString().split('T')[0],
        end: start.toISOString().split('T')[0],
      };
      break;
    case 'week':
      start.setDate(today.getDate() - today.getDay());
      dateRange.value = {
        start: start.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
      break;
    case 'month':
      start.setDate(1);
      dateRange.value = {
        start: start.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
      break;
    case 'lastMonth':
      start.setMonth(today.getMonth() - 1);
      start.setDate(1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      dateRange.value = {
        start: start.toISOString().split('T')[0],
        end: endOfLastMonth.toISOString().split('T')[0],
      };
      break;
    case 'quarter':
      const quarter = Math.floor(today.getMonth() / 3);
      start.setMonth(quarter * 3);
      start.setDate(1);
      dateRange.value = {
        start: start.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
      break;
    case 'year':
      start.setMonth(0);
      start.setDate(1);
      dateRange.value = {
        start: start.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      };
      break;
  }
};

const generateReport = async () => {
  loading.value = true;
  try {
    // TODO: Fetch from Hasura/Nostr
    await new Promise((resolve) => setTimeout(resolve, 1500));
  } finally {
    loading.value = false;
  }
};

const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
  console.log(`Exporting ${selectedReport.value} report as ${format}`);
  // TODO: Implement export
};

// Chart series
const salesChartSeries = computed(() => [
  {
    name: t('reports.revenue'),
    type: 'bar',
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
          <UDropdown
            :items="[
              [
                { label: 'PDF', icon: 'i-heroicons-document', click: () => exportReport('pdf') },
                { label: 'Excel', icon: 'i-heroicons-table-cells', click: () => exportReport('excel') },
                { label: 'CSV', icon: 'i-heroicons-document-text', click: () => exportReport('csv') },
              ],
            ]"
          >
            <UButton color="gray" variant="outline" icon="i-heroicons-arrow-down-tray" :label="t('common.export')" trailing-icon="i-heroicons-chevron-down" />
          </UDropdown>
          <UButton color="primary" icon="i-heroicons-arrow-path" :loading="loading" :label="t('reports.generate')" @click="generateReport" />
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
          :class="selectedReport === report.id ? 'text-primary-500' : 'text-gray-400'"
        />
        <p class="font-medium text-sm" :class="selectedReport === report.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'">
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
            :options="branches"
            value-attribute="id"
            option-attribute="name"
          />
        </UFormField>
        <UFormField :label="t('reports.quickSelect')">
          <USelect
            :options="quickDateRanges"
            value-attribute="value"
            option-attribute="label"
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
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.totalRevenue') }}</p>
            <p class="text-3xl font-bold text-primary-600 dark:text-primary-400">{{ formatCurrency(salesData.totalRevenue) }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.totalOrders') }}</p>
            <p class="text-3xl font-bold">{{ salesData.totalOrders.toLocaleString() }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.avgOrderValue') }}</p>
            <p class="text-3xl font-bold">{{ formatCurrency(salesData.avgOrderValue) }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.topPaymentMethod') }}</p>
            <p class="text-3xl font-bold">{{ salesData.topPaymentMethod }}</p>
          </div>
        </UCard>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">
        <UCard>
          <template #header>
            <h3 class="font-medium">{{ t('reports.revenueOverTime') }}</h3>
          </template>
          <div class="h-80">
            <ChartBar :series="salesChartSeries" />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-medium">{{ t('reports.paymentMethods') }}</h3>
          </template>
          <div class="space-y-4">
            <div v-for="method in salesData.byPaymentMethod" :key="method.method" class="flex items-center">
              <div class="flex-1">
                <div class="flex justify-between mb-1">
                  <span class="font-medium">{{ method.method }}</span>
                  <span class="text-sm text-gray-500">{{ method.percentage }}%</span>
                </div>
                <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-primary-500 rounded-full"
                    :style="{ width: `${method.percentage}%` }"
                  />
                </div>
              </div>
              <span class="ml-4 font-bold text-right min-w-[120px]">{{ formatCurrency(method.amount) }}</span>
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
            <h3 class="font-medium">{{ t('reports.topProducts') }}</h3>
          </template>
          <div class="space-y-4">
            <div v-for="(product, index) in productData.topProducts" :key="product.name" class="flex items-center">
              <span class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-bold mr-3">
                {{ index + 1 }}
              </span>
              <div class="flex-1">
                <p class="font-medium">{{ product.name }}</p>
                <p class="text-sm text-gray-500">{{ product.sold }} {{ t('reports.unitsSold') }}</p>
              </div>
              <span class="font-bold text-primary-600 dark:text-primary-400">{{ formatCurrency(product.revenue) }}</span>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-medium">{{ t('reports.salesByCategory') }}</h3>
          </template>
          <div class="h-64">
            <ChartPie
              :series="[
                {
                  name: t('reports.revenue'),
                  type: 'pie',
                  radius: '60%',
                  data: productData.byCategory.map((c) => ({ name: c.category, value: c.revenue })),
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
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.totalCustomers') }}</p>
            <p class="text-3xl font-bold">{{ customerData.totalCustomers }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.newCustomers') }}</p>
            <p class="text-3xl font-bold text-green-500">+{{ customerData.newCustomers }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.repeatRate') }}</p>
            <p class="text-3xl font-bold">{{ customerData.repeatRate }}%</p>
          </div>
        </UCard>
      </div>

      <UCard class="mx-4">
        <template #header>
          <h3 class="font-medium">{{ t('reports.topCustomers') }}</h3>
        </template>
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 font-medium">#</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('customers.name') }}</th>
              <th class="text-center py-3 px-4 font-medium">{{ t('reports.orders') }}</th>
              <th class="text-right py-3 px-4 font-medium">{{ t('reports.totalSpent') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(customer, index) in customerData.topCustomers" :key="customer.name" class="border-b border-gray-100 dark:border-gray-800">
              <td class="py-3 px-4">{{ index + 1 }}</td>
              <td class="py-3 px-4 font-medium">{{ customer.name }}</td>
              <td class="py-3 px-4 text-center">{{ customer.orders }}</td>
              <td class="py-3 px-4 text-right font-bold text-primary-600 dark:text-primary-400">{{ formatCurrency(customer.spent) }}</td>
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
              <p class="text-sm text-gray-500">{{ method.transactions }} {{ t('reports.transactions') }}</p>
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
            <h3 class="font-medium">{{ t('reports.lightningStats') }}</h3>
          </div>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.totalSats') }}</p>
            <p class="text-2xl font-bold text-orange-500">{{ paymentData.lightningStats.totalSats.toLocaleString() }} sats</p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.avgTxSize') }}</p>
            <p class="text-2xl font-bold">{{ paymentData.lightningStats.avgTxSize.toLocaleString() }} sats</p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.successRate') }}</p>
            <p class="text-2xl font-bold text-green-500">{{ paymentData.lightningStats.successRate }}%</p>
          </div>
        </div>
      </UCard>
    </template>

    <!-- Inventory Report Placeholder -->
    <template v-if="selectedReport === 'inventory'">
      <div class="text-center py-12 px-4">
        <Icon name="i-heroicons-archive-box" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-xl font-medium text-gray-900 dark:text-white mb-2">{{ t('reports.inventoryReport') }}</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">{{ t('reports.inventoryReportDesc') }}</p>
        <UButton color="primary" to="/inventory" :label="t('reports.goToInventory')" />
      </div>
    </template>

    <!-- Staff Report Placeholder -->
    <template v-if="selectedReport === 'staff'">
      <div class="text-center py-12 px-4">
        <Icon name="i-heroicons-user-group" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-xl font-medium text-gray-900 dark:text-white mb-2">{{ t('reports.staffReport') }}</h3>
        <p class="text-gray-500 dark:text-gray-400">{{ t('reports.staffReportDesc') }}</p>
      </div>
    </template>
  </div>
</template>
