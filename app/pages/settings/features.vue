<!-- pages/settings/features.vue -->
<!-- ⚙️ Feature Toggle Settings - Enable/Disable Shop Modules -->
<script setup lang="ts">
import { getDefaultFeatures, type EnabledFeatures } from '~/composables/use-shop';

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
});

const { t, locale } = useI18n();
const shop = useShop();
const toast = useToast();

const isLaoLocale = computed(() => locale.value.startsWith('lo'));

// Local state for features
const features = ref<EnabledFeatures>({
  products: true,
  orders: true,
  pos: true,
  reports: true,
  settings: true,
  customers: true,
  inventory: true,
  kitchen: false,
  recipes: false,
  ingredients: false,
  memberships: false,
  accounting: false,
  invoicing: false,
  delivery: false,
  loyalty: false,
});

const isSaving = ref(false);

// Feature definitions with metadata
const featureGroups = computed(() => [
  {
    title: t('settings.features.core') || 'Core Features',
    titleLao: 'ຄຸນສົມບັດຫຼັກ',
    description: t('settings.features.coreDesc') || 'Essential features that are always available',
    features: [
      { key: 'products', icon: '📦', label: 'Products & Categories', labelLao: 'ສິນຄ້າ & ປະເພດ', locked: true },
      { key: 'orders', icon: '🧾', label: 'Orders', labelLao: 'ອໍເດີ້', locked: true },
      { key: 'pos', icon: '⚡', label: 'Point of Sale', labelLao: 'ຈຸດຂາຍ', locked: true },
      { key: 'reports', icon: '📊', label: 'Reports', labelLao: 'ລາຍງານ', locked: true },
      { key: 'settings', icon: '⚙️', label: 'Settings', labelLao: 'ການຕັ້ງຄ່າ', locked: true },
    ],
  },
  {
    title: t('settings.features.business') || 'Business Features',
    titleLao: 'ຄຸນສົມບັດທຸລະກິດ',
    description: t('settings.features.businessDesc') || 'Optional modules for your business needs',
    features: [
      { key: 'customers', icon: '👥', label: 'Customer Management', labelLao: 'ຈັດການລູກຄ້າ', locked: false },
      { key: 'inventory', icon: '📦', label: 'Inventory & Stock', labelLao: 'ຄົງຄັງ & ສະຕ໊ອກ', locked: false },
      { key: 'memberships', icon: '💳', label: 'Memberships', labelLao: 'ສະມາຊິກ', locked: false },
      { key: 'loyalty', icon: '⭐', label: 'Loyalty Points', labelLao: 'ຄະແນນສະສົມ', locked: false },
    ],
  },
  {
    title: t('settings.features.restaurant') || 'Restaurant Features',
    titleLao: 'ຄຸນສົມບັດຮ້ານອາຫານ',
    description: t('settings.features.restaurantDesc') || 'Features for food service businesses',
    features: [
      { key: 'kitchen', icon: '🍳', label: 'Kitchen Display', labelLao: 'ຈໍສະແດງເຮືອນຄົວ', locked: false },
      { key: 'recipes', icon: '📖', label: 'Recipes', labelLao: 'ສູດອາຫານ', locked: false },
      { key: 'ingredients', icon: '🥬', label: 'Ingredients', labelLao: 'ວັດຖຸດິບ', locked: false },
      { key: 'delivery', icon: '🚗', label: 'Delivery', labelLao: 'ຈັດສົ່ງ', locked: false },
    ],
  },
  {
    title: t('settings.features.finance') || 'Finance Features',
    titleLao: 'ຄຸນສົມບັດການເງິນ',
    description: t('settings.features.financeDesc') || 'Advanced financial management',
    features: [
      { key: 'accounting', icon: '🧮', label: 'Accounting', labelLao: 'ບັນຊີ', locked: false },
      { key: 'invoicing', icon: '🧾', label: 'Invoicing', labelLao: 'ໃບແຈ້ງໜີ້', locked: false },
    ],
  },
]);

// Initialize from shop config
onMounted(async () => {
  await shop.init();
  if (shop.shopConfig.value?.enabledFeatures) {
    features.value = { ...shop.shopConfig.value.enabledFeatures };
  }
});

// Reset to defaults based on shop type
function resetToDefaults() {
  const shopType = shop.shopConfig.value?.shopType || 'other';
  features.value = getDefaultFeatures(shopType);
  toast.add({
    title: t('settings.features.resetSuccess') || 'Reset to defaults',
    icon: 'i-heroicons-arrow-path',
    color: 'info',
  });
}

// Save features
async function saveFeatures() {
  isSaving.value = true;
  try {
    await shop.saveShopConfig({ enabledFeatures: features.value });
    toast.add({
      title: t('common.saved') || 'Saved',
      description: t('settings.features.savedDesc') || 'Feature settings updated',
      icon: 'i-heroicons-check-circle',
      color: 'success',
    });
  } catch (e) {
    toast.add({
      title: t('common.error'),
      description: String(e),
      color: 'error',
    });
  } finally {
    isSaving.value = false;
  }
}

// Toggle feature
function toggleFeature(key: string) {
  if (key in features.value) {
    (features.value as any)[key] = !(features.value as any)[key];
  }
}
</script>

<template>
  <div class="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          ⚙️ {{ t('settings.features.title') || 'Shop Features' }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          {{ t('settings.features.subtitle') || 'Enable or disable features for your shop' }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          variant="soft"
          color="neutral"
          icon="i-heroicons-arrow-path"
          @click="resetToDefaults"
        >
          {{ t('common.reset') || 'Reset to Defaults' }}
        </UButton>
        <UButton
          color="primary"
          icon="i-heroicons-check"
          :loading="isSaving"
          @click="saveFeatures"
        >
          {{ t('common.save') || 'Save' }}
        </UButton>
      </div>
    </div>

    <!-- Shop Type Info -->
    <UCard>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-building-storefront" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('settings.features.shopType') || 'Shop Type' }}
          </p>
          <p class="font-semibold text-gray-900 dark:text-white capitalize">
            {{ shop.shopConfig.value?.shopType?.replace(/_/g, ' ') || 'Not set' }}
          </p>
        </div>
      </div>
    </UCard>

    <!-- Feature Groups -->
    <div v-for="group in featureGroups" :key="group.title" class="space-y-3">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ isLaoLocale ? group.titleLao : group.title }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ group.description }}</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="feature in group.features"
          :key="feature.key"
          class="flex items-center justify-between p-4 rounded-xl border transition-colors"
          :class="[
            (features as any)[feature.key]
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
            feature.locked ? 'opacity-80' : 'cursor-pointer hover:border-primary-300 dark:hover:border-primary-700'
          ]"
          @click="!feature.locked && toggleFeature(feature.key)"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ feature.icon }}</span>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ isLaoLocale ? feature.labelLao : feature.label }}
              </p>
              <p v-if="feature.locked" class="text-xs text-gray-500 dark:text-gray-400">
                {{ t('settings.features.alwaysOn') || 'Always enabled' }}
              </p>
            </div>
          </div>
          <USwitch
            :model-value="(features as any)[feature.key]"
            :disabled="feature.locked"
            @update:model-value="toggleFeature(feature.key)"
            @click.stop
          />
        </div>
      </div>
    </div>

    <!-- Help Text -->
    <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
      <div class="flex gap-3">
        <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-sm text-blue-800 dark:text-blue-200">
            {{ t('settings.features.helpText') || 'Disabled features will be hidden from the navigation menu. You can enable them anytime.' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
