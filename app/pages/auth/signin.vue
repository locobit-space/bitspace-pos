<!-- pages/auth/signin.vue -->
<!-- 🔐 Sign In Page - Hasura Auth + Nostr -->
<script setup lang="ts">
definePageMeta({
  layout: "blank",
});

const { t } = useI18n();

useHead({
  title: t("auth.signin.title") + " - Bitspace POS",
});

const auth = useAuth();
const router = useRouter();
const nostrUser = useNostrUser();
const { syncNostrOwner } = useUsers();

// Form state
const email = ref("");
const password = ref("");
const rememberMe = ref(false);
const showPassword = ref(false);

// UI state
const activeTab = ref<"email" | "nostr">("nostr");
const hasNostr = ref(false);
const nostrConnecting = ref(false);
const showManualNpub = ref(false);
const showNsecInput = ref(false);
const manualNpub = ref("");
const manualNsec = ref("");
const detectedExtension = ref<"alby" | "nos2x" | "unknown" | null>(null);
const nostrError = ref<string | null>(null);

// Sign in with email
const handleEmailSignIn = async () => {
  const success = await auth.signInWithEmail(email.value, password.value);
  if (success) {
    router.push("/");
  }
};

// Sign in with Google
const handleGoogleSignIn = () => {
  auth.signInWithGoogle();
};

// Sign in with Nostr
const handleNostrSignIn = async () => {
  nostrConnecting.value = true;
  nostrError.value = null;

  try {
    const success = await auth.signInWithNostr();
    if (success) {
      // Sync with staff user system
      await syncNostrOwner();
      router.push("/");
    }
  } catch (e) {
    nostrError.value = e instanceof Error ? e.message : "Connection failed";
  } finally {
    nostrConnecting.value = false;
  }
};

// Direct call to trigger nos2x popup
const triggerNos2xPopup = async () => {
  nostrConnecting.value = true;
  nostrError.value = null;

  try {
    if (typeof window === "undefined") return;

    const win = window as unknown as {
      nostr?: {
        getPublicKey: () => Promise<string>;
        signEvent: (event: object) => Promise<object>;
      };
    };

    if (!win.nostr) {
      nostrError.value = "Nostr extension not found. Please install nos2x.";
      return;
    }

    console.log("[nos2x] Requesting public key...");

    // This should trigger the nos2x popup
    const pubkey = await win.nostr.getPublicKey();

    console.log("[nos2x] Got pubkey:", pubkey);

    if (
      !pubkey ||
      pubkey === "null" ||
      (typeof pubkey === "string" && pubkey.length < 32)
    ) {
      nostrError.value =
        "⚠️ nos2x has no key configured!\n\n" +
        "👉 Click the nos2x icon in your browser toolbar\n" +
        "👉 Enter or generate a private key\n" +
        '👉 Click "save" then try again';
      return;
    }

    if (typeof pubkey === "string" && pubkey.length >= 32) {
      // Use the signInWithNpub for quick login
      const success = await auth.signInWithNpub(pubkey);
      if (success) {
        router.push("/");
      }
    } else {
      nostrError.value = "Invalid public key format from extension";
    }
  } catch (e) {
    console.error("[nos2x] Error:", e);
    const msg = e instanceof Error ? e.message : String(e);

    if (msg.includes("rejected") || msg.includes("denied")) {
      nostrError.value =
        "Request was rejected. Please approve the permission in nos2x.";
    } else {
      nostrError.value = msg || "Failed to connect to nos2x";
    }
  } finally {
    nostrConnecting.value = false;
  }
};

// Sign in with manual npub
const handleNpubSignIn = async () => {
  if (!manualNpub.value.trim()) return;

  const success = await auth.signInWithNpub(manualNpub.value);
  if (success) {
    // Sync with staff user system
    await syncNostrOwner();
    router.push("/");
  }
};

// Sign in with nsec (private key)
const handleNsecSignIn = async () => {
  if (!manualNsec.value.trim()) return;

  nostrConnecting.value = true;
  nostrError.value = null;

  try {
    const nsec = manualNsec.value.trim();

    // Set up the user with nostrUser composable (same as AccountSwitchModal)
    // This will save keys to localStorage and fetch profile from relays
    const setupSuccess = await nostrUser.setupUser(nsec);

    if (!setupSuccess) {
      throw new Error(
        "Invalid private key format. Use nsec1... or 64-char hex."
      );
    }

    // Get the derived pubkey from storage
    const nostrStorage = useNostrStorage();
    const { userInfo } = nostrStorage.loadCurrentUser();

    if (!userInfo?.pubkey) {
      throw new Error("Failed to derive public key");
    }

    const pubkeyHex = userInfo.pubkey;
    console.log("[Nsec] Derived pubkey:", pubkeyHex.slice(0, 16) + "...");

    // Set cookie for middleware
    const nostrCookie = useCookie("nostr-pubkey", {
      maxAge: 60 * 60 * 24 * 30,
    });
    nostrCookie.value = pubkeyHex;

    // Sync with staff user system (creates/links owner account)
    await syncNostrOwner();

    // Clear the input
    manualNsec.value = "";

    // Navigate to home
    router.push("/");
  } catch (e) {
    console.error("[Nsec] Error:", e);
    nostrError.value = e instanceof Error ? e.message : "Invalid private key";
  } finally {
    nostrConnecting.value = false;
  }
};

// Check if already authenticated and check Nostr extension
onMounted(() => {
  if (auth.isAuthenticated.value) {
    router.push("/");
  }

  // Check for Nostr extension after a short delay (extensions may load async)
  setTimeout(() => {
    hasNostr.value = auth.hasNostrExtension();

    // Detect which extension is installed
    if (hasNostr.value && typeof window !== "undefined") {
      const win = window as unknown as {
        nostr?: {
          _requests?: unknown;
          signSchnorr?: unknown;
        };
        alby?: unknown;
      };

      // Alby typically has alby object or specific methods
      if (win.alby || (win.nostr && "_requests" in win.nostr)) {
        detectedExtension.value = "alby";
      } else if (win.nostr && "signSchnorr" in win.nostr) {
        detectedExtension.value = "nos2x";
      } else {
        detectedExtension.value = "unknown";
      }
      console.log("[Nostr] Detected extension:", detectedExtension.value);
    }
  }, 500);
});
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br py-6 from-gray-50 via-white to-amber-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col justify-center"
  >
    <!-- Background Pattern -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <!-- Top right glow -->
      <div
        class="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-400/20 to-orange-500/10 dark:from-amber-500/10 dark:to-orange-500/5 rounded-full blur-3xl"
      />
      <!-- Bottom left glow -->
      <div
        class="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-purple-400/15 to-pink-500/10 dark:from-purple-500/10 dark:to-pink-500/5 rounded-full blur-3xl"
      />
      <!-- Center subtle glow -->
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-amber-200/10 via-transparent to-purple-200/10 dark:from-amber-500/5 dark:via-transparent dark:to-purple-500/5 rounded-full blur-3xl"
      />
    </div>

    <div class="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
      <!-- Back to Home -->
      <div class="mb-6">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          {{ t("common.back") }}
        </NuxtLink>
      </div>

      <!-- Logo & Header -->
      <div class="text-center mb-8">
        <div class="flex justify-center mb-4">
          <div
            class="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20"
          >
            <span class="text-3xl">⚡</span>
          </div>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ t("app.name") }}
        </h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          {{ t("app.tagline") }}
        </p>
      </div>

      <!-- Sign In Card -->
      <div
        class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <!-- Tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-800">
          <button
            class="flex-1 py-4 text-center font-medium transition-colors"
            :class="
              activeTab === 'nostr'
                ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800/50'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            "
            @click="activeTab = 'nostr'"
          >
            <span class="mr-2">⚡</span>
            {{ t("auth.signin.tabNostr") }}
          </button>
          <button
            class="flex-1 py-4 text-center font-medium transition-colors"
            :class="
              activeTab === 'email'
                ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800/50'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            "
            @click="activeTab = 'email'"
          >
            <span class="mr-2">📧</span>
            {{ t("auth.signin.tabEmail") }}
          </button>
        </div>

        <div class="p-6">
          <!-- Error Message -->
          <div
            v-if="auth.error.value"
            class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            {{ auth.error.value }}
          </div>

          <!-- Email Sign In -->
          <div v-if="activeTab === 'email'" class="space-y-4">
            <!-- Google Sign In -->
            <UButton
              block
              size="lg"
              color="neutral"
              variant="outline"
              :loading="auth.isLoading.value"
              icon="material-icon-theme:google"
              @click="handleGoogleSignIn"
            >
              {{ t("auth.google.signIn") }}
            </UButton>

            <USeparator
              :label="
                t('common.or') +
                ' ' +
                t('auth.signin.signIn').toLowerCase() +
                ' with email'
              "
            />

            <form class="space-y-4" @submit.prevent="handleEmailSignIn">
              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >{{ t("auth.signin.email") }}</label
                >
                <UInput
                  v-model="email"
                  type="email"
                  placeholder="you@example.com"
                  size="lg"
                  required
                  class="w-full"
                />
              </div>

              <div>
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {{ t("auth.signin.password") }}
                </label>
                <UInput
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  size="lg"
                  required
                  class="w-full"
                >
                  <template #trailing>
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :icon="
                        showPassword
                          ? 'i-heroicons-eye-slash'
                          : 'i-heroicons-eye'
                      "
                      @click="showPassword = !showPassword"
                    />
                  </template>
                </UInput>
              </div>

              <div class="flex items-center justify-between">
                <label class="flex items-center gap-2 cursor-pointer">
                  <UCheckbox v-model="rememberMe" />
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{
                    t("auth.signin.rememberMe")
                  }}</span>
                </label>
                <NuxtLink
                  to="/auth/forgot-password"
                  class="text-sm text-amber-500 hover:text-amber-400"
                >
                  {{ t("auth.signin.forgotPassword") }}
                </NuxtLink>
              </div>

              <UButton
                type="submit"
                block
                size="lg"
                color="primary"
                :loading="auth.isLoading.value"
              >
                {{ t("auth.signin.signIn") }}
              </UButton>
            </form>
          </div>

          <!-- Nostr Sign In -->
          <div v-else class="space-y-4">
            <!-- Nostr Extension Available -->
            <template v-if="hasNostr">
              <div class="text-center py-4">
                <div
                  class="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <span class="text-3xl">🔑</span>
                </div>
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-1"
                >
                  {{ t("auth.nostr.signIn") }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 text-sm">
                  {{ t("auth.nostr.description") }}
                </p>
              </div>

              <!-- Detected Extension Badge -->
              <div v-if="detectedExtension" class="flex justify-center mb-2">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  :class="{
                    'bg-amber-500/20 text-amber-600 dark:text-amber-400':
                      detectedExtension === 'alby',
                    'bg-purple-500/20 text-purple-600 dark:text-purple-400':
                      detectedExtension === 'nos2x',
                    'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400':
                      detectedExtension === 'unknown',
                  }"
                >
                  <span v-if="detectedExtension === 'alby'">🐝</span>
                  <span v-else-if="detectedExtension === 'nos2x'">🔐</span>
                  <span v-else>🔌</span>
                  {{
                    detectedExtension === "alby"
                      ? t("auth.nostr.albyDetected")
                      : detectedExtension === "nos2x"
                      ? t("auth.nostr.nos2xDetected")
                      : t("auth.nostr.extensionDetected")
                  }}
                </span>
              </div>

              <!-- Nostr Error -->
              <div
                v-if="nostrError"
                class="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm whitespace-pre-line"
              >
                {{ nostrError }}
              </div>

              <!-- Extension Connect Buttons -->
              <div class="space-y-2">
                <!-- Alby Button -->
                <UButton
                  block
                  size="lg"
                  :color="detectedExtension === 'alby' ? 'primary' : 'neutral'"
                  :variant="detectedExtension === 'alby' ? 'solid' : 'outline'"
                  :loading="nostrConnecting"
                  @click="handleNostrSignIn"
                >
                  <template #leading>
                    <span class="text-lg">🐝</span>
                  </template>
                  {{ t("auth.nostr.connectAlby") }}
                </UButton>

                <!-- nos2x Button -->
                <UButton
                  block
                  size="lg"
                  :color="detectedExtension === 'nos2x' ? 'primary' : 'neutral'"
                  :variant="detectedExtension === 'nos2x' ? 'solid' : 'outline'"
                  :loading="nostrConnecting"
                  @click="triggerNos2xPopup"
                >
                  <template #leading>
                    <span class="text-lg">🔐</span>
                  </template>
                  {{ t("auth.nostr.connectNos2x") }}
                </UButton>
              </div>

              <!-- Extension Help -->
              <div class="mt-4 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <span class="text-amber-400">💡</span>
                  <strong
                    v-if="detectedExtension === 'alby'"
                    class="text-gray-700 dark:text-gray-300"
                    >Alby Tips:</strong
                  >
                  <strong
                    v-else-if="detectedExtension === 'nos2x'"
                    class="text-gray-700 dark:text-gray-300"
                    >nos2x Tips:</strong
                  >
                  <strong v-else class="text-gray-700 dark:text-gray-300"
                    >Tips:</strong
                  >
                </p>
                <ul class="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                  <template v-if="detectedExtension === 'alby'">
                    <li>• Make sure Alby is unlocked</li>
                    <li>• Go to Settings → Nostr → Enable Nostr</li>
                    <li>• Allow this site when prompted</li>
                  </template>
                  <template v-else-if="detectedExtension === 'nos2x'">
                    <li>• Click the nos2x icon to unlock</li>
                    <li>• Approve the permission request</li>
                  </template>
                  <template v-else>
                    <li>• Make sure extension is unlocked</li>
                    <li>• Allow this site to access your key</li>
                  </template>
                </ul>
              </div>

              <!-- Manual npub fallback -->
              <div class="mt-4">
                <button
                  type="button"
                  class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 w-full text-center"
                  @click="
                    showManualNpub = !showManualNpub;
                    showNsecInput = false;
                  "
                >
                  {{
                    showManualNpub
                      ? "← Back to extension"
                      : "Extension not working? Enter npub manually"
                  }}
                </button>

                <div v-if="showManualNpub" class="mt-3 space-y-3">
                  <UInput
                    v-model="manualNpub"
                    placeholder="npub1... or hex pubkey"
                    size="lg"
                    class="w-full"
                  />
                  <UButton
                    block
                    color="neutral"
                    :loading="auth.isLoading.value"
                    :disabled="!manualNpub.trim()"
                    @click="handleNpubSignIn"
                  >
                    Sign in with npub
                  </UButton>
                  <p class="text-xs text-gray-500 text-center">
                    ⚠️ Read-only mode: Some features require extension signing
                  </p>
                </div>
              </div>

              <!-- Login with nsec (Private Key) -->
              <div class="mt-3">
                <button
                  type="button"
                  class="text-sm text-amber-600 dark:text-amber-500 hover:text-amber-500 dark:hover:text-amber-400 w-full text-center"
                  @click="
                    showNsecInput = !showNsecInput;
                    showManualNpub = false;
                  "
                >
                  {{
                    showNsecInput
                      ? "← Hide private key login"
                      : "🔑 Login with private key (nsec)"
                  }}
                </button>

                <div v-if="showNsecInput" class="mt-3 space-y-3">
                  <!-- Security Warning -->
                  <div
                    class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                  >
                    <p class="text-xs text-red-400 flex items-start gap-2">
                      <span class="text-base">⚠️</span>
                      <span>
                        <strong class="block mb-1">Security Warning</strong>
                        Entering your private key here is less secure than using
                        an extension. Only use this on trusted devices.
                      </span>
                    </p>
                  </div>

                  <UInput
                    v-model="manualNsec"
                    type="password"
                    placeholder="nsec1... or 64-char hex private key"
                    size="lg"
                  />

                  <UButton
                    block
                    color="primary"
                    :loading="nostrConnecting"
                    :disabled="!manualNsec.trim()"
                    @click="handleNsecSignIn"
                  >
                    <template #leading>
                      <span class="text-lg">🔐</span>
                    </template>
                    Sign in with Private Key
                  </UButton>

                  <p class="text-xs text-gray-500 text-center">
                    Your key will be stored in session storage and cleared when
                    you close the browser.
                  </p>
                </div>
              </div>
            </template>

            <!-- No Nostr Extension -->
            <template v-else>
              <div class="text-center py-4">
                <div
                  class="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3"
                >
                  <span class="text-3xl opacity-50">🔌</span>
                </div>
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white mb-1"
                >
                  Install Nostr Extension
                </h3>
                <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Choose a NIP-07 compatible extension:
                </p>
              </div>

              <div class="flex flex-col gap-2">
                <!-- Alby -->
                <a
                  href="https://getalby.com"
                  target="_blank"
                  class="block p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center"
                    >
                      <span class="text-2xl">🐝</span>
                    </div>
                    <div class="flex-1 text-left">
                      <div
                        class="font-semibold text-amber-600 dark:text-amber-400"
                      >
                        Alby
                      </div>
                      <div class="text-xs text-gray-600 dark:text-gray-400">
                        Lightning wallet + Nostr signer
                      </div>
                    </div>
                    <div class="text-amber-500">
                      <Icon name="mynaui:external-link-solid" class="w-5 h-5" />
                    </div>
                  </div>
                  <div class="mt-2 flex gap-2">
                    <span
                      class="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded"
                      >Recommended</span
                    >
                    <span
                      class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                      >Lightning</span
                    >
                  </div>
                </a>

                <!-- nos2x -->
                <a
                  href="https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp"
                  target="_blank"
                  class="block p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <div
                      class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center"
                    >
                      <span class="text-2xl">🔐</span>
                    </div>
                    <div class="flex-1 text-left">
                      <div
                        class="font-semibold text-purple-600 dark:text-purple-400"
                      >
                        nos2x
                      </div>
                      <div class="text-xs text-gray-600 dark:text-gray-400">
                        Simple & lightweight signer
                      </div>
                    </div>
                    <div class="text-purple-500">
                      <Icon name="mynaui:external-link-solid" class="w-5 h-5" />
                    </div>
                  </div>
                  <div class="mt-2 flex gap-2">
                    <span
                      class="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded"
                      >Lightweight</span
                    >
                    <span
                      class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                      >Chrome</span
                    >
                  </div>
                </a>
              </div>

              <!-- Manual npub for users without extension -->
              <div
                class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800"
              >
                <button
                  type="button"
                  class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 w-full text-center"
                  @click="
                    showManualNpub = !showManualNpub;
                    showNsecInput = false;
                  "
                >
                  {{
                    showManualNpub ? "← Hide" : "Already have a key? Enter npub"
                  }}
                </button>

                <div v-if="showManualNpub" class="mt-3 space-y-3">
                  <UInput
                    v-model="manualNpub"
                    placeholder="npub1... or hex pubkey"
                    size="lg"
                    class="w-full"
                  />
                  <UButton
                    block
                    color="neutral"
                    :loading="auth.isLoading.value"
                    :disabled="!manualNpub.trim()"
                    @click="handleNpubSignIn"
                  >
                    Sign in with npub
                  </UButton>
                  <p class="text-xs text-gray-500 text-center">
                    ⚠️ Read-only mode without extension
                  </p>
                </div>
              </div>

              <!-- Login with nsec (Private Key) for users without extension -->
              <div class="mt-3">
                <button
                  type="button"
                  class="text-sm text-amber-600 dark:text-amber-500 hover:text-amber-500 dark:hover:text-amber-400 w-full text-center"
                  @click="
                    showNsecInput = !showNsecInput;
                    showManualNpub = false;
                  "
                >
                  {{
                    showNsecInput
                      ? "← Hide private key login"
                      : "🔑 Login with private key (nsec)"
                  }}
                </button>

                <div v-if="showNsecInput" class="mt-3 space-y-3">
                  <!-- Security Warning -->
                  <div
                    class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                  >
                    <p class="text-xs text-red-400 flex items-start gap-2">
                      <span class="text-base">⚠️</span>
                      <span>
                        <strong class="block mb-1">Security Warning</strong>
                        Entering your private key here is less secure than using
                        an extension. Only use this on trusted devices.
                      </span>
                    </p>
                  </div>

                  <UInput
                    v-model="manualNsec"
                    type="password"
                    placeholder="nsec1... or 64-char hex private key"
                    size="lg"
                    class="w-full"
                  />

                  <UButton
                    block
                    color="primary"
                    :loading="nostrConnecting"
                    :disabled="!manualNsec.trim()"
                    @click="handleNsecSignIn"
                  >
                    <template #leading>
                      <span class="text-lg">🔐</span>
                    </template>
                    Sign in with Private Key
                  </UButton>

                  <p class="text-xs text-gray-500 text-center">
                    Your key will be stored in session storage and cleared when
                    you close the browser.
                  </p>
                </div>
              </div>
            </template>

            <!-- Nostr Benefits -->
            <div class="mt-6 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl">
              <h4
                class="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3"
              >
                Why Nostr?
              </h4>
              <ul class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                <li class="flex items-center gap-2">
                  <span class="text-green-400">✓</span>
                  No email or password required
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-400">✓</span>
                  You control your identity
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-400">✓</span>
                  Works with Lightning payments
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-green-400">✓</span>
                  Same key for loyalty rewards
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-5 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-800/50 border-t border-gray-200 dark:border-gray-800"
        >
          <div class="flex items-center justify-center gap-2 text-sm">
            <span class="text-gray-600 dark:text-gray-400">
              {{ t("auth.signin.noAccount") }}
            </span>
            <NuxtLink
              to="/auth/signup"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium rounded-full transition-all duration-200 hover:scale-105"
            >
              <UIcon name="i-heroicons-user-plus" class="w-4 h-4" />
              {{ t("auth.signin.createAccount") }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Bottom Links -->
      <div class="mt-8 text-center">
        <div class="flex items-center justify-center gap-6">
          <a
            href="#"
            class="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <UIcon
              name="i-heroicons-shield-check"
              class="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors"
            />
            {{ t("app.privacyPolicy") }}
          </a>
          <span class="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          <a
            href="#"
            class="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <UIcon
              name="i-heroicons-document-text"
              class="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors"
            />
            {{ t("app.termsOfService") }}
          </a>
        </div>

        <!-- Copyright -->
        <p class="mt-4 text-xs text-gray-400 dark:text-gray-600">
          © {{ new Date().getFullYear() }} {{ t("app.copyright") }}
        </p>
      </div>
    </div>
  </div>
</template>
