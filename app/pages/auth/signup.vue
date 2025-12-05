<!-- pages/auth/signup.vue -->
<!-- 📝 Create Account Page -->
<script setup lang="ts">
definePageMeta({
  layout: "blank",
});

const auth = useAuth();
const router = useRouter();

// Form state
const formData = ref({
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
});
const agreeTerms = ref(false);
const showPassword = ref(false);

// Validation
const passwordStrength = computed(() => {
  const password = formData.value.password;
  let strength = 0;

  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  return strength;
});

const passwordStrengthLabel = computed(() => {
  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  return labels[passwordStrength.value - 1] || "";
});

const passwordStrengthColor = computed(() => {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-400",
    "bg-green-500",
  ];
  return colors[passwordStrength.value - 1] || "bg-gray-700";
});

const isFormValid = computed(() => {
  return (
    formData.value.email &&
    formData.value.password.length >= 8 &&
    formData.value.password === formData.value.confirmPassword &&
    agreeTerms.value
  );
});

// Sign up
const handleSignUp = async () => {
  if (!isFormValid.value) return;

  const success = await auth.signUpWithEmail(
    formData.value.email,
    formData.value.password,
    formData.value.displayName
  );

  if (success) {
    // Show success message or redirect
    router.push("/auth/verify-email");
  }
};

// Sign up with Google
const handleGoogleSignUp = () => {
  auth.signInWithGoogle();
};

// Sign up with Nostr extension
const handleNostrSignUp = async () => {
  const success = await auth.signInWithNostr();
  if (success) {
    router.push("/");
  }
};

// Create new Nostr account (generate keys)
const nostrUser = useNostrUser();
const isCreatingNostr = ref(false);
const newAccountKeys = ref<{ npub: string; nsec: string } | null>(null);
const showKeysModal = ref(false);
const keysCopied = ref({ npub: false, nsec: false });

const handleCreateNostrAccount = async () => {
  isCreatingNostr.value = true;
  
  try {
    // Generate new Nostr keys
    const newUser = nostrUser.createUser();
    
    if (newUser) {
      // Show the keys to user before saving
      newAccountKeys.value = {
        npub: newUser.npub,
        nsec: newUser.nsec,
      };
      showKeysModal.value = true;
    }
  } catch (e) {
    auth.error.value = e instanceof Error ? e.message : 'Failed to create account';
  } finally {
    isCreatingNostr.value = false;
  }
};

const confirmAccountCreation = () => {
  showKeysModal.value = false;
  router.push("/");
};

const copyToClipboard = async (text: string, type: 'npub' | 'nsec') => {
  await navigator.clipboard.writeText(text);
  keysCopied.value[type] = true;
  setTimeout(() => {
    keysCopied.value[type] = false;
  }, 2000);
};

// Check if already authenticated
onMounted(() => {
  if (auth.isAuthenticated.value) {
    router.push("/");
  }
});
</script>

<template>
  <div
    class=" bg-gray-100 dark:bg-gray-950 flex flex-col justify-center py-12"
  >
    <div class="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
      <!-- Back to Home -->
      <div class="mb-6">
        <NuxtLink to="/" class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          Back to Home
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
          Create Account
        </h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Join the future of commerce
        </p>
      </div>

      <!-- Sign Up Card -->
      <div
        class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <div class="p-6">
          <!-- Error Message -->
          <div
            v-if="auth.error.value"
            class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            {{ auth.error.value }}
          </div>

          <!-- Primary: Create Nostr Account -->
          <div class="mb-6">
            <div class="text-center mb-4">
              <div class="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span class="text-2xl">⚡</span>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Create Nostr Account</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Generate a new identity - no email required
              </p>
            </div>

            <UButton
              block
              size="lg"
              color="primary"
              :loading="isCreatingNostr"
              @click="handleCreateNostrAccount"
            >
              <template #leading>
                <span class="text-lg">🔑</span>
              </template>
              Generate New Nostr Keys
            </UButton>

            <p class="text-xs text-gray-500 text-center mt-2">
              ✨ Decentralized • Private • Works with Lightning
            </p>
          </div>

          <!-- Or connect with extension -->
          <div class="relative mb-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-200 dark:border-gray-800" />
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white dark:bg-gray-900 text-gray-500">or connect existing</span>
            </div>
          </div>

          <!-- Secondary: Connect with Extension/Import -->
          <div class="space-y-3 mb-6">
            <UButton
              block
              size="lg"
              color="neutral"
              variant="outline"
              @click="handleNostrSignUp"
            >
              <template #leading>
                <span class="text-lg">🔌</span>
              </template>
              Connect with Nostr Extension
            </UButton>

            <UButton
              block
              size="lg"
              color="neutral"
              variant="outline"
              @click="handleGoogleSignUp"
            >
              <template #leading>
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </template>
              Continue with Google
            </UButton>
          </div>

          <div class="relative mb-6">
            <div class="absolute inset-0 flex items-center">
              <div
                class="w-full border-t border-gray-200 dark:border-gray-800"
              />
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white dark:bg-gray-900 text-gray-500"
                >or create with email</span
              >
            </div>
          </div>

          <!-- Email Sign Up Form -->
          <form @submit.prevent="handleSignUp" class="space-y-4">
            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >Display Name</label
              >
              <UInput
                v-model="formData.displayName"
                type="text"
                placeholder="John Doe"
                size="lg"
              />
            </div>

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >Email</label
              >
              <UInput
                v-model="formData.email"
                type="email"
                placeholder="you@example.com"
                size="lg"
                required
              />
            </div>

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >Password</label
              >
              <UInput
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Create a strong password"
                size="lg"
                required
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    :icon="
                      showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'
                    "
                    @click="showPassword = !showPassword"
                  />
                </template>
              </UInput>

              <!-- Password Strength Indicator -->
              <div v-if="formData.password" class="mt-2">
                <div class="flex gap-1 mb-1">
                  <div
                    v-for="i in 5"
                    :key="i"
                    class="h-1 flex-1 rounded-full transition-colors"
                    :class="
                      i <= passwordStrength
                        ? passwordStrengthColor
                        : 'bg-gray-700'
                    "
                  />
                </div>
                <p
                  class="text-xs"
                  :class="
                    passwordStrength >= 3 ? 'text-green-400' : 'text-gray-500'
                  "
                >
                  {{ passwordStrengthLabel }}
                </p>
              </div>
            </div>

            <div>
              <label
                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >Confirm Password</label
              >
              <UInput
                v-model="formData.confirmPassword"
                type="password"
                placeholder="Confirm your password"
                size="lg"
                required
              />
              <p
                v-if="
                  formData.confirmPassword &&
                  formData.password !== formData.confirmPassword
                "
                class="mt-1 text-xs text-red-400"
              >
                Passwords do not match
              </p>
            </div>

            <label class="flex items-start gap-3 cursor-pointer">
              <UCheckbox v-model="agreeTerms" class="mt-0.5" />
              <span class="text-sm text-gray-600 dark:text-gray-400">
                I agree to the
                <a href="#" class="text-amber-500 hover:text-amber-400"
                  >Terms of Service</a
                >
                and
                <a href="#" class="text-amber-500 hover:text-amber-400"
                  >Privacy Policy</a
                >
              </span>
            </label>

            <UButton
              type="submit"
              block
              size="lg"
              color="primary"
              :loading="auth.isLoading.value"
              :disabled="!isFormValid"
            >
              Create Account
            </UButton>
          </form>
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-800 text-center"
        >
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?
            <NuxtLink
              to="/auth/signin"
              class="text-amber-500 hover:text-amber-400 font-medium"
            >
              Sign in
            </NuxtLink>
          </p>
        </div>
      </div>

      <!-- Features -->
      <div class="mt-8 grid grid-cols-3 gap-4 text-center">
        <div>
          <div class="text-2xl mb-1">⚡</div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Lightning Payments
          </p>
        </div>
        <div>
          <div class="text-2xl mb-1">🔐</div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Non-Custodial</p>
        </div>
        <div>
          <div class="text-2xl mb-1">🌐</div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Decentralized</p>
        </div>
      </div>
    </div>

    <!-- New Account Keys Modal -->
    <UModal v-model:open="showKeysModal" :closeable="false">
      <template #content>
        <UCard>
          <template #header>
            <div class="text-center">
              <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span class="text-3xl">🎉</span>
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">Account Created!</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Save your keys securely - you'll need them to recover your account
              </p>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Warning -->
            <div class="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p class="text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <span class="text-lg">⚠️</span>
                <span>
                  <strong class="block">Save these keys now!</strong>
                  Your private key (nsec) will not be shown again. Store it securely.
                </span>
              </p>
            </div>

            <!-- Public Key (npub) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Public Key (npub) - Share this
              </label>
              <div class="flex gap-2">
                <UInput
                  :model-value="newAccountKeys?.npub"
                  readonly
                  class="flex-1 font-mono text-xs"
                />
                <UButton
                  :icon="keysCopied.npub ? 'i-heroicons-check' : 'i-heroicons-clipboard'"
                  :color="keysCopied.npub ? 'success' : 'neutral'"
                  variant="outline"
                  @click="copyToClipboard(newAccountKeys?.npub || '', 'npub')"
                />
              </div>
            </div>

            <!-- Private Key (nsec) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Private Key (nsec) - Keep this secret!
              </label>
              <div class="flex gap-2">
                <UInput
                  :model-value="newAccountKeys?.nsec"
                  readonly
                  type="password"
                  class="flex-1 font-mono text-xs"
                />
                <UButton
                  :icon="keysCopied.nsec ? 'i-heroicons-check' : 'i-heroicons-clipboard'"
                  :color="keysCopied.nsec ? 'success' : 'neutral'"
                  variant="outline"
                  @click="copyToClipboard(newAccountKeys?.nsec || '', 'nsec')"
                />
              </div>
              <p class="text-xs text-red-400 mt-1">
                🔐 Never share your nsec with anyone!
              </p>
            </div>
          </div>

          <template #footer>
            <div class="space-y-3">
              <UButton
                block
                color="primary"
                size="lg"
                @click="confirmAccountCreation"
              >
                I've Saved My Keys - Continue
              </UButton>
              <p class="text-xs text-gray-500 text-center">
                You can find your keys later in Settings → Account
              </p>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
