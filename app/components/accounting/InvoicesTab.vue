<script setup lang="ts">
/**
 * 🧾 Accounting Invoices Tab
 * Invoice list and quick actions
 */

interface Invoice {
  id: string;
  customer: string;
  amount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
}

const props = defineProps<{
  invoices: Invoice[];
}>();

const emit = defineEmits<{
  'add': [];
  'pay-lightning': [id: string];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();

function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'info' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    paid: 'success',
    pending: 'warning',
    overdue: 'error',
    draft: 'info',
  };
  return colors[status] || 'info';
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ t('accounting.invoices') }}</h3>
          <div class="flex gap-2">
            <NuxtLink to="/invoicing">
              <UButton variant="outline" icon="i-heroicons-arrow-top-right-on-square" size="sm">
                {{ t('common.viewAll') }}
              </UButton>
            </NuxtLink>
            <UButton icon="i-heroicons-plus" size="sm" @click="emit('add')">
              {{ t('accounting.createInvoice') }}
            </UButton>
          </div>
        </div>
      </template>

      <div v-if="invoices.length === 0" class="text-center py-8">
        <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-muted mx-auto mb-3" />
        <p class="text-muted">{{ t('accounting.noInvoices') }}</p>
        <UButton variant="outline" class="mt-4" @click="emit('add')">
          {{ t('accounting.createFirstInvoice') }}
        </UButton>
      </div>

      <div v-else class="divide-y">
        <div
          v-for="invoice in invoices.slice(0, 10)"
          :key="invoice.id"
          class="py-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p class="font-medium">{{ invoice.id }}</p>
              <p class="text-sm text-muted">{{ invoice.customer }}</p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="font-mono font-bold">{{ formatCurrency(invoice.amount) }}</p>
              <p class="text-xs text-muted">
                {{ invoice.paidDate ? formatDate(invoice.paidDate) : formatDate(invoice.dueDate) }}
              </p>
            </div>
            <UBadge :color="getStatusColor(invoice.status)" variant="subtle">
              {{ invoice.status }}
            </UBadge>
            <UButton
              v-if="invoice.status !== 'paid'"
              variant="ghost"
              icon="i-heroicons-bolt"
              size="xs"
              color="amber"
              @click="emit('pay-lightning', invoice.id)"
            />
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
