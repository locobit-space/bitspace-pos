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
const usersComposable = useUsers();
const { syncNostrOwner } = usersComposable;

// Staff users state
const staffUsers = computed(() => usersComposable.users.value);
const isLoadingUsers = ref(true);

// Form state
const email = ref("");
const password = ref("");
const rememberMe = ref(false);
const showPassword = ref(false);

// UI state
const activeTab = ref<"email" | "nostr" | "staff">("nostr");
const showPinPad = ref(false);
const hasNostr = ref(false);
const nostrConnecting = ref(false);
const showManualNpub = ref(false);
const showNsecInput = ref(false);
const manualNpub = ref("");
const manualNsec = ref("");
const detectedExtension = ref<"alby" | "nos2x" | "unknown" | null>(null);
const nostrError = ref<string | null>(null);

// Company code state
const companyCodeInput = ref("");
const isLoadingCompanyCode = ref(false);
const companyCodeError = ref<string | null>(null);
const company = useCompany();
const nostrData = useNostrData();

// Sign in with email (local staff first, then cloud fallback)
const handleEmailSignIn = async () => {
  // Clear any previous errors
  auth.error.value = null;

  // 1. Try local staff login first
  const localResult = await usersComposable.loginWithPassword(
    email.value,
    password.value
  );

  if (localResult.success && localResult.user) {
    await handleStaffLogin(localResult.user, "password");
    return;
  }

  // 2. If local user exists but credentials wrong, show that error
  if (localResult.error && localResult.error !== "Invalid credentials") {
    auth.error.value = localResult.error;
    return;
  }

  // 3. Check if this email exists locally (user exists but wrong password)
  const allUsers = usersComposable.users.value;
  const localUserExists = allUsers.some(
    (u) =>
      u.email?.toLowerCase().trim() === email.value.toLowerCase().trim() ||
      u.name.toLowerCase().trim() === email.value.toLowerCase().trim()
  );

  if (localUserExists) {
    // User exists locally but password/credentials wrong
    auth.error.value = localResult.error || "Invalid credentials";
    return;
  }

  // 4. Fallback to Hasura/Cloud login only if no local user found
  try {
    const success = await auth.signInWithEmail(email.value, password.value);
    if (success) {
      router.push("/");
    }
  } catch (e) {
    // Network error - user might not have internet
    console.error("Cloud login failed:", e);
    auth.error.value =
      "User not found. Create an account or check your credentials.";
  }
};

// Sign in with Google
const handleGoogleSignIn = () => {
  auth.signInWithGoogle();
};

// Handle company code submit (for cross-device staff login)
const handleCompanyCodeSubmit = async () => {
  if (companyCodeInput.value.length !== 6) return;

  isLoadingCompanyCode.value = true;
  companyCodeError.value = null;

  try {
    // Get owner pubkey from storage OR discover it via company index
    let ownerPubkey = company.ownerPubkey.value;

    if (!ownerPubkey) {
      // Try to discover owner pubkey from company index event

      ownerPubkey = await nostrData.discoverOwnerByCompanyCode(
        companyCodeInput.value
      );

      if (!ownerPubkey) {
        companyCodeError.value = "Invalid code. Check with your manager.";
        return;
      }
    }



    // Fetch staff from Nostr using company code
    const staff = await nostrData.fetchStaffByCompanyCode(
      companyCodeInput.value,
      ownerPubkey
    );

    if (staff.length === 0) {
      companyCodeError.value = "Invalid code or no staff found.";
      return;
    }

    // Save company code for future use
    await company.setCompanyCode(companyCodeInput.value, ownerPubkey);

    // Merge fetched users with local storage
    const STORAGE_KEY = "bitspace_users";
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const existingIds = new Set(existing.map((u: { id: string }) => u.id));

    for (const user of staff) {
      if (!existingIds.has(user.id)) {
        existing.push(user);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    // Reinitialize users composable to pick up new users
    await usersComposable.refreshFromNostr();


    companyCodeInput.value = ""; // Clear input
  } catch (e) {
    console.error("[Signin] Company code error:", e);
    companyCodeError.value = "Failed to connect. Check code and try again.";
  } finally {
    isLoadingCompanyCode.value = false;
  }
};

// Handle QR code scan result
const invite = useInvite();

const handleQrScanned = async (data: string) => {


  try {
    // Parse the invite link
    const result = await invite.parseInviteLink(data);

    if (!result.success || !result.data) {
      companyCodeError.value = result.error || "Invalid QR code";
      return;
    }

    // Import the user
    const imported = await invite.importFromInvite(result.data);

    if (!imported) {
      companyCodeError.value = "Failed to import user data";
      return;
    }

    // Refresh users
    await usersComposable.refreshFromNostr();



    // If we have users now, they'll show up in the staff list
  } catch (error) {
    console.error("[Signin] QR scan error:", error);
    companyCodeError.value = "Failed to process QR code";
  }
};

const handleQrError = (message: string) => {
  console.error("[Signin] QR error:", message);
  companyCodeError.value = message;
};
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



    // This should trigger the nos2x popup
    const pubkey = await win.nostr.getPublicKey();



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


    // Set cookie for middleware
    const nostrCookie = useCookie("nostr-pubkey", {
      maxAge: 60 * 60 * 24 * 30,
    });
    nostrCookie.value = pubkeyHex;

    // Sync with staff user system (creates/links owner account)
    await syncNostrOwner();

    // Initialize company code for owner (generates if not exists)
    const companyCode = await company.initializeCompany(pubkeyHex);


    // Publish company index for cross-device discovery
    const codeHash = await company.hashCompanyCode(companyCode);
    await nostrData.publishCompanyIndex(codeHash);

    // IMPORTANT: Re-fetch users from Nostr now that we have keys
    // This enables staff logins on new devices!
    await usersComposable.refreshFromNostr();


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

// Handle staff login success
const handleStaffLogin = async (
  user: { id: string; name: string },
  _method: string
) => {


  // Make sure the user is set as current in useUsers composable
  // (StaffLogin component uses staffAuth which doesn't update useUsers)
  const fullUser = usersComposable.users.value.find((u) => u.id === user.id);
  if (fullUser) {
    usersComposable.setCurrentUser(fullUser);
  }

  // Navigate to home
  router.push("/");
};

// Check if already authenticated and check Nostr extension
onMounted(async () => {
  if (auth.isAuthenticated.value) {
    router.push("/");
  }

  // Initialize users for staff login
  try {
    await usersComposable.initialize();
  } finally {
    isLoadingUsers.value = false;
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
    class="min-h-screen bg-gradient-to-br py-6 from-gray-50 via-white to-amber-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col justify-center">
    <!-- Background Pattern -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none">
      <!-- Top right glow -->
      <div
        class="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-400/20 to-orange-500/10 dark:from-amber-500/10 dark:to-orange-500/5 rounded-full blur-3xl" />
      <!-- Bottom left glow -->
      <div
        class="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-purple-400/15 to-pink-500/10 dark:from-purple-500/10 dark:to-pink-500/5 rounded-full blur-3xl" />
      <!-- Center subtle glow -->
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-amber-200/10 via-transparent to-purple-200/10 dark:from-amber-500/5 dark:via-transparent dark:to-purple-500/5 rounded-full blur-3xl" />
    </div>

    <div class="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
      <!-- Back to Home -->
      <div class="mb-6">
        <NuxtLink to="/"
          class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          {{ t("common.back") }}
        </NuxtLink>
      </div>

      <!-- Logo & Header -->
      <div class="text-center mb-8">
        <div class="flex justify-center mb-4">
          <div
            class="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
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
        class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <!-- Tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-800">
          <button class="flex-1 py-4 text-center font-medium transition-colors" :class="activeTab === 'nostr'
              ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800/50'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            " @click="activeTab = 'nostr'">
            <span class="mr-2">⚡</span>
            {{ t("auth.signin.tabNostr") }}
          </button>
          <!-- <button
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
          </button> -->
          <button class="flex-1 py-4 text-center font-medium transition-colors" :class="activeTab === 'staff'
              ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800/50'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            " @click="
              activeTab = 'staff';
            showPinPad = false;
            ">
            <span class="mr-2">👤</span>
            {{ t("auth.signin.tabStaff") || "Staff" }}
          </button>
        </div>

        <div class="p-6">
          <!-- Error Message -->
          <div v-if="auth.error.value"
            class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {{ auth.error.value }}
          </div>

          <!-- Email Sign In -->
          <div v-if="activeTab === 'email'" class="space-y-4">
            <!-- Google Sign In -->
            <UButton block size="lg" color="neutral" variant="outline" :loading="auth.isLoading.value"
              icon="material-icon-theme:google" @click="handleGoogleSignIn">
              {{ t("auth.google.signIn") }}
            </UButton>

            <USeparator :label="t('common.or') +
              ' ' +
              t('auth.signin.signIn').toLowerCase() +
              ' with email'
              " />

            <form class="space-y-4" @submit.prevent="handleEmailSignIn">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ t("auth.signin.email")
                  }}</label>
                <UInput v-model="email" type="email" placeholder="you@example.com" size="lg" required class="w-full" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {{ t("auth.signin.password") }}
                </label>
                <UInput v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••" size="lg"
                  required class="w-full">
                  <template #trailing>
                    <UButton color="neutral" variant="ghost" size="xs" :icon="showPassword
                        ? 'i-heroicons-eye-slash'
                        : 'i-heroicons-eye'
                      " @click="showPassword = !showPassword" />
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
                <NuxtLink to="/auth/forgot-password" class="text-sm text-amber-500 hover:text-amber-400">
                  {{ t("auth.signin.forgotPassword") }}
                </NuxtLink>
              </div>

              <UButton type="submit" block size="lg" color="primary" :loading="auth.isLoading.value">
                {{ t("auth.signin.signIn") }}
              </UButton>
            </form>
          </div>

          <!-- Staff Login -->
          <div v-else-if="activeTab === 'staff'" class="space-y-4">
            <div v-if="isLoadingUsers" class="text-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500 mx-auto" />
              <p class="text-gray-500 mt-2">{{ t("common.loading") }}</p>
            </div>

            <div v-else-if="staffUsers.length === 0" class="text-center py-4">
              <!-- Company Code Input -->
              <div v-if="!companyCodeInput" class="space-y-4">
                <div
                  class="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span class="text-3xl opacity-50">🏪</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {{
                    t("auth.signin.enterCompanyCode") || "Enter Company Code"
                  }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {{
                    t("auth.signin.companyCodeHint") ||
                    "Get the 6-digit code from your manager"
                  }}
                </p>

                <div class="max-w-xs mx-auto">
                  <UInput v-model="companyCodeInput" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6"
                    size="lg" class="text-center text-2xl tracking-[0.5em] font-mono" :placeholder="'000000'"
                    @keyup.enter="handleCompanyCodeSubmit" />
                </div>

                <UButton :loading="isLoadingCompanyCode" :disabled="companyCodeInput.length !== 6" color="primary"
                  class="mt-4" @click="handleCompanyCodeSubmit">
                  {{ t("auth.signin.connectWithCode") || "Connect" }}
                </UButton>

                <div v-if="companyCodeError" class="mt-2">
                  <UAlert color="error" :title="companyCodeError" />
                </div>
              </div>

              <!-- OR Divider -->
              <div class="relative my-4">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="bg-white dark:bg-gray-900 px-2 text-gray-500">
                    {{ t("common.or") || "or" }}
                  </span>
                </div>
              </div>

              <!-- QR Scanner Button -->
              <AuthQrScanner @scanned="handleQrScanned" @error="handleQrError" />

              <!-- Fallback: Create account link for owners -->
              <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                <p class="text-gray-500 text-sm">
                  {{ t("auth.signin.noCodeQuestion") || "Don't have a code?" }}
                </p>
                <UButton variant="link" size="sm" @click="activeTab = 'nostr'">
                  {{ t("auth.signin.loginAsOwner") || "Login as Owner" }}
                </UButton>
              </div>
            </div>

            <div v-else>
              <!-- Staff Login Button (Click to reveal PIN pad) -->
              <!-- Staff User Grid -->
              <div v-if="!showPinPad">
                <div class="text-center mb-6">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ t("auth.staffLogin") || "Who is working?" }}
                  </h3>
                  <p class="text-sm text-gray-500 mt-1">
                    {{
                      t("auth.selectProfile") || "Select your profile to login"
                    }}
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                  <button v-for="user in staffUsers" :key="user.id"
                    class="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all group"
                    @click="showPinPad = true">
                    <div
                      class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3 group-hover:bg-white dark:group-hover:bg-gray-800 transition-colors">
                      <UIcon name="i-heroicons-user"
                        class="w-6 h-6 text-gray-500 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <span class="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
                      {{ user.name }}
                    </span>
                    <span class="text-xs text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                      {{
                        user.role === "admin"
                          ? t("settings.users.roleAdmin") || "Admin"
                          : t("settings.users.roleStaff") || "Staff"
                      }}
                    </span>
                  </button>

                  <!-- Add Quick Login Button if list is long -->
                  <!-- Or just keep it clean with user grid -->
                </div>
              </div>

              <!-- PIN Pad Component -->
              <div v-else>
                <div class="mb-4">
                  <UButton variant="ghost" icon="i-heroicons-arrow-left" class="mb-2" @click="showPinPad = false">
                    {{ t("common.back") }}
                  </UButton>
                </div>
                <AuthStaffLogin :users="staffUsers" :show-nostr="true" :show-password="true"
                  @login="handleStaffLogin" />
              </div>
            </div>
          </div>

          <!-- Nostr Sign In -->
          <div v-else-if="activeTab == 'nostr'" class="space-y-4">
            <!-- Nostr Extension Available -->
            <template v-if="hasNostr">
              <div class="text-center py-4">
                <div class="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span class="text-3xl">🔑</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {{ t("auth.nostr.signIn") }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 text-sm">
                  {{ t("auth.nostr.description") }}
                </p>
              </div>

              <!-- Detected Extension Badge -->
              <div v-if="detectedExtension" class="flex justify-center mb-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" :class="{
                  'bg-amber-500/20 text-amber-600 dark:text-amber-400':
                    detectedExtension === 'alby',
                  'bg-purple-500/20 text-purple-600 dark:text-purple-400':
                    detectedExtension === 'nos2x',
                  'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400':
                    detectedExtension === 'unknown',
                }">
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
              <div v-if="nostrError"
                class="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm whitespace-pre-line">
                {{ nostrError }}
              </div>

              <!-- Extension Connect Buttons -->
              <div class="space-y-2">
                <!-- Alby Button -->
                <UButton block size="lg" :color="detectedExtension === 'alby' ? 'primary' : 'neutral'"
                  :variant="detectedExtension === 'alby' ? 'solid' : 'outline'" :loading="nostrConnecting"
                  @click="handleNostrSignIn">
                  <template #leading>
                    <span class="text-lg">🐝</span>
                  </template>
                  {{ t("auth.nostr.connectAlby") }}
                </UButton>

                <!-- nos2x Button -->
                <UButton block size="lg" :color="detectedExtension === 'nos2x' ? 'primary' : 'neutral'"
                  :variant="detectedExtension === 'nos2x' ? 'solid' : 'outline'" :loading="nostrConnecting"
                  @click="triggerNos2xPopup">
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
                  <strong v-if="detectedExtension === 'alby'" class="text-gray-700 dark:text-gray-300">Alby
                    Tips:</strong>
                  <strong v-else-if="detectedExtension === 'nos2x'" class="text-gray-700 dark:text-gray-300">nos2x
                    Tips:</strong>
                  <strong v-else class="text-gray-700 dark:text-gray-300">Tips:</strong>
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
                <button type="button"
                  class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 w-full text-center" @click="
                    showManualNpub = !showManualNpub;
                  showNsecInput = false;
                  ">
                  {{
                    showManualNpub
                      ? "← Back to extension"
                      : "Extension not working? Enter npub manually"
                  }}
                </button>

                <div v-if="showManualNpub" class="mt-3 space-y-3">
                  <UInput v-model="manualNpub" placeholder="npub1... or hex pubkey" size="lg" class="w-full" />
                  <UButton block color="neutral" :loading="auth.isLoading.value" :disabled="!manualNpub.trim()"
                    @click="handleNpubSignIn">
                    Sign in with npub
                  </UButton>
                  <p class="text-xs text-gray-500 text-center">
                    ⚠️ Read-only mode: Some features require extension signing
                  </p>
                </div>
              </div>

              <!-- Login with nsec (Private Key) -->
              <div class="mt-3">
                <button type="button"
                  class="text-sm text-amber-600 dark:text-amber-500 hover:text-amber-500 dark:hover:text-amber-400 w-full text-center"
                  @click="
                    showNsecInput = !showNsecInput;
                  showManualNpub = false;
                  ">
                  {{
                    showNsecInput
                      ? "← Hide private key login"
                      : "🔑 Login with private key (nsec)"
                  }}
                </button>

                <div v-if="showNsecInput" class="mt-3 space-y-3">
                  <!-- Security Warning -->
                  <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p class="text-xs text-red-400 flex items-start gap-2">
                      <span class="text-base">⚠️</span>
                      <span>
                        <strong class="block mb-1">Security Warning</strong>
                        Entering your private key here is less secure than using
                        an extension. Only use this on trusted devices.
                      </span>
                    </p>
                  </div>

                  <UInput v-model="manualNsec" type="password" placeholder="nsec1... or 64-char hex private key"
                    size="lg" class="w-full" />

                  <UButton block color="primary" :loading="nostrConnecting" :disabled="!manualNsec.trim()"
                    @click="handleNsecSignIn">
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
                  class="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span class="text-3xl opacity-50">🔌</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Install Nostr Extension
                </h3>
                <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Choose a NIP-07 compatible extension:
                </p>
              </div>

              <div class="flex flex-col gap-2">
                <!-- Alby -->
                <a href="https://getalby.com" target="_blank"
                  class="block p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                      <span class="text-2xl">🐝</span>
                    </div>
                    <div class="flex-1 text-left">
                      <div class="font-semibold text-amber-600 dark:text-amber-400">
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
                      class="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">Recommended</span>
                    <span
                      class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">Lightning</span>
                  </div>
                </a>

                <!-- nos2x -->
                <a href="https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp"
                  target="_blank"
                  class="block p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <span class="text-2xl">🔐</span>
                    </div>
                    <div class="flex-1 text-left">
                      <div class="font-semibold text-purple-600 dark:text-purple-400">
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
                      class="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded">Lightweight</span>
                    <span
                      class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">Chrome</span>
                  </div>
                </a>
              </div>

              <!-- Manual npub for users without extension -->
              <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button type="button"
                  class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 w-full text-center" @click="
                    showManualNpub = !showManualNpub;
                  showNsecInput = false;
                  ">
                  {{
                    showManualNpub ? "← Hide" : "Already have a key? Enter npub"
                  }}
                </button>

                <div v-if="showManualNpub" class="mt-3 space-y-3">
                  <UInput v-model="manualNpub" placeholder="npub1... or hex pubkey" size="lg" class="w-full" />
                  <UButton block color="neutral" :loading="auth.isLoading.value" :disabled="!manualNpub.trim()"
                    @click="handleNpubSignIn">
                    Sign in with npub
                  </UButton>
                  <p class="text-xs text-gray-500 text-center">
                    ⚠️ Read-only mode without extension
                  </p>
                </div>
              </div>

              <!-- Login with nsec (Private Key) for users without extension -->
              <div class="mt-3">
                <button type="button"
                  class="text-sm text-amber-600 dark:text-amber-500 hover:text-amber-500 dark:hover:text-amber-400 w-full text-center"
                  @click="
                    showNsecInput = !showNsecInput;
                  showManualNpub = false;
                  ">
                  {{
                    showNsecInput
                      ? "← Hide private key login"
                      : "🔑 Login with private key (nsec)"
                  }}
                </button>

                <div v-if="showNsecInput" class="mt-3 space-y-3">
                  <!-- Security Warning -->
                  <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p class="text-xs text-red-400 flex items-start gap-2">
                      <span class="text-base">⚠️</span>
                      <span>
                        <strong class="block mb-1">Security Warning</strong>
                        Entering your private key here is less secure than using
                        an extension. Only use this on trusted devices.
                      </span>
                    </p>
                  </div>

                  <UInput v-model="manualNsec" type="password" placeholder="nsec1... or 64-char hex private key"
                    size="lg" class="w-full" />

                  <UButton block color="primary" :loading="nostrConnecting" :disabled="!manualNsec.trim()"
                    @click="handleNsecSignIn">
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
              <h4 class="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">
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
          class="px-6 py-5 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-800/50 border-t border-gray-200 dark:border-gray-800">
          <div class="flex items-center justify-center gap-2 text-sm">
            <span class="text-gray-600 dark:text-gray-400">
              {{ t("auth.signin.noAccount") }}
            </span>
            <NuxtLink to="/auth/signup"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium rounded-full transition-all duration-200 hover:scale-105">
              <UIcon name="i-heroicons-user-plus" class="w-4 h-4" />
              {{ t("auth.signin.createAccount") }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Bottom Links -->
      <div class="mt-8 text-center">
        <div class="flex items-center justify-center gap-6">
          <a href="#"
            class="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <UIcon name="i-heroicons-shield-check"
              class="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
            {{ t("app.privacyPolicy") }}
          </a>
          <span class="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          <a href="#"
            class="group inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <UIcon name="i-heroicons-document-text"
              class="w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors" />
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
