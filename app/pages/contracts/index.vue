<script setup lang="ts">
/**
 * 📋 CONTRACTS & RENTALS PAGE
 * Enterprise Contract and Asset Management
 */

import type { Contract, ContractType, ContractStatus, RentalAsset, AssetType, RentalBooking } from '~/types';

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const { t, locale } = useI18n();
const toast = useToast();
const contractsStore = useContracts();
const customersStore = useCustomers();

const isLaoLocale = computed(() => locale.value.startsWith('lo'));

// Initialize
onMounted(async () => {
  await Promise.all([
    contractsStore.init(),
    customersStore.init(),
  ]);
});

// UI State
const activeTab = ref<'contracts' | 'assets' | 'bookings'>('contracts');
const showContractModal = ref(false);
const showAssetModal = ref(false);
const showBookingModal = ref(false);
const selectedContract = ref<Contract | null>(null);
const selectedAsset = ref<RentalAsset | null>(null);
const selectedBooking = ref<RentalBooking | null>(null);
const saving = ref(false);
const searchQuery = ref('');
const filterStatus = ref<ContractStatus | 'all'>('all');

// Contract Form
const contractForm = ref({
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  type: 'rental' as ContractType,
  assetId: '',
  startDate: '',
  endDate: '',
  amount: 0,
  paymentSchedule: 'monthly' as Contract['paymentSchedule'],
  depositAmount: 0,
  autoRenew: false,
  notes: '',
});

// Asset Form
const assetForm = ref({
  name: '',
  nameLao: '',
  type: 'room' as AssetType,
  description: '',
  hourlyRate: 0,
  dailyRate: 0,
  monthlyRate: 0,
  deposit: 0,
  location: '',
  capacity: 0,
});

// Booking Form
const bookingForm = ref({
  assetId: '',
  customerName: '',
  customerPhone: '',
  startTime: '',
  endTime: '',
  notes: '',
});

// Computed
const filteredContracts = computed(() => {
  let filtered = contractsStore.contracts.value;

  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(c => c.status === filterStatus.value);
  }

  if (searchQuery.value) {
    filtered = contractsStore.searchContracts(searchQuery.value);
  }

  return filtered;
});

const assetOptions = computed(() =>
  contractsStore.assets.value
    .filter(a => a.isActive)
    .map(a => ({
      value: a.id,
      label: isLaoLocale.value && a.nameLao ? a.nameLao : a.name,
    }))
);

const contractTypeOptions = [
  { value: 'rental', label: '🏠 Rental' },
  { value: 'lease', label: '📜 Lease' },
  { value: 'service', label: '🛠️ Service' },
  { value: 'subscription', label: '💳 Subscription' },
];

const assetTypeOptions = [
  { value: 'room', label: '🚪 Room' },
  { value: 'equipment', label: '⚙️ Equipment' },
  { value: 'vehicle', label: '🚗 Vehicle' },
  { value: 'locker', label: '🔐 Locker' },
  { value: 'space', label: '📍 Space' },
  { value: 'other', label: '📦 Other' },
];

const paymentScheduleOptions = [
  { value: 'once', label: 'One-time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

// Methods
function openContractModal(contract?: Contract) {
  if (contract) {
    selectedContract.value = contract;
    contractForm.value = {
      customerName: contract.customerName,
      customerPhone: contract.customerPhone || '',
      customerEmail: contract.customerEmail || '',
      type: contract.type,
      assetId: contract.assetId || '',
      startDate: contract.startDate.split('T')[0],
      endDate: contract.endDate.split('T')[0],
      amount: contract.amount,
      paymentSchedule: contract.paymentSchedule,
      depositAmount: contract.depositAmount || 0,
      autoRenew: contract.autoRenew,
      notes: contract.notes || '',
    };
  } else {
    selectedContract.value = null;
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    contractForm.value = {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      type: 'rental',
      assetId: '',
      startDate: today.toISOString().split('T')[0],
      endDate: nextMonth.toISOString().split('T')[0],
      amount: 0,
      paymentSchedule: 'monthly',
      depositAmount: 0,
      autoRenew: false,
      notes: '',
    };
  }
  showContractModal.value = true;
}

function openAssetModal(asset?: RentalAsset) {
  if (asset) {
    selectedAsset.value = asset;
    assetForm.value = {
      name: asset.name,
      nameLao: asset.nameLao || '',
      type: asset.type,
      description: asset.description || '',
      hourlyRate: asset.hourlyRate || 0,
      dailyRate: asset.dailyRate || 0,
      monthlyRate: asset.monthlyRate || 0,
      deposit: asset.deposit || 0,
      location: asset.location || '',
      capacity: asset.capacity || 0,
    };
  } else {
    selectedAsset.value = null;
    assetForm.value = {
      name: '',
      nameLao: '',
      type: 'room',
      description: '',
      hourlyRate: 0,
      dailyRate: 0,
      monthlyRate: 0,
      deposit: 0,
      location: '',
      capacity: 0,
    };
  }
  showAssetModal.value = true;
}

function openBookingModal(asset?: RentalAsset) {
  const now = new Date();
  const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  bookingForm.value = {
    assetId: asset?.id || '',
    customerName: '',
    customerPhone: '',
    startTime: now.toISOString().slice(0, 16),
    endTime: later.toISOString().slice(0, 16),
    notes: '',
  };
  showBookingModal.value = true;
}

async function saveContract() {
  if (!contractForm.value.customerName || !contractForm.value.amount) {
    toast.add({
      title: t('common.error'),
      description: 'Customer name and amount are required',
      color: 'error',
    });
    return;
  }

  saving.value = true;
  try {
    if (selectedContract.value) {
      await contractsStore.updateContract(selectedContract.value.id, {
        ...contractForm.value,
        startDate: new Date(contractForm.value.startDate).toISOString(),
        endDate: new Date(contractForm.value.endDate).toISOString(),
      });
      toast.add({ title: t('common.success'), description: 'Contract updated', color: 'success' });
    } else {
      await contractsStore.createContract({
        ...contractForm.value,
        startDate: new Date(contractForm.value.startDate).toISOString(),
        endDate: new Date(contractForm.value.endDate).toISOString(),
      });
      toast.add({ title: t('common.success'), description: 'Contract created', color: 'success' });
    }
    showContractModal.value = false;
  } catch (e) {
    toast.add({ title: t('common.error'), description: String(e), color: 'error' });
  } finally {
    saving.value = false;
  }
}

async function saveAsset() {
  if (!assetForm.value.name) {
    toast.add({ title: t('common.error'), description: 'Asset name is required', color: 'error' });
    return;
  }

  saving.value = true;
  try {
    if (selectedAsset.value) {
      await contractsStore.updateAsset(selectedAsset.value.id, assetForm.value);
      toast.add({ title: t('common.success'), description: 'Asset updated', color: 'success' });
    } else {
      await contractsStore.addAsset(assetForm.value);
      toast.add({ title: t('common.success'), description: 'Asset added', color: 'success' });
    }
    showAssetModal.value = false;
  } catch (e) {
    toast.add({ title: t('common.error'), description: String(e), color: 'error' });
  } finally {
    saving.value = false;
  }
}

async function saveBooking() {
  if (!bookingForm.value.assetId || !bookingForm.value.customerName) {
    toast.add({ title: t('common.error'), description: 'Asset and customer name are required', color: 'error' });
    return;
  }

  const asset = contractsStore.getAsset(bookingForm.value.assetId);
  const hours = (new Date(bookingForm.value.endTime).getTime() - new Date(bookingForm.value.startTime).getTime()) / (1000 * 60 * 60);
  const totalAmount = Math.round(hours * (asset?.hourlyRate || 0));

  saving.value = true;
  try {
    await contractsStore.createBooking({
      ...bookingForm.value,
      totalAmount,
      depositAmount: asset?.deposit,
    });
    toast.add({ title: t('common.success'), description: 'Booking created', color: 'success' });
    showBookingModal.value = false;
  } catch (e) {
    toast.add({ title: t('common.error'), description: String(e), color: 'error' });
  } finally {
    saving.value = false;
  }
}

async function activateContract(contract: Contract) {
  await contractsStore.activateContract(contract.id);
  toast.add({ title: t('common.success'), description: 'Contract activated', color: 'success' });
}

async function terminateContract(contract: Contract) {
  if (!confirm('Terminate this contract?')) return;
  await contractsStore.terminateContract(contract.id, 'User terminated');
  toast.add({ title: t('common.success'), description: 'Contract terminated', color: 'warning' });
}

async function renewContract(contract: Contract) {
  await contractsStore.renewContract(contract.id);
  toast.add({ title: t('common.success'), description: 'Contract renewed', color: 'success' });
}

async function collectDeposit(contract: Contract) {
  await contractsStore.collectDeposit(contract.id);
  toast.add({ title: t('common.success'), description: 'Deposit collected', color: 'success' });
}

async function deleteContractAction(contract: Contract) {
  if (!confirm('Delete this contract?')) return;
  await contractsStore.deleteContract(contract.id);
  toast.add({ title: t('common.success'), description: 'Contract deleted', color: 'warning' });
}

async function deleteAssetAction(asset: RentalAsset) {
  if (!confirm('Delete this asset?')) return;
  await contractsStore.deleteAsset(asset.id);
  toast.add({ title: t('common.success'), description: 'Asset deleted', color: 'warning' });
}

async function checkOutBookingAction(booking: RentalBooking) {
  await contractsStore.checkOutBooking(booking.id);
  toast.add({ title: t('common.success'), description: 'Checked out', color: 'success' });
}

async function returnBookingAction(booking: RentalBooking) {
  await contractsStore.returnBooking(booking.id);
  toast.add({ title: t('common.success'), description: 'Asset returned', color: 'success' });
}

// Helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('lo-LA', {
    style: 'currency',
    currency: 'LAK',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type BadgeColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'gray' | 'primary' | 'purple';

function getStatusColor(status: ContractStatus): BadgeColor {
  const colors: Record<string, BadgeColor> = {
    draft: 'gray',
    pending: 'blue',
    active: 'green',
    expired: 'orange',
    terminated: 'red',
    cancelled: 'gray',
  };
  return colors[status] || 'gray';
}

function getAssetTypeIcon(type: AssetType): string {
  const icons: Record<string, string> = {
    room: '🚪',
    equipment: '⚙️',
    vehicle: '🚗',
    locker: '🔐',
    space: '📍',
    other: '📦',
  };
  return icons[type] || '📦';
}

function getBookingStatusColor(status: string): BadgeColor {
  const colors: Record<string, BadgeColor> = {
    reserved: 'blue',
    checked_out: 'purple',
    returned: 'green',
    cancelled: 'gray',
    no_show: 'red',
  };
  return colors[status] || 'gray';
}

function getDaysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center px-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          📋 {{ t('contracts.title', 'Contracts & Rentals') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          {{ t('contracts.description', 'Manage contracts, assets, and bookings') }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="activeTab === 'contracts'"
          color="primary"
          icon="i-heroicons-plus"
          :label="t('contracts.newContract', 'New Contract')"
          @click="openContractModal()"
        />
        <UButton
          v-if="activeTab === 'assets'"
          color="primary"
          icon="i-heroicons-plus"
          :label="t('contracts.addAsset', 'Add Asset')"
          @click="openAssetModal()"
        />
        <UButton
          v-if="activeTab === 'bookings'"
          color="primary"
          icon="i-heroicons-plus"
          :label="t('contracts.newBooking', 'New Booking')"
          @click="openBookingModal()"
        />
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 px-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl">✅</div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Active</div>
            <div class="text-2xl font-bold text-green-600">{{ contractsStore.stats.value.activeCount }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xl">⏰</div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Expiring</div>
            <div class="text-2xl font-bold text-orange-600">{{ contractsStore.stats.value.expiringCount }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl">🏠</div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Assets</div>
            <div class="text-2xl font-bold text-blue-600">{{ contractsStore.stats.value.totalAssets }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xl">📅</div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Today</div>
            <div class="text-2xl font-bold text-purple-600">{{ contractsStore.stats.value.todayBookings }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xl">💰</div>
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Monthly</div>
            <div class="text-lg font-bold text-emerald-600">{{ formatCurrency(contractsStore.stats.value.monthlyRevenue) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 px-4">
      <UButton
        :color="activeTab === 'contracts' ? 'primary' : 'neutral'"
        :variant="activeTab === 'contracts' ? 'solid' : 'ghost'"
        icon="i-heroicons-document-text"
        :label="t('contracts.contracts', 'Contracts')"
        @click="activeTab = 'contracts'"
      />
      <UButton
        :color="activeTab === 'assets' ? 'primary' : 'neutral'"
        :variant="activeTab === 'assets' ? 'solid' : 'ghost'"
        icon="i-heroicons-cube"
        :label="t('contracts.assets', 'Assets')"
        @click="activeTab = 'assets'"
      />
      <UButton
        :color="activeTab === 'bookings' ? 'primary' : 'neutral'"
        :variant="activeTab === 'bookings' ? 'solid' : 'ghost'"
        icon="i-heroicons-calendar"
        :label="t('contracts.bookings', 'Bookings')"
        @click="activeTab = 'bookings'"
      />
    </div>

    <!-- Contracts Tab -->
    <template v-if="activeTab === 'contracts'">
      <!-- Filters -->
      <div class="flex gap-4 px-4">
        <UInput
          v-model="searchQuery"
          placeholder="Search contracts..."
          icon="i-heroicons-magnifying-glass"
          class="w-64"
        />
        <USelect
          v-model="filterStatus"
          :items="[
            { value: 'all', label: 'All Status' },
            { value: 'draft', label: 'Draft' },
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' },
            { value: 'terminated', label: 'Terminated' },
          ]"
          value-key="value"
          label-key="label"
        />
      </div>

      <!-- Contracts List -->
      <div class="overflow-x-auto">
        <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th class="text-left py-3 px-4 font-medium text-gray-500">Contract #</th>
                <th class="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                <th class="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                <th class="text-left py-3 px-4 font-medium text-gray-500">Asset</th>
                <th class="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
                <th class="text-center py-3 px-4 font-medium text-gray-500">Deposit</th>
                <th class="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                <th class="text-right py-3 px-4 font-medium text-gray-500">Ends</th>
                <th class="text-center py-3 px-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="contract in filteredContracts"
                :key="contract.id"
                class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="py-3 px-4 font-mono text-sm text-primary-600">{{ contract.contractNumber }}</td>
                <td class="py-3 px-4">
                  <div class="font-medium">{{ contract.customerName }}</div>
                  <div class="text-sm text-gray-500">{{ contract.customerPhone }}</div>
                </td>
                <td class="py-3 px-4 capitalize">{{ contract.type }}</td>
                <td class="py-3 px-4">
                  <span v-if="contract.asset" class="flex items-center gap-1">
                    {{ getAssetTypeIcon(contract.asset.type) }}
                    {{ contract.asset.name }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="py-3 px-4 text-right font-medium">
                  {{ formatCurrency(contract.amount) }}
                  <span class="text-xs text-gray-500">/{{ contract.paymentSchedule }}</span>
                </td>
                <td class="py-3 px-4 text-center">
                  <template v-if="contract.depositAmount">
                    <UBadge
                      :color="contract.depositStatus === 'collected' ? 'green' : 'yellow'"
                      :label="contract.depositStatus || 'pending'"
                      size="xs"
                    />
                  </template>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="py-3 px-4 text-center">
                  <UBadge :color="getStatusColor(contract.status)" :label="contract.status" variant="subtle" />
                </td>
                <td class="py-3 px-4 text-right text-sm">
                  <span :class="getDaysUntil(contract.endDate) < 7 ? 'text-orange-600 font-medium' : 'text-gray-500'">
                    {{ formatDate(contract.endDate) }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-center gap-1">
                    <UButton
                      v-if="contract.status === 'draft'"
                      color="green"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-play"
                      title="Activate"
                      @click="activateContract(contract)"
                    />
                    <UButton
                      v-if="contract.status === 'active' && contract.depositStatus === 'pending'"
                      color="yellow"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-banknotes"
                      title="Collect Deposit"
                      @click="collectDeposit(contract)"
                    />
                    <UButton
                      v-if="contract.status === 'expired' || contract.status === 'active'"
                      color="blue"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-arrow-path"
                      title="Renew"
                      @click="renewContract(contract)"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-pencil"
                      @click="openContractModal(contract)"
                    />
                    <UButton
                      v-if="contract.status === 'active'"
                      color="red"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-x-circle"
                      title="Terminate"
                      @click="terminateContract(contract)"
                    />
                    <UButton
                      v-if="contract.status === 'draft'"
                      color="red"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-trash"
                      @click="deleteContractAction(contract)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="filteredContracts.length === 0" class="text-center py-12">
            <div class="text-6xl mb-4">📋</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No contracts yet</h3>
            <p class="text-gray-500 mb-4">Create your first contract</p>
            <UButton color="primary" label="New Contract" @click="openContractModal()" />
          </div>
      </div>
    </template>

    <!-- Assets Tab -->
    <template v-if="activeTab === 'assets'">
      <div class="px-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div
            v-for="asset in contractsStore.assets.value.filter(a => a.isActive)"
            :key="asset.id"
            class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                  :class="asset.isAvailable ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'"
                >
                  {{ getAssetTypeIcon(asset.type) }}
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    {{ isLaoLocale && asset.nameLao ? asset.nameLao : asset.name }}
                  </h3>
                  <p class="text-sm text-gray-500 capitalize">{{ asset.type }}</p>
                </div>
              </div>
              <UBadge
                :color="asset.isAvailable ? 'green' : 'red'"
                :label="asset.isAvailable ? 'Available' : 'In Use'"
                size="xs"
              />
            </div>

            <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <div v-if="asset.hourlyRate" class="flex justify-between">
                <span>Hourly</span>
                <span class="font-medium">{{ formatCurrency(asset.hourlyRate) }}</span>
              </div>
              <div v-if="asset.dailyRate" class="flex justify-between">
                <span>Daily</span>
                <span class="font-medium">{{ formatCurrency(asset.dailyRate) }}</span>
              </div>
              <div v-if="asset.monthlyRate" class="flex justify-between">
                <span>Monthly</span>
                <span class="font-medium">{{ formatCurrency(asset.monthlyRate) }}</span>
              </div>
              <div v-if="asset.deposit" class="flex justify-between">
                <span>Deposit</span>
                <span class="font-medium text-yellow-600">{{ formatCurrency(asset.deposit) }}</span>
              </div>
            </div>

            <div class="flex gap-2">
              <UButton
                v-if="asset.isAvailable"
                color="primary"
                size="xs"
                block
                icon="i-heroicons-calendar"
                label="Book"
                @click="openBookingModal(asset)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-heroicons-pencil"
                @click="openAssetModal(asset)"
              />
              <UButton
                color="red"
                variant="ghost"
                size="xs"
                icon="i-heroicons-trash"
                @click="deleteAssetAction(asset)"
              />
            </div>
          </div>

          <div
            v-if="contractsStore.assets.value.filter(a => a.isActive).length === 0"
            class="col-span-full text-center py-12"
          >
            <div class="text-6xl mb-4">🏠</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No assets yet</h3>
            <p class="text-gray-500 mb-4">Add your first rental asset</p>
            <UButton color="primary" label="Add Asset" @click="openAssetModal()" />
          </div>
        </div>
      </div>
    </template>

    <!-- Bookings Tab -->
    <template v-if="activeTab === 'bookings'">
      <div class="px-4">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th class="text-left py-3 px-4 font-medium text-gray-500">Booking #</th>
                <th class="text-left py-3 px-4 font-medium text-gray-500">Asset</th>
                <th class="text-left py-3 px-4 font-medium text-gray-500">Customer</th>
                <th class="text-left py-3 px-4 font-medium text-gray-500">Start</th>
                <th class="text-left py-3 px-4 font-medium text-gray-500">End</th>
                <th class="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
                <th class="text-center py-3 px-4 font-medium text-gray-500">Status</th>
                <th class="text-center py-3 px-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="booking in contractsStore.bookings.value"
                :key="booking.id"
                class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td class="py-3 px-4 font-mono text-sm">{{ booking.bookingNumber }}</td>
                <td class="py-3 px-4">
                  <span v-if="booking.asset" class="flex items-center gap-1">
                    {{ getAssetTypeIcon(booking.asset.type) }}
                    {{ booking.asset.name }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <div class="font-medium">{{ booking.customerName }}</div>
                  <div class="text-sm text-gray-500">{{ booking.customerPhone }}</div>
                </td>
                <td class="py-3 px-4 text-sm">{{ formatDateTime(booking.startTime) }}</td>
                <td class="py-3 px-4 text-sm">{{ formatDateTime(booking.endTime) }}</td>
                <td class="py-3 px-4 text-right font-medium">{{ formatCurrency(booking.totalAmount) }}</td>
                <td class="py-3 px-4 text-center">
                  <UBadge :color="getBookingStatusColor(booking.status)" :label="booking.status.replace('_', ' ')" variant="subtle" />
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-center gap-1">
                    <UButton
                      v-if="booking.status === 'reserved'"
                      color="purple"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-arrow-right-on-rectangle"
                      title="Check Out"
                      @click="checkOutBookingAction(booking)"
                    />
                    <UButton
                      v-if="booking.status === 'checked_out'"
                      color="green"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-arrow-left-on-rectangle"
                      title="Return"
                      @click="returnBookingAction(booking)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="contractsStore.bookings.value.length === 0" class="text-center py-12">
            <div class="text-6xl mb-4">📅</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No bookings yet</h3>
            <p class="text-gray-500 mb-4">Book an asset to get started</p>
            <UButton color="primary" label="New Booking" @click="openBookingModal()" />
          </div>
        </div>
      </div>
    </template>

    <!-- Contract Modal -->
    <UModal v-model:open="showContractModal" :overlay="true">
      <template #content>
        <UCard class="max-w-xl">
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">📋</span>
              <h3 class="text-lg font-semibold">{{ selectedContract ? 'Edit Contract' : 'New Contract' }}</h3>
            </div>
          </template>

          <div class="space-y-4 max-h-[60vh] overflow-y-auto">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Customer Name" required>
                <UInput v-model="contractForm.customerName" />
              </UFormField>
              <UFormField label="Phone">
                <UInput v-model="contractForm.customerPhone" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Contract Type">
                <USelect v-model="contractForm.type" :items="contractTypeOptions" value-key="value" label-key="label" />
              </UFormField>
              <UFormField label="Asset">
                <USelect v-model="contractForm.assetId" :items="[{ value: 'none', label: 'No asset' }, ...assetOptions]" value-key="value" label-key="label" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Start Date" required>
                <UInput v-model="contractForm.startDate" type="date" />
              </UFormField>
              <UFormField label="End Date" required>
                <UInput v-model="contractForm.endDate" type="date" />
              </UFormField>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <UFormField label="Amount" required>
                <UInput v-model.number="contractForm.amount" type="number" />
              </UFormField>
              <UFormField label="Schedule">
                <USelect v-model="contractForm.paymentSchedule" :items="paymentScheduleOptions" value-key="value" label-key="label" />
              </UFormField>
              <UFormField label="Deposit">
                <UInput v-model.number="contractForm.depositAmount" type="number" />
              </UFormField>
            </div>

            <UFormField>
              <UCheckbox v-model="contractForm.autoRenew" label="Auto-renew when expired" />
            </UFormField>

            <UFormField label="Notes">
              <UTextarea v-model="contractForm.notes" :rows="2" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" label="Cancel" @click="showContractModal = false" />
              <UButton color="primary" label="Save Contract" :loading="saving" @click="saveContract" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Asset Modal -->
    <UModal v-model:open="showAssetModal" :overlay="true">
      <template #content>
        <UCard class="max-w-lg">
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">🏠</span>
              <h3 class="text-lg font-semibold">{{ selectedAsset ? 'Edit Asset' : 'Add Asset' }}</h3>
            </div>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Name (English)" required>
                <UInput v-model="assetForm.name" />
              </UFormField>
              <UFormField label="Name (Lao)">
                <UInput v-model="assetForm.nameLao" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Type">
                <USelect v-model="assetForm.type" :items="assetTypeOptions" value-key="value" label-key="label" />
              </UFormField>
              <UFormField label="Capacity">
                <UInput v-model.number="assetForm.capacity" type="number" placeholder="e.g. 10 people" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Hourly Rate">
                <UInput v-model.number="assetForm.hourlyRate" type="number" />
              </UFormField>
              <UFormField label="Daily Rate">
                <UInput v-model.number="assetForm.dailyRate" type="number" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Monthly Rate">
                <UInput v-model.number="assetForm.monthlyRate" type="number" />
              </UFormField>
              <UFormField label="Deposit">
                <UInput v-model.number="assetForm.deposit" type="number" />
              </UFormField>
            </div>

            <UFormField label="Location">
              <UInput v-model="assetForm.location" placeholder="e.g. Building A, Floor 2" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" label="Cancel" @click="showAssetModal = false" />
              <UButton color="primary" label="Save Asset" :loading="saving" @click="saveAsset" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Booking Modal -->
    <UModal v-model:open="showBookingModal" :overlay="true">
      <template #content>
        <UCard class="max-w-md">
          <template #header>
            <div class="flex items-center gap-3">
              <span class="text-2xl">📅</span>
              <h3 class="text-lg font-semibold">New Booking</h3>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField label="Asset" required>
              <USelect v-model="bookingForm.assetId" :items="assetOptions" value-key="value" label-key="label" />
            </UFormField>

            <UFormField label="Customer Name" required>
              <UInput v-model="bookingForm.customerName" />
            </UFormField>

            <UFormField label="Phone">
              <UInput v-model="bookingForm.customerPhone" />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Start Time" required>
                <UInput v-model="bookingForm.startTime" type="datetime-local" />
              </UFormField>
              <UFormField label="End Time" required>
                <UInput v-model="bookingForm.endTime" type="datetime-local" />
              </UFormField>
            </div>

            <UFormField label="Notes">
              <UInput v-model="bookingForm.notes" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="neutral" variant="ghost" label="Cancel" @click="showBookingModal = false" />
              <UButton color="primary" label="Create Booking" :loading="saving" @click="saveBooking" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
