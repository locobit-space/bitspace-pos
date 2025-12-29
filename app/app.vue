<script setup lang="ts">
const { locale } = useI18n();
const { initSystemNotifications } = useNotifications();

onMounted(() => {
  initSystemNotifications();
});
</script>

<template>
  <Body :class="locale">
    <UApp>
      <NuxtRouteAnnouncer />
      <VitePwaManifest />
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UApp>
  </Body>
</template>
