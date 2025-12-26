<script setup lang="ts">
/**
 * 📊 Accounting Reports Tab
 * Financial report generation and export
 */

const emit = defineEmits<{
  'export': [type: string];
}>();

const { t } = useI18n();

const reports = [
  {
    type: 'income-statement',
    key: 'incomeStatement',
    icon: 'i-heroicons-document-chart-bar',
    color: 'green',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  {
    type: 'balance-sheet',
    key: 'balanceSheet',
    icon: 'i-heroicons-scale',
    color: 'blue',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    type: 'cash-flow',
    key: 'cashFlow',
    icon: 'i-heroicons-banknotes',
    color: 'purple',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    type: 'trial-balance',
    key: 'trialBalance',
    icon: 'i-heroicons-calculator',
    color: 'amber',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    type: 'general-ledger',
    key: 'generalLedger',
    icon: 'i-heroicons-book-open',
    color: 'indigo',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    type: 'tax-report',
    key: 'taxReport',
    icon: 'i-heroicons-receipt-percent',
    color: 'red',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
  },
];
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ t('accounting.reports.title') }}</h3>
          <UBadge variant="subtle" color="info">
            {{ t('accounting.reports.exportAsCSV') }}
          </UBadge>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="report in reports"
          :key="report.type"
          class="hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02]"
          @click="emit('export', report.type)"
        >
          <div class="flex items-center gap-4">
            <div class="p-3 rounded-lg" :class="report.bgColor">
              <UIcon :name="report.icon" class="w-6 h-6" :class="report.iconColor" />
            </div>
            <div>
              <h4 class="font-medium">
                {{ t(`accounting.reports.${report.key}`) }}
              </h4>
              <p class="text-sm text-muted">
                {{ t(`accounting.reports.${report.key}Desc`) }}
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </UCard>

    <!-- Quick Links to Subpages -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <NuxtLink to="/accounting/ledger">
        <UCard class="hover:shadow-lg transition-all cursor-pointer text-center py-4">
          <UIcon name="i-heroicons-document-magnifying-glass" class="w-8 h-8 text-primary mx-auto mb-2" />
          <p class="font-medium">{{ t('accounting.ledger.title') }}</p>
        </UCard>
      </NuxtLink>
      <NuxtLink to="/accounting/accounts">
        <UCard class="hover:shadow-lg transition-all cursor-pointer text-center py-4">
          <UIcon name="i-heroicons-rectangle-stack" class="w-8 h-8 text-primary mx-auto mb-2" />
          <p class="font-medium">{{ t('accounting.accounts.title') }}</p>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>
