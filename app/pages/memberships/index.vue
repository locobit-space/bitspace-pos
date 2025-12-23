<!-- pages/memberships/index.vue -->
<!-- 💳 Membership Management - User-Friendly Check-in & Management -->
<script setup lang="ts">
import type { Membership, MembershipPlan } from '~/types';

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const { t, locale } = useI18n();
const membershipsStore = useMemberships();
const customersStore = useCustomers();
const toast = useToast();
const { format: formatCurrency } = useCurrency();

const isLaoLocale = computed(() => locale.value.startsWith('lo'));

// State
const searchQuery = ref('');
const showAddModal = ref(false);
const showCheckInModal = ref(false);
const selectedMembership = ref<Membership | null>(null);
const activeTab = ref<'members' | 'plans'>('members');

// Form
const memberForm = ref({
  customerId: '',
  planId: '',
  autoRenew: false,
  notes: '',
});

// Initialize
onMounted(async () => {
  await membershipsStore.init();
  await customersStore.init();
});

// Computed
const filteredMemberships = computed(() => {
  if (!searchQuery.value) return membershipsStore.memberships.value;
  return membershipsStore.searchMemberships(searchQuery.value);
});

const customers = computed(() => customersStore.customers.value.map((c) => ({
  value: c.id,
  label: c.name,
})));

const planOptions = computed(() => membershipsStore.plans.value.map((p) => ({
  value: p.id,
  label: isLaoLocale.value && p.nameLao ? p.nameLao : p.name,
})));

// Status helpers
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    suspended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return colors[status] || colors.pending;
}

function getDaysLeft(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}

// Actions
async function handleCheckIn(membership: Membership) {
  await membershipsStore.checkIn(membership.id);
}

async function handleRenew(membership: Membership) {
  await membershipsStore.renewMembership(membership.id);
}

async function handleAddMembership() {
  if (!memberForm.value.customerId || !memberForm.value.planId) {
    toast.add({
      title: t('common.error'),
      description: t('memberships.selectCustomerAndPlan') || 'Please select customer and plan',
      color: 'warning',
    });
    return;
  }

  const customer = customersStore.customers.value.find((c) => c.id === memberForm.value.customerId);
  const plan = membershipsStore.plans.value.find((p) => p.id === memberForm.value.planId);
  
  if (!customer || !plan) return;

  const now = new Date();
  const endDate = new Date(now.getTime() + plan.duration * 24 * 60 * 60 * 1000);

  await membershipsStore.addMembership({
    customerId: customer.id,
    customerName: customer.name,
    planId: plan.id,
    planName: plan.name,
    status: 'active',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    autoRenew: memberForm.value.autoRenew,
    notes: memberForm.value.notes,
  });

  showAddModal.value = false;
  memberForm.value = { customerId: '', planId: '', autoRenew: false, notes: '' };
}

function openCheckIn() {
  showCheckInModal.value = true;
}

async function quickCheckIn() {
  if (!searchQuery.value) return;
  
  const results = membershipsStore.searchMemberships(searchQuery.value);
  if (results.length === 1 && results[0].status === 'active') {
    await membershipsStore.checkIn(results[0].id);
    searchQuery.value = '';
  }
}
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          💳 {{ t('memberships.title') || 'Memberships' }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          {{ t('memberships.subtitle') || 'Manage member subscriptions and check-ins' }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          size="lg"
          color="primary"
          variant="soft"
          icon="i-heroicons-qr-code"
          @click="openCheckIn"
        >
          {{ t('memberships.quickCheckIn') || 'Quick Check-in' }}
        </UButton>
        <UButton
          size="lg"
          color="primary"
          icon="i-heroicons-plus"
          @click="showAddModal = true"
        >
          {{ t('memberships.addMember') || 'Add Member' }}
        </UButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('memberships.active') || 'Active' }}
          </p>
          <p class="text-3xl font-bold text-green-600 dark:text-green-400">
            {{ membershipsStore.activeMemberships.value.length }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('memberships.expiringSoon') || 'Expiring Soon' }}
          </p>
          <p class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {{ membershipsStore.expiringSoon.value.length }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('memberships.expired') || 'Expired' }}
          </p>
          <p class="text-3xl font-bold text-red-600 dark:text-red-400">
            {{ membershipsStore.expiredMemberships.value.length }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('memberships.total') || 'Total' }}
          </p>
          <p class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ membershipsStore.memberships.value.length }}
          </p>
        </div>
      </UCard>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 dark:border-gray-700">
      <nav class="flex gap-4">
        <button
          v-for="tab in [
            { id: 'members', label: t('memberships.members') || 'Members', icon: '👥' },
            { id: 'plans', label: t('memberships.plans') || 'Plans', icon: '📋' },
          ]"
          :key="tab.id"
          class="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === tab.id
            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          @click="activeTab = tab.id as typeof activeTab"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </nav>
    </div>

    <!-- Members Tab -->
    <div v-if="activeTab === 'members'" class="space-y-4">
      <!-- Search -->
      <UInput
        v-model="searchQuery"
        :placeholder="t('memberships.searchPlaceholder') || 'Search by name...'"
        icon="i-heroicons-magnifying-glass"
        size="lg"
        @keyup.enter="quickCheckIn"
      />

      <!-- Members List -->
      <div v-if="filteredMemberships.length > 0" class="space-y-3">
        <div
          v-for="member in filteredMemberships"
          :key="member.id"
          class="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <!-- Avatar -->
          <div class="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <span class="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {{ (member.customerName || 'M').charAt(0).toUpperCase() }}
            </span>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-gray-900 dark:text-white truncate">
              {{ member.customerName || t('common.unknown') }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ member.planName }} • {{ member.checkInCount }} {{ t('memberships.checkIns') || 'check-ins' }}
            </p>
            <div class="flex items-center gap-2 mt-1">
              <span
                :class="getStatusColor(member.status)"
                class="px-2 py-0.5 rounded-full text-xs font-medium"
              >
                {{ t(`memberships.status.${member.status}`) || member.status }}
              </span>
              <span 
                v-if="member.status === 'active'"
                class="text-xs"
                :class="getDaysLeft(member.endDate) <= 7 ? 'text-yellow-600' : 'text-gray-400'"
              >
                {{ getDaysLeft(member.endDate) }} {{ t('memberships.daysLeft') || 'days left' }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <UButton
              v-if="member.status === 'active'"
              size="lg"
              color="success"
              icon="i-heroicons-check-circle"
              variant="soft"
              @click="handleCheckIn(member)"
            >
              {{ t('memberships.checkIn') || 'Check In' }}
            </UButton>
            <UButton
              v-if="member.status === 'expired'"
              size="sm"
              color="primary"
              icon="i-heroicons-arrow-path"
              variant="soft"
              @click="handleRenew(member)"
            >
              {{ t('memberships.renew') || 'Renew' }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <div class="text-6xl mb-4">💳</div>
        <p class="text-gray-500 dark:text-gray-400">
          {{ t('memberships.noMembers') || 'No members yet' }}
        </p>
        <UButton
          class="mt-4"
          color="primary"
          @click="showAddModal = true"
        >
          {{ t('memberships.addFirstMember') || 'Add Your First Member' }}
        </UButton>
      </div>
    </div>

    <!-- Plans Tab -->
    <div v-if="activeTab === 'plans'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard
        v-for="plan in membershipsStore.plans.value"
        :key="plan.id"
        class="relative overflow-hidden"
      >
        <div class="text-center space-y-3">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ isLaoLocale && plan.nameLao ? plan.nameLao : plan.name }}
          </h3>
          <p class="text-3xl font-bold text-primary-600 dark:text-primary-400">
            {{ formatCurrency(plan.price) }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ plan.duration }} {{ t('common.days') || 'days' }}
          </p>
          <ul class="text-sm text-left space-y-1">
            <li
              v-for="(benefit, i) in (isLaoLocale && plan.benefitsLao ? plan.benefitsLao : plan.benefits)"
              :key="i"
              class="flex items-center gap-2 text-gray-600 dark:text-gray-400"
            >
              <UIcon name="i-heroicons-check" class="w-4 h-4 text-green-500" />
              {{ benefit }}
            </li>
          </ul>
        </div>
      </UCard>
    </div>

    <!-- Add Member Modal -->
    <UModal v-model:open="showAddModal">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t('memberships.addMember') || 'Add Member' }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('customers.customer') || 'Customer'">
            <USelect
              v-model="memberForm.customerId"
              :items="customers"
              :placeholder="t('memberships.selectCustomer') || 'Select customer'"
            />
          </UFormField>
          <UFormField :label="t('memberships.plan') || 'Plan'">
            <USelect
              v-model="memberForm.planId"
              :items="planOptions"
              :placeholder="t('memberships.selectPlan') || 'Select plan'"
            />
          </UFormField>
          <UFormField :label="t('orders.notes') || 'Notes'">
            <UTextarea
              v-model="memberForm.notes"
              :placeholder="t('memberships.notesPlaceholder') || 'Optional notes...'"
              :rows="2"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showAddModal = false">
            {{ t('common.cancel') }}
          </UButton>
          <UButton color="primary" @click="handleAddMembership">
            {{ t('memberships.addMember') || 'Add Member' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Quick Check-in Modal -->
    <UModal v-model:open="showCheckInModal">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          ✅ {{ t('memberships.quickCheckIn') || 'Quick Check-in' }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UInput
            v-model="searchQuery"
            :placeholder="t('memberships.searchToCheckIn') || 'Search member name...'"
            icon="i-heroicons-magnifying-glass"
            size="lg"
            autofocus
          />
          
          <div v-if="filteredMemberships.length > 0" class="space-y-2 max-h-64 overflow-y-auto">
            <button
              v-for="member in filteredMemberships.filter(m => m.status === 'active')"
              :key="member.id"
              class="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
              @click="handleCheckIn(member); showCheckInModal = false; searchQuery = ''"
            >
              <div class="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span class="text-xl font-bold text-primary-600">
                  {{ (member.customerName || 'M').charAt(0) }}
                </span>
              </div>
              <div class="flex-1">
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ member.customerName }}
                </p>
                <p class="text-sm text-gray-500">{{ member.planName }}</p>
              </div>
              <UIcon name="i-heroicons-arrow-right-circle" class="w-8 h-8 text-green-500" />
            </button>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
