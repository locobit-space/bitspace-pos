<template>
  <UContainer>
    <CommonPageHeader :title="$t('settings.auditLog.title')" :description="$t('settings.auditLog.description')" />

    <!-- Filters -->
    <UCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UFormField :label="$t('settings.auditLog.filterByAction')">
          <USelect v-model="filters.action" :items="actionTypes" value-key="value" label-key="label"
            :placeholder="$t('common.all')" />
        </UFormField>

        <UFormField :label="$t('settings.auditLog.filterByUser')">
          <USelect v-model="filters.userId" :items="userOptions" value-key="value" label-key="label"
            :placeholder="$t('common.all')" />
        </UFormField>

        <UFormField :label="$t('settings.auditLog.startDate')">
          <UInput v-model="filters.startDate" type="date" />
        </UFormField>

        <UFormField :label="$t('settings.auditLog.endDate')">
          <UInput v-model="filters.endDate" type="date" />
        </UFormField>
      </div>

      <div class="flex justify-between items-center mt-4">
        <UButton variant="ghost" icon="i-heroicons-arrow-path" @click="resetFilters">
          {{ $t('settings.auditLog.resetFilters') }}
        </UButton>

        <UButton icon="i-heroicons-arrow-down-tray" @click="exportLogs">
          {{ $t('settings.auditLog.exportLogs') }}
        </UButton>
      </div>
    </UCard>

    <!-- Statistics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary">{{ stats.totalActions }}</p>
          <p class="text-sm text-muted">{{ $t('settings.auditLog.totalActions') }}</p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-blue-600">{{ stats.todayActions }}</p>
          <p class="text-sm text-muted">{{ $t('settings.auditLog.todayActions') }}</p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-orange-600">{{ stats.securityEvents }}</p>
          <p class="text-sm text-muted">{{ $t('settings.auditLog.securityEvents') }}</p>
        </div>
      </UCard>

      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-green-600">{{ stats.activeUsers }}</p>
          <p class="text-sm text-muted">{{ $t('settings.auditLog.activeUsers') }}</p>
        </div>
      </UCard>
    </div>

    <!-- Audit Log Table -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ $t('settings.auditLog.activityLog') }}</h3>
          <UInput v-model="searchQuery" :placeholder="$t('settings.auditLog.searchPlaceholder')"
            icon="i-heroicons-magnifying-glass" class="w-64" />
        </div>
      </template>

      <UTable :data="paginatedLogs" :columns="columns" :loading="loading">
        <template #action-cell="{ row }">
          <UBadge :color="getActionColor(row.original.action)" variant="subtle">
            <UIcon :name="getActionIcon(row.original.action)" class="mr-1" />
            {{ $t(`settings.auditLog.actions.${row.original.action}`) }}
          </UBadge>
        </template>

        <template #user-cell="{ row }">
          <div class="flex items-center gap-2">
            <UAvatar :alt="row.original.userName" size="xs" />
            <span>{{ row.original.userName }}</span>
          </div>
        </template>

        <template #timestamp-cell="{ row }">
          <div>
            <p class="font-medium">{{ formatDate(row.original.timestamp) }}</p>
            <p class="text-sm text-muted">{{ formatTime(row.original.timestamp) }}</p>
          </div>
        </template>

        <template #details-cell="{ row }">
          <div class="max-w-md truncate">
            {{ row.original.details }}
          </div>
        </template>

        <template #ip-cell="{ row }">
          <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {{ row.original.ipAddress || 'N/A' }}
          </code>
        </template>

        <template #actions-cell="{ row }">
          <UButton variant="ghost" icon="i-heroicons-eye" size="xs" @click="viewDetails(row.original)" />
        </template>
      </UTable>

      <!-- Pagination -->
      <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p class="text-sm text-muted">
          {{ $t('settings.auditLog.showing', { from: pagination.from, to: pagination.to, total: pagination.total }) }}
        </p>
        <UPagination v-model:page="pagination.page" :items-per-page="pagination.perPage" :total="pagination.total" />
      </div>
    </UCard>

    <!-- Detail Modal -->
    <UModal v-model:open="showDetailModal">
      <template #header>
        <h3 class="font-semibold">{{ $t('settings.auditLog.logDetails') }}</h3>
      </template>

      <div v-if="selectedLog" class="p-4 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-muted">{{ $t('settings.auditLog.action') }}</p>
            <UBadge :color="getActionColor(selectedLog.action)" variant="subtle">
              {{ $t(`settings.auditLog.actions.${selectedLog.action}`) }}
            </UBadge>
          </div>

          <div>
            <p class="text-sm text-muted">{{ $t('settings.auditLog.user') }}</p>
            <p class="font-medium">{{ selectedLog.userName }}</p>
          </div>

          <div>
            <p class="text-sm text-muted">{{ $t('settings.auditLog.timestamp') }}</p>
            <p class="font-medium">{{ formatDateTime(selectedLog.timestamp) }}</p>
          </div>

          <div>
            <p class="text-sm text-muted">{{ $t('settings.auditLog.ipAddress') }}</p>
            <code class="text-sm">{{ selectedLog.ipAddress || 'N/A' }}</code>
          </div>
        </div>

        <div>
          <p class="text-sm text-muted mb-2">{{ $t('settings.auditLog.details') }}</p>
          <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <p>{{ selectedLog.details }}</p>
          </div>
        </div>

        <div v-if="selectedLog.metadata">
          <p class="text-sm text-muted mb-2">{{ $t('settings.auditLog.metadata') }}</p>
          <pre class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-xs overflow-auto">{{
            JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
        </div>

        <div v-if="selectedLog.resourceType">
          <p class="text-sm text-muted mb-2">{{ $t('settings.auditLog.affectedResource') }}</p>
          <div class="flex items-center gap-2">
            <UBadge variant="outline">{{ selectedLog.resourceType }}</UBadge>
            <code class="text-sm">{{ selectedLog.resourceId }}</code>
          </div>
        </div>
      </div>

      <template #footer>
        <UButton variant="ghost" @click="showDetailModal = false">
          {{ $t('common.close') }}
        </UButton>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'permission']
})

const { t } = useI18n()

interface AuditLog {
  id: string
  action: string
  userId: string
  userName: string
  timestamp: Date
  details: string
  ipAddress?: string
  userAgent?: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
}

// State
const loading = ref(false)
const searchQuery = ref('')
const showDetailModal = ref(false)
const selectedLog = ref<AuditLog | null>(null)

const filters = reactive({
  action: null as string | null,
  userId: null as string | null,
  startDate: '',
  endDate: ''
})

const pagination = reactive({
  page: 1,
  perPage: 20,
  total: 0,
  from: 1,
  to: 20
})

// Mock audit logs data
const auditLogs = ref<AuditLog[]>([
  {
    id: '1',
    action: 'login',
    userId: 'user-1',
    userName: 'Admin User',
    timestamp: new Date(),
    details: 'User logged in successfully',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...'
  },
  {
    id: '2',
    action: 'order_create',
    userId: 'user-2',
    userName: 'Cashier 1',
    timestamp: new Date(Date.now() - 3600000),
    details: 'Created order #ORD-001 for ₭150,000',
    ipAddress: '192.168.1.101',
    resourceType: 'order',
    resourceId: 'ORD-001',
    metadata: { amount: 150000, items: 3 }
  },
  {
    id: '3',
    action: 'product_update',
    userId: 'user-1',
    userName: 'Admin User',
    timestamp: new Date(Date.now() - 7200000),
    details: 'Updated price for "Coffee Latte" from ₭25,000 to ₭28,000',
    ipAddress: '192.168.1.100',
    resourceType: 'product',
    resourceId: 'prod-123',
    metadata: { oldPrice: 25000, newPrice: 28000 }
  },
  {
    id: '4',
    action: 'refund',
    userId: 'user-1',
    userName: 'Admin User',
    timestamp: new Date(Date.now() - 10800000),
    details: 'Processed refund for order #ORD-098, amount ₭50,000',
    ipAddress: '192.168.1.100',
    resourceType: 'order',
    resourceId: 'ORD-098',
    metadata: { refundAmount: 50000, reason: 'Customer request' }
  },
  {
    id: '5',
    action: 'shift_open',
    userId: 'user-2',
    userName: 'Cashier 1',
    timestamp: new Date(Date.now() - 14400000),
    details: 'Opened shift with opening balance ₭500,000',
    ipAddress: '192.168.1.101',
    resourceType: 'shift',
    resourceId: 'shift-001',
    metadata: { openingBalance: 500000 }
  },
  {
    id: '6',
    action: 'settings_change',
    userId: 'user-1',
    userName: 'Admin User',
    timestamp: new Date(Date.now() - 18000000),
    details: 'Changed tax rate from 10% to 7%',
    ipAddress: '192.168.1.100',
    resourceType: 'settings',
    resourceId: 'tax-config',
    metadata: { oldValue: 10, newValue: 7, setting: 'taxRate' }
  },
  {
    id: '7',
    action: 'user_create',
    userId: 'user-1',
    userName: 'Admin User',
    timestamp: new Date(Date.now() - 21600000),
    details: 'Created new user account "Cashier 2" with role "cashier"',
    ipAddress: '192.168.1.100',
    resourceType: 'user',
    resourceId: 'user-3',
    metadata: { role: 'cashier', email: 'cashier2@example.com' }
  },
  {
    id: '8',
    action: 'logout',
    userId: 'user-2',
    userName: 'Cashier 1',
    timestamp: new Date(Date.now() - 25200000),
    details: 'User logged out',
    ipAddress: '192.168.1.101'
  },
  {
    id: '9',
    action: 'inventory_adjust',
    userId: 'user-1',
    userName: 'Admin User',
    timestamp: new Date(Date.now() - 28800000),
    details: 'Adjusted inventory for "Coffee Beans": +10 units',
    ipAddress: '192.168.1.100',
    resourceType: 'inventory',
    resourceId: 'inv-456',
    metadata: { product: 'Coffee Beans', adjustment: 10, reason: 'Stock received' }
  },
  {
    id: '10',
    action: 'login_failed',
    userId: 'unknown',
    userName: 'Unknown',
    timestamp: new Date(Date.now() - 32400000),
    details: 'Failed login attempt for user "admin" - incorrect password',
    ipAddress: '192.168.1.200',
    metadata: { attemptedUser: 'admin', failReason: 'incorrect_password' }
  }
])

// Computed
const actionTypes = computed(() => [
  { value: null, label: t('common.all') },
  { value: 'login', label: t('settings.auditLog.actions.login') },
  { value: 'logout', label: t('settings.auditLog.actions.logout') },
  { value: 'login_failed', label: t('settings.auditLog.actions.login_failed') },
  { value: 'order_create', label: t('settings.auditLog.actions.order_create') },
  { value: 'order_update', label: t('settings.auditLog.actions.order_update') },
  { value: 'refund', label: t('settings.auditLog.actions.refund') },
  { value: 'product_create', label: t('settings.auditLog.actions.product_create') },
  { value: 'product_update', label: t('settings.auditLog.actions.product_update') },
  { value: 'product_delete', label: t('settings.auditLog.actions.product_delete') },
  { value: 'user_create', label: t('settings.auditLog.actions.user_create') },
  { value: 'user_update', label: t('settings.auditLog.actions.user_update') },
  { value: 'settings_change', label: t('settings.auditLog.actions.settings_change') },
  { value: 'shift_open', label: t('settings.auditLog.actions.shift_open') },
  { value: 'shift_close', label: t('settings.auditLog.actions.shift_close') },
  { value: 'inventory_adjust', label: t('settings.auditLog.actions.inventory_adjust') }
])

const userOptions = computed(() => {
  const users = [...new Set(auditLogs.value.map(log => log.userId))]
  return [
    { value: null, label: t('common.all') },
    ...users.map(userId => {
      const log = auditLogs.value.find(l => l.userId === userId)
      return { value: userId, label: log?.userName || userId }
    })
  ]
})

const stats = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const securityActions = ['login', 'logout', 'login_failed', 'settings_change', 'user_create', 'user_update']

  return {
    totalActions: auditLogs.value.length,
    todayActions: auditLogs.value.filter(log => new Date(log.timestamp) >= today).length,
    securityEvents: auditLogs.value.filter(log => securityActions.includes(log.action)).length,
    activeUsers: new Set(auditLogs.value.filter(log => log.action === 'login').map(log => log.userId)).size
  }
})

const filteredLogs = computed(() => {
  let logs = [...auditLogs.value]

  // Apply filters
  if (filters.action) {
    logs = logs.filter(log => log.action === filters.action)
  }

  if (filters.userId) {
    logs = logs.filter(log => log.userId === filters.userId)
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate)
    logs = logs.filter(log => new Date(log.timestamp) >= start)
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate)
    end.setHours(23, 59, 59, 999)
    logs = logs.filter(log => new Date(log.timestamp) <= end)
  }

  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    logs = logs.filter(log =>
      log.details.toLowerCase().includes(query) ||
      log.userName.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query)
    )
  }

  return logs
})

// Paginated logs
const paginatedLogs = computed(() => {
  const logs = filteredLogs.value
  const start = (pagination.page - 1) * pagination.perPage
  return logs.slice(start, start + pagination.perPage)
})

// Watch filtered logs to update pagination
watch(filteredLogs, (logs) => {
  pagination.total = logs.length
  pagination.from = Math.min((pagination.page - 1) * pagination.perPage + 1, logs.length)
  pagination.to = Math.min(pagination.page * pagination.perPage, logs.length)
}, { immediate: true })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const columns: any[] = [
  { id: 'action', key: 'action', header: t('settings.auditLog.action') },
  { id: 'user', key: 'user', header: t('settings.auditLog.user') },
  { id: 'timestamp', key: 'timestamp', header: t('settings.auditLog.timestamp') },
  { id: 'details', key: 'details', header: t('settings.auditLog.details') },
  { id: 'ip', key: 'ip', header: t('settings.auditLog.ipAddress') },
  { id: 'actions', key: 'actions', header: '' }
]

// Methods
function getActionColor(action: string): 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  const colors: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    login: 'success',
    logout: 'neutral',
    login_failed: 'error',
    order_create: 'primary',
    order_update: 'info',
    refund: 'warning',
    product_create: 'success',
    product_update: 'info',
    product_delete: 'error',
    user_create: 'success',
    user_update: 'info',
    settings_change: 'warning',
    shift_open: 'success',
    shift_close: 'neutral',
    inventory_adjust: 'info'
  }
  return colors[action] || 'neutral'
}

function getActionIcon(action: string): string {
  const icons: Record<string, string> = {
    login: 'i-heroicons-arrow-right-on-rectangle',
    logout: 'i-heroicons-arrow-left-on-rectangle',
    login_failed: 'i-heroicons-exclamation-triangle',
    order_create: 'i-heroicons-shopping-cart',
    order_update: 'i-heroicons-pencil',
    refund: 'i-heroicons-receipt-refund',
    product_create: 'i-heroicons-plus-circle',
    product_update: 'i-heroicons-pencil-square',
    product_delete: 'i-heroicons-trash',
    user_create: 'i-heroicons-user-plus',
    user_update: 'i-heroicons-user',
    settings_change: 'i-heroicons-cog-6-tooth',
    shift_open: 'i-heroicons-play',
    shift_close: 'i-heroicons-stop',
    inventory_adjust: 'i-heroicons-cube'
  }
  return icons[action] || 'i-heroicons-document'
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString()
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString()
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString()
}

function resetFilters() {
  filters.action = null
  filters.userId = null
  filters.startDate = ''
  filters.endDate = ''
  searchQuery.value = ''
  pagination.page = 1
}

function viewDetails(log: AuditLog) {
  selectedLog.value = log
  showDetailModal.value = true
}

function exportLogs() {
  const logs = filteredLogs.value
  const csv = [
    ['ID', 'Action', 'User', 'Timestamp', 'Details', 'IP Address', 'Resource Type', 'Resource ID'].join(','),
    ...logs.map(log => [
      log.id,
      log.action,
      log.userName,
      new Date(log.timestamp).toISOString(),
      `"${log.details.replace(/"/g, '""')}"`,
      log.ipAddress || '',
      log.resourceType || '',
      log.resourceId || ''
    ].join(','))
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Log access to this page
onMounted(() => {
  // In production, log the access to audit log page itself
  console.log('Audit log page accessed')
})
</script>
