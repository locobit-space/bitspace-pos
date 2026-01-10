<script setup lang="ts">
/**
 * 💰 Income Form Modal Component
 * For manual income entries (tips, deposits, refunds, etc.)
 */

interface IncomeCategory {
    value: string;
    label: string;
    icon: string;
}

const props = defineProps<{
    open: boolean;
    saving: boolean;
}>();

const emit = defineEmits<{
    'update:open': [value: boolean];
    'save': [data: {
        amount: number;
        category: string;
        description: string;
        date: string;
        source?: string;
        paymentMethod: string;
        reference?: string;
        notes?: string;
    }];
}>();

const { t } = useI18n();

const isOpen = computed({
    get: () => props.open,
    set: (val) => emit('update:open', val),
});

// Income categories
const INCOME_CATEGORIES: IncomeCategory[] = [
    { value: 'sales', label: 'Sales', icon: 'i-heroicons-shopping-cart' },
    { value: 'tips', label: 'Tips', icon: 'i-heroicons-hand-thumb-up' },
    { value: 'investment', label: 'Investment', icon: 'i-heroicons-chart-bar' },
    { value: 'refund', label: 'Refund Received', icon: 'i-heroicons-arrow-uturn-left' },
    { value: 'deposit', label: 'Deposit', icon: 'i-heroicons-banknotes' },
    { value: 'other', label: 'Other', icon: 'i-heroicons-document' },
];

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'lightning', label: 'Lightning' },
    { value: 'check', label: 'Check' },
];

// Form state
const form = reactive({
    amount: 0,
    category: 'other',
    description: '',
    date: new Date().toISOString().split('T')[0]!,
    source: '',
    paymentMethod: 'cash',
    reference: '',
    notes: '',
});

function resetForm() {
    form.amount = 0;
    form.category = 'other';
    form.description = '';
    form.date = new Date().toISOString().split('T')[0]!;
    form.source = '';
    form.paymentMethod = 'cash';
    form.reference = '';
    form.notes = '';
}

function handleSave() {
    emit('save', {
        amount: form.amount,
        category: form.category,
        description: form.description,
        date: form.date,
        source: form.source || undefined,
        paymentMethod: form.paymentMethod,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
    });
}

// Reset form when modal closes
watch(() => props.open, (open) => {
    if (!open) {
        resetForm();
    }
});
</script>

<template>
    <UModal v-model:open="isOpen">
        <template #header>
            <div class="flex items-center gap-3">
                <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <UIcon name="i-heroicons-arrow-trending-up" class="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 class="font-semibold">{{ t('accounting.income.addIncome') }}</h3>
            </div>
        </template>

        <template #body>
            <div class="space-y-4">
                <UFormField :label="t('accounting.income.amount')" required>
                    <UInput v-model.number="form.amount" type="number" min="0" step="0.01"
                        :placeholder="t('accounting.income.amountPlaceholder')" />
                </UFormField>

                <UFormField :label="t('accounting.income.category')" required>
                    <USelectMenu v-model="form.category"
                        :items="INCOME_CATEGORIES.map(c => ({ value: c.value, label: t(`accounting.income.categories.${c.value}`) }))"
                        value-key="value" label-key="label" class="w-full" />
                </UFormField>

                <UFormField :label="t('accounting.income.description')" required>
                    <UInput v-model="form.description" :placeholder="t('accounting.income.descriptionPlaceholder')"
                        class="w-full" />
                </UFormField>

                <UFormField :label="t('accounting.income.date')" required>
                    <UInput v-model="form.date" type="date" />
                </UFormField>

                <UFormField :label="t('accounting.income.source')">
                    <UInput v-model="form.source" :placeholder="t('accounting.income.sourcePlaceholder')"
                        class="w-full" />
                </UFormField>

                <UFormField :label="t('accounting.income.paymentMethod')">
                    <USelectMenu v-model="form.paymentMethod"
                        :items="PAYMENT_METHODS.map(p => ({ value: p.value, label: t(`accounting.expenses.paymentMethods.${p.value}`) }))"
                        value-key="value" label-key="label" class="w-full" />
                </UFormField>

                <UFormField :label="t('accounting.income.reference')">
                    <UInput v-model="form.reference" :placeholder="t('accounting.income.referencePlaceholder')"
                        class="w-full" />
                </UFormField>

                <UFormField :label="t('accounting.income.notes')">
                    <UTextarea v-model="form.notes" :placeholder="t('accounting.income.notesPlaceholder')" :rows="2"
                        class="w-full" />
                </UFormField>
            </div>
        </template>

        <template #footer>
            <div class="flex justify-end w-full gap-2">
                <UButton variant="ghost" block @click="isOpen = false">
                    {{ t('common.cancel') }}
                </UButton>
                <UButton color="success" block :loading="saving"
                    :disabled="!form.amount || !form.category || !form.description" @click="handleSave">
                    <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1" />
                    {{ t('accounting.income.addIncome') }}
                </UButton>
            </div>
        </template>
    </UModal>
</template>
