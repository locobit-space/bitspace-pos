<template>
  <div class="px-4 py-8 pb-24 md:p-8 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {{ $t("common.apps", "Apps") }}
      </h1>
      <p class="text-gray-500 dark:text-gray-400">
        {{
          $t(
            "common.appsDescription",
            "Access all your business tools in one place.",
          )
        }}
      </p>
    </div>

    <!-- Apps Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <NuxtLinkLocale
        v-for="(item, index) in items"
        :key="index"
        :to="item.to"
        class="group relative flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-primary-500/30 dark:hover:border-primary-400/30 transition-all duration-300"
      >
        <!-- Icon container with gradient -->
        <div
          class="w-14 h-14 mb-4 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300"
          :class="getIconBackgroundClass(index)"
        >
          <Icon :name="item.icon" size="28" class="text-white" />
        </div>

        <h3
          class="font-semibold text-gray-900 dark:text-white text-center mb-1"
        >
          {{ item.label }}
        </h3>

        <!-- Optional Description (if we had one) or small text -->
        <span
          class="text-xs text-gray-400 dark:text-gray-500 text-center hidden sm:block"
        >
          {{ $t("common.open", "Open") }}
        </span>

        <!-- Arrow on hover -->
        <div
          class="absolute top-3 right-3 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
        >
          <Icon
            name="solar:arrow-right-up-linear"
            class="w-4 h-4 text-gray-400"
          />
        </div>
      </NuxtLinkLocale>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const shop = useShop();

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

useHead({
  title: t("common.apps", "Apps"),
});

// All navigation items (copied from AppSideBar for consistency)
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
    label: t("navigation.recipes"),
    to: "/recipes",
    icon: "solar:chef-hat-linear",
    feature: "recipes",
  },
  {
    label: t("navigation.ingredients"),
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

// Filter items
const items = computed(() => {
  const enabledFeatures = shop.shopConfig.value?.enabledFeatures;
  if (!enabledFeatures) return allItems.value;

  return allItems.value.filter((item) => {
    if (!item.feature) return true;
    return (enabledFeatures as any)[item.feature] === true;
  });
});

// Dynamic gradients for icons
const getIconBackgroundClass = (index: number) => {
  const gradients = [
    "bg-linear-to-br from-blue-500 to-purple-600",
    "bg-linear-to-br from-emerald-400 to-teal-600",
    "bg-linear-to-br from-orange-400 to-pink-600",
    "bg-linear-to-br from-indigo-400 to-blue-600",
    "bg-linear-to-br from-rose-400 to-red-600",
    "bg-linear-to-br from-cyan-400 to-blue-600",
    "bg-linear-to-br from-violet-400 to-purple-600",
    "bg-linear-to-br from-amber-400 to-orange-600",
  ];
  return gradients[index % gradients.length];
};
</script>
