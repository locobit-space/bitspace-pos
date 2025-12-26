<template>
  <div class="p-4 space-y-6 max-w-4xl mx-auto">
    <!-- Profile Header Card (YakiHonne-inspired) -->
    <div
      class="bg-linear-to-br from-primary-200 to-primary-600 rounded-2xl p-6 relative overflow-hidden"
    >
      <!-- Background Pattern -->
      <div
        class="absolute inset-0 opacity-20"
        style="
          background-image: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.3) 1px,
            transparent 1px
          );
          background-size: 20px 20px;
        "
      />

      <div class="relative flex items-center gap-6">
        <!-- Avatar -->
        <div class="relative">
          <img
            :src="userProfile.avatar || '/default-avatar.png'"
            :alt="userProfile.name"
            class="w-20 h-20 rounded-full border-4 border-primary-500 object-cover"
          />
          <div
            class="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-900"
          />
        </div>

        <!-- User Info -->
        <div class="flex-1">
          <h2 class="text-xl font-bold text-white">
            {{ userProfile.name || $t("account.noName") }}
          </h2>
          <p class="text-gray-400 text-sm font-mono">
            {{ userProfile.npub || "@anonymous" }}
          </p>
          <p
            v-if="userProfile.nip05"
            class="text-primary-400 text-sm flex items-center gap-1 mt-1"
          >
            <UIcon name="i-heroicons-check-badge-solid" />
            {{ userProfile.nip05 }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2">
          <UButton
            color="primary"
            variant="solid"
            @click="navigateTo('/settings/account')"
          >
            {{ $t("account.viewProfile") || "View profile" }}
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            class="!text-white !border-gray-600"
            @click="navigateTo('/settings/account#edit')"
          >
            {{ $t("account.editProfile") || "Edit profile" }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Settings Grid - 2 columns -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <!-- Your Keys -->
      <NuxtLink
        to="/settings/security"
        class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-700 hover:shadow-md transition-all"
      >
        <div class="p-4 flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
          >
            <UIcon name="i-heroicons-key" class="w-6 h-6 text-red-600" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{ $t("settings.security.yourKeys") || "Your keys" }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
              {{ $t("settings.security.subtitle") }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="w-5 h-5 text-gray-400 flex-shrink-0"
          />
        </div>
      </NuxtLink>

      <!-- Relays Settings -->
      <NuxtLink
        to="/settings/relays"
        class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition-all"
      >
        <div class="p-4 flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-server-stack"
              class="w-6 h-6 text-violet-600"
            />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{ $t("settings.relays.title") }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
              {{ $t("settings.relays.subtitle") }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="w-5 h-5 text-gray-400 flex-shrink-0"
          />
        </div>
      </NuxtLink>

      <!-- Wallets (Lightning) -->
      <NuxtLink
        to="/settings/lightning"
        class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all"
      >
        <div class="p-4 flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"
          >
            <span class="text-xl">⚡</span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{ $t("settings.wallets") || "Wallets" }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
              {{ $t("settings.lightning.subtitle") }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="w-5 h-5 text-gray-400 flex-shrink-0"
          />
        </div>
      </NuxtLink>

      <!-- Customization -->
      <NuxtLink
        to="/settings/customization"
        class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md transition-all"
      >
        <div class="p-4 flex items-center gap-4">
          <div
            class="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center"
          >
            <UIcon name="i-heroicons-sparkles" class="w-6 h-6 text-teal-600" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{ $t("settings.customization.title") }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
              {{ $t("settings.customization.subtitle") }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="w-5 h-5 text-gray-400 flex-shrink-0"
          />
        </div>
      </NuxtLink>
    </div>

    <!-- Business Settings Section -->
    <div>
      <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        {{ $t("settings.sectionBusiness") }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <!-- General Store Settings -->
        <NuxtLink
          to="/settings/general"
          class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-md transition-all"
        >
          <div class="p-4 flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-building-storefront"
                class="w-6 h-6 text-gray-600"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.general.title") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ $t("settings.general.subtitle") }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-5 h-5 text-gray-400 flex-shrink-0"
            />
          </div>
        </NuxtLink>

        <!-- Tax -->
        <NuxtLink
          to="/settings/tax"
          class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md transition-all"
        >
          <div class="p-4 flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-receipt-percent"
                class="w-6 h-6 text-green-600"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.tax.title") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ $t("settings.tax.subtitle") }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-5 h-5 text-gray-400 flex-shrink-0"
            />
          </div>
        </NuxtLink>

        <!-- Receipt -->
        <NuxtLink
          to="/settings/receipt"
          class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
        >
          <div class="p-4 flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-document-text"
                class="w-6 h-6 text-indigo-600"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.receipt.title") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ $t("settings.receipt.subtitle") }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-5 h-5 text-gray-400 flex-shrink-0"
            />
          </div>
        </NuxtLink>

        <!-- Users & Permissions -->
        <NuxtLink
          to="/settings/users"
          class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
        >
          <div class="p-4 flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
            >
              <UIcon name="i-heroicons-users" class="w-6 h-6 text-blue-600" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.users.title") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ $t("settings.users.subtitle") }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-5 h-5 text-gray-400 flex-shrink-0"
            />
          </div>
        </NuxtLink>

        <!-- Tables -->
        <NuxtLink
          to="/settings/tables"
          class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all"
        >
          <div class="p-4 flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-qr-code"
                class="w-6 h-6 text-purple-600"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("tables.title") || "Tables" }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ $t("tables.description") || "QR code ordering" }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-5 h-5 text-gray-400 flex-shrink-0"
            />
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- System Settings Section -->
    <div>
      <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        {{ $t("settings.sectionSystem") }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <!-- Backup -->
        <NuxtLink
          to="/settings/backup"
          class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-md transition-all"
        >
          <div class="p-4 flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-cloud-arrow-up"
                class="w-6 h-6 text-cyan-600"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.backup.title") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ $t("settings.backup.subtitle") }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-5 h-5 text-gray-400 flex-shrink-0"
            />
          </div>
        </NuxtLink>

        <!-- Audit Log -->
        <NuxtLink
          to="/settings/audit-log"
          class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md transition-all"
        >
          <div class="p-4 flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-shield-check"
                class="w-6 h-6 text-rose-600"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.auditLog.title") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ $t("settings.auditLog.subtitle") }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-5 h-5 text-gray-400 flex-shrink-0"
            />
          </div>
        </NuxtLink>

        <!-- Features -->
        <NuxtLink
          to="/settings/features"
          class="block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition-all"
        >
          <div class="p-4 flex items-center gap-4">
            <div
              class="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-squares-plus"
                class="w-6 h-6 text-orange-600"
              />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ $t("settings.features.title") }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                {{ $t("settings.features.subtitle") }}
              </p>
            </div>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-5 h-5 text-gray-400 flex-shrink-0"
            />
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const nostrRelay = useNostrRelay();

// User profile data
const userProfile = ref({
  name: "",
  avatar: "",
  npub: "",
  nip05: "",
});

// Load user profile
async function loadUserProfile() {
  try {
    // Try to get from localStorage first
    const storedProfile = localStorage.getItem("nostr_user_profile");
    if (storedProfile) {
      const profile = JSON.parse(storedProfile);
      userProfile.value = {
        name: profile.name || profile.display_name || "",
        avatar: profile.picture || "",
        npub: profile.npub || "",
        nip05: profile.nip05 || "",
      };
    }

    // Try to get npub from localStorage
    const npub = localStorage.getItem("nostr_npub");
    if (npub) {
      userProfile.value.npub = npub.slice(0, 16) + "..." + npub.slice(-8);
    }
  } catch (error) {
    console.error("Failed to load user profile:", error);
  }
}

// Initialize
onMounted(() => {
  loadUserProfile();
});

// Set page title
useHead({
  title: t("settings.title"),
});
</script>

<style scoped>
/* Italic serif font for settings title like YakiHonne */
.font-serif {
  font-family: Georgia, "Times New Roman", Times, serif;
}
</style>
