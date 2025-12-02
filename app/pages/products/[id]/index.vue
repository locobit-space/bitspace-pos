<script setup lang="ts">
/**
 * 📦 Product Detail Page
 * Full product management with inventory, pricing, variants
 */

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const { t } = useI18n()
const route = useRoute()
const { formatCurrency } = useCurrency()

const productId = computed(() => route.params.id as string)

// Active tab
const activeTab = ref<'details' | 'inventory' | 'pricing' | 'sales' | 'variants'>('details')

// Edit mode
const isEditing = ref(false)

// Product data (mock - replace with API)
const product = ref({
  id: productId.value,
  name: 'Latte',
  nameLao: 'ລາເຕ້',
  sku: 'LAT-001',
  barcode: '8850001234567',
  description: 'ກາເຟລາເຕ້ ກັບ ນົມສົດຂອງເຮົາ, ເໝາະສຳລັບຕອນເຊົ້າ',
  category: 'Beverages',
  subcategory: 'Coffee',
  brand: 'BitSpace Coffee',
  price: 35000,
  costPrice: 15000,
  priceSats: 82,
  currency: 'LAK' as const,
  taxRate: 10,
  taxIncluded: true,
  unit: 'cup',
  imageUrl: '/images/latte.jpg',
  images: ['/images/latte.jpg', '/images/latte-2.jpg'],
  
  // Inventory
  trackInventory: true,
  stockQuantity: 150,
  lowStockThreshold: 20,
  reorderPoint: 50,
  reorderQuantity: 100,
  
  // Status
  isActive: true,
  isFeatured: true,
  isOnlineAvailable: true,
  isPOSAvailable: true,
  
  // Metadata
  tags: ['coffee', 'hot', 'popular'],
  nostrEventId: 'nevent1abc...',
  createdAt: '2023-06-15',
  updatedAt: '2024-01-20',
})

// Edit form
const editForm = ref({ ...product.value })

// Variants
const variants = ref([
  { id: 'var-001', name: 'Small', nameLao: 'ນ້ອຍ', priceDiff: -5000, sku: 'LAT-001-S', stock: 50, isActive: true },
  { id: 'var-002', name: 'Medium', nameLao: 'ກາງ', priceDiff: 0, sku: 'LAT-001-M', stock: 60, isActive: true },
  { id: 'var-003', name: 'Large', nameLao: 'ໃຫຍ່', priceDiff: 10000, sku: 'LAT-001-L', stock: 40, isActive: true },
])

// Sales data
const salesStats = ref({
  totalSold: 1250,
  totalRevenue: 43750000,
  avgPerDay: 42,
  lastSold: '2024-01-20 15:30',
  bestDay: { date: '2024-01-15', count: 85 },
  trend: 'up' as 'up' | 'down' | 'stable',
  trendPercent: 12,
})

// Recent sales
const recentSales = ref([
  { id: 'ORD-001', date: '2024-01-20 15:30', quantity: 2, variant: 'Medium', total: 70000, customer: 'ທ້າວ ສົມໃຈ' },
  { id: 'ORD-002', date: '2024-01-20 14:45', quantity: 1, variant: 'Large', total: 45000, customer: 'ນາງ ມາລີ' },
  { id: 'ORD-003', date: '2024-01-20 13:20', quantity: 3, variant: 'Small', total: 90000, customer: 'Walk-in' },
])

// Inventory history
const inventoryHistory = ref([
  { id: 1, date: '2024-01-20', type: 'sale', quantity: -5, balance: 150, note: 'Daily sales' },
  { id: 2, date: '2024-01-19', type: 'adjustment', quantity: +10, balance: 155, note: 'Stock correction' },
  { id: 3, date: '2024-01-18', type: 'purchase', quantity: +100, balance: 145, note: 'Supplier restock' },
  { id: 4, date: '2024-01-17', type: 'sale', quantity: -8, balance: 45, note: 'Daily sales' },
])

// Pricing tiers
const pricingTiers = ref([
  { minQty: 1, maxQty: 9, price: 35000, discount: 0 },
  { minQty: 10, maxQty: 24, price: 33000, discount: 6 },
  { minQty: 25, maxQty: 49, price: 31000, discount: 11 },
  { minQty: 50, maxQty: null, price: 29000, discount: 17 },
])

// Categories
const categories = ['Beverages', 'Food', 'Snacks', 'Merchandise']
const units = ['piece', 'cup', 'kg', 'g', 'l', 'ml', 'box', 'pack']

// Computed
const profitMargin = computed(() => {
  return Math.round(((product.value.price - product.value.costPrice) / product.value.price) * 100)
})

const stockStatus = computed(() => {
  const stock = product.value.stockQuantity
  const threshold = product.value.lowStockThreshold
  if (stock <= 0) return { status: 'out_of_stock', color: 'red', label: t('inventory.outOfStock') }
  if (stock <= threshold) return { status: 'low_stock', color: 'yellow', label: t('inventory.lowStock') }
  return { status: 'in_stock', color: 'green', label: t('inventory.inStock') }
})

// Actions
const saveProduct = () => {
  product.value = { ...editForm.value }
  isEditing.value = false
}

const cancelEdit = () => {
  editForm.value = { ...product.value }
  isEditing.value = false
}

const deleteProduct = () => {
  if (confirm(t('products.deleteConfirmation') || 'Are you sure you want to delete this product?')) {
    navigateTo('/products')
  }
}

const duplicateProduct = () => {
  // TODO: Implement duplicate
  console.log('Duplicating product')
}

const adjustStock = () => {
  // TODO: Open stock adjustment modal
  console.log('Adjusting stock')
}

const addVariant = () => {
  // TODO: Open add variant modal
  console.log('Adding variant')
}
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div class="flex items-center gap-4">
        <UButton 
          icon="i-heroicons-arrow-left" 
          variant="ghost" 
          to="/products"
          :aria-label="t('common.back')"
        />
        <div class="flex items-center gap-4">
          <!-- Product Image -->
          <div class="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
            <img 
              v-if="product.imageUrl" 
              :src="product.imageUrl" 
              :alt="product.name"
              class="w-full h-full object-cover"
            >
            <UIcon v-else name="i-heroicons-cube" class="w-8 h-8 text-gray-400" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ product.name }}</h1>
              <span v-if="product.isFeatured" class="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                ⭐ Featured
              </span>
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ product.sku }}</span>
              <span class="text-sm text-gray-400">•</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ product.category }}</span>
              <span :class="`px-2 py-0.5 rounded-full text-xs bg-${stockStatus.color}-100 text-${stockStatus.color}-700 dark:bg-${stockStatus.color}-900/30 dark:text-${stockStatus.color}-400`">
                {{ stockStatus.label }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <UButton 
          v-if="!isEditing"
          icon="i-heroicons-document-duplicate" 
          variant="outline"
          @click="duplicateProduct"
        >
          {{ t('common.duplicate') || 'Duplicate' }}
        </UButton>
        <UButton 
          v-if="!isEditing"
          icon="i-heroicons-pencil" 
          @click="isEditing = true"
        >
          {{ t('common.edit') }}
        </UButton>
        <template v-else>
          <UButton variant="ghost" @click="cancelEdit">{{ t('common.cancel') }}</UButton>
          <UButton icon="i-heroicons-check" @click="saveProduct">{{ t('common.save') }}</UButton>
        </template>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('products.price') }}</p>
          <p class="text-xl font-bold text-primary-600 dark:text-primary-400">{{ formatCurrency(product.price) }}</p>
          <p class="text-xs text-gray-400">⚡ {{ product.priceSats }} sats</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('inventory.stock') }}</p>
          <p class="text-xl font-bold" :class="stockStatus.color === 'green' ? 'text-green-600' : stockStatus.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'">
            {{ product.stockQuantity }}
          </p>
          <p class="text-xs text-gray-400">{{ product.unit }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.sold') || 'Sold' }}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{{ salesStats.totalSold }}</p>
          <p class="text-xs text-gray-400">all time</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('reports.revenue') }}</p>
          <p class="text-xl font-bold text-green-600">{{ formatCurrency(salesStats.totalRevenue) }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('products.margin') || 'Margin' }}</p>
          <p class="text-xl font-bold text-blue-600">{{ profitMargin }}%</p>
        </div>
      </UCard>
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <nav class="flex gap-4 overflow-x-auto">
        <button
          v-for="tab in ['details', 'inventory', 'pricing', 'sales', 'variants']"
          :key="tab"
          class="px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
          :class="activeTab === tab 
            ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
          @click="activeTab = tab as any"
        >
          {{ t(`products.tabs.${tab}`) || tab.charAt(0).toUpperCase() + tab.slice(1) }}
        </button>
      </nav>
    </div>

    <!-- Details Tab -->
    <div v-if="activeTab === 'details'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Info -->
      <UCard class="lg:col-span-2">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('products.details') || 'Product Details' }}</h3>
        </template>

        <div v-if="!isEditing" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('products.name') }}</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ product.name }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('products.nameLao') || 'Name (Lao)' }}</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ product.nameLao }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('products.sku') }}</p>
              <p class="font-mono text-gray-900 dark:text-white">{{ product.sku }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('products.barcode') }}</p>
              <p class="font-mono text-gray-900 dark:text-white">{{ product.barcode || '-' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('products.category') }}</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ product.category }} / {{ product.subcategory }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('products.brand') || 'Brand' }}</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ product.brand }}</p>
            </div>
            <div class="md:col-span-2">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('products.description') }}</p>
              <p class="text-gray-900 dark:text-white">{{ product.description }}</p>
            </div>
          </div>

          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">{{ t('products.tags') || 'Tags' }}</p>
            <div class="flex flex-wrap gap-2">
              <span v-for="tag in product.tags" :key="tag" class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                {{ tag }}
              </span>
            </div>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="t('products.name')">
              <UInput v-model="editForm.name" />
            </UFormField>
            <UFormField :label="t('products.nameLao') || 'Name (Lao)'">
              <UInput v-model="editForm.nameLao" />
            </UFormField>
            <UFormField :label="t('products.sku')">
              <UInput v-model="editForm.sku" />
            </UFormField>
            <UFormField :label="t('products.barcode')">
              <UInput v-model="editForm.barcode" />
            </UFormField>
            <UFormField :label="t('products.category')">
              <USelect v-model="editForm.category" :items="categories" />
            </UFormField>
            <UFormField :label="t('products.unit') || 'Unit'">
              <USelect v-model="editForm.unit" :items="units" />
            </UFormField>
            <UFormField :label="t('products.description')" class="md:col-span-2">
              <UTextarea v-model="editForm.description" :rows="3" />
            </UFormField>
          </div>
        </div>
      </UCard>

      <!-- Status & Settings -->
      <div class="space-y-4">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('products.status') || 'Status' }}</h3>
          </template>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-gray-700 dark:text-gray-300">{{ t('products.active') || 'Active' }}</span>
              <UToggle v-if="isEditing" v-model="editForm.isActive" />
              <UToggle v-else :model-value="product.isActive" disabled />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-700 dark:text-gray-300">{{ t('products.featured') || 'Featured' }}</span>
              <UToggle v-if="isEditing" v-model="editForm.isFeatured" />
              <UToggle v-else :model-value="product.isFeatured" disabled />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-700 dark:text-gray-300">{{ t('products.availablePOS') || 'POS' }}</span>
              <UToggle v-if="isEditing" v-model="editForm.isPOSAvailable" />
              <UToggle v-else :model-value="product.isPOSAvailable" disabled />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-700 dark:text-gray-300">{{ t('products.availableOnline') || 'Online' }}</span>
              <UToggle v-if="isEditing" v-model="editForm.isOnlineAvailable" />
              <UToggle v-else :model-value="product.isOnlineAvailable" disabled />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('products.images') || 'Images' }}</h3>
          </template>

          <div class="grid grid-cols-3 gap-2">
            <div v-for="(img, idx) in product.images" :key="idx" class="aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <img :src="img" :alt="`${product.name} ${idx + 1}`" class="w-full h-full object-cover">
            </div>
            <div v-if="isEditing" class="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary-500">
              <UIcon name="i-heroicons-plus" class="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('common.metadata') || 'Metadata' }}</h3>
          </template>

          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">{{ t('common.created') || 'Created' }}</span>
              <span class="text-gray-900 dark:text-white">{{ product.createdAt }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">{{ t('common.updated') || 'Updated' }}</span>
              <span class="text-gray-900 dark:text-white">{{ product.updatedAt }}</span>
            </div>
            <div v-if="product.nostrEventId" class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">Nostr Event</span>
              <span class="font-mono text-xs text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{{ product.nostrEventId }}</span>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Inventory Tab -->
    <div v-if="activeTab === 'inventory'" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UCard class="lg:col-span-2">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('inventory.history') || 'Inventory History' }}</h3>
              <UButton size="sm" icon="i-heroicons-plus" @click="adjustStock">{{ t('inventory.adjustStock') }}</UButton>
            </div>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th class="pb-3 font-medium">{{ t('accounting.date') }}</th>
                  <th class="pb-3 font-medium">{{ t('inventory.type') || 'Type' }}</th>
                  <th class="pb-3 font-medium text-right">{{ t('inventory.quantity') }}</th>
                  <th class="pb-3 font-medium text-right">{{ t('inventory.balance') || 'Balance' }}</th>
                  <th class="pb-3 font-medium">{{ t('common.notes') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="entry in inventoryHistory" :key="entry.id" class="text-sm">
                  <td class="py-3 text-gray-600 dark:text-gray-400">{{ entry.date }}</td>
                  <td class="py-3">
                    <span class="px-2 py-0.5 rounded text-xs capitalize" :class="entry.type === 'purchase' ? 'bg-green-100 text-green-700' : entry.type === 'sale' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'">
                      {{ entry.type }}
                    </span>
                  </td>
                  <td class="py-3 text-right font-medium" :class="entry.quantity > 0 ? 'text-green-600' : 'text-red-600'">
                    {{ entry.quantity > 0 ? '+' : '' }}{{ entry.quantity }}
                  </td>
                  <td class="py-3 text-right font-medium text-gray-900 dark:text-white">{{ entry.balance }}</td>
                  <td class="py-3 text-gray-600 dark:text-gray-400">{{ entry.note }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('inventory.settings') || 'Settings' }}</h3>
          </template>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-gray-700 dark:text-gray-300">{{ t('inventory.trackInventory') || 'Track Inventory' }}</span>
              <UToggle v-model="product.trackInventory" />
            </div>
            <UFormField :label="t('inventory.lowStockThreshold') || 'Low Stock Alert'">
              <UInput v-model="product.lowStockThreshold" type="number" />
            </UFormField>
            <UFormField :label="t('inventory.reorderPoint') || 'Reorder Point'">
              <UInput v-model="product.reorderPoint" type="number" />
            </UFormField>
            <UFormField :label="t('inventory.reorderQuantity') || 'Reorder Quantity'">
              <UInput v-model="product.reorderQuantity" type="number" />
            </UFormField>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Pricing Tab -->
    <div v-if="activeTab === 'pricing'" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('products.pricing') || 'Pricing' }}</h3>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('products.price')">
                <UInput v-model="product.price" type="number" />
              </UFormField>
              <UFormField :label="t('products.costPrice') || 'Cost Price'">
                <UInput v-model="product.costPrice" type="number" />
              </UFormField>
            </div>
            
            <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">{{ t('products.profit') || 'Profit' }}</span>
                <span class="text-lg font-bold text-green-600">{{ formatCurrency(product.price - product.costPrice) }} ({{ profitMargin }}%)</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('products.taxRate') || 'Tax Rate (%)'">
                <UInput v-model="product.taxRate" type="number" />
              </UFormField>
              <UFormField :label="t('products.taxIncluded') || 'Tax Included'">
                <UToggle v-model="product.taxIncluded" />
              </UFormField>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('products.pricingTiers') || 'Volume Pricing' }}</h3>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th class="pb-3 font-medium">{{ t('products.quantity') || 'Quantity' }}</th>
                  <th class="pb-3 font-medium text-right">{{ t('products.price') }}</th>
                  <th class="pb-3 font-medium text-right">{{ t('orders.discount') || 'Discount' }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="tier in pricingTiers" :key="tier.minQty" class="text-sm">
                  <td class="py-3 text-gray-900 dark:text-white">
                    {{ tier.minQty }} - {{ tier.maxQty || '∞' }}
                  </td>
                  <td class="py-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(tier.price) }}</td>
                  <td class="py-3 text-right text-green-600">{{ tier.discount }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Sales Tab -->
    <div v-if="activeTab === 'sales'">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('reports.salesHistory') || 'Sales History' }}</h3>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th class="pb-3 font-medium">{{ t('orders.id') }}</th>
                <th class="pb-3 font-medium">{{ t('orders.date') }}</th>
                <th class="pb-3 font-medium">{{ t('products.variant') || 'Variant' }}</th>
                <th class="pb-3 font-medium text-center">{{ t('inventory.quantity') }}</th>
                <th class="pb-3 font-medium text-right">{{ t('orders.total') }}</th>
                <th class="pb-3 font-medium">{{ t('orders.customer') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="sale in recentSales" :key="sale.id" class="text-sm">
                <td class="py-3">
                  <NuxtLink :to="`/orders/${sale.id}`" class="font-medium text-primary-600 dark:text-primary-400">
                    {{ sale.id }}
                  </NuxtLink>
                </td>
                <td class="py-3 text-gray-600 dark:text-gray-400">{{ sale.date }}</td>
                <td class="py-3 text-gray-900 dark:text-white">{{ sale.variant }}</td>
                <td class="py-3 text-center text-gray-900 dark:text-white">{{ sale.quantity }}</td>
                <td class="py-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(sale.total) }}</td>
                <td class="py-3 text-gray-600 dark:text-gray-400">{{ sale.customer }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <!-- Variants Tab -->
    <div v-if="activeTab === 'variants'">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('products.variants') || 'Variants' }}</h3>
            <UButton size="sm" icon="i-heroicons-plus" @click="addVariant">{{ t('products.addVariant') || 'Add Variant' }}</UButton>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th class="pb-3 font-medium">{{ t('products.name') }}</th>
                <th class="pb-3 font-medium">{{ t('products.sku') }}</th>
                <th class="pb-3 font-medium text-right">{{ t('products.priceDiff') || 'Price Diff' }}</th>
                <th class="pb-3 font-medium text-right">{{ t('products.finalPrice') || 'Final Price' }}</th>
                <th class="pb-3 font-medium text-center">{{ t('inventory.stock') }}</th>
                <th class="pb-3 font-medium">{{ t('products.status') || 'Status' }}</th>
                <th class="pb-3 font-medium text-right">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="variant in variants" :key="variant.id" class="text-sm">
                <td class="py-3">
                  <p class="font-medium text-gray-900 dark:text-white">{{ variant.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ variant.nameLao }}</p>
                </td>
                <td class="py-3 font-mono text-gray-600 dark:text-gray-400">{{ variant.sku }}</td>
                <td class="py-3 text-right" :class="variant.priceDiff > 0 ? 'text-red-600' : variant.priceDiff < 0 ? 'text-green-600' : 'text-gray-600'">
                  {{ variant.priceDiff > 0 ? '+' : '' }}{{ formatCurrency(variant.priceDiff) }}
                </td>
                <td class="py-3 text-right font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency(product.price + variant.priceDiff) }}
                </td>
                <td class="py-3 text-center text-gray-900 dark:text-white">{{ variant.stock }}</td>
                <td class="py-3">
                  <span :class="variant.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'" class="px-2 py-0.5 rounded text-xs">
                    {{ variant.isActive ? t('products.active') || 'Active' : t('products.inactive') || 'Inactive' }}
                  </span>
                </td>
                <td class="py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <UButton size="xs" variant="ghost" icon="i-heroicons-pencil" />
                    <UButton size="xs" variant="ghost" icon="i-heroicons-trash" color="red" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <!-- Danger Zone -->
    <UCard v-if="activeTab === 'details'" class="border-red-200 dark:border-red-900">
      <template #header>
        <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">{{ t('customers.dangerZone') || 'Danger Zone' }}</h3>
      </template>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-gray-900 dark:text-white">{{ t('products.deleteProduct') || 'Delete Product' }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('products.deleteWarning') || 'This action cannot be undone.' }}</p>
        </div>
        <UButton color="red" variant="outline" icon="i-heroicons-trash" @click="deleteProduct">
          {{ t('common.delete') }}
        </UButton>
      </div>
    </UCard>
  </div>
</template>
