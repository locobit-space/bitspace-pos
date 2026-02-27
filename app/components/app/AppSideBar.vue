<template>
  <div
    class="flex flex-col h-full bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 transition-all duration-300 ease-in-out"
    :class="[isExpanded ? 'w-64' : 'w-[4.5rem]']"
  >
    <!-- Navigation Items -->
    <ul
      class="flex-1 p-2 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
    >
      <li v-for="(item, index) in items" :key="index">
        <UTooltip
          :text="!isExpanded ? item.label : undefined"
          :popper="{ placement: 'right' }"
        >
          <NuxtLinkLocale
            :to="item.to"
            class="flex items-center px-3 py-2 rounded-xl transition-all duration-200 group relative overflow-hidden"
            :class="[
              isExpanded ? 'justify-start' : 'justify-center',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
            ]"
            active-class="bg-primary-50 dark:bg-primary-900/10 text-primary-600 dark:text-primary-400"
            @click="$emit('navigate')"
          >
            <Icon
              :name="item.icon"
              class="shrink-0 transition-all duration-300"
              :class="isExpanded ? 'size-5' : 'size-6'"
            />

            <span
              class="text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out"
              :class="[
                isExpanded
                  ? 'max-w-[200px] opacity-100 ml-3'
                  : 'max-w-0 opacity-0 ml-0',
              ]"
            >
              {{ item.label }}
            </span>
          </NuxtLinkLocale>
        </UTooltip>
      </li>
    </ul>

    <!-- Toggle Button -->
    <div
      class="p-4 border-t border-gray-100 dark:border-gray-800 flex"
      :class="isExpanded ? 'justify-end' : 'justify-center'"
    >
      <UButton
        color="gray"
        variant="ghost"
        :icon="
          isExpanded
            ? 'i-heroicons-chevron-double-left-20-solid'
            : 'i-heroicons-chevron-double-right-20-solid'
        "
        class="rounded-xl"
        @click="isExpanded = !isExpanded"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits(["navigate"]);

const { t } = useI18n();
const shop = useShop();

// Sidebar expansion state
const isExpanded = ref(false);

// All navigation items with their feature key
const allItems = computed(() => [
  {
    label: t("navigation.dashboard"),
    to: "/",
    icon: "solar:home-smile-linear",
    feature: null, // Always visible
  },
  {
    label: t("navigation.pos"),
    to: "/pos",
    icon: "solar:shop-2-linear",
    feature: "pos",
  },
  {
    label: t("navigation.orders"),
    to: "/orders",
    icon: "solar:bag-4-linear",
    feature: "orders",
  },
  {
    label: t("navigation.products"),
    to: "/products",
    icon: "solar:box-minimalistic-linear",
    feature: "products",
  },
  {
    label: "Recipes",
    to: "/recipes",
    icon: "solar:chef-hat-linear",
    feature: "recipes",
  },
  {
    label: "Ingredients",
    to: "/ingredients",
    icon: "solar:leaf-linear",
    feature: "ingredients",
  },
  {
    label: t("navigation.customers", "Customers"),
    to: "/customers",
    icon: "solar:users-group-rounded-linear",
    feature: "customers",
  },
  {
    label: t("memberships.title", "Memberships"),
    to: "/memberships",
    icon: "solar:card-2-linear",
    feature: "memberships",
  },
  {
    label: t("navigation.inventory", "Inventory"),
    to: "/inventory",
    icon: "solar:archive-linear",
    feature: "inventory",
  },
  {
    label: t("navigation.kitchen", "Kitchen"),
    to: "/kitchen",
    icon: "solar:fire-linear",
    feature: "kitchen",
  },
  {
    label: t("navigation.reports", "Reports"),
    to: "/reports",
    icon: "solar:chart-2-linear",
    feature: "reports",
  },
  {
    label: t("navigation.accounting", "Accounting"),
    to: "/accounting",
    icon: "solar:calculator-linear",
    feature: "accounting",
  },
  {
    label: "Projects",
    to: "/projects",
    icon: "solar:folder-with-files-linear",
    feature: "projects",
  },
  {
    label: t("navigation.invoicing", "Invoicing"),
    to: "/invoicing",
    icon: "solar:bill-list-linear",
    feature: "invoicing",
  },
  {
    label: t("navigation.delivery", "Delivery"),
    to: "/delivery",
    icon: "lucide:truck",
    feature: "delivery",
  },
  {
    label: t("navigation.contracts", "Contracts"),
    to: "/contracts",
    icon: "solar:clipboard-check-linear",
    feature: "contracts",
  },
  {
    label: t("navigation.settings", "Settings"),
    to: "/settings",
    icon: "solar:settings-minimalistic-linear",
    feature: "settings",
  },
]);

// Filter items based on enabled features
const items = computed(() => {
  const enabledFeatures = shop.shopConfig.value?.enabledFeatures;
  if (!enabledFeatures) return allItems.value;

  return allItems.value.filter((item) => {
    // Always show items without a feature requirement
    if (!item.feature) return true;
    // Check if feature is enabled
    return (enabledFeatures as any)[item.feature] === true;
  });
});
</script>

<style scoped>
/* Hide scrollbar but keep scroll functionality */
ul {
  -ms-overflow-style: none;
  /* IE and Edge */
  scrollbar-width: none;
  /* Firefox */
}

ul::-webkit-scrollbar {
  display: none;
  /* Chrome, Safari and Opera */
}
</style>
