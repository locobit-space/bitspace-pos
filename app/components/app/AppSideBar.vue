<template>
  <div>
    <ul class="p-1">
      <li v-for="(item, index) in items" :key="index">
        <NuxtLinkLocale
          :to="item.to"
          class="flex p-2 transition-all px-3 justify-center rounded-xl hover:bg-gray-100 items-center"
          active-class="bg-primary-100 text-primary-600"
        >
          <span><Icon :name="item.icon" size="24" /></span>
        </NuxtLinkLocale>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const items = [
  {
    label: "Home",
    to: "/",
    icon: "i-heroicons-home",
  },
  {
    label: "Orders",
    to: "/orders",
    icon: "i-heroicons-truck",
  },
  {
    label: "Customers",
    to: "/customers",
    icon: "i-heroicons-users",
  },
  {
    label: "Products",
    to: "/products",
    icon: "i-heroicons-cube",
  },

  {
    label: "Settings",
    to: "/settings",
    icon: "i-heroicons-cog",
  },
];
</script>

<style scoped></style>
