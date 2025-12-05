<template>
  <div class="bill-print-container">
    <!-- Screen View Controls -->
    <div class="print:hidden mb-6 flex justify-between items-center p-4">
      <div class="flex items-center gap-4">
        <UButton
          :label="$t('bill.back_to_bills')"
          icon="i-heroicons-arrow-left"
          variant="outline"
          @click="$router.go(-1)"
        />
      </div>
      <div class="flex items-center gap-2">
        <UButton
          :label="$t('bill.print')"
          icon="i-heroicons-printer"
          @click="printBill"
        />
        <UButton
          :label="$t('bill.download_pdf')"
          icon="i-heroicons-document-arrow-down"
          variant="outline"
          @click="downloadPDF"
        />
      </div>
    </div>

    <!-- Print Content -->
    <UCard class="bill-print-content max-w-4xl mx-auto">
      <div class="space-y-6">
        <!-- Header Section -->
        <div class="flex justify-between items-start border-b border-gray-200 dark:border-slate-800 pb-6">
          <div class="flex items-start gap-6">
            <img
              v-if="companyInfo.logo"
              :src="companyInfo.logo"
              :alt="companyInfo.name"
              class="h-16 w-16 object-contain"
            />
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ companyInfo.name }}</h1>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{{ companyInfo.address }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.phone') }}: {{ companyInfo.phone }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ $t('common.email') }}: {{ companyInfo.email }}</p>
            </div>
          </div>
          <div class="text-right">
            <h2 class="text-2xl font-bold text-primary-600">{{ $t('bill.invoice') }}</h2>
            <p class="text-lg font-semibold mt-1 text-gray-900 dark:text-white">#{{ billData.invoiceNumber }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {{ $t('bill.branch') }}: {{ getCurrentBranch?.name }}
            </p>
          </div>
        </div>

        <!-- Bill Info and Customer Details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Customer Information -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">{{ $t('bill.bill_to') }}</h3>
            <div class="space-y-1">
              <p class="font-medium text-gray-900 dark:text-white">{{ billData.customer.name }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ billData.customer.address }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ $t('common.phone') }}: {{ billData.customer.phone }}
              </p>
              <p class="text-sm text-gray-600" v-if="billData.customer.email">
                {{ $t('common.email') }}: {{ billData.customer.email }}
              </p>
              <p class="text-sm text-gray-600" v-if="billData.customer.taxId">
                {{ $t('bill.tax_id') }}: {{ billData.customer.taxId }}
              </p>
            </div>
          </div>

          <!-- Invoice Details -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">{{ $t('bill.invoice_details') }}</h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">{{ $t('bill.invoice_date') }}:</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ formatDate(billData.date) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">{{ $t('bill.due_date') }}:</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ formatDate(billData.dueDate) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">{{ $t('bill.payment_terms') }}:</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ billData.paymentTerms }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">{{ $t('bill.sales_person') }}:</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ billData.salesPerson }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="overflow-x-auto">
          <table class="w-full border-collapse border dark:border-slate-800 border-gray-300">
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                  {{ $t('bill.item') }}
                </th>
                <th class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                  {{ $t('bill.quantity') }}
                </th>
                <th class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                  {{ $t('bill.unit') }}
                </th>
                <th class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {{ $t('bill.unit_price') }}
                </th>
                <th class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {{ $t('bill.discount') }}
                </th>
                <th class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {{ $t('bill.total') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in billData.items" :key="index" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="border dark:border-slate-800 border-gray-300 px-4 py-3">
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{{ item.name }}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400" v-if="item.description">{{ item.description }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-500" v-if="item.sku">{{ $t('bill.sku') }}: {{ item.sku }}</p>
                  </div>
                </td>
                <td class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-center text-gray-900 dark:text-white">
                  {{ formatNumber(item.quantity) }}
                </td>
                <td class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-center">
                  {{ item.unit }}
                </td>
                <td class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right">
                  {{ formatCurrency(item.unitPrice) }}
                </td>
                <td class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right">
                  {{ item.discount > 0 ? formatCurrency(item.discount) : '-' }}
                </td>
                <td class="border dark:border-slate-800 border-gray-300 px-4 py-3 text-right font-medium">
                  {{ formatCurrency(item.total) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Summary Section -->
        <div class="flex justify-end">
          <div class="w-full md:w-96 space-y-3">
            <div class="flex justify-between py-2  border-t dark:border-slate-800 border-gray-200">
              <span class="text-gray-600 dark:text-gray-400">{{ $t('bill.subtotal') }}:</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(billData.subtotal) }}</span>
            </div>
            <div v-if="billData.discount > 0" class="flex justify-between py-2">
              <span class="text-gray-600 dark:text-gray-400">{{ $t('bill.discount') }}:</span>
              <span class="font-medium text-red-600">-{{ formatCurrency(billData.discount) }}</span>
            </div>
            <div v-if="billData.tax > 0" class="flex justify-between py-2">
              <span class="text-gray-600 dark:text-gray-400">{{ $t('bill.tax') }} ({{ billData.taxRate }}%):</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(billData.tax) }}</span>
            </div>
            <div v-if="billData.shipping > 0" class="flex justify-between py-2">
              <span class="text-gray-600 dark:text-gray-400">{{ $t('bill.shipping') }}:</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(billData.shipping) }}</span>
            </div>
            <div class="flex justify-between py-3 border-t-2 dark:border-slate-800 border-gray-300">
              <span class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('bill.total') }}:</span>
              <span class="text-lg font-bold text-primary-600">{{ formatCurrency(billData.total) }}</span>
            </div>
            <div v-if="billData.amountPaid > 0" class="flex justify-between py-2">
              <span class="text-gray-600 dark:text-gray-400">{{ $t('bill.amount_paid') }}:</span>
              <span class="font-medium text-green-600">{{ formatCurrency(billData.amountPaid) }}</span>
            </div>
            <div v-if="billData.balance > 0" class="flex justify-between py-2">
              <span class="text-gray-600 dark:text-gray-400">{{ $t('bill.balance_due') }}:</span>
              <span class="font-bold text-red-600">{{ formatCurrency(billData.balance) }}</span>
            </div>
          </div>
        </div>

        <!-- Payment Information -->
        <div v-if="billData.paymentMethod" class="border-t dark:border-slate-800 border-gray-200 pt-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">{{ $t('bill.payment_information') }}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p><span class="text-gray-600 dark:text-gray-400">{{ $t('bill.payment_method') }}:</span> <span class="font-medium text-gray-900 dark:text-white">{{ billData.paymentMethod }}</span></p>
              <p v-if="billData.paymentReference"><span class="text-gray-600 dark:text-gray-400">{{ $t('bill.reference') }}:</span> <span class="font-medium text-gray-900 dark:text-white">{{ billData.paymentReference }}</span></p>
            </div>
          </div>
        </div>

        <!-- Notes and Terms -->
        <div v-if="billData.notes || billData.terms" class="border-t dark:border-slate-800 border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div v-if="billData.notes">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ $t('bill.notes') }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{{ billData.notes }}</p>
          </div>
          <div v-if="billData.terms">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ $t('bill.terms_conditions') }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{{ billData.terms }}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="border-t border-gray-200 dark:border-slate-800 pt-6 text-center text-sm text-gray-500">
          <p>{{ $t('bill.thank_you_business') }}</p>
          <p class="mt-2">{{ $t('bill.generated_on') }}: {{ formatDateTime(new Date()) }}</p>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
interface CustomerInfo {
  name: string
  address: string
  phone: string
  email?: string
  taxId?: string
}

interface BillItem {
  name: string
  description?: string
  sku?: string
  quantity: number
  unit: string
  unitPrice: number
  discount: number
  total: number
}

interface BillData {
  invoiceNumber: string
  date: string
  dueDate: string
  paymentTerms: string
  salesPerson: string
  customer: CustomerInfo
  items: BillItem[]
  subtotal: number
  discount: number
  tax: number
  taxRate: number
  shipping: number
  total: number
  amountPaid: number
  balance: number
  paymentMethod?: string
  paymentReference?: string
  notes?: string
  terms?: string
}

interface Branch {
  id: string
  name: string
}

interface CompanyInfo {
  name: string
  logo?: string
  address: string
  phone: string
  email: string
}

const { t } = useI18n()
const route = useRoute()

// Reactive data
const selectedBranch = ref<string>('')

// Mock data - replace with actual data fetching
const branches = ref<Branch[]>([
  { id: '1', name: t('branch.main_branch') },
  { id: '2', name: t('branch.secondary_branch') },
  { id: '3', name: t('branch.warehouse') }
])

const companyInfo = ref<CompanyInfo>({
  name: 'Your Company Name',
  logo: '/logo.png',
  address: '123 Business Street, City, Province 12345',
  phone: '+856 20 12345678',
  email: 'info@yourcompany.com'
})

const billData = ref<BillData>({
  invoiceNumber: 'INV-2024-001',
  date: '2024-01-15',
  dueDate: '2024-02-15',
  paymentTerms: t('bill.net_30'),
  salesPerson: 'John Doe',
  customer: {
    name: 'Customer Name',
    address: '456 Customer Street, City, Province 54321',
    phone: '+856 20 87654321',
    email: 'customer@email.com',
    taxId: 'TAX123456789'
  },
  items: [
    {
      name: 'Product A',
      description: 'High quality product with excellent features',
      sku: 'SKU-001',
      quantity: 2,
      unit: t('unit.pieces'),
      unitPrice: 150000,
      discount: 0,
      total: 300000
    },
    {
      name: 'Product B',
      description: 'Premium service package',
      sku: 'SKU-002',
      quantity: 1,
      unit: t('unit.service'),
      unitPrice: 500000,
      discount: 50000,
      total: 450000
    },
    {
      name: 'Product C',
      sku: 'SKU-003',
      quantity: 5,
      unit: t('unit.kg'),
      unitPrice: 25000,
      discount: 0,
      total: 125000
    }
  ],
  subtotal: 875000,
  discount: 50000,
  tax: 82500,
  taxRate: 10,
  shipping: 25000,
  total: 932500,
  amountPaid: 500000,
  balance: 432500,
  paymentMethod: t('payment.bank_transfer'),
  paymentReference: 'TXN-2024-001',
  notes: t('bill.sample_notes'),
  terms: t('bill.sample_terms')
})

// Computed
const getCurrentBranch = computed(() => {
  return branches.value.find(branch => branch.id === selectedBranch.value)
})

// Methods
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('lo-LA', {
    style: 'currency',
    currency: 'LAK',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('lo-LA').format(number)
}

const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('lo-LA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(dateString))
}

const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('lo-LA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const printBill = (): void => {
  window.print()
}

const downloadPDF = (): void => {
  // Implement PDF download functionality
  // You might want to use libraries like jsPDF or html2pdf
  console.log('Download PDF functionality to be implemented')
}

// Initialize
onMounted(() => {
  if (branches.value.length > 0) {
    selectedBranch.value = branches.value[0].id
  }
})

// Meta
definePageMeta({
  title: 'Bill Print',
  layout: 'blank',
  middleware: ['auth'],
})

useHead({
  title: `${t('bill.invoice')} #${billData.value.invoiceNumber}`
})
</script>

<style scoped>
@media print {
  .bill-print-container {
    padding: 0;
  }
  
  .bill-print-content {
    border: none;
    box-shadow: none;
    border-radius: 0;
  }
  
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

.bill-print-content {
  font-size: 14px;
}

@media print {
  .bill-print-content {
    font-size: 12px;
  }
}
</style>