<script setup lang="ts">
/**
 * 📊 Accounting Overview Tab
 * Financial KPIs, account balances, and quick stats
 */

interface Props {
  financialOverview: {
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
    accountsReceivable: number;
    accountsPayable: number;
    cashBalance: number;
    lightningBalance: number;
  };
  chartOfAccounts: Array<{
    code: string;
    name: string;
    nameLao?: string;
    type: string;
    balance: number;
  }>;
}

const props = defineProps<Props>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();

// Colors for account types
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    asset: 'text-blue-600 dark:text-blue-400',
    liability: 'text-red-600 dark:text-red-400',
    equity: 'text-purple-600 dark:text-purple-400',
    revenue: 'text-green-600 dark:text-green-400',
    expense: 'text-orange-600 dark:text-orange-400',
  };
  return colors[type] || 'text-gray-600';
}
</script>

<template>
  <div class="space-y-6">
    <!-- Primary KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <CommonStatCard
        icon="i-heroicons-arrow-trending-up"
        icon-color="green"
        :label="t('accounting.revenue')"
        :value="formatCurrency(financialOverview.revenue)"
      />
      <CommonStatCard
        icon="i-heroicons-arrow-trending-down"
        icon-color="red"
        :label="t('accounting.expenses')"
        :value="formatCurrency(financialOverview.expenses)"
      />
      <CommonStatCard
        icon="i-heroicons-chart-bar"
        icon-color="blue"
        :label="t('accounting.profit')"
        :value="formatCurrency(financialOverview.profit)"
      >
        <p class="text-xs text-blue-500 mt-1">
          {{ financialOverview.profitMargin }}% {{ t('accounting.margin') }}
        </p>
      </CommonStatCard>
      <CommonStatCard
        icon="i-heroicons-bolt"
        icon-color="yellow"
        :label="t('accounting.lightningBalance')"
        :value="`${financialOverview.lightningBalance.toLocaleString()} sats`"
      />
    </div>

    <!-- Secondary KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <CommonStatCard
        icon="i-heroicons-arrow-down-tray"
        icon-color="green"
        :label="t('accounting.accountsReceivable')"
        :value="formatCurrency(financialOverview.accountsReceivable)"
      />
      <CommonStatCard
        icon="i-heroicons-arrow-up-tray"
        icon-color="red"
        :label="t('accounting.accountsPayable')"
        :value="formatCurrency(financialOverview.accountsPayable)"
      />
      <CommonStatCard
        icon="i-heroicons-banknotes"
        icon-color="blue"
        :label="t('accounting.cashBalance')"
        :value="formatCurrency(financialOverview.cashBalance)"
      />
    </div>

    <!-- Quick Links -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <NuxtLink to="/accounting/accounts">
        <UCard class="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UIcon name="i-heroicons-rectangle-stack" class="w-5 h-5 text-blue-600" />
            </div>
            <span class="font-medium">{{ t('accounting.chartOfAccounts') }}</span>
          </div>
        </UCard>
      </NuxtLink>
      <NuxtLink to="/accounting/ledger">
        <UCard class="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <UIcon name="i-heroicons-book-open" class="w-5 h-5 text-purple-600" />
            </div>
            <span class="font-medium">{{ t('accounting.ledger.title') }}</span>
          </div>
        </UCard>
      </NuxtLink>
      <NuxtLink to="/accounting/expenses">
        <UCard class="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-red-600" />
            </div>
            <span class="font-medium">{{ t('accounting.expenses.title') }}</span>
          </div>
        </UCard>
      </NuxtLink>
      <NuxtLink to="/invoicing">
        <UCard class="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-green-600" />
            </div>
            <span class="font-medium">{{ t('accounting.invoices') }}</span>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <!-- Chart of Accounts Summary -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ t('accounting.chartOfAccounts') }}</h3>
          <NuxtLink to="/accounting/accounts">
            <UButton size="xs" variant="ghost" icon="i-heroicons-arrow-right">
              {{ t('common.viewAll') }}
            </UButton>
          </NuxtLink>
        </div>
      </template>

      <div v-if="chartOfAccounts.length === 0" class="text-center py-8 text-muted">
        {{ t('accounting.noAccounts') }}
      </div>

      <div v-else class="divide-y max-h-96 overflow-y-auto">
        <div
          v-for="account in chartOfAccounts.slice(0, 10)"
          :key="account.code"
          class="py-2 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <span class="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {{ account.code }}
            </span>
            <span>{{ account.name }}</span>
            <UBadge :class="getTypeColor(account.type)" variant="subtle" size="xs">
              {{ account.type }}
            </UBadge>
          </div>
          <span class="font-mono">{{ formatCurrency(account.balance) }}</span>
        </div>
      </div>
    </UCard>
  </div>
</template>
