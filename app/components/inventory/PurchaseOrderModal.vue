<!-- components/inventory/PurchaseOrderModal.vue -->
<script setup lang="ts">
interface Branch {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  status: string;
}

interface InventoryItem {
  productId: string;
  productName: string;
  sku: string;
}

export interface POItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface POFormData {
  supplierId: string;
  branchId: string;
  items: POItem[];
  notes: string;
}

interface Props {
  suppliers: Supplier[];
  branches: Branch[];
  inventoryItems: InventoryItem[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const open = defineModel<boolean>('open', { default: false });

const emit = defineEmits<{
  save: [data: POFormData];
}>();

const { t } = useI18n();

const poForm = ref<POFormData>({
  supplierId: '',
  branchId: 'main',
  items: [],
  notes: '',
});

// Reset form when modal opens
watch(open, (isOpen) => {
  if (isOpen) {
    poForm.value = {
      supplierId: '',
      branchId: 'main',
      items: [],
      notes: '',
    };
  }
});

const addItem = () => {
  poForm.value.items.push({
    productId: '',
    productName: '',
    quantity: 1,
    unitPrice: 0,
  });
};

const removeItem = (index: number) => {
  poForm.value.items.splice(index, 1);
};

const handleSave = () => {
  emit('save', { ...poForm.value });
};

const activeSuppliers = computed(() => 
  props.suppliers.filter(s => s.status === 'active').map(s => ({ value: s.id, label: s.name }))
);

const branchOptions = computed(() => 
  props.branches.filter(b => b.id !== 'all')
);

const productOptions = computed(() => 
  props.inventoryItems.map(i => ({ value: i.productId, label: `${i.productName} (${i.sku})` }))
);

const updateProductName = (index: number, productId: string) => {
  const item = props.inventoryItems.find(i => i.productId === productId);
  if (item && poForm.value.items[index]) {
    poForm.value.items[index].productName = item.productName;
  }
};
</script>

<template>
  <UModal v-model:open="open" size="lg">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-medium">{{ t('inventory.createPO') }}</h3>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('inventory.supplier')" required>
              <USelect
                v-model="poForm.supplierId"
                :items="activeSuppliers"
                value-key="value"
                label-key="label"
                :placeholder="t('inventory.selectSupplier')"
              />
            </UFormField>
            <UFormField :label="t('common.branch')" required>
              <USelect
                v-model="poForm.branchId"
                :items="branchOptions"
                value-key="id"
                label-key="name"
              />
            </UFormField>
          </div>

          <!-- PO Items -->
          <div class="border rounded-lg p-4 dark:border-gray-700">
            <div class="flex justify-between items-center mb-4">
              <h4 class="font-medium">{{ t('inventory.items') }}</h4>
              <UButton size="sm" color="primary" variant="ghost" icon="i-heroicons-plus" @click="addItem">
                {{ t('inventory.addItem') }}
              </UButton>
            </div>

            <div v-for="(item, index) in poForm.items" :key="index" class="flex gap-4 items-center mb-2">
              <div class="flex-1">
                <USelectMenu
                  v-model="item.productId"
                  :items="productOptions"
                  value-key="value"
                  label-key="label"
                  searchable
                  :placeholder="t('inventory.selectProduct')"
                  @update:model-value="(val) => updateProductName(index, val as string)"
                />
              </div>
              <div class="w-24">
                <UInput v-model.number="item.quantity" type="number" min="1" placeholder="Qty" />
              </div>
              <div class="w-32">
                <UInput v-model.number="item.unitPrice" type="number" min="0" placeholder="Price" />
              </div>
              <UButton color="red" variant="ghost" size="sm" icon="i-heroicons-trash" @click="removeItem(index)" />
            </div>

            <div v-if="poForm.items.length === 0" class="text-center py-4 text-gray-500">
              {{ t('inventory.noItemsAdded') }}
            </div>
          </div>

          <UFormField :label="t('common.notes')">
            <UTextarea v-model="poForm.notes" :rows="2" />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton 
              color="gray" 
              variant="outline" 
              :label="t('common.cancel')" 
              @click="open = false" 
            />
            <UButton 
              color="primary" 
              :loading="loading" 
              :disabled="!poForm.supplierId || poForm.items.length === 0"
              :label="t('inventory.createPO')" 
              @click="handleSave" 
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
