<!-- pages/inventory/index.vue -->
<script setup lang="ts">
const { t } = useI18n();

// Inventory item interface
interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  branchId: string;
  branchName: string;
  unitId: string;
  unitSymbol: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  lastRestocked: string;
  lastUpdated: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstocked';
  value: number;
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string;
  branchFrom?: string;
  branchTo?: string;
  createdBy: string;
  createdAt: string;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  products: string[];
  lastOrderDate?: string;
  status: 'active' | 'inactive';
}

// Mock data
const inventoryItems = ref<InventoryItem[]>([
  {
    id: '1',
    productId: '1',
    productName: 'ເບຍ Beer Lao',
    sku: 'BL001',
    categoryId: '1',
    categoryName: 'ເຄື່ອງດື່ມ',
    branchId: '1',
    branchName: 'ສາຂາໃຈກາງ',
    unitId: '1',
    unitSymbol: 'btl',
    currentStock: 150,
    minStock: 20,
    maxStock: 300,
    reorderPoint: 50,
    lastRestocked: '2024-01-15',
    lastUpdated: '2024-01-20',
    status: 'in-stock',
    value: 1800000,
  },
  {
    id: '2',
    productId: '2',
    productName: 'ເຂົ້າຈີ່ Grilled Chicken',
    sku: 'GC001',
    categoryId: '2',
    categoryName: 'ອາຫານ',
    branchId: '1',
    branchName: 'ສາຂາໃຈກາງ',
    unitId: '2',
    unitSymbol: 'plt',
    currentStock: 5,
    minStock: 10,
    maxStock: 50,
    reorderPoint: 15,
    lastRestocked: '2024-01-10',
    lastUpdated: '2024-01-20',
    status: 'low-stock',
    value: 125000,
  },
  {
    id: '3',
    productId: '3',
    productName: 'ນ້ຳດື່ມ Water',
    sku: 'WA001',
    categoryId: '1',
    categoryName: 'ເຄື່ອງດື່ມ',
    branchId: '1',
    branchName: 'ສາຂາໃຈກາງ',
    unitId: '1',
    unitSymbol: 'btl',
    currentStock: 0,
    minStock: 50,
    maxStock: 500,
    reorderPoint: 100,
    lastRestocked: '2024-01-05',
    lastUpdated: '2024-01-20',
    status: 'out-of-stock',
    value: 0,
  },
]);

const stockMovements = ref<StockMovement[]>([
  {
    id: '1',
    productId: '1',
    productName: 'ເບຍ Beer Lao',
    type: 'in',
    quantity: 100,
    previousStock: 50,
    newStock: 150,
    reason: 'Purchase Order #PO-001',
    reference: 'PO-001',
    createdBy: 'Admin',
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    productId: '2',
    productName: 'ເຂົ້າຈີ່ Grilled Chicken',
    type: 'out',
    quantity: 10,
    previousStock: 15,
    newStock: 5,
    reason: 'Sales Order #ORD-1078',
    reference: 'ORD-1078',
    createdBy: 'POS System',
    createdAt: '2024-01-20T14:00:00Z',
  },
]);

const suppliers = ref<Supplier[]>([
  {
    id: '1',
    name: 'Lao Brewery Co., Ltd',
    contactPerson: 'Mr. Somphone',
    email: 'sales@laobeer.com',
    phone: '+856 21 812 374',
    address: 'Km 8, Thadeua Road, Vientiane',
    products: ['1'],
    lastOrderDate: '2024-01-15',
    status: 'active',
  },
  {
    id: '2',
    name: 'Fresh Farm Supplies',
    contactPerson: 'Mrs. Khamla',
    email: 'order@freshfarm.la',
    phone: '+856 20 5555 1234',
    address: 'Dongdok, Vientiane',
    products: ['2', '3'],
    lastOrderDate: '2024-01-10',
    status: 'active',
  },
]);

// Filters
const searchQuery = ref('');
const selectedBranch = ref('');
const selectedStatus = ref('');
const activeTab = ref('inventory');

const branches = [
  { id: '', name: t('common.allBranches') },
  { id: '1', name: 'ສາຂາໃຈກາງ / Central Branch' },
  { id: '2', name: 'ສາຂາຫ້ວຍໂຮ້ງ / Huay Hong Branch' },
];

const statusOptions = [
  { value: '', label: t('common.all') },
  { value: 'in-stock', label: t('inventory.inStock') },
  { value: 'low-stock', label: t('inventory.lowStock') },
  { value: 'out-of-stock', label: t('inventory.outOfStock') },
];

// Computed
const filteredInventory = computed(() => {
  return inventoryItems.value.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesBranch = !selectedBranch.value || item.branchId === selectedBranch.value;
    const matchesStatus = !selectedStatus.value || item.status === selectedStatus.value;
    return matchesSearch && matchesBranch && matchesStatus;
  });
});

const totalInventoryValue = computed(() => {
  return inventoryItems.value.reduce((sum, item) => sum + item.value, 0);
});

const lowStockCount = computed(() => {
  return inventoryItems.value.filter((item) => item.status === 'low-stock' || item.status === 'out-of-stock').length;
});

// Modal states
const showAdjustModal = ref(false);
const showTransferModal = ref(false);
const showAddStockModal = ref(false);
const selectedItem = ref<InventoryItem | null>(null);
const adjusting = ref(false);

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

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
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
  adjusting.value = true;
  try {
    // TODO: Save to backend
    await new Promise((resolve) => setTimeout(resolve, 1000));
    showAdjustModal.value = false;
  } finally {
    adjusting.value = false;
  }
};

const saveTransfer = async () => {
  adjusting.value = true;
  try {
    // TODO: Save to backend
    await new Promise((resolve) => setTimeout(resolve, 1000));
    showTransferModal.value = false;
  } finally {
    adjusting.value = false;
  }
};
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
          />
          <UButton
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
          :options="branches"
          value-attribute="id"
          option-attribute="name"
        />
        <USelect
          v-model="selectedStatus"
          :options="statusOptions"
          value-attribute="value"
          option-attribute="label"
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
                    color="gray"
                    variant="ghost"
                    size="sm"
                    icon="i-heroicons-pencil-square"
                    @click="openAdjustModal(item)"
                  />
                  <UButton
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
      <div class="px-4 mb-4">
        <UButton color="primary" icon="i-heroicons-plus" :label="t('inventory.addSupplier')" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
        <UCard v-for="supplier in suppliers" :key="supplier.id">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white">{{ supplier.name }}</h3>
              <p class="text-sm text-gray-500">{{ supplier.contactPerson }}</p>
            </div>
            <UBadge :color="supplier.status === 'active' ? 'green' : 'gray'" :label="t(`common.${supplier.status}`)" />
          </div>

          <div class="space-y-2 text-sm">
            <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Icon name="i-heroicons-envelope" class="w-4 h-4" />
              {{ supplier.email }}
            </div>
            <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Icon name="i-heroicons-phone" class="w-4 h-4" />
              {{ supplier.phone }}
            </div>
            <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Icon name="i-heroicons-map-pin" class="w-4 h-4" />
              {{ supplier.address }}
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span class="text-xs text-gray-500">
              {{ t('inventory.lastOrder') }}: {{ supplier.lastOrderDate || '-' }}
            </span>
            <div class="flex gap-1">
              <UButton color="gray" variant="ghost" size="xs" icon="i-heroicons-pencil" />
              <UButton color="primary" variant="ghost" size="xs" icon="i-heroicons-shopping-cart" />
            </div>
          </div>
        </UCard>
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
                :options="[
                  { value: 'in', label: t('inventory.stockIn') },
                  { value: 'out', label: t('inventory.stockOut') },
                  { value: 'adjustment', label: t('inventory.adjustment') },
                ]"
                value-attribute="value"
                option-attribute="label"
              />
            </UFormField>

            <UFormField :label="t('inventory.quantity')">
              <UInput v-model.number="adjustmentForm.quantity" type="number" min="0" />
            </UFormField>

            <UFormField :label="t('inventory.reason')">
              <UTextarea v-model="adjustmentForm.reason" rows="2" />
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
                :options="branches.filter(b => b.id && b.id !== selectedItem?.branchId)"
                value-attribute="id"
                option-attribute="name"
              />
            </UFormField>

            <UFormField :label="t('inventory.quantity')">
              <UInput v-model.number="transferForm.quantity" type="number" min="0" :max="selectedItem.currentStock" />
            </UFormField>

            <UFormField :label="t('common.notes')">
              <UTextarea v-model="transferForm.notes" rows="2" />
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
  </div>
</template>
