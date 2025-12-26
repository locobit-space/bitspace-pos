<script setup lang="ts">
/**
 * 📖 Accounting Journal Tab
 * Journal entries list with expandable lines
 */

interface JournalLine {
  account: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  status: string;
  lines: JournalLine[];
}

const props = defineProps<{
  entries: JournalEntry[];
}>();

const emit = defineEmits<{
  'add': [];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();

const expandedEntries = ref<Set<string>>(new Set());

function toggleEntry(id: string) {
  if (expandedEntries.value.has(id)) {
    expandedEntries.value.delete(id);
  } else {
    expandedEntries.value.add(id);
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

function getTotalDebit(entry: JournalEntry): number {
  return entry.lines.reduce((sum, l) => sum + l.debit, 0);
}

function getTotalCredit(entry: JournalEntry): number {
  return entry.lines.reduce((sum, l) => sum + l.credit, 0);
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ t('accounting.journalEntries') }}</h3>
          <div class="flex gap-2">
            <NuxtLink to="/accounting/ledger">
              <UButton variant="outline" icon="i-heroicons-arrow-top-right-on-square" size="sm">
                {{ t('common.viewAll') }}
              </UButton>
            </NuxtLink>
            <UButton icon="i-heroicons-plus" size="sm" @click="emit('add')">
              {{ t('accounting.createEntry') }}
            </UButton>
          </div>
        </div>
      </template>

      <div v-if="entries.length === 0" class="text-center py-8">
        <UIcon name="i-heroicons-book-open" class="w-12 h-12 text-muted mx-auto mb-3" />
        <p class="text-muted">{{ t('accounting.noEntries') }}</p>
        <UButton variant="outline" class="mt-4" @click="emit('add')">
          {{ t('accounting.createFirstEntry') }}
        </UButton>
      </div>

      <div v-else class="divide-y">
        <div
          v-for="entry in entries.slice(0, 10)"
          :key="entry.id"
          class="py-3"
        >
          <div
            class="flex items-center justify-between cursor-pointer"
            @click="toggleEntry(entry.id)"
          >
            <div class="flex items-center gap-4">
              <UIcon
                :name="expandedEntries.has(entry.id) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                class="w-4 h-4 text-muted"
              />
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {{ entry.id }}
                  </span>
                  <span class="text-sm text-muted">{{ formatDate(entry.date) }}</span>
                </div>
                <p class="text-sm mt-1">{{ entry.description }}</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right text-sm">
                <span class="text-green-600 font-mono">{{ formatCurrency(getTotalDebit(entry)) }}</span>
                <span class="mx-1">/</span>
                <span class="text-red-600 font-mono">{{ formatCurrency(getTotalCredit(entry)) }}</span>
              </div>
              <UBadge :color="entry.status === 'posted' ? 'success' : 'warning'" variant="subtle" size="xs">
                {{ entry.status }}
              </UBadge>
            </div>
          </div>

          <!-- Expanded Lines -->
          <div
            v-if="expandedEntries.has(entry.id)"
            class="ml-8 mt-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3"
          >
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-muted">
                  <th class="pb-2">{{ t('accounting.account') }}</th>
                  <th class="pb-2 text-right">{{ t('accounting.debit') }}</th>
                  <th class="pb-2 text-right">{{ t('accounting.credit') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, idx) in entry.lines" :key="idx">
                  <td class="py-1">{{ line.account }}</td>
                  <td class="py-1 text-right font-mono">
                    <span v-if="line.debit > 0" class="text-green-600">{{ formatCurrency(line.debit) }}</span>
                  </td>
                  <td class="py-1 text-right font-mono">
                    <span v-if="line.credit > 0" class="text-red-600">{{ formatCurrency(line.credit) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
