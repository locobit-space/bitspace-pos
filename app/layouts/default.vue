<template>
  <div class="h-dvh flex divide-x divide-slate-100 dark:divide-slate-800">
    <aside>
      <AppSideBar class="" />
    </aside>
    <main class="flex-grow overflow-y-auto">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
