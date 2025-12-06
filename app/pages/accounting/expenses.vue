<template>
  <UContainer>
    <CommonPageHeader
      :title="$t('accounting.expenses.title')"
      :description="$t('accounting.expenses.description')"
    >
      <template #actions>
        <UButton
          icon="i-heroicons-plus"
          @click="openExpenseModal()"
        >
          {{ $t('accounting.expenses.addExpense') }}
        </UButton>
      </template>
    </CommonPageHeader>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-error">{{ formatCurrency(stats.totalExpenses) }}</p>
          <p class="text-sm text-muted">{{ $t('accounting.expenses.totalExpenses') }}</p>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-orange-600">{{ formatCurrency(stats.thisMonth) }}</p>
          <p class="text-sm text-muted">{{ $t('accounting.expenses.thisMonth') }}</p>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary">{{ stats.expenseCount }}</p>
          <p class="text-sm text-muted">{{ $t('accounting.expenses.expenseCount') }}</p>
        </div>
      </UCard>
      
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-blue-600">{{ stats.categoryCount }}</p>
          <p class="text-sm text-muted">{{ $t('accounting.expenses.categories') }}</p>
        </div>
      </UCard>
    </div>

    <!-- Filters -->
    <UCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UFormField :label="$t('accounting.expenses.filterCategory')">
          <USelect
            v-model="filters.category"
            :items="categoryOptions"
            value-key="value"
            label-key="label"
            :placeholder="$t('common.all')"
          />
        </UFormField>
        
        <UFormField :label="$t('accounting.expenses.startDate')">
          <UInput v-model="filters.startDate" type="date" />
        </UFormField>
        
        <UFormField :label="$t('accounting.expenses.endDate')">
          <UInput v-model="filters.endDate" type="date" />
        </UFormField>
        
        <UFormField :label="$t('accounting.expenses.search')">
          <UInput
            v-model="filters.search"
            :placeholder="$t('accounting.expenses.searchPlaceholder')"
            icon="i-heroicons-magnifying-glass"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Expense Chart -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ $t('accounting.expenses.expensesByCategory') }}</h3>
          <USelect
            v-model="chartPeriod"
            :items="periodOptions"
            value-key="value"
            label-key="label"
            class="w-32"
          />
        </div>
      </template>

      <div class="h-64">
        <ChartPie
          v-if="expensesByCategory.length > 0"
          :data="expensesByCategory"
        />
        <div v-else class="h-full flex items-center justify-center text-muted">
          {{ $t('accounting.expenses.noData') }}
        </div>
      </div>
    </UCard>

    <!-- Expenses List -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">{{ $t('accounting.expenses.expenseList') }}</h3>
          <UButton
            variant="outline"
            icon="i-heroicons-arrow-down-tray"
            size="sm"
            @click="exportExpenses"
          >
            {{ $t('accounting.expenses.export') }}
          </UButton>
        </div>
      </template>

      <div v-if="filteredExpenses.length === 0" class="text-center py-8">
        <UIcon name="i-heroicons-receipt-percent" class="text-4xl text-muted mb-2" />
        <p class="text-muted">{{ $t('accounting.expenses.noExpenses') }}</p>
        <UButton
          variant="outline"
          class="mt-4"
          icon="i-heroicons-plus"
          @click="openExpenseModal()"
        >
          {{ $t('accounting.expenses.addFirstExpense') }}
        </UButton>
      </div>

      <div v-else class="divide-y">
        <div
          v-for="expense in filteredExpenses"
          :key="expense.id"
          class="py-4 flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-lg flex items-center justify-center"
              :style="{ backgroundColor: getCategoryColor(expense.category) + '20' }"
            >
              <UIcon
                :name="getCategoryIcon(expense.category)"
                class="text-xl"
                :style="{ color: getCategoryColor(expense.category) }"
              />
            </div>
            <div>
              <p class="font-medium">{{ expense.description }}</p>
              <div class="flex items-center gap-2 text-sm text-muted">
                <UBadge :color="getCategoryBadgeColor(expense.category)" variant="subtle" size="xs">
                  {{ expense.category }}
                </UBadge>
                <span>{{ formatDate(expense.date) }}</span>
                <span v-if="expense.vendor">· {{ expense.vendor }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="font-bold text-error">-{{ formatCurrency(expense.amount) }}</p>
              <p class="text-xs text-muted">{{ expense.paymentMethod }}</p>
            </div>
            
            <UDropdownMenu :items="getExpenseActions(expense)">
              <UButton
                variant="ghost"
                icon="i-heroicons-ellipsis-vertical"
              />
            </UDropdownMenu>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="filteredExpenses.length > 0" class="flex justify-between items-center mt-4 pt-4 border-t">
        <p class="text-sm text-muted">
          {{ $t('accounting.expenses.showing', { count: filteredExpenses.length, total: expenses.length }) }}
        </p>
      </div>
    </UCard>

    <!-- Add/Edit Expense Modal -->
    <UModal v-model:open="showExpenseModal">
      <template #header>
        <h3 class="font-semibold">
          {{ editingExpense ? $t('accounting.expenses.editExpense') : $t('accounting.expenses.addExpense') }}
        </h3>
      </template>

      <div class="p-4 space-y-4">
        <UFormField :label="$t('accounting.expenses.amount')" required>
          <UInput
            v-model.number="expenseForm.amount"
            type="number"
            min="0"
            step="0.01"
            :placeholder="$t('accounting.expenses.amountPlaceholder')"
          />
        </UFormField>

        <UFormField :label="$t('accounting.expenses.category')" required>
          <USelect
            v-model="expenseForm.category"
            :items="expenseCategories"
            :placeholder="$t('accounting.expenses.selectCategory')"
          />
        </UFormField>

        <UFormField :label="$t('accounting.expenses.description')" required>
          <UInput
            v-model="expenseForm.description"
            :placeholder="$t('accounting.expenses.descriptionPlaceholder')"
          />
        </UFormField>

        <UFormField :label="$t('accounting.expenses.date')" required>
          <UInput v-model="expenseForm.date" type="date" />
        </UFormField>

        <UFormField :label="$t('accounting.expenses.vendor')">
          <UInput
            v-model="expenseForm.vendor"
            :placeholder="$t('accounting.expenses.vendorPlaceholder')"
          />
        </UFormField>

        <UFormField :label="$t('accounting.expenses.paymentMethod')">
          <USelect
            v-model="expenseForm.paymentMethod"
            :items="paymentMethods"
          />
        </UFormField>

        <UFormField :label="$t('accounting.expenses.reference')">
          <UInput
            v-model="expenseForm.reference"
            :placeholder="$t('accounting.expenses.referencePlaceholder')"
          />
        </UFormField>

        <UFormField :label="$t('accounting.expenses.notes')">
          <UTextarea
            v-model="expenseForm.notes"
            :placeholder="$t('accounting.expenses.notesPlaceholder')"
            :rows="2"
          />
        </UFormField>

        <UFormField :label="$t('accounting.expenses.receipt')">
          <div class="border-2 border-dashed rounded-lg p-4 text-center">
            <input
              ref="receiptInput"
              type="file"
              accept="image/*,.pdf"
              class="hidden"
              @change="handleReceiptUpload"
            >
            <div v-if="!expenseForm.receipt">
              <UIcon name="i-heroicons-camera" class="text-2xl text-muted mb-2" />
              <p class="text-sm text-muted mb-2">{{ $t('accounting.expenses.uploadReceipt') }}</p>
              <UButton size="sm" variant="outline" @click="receiptInput?.click()">
                {{ $t('accounting.expenses.selectFile') }}
              </UButton>
            </div>
            <div v-else class="flex items-center justify-center gap-2">
              <UIcon name="i-heroicons-document-check" class="text-green-600" />
              <span class="text-sm">{{ expenseForm.receipt }}</span>
              <UButton variant="ghost" size="xs" icon="i-heroicons-x-mark" @click="expenseForm.receipt = ''" />
            </div>
          </div>
        </UFormField>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showExpenseModal = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton
            :loading="savingExpense"
            @click="saveExpense"
          >
            {{ editingExpense ? $t('common.update') : $t('common.create') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="font-semibold text-error">{{ $t('accounting.expenses.deleteExpense') }}</h3>
      </template>

      <div class="p-4">
        <p>{{ $t('accounting.expenses.deleteConfirm') }}</p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showDeleteModal = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton
            color="error"
            :loading="deletingExpense"
            @click="deleteExpense"
          >
            {{ $t('common.delete') }}
          </UButton>
        </div>
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
const toast = useToast()
const { format: formatCurrency } = useCurrency()

interface Expense {
  id: string
  amount: number
  category: string
  description: string
  date: string
  vendor?: string
  paymentMethod: string
  reference?: string
  notes?: string
  receipt?: string
  createdAt: Date
}

// State
const showExpenseModal = ref(false)
const showDeleteModal = ref(false)
const savingExpense = ref(false)
const deletingExpense = ref(false)
const editingExpense = ref<Expense | null>(null)
const expenseToDelete = ref<Expense | null>(null)
const receiptInput = ref<HTMLInputElement | null>(null)
const chartPeriod = ref('month')

const filters = reactive({
  category: '',
  startDate: '',
  endDate: '',
  search: ''
})

const expenseForm = reactive({
  amount: 0,
  category: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  vendor: '',
  paymentMethod: 'Cash',
  reference: '',
  notes: '',
  receipt: ''
})

// Mock expenses data
const expenses = ref<Expense[]>([
  {
    id: '1',
    amount: 500000,
    category: 'Rent',
    description: 'Monthly store rent',
    date: '2024-01-15',
    vendor: 'Property Management Co.',
    paymentMethod: 'Bank Transfer',
    reference: 'RENT-001',
    createdAt: new Date()
  },
  {
    id: '2',
    amount: 150000,
    category: 'Utilities',
    description: 'Electricity bill',
    date: '2024-01-10',
    vendor: 'Electric Company',
    paymentMethod: 'Bank Transfer',
    reference: 'ELEC-001',
    createdAt: new Date()
  },
  {
    id: '3',
    amount: 80000,
    category: 'Supplies',
    description: 'Office supplies and packaging',
    date: '2024-01-08',
    vendor: 'Office Depot',
    paymentMethod: 'Cash',
    createdAt: new Date()
  },
  {
    id: '4',
    amount: 200000,
    category: 'Inventory',
    description: 'Coffee beans purchase',
    date: '2024-01-05',
    vendor: 'Coffee Supplier',
    paymentMethod: 'Cash',
    reference: 'INV-001',
    createdAt: new Date()
  },
  {
    id: '5',
    amount: 50000,
    category: 'Marketing',
    description: 'Social media ads',
    date: '2024-01-03',
    paymentMethod: 'Lightning',
    createdAt: new Date()
  }
])

const expenseCategories = [
  'Rent',
  'Utilities',
  'Supplies',
  'Inventory',
  'Marketing',
  'Salaries',
  'Equipment',
  'Maintenance',
  'Insurance',
  'Transportation',
  'Professional Services',
  'Other'
]

const paymentMethods = ['Cash', 'Bank Transfer', 'Credit Card', 'Lightning', 'Check']

// Computed
const stats = computed(() => {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const total = expenses.value.reduce((sum, e) => sum + e.amount, 0)
  const thisMonth = expenses.value
    .filter(e => new Date(e.date) >= thisMonthStart)
    .reduce((sum, e) => sum + e.amount, 0)
  
  const categories = new Set(expenses.value.map(e => e.category))
  
  return {
    totalExpenses: total,
    thisMonth,
    expenseCount: expenses.value.length,
    categoryCount: categories.size
  }
})

const categoryOptions = computed(() => [
  { value: '', label: t('common.all') },
  ...expenseCategories.map(c => ({ value: c, label: c }))
])

const periodOptions = computed(() => [
  { value: 'week', label: t('accounting.expenses.thisWeek') },
  { value: 'month', label: t('accounting.expenses.thisMonth') },
  { value: 'year', label: t('accounting.expenses.thisYear') }
])

const filteredExpenses = computed(() => {
  let result = [...expenses.value]
  
  if (filters.category) {
    result = result.filter(e => e.category === filters.category)
  }
  
  if (filters.startDate) {
    result = result.filter(e => e.date >= filters.startDate)
  }
  
  if (filters.endDate) {
    result = result.filter(e => e.date <= filters.endDate)
  }
  
  if (filters.search) {
    const query = filters.search.toLowerCase()
    result = result.filter(e => 
      e.description.toLowerCase().includes(query) ||
      e.vendor?.toLowerCase().includes(query) ||
      e.category.toLowerCase().includes(query)
    )
  }
  
  return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const expensesByCategory = computed(() => {
  const categoryTotals = new Map<string, number>()
  
  expenses.value.forEach(e => {
    const current = categoryTotals.get(e.category) || 0
    categoryTotals.set(e.category, current + e.amount)
  })
  
  return Array.from(categoryTotals.entries()).map(([name, value]) => ({
    name,
    value
  }))
})

// Methods
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString()
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Rent': '#ef4444',
    'Utilities': '#f97316',
    'Supplies': '#eab308',
    'Inventory': '#22c55e',
    'Marketing': '#3b82f6',
    'Salaries': '#8b5cf6',
    'Equipment': '#ec4899',
    'Maintenance': '#06b6d4',
    'Insurance': '#64748b',
    'Transportation': '#84cc16',
    'Professional Services': '#6366f1',
    'Other': '#9ca3af'
  }
  return colors[category] || '#9ca3af'
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Rent': 'i-heroicons-home',
    'Utilities': 'i-heroicons-bolt',
    'Supplies': 'i-heroicons-cube',
    'Inventory': 'i-heroicons-archive-box',
    'Marketing': 'i-heroicons-megaphone',
    'Salaries': 'i-heroicons-users',
    'Equipment': 'i-heroicons-wrench',
    'Maintenance': 'i-heroicons-cog',
    'Insurance': 'i-heroicons-shield-check',
    'Transportation': 'i-heroicons-truck',
    'Professional Services': 'i-heroicons-briefcase',
    'Other': 'i-heroicons-document'
  }
  return icons[category] || 'i-heroicons-document'
}

function getCategoryBadgeColor(category: string): 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  const colors: Record<string, 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    'Rent': 'error',
    'Utilities': 'warning',
    'Supplies': 'info',
    'Inventory': 'success',
    'Marketing': 'primary',
    'Salaries': 'primary',
    'Equipment': 'info',
    'Maintenance': 'neutral',
    'Insurance': 'neutral',
    'Transportation': 'success',
    'Professional Services': 'primary',
    'Other': 'neutral'
  }
  return colors[category] || 'neutral'
}

function openExpenseModal(expense?: Expense) {
  if (expense) {
    editingExpense.value = expense
    expenseForm.amount = expense.amount
    expenseForm.category = expense.category
    expenseForm.description = expense.description
    expenseForm.date = expense.date
    expenseForm.vendor = expense.vendor || ''
    expenseForm.paymentMethod = expense.paymentMethod
    expenseForm.reference = expense.reference || ''
    expenseForm.notes = expense.notes || ''
    expenseForm.receipt = expense.receipt || ''
  } else {
    editingExpense.value = null
    expenseForm.amount = 0
    expenseForm.category = ''
    expenseForm.description = ''
    expenseForm.date = new Date().toISOString().split('T')[0]
    expenseForm.vendor = ''
    expenseForm.paymentMethod = 'Cash'
    expenseForm.reference = ''
    expenseForm.notes = ''
    expenseForm.receipt = ''
  }
  showExpenseModal.value = true
}

function handleReceiptUpload(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0 && input.files[0]) {
    expenseForm.receipt = input.files[0].name
    // In production, upload to storage
  }
}

async function saveExpense() {
  if (!expenseForm.amount || !expenseForm.category || !expenseForm.description) {
    toast.add({
      title: t('accounting.expenses.validationError'),
      description: t('accounting.expenses.fillRequired'),
      color: 'error'
    })
    return
  }
  
  savingExpense.value = true
  
  try {
    if (editingExpense.value) {
      // Update existing
      const index = expenses.value.findIndex(e => e.id === editingExpense.value?.id)
      if (index !== -1) {
        expenses.value[index] = {
          ...expenses.value[index],
          amount: expenseForm.amount,
          category: expenseForm.category,
          description: expenseForm.description,
          date: expenseForm.date,
          vendor: expenseForm.vendor,
          paymentMethod: expenseForm.paymentMethod,
          reference: expenseForm.reference,
          notes: expenseForm.notes,
          receipt: expenseForm.receipt
        } as Expense
      }
      
      toast.add({
        title: t('accounting.expenses.expenseUpdated'),
        color: 'success'
      })
    } else {
      // Create new
      expenses.value.push({
        id: Date.now().toString(),
        amount: expenseForm.amount,
        category: expenseForm.category,
        description: expenseForm.description,
        date: expenseForm.date || new Date().toISOString().slice(0, 10),
        vendor: expenseForm.vendor || undefined,
        paymentMethod: expenseForm.paymentMethod,
        reference: expenseForm.reference || undefined,
        notes: expenseForm.notes || undefined,
        receipt: expenseForm.receipt || undefined,
        createdAt: new Date()
      })
      
      toast.add({
        title: t('accounting.expenses.expenseCreated'),
        color: 'success'
      })
    }
    
    // Save to localStorage
    localStorage.setItem('expenses', JSON.stringify(expenses.value))
    showExpenseModal.value = false
  } catch (error) {
    console.error('Failed to save expense:', error)
    toast.add({
      title: t('accounting.expenses.saveFailed'),
      color: 'error'
    })
  } finally {
    savingExpense.value = false
  }
}

function getExpenseActions(expense: Expense) {
  return [
    [
      {
        label: t('common.edit'),
        icon: 'i-heroicons-pencil',
        onSelect: () => openExpenseModal(expense)
      },
      {
        label: t('common.duplicate'),
        icon: 'i-heroicons-document-duplicate',
        onSelect: () => {
          const duplicate = { ...expense, id: '', date: new Date().toISOString().split('T')[0] }
          openExpenseModal(duplicate as Expense)
        }
      }
    ],
    [
      {
        label: t('common.delete'),
        icon: 'i-heroicons-trash',
        color: 'error' as const,
        onSelect: () => {
          expenseToDelete.value = expense
          showDeleteModal.value = true
        }
      }
    ]
  ]
}

async function deleteExpense() {
  if (!expenseToDelete.value) return
  
  deletingExpense.value = true
  
  try {
    const index = expenses.value.findIndex(e => e.id === expenseToDelete.value?.id)
    if (index !== -1) {
      expenses.value.splice(index, 1)
    }
    
    localStorage.setItem('expenses', JSON.stringify(expenses.value))
    
    toast.add({
      title: t('accounting.expenses.expenseDeleted'),
      color: 'success'
    })
    
    showDeleteModal.value = false
  } catch (error) {
    console.error('Failed to delete expense:', error)
    toast.add({
      title: t('accounting.expenses.deleteFailed'),
      color: 'error'
    })
  } finally {
    deletingExpense.value = false
  }
}

function exportExpenses() {
  const csv = [
    ['Date', 'Category', 'Description', 'Amount', 'Vendor', 'Payment Method', 'Reference'].join(','),
    ...filteredExpenses.value.map(e => [
      e.date,
      e.category,
      `"${e.description}"`,
      e.amount,
      e.vendor || '',
      e.paymentMethod,
      e.reference || ''
    ].join(','))
  ].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  
  toast.add({
    title: t('accounting.expenses.exportSuccess'),
    color: 'success'
  })
}

// Load data on mount
onMounted(() => {
  const savedExpenses = localStorage.getItem('expenses')
  if (savedExpenses) {
    expenses.value = JSON.parse(savedExpenses)
  }
})
</script>
