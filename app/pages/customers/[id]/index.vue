<script setup lang="ts">
/**
 * 👤 Customer Detail Page
 * Full customer profile with orders, invoices, contracts, loyalty
 */

definePageMeta({
  layout: 'default',
  middleware: ['auth']
})

const { t } = useI18n()
const route = useRoute()
const { formatCurrency } = useCurrency()

const customerId = computed(() => route.params.id as string)

// Active tab
const activeTab = ref<'overview' | 'orders' | 'invoices' | 'contracts' | 'loyalty' | 'activity'>('overview')

// Customer data (mock - replace with API)
const customer = ref({
  id: customerId.value,
  name: 'ທ້າວ ສົມໃຈ ວົງສະຫວັນ',
  email: 'somjai@example.com',
  phone: '+856 20 5555 1234',
  address: 'ບ້ານ ໂພນສະຫວັນ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ',
  nostrPubkey: 'npub1abc123def456...',
  lightningAddress: 'somjai@getalby.com',
  avatarUrl: null as string | null,
  loyaltyTier: 'gold' as 'bronze' | 'silver' | 'gold' | 'platinum',
  loyaltyPoints: 2500,
  totalSpent: 15500000,
  orderCount: 45,
  visitCount: 52,
  avgOrderValue: 344444,
  lastVisit: '2024-01-20',
  joinedAt: '2023-03-15',
  tags: ['VIP', 'Lightning User', 'Regular'],
  notes: 'ລູກຄ້າປະຈຳ, ມັກກາເຟລາເຕ້. ໃຫ້ສ່ວນຫຼຸດ 10% ທຸກຄັ້ງ.',
  preferences: {
    preferredPayment: 'lightning',
    favoriteProducts: ['Latte', 'Croissant'],
    communicationChannel: 'nostr'
  }
})

// Customer orders
const orders = ref([
  { id: 'ORD-2024-001', date: '2024-01-20', total: 450000, status: 'completed', items: 3, paymentMethod: 'lightning' },
  { id: 'ORD-2024-002', date: '2024-01-18', total: 320000, status: 'completed', items: 2, paymentMethod: 'cash' },
  { id: 'ORD-2024-003', date: '2024-01-15', total: 580000, status: 'completed', items: 4, paymentMethod: 'lightning' },
  { id: 'ORD-2024-004', date: '2024-01-10', total: 250000, status: 'completed', items: 2, paymentMethod: 'cash' },
  { id: 'ORD-2024-005', date: '2024-01-05', total: 890000, status: 'completed', items: 6, paymentMethod: 'lightning' },
])

// Customer invoices
const invoices = ref([
  { id: 'INV-2024-001', date: '2024-01-20', amount: 2500000, status: 'paid', dueDate: '2024-02-20', paidDate: '2024-01-25' },
  { id: 'INV-2024-002', date: '2024-01-01', amount: 1800000, status: 'paid', dueDate: '2024-02-01', paidDate: '2024-01-28' },
  { id: 'INV-2023-012', date: '2023-12-15', amount: 3200000, status: 'paid', dueDate: '2024-01-15', paidDate: '2024-01-10' },
])

// Customer contracts
const contracts = ref([
  { id: 'CON-2024-001', title: 'ສັນຍາສະໜອງກາເຟປະຈຳເດືອນ', startDate: '2024-01-01', endDate: '2024-12-31', value: 12000000, status: 'active' },
  { id: 'CON-2023-005', title: 'ສັນຍາຈັດງານລ້ຽງບໍລິສັດ', startDate: '2023-12-01', endDate: '2023-12-31', value: 5000000, status: 'completed' },
])

// Loyalty rewards
const loyaltyRewards = ref([
  { id: 'REW-001', date: '2024-01-20', points: 45, type: 'purchase', orderId: 'ORD-2024-001', description: 'Purchase reward' },
  { id: 'REW-002', date: '2024-01-18', points: 32, type: 'purchase', orderId: 'ORD-2024-002', description: 'Purchase reward' },
  { id: 'REW-003', date: '2024-01-15', points: 100, type: 'bonus', orderId: null, description: 'Gold tier monthly bonus' },
  { id: 'REW-004', date: '2024-01-10', points: -500, type: 'redemption', orderId: 'ORD-2024-004', description: 'Redeemed for discount' },
])

// Activity log
const activityLog = ref([
  { id: 1, date: '2024-01-20 14:30', type: 'order', description: 'Placed order ORD-2024-001', icon: 'i-heroicons-shopping-bag' },
  { id: 2, date: '2024-01-20 14:32', type: 'payment', description: 'Paid via Lightning ⚡', icon: 'i-heroicons-bolt' },
  { id: 3, date: '2024-01-18 10:15', type: 'order', description: 'Placed order ORD-2024-002', icon: 'i-heroicons-shopping-bag' },
  { id: 4, date: '2024-01-15 16:45', type: 'loyalty', description: 'Reached Gold tier 🏆', icon: 'i-heroicons-star' },
  { id: 5, date: '2024-01-10 09:00', type: 'communication', description: 'Received promotional DM via Nostr', icon: 'i-heroicons-chat-bubble-left' },
])

// Edit mode
const isEditing = ref(false)
const editForm = ref({ ...customer.value })

// Modals
const showSendMessageModal = ref(false)
const showRewardModal = ref(false)
const messageForm = ref({ channel: 'nostr', subject: '', content: '' })
const rewardForm = ref({ points: 0, reason: '' })

// Tier colors
const tierColors: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  silver: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  platinum: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
}

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

// Tier thresholds
const tierThresholds = {
  bronze: { min: 0, max: 500 },
  silver: { min: 500, max: 1500 },
  gold: { min: 1500, max: 5000 },
  platinum: { min: 5000, max: Infinity }
}

const nextTierProgress = computed(() => {
  const currentTier = customer.value.loyaltyTier
  const points = customer.value.loyaltyPoints
  const threshold = tierThresholds[currentTier]
  
  if (currentTier === 'platinum') return 100
  
  const nextThreshold = {
    bronze: tierThresholds.silver.min,
    silver: tierThresholds.gold.min,
    gold: tierThresholds.platinum.min,
    platinum: tierThresholds.platinum.min
  }[currentTier]
  
  return Math.min(100, Math.round((points / nextThreshold) * 100))
})

// Actions
const saveCustomer = () => {
  customer.value = { ...editForm.value }
  isEditing.value = false
}

const cancelEdit = () => {
  editForm.value = { ...customer.value }
  isEditing.value = false
}

const sendMessage = () => {
  // TODO: Implement message sending
  console.log('Sending message:', messageForm.value)
  showSendMessageModal.value = false
  messageForm.value = { channel: 'nostr', subject: '', content: '' }
}

const sendReward = () => {
  // TODO: Implement reward sending via Nostr zap
  console.log('Sending reward:', rewardForm.value)
  showRewardModal.value = false
  rewardForm.value = { points: 0, reason: '' }
}

const deleteCustomer = () => {
  if (confirm(t('customers.deleteConfirmation', { name: customer.value.name }))) {
    // TODO: Implement delete
    navigateTo('/customers')
  }
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
          to="/customers"
          :aria-label="t('common.back')"
        />
        <div class="flex items-center gap-4">
          <!-- Avatar -->
          <div class="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <img 
              v-if="customer.avatarUrl" 
              :src="customer.avatarUrl" 
              :alt="customer.name"
              class="w-full h-full rounded-full object-cover"
            />
            <span v-else class="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {{ customer.name.charAt(0) }}
            </span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ customer.name }}</h1>
            <div class="flex items-center gap-2 mt-1">
              <span :class="tierColors[customer.loyaltyTier]" class="px-2 py-0.5 rounded-full text-xs font-medium">
                {{ customer.loyaltyTier.toUpperCase() }}
              </span>
              <span v-for="tag in customer.tags.slice(0, 2)" :key="tag" class="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <UButton 
          v-if="!isEditing"
          icon="i-heroicons-chat-bubble-left" 
          variant="outline"
          @click="showSendMessageModal = true"
        >
          {{ t('customers.sendMessage') || 'Message' }}
        </UButton>
        <UButton 
          v-if="!isEditing"
          icon="i-heroicons-gift" 
          variant="outline"
          color="amber"
          @click="showRewardModal = true"
        >
          {{ t('loyalty.sendReward') }}
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
          <UButton icon="i-heroicons-check" @click="saveCustomer">{{ t('common.save') }}</UButton>
        </template>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('customers.totalSpent') }}</p>
          <p class="text-xl font-bold text-primary-600 dark:text-primary-400">{{ formatCurrency(customer.totalSpent) }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('customers.orders') }}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{{ customer.orderCount }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('loyalty.points') }}</p>
          <p class="text-xl font-bold text-amber-600 dark:text-amber-400">{{ customer.loyaltyPoints.toLocaleString() }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('dashboard.avgOrderValue') }}</p>
          <p class="text-xl font-bold text-gray-900 dark:text-white">{{ formatCurrency(customer.avgOrderValue) }}</p>
        </div>
      </UCard>
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <nav class="flex gap-4 overflow-x-auto">
        <button
          v-for="tab in ['overview', 'orders', 'invoices', 'contracts', 'loyalty', 'activity']"
          :key="tab"
          @click="activeTab = tab as any"
          class="px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
          :class="activeTab === tab 
            ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
        >
          {{ t(`customers.tabs.${tab}`) || tab.charAt(0).toUpperCase() + tab.slice(1) }}
        </button>
      </nav>
    </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Contact Information -->
      <UCard class="lg:col-span-2">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('customers.contactInfo') }}</h3>
        </template>

        <div v-if="!isEditing" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('customers.email') }}</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ customer.email || '-' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('customers.phone') }}</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ customer.phone || '-' }}</p>
            </div>
            <div class="md:col-span-2">
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('customers.address') }}</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ customer.address || '-' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('customers.nostrPubkey') }}</p>
              <p class="font-mono text-sm text-gray-900 dark:text-white truncate">{{ customer.nostrPubkey || '-' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('customers.lightningAddress') }}</p>
              <p class="font-medium text-primary-600 dark:text-primary-400">{{ customer.lightningAddress || '-' }}</p>
            </div>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="t('customers.name')">
              <UInput v-model="editForm.name" />
            </UFormField>
            <UFormField :label="t('customers.email')">
              <UInput v-model="editForm.email" type="email" />
            </UFormField>
            <UFormField :label="t('customers.phone')">
              <UInput v-model="editForm.phone" />
            </UFormField>
            <UFormField :label="t('customers.lightningAddress')">
              <UInput v-model="editForm.lightningAddress" />
            </UFormField>
            <UFormField :label="t('customers.address')" class="md:col-span-2">
              <UTextarea v-model="editForm.address" rows="2" />
            </UFormField>
          </div>
        </div>
      </UCard>

      <!-- Loyalty Progress -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('loyalty.title') }}</h3>
        </template>

        <div class="space-y-4">
          <div class="text-center">
            <div class="w-20 h-20 mx-auto rounded-full flex items-center justify-center" :class="tierColors[customer.loyaltyTier]">
              <UIcon name="i-heroicons-star" class="w-10 h-10" />
            </div>
            <h4 class="mt-2 text-lg font-bold text-gray-900 dark:text-white capitalize">{{ customer.loyaltyTier }}</h4>
            <p class="text-2xl font-bold text-amber-600">{{ customer.loyaltyPoints.toLocaleString() }} {{ t('loyalty.points') }}</p>
          </div>

          <div v-if="customer.loyaltyTier !== 'platinum'">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-gray-500 dark:text-gray-400">Progress to next tier</span>
              <span class="font-medium">{{ nextTierProgress }}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div class="bg-amber-500 h-2 rounded-full transition-all" :style="{ width: `${nextTierProgress}%` }"></div>
            </div>
          </div>

          <div class="text-sm text-gray-500 dark:text-gray-400">
            <p>{{ t('customers.visits') }}: {{ customer.visitCount }}</p>
            <p>{{ t('customers.joinedAt') || 'Joined' }}: {{ customer.joinedAt }}</p>
            <p>{{ t('customers.lastVisit') }}: {{ customer.lastVisit }}</p>
          </div>
        </div>
      </UCard>

      <!-- Notes -->
      <UCard class="lg:col-span-2">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('common.notes') }}</h3>
        </template>

        <div v-if="!isEditing">
          <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ customer.notes || t('customers.noNotes') || 'No notes' }}</p>
        </div>
        <div v-else>
          <UTextarea v-model="editForm.notes" rows="4" />
        </div>
      </UCard>

      <!-- Preferences -->
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('customers.preferences') || 'Preferences' }}</h3>
        </template>

        <div class="space-y-3 text-sm">
          <div>
            <p class="text-gray-500 dark:text-gray-400">Payment Preference</p>
            <p class="font-medium text-gray-900 dark:text-white flex items-center gap-1">
              <UIcon v-if="customer.preferences.preferredPayment === 'lightning'" name="i-heroicons-bolt" class="text-amber-500" />
              {{ customer.preferences.preferredPayment }}
            </p>
          </div>
          <div>
            <p class="text-gray-500 dark:text-gray-400">Favorite Products</p>
            <div class="flex flex-wrap gap-1 mt-1">
              <span v-for="product in customer.preferences.favoriteProducts" :key="product" class="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs">
                {{ product }}
              </span>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Orders Tab -->
    <div v-if="activeTab === 'orders'">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('orders.title') }}</h3>
            <UButton size="sm" icon="i-heroicons-plus" to="/orders/create">{{ t('orders.newOrder') }}</UButton>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th class="pb-3 font-medium">{{ t('orders.id') }}</th>
                <th class="pb-3 font-medium">{{ t('orders.date') }}</th>
                <th class="pb-3 font-medium text-center">{{ t('pos.items') }}</th>
                <th class="pb-3 font-medium text-right">{{ t('orders.total') }}</th>
                <th class="pb-3 font-medium">{{ t('pos.paymentMethod') }}</th>
                <th class="pb-3 font-medium">{{ t('orders.status') }}</th>
                <th class="pb-3 font-medium text-right">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="order in orders" :key="order.id" class="text-sm">
                <td class="py-3 font-medium text-primary-600 dark:text-primary-400">
                  <NuxtLink :to="`/orders/${order.id}`">{{ order.id }}</NuxtLink>
                </td>
                <td class="py-3 text-gray-600 dark:text-gray-400">{{ order.date }}</td>
                <td class="py-3 text-center">{{ order.items }}</td>
                <td class="py-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(order.total) }}</td>
                <td class="py-3">
                  <span class="flex items-center gap-1">
                    <UIcon v-if="order.paymentMethod === 'lightning'" name="i-heroicons-bolt" class="text-amber-500" />
                    {{ order.paymentMethod }}
                  </span>
                </td>
                <td class="py-3">
                  <span :class="statusColors[order.status]" class="px-2 py-0.5 rounded-full text-xs font-medium">
                    {{ order.status }}
                  </span>
                </td>
                <td class="py-3 text-right">
                  <UButton size="xs" variant="ghost" icon="i-heroicons-eye" :to="`/orders/${order.id}`" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <!-- Invoices Tab -->
    <div v-if="activeTab === 'invoices'">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('accounting.tabs.invoices') || 'Invoices' }}</h3>
            <UButton size="sm" icon="i-heroicons-plus">{{ t('accounting.createInvoice') }}</UButton>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th class="pb-3 font-medium">{{ t('accounting.invoiceNumber') }}</th>
                <th class="pb-3 font-medium">{{ t('accounting.date') }}</th>
                <th class="pb-3 font-medium text-right">{{ t('accounting.amount') }}</th>
                <th class="pb-3 font-medium">{{ t('accounting.dueDate') }}</th>
                <th class="pb-3 font-medium">{{ t('accounting.status') }}</th>
                <th class="pb-3 font-medium text-right">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="invoice in invoices" :key="invoice.id" class="text-sm">
                <td class="py-3 font-medium text-primary-600 dark:text-primary-400">{{ invoice.id }}</td>
                <td class="py-3 text-gray-600 dark:text-gray-400">{{ invoice.date }}</td>
                <td class="py-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(invoice.amount) }}</td>
                <td class="py-3 text-gray-600 dark:text-gray-400">{{ invoice.dueDate }}</td>
                <td class="py-3">
                  <span :class="statusColors[invoice.status]" class="px-2 py-0.5 rounded-full text-xs font-medium">
                    {{ invoice.status }}
                  </span>
                </td>
                <td class="py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <UButton size="xs" variant="ghost" icon="i-heroicons-eye" />
                    <UButton size="xs" variant="ghost" icon="i-heroicons-printer" />
                    <UButton v-if="invoice.status !== 'paid'" size="xs" variant="ghost" icon="i-heroicons-bolt" color="amber" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <!-- Contracts Tab -->
    <div v-if="activeTab === 'contracts'">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('customers.contracts') || 'Contracts' }}</h3>
            <UButton size="sm" icon="i-heroicons-plus">{{ t('customers.addContract') || 'Add Contract' }}</UButton>
          </div>
        </template>

        <div class="space-y-4">
          <div v-for="contract in contracts" :key="contract.id" class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-medium text-gray-900 dark:text-white">{{ contract.title }}</h4>
                  <span :class="statusColors[contract.status]" class="px-2 py-0.5 rounded-full text-xs font-medium">
                    {{ contract.status }}
                  </span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ contract.id }}</p>
              </div>
              <div class="text-right">
                <p class="text-lg font-bold text-primary-600 dark:text-primary-400">{{ formatCurrency(contract.value) }}</p>
              </div>
            </div>
            <div class="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{{ t('customers.startDate') || 'Start' }}: {{ contract.startDate }}</span>
              <span>{{ t('customers.endDate') || 'End' }}: {{ contract.endDate }}</span>
            </div>
            <div class="mt-3 flex gap-2">
              <UButton size="xs" variant="outline" icon="i-heroicons-eye">{{ t('common.view') || 'View' }}</UButton>
              <UButton size="xs" variant="outline" icon="i-heroicons-document-arrow-down">{{ t('common.download') || 'Download' }}</UButton>
            </div>
          </div>

          <div v-if="contracts.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            {{ t('customers.noContracts') || 'No contracts yet' }}
          </div>
        </div>
      </UCard>
    </div>

    <!-- Loyalty Tab -->
    <div v-if="activeTab === 'loyalty'">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UCard class="lg:col-span-2">
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('loyalty.rewards') || 'Points History' }}</h3>
          </template>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th class="pb-3 font-medium">{{ t('accounting.date') }}</th>
                  <th class="pb-3 font-medium">{{ t('accounting.description') }}</th>
                  <th class="pb-3 font-medium text-right">{{ t('loyalty.points') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                <tr v-for="reward in loyaltyRewards" :key="reward.id" class="text-sm">
                  <td class="py-3 text-gray-600 dark:text-gray-400">{{ reward.date }}</td>
                  <td class="py-3 text-gray-900 dark:text-white">
                    {{ reward.description }}
                    <NuxtLink v-if="reward.orderId" :to="`/orders/${reward.orderId}`" class="text-primary-600 dark:text-primary-400 ml-1">
                      {{ reward.orderId }}
                    </NuxtLink>
                  </td>
                  <td class="py-3 text-right font-medium" :class="reward.points > 0 ? 'text-green-600' : 'text-red-600'">
                    {{ reward.points > 0 ? '+' : '' }}{{ reward.points }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('loyalty.sendReward') }}</h3>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Send a Lightning zap reward to this customer's wallet.
            </p>
            <UFormField label="Amount (sats)">
              <UInput v-model="rewardForm.points" type="number" placeholder="1000" />
            </UFormField>
            <UFormField label="Reason">
              <USelect v-model="rewardForm.reason" :options="['loyalty_bonus', 'referral', 'promotion', 'birthday']" />
            </UFormField>
            <UButton block icon="i-heroicons-bolt" color="amber" @click="sendReward">
              ⚡ Send Zap Reward
            </UButton>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Activity Tab -->
    <div v-if="activeTab === 'activity'">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('customers.activityLog') || 'Activity Log' }}</h3>
        </template>

        <div class="space-y-4">
          <div v-for="activity in activityLog" :key="activity.id" class="flex items-start gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
            <div class="p-2 rounded-full bg-gray-100 dark:bg-gray-700">
              <UIcon :name="activity.icon" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div class="flex-1">
              <p class="text-gray-900 dark:text-white">{{ activity.description }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ activity.date }}</p>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Danger Zone -->
    <UCard v-if="activeTab === 'overview'" class="border-red-200 dark:border-red-900">
      <template #header>
        <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">{{ t('customers.dangerZone') || 'Danger Zone' }}</h3>
      </template>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium text-gray-900 dark:text-white">{{ t('customers.deleteCustomer') || 'Delete Customer' }}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('customers.deleteWarning') || 'This action cannot be undone.' }}</p>
        </div>
        <UButton color="red" variant="outline" icon="i-heroicons-trash" @click="deleteCustomer">
          {{ t('common.delete') }}
        </UButton>
      </div>
    </UCard>

    <!-- Send Message Modal -->
    <UModal v-model="showSendMessageModal">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('customers.sendMessage') || 'Send Message' }}</h3>
            <UButton variant="ghost" icon="i-heroicons-x-mark" @click="showSendMessageModal = false" />
          </div>
        </template>

        <div class="space-y-4">
          <UFormField :label="t('customers.channel') || 'Channel'">
            <USelect v-model="messageForm.channel" :options="['nostr', 'email', 'sms']" />
          </UFormField>
          <UFormField :label="t('customers.subject') || 'Subject'">
            <UInput v-model="messageForm.subject" />
          </UFormField>
          <UFormField :label="t('customers.message') || 'Message'">
            <UTextarea v-model="messageForm.content" rows="4" />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showSendMessageModal = false">{{ t('common.cancel') }}</UButton>
            <UButton icon="i-heroicons-paper-airplane" @click="sendMessage">{{ t('common.send') || 'Send' }}</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Reward Modal -->
    <UModal v-model="showRewardModal">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('loyalty.sendReward') }}</h3>
            <UButton variant="ghost" icon="i-heroicons-x-mark" @click="showRewardModal = false" />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Send a Lightning zap to <strong>{{ customer.lightningAddress }}</strong>
          </p>
          <UFormField label="Amount (sats)">
            <UInput v-model="rewardForm.points" type="number" placeholder="1000" />
          </UFormField>
          <UFormField label="Reason">
            <UInput v-model="rewardForm.reason" placeholder="Thank you for being a loyal customer!" />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showRewardModal = false">{{ t('common.cancel') }}</UButton>
            <UButton icon="i-heroicons-bolt" color="amber" @click="sendReward">⚡ {{ t('loyalty.sendReward') }}</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
