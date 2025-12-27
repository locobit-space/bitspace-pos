<!-- components/common/SupportModal.vue -->
<script setup lang="ts">
const config = useRuntimeConfig();
const { t } = useI18n();
const toast = useToast();

const open = defineModel<boolean>("open", { default: false });

// Get developer Lightning address
const lightningAddress = computed(() => {
  if (import.meta.client) {
    return (
      localStorage.getItem("bitspace_developer_lud16") ||
      config.public?.developerLud16 ||
      ""
    );
  }
  return "";
});

const developerName = computed(() => {
  return config.public?.developerName || "BitSpace Developer";
});

// Copy address to clipboard
const copyAddress = async () => {
  if (!lightningAddress.value) return;

  try {
    await navigator.clipboard.writeText(lightningAddress.value);
    toast.add({
      title: t("support.copied") || "Copied!",
      description:
        t("support.addressCopied") || "Lightning address copied to clipboard",
      icon: "i-heroicons-clipboard-document-check",
      color: "green",
    });
  } catch {
    toast.add({
      title: t("common.error") || "Error",
      description: t("support.copyFailed") || "Failed to copy",
      icon: "i-heroicons-exclamation-circle",
      color: "red",
    });
  }
};

// Open Lightning wallet
const openWallet = () => {
  if (!lightningAddress.value) return;
  window.open(`lightning:${lightningAddress.value}`, "_blank");
};

const supportOptions = [
  { amount: "1,000", sats: 1000, label: "☕ Coffee" },
  { amount: "5,000", sats: 5000, label: "🍕 Pizza" },
  { amount: "10,000", sats: 10000, label: "🍺 Beer" },
  { amount: "50,000", sats: 50000, label: "🎉 Celebrate" },
];
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl"
            >
              ☕
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t("support.title") || "Support Development" }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ t("support.subtitle") || "Buy the developer a coffee!" }}
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Thank You Message -->
          <div class="text-center">
            <p class="text-gray-600 dark:text-gray-400">
              {{
                t("support.message") ||
                "Thank you for using BitSpace POS! Your support helps us build better software."
              }}
            </p>
          </div>

          <!-- Support Options -->
          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="opt in supportOptions"
              :key="opt.sats"
              class="p-4 border border-gray-200 dark:border-gray-700 rounded-xl text-center hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer transition-all"
            >
              <p class="text-2xl mb-1">{{ opt.label.split(" ")[0] }}</p>
              <p class="font-semibold text-gray-900 dark:text-white">
                {{ opt.amount }} sats
              </p>
              <p class="text-xs text-gray-500">{{ opt.label.split(" ")[1] }}</p>
            </div>
          </div>

          <!-- Lightning Address -->
          <div v-if="lightningAddress" class="space-y-3">
            <p class="text-sm text-gray-500 text-center">
              {{ t("support.orSendDirectly") || "Or send directly to:" }}
            </p>
            <div
              class="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg"
            >
              <Icon
                name="emojione-v1:lightning-mood"
                class="text-xl text-amber-500"
              />
              <code
                class="flex-1 text-sm text-gray-900 dark:text-white truncate"
              >
                {{ lightningAddress }}
              </code>
              <UButton
                color="gray"
                variant="ghost"
                size="sm"
                icon="i-heroicons-clipboard-document"
                @click="copyAddress"
              />
            </div>
          </div>

          <!-- No Address Configured -->
          <div v-else class="text-center py-4">
            <Icon
              name="i-heroicons-exclamation-circle"
              class="text-4xl text-gray-400 mb-2"
            />
            <p class="text-sm text-gray-500">
              {{
                t("support.noAddressConfigured") ||
                "Lightning address not configured"
              }}
            </p>
          </div>

          <!-- Nostr Zap Option -->
          <div class="text-center">
            <p class="text-xs text-gray-500 mb-2">
              {{ t("support.nostrZap") || "You can also zap us on Nostr!" }}
            </p>
            <UButton
              v-if="lightningAddress"
              color="amber"
              variant="soft"
              icon="emojione-v1:lightning-mood"
              @click="openWallet"
            >
              {{ t("support.openWallet") || "Open Lightning Wallet" }}
            </UButton>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between items-center">
            <p class="text-xs text-gray-500">
              ⚡
              {{ t("support.lightningTip") || "Powered by Lightning Network" }}
            </p>
            <UButton
              color="gray"
              variant="outline"
              :label="t('common.close') || 'Close'"
              @click="open = false"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
