<!-- pages/inventory/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const { t } = useI18n();
const toast = useToast();

// ============================================
// 📦 INVENTORY PAGE - Connected to Dexie + Nostr
// ============================================

// Permissions
const { canEditInventory, canAdjustStock } = usePermissions();

// Use real inventory store with Nostr sync
const inventory = useInventory();

// Get data from composable
const inventoryItems = computed(() => inventory.inventoryItems.value);
const stockMovements = computed(() => inventory.stockMovements.value);
const suppliers = computed(() => inventory.suppliers.value);
const purchaseOrders = computed(() => inventory.purchaseOrders.value);

// Filters
const searchQuery = ref('');
const selectedBranch = ref('all');
const selectedStatus = ref('all');
const activeTab = ref('inventory');

// Dynamic branches from DB (with "All Branches" option)
const branches = computed(() => [
  { id: 'all', name: t('common.allBranches') || 'All Branches' },
  ...inventory.branches.value.map(b => ({ id: b.id, name: b.name })),
]);

const statusOptions = [
  { value: 'all', label: t('common.all') || 'All' },
  { value: 'in-stock', label: t('inventory.inStock') || 'In Stock' },
  { value: 'low-stock', label: t('inventory.lowStock') || 'Low Stock' },
  { value: 'out-of-stock', label: t('inventory.outOfStock') || 'Out of Stock' },
];

// Computed
const filteredInventory = computed(() => {
  return inventoryItems.value.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesBranch = selectedBranch.value === 'all' || item.branchId === selectedBranch.value;
    const matchesStatus = selectedStatus.value === 'all' || item.status === selectedStatus.value;
    return matchesSearch && matchesBranch && matchesStatus;
  });
});

// Stats from composable
const totalInventoryValue = computed(() => inventory.totalInventoryValue.value);
const lowStockCount = computed(() => inventory.lowStockCount.value);

// Modal states
const showAdjustModal = ref(false);
const showTransferModal = ref(false);
const showAddStockModal = ref(false);
const showSupplierModal = ref(false);
const showPurchaseOrderModal = ref(false);
// Type from composable
type InventoryItem = typeof inventoryItems.value[number];
const selectedItem = ref<InventoryItem | null>(null);
const adjusting = ref(false);
const editingSupplier = ref<typeof suppliers.value[number] | null>(null);

// Adjustment form
const adjustmentForm = ref({
  quantity: 0,
  type: 'adjustment' as 'in' | 'out' | 'adjustment',
  reason: '',
});

// Transfer form
const transferForm = ref({
  quantity: 0,
  toBranch: '',
  notes: '',
});

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('lo-LA', {
    style: 'currency',
    currency: 'LAK',
    minimumFractionDigits: 0,
  }).format(amount);
};

const getStatusColor = (status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' => {
  const colors: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
    'in-stock': 'green',
    'low-stock': 'yellow',
    'out-of-stock': 'red',
    'overstocked': 'blue',
  };
  return colors[status] || 'gray';
};

const openAdjustModal = (item: InventoryItem) => {
  selectedItem.value = item;
  adjustmentForm.value = { quantity: 0, type: 'adjustment', reason: '' };
  showAdjustModal.value = true;
};

const openTransferModal = (item: InventoryItem) => {
  selectedItem.value = item;
  transferForm.value = { quantity: 0, toBranch: '', notes: '' };
  showTransferModal.value = true;
};

const saveAdjustment = async () => {
  if (!selectedItem.value) return;
  
  adjusting.value = true;
  try {
    let adjustment = adjustmentForm.value.quantity;
    let reason: 'purchase' | 'sale' | 'adjustment' | 'waste' | 'return' | 'count' = 'adjustment';
    
    if (adjustmentForm.value.type === 'in') {
      reason = 'purchase';
    } else if (adjustmentForm.value.type === 'out') {
      adjustment = -adjustment;
      reason = 'sale';
    }
    
    const success = await inventory.adjustStock(
      selectedItem.value.productId,
      selectedItem.value.branchId,
      adjustment,
      reason,
      adjustmentForm.value.reason
    );
    
    if (success) {
      toast.add({
        title: t('inventory.stockAdjusted') || 'Stock Adjusted',
        description: `${selectedItem.value.productName} stock updated`,
        icon: 'i-heroicons-check-circle',
        color: 'green',
      });
      showAdjustModal.value = false;
    } else {
      toast.add({
        title: t('common.error') || 'Error',
        description: inventory.error.value || 'Failed to adjust stock',
        icon: 'i-heroicons-exclamation-circle',
        color: 'red',
      });
    }
  } finally {
    adjusting.value = false;
  }
};

const saveTransfer = async () => {
  if (!selectedItem.value) return;
  
  adjusting.value = true;
  try {
    const success = await inventory.transferStock(
      selectedItem.value.productId,
      selectedItem.value.branchId,
      transferForm.value.toBranch,
      transferForm.value.quantity,
      transferForm.value.notes
    );
    
    if (success) {
      toast.add({
        title: t('inventory.stockTransferred') || 'Stock Transferred',
        description: `${transferForm.value.quantity} units transferred`,
        icon: 'i-heroicons-check-circle',
        color: 'green',
      });
      showTransferModal.value = false;
    } else {
      toast.add({
        title: t('common.error') || 'Error',
        description: inventory.error.value || 'Failed to transfer stock',
        icon: 'i-heroicons-exclamation-circle',
        color: 'red',
      });
    }
  } finally {
    adjusting.value = false;
  }
};

// Add Stock form
const addStockForm = ref({
  productId: '',
  branchId: 'main',
  quantity: 0,
  notes: '',
});

const saveAddStock = async () => {
  if (!addStockForm.value.productId || addStockForm.value.quantity <= 0) {
    toast.add({
      title: t('common.error') || 'Error',
      description: t('inventory.selectProductAndQuantity') || 'Please select a product and enter quantity',
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    });
    return;
  }

  adjusting.value = true;
  try {
    const success = await inventory.addStock(
      addStockForm.value.productId,
      addStockForm.value.quantity,
      addStockForm.value.branchId,
      addStockForm.value.notes
    );

    if (success) {
      toast.add({
        title: t('inventory.stockAdded') || 'Stock Added',
        description: `Added ${addStockForm.value.quantity} units`,
        icon: 'i-heroicons-check-circle',
        color: 'green',
      });
      showAddStockModal.value = false;
      addStockForm.value = { productId: '', branchId: 'main', quantity: 0, notes: '' };
    } else {
      toast.add({
        title: t('common.error') || 'Error',
        description: inventory.error.value || 'Failed to add stock',
        icon: 'i-heroicons-exclamation-circle',
        color: 'red',
      });
    }
  } finally {
    adjusting.value = false;
  }
};

// Export inventory
const exportInventory = async () => {
  try {
    const data = await inventory.exportInventory();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.add({
      title: t('common.exported') || 'Exported',
      description: t('inventory.exportSuccess') || 'Inventory data exported successfully',
      icon: 'i-heroicons-check-circle',
      color: 'green',
    });
  } catch {
    toast.add({
      title: t('common.error') || 'Error',
      description: 'Failed to export inventory',
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    });
  }
};

// ============================================
// 👥 SUPPLIER MANAGEMENT
// ============================================

const supplierForm = ref({
  name: '',
  code: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  paymentTerms: '',
  leadTimeDays: 7,
  notes: '',
});

const openSupplierModal = (supplier?: typeof suppliers.value[number]) => {
  if (supplier) {
    editingSupplier.value = supplier;
    supplierForm.value = {
      name: supplier.name,
      code: supplier.code,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      paymentTerms: supplier.paymentTerms || '',
      leadTimeDays: supplier.leadTimeDays || 7,
      notes: supplier.notes || '',
    };
  } else {
    editingSupplier.value = null;
    supplierForm.value = {
      name: '',
      code: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      paymentTerms: '',
      leadTimeDays: 7,
      notes: '',
    };
  }
  showSupplierModal.value = true;
};

const saveSupplier = async () => {
  if (!supplierForm.value.name) {
    toast.add({
      title: t('common.error') || 'Error',
      description: t('inventory.supplierNameRequired') || 'Supplier name is required',
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    });
    return;
  }

  adjusting.value = true;
  try {
    let success = false;
    if (editingSupplier.value) {
      success = await inventory.updateSupplier(editingSupplier.value.id, {
        ...supplierForm.value,
        status: 'active' as const,
        productIds: editingSupplier.value.productIds,
      });
    } else {
      const result = await inventory.addSupplier({
        ...supplierForm.value,
        status: 'active' as const,
        productIds: [],
      });
      success = !!result;
    }

    if (success) {
      toast.add({
        title: editingSupplier.value ? t('inventory.supplierUpdated') : t('inventory.supplierAdded'),
        description: supplierForm.value.name,
        icon: 'i-heroicons-check-circle',
        color: 'green',
      });
      showSupplierModal.value = false;
    } else {
      toast.add({
        title: t('common.error') || 'Error',
        description: inventory.error.value || 'Failed to save supplier',
        icon: 'i-heroicons-exclamation-circle',
        color: 'red',
      });
    }
  } finally {
    adjusting.value = false;
  }
};

const deleteSupplier = async (id: string) => {
  if (!confirm(t('inventory.confirmDeleteSupplier'))) return;
  
  const success = await inventory.deleteSupplier(id);
  if (success) {
    toast.add({
      title: t('inventory.supplierDeleted'),
      icon: 'i-heroicons-check-circle',
      color: 'green',
    });
  }
};

// ============================================
// 📋 PURCHASE ORDER MANAGEMENT
// ============================================

const poForm = ref({
  supplierId: '',
  branchId: 'main',
  items: [] as { productId: string; productName: string; quantity: number; unitPrice: number }[],
  notes: '',
});

const openPurchaseOrderModal = () => {
  poForm.value = {
    supplierId: '',
    branchId: 'main',
    items: [],
    notes: '',
  };
  showPurchaseOrderModal.value = true;
};

const addPOItem = () => {
  poForm.value.items.push({
    productId: '',
    productName: '',
    quantity: 1,
    unitPrice: 0,
  });
};

const removePOItem = (index: number) => {
  poForm.value.items.splice(index, 1);
};

const savePurchaseOrder = async () => {
  if (!poForm.value.supplierId || poForm.value.items.length === 0) {
    toast.add({
      title: t('common.error'),
      description: t('inventory.poRequiredFields'),
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    });
    return;
  }

  adjusting.value = true;
  try {
    const items = poForm.value.items.map(item => ({
      ...item,
      receivedQty: 0,
    }));
    
    const result = await inventory.createPurchaseOrder(
      poForm.value.supplierId,
      poForm.value.branchId,
      items,
      poForm.value.notes
    );

    if (result) {
      toast.add({
        title: t('inventory.poCreated'),
        description: `PO#${result.id}`,
        icon: 'i-heroicons-check-circle',
        color: 'green',
      });
      showPurchaseOrderModal.value = false;
    }
  } finally {
    adjusting.value = false;
  }
};

// Initialize inventory on mount
onMounted(async () => {
  await inventory.init();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      :title="t('inventory.title')"
      :description="t('inventory.description')"
    >
      <template #right>
        <div class="flex gap-2">
          <UButton
            color="gray"
            variant="outline"
            icon="i-heroicons-arrow-down-tray"
            :label="t('common.export')"
            @click="exportInventory"
          />
          <UButton
            v-if="canEditInventory"
            color="primary"
            icon="i-heroicons-plus"
            :label="t('inventory.addStock')"
            @click="showAddStockModal = true"
          />
        </div>
      </template>

      <template #tabs>
        <UTabs
          v-model="activeTab"
          variant="link"
          :items="[
            { label: t('inventory.inventory'), value: 'inventory' },
            { label: t('inventory.movements'), value: 'movements' },
            { label: t('inventory.suppliers'), value: 'suppliers' },
            { label: t('inventory.purchaseOrders'), value: 'purchaseOrders' },
          ]"
        />
      </template>
    </CommonPageHeader>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
      <UCard>
        <div class="flex items-center">
          <div class="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
            <Icon name="i-heroicons-cube" class="w-6 h-6 text-blue-500 dark:text-blue-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('inventory.totalProducts') }}</p>
            <p class="text-2xl font-bold">{{ inventoryItems.length }}</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center">
          <div class="bg-green-100 dark:bg-green-900 p-3 rounded-full">
            <Icon name="i-heroicons-currency-dollar" class="w-6 h-6 text-green-500 dark:text-green-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('inventory.totalValue') }}</p>
            <p class="text-2xl font-bold">{{ formatCurrency(totalInventoryValue) }}</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center">
          <div class="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-full">
            <Icon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-yellow-500 dark:text-yellow-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('inventory.lowStockItems') }}</p>
            <p class="text-2xl font-bold">{{ lowStockCount }}</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center">
          <div class="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
            <Icon name="i-heroicons-truck" class="w-6 h-6 text-purple-500 dark:text-purple-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('inventory.activeSuppliers') }}</p>
            <p class="text-2xl font-bold">{{ suppliers.filter(s => s.status === 'active').length }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Inventory Tab -->
    <template v-if="activeTab === 'inventory'">
      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          :placeholder="t('inventory.searchPlaceholder')"
        />
        <USelect
          v-model="selectedBranch"
          :items="branches"
          value-key="id"
          label-key="name"
        />
        <USelect
          v-model="selectedStatus"
          :items="statusOptions"
          value-key="value"
          label-key="label"
        />
        <UButton
          color="gray"
          variant="ghost"
          icon="i-heroicons-funnel"
          :label="t('common.moreFilters')"
        />
      </div>

      <!-- Inventory Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="text-left py-3 px-4 font-medium">{{ t('products.name') }}</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('products.sku') }}</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('common.branch') }}</th>
              <th class="text-center py-3 px-4 font-medium">{{ t('inventory.currentStock') }}</th>
              <th class="text-center py-3 px-4 font-medium">{{ t('inventory.minMax') }}</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('common.status') }}</th>
              <th class="text-right py-3 px-4 font-medium">{{ t('inventory.value') }}</th>
              <th class="text-right py-3 px-4 font-medium">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredInventory"
              :key="item.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td class="py-3 px-4">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ item.productName }}</p>
                  <p class="text-xs text-gray-500">{{ item.categoryName }}</p>
                </div>
              </td>
              <td class="py-3 px-4">
                <code class="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ item.sku }}</code>
              </td>
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{{ item.branchName }}</td>
              <td class="py-3 px-4 text-center">
                <span
                  class="text-lg font-bold"
                  :class="{
                    'text-red-500': item.status === 'out-of-stock',
                    'text-yellow-500': item.status === 'low-stock',
                    'text-green-500': item.status === 'in-stock',
                  }"
                >
                  {{ item.currentStock }}
                </span>
                <span class="text-xs text-gray-500 ml-1">{{ item.unitSymbol }}</span>
              </td>
              <td class="py-3 px-4 text-center text-sm text-gray-500">
                {{ item.minStock }} / {{ item.maxStock }}
              </td>
              <td class="py-3 px-4">
                <UBadge :color="getStatusColor(item.status)" :label="t(`inventory.${item.status.replace('-', '')}`)" />
              </td>
              <td class="py-3 px-4 text-right font-medium">{{ formatCurrency(item.value) }}</td>
              <td class="py-3 px-4">
                <div class="flex justify-end gap-1">
                  <UButton
                    v-if="canAdjustStock"
                    color="gray"
                    variant="ghost"
                    size="sm"
                    icon="i-heroicons-pencil-square"
                    @click="openAdjustModal(item)"
                  />
                  <UButton
                    v-if="canAdjustStock"
                    color="gray"
                    variant="ghost"
                    size="sm"
                    icon="i-heroicons-arrows-right-left"
                    @click="openTransferModal(item)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Movements Tab -->
    <template v-if="activeTab === 'movements'">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="text-left py-3 px-4 font-medium">{{ t('common.date') }}</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('products.product') }}</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('inventory.movementType') }}</th>
              <th class="text-center py-3 px-4 font-medium">{{ t('inventory.quantity') }}</th>
              <th class="text-center py-3 px-4 font-medium">{{ t('inventory.stockChange') }}</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('inventory.reason') }}</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('common.createdBy') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="movement in stockMovements"
              :key="movement.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {{ new Date(movement.createdAt).toLocaleDateString() }}
              </td>
              <td class="py-3 px-4 font-medium">{{ movement.productName }}</td>
              <td class="py-3 px-4">
                <UBadge
                  :color="movement.type === 'in' ? 'green' : movement.type === 'out' ? 'red' : 'blue'"
                  :label="t(`inventory.${movement.type}`)"
                />
              </td>
              <td class="py-3 px-4 text-center font-bold" :class="movement.type === 'in' ? 'text-green-500' : 'text-red-500'">
                {{ movement.type === 'in' ? '+' : '-' }}{{ movement.quantity }}
              </td>
              <td class="py-3 px-4 text-center text-sm">
                {{ movement.previousStock }} → {{ movement.newStock }}
              </td>
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{{ movement.reason }}</td>
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{{ movement.createdBy }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Suppliers Tab -->
    <template v-if="activeTab === 'suppliers'">
      <div class="px-4 mb-4 flex gap-2">
        <UButton color="primary" icon="i-heroicons-plus" :label="t('inventory.addSupplier')" @click="openSupplierModal()" />
        <UButton color="gray" variant="outline" icon="i-heroicons-arrow-path" :label="t('common.sync')" @click="inventory.syncPendingData()" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
        <UCard v-for="supplier in suppliers" :key="supplier.id">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white">{{ supplier.name }}</h3>
              <p class="text-sm text-gray-500">{{ supplier.contactPerson }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge v-if="!supplier.synced" color="yellow" label="Pending Sync" size="xs" />
              <UBadge :color="supplier.status === 'active' ? 'green' : 'gray'" :label="t(`common.${supplier.status}`)" />
            </div>
          </div>

          <div class="space-y-2 text-sm">
            <div v-if="supplier.email" class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Icon name="i-heroicons-envelope" class="w-4 h-4" />
              {{ supplier.email }}
            </div>
            <div v-if="supplier.phone" class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Icon name="i-heroicons-phone" class="w-4 h-4" />
              {{ supplier.phone }}
            </div>
            <div v-if="supplier.address" class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Icon name="i-heroicons-map-pin" class="w-4 h-4" />
              {{ supplier.address }}
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span class="text-xs text-gray-500">
              {{ t('inventory.lastOrder') }}: {{ supplier.lastOrderDate ? new Date(supplier.lastOrderDate).toLocaleDateString() : '-' }}
            </span>
            <div class="flex gap-1">
              <UButton color="gray" variant="ghost" size="xs" icon="i-heroicons-pencil" @click="openSupplierModal(supplier)" />
              <UButton color="red" variant="ghost" size="xs" icon="i-heroicons-trash" @click="deleteSupplier(supplier.id)" />
              <UButton color="primary" variant="ghost" size="xs" icon="i-heroicons-shopping-cart" @click="openPurchaseOrderModal()" />
            </div>
          </div>
        </UCard>

        <!-- Empty State -->
        <UCard v-if="suppliers.length === 0" class="col-span-full">
          <div class="text-center py-8">
            <Icon name="i-heroicons-user-group" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p class="text-gray-500">{{ t('inventory.noSuppliers') }}</p>
            <UButton color="primary" class="mt-4" @click="openSupplierModal()">
              {{ t('inventory.addFirstSupplier') }}
            </UButton>
          </div>
        </UCard>
      </div>
    </template>

    <!-- Purchase Orders Tab -->
    <template v-if="activeTab === 'purchaseOrders'">
      <div class="px-4 mb-4">
        <UButton color="primary" icon="i-heroicons-plus" :label="t('inventory.createPO')" @click="openPurchaseOrderModal()" />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="text-left py-3 px-4 font-medium">{{ t('inventory.poNumber') }}</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('inventory.supplier') }}</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('common.branch') }}</th>
              <th class="text-center py-3 px-4 font-medium">{{ t('inventory.items') }}</th>
              <th class="text-right py-3 px-4 font-medium">{{ t('common.total') }}</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('common.status') }}</th>
              <th class="text-left py-3 px-4 font-medium">{{ t('common.date') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="po in purchaseOrders"
              :key="po.id"
              class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td class="py-3 px-4">
                <code class="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ po.id }}</code>
              </td>
              <td class="py-3 px-4 font-medium">{{ po.supplierName }}</td>
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{{ po.branchName }}</td>
              <td class="py-3 px-4 text-center">{{ po.items.length }}</td>
              <td class="py-3 px-4 text-right font-medium">{{ formatCurrency(po.total) }}</td>
              <td class="py-3 px-4">
                <UBadge 
                  :color="po.status === 'received' ? 'green' : po.status === 'cancelled' ? 'red' : po.status === 'partial' ? 'yellow' : 'blue'" 
                  :label="t(`inventory.po${po.status.charAt(0).toUpperCase() + po.status.slice(1)}`)" 
                />
              </td>
              <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                {{ new Date(po.createdAt).toLocaleDateString() }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div v-if="purchaseOrders.length === 0" class="text-center py-12">
          <Icon name="i-heroicons-document-text" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p class="text-gray-500">{{ t('inventory.noPurchaseOrders') }}</p>
        </div>
      </div>
    </template>

    <!-- Stock Adjustment Modal -->
    <UModal v-model:open="showAdjustModal">
      <template #content>
        <UCard v-if="selectedItem">
          <template #header>
            <h3 class="text-lg font-medium">{{ t('inventory.adjustStock') }}</h3>
          </template>

          <div class="space-y-4">
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p class="font-medium">{{ selectedItem.productName }}</p>
              <p class="text-sm text-gray-500">{{ t('inventory.currentStock') }}: {{ selectedItem.currentStock }} {{ selectedItem.unitSymbol }}</p>
            </div>

            <UFormField :label="t('inventory.adjustmentType')">
              <USelect
                v-model="adjustmentForm.type"
                :items="[
                  { value: 'in', label: t('inventory.stockIn') },
                  { value: 'out', label: t('inventory.stockOut') },
                  { value: 'adjustment', label: t('inventory.adjustment') },
                ]"
                value-key="value"
                label-key="label"
              />
            </UFormField>

            <UFormField :label="t('inventory.quantity')">
              <UInput v-model.number="adjustmentForm.quantity" type="number" min="0" />
            </UFormField>

            <UFormField :label="t('inventory.reason')">
              <UTextarea v-model="adjustmentForm.reason" :rows="2" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="gray" variant="outline" :label="t('common.cancel')" @click="showAdjustModal = false" />
              <UButton color="primary" :loading="adjusting" :label="t('common.save')" @click="saveAdjustment" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Stock Transfer Modal -->
    <UModal v-model:open="showTransferModal">
      <template #content>
        <UCard v-if="selectedItem">
          <template #header>
            <h3 class="text-lg font-medium">{{ t('inventory.transferStock') }}</h3>
          </template>

          <div class="space-y-4">
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p class="font-medium">{{ selectedItem.productName }}</p>
              <p class="text-sm text-gray-500">{{ t('inventory.from') }}: {{ selectedItem.branchName }}</p>
              <p class="text-sm text-gray-500">{{ t('inventory.available') }}: {{ selectedItem.currentStock }} {{ selectedItem.unitSymbol }}</p>
            </div>

            <UFormField :label="t('inventory.toBranch')">
              <USelect
                v-model="transferForm.toBranch"
                :items="branches.filter(b => b.id && b.id !== selectedItem?.branchId)"
                value-key="id"
                label-key="name"
              />
            </UFormField>

            <UFormField :label="t('inventory.quantity')">
              <UInput v-model.number="transferForm.quantity" type="number" min="0" :max="selectedItem.currentStock" />
            </UFormField>

            <UFormField :label="t('common.notes')">
              <UTextarea v-model="transferForm.notes" :rows="2" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="gray" variant="outline" :label="t('common.cancel')" @click="showTransferModal = false" />
              <UButton color="primary" :loading="adjusting" :label="t('inventory.transfer')" @click="saveTransfer" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Add Stock Modal -->
    <UModal v-model:open="showAddStockModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium">{{ t('inventory.addStock') }}</h3>
          </template>

          <div class="space-y-4">
            <UFormField :label="t('products.product')">
              <USelectMenu
                v-model="addStockForm.productId"
                :items="inventoryItems.map(item => ({ value: item.productId, label: `${item.productName} (${item.sku})`, stock: item.currentStock, unit: item.unitSymbol }))"
                value-key="value"
                :placeholder="t('inventory.selectProduct')"
                searchable
              >
                <template #item="{ item }">
                  <div class="flex items-center justify-between w-full">
                    <span>{{ item.label }}</span>
                    <span class="text-xs text-gray-500">{{ item.stock }} {{ item.unit }}</span>
                  </div>
                </template>
              </USelectMenu>
            </UFormField>

            <UFormField :label="t('common.branch')">
              <USelect
                v-model="addStockForm.branchId"
                :items="branches.filter(b => b.id !== 'all')"
                value-key="id"
                label-key="name"
              />
            </UFormField>

            <UFormField :label="t('inventory.quantity')">
              <UInput v-model.number="addStockForm.quantity" type="number" min="1" :placeholder="t('inventory.enterQuantity')" />
            </UFormField>

            <UFormField :label="t('common.notes')">
              <UTextarea v-model="addStockForm.notes" :rows="2" :placeholder="t('inventory.purchaseNotes')" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="gray" variant="outline" :label="t('common.cancel')" @click="showAddStockModal = false" />
              <UButton 
                color="primary" 
                :loading="adjusting" 
                :disabled="!addStockForm.productId || addStockForm.quantity <= 0"
                :label="t('inventory.addStock')" 
                @click="saveAddStock" 
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Supplier Modal -->
    <UModal v-model:open="showSupplierModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium">
              {{ editingSupplier ? t('inventory.editSupplier') : t('inventory.addSupplier') }}
            </h3>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('inventory.supplierName')" required>
                <UInput v-model="supplierForm.name" :placeholder="t('inventory.enterSupplierName')" />
              </UFormField>
              <UFormField :label="t('inventory.supplierCode')">
                <UInput v-model="supplierForm.code" :placeholder="t('inventory.autoGenerated')" />
              </UFormField>
            </div>

            <UFormField :label="t('inventory.contactPerson')">
              <UInput v-model="supplierForm.contactPerson" :placeholder="t('inventory.enterContactPerson')" />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('common.email')">
                <UInput v-model="supplierForm.email" type="email" />
              </UFormField>
              <UFormField :label="t('common.phone')">
                <UInput v-model="supplierForm.phone" type="tel" />
              </UFormField>
            </div>

            <UFormField :label="t('common.address')">
              <UTextarea v-model="supplierForm.address" :rows="2" />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('inventory.paymentTerms')">
                <UInput v-model="supplierForm.paymentTerms" :placeholder="t('inventory.paymentTermsPlaceholder')" />
              </UFormField>
              <UFormField :label="t('inventory.leadTime')">
                <UInput v-model.number="supplierForm.leadTimeDays" type="number" min="0" />
              </UFormField>
            </div>

            <UFormField :label="t('common.notes')">
              <UTextarea v-model="supplierForm.notes" :rows="2" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="gray" variant="outline" :label="t('common.cancel')" @click="showSupplierModal = false" />
              <UButton 
                color="primary" 
                :loading="adjusting" 
                :disabled="!supplierForm.name"
                :label="t('common.save')" 
                @click="saveSupplier" 
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Purchase Order Modal -->
    <UModal v-model:open="showPurchaseOrderModal" size="lg">
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
                  :items="suppliers.filter(s => s.status === 'active').map(s => ({ value: s.id, label: s.name }))"
                  value-key="value"
                  label-key="label"
                  :placeholder="t('inventory.selectSupplier')"
                />
              </UFormField>
              <UFormField :label="t('common.branch')" required>
                <USelect
                  v-model="poForm.branchId"
                  :items="branches.filter(b => b.id !== 'all')"
                  value-key="id"
                  label-key="name"
                />
              </UFormField>
            </div>

            <!-- PO Items -->
            <div class="border rounded-lg p-4 dark:border-gray-700">
              <div class="flex justify-between items-center mb-4">
                <h4 class="font-medium">{{ t('inventory.items') }}</h4>
                <UButton size="sm" color="primary" variant="ghost" icon="i-heroicons-plus" @click="addPOItem">
                  {{ t('inventory.addItem') }}
                </UButton>
              </div>

              <div v-for="(item, index) in poForm.items" :key="index" class="flex gap-4 items-center mb-2">
                <div class="flex-1">
                  <USelectMenu
                    v-model="item.productId"
                    :items="inventoryItems.map(i => ({ value: i.productId, label: `${i.productName} (${i.sku})` }))"
                    value-key="value"
                    label-key="label"
                    searchable
                    :placeholder="t('inventory.selectProduct')"
                    @update:model-value="(val) => item.productName = inventoryItems.find(i => i.productId === val)?.productName || ''"
                  />
                </div>
                <div class="w-24">
                  <UInput v-model.number="item.quantity" type="number" min="1" placeholder="Qty" />
                </div>
                <div class="w-32">
                  <UInput v-model.number="item.unitPrice" type="number" min="0" placeholder="Price" />
                </div>
                <UButton color="red" variant="ghost" size="sm" icon="i-heroicons-trash" @click="removePOItem(index)" />
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
              <UButton color="gray" variant="outline" :label="t('common.cancel')" @click="showPurchaseOrderModal = false" />
              <UButton 
                color="primary" 
                :loading="adjusting" 
                :disabled="!poForm.supplierId || poForm.items.length === 0"
                :label="t('inventory.createPO')" 
                @click="savePurchaseOrder" 
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
