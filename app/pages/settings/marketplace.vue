<template>
    <div class="p-4 max-w-2xl mx-auto space-y-6 pb-24">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-6">
            <UButton color="neutral" variant="ghost" icon="i-heroicons-arrow-left" @click="navigateTo('/settings')" />
            <div>
                <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                    {{ $t("settings.marketplace.title", "Marketplace") }}
                </h1>
                <p class="text-sm text-gray-500">
                    {{ $t("settings.marketplace.subtitle", "Store visibility & discovery") }}
                </p>
            </div>
        </div>

        <!-- Current Status Banner -->
        <div class="p-4 rounded-xl border-2" :class="isPublic
            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            ">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center" :class="isPublic
                    ? 'bg-green-100 dark:bg-green-800'
                    : 'bg-gray-200 dark:bg-gray-700'
                    ">
                    <UIcon :name="isPublic ? 'i-heroicons-globe-alt' : 'i-heroicons-lock-closed'" class="w-6 h-6"
                        :class="isPublic ? 'text-green-600' : 'text-gray-500'" />
                </div>
                <div class="flex-1">
                    <h3 class="font-semibold"
                        :class="isPublic ? 'text-green-800 dark:text-green-200' : 'text-gray-900 dark:text-white'">
                        {{ isPublic ? $t("shop.setup.public", "Public") : $t("shop.setup.private", "Private") }}
                    </h3>
                    <p class="text-sm" :class="isPublic ? 'text-green-600 dark:text-green-400' : 'text-gray-500'">
                        {{ isPublic ? $t("shop.setup.publicDesc") : $t("shop.setup.privateDesc") }}
                    </p>
                </div>
                <USwitch :model-value="isPublic" @update:model-value="toggleVisibility" :loading="isSaving" />
            </div>
        </div>

        <!-- Marketplace Fields (only if public) -->
        <div v-if="isPublic" class="space-y-4">
            <!-- Lightning Address -->
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <span class="text-xl">⚡</span>
                        <span class="font-medium">{{ $t("shop.marketplace.lud16", "Lightning Address") }}</span>
                    </div>
                </template>
                <UInput v-model="formData.lud16" placeholder="shop@getalby.com" icon="i-heroicons-bolt" />
                <p class="text-xs text-gray-500 mt-2">
                    {{ $t("shop.marketplace.lud16Hint") }}
                </p>
            </UCard>

            <!-- NIP-05 Verification -->
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-check-badge" class="w-5 h-5 text-blue-500" />
                        <span class="font-medium">{{ $t("shop.marketplace.nip05", "Nostr Verification") }}</span>
                    </div>
                </template>
                <UInput v-model="formData.nip05" placeholder="shop@bnos.space" icon="i-heroicons-check-badge" />
                <p class="text-xs text-gray-500 mt-2">
                    {{ $t("shop.marketplace.nip05Hint") }}
                </p>
            </UCard>

            <!-- Description -->
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-purple-500" />
                        <span class="font-medium">{{ $t("shop.marketplace.description", "Description") }}</span>
                    </div>
                </template>
                <UTextarea v-model="formData.marketplaceDescription"
                    :placeholder="$t('shop.marketplace.descriptionPlaceholder')" :rows="3" />
            </UCard>

            <!-- Services -->
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-squares-2x2" class="w-5 h-5 text-teal-500" />
                        <span class="font-medium">{{ $t("shop.marketplace.services", "Services Offered") }}</span>
                    </div>
                </template>
                <div class="flex flex-wrap gap-2">
                    <button v-for="option in serviceOptions" :key="option.value" type="button"
                        class="px-3 py-2 rounded-lg border-2 text-sm transition-all" :class="formData.services?.includes(option.value)
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                            " @click="toggleService(option.value)">
                        {{ option.label }}
                    </button>
                </div>
            </UCard>

            <!-- Payment Methods -->
            <UCard>
                <template #header>
                    <div class="flex items-center gap-2">
                        <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-amber-500" />
                        <span class="font-medium">{{ $t("shop.marketplace.payments", "Payment Methods") }}</span>
                    </div>
                </template>
                <div class="space-y-3">
                    <div class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                        <div class="flex items-center gap-3">
                            <span class="text-xl">⚡</span>
                            <div>
                                <p class="font-medium text-sm">{{ $t("shop.marketplace.lightning") }}</p>
                                <p class="text-xs text-gray-500">{{ $t("shop.marketplace.lightningDesc") }}</p>
                            </div>
                        </div>
                        <USwitch v-model="formData.acceptsLightning" />
                    </div>

                    <div class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <div class="flex items-center gap-3">
                            <span class="text-xl">₿</span>
                            <div>
                                <p class="font-medium text-sm">{{ $t("shop.marketplace.bitcoin") }}</p>
                                <p class="text-xs text-gray-500">{{ $t("shop.marketplace.bitcoinDesc") }}</p>
                            </div>
                        </div>
                        <USwitch v-model="formData.acceptsBitcoin" />
                    </div>
                </div>
            </UCard>

            <!-- Save Button -->
            <UButton color="primary" size="lg" block icon="i-heroicons-check" :loading="isSaving" @click="saveSettings">
                {{ $t("common.save", "Save Changes") }}
            </UButton>
        </div>

        <!-- Go Public CTA (if private) -->
        <div v-else class="text-center py-8">
            <div
                class="w-20 h-20 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <UIcon name="i-heroicons-globe-alt" class="w-10 h-10 text-primary-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {{ $t("settings.marketplace.goPublic", "Go Public!") }}
            </h3>
            <p class="text-gray-500 mb-6 max-w-sm mx-auto">
                {{ $t("settings.marketplace.goPublicDesc") }}
            </p>
            <UButton color="primary" size="lg" icon="i-heroicons-globe-alt" :loading="isSaving"
                @click="toggleVisibility(true)">
                {{ $t("settings.marketplace.publishNow", "Publish to Marketplace") }}
            </UButton>
        </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    layout: "default",
    middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();
const shop = useShop();

const isSaving = ref(false);

// Form data
const formData = ref({
    lud16: "",
    nip05: "",
    marketplaceDescription: "",
    services: [] as string[],
    acceptsLightning: true,
    acceptsBitcoin: false,
});

// Service options
const serviceOptions = [
    { value: "dine-in", label: "🍽️ Dine-in" },
    { value: "takeaway", label: "🥡 Takeaway" },
    { value: "delivery", label: "🚚 Delivery" },
    { value: "pickup", label: "📦 Pickup" },
    { value: "reservation", label: "📅 Reservation" },
];

// Computed
const isPublic = computed(() => shop.shopConfig.value?.visibility === "public");

// Methods
function toggleService(service: string) {
    if (!formData.value.services) {
        formData.value.services = [];
    }
    const index = formData.value.services.indexOf(service);
    if (index > -1) {
        formData.value.services.splice(index, 1);
    } else {
        formData.value.services.push(service);
    }
}

async function toggleVisibility(newValue: boolean) {
    isSaving.value = true;
    try {
        if (newValue) {
            await shop.publishToMarketplace();
            toast.add({
                title: t("settings.marketplace.published", "Published!"),
                description: t("settings.marketplace.publishedDesc", "Your store is now discoverable"),
                icon: "i-heroicons-check-circle",
                color: "success",
            });
        } else {
            await shop.unpublishFromMarketplace();
            toast.add({
                title: t("settings.marketplace.unpublished", "Private Mode"),
                description: t("settings.marketplace.unpublishedDesc", "Your store is now private"),
                icon: "i-heroicons-lock-closed",
                color: "neutral",
            });
        }
        await loadSettings();
    } catch (error) {
        toast.add({
            title: t("common.error"),
            description: String(error),
            color: "error",
        });
    } finally {
        isSaving.value = false;
    }
}

async function saveSettings() {
    isSaving.value = true;
    try {
        await shop.saveShopConfig({
            lud16: formData.value.lud16 || undefined,
            nip05: formData.value.nip05 || undefined,
            marketplaceDescription: formData.value.marketplaceDescription || undefined,
            services: formData.value.services,
            acceptsLightning: formData.value.acceptsLightning,
            acceptsBitcoin: formData.value.acceptsBitcoin,
        });

        toast.add({
            title: t("common.saved", "Saved!"),
            icon: "i-heroicons-check-circle",
            color: "success",
        });
    } catch (error) {
        toast.add({
            title: t("common.error"),
            description: String(error),
            color: "error",
        });
    } finally {
        isSaving.value = false;
    }
}

function loadSettings() {
    const config = shop.shopConfig.value;
    if (config) {
        formData.value = {
            lud16: config.lud16 || "",
            nip05: config.nip05 || "",
            marketplaceDescription: config.marketplaceDescription || "",
            services: [...(config.services || [])],
            acceptsLightning: config.acceptsLightning ?? true,
            acceptsBitcoin: config.acceptsBitcoin ?? false,
        };
    }
}

// Initialize
onMounted(() => {
    loadSettings();
});

useHead({
    title: t("settings.marketplace.title", "Marketplace Settings"),
});
</script>
