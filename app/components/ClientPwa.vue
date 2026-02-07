<template>
  <div>
    <div
      v-if="$pwa?.offlineReady || $pwa?.needRefresh"
      class="my-4 mx-auto max-w-lg"
    >
      <UAlert
        :title="$t('pwa.update_available')"
        variant="subtle"
        :description="$t('pwa.update_desc')"
        icon="i-heroicons-arrow-path"
        :close-button="{
          icon: 'i-heroicons-x-mark',
          color: 'gray',
          variant: 'link',
          padded: false,
        }"
        @close="$pwa.cancelInstall()"
      >
        <template #actions>
          <UButton
            v-if="$pwa?.needRefresh"
            color="primary"
            variant="solid"
            size="xs"
            @click="$pwa.updateServiceWorker()"
          >
            {{ $t("pwa.reload") }}
          </UButton>
          <UButton
            v-else
            color="gray"
            variant="soft"
            size="xs"
            @click="$pwa.cancelInstall()"
          >
            {{ $t("common.close") }}
          </UButton>
        </template>
      </UAlert>
    </div>

    <div v-if="showInstallPrompt" class="my-4 mx-auto max-w-lg">
      <UAlert
        :title="$t('pwa.install_title')"
        variant="subtle"
        :description="$t('pwa.install_desc')"
        icon="i-heroicons-device-phone-mobile"
        :close-button="{
          icon: 'i-heroicons-x-mark',
          color: 'gray',
          variant: 'link',
          padded: false,
        }"
        @close="dismissInstall"
      >
        <template #actions>
          <UButton
            color="primary"
            variant="solid"
            size="xs"
            @click="installPwa"
          >
            {{ $t("pwa.install") }}
          </UButton>
          <UButton
            variant="soft"
            size="xs"
            @click="dismissInstall"
            class="ml-2"
          >
            {{ $t("pwa.later") }}
          </UButton>
        </template>
      </UAlert>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $pwa } = useNuxtApp();
const showInstallPrompt = ref(false);
const deferredPrompt = ref<any>(null);

// Handle PWA Install Prompt
onMounted(() => {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    showInstallPrompt.value = true;
  });
});

const installPwa = async () => {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }
    deferredPrompt.value = null;
    showInstallPrompt.value = false;
  }
};

const dismissInstall = () => {
  showInstallPrompt.value = false;
};
</script>
