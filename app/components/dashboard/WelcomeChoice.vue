<!-- ============================================
  🏪 WELCOME CHOICE SCREEN
  First-time users choose: Join Company (Staff) or Create Company (Owner)
============================================ -->

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4"
  >
    <div class="w-full max-w-2xl">
      <!-- Header -->
      <div class="text-center mb-8">
        <div
          class="w-20 h-20 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center"
        >
          <span class="text-4xl">🏪</span>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ t("shop.welcome.title", "Welcome to BNOS") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          {{ t("shop.welcome.subtitle", "Choose how you want to get started") }}
        </p>
      </div>

      <!-- Choice Cards -->
      <div class="grid md:grid-cols-2 gap-6">
        <!-- Join Company (Staff) -->
        <button
          type="button"
          class="group p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl text-left"
          :class="
            selectedMode === 'join'
              ? 'border-green-500 ring-2 ring-green-500/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-green-400'
          "
          @click="selectedMode = 'join'"
        >
          <div class="flex items-center gap-4 mb-4">
            <div
              class="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-user-group"
                class="w-7 h-7 text-green-600"
              />
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ t("shop.welcome.joinTitle", "Join a Company") }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ t("shop.welcome.joinSubtitle", "I'm an employee") }}
              </p>
            </div>
          </div>
          <p class="text-gray-600 dark:text-gray-400 text-sm">
            {{
              t(
                "shop.welcome.joinDescription",
                "Enter company code to connect and sync data"
              )
            }}
          </p>
        </button>

        <!-- Create Company (Owner) -->
        <button
          type="button"
          class="group p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl text-left"
          :class="
            selectedMode === 'create'
              ? 'border-primary-500 ring-2 ring-primary-500/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
          "
          @click="selectedMode = 'create'"
        >
          <div class="flex items-center gap-4 mb-4">
            <div
              class="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-building-storefront"
                class="w-7 h-7 text-primary-600"
              />
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ t("shop.welcome.createTitle", "Create a Company") }}
              </h3>
              <p class="text-sm text-gray-500">
                {{ t("shop.welcome.createSubtitle", "I'm the owner") }}
              </p>
            </div>
          </div>
          <p class="text-gray-600 dark:text-gray-400 text-sm">
            {{
              t(
                "shop.welcome.createDescription",
                "Set up your shop and get a code for staff"
              )
            }}
          </p>
        </button>
      </div>

      <!-- Join Company Form (shown when join is selected) -->
      <Transition name="slide-down">
        <div v-if="selectedMode === 'join'" class="mt-6">
          <UCard>
            <div class="space-y-4">
              <h4 class="font-semibold text-gray-900 dark:text-white">
                {{ t("shop.welcome.enterCode", "Enter Company Code") }}
              </h4>

              <UInput
                v-model="companyCodeInput"
                :placeholder="'XXXX-XXXX-XXXX'"
                size="xl"
                class="text-center font-mono text-xl tracking-widest w-full"
                icon="i-heroicons-key"
                @input="formatCodeInput"
              />

              <p class="text-sm text-gray-500 text-center">
                {{
                  t("shop.welcome.codeHint", "Ask your manager for this code")
                }}
              </p>

              <UButton
                block
                size="lg"
                color="green"
                :loading="isConnecting"
                :disabled="!isValidCode"
                @click="handleJoinCompany"
              >
                <UIcon name="i-heroicons-link" class="w-5 h-5 mr-2" />
                {{ t("shop.welcome.connect", "Connect & Sync") }}
              </UButton>

              <p v-if="errorMsg" class="text-sm text-red-500 text-center">
                {{ errorMsg }}
              </p>
            </div>
          </UCard>
        </div>
      </Transition>

      <!-- Create Company Button (shown when create is selected) -->
      <Transition name="slide-down">
        <div v-if="selectedMode === 'create'" class="mt-6">
          <UCard>
            <div class="space-y-4">
              <h4 class="font-semibold text-gray-900 dark:text-white">
                {{
                  t("shop.welcome.readyToCreate") ||
                  "Ready to set up your shop?"
                }}
              </h4>

              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{
                  t("shop.welcome.createHint") ||
                  "Setup your shop and get a unique code to share"
                }}
              </p>

              <UButton
                block
                size="lg"
                color="primary"
                @click="handleCreateCompany"
              >
                <UIcon name="i-heroicons-rocket-launch" class="w-5 h-5 mr-2" />
                {{ t("shop.welcome.startSetup") || "Start Setup" }}
              </UButton>
            </div>
          </UCard>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: "join"): void;
  (e: "create"): void;
}>();

const { t } = useI18n();
const toast = useToast();
const company = useCompany();
const nostrData = useNostrData();

// State
const selectedMode = ref<"join" | "create" | null>(null);
const companyCodeInput = ref("");
const isConnecting = ref(false);
const errorMsg = ref("");

// Computed
const isValidCode = computed(() =>
  company.isValidCompanyCode(companyCodeInput.value)
);

// Methods
function formatCodeInput(event: Event) {
  const input = event.target as HTMLInputElement;
  let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Add dashes automatically
  if (value.length > 4) {
    value = value.slice(0, 4) + "-" + value.slice(4);
  }
  if (value.length > 9) {
    value = value.slice(0, 9) + "-" + value.slice(9);
  }
  if (value.length > 14) {
    value = value.slice(0, 14);
  }

  companyCodeInput.value = value;
}

async function handleJoinCompany() {
  if (!isValidCode.value) return;

  isConnecting.value = true;
  errorMsg.value = "";

  try {
    // Clear any existing company data first
    company.clearCompanyCode();

    // First, try to discover the owner's pubkey by company code
    // This is needed so we can fetch their products/orders
    let ownerPubkey: string | null = null;
    try {
      ownerPubkey = await nostrData.discoverOwnerByCompanyCode(
        companyCodeInput.value
      );
      console.log(
        "[WelcomeChoice] Discovered owner pubkey:",
        ownerPubkey?.slice(0, 8) + "..."
      );
    } catch (e) {
      console.warn("[WelcomeChoice] Could not discover owner:", e);
    }

    // Set the new company code WITH owner pubkey
    await company.setCompanyCode(
      companyCodeInput.value,
      ownerPubkey || undefined
    );
    company.toggleCompanyCode(true);

    toast.add({
      title: t("auth.company.connectSuccess") || "Connected!",
      description: t("auth.company.syncingData") || "Syncing company data...",
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    // Sync data from relays (now will include owner's data)
    try {
      await nostrData.fullSync();
    } catch (syncError) {
      console.warn("[Welcome] Sync failed:", syncError);
    }

    emit("join");

    // Reload to show dashboard
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    errorMsg.value =
      t("auth.company.connectError") ||
      "Failed to connect. Please check the code.";
  } finally {
    isConnecting.value = false;
  }
}

function handleCreateCompany() {
  // Clear any existing company code for fresh setup
  company.clearCompanyCode();
  emit("create");
}
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
