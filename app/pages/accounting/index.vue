<script setup lang="ts">
/**
 * 💰 Accounting Dashboard
 * Financial management, invoices, expenses, and reports
 */

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const { formatCurrency } = useCurrency();

// Active tab state
const activeTab = ref<
  "overview" | "invoices" | "expenses" | "journal" | "reports"
>("overview");

// Date range filter
const dateRange = ref({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0],
  end: new Date().toISOString().split("T")[0],
});

// Financial overview data
const financialOverview = ref({
  revenue: 125000000,
  expenses: 45000000,
  profit: 80000000,
  profitMargin: 64,
  accountsReceivable: 15000000,
  accountsPayable: 8000000,
  cashBalance: 95000000,
  lightningBalance: 2500000, // in sats
});

// Chart of Accounts
const chartOfAccounts = ref([
  { code: "1000", name: "Cash", type: "asset", balance: 95000000 },
  { code: "1010", name: "Lightning Wallet", type: "asset", balance: 2500000 },
  {
    code: "1100",
    name: "Accounts Receivable",
    type: "asset",
    balance: 15000000,
  },
  { code: "1200", name: "Inventory", type: "asset", balance: 35000000 },
  {
    code: "2000",
    name: "Accounts Payable",
    type: "liability",
    balance: 8000000,
  },
  { code: "2100", name: "Tax Payable", type: "liability", balance: 5500000 },
  { code: "3000", name: "Owner Equity", type: "equity", balance: 100000000 },
  { code: "4000", name: "Sales Revenue", type: "revenue", balance: 125000000 },
  {
    code: "4100",
    name: "Lightning Revenue",
    type: "revenue",
    balance: 25000000,
  },
  {
    code: "5000",
    name: "Cost of Goods Sold",
    type: "expense",
    balance: 30000000,
  },
  {
    code: "5100",
    name: "Operating Expenses",
    type: "expense",
    balance: 15000000,
  },
]);

// Invoices
const invoices = ref([
  {
    id: "INV-001",
    customer: "ບໍລິສັດ ABC",
    amount: 5500000,
    status: "paid",
    dueDate: "2024-01-15",
    paidDate: "2024-01-10",
  },
  {
    id: "INV-002",
    customer: "ຮ້ານ XYZ",
    amount: 3200000,
    status: "pending",
    dueDate: "2024-01-25",
    paidDate: null,
  },
  {
    id: "INV-003",
    customer: "ໂຮງແຮມ Grand",
    amount: 8500000,
    status: "overdue",
    dueDate: "2024-01-05",
    paidDate: null,
  },
  {
    id: "INV-004",
    customer: "ຮ້ານອາຫານ Tasty",
    amount: 2100000,
    status: "paid",
    dueDate: "2024-01-20",
    paidDate: "2024-01-18",
  },
  {
    id: "INV-005",
    customer: "ບໍລິສັດ DEF",
    amount: 6800000,
    status: "pending",
    dueDate: "2024-01-30",
    paidDate: null,
  },
]);

// Expenses
const expenses = ref([
  {
    id: "EXP-001",
    description: "Supplier Payment - Coffee Beans",
    category: "inventory",
    amount: 12000000,
    date: "2024-01-08",
    status: "paid",
  },
  {
    id: "EXP-002",
    description: "Electricity Bill",
    category: "utilities",
    amount: 850000,
    date: "2024-01-10",
    status: "paid",
  },
  {
    id: "EXP-003",
    description: "Staff Salaries",
    category: "payroll",
    amount: 18000000,
    date: "2024-01-01",
    status: "paid",
  },
  {
    id: "EXP-004",
    description: "Rent Payment",
    category: "rent",
    amount: 8000000,
    date: "2024-01-01",
    status: "paid",
  },
  {
    id: "EXP-005",
    description: "Marketing - Social Media",
    category: "marketing",
    amount: 1500000,
    date: "2024-01-15",
    status: "pending",
  },
]);

// Journal Entries
const journalEntries = ref([
  {
    id: "JE-001",
    date: "2024-01-15",
    description: "Daily Sales Recording",
    status: "posted",
    lines: [
      { account: "1000 - Cash", debit: 8500000, credit: 0 },
      { account: "4000 - Sales Revenue", debit: 0, credit: 8500000 },
    ],
  },
  {
    id: "JE-002",
    date: "2024-01-15",
    description: "Lightning Payments Received",
    status: "posted",
    lines: [
      { account: "1010 - Lightning Wallet", debit: 250000, credit: 0 },
      { account: "4100 - Lightning Revenue", debit: 0, credit: 250000 },
    ],
  },
  {
    id: "JE-003",
    date: "2024-01-16",
    description: "Inventory Purchase",
    status: "posted",
    lines: [
      { account: "1200 - Inventory", debit: 5000000, credit: 0 },
      { account: "2000 - Accounts Payable", debit: 0, credit: 5000000 },
    ],
  },
]);

// Tax summary
const taxSummary = ref({
  vatCollected: 12500000,
  vatPaid: 4500000,
  vatPayable: 8000000,
  withholdingTax: 1500000,
  incomeTax: 5000000,
});

// Modals
const showInvoiceModal = ref(false);
const showExpenseModal = ref(false);
const showJournalModal = ref(false);

// New invoice form
const newInvoice = ref({
  customer: "",
  amount: 0,
  dueDate: "",
  items: [] as Array<{ description: string; quantity: number; price: number }>,
});

// New expense form
const newExpense = ref({
  description: "",
  category: "inventory",
  amount: 0,
  date: new Date().toISOString().split("T")[0],
  paymentMethod: "cash",
});

// New journal entry form
const newJournalEntry = ref({
  date: new Date().toISOString().split("T")[0],
  description: "",
  lines: [
    { account: "", debit: 0, credit: 0 },
    { account: "", debit: 0, credit: 0 },
  ],
});

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "overdue":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "posted":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "draft":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
};

const getAccountTypeColor = (type: string) => {
  switch (type) {
    case "asset":
      return "text-blue-600 dark:text-blue-400";
    case "liability":
      return "text-red-600 dark:text-red-400";
    case "equity":
      return "text-purple-600 dark:text-purple-400";
    case "revenue":
      return "text-green-600 dark:text-green-400";
    case "expense":
      return "text-orange-600 dark:text-orange-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "inventory":
      return "i-heroicons-cube";
    case "utilities":
      return "i-heroicons-bolt";
    case "payroll":
      return "i-heroicons-users";
    case "rent":
      return "i-heroicons-building-office";
    case "marketing":
      return "i-heroicons-megaphone";
    default:
      return "i-heroicons-banknotes";
  }
};

// Actions
const createInvoice = () => {
  // TODO: Implement invoice creation
  showInvoiceModal.value = false;
};

const createExpense = () => {
  // TODO: Implement expense creation
  showExpenseModal.value = false;
};

const createJournalEntry = () => {
  // TODO: Implement journal entry creation
  showJournalModal.value = false;
};

const exportReport = (type: string) => {
  // TODO: Implement report export
  console.log("Exporting", type);
};

const payWithLightning = (invoiceId: string) => {
  // TODO: Implement Lightning payment for invoice
  console.log("Pay invoice with Lightning:", invoiceId);
};
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6">
    <!-- Page Header -->
    <CommonPageHeader
      :title="$t('accounting.title')"
      :subtitle="$t('accounting.subtitle')"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <UInput
            v-model="dateRange.start"
            type="date"
            size="sm"
            class="w-36"
          />
          <span class="text-gray-500 dark:text-gray-400">-</span>
          <UInput v-model="dateRange.end" type="date" size="sm" class="w-36" />
        </div>
      </template>
    </CommonPageHeader>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <nav class="flex gap-4 overflow-x-auto">
        <button
          v-for="tab in [
            'overview',
            'invoices',
            'expenses',
            'journal',
            'reports',
          ]"
          :key="tab"
          @click="activeTab = tab as any"
          class="px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
          :class="
            activeTab === tab
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          "
        >
          {{ $t(`accounting.tabs.${tab}`) }}
        </button>
      </nav>
    </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'" class="space-y-6">
      <!-- Financial KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard
          class="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-green-600 dark:text-green-400">
                {{ $t("accounting.revenue") }}
              </p>
              <p class="text-2xl font-bold text-green-700 dark:text-green-300">
                {{ formatCurrency(financialOverview.revenue) }}
              </p>
            </div>
            <div class="p-3 bg-green-200 dark:bg-green-800 rounded-full">
              <UIcon
                name="i-heroicons-arrow-trending-up"
                class="w-6 h-6 text-green-600 dark:text-green-400"
              />
            </div>
          </div>
        </UCard>

        <UCard
          class="bg-linear-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-red-600 dark:text-red-400">
                {{ $t("accounting.expenses") }}
              </p>
              <p class="text-2xl font-bold text-red-700 dark:text-red-300">
                {{ formatCurrency(financialOverview.expenses) }}
              </p>
            </div>
            <div class="p-3 bg-red-200 dark:bg-red-800 rounded-full">
              <UIcon
                name="i-heroicons-arrow-trending-down"
                class="w-6 h-6 text-red-600 dark:text-red-400"
              />
            </div>
          </div>
        </UCard>

        <UCard
          class="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-blue-600 dark:text-blue-400">
                {{ $t("accounting.profit") }}
              </p>
              <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {{ formatCurrency(financialOverview.profit) }}
              </p>
              <p class="text-xs text-blue-500 dark:text-blue-400">
                {{ financialOverview.profitMargin }}%
                {{ $t("accounting.margin") }}
              </p>
            </div>
            <div class="p-3 bg-blue-200 dark:bg-blue-800 rounded-full">
              <UIcon
                name="i-heroicons-chart-bar"
                class="w-6 h-6 text-blue-600 dark:text-blue-400"
              />
            </div>
          </div>
        </UCard>

        <UCard
          class="bg-linear-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-amber-600 dark:text-amber-400">
                ⚡ {{ $t("accounting.lightningBalance") }}
              </p>
              <p class="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {{ financialOverview.lightningBalance.toLocaleString() }} sats
              </p>
            </div>
            <div class="p-3 bg-amber-200 dark:bg-amber-800 rounded-full">
              <UIcon
                name="i-heroicons-bolt"
                class="w-6 h-6 text-amber-600 dark:text-amber-400"
              />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Secondary KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UCard>
          <div class="flex items-center gap-4">
            <div class="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-arrow-down-tray"
                class="w-5 h-5 text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("accounting.accountsReceivable") }}
              </p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ formatCurrency(financialOverview.accountsReceivable) }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-arrow-up-tray"
                class="w-5 h-5 text-red-600 dark:text-red-400"
              />
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("accounting.accountsPayable") }}
              </p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ formatCurrency(financialOverview.accountsPayable) }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-banknotes"
                class="w-5 h-5 text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("accounting.cashBalance") }}
              </p>
              <p class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ formatCurrency(financialOverview.cashBalance) }}
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Chart of Accounts Summary -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ $t("accounting.chartOfAccounts") }}
            </h3>
            <UButton size="xs" variant="ghost" icon="i-heroicons-cog-6-tooth">
              {{ $t("common.manage") }}
            </UButton>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr
                class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
              >
                <th class="pb-3 font-medium">
                  {{ $t("accounting.accountCode") }}
                </th>
                <th class="pb-3 font-medium">
                  {{ $t("accounting.accountName") }}
                </th>
                <th class="pb-3 font-medium">
                  {{ $t("accounting.accountType") }}
                </th>
                <th class="pb-3 font-medium text-right">
                  {{ $t("accounting.balance") }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr
                v-for="account in chartOfAccounts"
                :key="account.code"
                class="text-sm"
              >
                <td class="py-3 font-mono text-gray-600 dark:text-gray-400">
                  {{ account.code }}
                </td>
                <td class="py-3 font-medium text-gray-900 dark:text-white">
                  {{ account.name }}
                </td>
                <td class="py-3">
                  <span
                    :class="getAccountTypeColor(account.type)"
                    class="capitalize"
                  >
                    {{ $t(`accounting.types.${account.type}`) }}
                  </span>
                </td>
                <td
                  class="py-3 text-right font-medium"
                  :class="
                    account.type === 'expense' || account.type === 'liability'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-white'
                  "
                >
                  {{ formatCurrency(account.balance) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <!-- Tax Summary -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ $t("accounting.taxSummary") }}
          </h3>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t("accounting.vatCollected") }}
            </p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(taxSummary.vatCollected) }}
            </p>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t("accounting.vatPaid") }}
            </p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(taxSummary.vatPaid) }}
            </p>
          </div>
          <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p class="text-sm text-red-600 dark:text-red-400">
              {{ $t("accounting.vatPayable") }}
            </p>
            <p class="text-lg font-semibold text-red-700 dark:text-red-300">
              {{ formatCurrency(taxSummary.vatPayable) }}
            </p>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t("accounting.withholdingTax") }}
            </p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(taxSummary.withholdingTax) }}
            </p>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ $t("accounting.incomeTax") }}
            </p>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(taxSummary.incomeTax) }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Invoices Tab -->
    <div v-if="activeTab === 'invoices'" class="space-y-4">
      <div class="flex items-center justify-between">
        <UInput
          icon="i-heroicons-magnifying-glass"
          :placeholder="$t('accounting.searchInvoices')"
          class="w-64"
        />
        <UButton icon="i-heroicons-plus" @click="showInvoiceModal = true">
          {{ $t("accounting.createInvoice") }}
        </UButton>
      </div>

      <UCard>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr
                class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
              >
                <th class="pb-3 font-medium">
                  {{ $t("accounting.invoiceNumber") }}
                </th>
                <th class="pb-3 font-medium">
                  {{ $t("accounting.customer") }}
                </th>
                <th class="pb-3 font-medium text-right">
                  {{ $t("accounting.amount") }}
                </th>
                <th class="pb-3 font-medium">{{ $t("accounting.dueDate") }}</th>
                <th class="pb-3 font-medium">{{ $t("accounting.status") }}</th>
                <th class="pb-3 font-medium text-right">
                  {{ $t("common.actions") }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="invoice in invoices" :key="invoice.id" class="text-sm">
                <td
                  class="py-4 font-medium text-primary-600 dark:text-primary-400"
                >
                  {{ invoice.id }}
                </td>
                <td class="py-4 text-gray-900 dark:text-white">
                  {{ invoice.customer }}
                </td>
                <td
                  class="py-4 text-right font-medium text-gray-900 dark:text-white"
                >
                  {{ formatCurrency(invoice.amount) }}
                </td>
                <td class="py-4 text-gray-600 dark:text-gray-400">
                  {{ invoice.dueDate }}
                </td>
                <td class="py-4">
                  <span
                    :class="getStatusColor(invoice.status)"
                    class="px-2 py-1 text-xs font-medium rounded-full"
                  >
                    {{ $t(`accounting.invoiceStatus.${invoice.status}`) }}
                  </span>
                </td>
                <td class="py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <UButton size="xs" variant="ghost" icon="i-heroicons-eye" />
                    <UButton
                      v-if="invoice.status !== 'paid'"
                      size="xs"
                      variant="ghost"
                      icon="i-heroicons-bolt"
                      @click="payWithLightning(invoice.id)"
                    >
                      ⚡
                    </UButton>
                    <UButton
                      size="xs"
                      variant="ghost"
                      icon="i-heroicons-printer"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <!-- Expenses Tab -->
    <div v-if="activeTab === 'expenses'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UInput
            icon="i-heroicons-magnifying-glass"
            :placeholder="$t('accounting.searchExpenses')"
            class="w-64"
          />
          <USelect
            :items="[
              'all',
              'inventory',
              'utilities',
              'payroll',
              'rent',
              'marketing',
            ]"
            model-value="all"
            class="w-40"
          />
        </div>
        <UButton icon="i-heroicons-plus" @click="showExpenseModal = true">
          {{ $t("accounting.addExpense") }}
        </UButton>
      </div>

      <UCard>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr
                class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
              >
                <th class="pb-3 font-medium">
                  {{ $t("accounting.expenseId") }}
                </th>
                <th class="pb-3 font-medium">
                  {{ $t("accounting.description") }}
                </th>
                <th class="pb-3 font-medium">
                  {{ $t("accounting.category") }}
                </th>
                <th class="pb-3 font-medium text-right">
                  {{ $t("accounting.amount") }}
                </th>
                <th class="pb-3 font-medium">{{ $t("accounting.date") }}</th>
                <th class="pb-3 font-medium">{{ $t("accounting.status") }}</th>
                <th class="pb-3 font-medium text-right">
                  {{ $t("common.actions") }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="expense in expenses" :key="expense.id" class="text-sm">
                <td class="py-4 font-mono text-gray-600 dark:text-gray-400">
                  {{ expense.id }}
                </td>
                <td class="py-4 text-gray-900 dark:text-white">
                  {{ expense.description }}
                </td>
                <td class="py-4">
                  <div class="flex items-center gap-2">
                    <UIcon
                      :name="getCategoryIcon(expense.category)"
                      class="w-4 h-4 text-gray-500 dark:text-gray-400"
                    />
                    <span class="text-gray-600 dark:text-gray-400 capitalize">{{
                      expense.category
                    }}</span>
                  </div>
                </td>
                <td
                  class="py-4 text-right font-medium text-red-600 dark:text-red-400"
                >
                  -{{ formatCurrency(expense.amount) }}
                </td>
                <td class="py-4 text-gray-600 dark:text-gray-400">
                  {{ expense.date }}
                </td>
                <td class="py-4">
                  <span
                    :class="getStatusColor(expense.status)"
                    class="px-2 py-1 text-xs font-medium rounded-full"
                  >
                    {{ $t(`accounting.expenseStatus.${expense.status}`) }}
                  </span>
                </td>
                <td class="py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <UButton
                      size="xs"
                      variant="ghost"
                      icon="i-heroicons-pencil"
                    />
                    <UButton
                      size="xs"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      color="red"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <!-- Journal Tab -->
    <div v-if="activeTab === 'journal'" class="space-y-4">
      <div class="flex items-center justify-between">
        <UInput
          icon="i-heroicons-magnifying-glass"
          :placeholder="$t('accounting.searchEntries')"
          class="w-64"
        />
        <UButton icon="i-heroicons-plus" @click="showJournalModal = true">
          {{ $t("accounting.createEntry") }}
        </UButton>
      </div>

      <div class="space-y-4">
        <UCard v-for="entry in journalEntries" :key="entry.id">
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 dark:text-white">{{
                  entry.id
                }}</span>
                <span
                  :class="getStatusColor(entry.status)"
                  class="px-2 py-0.5 text-xs font-medium rounded-full"
                >
                  {{ $t(`accounting.entryStatus.${entry.status}`) }}
                </span>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {{ entry.description }}
              </p>
            </div>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{
              entry.date
            }}</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
                >
                  <th class="pb-2 font-medium">
                    {{ $t("accounting.account") }}
                  </th>
                  <th class="pb-2 font-medium text-right">
                    {{ $t("accounting.debit") }}
                  </th>
                  <th class="pb-2 font-medium text-right">
                    {{ $t("accounting.credit") }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="(line, idx) in entry.lines" :key="idx">
                  <td class="py-2 text-gray-900 dark:text-white">
                    {{ line.account }}
                  </td>
                  <td
                    class="py-2 text-right"
                    :class="
                      line.debit > 0
                        ? 'text-blue-600 dark:text-blue-400 font-medium'
                        : 'text-gray-400'
                    "
                  >
                    {{ line.debit > 0 ? formatCurrency(line.debit) : "-" }}
                  </td>
                  <td
                    class="py-2 text-right"
                    :class="
                      line.credit > 0
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : 'text-gray-400'
                    "
                  >
                    {{ line.credit > 0 ? formatCurrency(line.credit) : "-" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Reports Tab -->
    <div v-if="activeTab === 'reports'" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Income Statement -->
        <UCard
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="exportReport('income-statement')"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-document-chart-bar"
                class="w-6 h-6 text-green-600 dark:text-green-400"
              />
            </div>
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ $t("accounting.reports.incomeStatement") }}
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("accounting.reports.incomeStatementDesc") }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Balance Sheet -->
        <UCard
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="exportReport('balance-sheet')"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-scale"
                class="w-6 h-6 text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ $t("accounting.reports.balanceSheet") }}
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("accounting.reports.balanceSheetDesc") }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Cash Flow -->
        <UCard
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="exportReport('cash-flow')"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-banknotes"
                class="w-6 h-6 text-purple-600 dark:text-purple-400"
              />
            </div>
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ $t("accounting.reports.cashFlow") }}
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("accounting.reports.cashFlowDesc") }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Trial Balance -->
        <UCard
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="exportReport('trial-balance')"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-calculator"
                class="w-6 h-6 text-amber-600 dark:text-amber-400"
              />
            </div>
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ $t("accounting.reports.trialBalance") }}
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("accounting.reports.trialBalanceDesc") }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- General Ledger -->
        <UCard
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="exportReport('general-ledger')"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-book-open"
                class="w-6 h-6 text-indigo-600 dark:text-indigo-400"
              />
            </div>
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ $t("accounting.reports.generalLedger") }}
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("accounting.reports.generalLedgerDesc") }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Tax Report -->
        <UCard
          class="hover:shadow-lg transition-shadow cursor-pointer"
          @click="exportReport('tax-report')"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <UIcon
                name="i-heroicons-receipt-percent"
                class="w-6 h-6 text-red-600 dark:text-red-400"
              />
            </div>
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">
                {{ $t("accounting.reports.taxReport") }}
              </h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t("accounting.reports.taxReportDesc") }}
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Invoice Modal -->
    <UModal v-model:open="showInvoiceModal">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ $t("accounting.createInvoice") }}
            </h3>
            <UButton
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="showInvoiceModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UFormField :label="$t('accounting.customer')">
            <UInput v-model="newInvoice.customer" />
          </UFormField>
          <UFormField :label="$t('accounting.amount')">
            <UInput v-model="newInvoice.amount" type="number" />
          </UFormField>
          <UFormField :label="$t('accounting.dueDate')">
            <UInput v-model="newInvoice.dueDate" type="date" />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showInvoiceModal = false">{{
              $t("common.cancel")
            }}</UButton>
            <UButton @click="createInvoice">{{ $t("common.create") }}</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Expense Modal -->
    <UModal v-model:open="showExpenseModal">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ $t("accounting.addExpense") }}
            </h3>
            <UButton
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="showExpenseModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UFormField :label="$t('accounting.description')">
            <UInput v-model="newExpense.description" />
          </UFormField>
          <UFormField :label="$t('accounting.category')">
            <USelect
              v-model="newExpense.category"
              :items="[
                'inventory',
                'utilities',
                'payroll',
                'rent',
                'marketing',
                'other',
              ]"
            />
          </UFormField>
          <UFormField :label="$t('accounting.amount')">
            <UInput v-model="newExpense.amount" type="number" />
          </UFormField>
          <UFormField :label="$t('accounting.date')">
            <UInput v-model="newExpense.date" type="date" />
          </UFormField>
          <UFormField :label="$t('accounting.paymentMethod')">
            <USelect
              v-model="newExpense.paymentMethod"
              :items="['cash', 'lightning', 'bank_transfer']"
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showExpenseModal = false">{{
              $t("common.cancel")
            }}</UButton>
            <UButton @click="createExpense">{{ $t("common.save") }}</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Journal Entry Modal -->
    <UModal v-model:open="showJournalModal">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ $t("accounting.createEntry") }}
            </h3>
            <UButton
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="showJournalModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="$t('accounting.date')">
              <UInput v-model="newJournalEntry.date" type="date" />
            </UFormField>
            <UFormField :label="$t('accounting.description')">
              <UInput v-model="newJournalEntry.description" />
            </UFormField>
          </div>

          <div class="space-y-2">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ $t("accounting.journalLines") }}
            </h4>
            <div
              v-for="(line, idx) in newJournalEntry.lines"
              :key="idx"
              class="grid grid-cols-3 gap-2"
            >
              <UInput
                v-model="line.account"
                :placeholder="$t('accounting.account')"
              />
              <UInput
                v-model="line.debit"
                type="number"
                :placeholder="$t('accounting.debit')"
              />
              <UInput
                v-model="line.credit"
                type="number"
                :placeholder="$t('accounting.credit')"
              />
            </div>
            <UButton size="xs" variant="ghost" icon="i-heroicons-plus">
              {{ $t("accounting.addLine") }}
            </UButton>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showJournalModal = false">{{
              $t("common.cancel")
            }}</UButton>
            <UButton @click="createJournalEntry">
              {{ $t("common.save") }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
