<!-- pages/customers/index.vue -->
<script setup lang="ts">
import type { LoyaltyMember, NostrProfile } from '~/types';

const { t } = useI18n();

// Customer interface extending LoyaltyMember
interface Customer extends Partial<LoyaltyMember> {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  nostrPubkey?: string;
  npub?: string;
  lud16?: string;
  address?: string;
  notes?: string;
  tags: string[];
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
  updatedAt: string;
}

// Mock customers data
const customers = ref<Customer[]>([
  {
    id: '1',
    name: 'ທ່ານ ສົມສັກ ສີຫາລາດ',
    email: 'somsack@email.com',
    phone: '+856 20 5555 1234',
    nostrPubkey: 'npub1abc123...',
    lud16: 'somsack@getalby.com',
    address: 'ບ້ານໂພນສີນວນ, ເມືອງສີສັດຕະນາກ, ນະຄອນຫຼວງວຽງຈັນ',
    notes: 'VIP customer, prefers Lightning payments',
    tags: ['vip', 'lightning'],
    tier: 'gold',
    points: 2500,
    totalOrders: 48,
    totalSpent: 5250000,
    visitCount: 52,
    lastOrderDate: '2024-01-20',
    createdAt: '2023-06-15',
    updatedAt: '2024-01-20',
  },
  {
    id: '2',
    name: 'ນາງ ຄຳລາ ວົງສາ',
    email: 'khamla@email.com',
    phone: '+856 20 5555 5678',
    address: 'ບ້ານທາດຫຼວງ, ເມືອງໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
    tags: ['regular'],
    tier: 'silver',
    points: 1200,
    totalOrders: 25,
    totalSpent: 2850000,
    visitCount: 28,
    lastOrderDate: '2024-01-18',
    createdAt: '2023-08-20',
    updatedAt: '2024-01-18',
  },
  {
    id: '3',
    name: 'ທ່ານ ບຸນມີ ຈັນທະວົງ',
    email: 'bounmy@email.com',
    phone: '+856 20 5555 9012',
    nostrPubkey: 'npub1def456...',
    lud16: 'bounmy@walletofsatoshi.com',
    tags: ['bitcoin', 'new'],
    tier: 'bronze',
    points: 350,
    totalOrders: 8,
    totalSpent: 890000,
    visitCount: 10,
    lastOrderDate: '2024-01-15',
    createdAt: '2023-12-01',
    updatedAt: '2024-01-15',
  },
]);

// Filters
const searchQuery = ref('');
const selectedTier = ref('');
const selectedTag = ref('');

const tierOptions = [
  { value: '', label: t('common.all') },
  { value: 'bronze', label: t('loyalty.bronze') },
  { value: 'silver', label: t('loyalty.silver') },
  { value: 'gold', label: t('loyalty.gold') },
  { value: 'platinum', label: t('loyalty.platinum') },
];

const tagOptions = [
  { value: '', label: t('common.allTags') },
  { value: 'vip', label: 'VIP' },
  { value: 'regular', label: t('customers.regular') },
  { value: 'lightning', label: 'Lightning' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'new', label: t('customers.new') },
];

const filteredCustomers = computed(() => {
  return customers.value.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      customer.phone?.includes(searchQuery.value);
    const matchesTier = !selectedTier.value || customer.tier === selectedTier.value;
    const matchesTag = !selectedTag.value || customer.tags.includes(selectedTag.value);
    return matchesSearch && matchesTier && matchesTag;
  });
});

// Modal states
const showCustomerModal = ref(false);
const showViewModal = ref(false);
const showDeleteModal = ref(false);
const selectedCustomer = ref<Customer | null>(null);
const customerToDelete = ref<Customer | null>(null);
const viewingCustomer = ref<Customer | null>(null);
const saving = ref(false);
const deleting = ref(false);

// Customer form
const customerForm = ref({
  name: '',
  email: '',
  phone: '',
  nostrPubkey: '',
  lud16: '',
  address: '',
  notes: '',
  tags: [] as string[],
});

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('lo-LA', {
    style: 'currency',
    currency: 'LAK',
    minimumFractionDigits: 0,
  }).format(amount);
};

const getTierColor = (tier?: string): string => {
  const colors: Record<string, string> = {
    bronze: 'amber',
    silver: 'gray',
    gold: 'yellow',
    platinum: 'violet',
  };
  return colors[tier || ''] || 'gray';
};

const openCustomerModal = (customer?: Customer) => {
  if (customer) {
    selectedCustomer.value = customer;
    customerForm.value = {
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      nostrPubkey: customer.nostrPubkey || '',
      lud16: customer.lud16 || '',
      address: customer.address || '',
      notes: customer.notes || '',
      tags: [...customer.tags],
    };
  } else {
    selectedCustomer.value = null;
    customerForm.value = {
      name: '',
      email: '',
      phone: '',
      nostrPubkey: '',
      lud16: '',
      address: '',
      notes: '',
      tags: [],
    };
  }
  showCustomerModal.value = true;
};

const viewCustomer = (customer: Customer) => {
  viewingCustomer.value = customer;
  showViewModal.value = true;
};

const confirmDeleteCustomer = (customer: Customer) => {
  customerToDelete.value = customer;
  showDeleteModal.value = true;
};

const saveCustomer = async () => {
  saving.value = true;
  try {
    if (selectedCustomer.value) {
      // Update existing customer
      const index = customers.value.findIndex(c => c.id === selectedCustomer.value!.id);
      if (index !== -1) {
        customers.value[index] = {
          ...customers.value[index],
          ...customerForm.value,
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      // Create new customer
      const newCustomer: Customer = {
        id: Date.now().toString(),
        ...customerForm.value,
        tier: 'bronze',
        points: 0,
        totalOrders: 0,
        totalSpent: 0,
        visitCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      customers.value.push(newCustomer);
    }
    showCustomerModal.value = false;
  } finally {
    saving.value = false;
  }
};

const deleteCustomer = async () => {
  deleting.value = true;
  try {
    if (customerToDelete.value) {
      customers.value = customers.value.filter(c => c.id !== customerToDelete.value!.id);
    }
    showDeleteModal.value = false;
  } finally {
    deleting.value = false;
  }
};

// Pagination
const currentPage = ref(1);
const itemsPerPage = 10;
const totalPages = computed(() => Math.ceil(filteredCustomers.value.length / itemsPerPage));
const paginatedCustomers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredCustomers.value.slice(start, start + itemsPerPage);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      :title="t('customers.title')"
      :description="t('customers.description')"
    >
      <template #right>
        <UButton
          icon="i-heroicons-plus"
          color="primary"
          :label="t('customers.addCustomer')"
          @click="openCustomerModal()"
        />
      </template>

      <template #tabs>
        <UTabs
          variant="link"
          :items="[
            { label: t('customers.all'), value: 'all' },
            { label: t('loyalty.members'), value: 'members' },
            { label: 'VIP', value: 'vip' },
          ]"
        />
      </template>
    </CommonPageHeader>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        :placeholder="t('customers.searchPlaceholder')"
      />
      <USelect
        v-model="selectedTier"
        :options="tierOptions"
        value-attribute="value"
        option-attribute="label"
        :placeholder="t('loyalty.tier')"
      />
      <USelect
        v-model="selectedTag"
        :options="tagOptions"
        value-attribute="value"
        option-attribute="label"
        :placeholder="t('customers.filterByTag')"
      />
      <UButton
        color="gray"
        variant="ghost"
        icon="i-heroicons-arrow-down-tray"
        :label="t('common.export')"
      />
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
      <UCard>
        <div class="flex items-center">
          <div class="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
            <Icon name="i-heroicons-users" class="w-6 h-6 text-blue-500 dark:text-blue-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('customers.total') }}</p>
            <p class="text-2xl font-bold">{{ customers.length }}</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center">
          <div class="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-full">
            <Icon name="i-heroicons-star" class="w-6 h-6 text-yellow-500 dark:text-yellow-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('customers.vipCount') }}</p>
            <p class="text-2xl font-bold">{{ customers.filter(c => c.tags.includes('vip')).length }}</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center">
          <div class="bg-green-100 dark:bg-green-900 p-3 rounded-full">
            <Icon name="i-heroicons-bolt" class="w-6 h-6 text-green-500 dark:text-green-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('customers.lightningUsers') }}</p>
            <p class="text-2xl font-bold">{{ customers.filter(c => c.lud16).length }}</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center">
          <div class="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
            <Icon name="i-heroicons-gift" class="w-6 h-6 text-purple-500 dark:text-purple-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('loyalty.totalPoints') }}</p>
            <p class="text-2xl font-bold">{{ customers.reduce((sum, c) => sum + (c.points || 0), 0).toLocaleString() }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Customers Table -->
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-800">
            <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">{{ t('customers.name') }}</th>
            <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">{{ t('customers.contact') }}</th>
            <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">{{ t('loyalty.tier') }}</th>
            <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">{{ t('loyalty.points') }}</th>
            <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">{{ t('customers.totalSpent') }}</th>
            <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">{{ t('customers.orders') }}</th>
            <th class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">{{ t('customers.lastOrder') }}</th>
            <th class="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="customer in paginatedCustomers"
            :key="customer.id"
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {{ customer.name.charAt(0) }}
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ customer.name }}</p>
                  <div class="flex gap-1 mt-1">
                    <UBadge
                      v-for="tag in customer.tags.slice(0, 2)"
                      :key="tag"
                      size="xs"
                      :color="tag === 'vip' ? 'yellow' : tag === 'lightning' ? 'orange' : 'gray'"
                      variant="subtle"
                    >
                      {{ tag }}
                    </UBadge>
                  </div>
                </div>
              </div>
            </td>
            <td class="py-3 px-4">
              <div class="text-sm">
                <p v-if="customer.email" class="text-gray-600 dark:text-gray-400">{{ customer.email }}</p>
                <p v-if="customer.phone" class="text-gray-500 dark:text-gray-500">{{ customer.phone }}</p>
                <p v-if="customer.lud16" class="text-orange-500 flex items-center gap-1">
                  <Icon name="i-heroicons-bolt" class="w-3 h-3" />
                  {{ customer.lud16 }}
                </p>
              </div>
            </td>
            <td class="py-3 px-4">
              <UBadge
                v-if="customer.tier"
                :color="getTierColor(customer.tier)"
                :label="t(`loyalty.${customer.tier}`)"
              />
            </td>
            <td class="py-3 px-4">
              <span class="font-medium">{{ (customer.points || 0).toLocaleString() }}</span>
            </td>
            <td class="py-3 px-4">
              <span class="font-medium">{{ formatCurrency(customer.totalSpent) }}</span>
            </td>
            <td class="py-3 px-4">
              <span>{{ customer.totalOrders }}</span>
            </td>
            <td class="py-3 px-4">
              <span class="text-gray-500 dark:text-gray-400">{{ customer.lastOrderDate || '-' }}</span>
            </td>
            <td class="py-3 px-4">
              <div class="flex justify-end gap-1">
                <UButton
                  icon="i-heroicons-eye"
                  color="gray"
                  variant="ghost"
                  size="sm"
                  @click="viewCustomer(customer)"
                />
                <UButton
                  icon="i-heroicons-pencil"
                  color="gray"
                  variant="ghost"
                  size="sm"
                  @click="openCustomerModal(customer)"
                />
                <UButton
                  icon="i-heroicons-trash"
                  color="red"
                  variant="ghost"
                  size="sm"
                  @click="confirmDeleteCustomer(customer)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="flex justify-between items-center px-4">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('common.showing') }} {{ paginatedCustomers.length }} {{ t('common.of') }} {{ filteredCustomers.length }} {{ t('common.entries') }}
      </span>
      <UPagination
        v-model="currentPage"
        :page-count="itemsPerPage"
        :total="filteredCustomers.length"
      />
    </div>

    <!-- Add/Edit Customer Modal -->
    <UModal v-model:open="showCustomerModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium">
              {{ selectedCustomer ? t('customers.editCustomer') : t('customers.addCustomer') }}
            </h3>
          </template>

          <form class="space-y-4" @submit.prevent="saveCustomer">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField :label="t('customers.name')" required class="md:col-span-2">
                <UInput v-model="customerForm.name" :placeholder="t('customers.namePlaceholder')" />
              </UFormField>

              <UFormField :label="t('customers.email')">
                <UInput v-model="customerForm.email" type="email" :placeholder="t('customers.emailPlaceholder')" />
              </UFormField>

              <UFormField :label="t('customers.phone')">
                <UInput v-model="customerForm.phone" :placeholder="t('customers.phonePlaceholder')" />
              </UFormField>

              <UFormField :label="t('customers.nostrPubkey')">
                <UInput v-model="customerForm.nostrPubkey" placeholder="npub1..." />
              </UFormField>

              <UFormField :label="t('customers.lightningAddress')">
                <UInput v-model="customerForm.lud16" placeholder="user@getalby.com" />
              </UFormField>

              <UFormField :label="t('customers.address')" class="md:col-span-2">
                <UTextarea v-model="customerForm.address" :placeholder="t('customers.addressPlaceholder')" rows="2" />
              </UFormField>

              <UFormField :label="t('customers.notes')" class="md:col-span-2">
                <UTextarea v-model="customerForm.notes" :placeholder="t('customers.notesPlaceholder')" rows="2" />
              </UFormField>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <UButton color="gray" variant="outline" :label="t('common.cancel')" @click="showCustomerModal = false" />
              <UButton type="submit" color="primary" :loading="saving" :label="selectedCustomer ? t('common.update') : t('common.create')" />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- View Customer Modal -->
    <UModal v-model:open="showViewModal">
      <template #content>
        <UCard v-if="viewingCustomer">
          <template #header>
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {{ viewingCustomer.name.charAt(0) }}
              </div>
              <div>
                <h3 class="text-lg font-medium">{{ viewingCustomer.name }}</h3>
                <UBadge :color="getTierColor(viewingCustomer.tier)" :label="t(`loyalty.${viewingCustomer.tier || 'bronze'}`)" />
              </div>
            </div>
          </template>

          <div class="space-y-6">
            <!-- Contact Info -->
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('customers.contactInfo') }}</h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div v-if="viewingCustomer.email">
                  <p class="text-gray-500 dark:text-gray-400">{{ t('customers.email') }}</p>
                  <p class="font-medium">{{ viewingCustomer.email }}</p>
                </div>
                <div v-if="viewingCustomer.phone">
                  <p class="text-gray-500 dark:text-gray-400">{{ t('customers.phone') }}</p>
                  <p class="font-medium">{{ viewingCustomer.phone }}</p>
                </div>
                <div v-if="viewingCustomer.lud16" class="col-span-2">
                  <p class="text-gray-500 dark:text-gray-400">{{ t('customers.lightningAddress') }}</p>
                  <p class="font-medium text-orange-500">⚡ {{ viewingCustomer.lud16 }}</p>
                </div>
                <div v-if="viewingCustomer.address" class="col-span-2">
                  <p class="text-gray-500 dark:text-gray-400">{{ t('customers.address') }}</p>
                  <p class="font-medium">{{ viewingCustomer.address }}</p>
                </div>
              </div>
            </div>

            <!-- Loyalty Stats -->
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('loyalty.stats') }}</h4>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                  <p class="text-2xl font-bold text-primary-500">{{ viewingCustomer.points?.toLocaleString() || 0 }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('loyalty.points') }}</p>
                </div>
                <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                  <p class="text-2xl font-bold text-green-500">{{ viewingCustomer.totalOrders }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('customers.orders') }}</p>
                </div>
                <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                  <p class="text-2xl font-bold text-blue-500">{{ viewingCustomer.visitCount || 0 }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('customers.visits') }}</p>
                </div>
                <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
                  <p class="text-lg font-bold text-purple-500">{{ formatCurrency(viewingCustomer.totalSpent) }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('customers.totalSpent') }}</p>
                </div>
              </div>
            </div>

            <!-- Tags -->
            <div v-if="viewingCustomer.tags.length">
              <h4 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('customers.tags') }}</h4>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="tag in viewingCustomer.tags"
                  :key="tag"
                  :color="tag === 'vip' ? 'yellow' : tag === 'lightning' ? 'orange' : 'gray'"
                >
                  {{ tag }}
                </UBadge>
              </div>
            </div>

            <!-- Notes -->
            <div v-if="viewingCustomer.notes">
              <h4 class="font-medium text-gray-900 dark:text-white mb-3">{{ t('customers.notes') }}</h4>
              <p class="text-gray-600 dark:text-gray-400 text-sm">{{ viewingCustomer.notes }}</p>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-between">
              <UButton color="gray" variant="ghost" :label="t('customers.viewOrders')" icon="i-heroicons-shopping-bag" :to="`/orders?customer=${viewingCustomer.id}`" />
              <UButton color="gray" variant="outline" :label="t('common.close')" @click="showViewModal = false" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium text-red-600 dark:text-red-400">{{ t('common.confirmDelete') }}</h3>
          </template>

          <p class="text-gray-600 dark:text-gray-400">
            {{ t('customers.deleteConfirmation', { name: customerToDelete?.name }) }}
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="gray" variant="outline" :label="t('common.cancel')" @click="showDeleteModal = false" />
              <UButton color="red" :loading="deleting" :label="t('common.delete')" @click="deleteCustomer" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
