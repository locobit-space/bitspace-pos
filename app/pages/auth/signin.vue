<!-- pages/auth/signin.vue -->
<!-- 🔐 Sign In Page - Hasura Auth + Nostr -->
<script setup lang="ts">
definePageMeta({
  layout: 'blank',
});

const auth = useAuth();
const router = useRouter();
const nostrUser = useNostrUser();
const { syncNostrOwner } = useUsers();

// Form state
const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const showPassword = ref(false);

// UI state
const activeTab = ref<'email' | 'nostr'>('nostr');
const hasNostr = ref(false);
const nostrConnecting = ref(false);
const showManualNpub = ref(false);
const showNsecInput = ref(false);
const manualNpub = ref('');
const manualNsec = ref('');
const detectedExtension = ref<'alby' | 'nos2x' | 'unknown' | null>(null);
const nostrError = ref<string | null>(null);

// Sign in with email
const handleEmailSignIn = async () => {
  const success = await auth.signInWithEmail(email.value, password.value);
  if (success) {
    router.push('/');
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
      router.push('/');
    }
  } catch (e) {
    nostrError.value = e instanceof Error ? e.message : 'Connection failed';
  } finally {
    nostrConnecting.value = false;
  }
};

// Direct call to trigger nos2x popup
const triggerNos2xPopup = async () => {
  nostrConnecting.value = true;
  nostrError.value = null;
  
  try {
    if (typeof window === 'undefined') return;
    
    const win = window as unknown as { 
      nostr?: { 
        getPublicKey: () => Promise<string>;
        signEvent: (event: object) => Promise<object>;
      } 
    };
    
    if (!win.nostr) {
      nostrError.value = 'Nostr extension not found. Please install nos2x.';
      return;
    }
    
    console.log('[nos2x] Requesting public key...');
    
    // This should trigger the nos2x popup
    const pubkey = await win.nostr.getPublicKey();
    
    console.log('[nos2x] Got pubkey:', pubkey);
    
    if (!pubkey || pubkey === 'null' || (typeof pubkey === 'string' && pubkey.length < 32)) {
      nostrError.value = '⚠️ nos2x has no key configured!\n\n' +
        '👉 Click the nos2x icon in your browser toolbar\n' +
        '👉 Enter or generate a private key\n' +
        '👉 Click "save" then try again';
      return;
    }
    
    if (typeof pubkey === 'string' && pubkey.length >= 32) {
      // Use the signInWithNpub for quick login
      const success = await auth.signInWithNpub(pubkey);
      if (success) {
        router.push('/');
      }
    } else {
      nostrError.value = 'Invalid public key format from extension';
    }
  } catch (e) {
    console.error('[nos2x] Error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    
    if (msg.includes('rejected') || msg.includes('denied')) {
      nostrError.value = 'Request was rejected. Please approve the permission in nos2x.';
    } else {
      nostrError.value = msg || 'Failed to connect to nos2x';
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
    router.push('/');
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
      throw new Error('Invalid private key format. Use nsec1... or 64-char hex.');
    }
    
    // Get the derived pubkey from storage
    const nostrStorage = useNostrStorage();
    const { userInfo } = nostrStorage.loadCurrentUser();
    
    if (!userInfo?.pubkey) {
      throw new Error('Failed to derive public key');
    }
    
    const pubkeyHex = userInfo.pubkey;
    console.log('[Nsec] Derived pubkey:', pubkeyHex.slice(0, 16) + '...');
    
    // Set cookie for middleware
    const nostrCookie = useCookie('nostr-pubkey', { maxAge: 60 * 60 * 24 * 30 });
    nostrCookie.value = pubkeyHex;
    
    // Sync with staff user system (creates/links owner account)
    await syncNostrOwner();
    
    // Clear the input
    manualNsec.value = '';
    
    // Navigate to home
    router.push('/');
  } catch (e) {
    console.error('[Nsec] Error:', e);
    nostrError.value = e instanceof Error ? e.message : 'Invalid private key';
  } finally {
    nostrConnecting.value = false;
  }
};

// Check if already authenticated and check Nostr extension
onMounted(() => {
  if (auth.isAuthenticated.value) {
    router.push('/');
  }
  
  // Check for Nostr extension after a short delay (extensions may load async)
  setTimeout(() => {
    hasNostr.value = auth.hasNostrExtension();
    
    // Detect which extension is installed
    if (hasNostr.value && typeof window !== 'undefined') {
      const win = window as unknown as { 
        nostr?: { 
          _requests?: unknown;
          signSchnorr?: unknown;
        };
        alby?: unknown;
      };
      
      // Alby typically has alby object or specific methods
      if (win.alby || (win.nostr && '_requests' in win.nostr)) {
        detectedExtension.value = 'alby';
      } else if (win.nostr && 'signSchnorr' in win.nostr) {
        detectedExtension.value = 'nos2x';
      } else {
        detectedExtension.value = 'unknown';
      }
      console.log('[Nostr] Detected extension:', detectedExtension.value);
    }
  }, 500);
});
</script>

<template>
  <div class="h-full bg-gray-100 dark:bg-gray-950 flex flex-col justify-center">
    <!-- Background Pattern -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
    </div>

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
          <div class="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span class="text-3xl">⚡</span>
          </div>
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">BitSpace POS</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">Lightning-powered Point of Sale</p>
      </div>

      <!-- Sign In Card -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <!-- Tabs -->
        <div class="flex border-b border-gray-200 dark:border-gray-800">
          <button
            class="flex-1 py-4 text-center font-medium transition-colors"
            :class="activeTab === 'nostr' ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800/50' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
            @click="activeTab = 'nostr'"
          >
            <span class="mr-2">⚡</span>
            Nostr
          </button>
          <button
            class="flex-1 py-4 text-center font-medium transition-colors"
            :class="activeTab === 'email' ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800/50' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
            @click="activeTab = 'email'"
          >
            <span class="mr-2">📧</span>
            Email
          </button>
        </div>

        <div class="p-6">
          <!-- Error Message -->
          <div v-if="auth.error.value" class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
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
              @click="handleGoogleSignIn"
            >
              <template #leading>
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </template>
              Continue with Google
            </UButton>

            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-200 dark:border-gray-800" />
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white dark:bg-gray-900 text-gray-500">or sign in with email</span>
              </div>
            </div>

            <form class="space-y-4" @submit.prevent="handleEmailSignIn">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <UInput
                  v-model="email"
                  type="email"
                  placeholder="you@example.com"
                  size="lg"
                  required
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <UInput
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  size="lg"
                  required
                >
                  <template #trailing>
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      :icon="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                      @click="showPassword = !showPassword"
                    />
                  </template>
                </UInput>
              </div>

              <div class="flex items-center justify-between">
                <label class="flex items-center gap-2 cursor-pointer">
                  <UCheckbox v-model="rememberMe" />
                  <span class="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                </label>
                <NuxtLink to="/auth/forgot-password" class="text-sm text-amber-500 hover:text-amber-400">
                  Forgot password?
                </NuxtLink>
              </div>

              <UButton
                type="submit"
                block
                size="lg"
                color="primary"
                :loading="auth.isLoading.value"
              >
                Sign In
              </UButton>
            </form>
          </div>

          <!-- Nostr Sign In -->
          <div v-else class="space-y-4">
            <!-- Nostr Extension Available -->
            <template v-if="hasNostr">
              <div class="text-center py-4">
                <div class="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span class="text-3xl">🔑</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Sign in with Nostr</h3>
                <p class="text-gray-600 dark:text-gray-400 text-sm">
                  Decentralized, private, and secure.
                </p>
              </div>

              <!-- Detected Extension Badge -->
              <div v-if="detectedExtension" class="flex justify-center mb-2">
                <span 
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  :class="{
                    'bg-amber-500/20 text-amber-600 dark:text-amber-400': detectedExtension === 'alby',
                    'bg-purple-500/20 text-purple-600 dark:text-purple-400': detectedExtension === 'nos2x',
                    'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400': detectedExtension === 'unknown'
                  }"
                >
                  <span v-if="detectedExtension === 'alby'">🐝</span>
                  <span v-else-if="detectedExtension === 'nos2x'">🔐</span>
                  <span v-else>🔌</span>
                  {{ detectedExtension === 'alby' ? 'Alby Detected' : 
                     detectedExtension === 'nos2x' ? 'nos2x Detected' : 
                     'Nostr Extension Detected' }}
                </span>
              </div>

              <!-- Nostr Error -->
              <div v-if="nostrError" class="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm whitespace-pre-line">
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
                  Connect with Alby
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
                  Connect with nos2x
                </UButton>
              </div>

              <!-- Extension Help -->
              <div class="mt-4 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <span class="text-amber-400">💡</span> 
                  <strong v-if="detectedExtension === 'alby'" class="text-gray-700 dark:text-gray-300">Alby Tips:</strong>
                  <strong v-else-if="detectedExtension === 'nos2x'" class="text-gray-700 dark:text-gray-300">nos2x Tips:</strong>
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
                <button 
                  type="button"
                  class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 w-full text-center"
                  @click="showManualNpub = !showManualNpub; showNsecInput = false"
                >
                  {{ showManualNpub ? '← Back to extension' : 'Extension not working? Enter npub manually' }}
                </button>
                
                <div v-if="showManualNpub" class="mt-3 space-y-3">
                  <UInput
                    v-model="manualNpub"
                    placeholder="npub1... or hex pubkey"
                    size="lg"
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
                  @click="showNsecInput = !showNsecInput; showManualNpub = false"
                >
                  {{ showNsecInput ? '← Hide private key login' : '🔑 Login with private key (nsec)' }}
                </button>
                
                <div v-if="showNsecInput" class="mt-3 space-y-3">
                  <!-- Security Warning -->
                  <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p class="text-xs text-red-400 flex items-start gap-2">
                      <span class="text-base">⚠️</span>
                      <span>
                        <strong class="block mb-1">Security Warning</strong>
                        Entering your private key here is less secure than using an extension. 
                        Only use this on trusted devices.
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
                    Your key will be stored in session storage and cleared when you close the browser.
                  </p>
                </div>
              </div>
            </template>

            <!-- No Nostr Extension -->
            <template v-else>
              <div class="text-center py-4">
                <div class="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span class="text-3xl opacity-50">🔌</span>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Install Nostr Extension</h3>
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
                    <div class="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                      <span class="text-2xl">🐝</span>
                    </div>
                    <div class="flex-1 text-left">
                      <div class="font-semibold text-amber-600 dark:text-amber-400">Alby</div>
                      <div class="text-xs text-gray-600 dark:text-gray-400">Lightning wallet + Nostr signer</div>
                    </div>
                    <div class="text-amber-500">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                  <div class="mt-2 flex gap-2">
                    <span class="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded">Recommended</span>
                    <span class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">Lightning</span>
                  </div>
                </a>

                <!-- nos2x -->
                <a 
                  href="https://chrome.google.com/webstore/detail/nos2x/kpgefcfmnafjgpblomihpgmejjdanjjp" 
                  target="_blank"
                  class="block p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <span class="text-2xl">🔐</span>
                    </div>
                    <div class="flex-1 text-left">
                      <div class="font-semibold text-purple-600 dark:text-purple-400">nos2x</div>
                      <div class="text-xs text-gray-600 dark:text-gray-400">Simple & lightweight signer</div>
                    </div>
                    <div class="text-purple-500">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                  <div class="mt-2 flex gap-2">
                    <span class="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded">Lightweight</span>
                    <span class="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">Chrome</span>
                  </div>
                </a>
              </div>

              <!-- Manual npub for users without extension -->
              <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button 
                  type="button"
                  class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 w-full text-center"
                  @click="showManualNpub = !showManualNpub; showNsecInput = false"
                >
                  {{ showManualNpub ? '← Hide' : 'Already have a key? Enter npub' }}
                </button>
                
                <div v-if="showManualNpub" class="mt-3 space-y-3">
                  <UInput
                    v-model="manualNpub"
                    placeholder="npub1... or hex pubkey"
                    size="lg"
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
                  @click="showNsecInput = !showNsecInput; showManualNpub = false"
                >
                  {{ showNsecInput ? '← Hide private key login' : '🔑 Login with private key (nsec)' }}
                </button>
                
                <div v-if="showNsecInput" class="mt-3 space-y-3">
                  <!-- Security Warning -->
                  <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p class="text-xs text-red-400 flex items-start gap-2">
                      <span class="text-base">⚠️</span>
                      <span>
                        <strong class="block mb-1">Security Warning</strong>
                        Entering your private key here is less secure than using an extension. 
                        Only use this on trusted devices.
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
                    Your key will be stored in session storage and cleared when you close the browser.
                  </p>
                </div>
              </div>
            </template>

            <!-- Nostr Benefits -->
            <div class="mt-6 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl">
              <h4 class="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">Why Nostr?</h4>
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
        <div class="px-6 py-4 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-800 text-center">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?
            <NuxtLink to="/auth/signup" class="text-amber-500 hover:text-amber-400 font-medium">
              Create one
            </NuxtLink>
          </p>
        </div>
      </div>

      <!-- Bottom Links -->
      <div class="mt-6 text-center text-sm text-gray-500">
        <div class="flex justify-center gap-4">
          <a href="#" class="hover:text-gray-700 dark:hover:text-gray-400">Privacy Policy</a>
          <span>•</span>
          <a href="#" class="hover:text-gray-700 dark:hover:text-gray-400">Terms of Service</a>
        </div>
      </div>
    </div>
  </div>
</template>
