<!-- ============================================
  🔐 BITSPACE STAFF LOGIN COMPONENT
  Hybrid Auth: PIN / Password / Nostr
============================================ -->

<template>
  <UCard class="w-full max-w-md mx-auto">
    <template #header>
      <div class="text-center">
        <UIcon name="i-heroicons-user-circle" class="w-16 h-16 text-primary mx-auto mb-3" />
        <h2 class="text-2xl font-bold">{{ t('auth.staffLogin') }}</h2>
        <p class="text-sm text-gray-500 mt-1">{{ t('auth.selectLoginMethod') }}</p>
      </div>
    </template>

    <!-- Login Method Tabs -->
    <UTabs v-model="selectedMethod" :items="loginMethods" class="mb-6">
      <template #default="{ item }">
        <div class="flex items-center gap-2">
          <UIcon :name="item.icon" class="w-4 h-4" />
          <span>{{ item.label }}</span>
        </div>
      </template>
    </UTabs>

    <!-- PIN Login (Default) -->
    <div v-if="selectedMethod === 0" class="space-y-6">
      <div class="text-center">
        <p class="text-sm text-gray-600 mb-4">{{ t('auth.enterYourPin') }}</p>
        
        <!-- PIN Display -->
        <div class="flex justify-center gap-3 mb-6">
          <div 
            v-for="i in 4" 
            :key="i"
            class="w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all"
            :class="{
              'border-primary bg-primary/10': pinInput.length >= i,
              'border-gray-300': pinInput.length < i
            }"
          >
            <span v-if="pinInput.length >= i">•</span>
          </div>
        </div>
        
        <!-- PIN Keypad -->
        <div class="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
          <UButton
            v-for="num in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
            :key="num"
            variant="outline"
            size="xl"
            class="h-16 text-xl font-semibold"
            :disabled="isLoading"
            @click="addPinDigit(num.toString())"
          >
            {{ num }}
          </UButton>
          
          <UButton
            variant="ghost"
            size="xl"
            class="h-16"
            :disabled="isLoading || pinInput.length === 0"
            @click="clearPin"
          >
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </UButton>
          
          <UButton
            variant="outline"
            size="xl"
            class="h-16 text-xl font-semibold"
            :disabled="isLoading"
            @click="addPinDigit('0')"
          >
            0
          </UButton>
          
          <UButton
            variant="ghost"
            size="xl"
            class="h-16"
            :disabled="isLoading || pinInput.length === 0"
            @click="removePinDigit"
          >
            <UIcon name="i-heroicons-backspace" class="w-6 h-6" />
          </UButton>
        </div>
      </div>
      
      <!-- Error Message -->
      <p v-if="errorMessage" class="text-center text-red-500 text-sm">
        {{ errorMessage }}
      </p>
    </div>

    <!-- Password Login -->
    <div v-else-if="selectedMethod === 1" class="space-y-4">
      <UFormField :label="t('auth.emailOrUsername')">
        <UInput
          v-model="passwordForm.identifier"
          :placeholder="t('auth.emailOrUsernamePlaceholder')"
          icon="i-heroicons-user"
          size="lg"
          :disabled="isLoading"
        />
      </UFormField>
      
      <UFormField :label="t('auth.password')">
        <UInput
          v-model="passwordForm.password"
          type="password"
          :placeholder="t('auth.passwordPlaceholder')"
          icon="i-heroicons-lock-closed"
          size="lg"
          :disabled="isLoading"
          @keyup.enter="handlePasswordLogin"
        />
      </UFormField>
      
      <!-- Error Message -->
      <p v-if="errorMessage" class="text-red-500 text-sm">
        {{ errorMessage }}
      </p>
      
      <UButton
        block
        size="lg"
        :loading="isLoading"
        :disabled="!passwordForm.identifier || !passwordForm.password"
        @click="handlePasswordLogin"
      >
        <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5 mr-2" />
        {{ t('auth.signIn') }}
      </UButton>
    </div>

    <!-- Nostr Login -->
    <div v-else-if="selectedMethod === 2" class="space-y-4">
      <!-- NIP-07 Extension Option -->
      <div v-if="hasNip07Extension" class="mb-6">
        <UButton
          block
          size="lg"
          variant="soft"
          :loading="isLoading && nostrMethod === 'extension'"
          @click="handleNip07Login"
        >
          <UIcon name="i-heroicons-puzzle-piece" class="w-5 h-5 mr-2" />
          {{ t('auth.loginWithExtension') }}
        </UButton>
        
        <div class="relative my-4">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-gray-300" />
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">{{ t('common.or') }}</span>
          </div>
        </div>
      </div>
      
      <!-- Manual nsec Entry -->
      <UFormField :label="t('auth.enterNsec')">
        <UInput
          v-model="nostrForm.nsec"
          type="password"
          placeholder="nsec1..."
          icon="i-heroicons-key"
          size="lg"
          :disabled="isLoading"
        />
      </UFormField>
      
      <p class="text-xs text-gray-500">
        <UIcon name="i-heroicons-shield-check" class="w-4 h-4 inline mr-1" />
        {{ t('auth.nsecSecurityNote') }}
      </p>
      
      <!-- Error Message -->
      <p v-if="errorMessage" class="text-red-500 text-sm">
        {{ errorMessage }}
      </p>
      
      <UButton
        block
        size="lg"
        :loading="isLoading && nostrMethod === 'nsec'"
        :disabled="!isValidNsec"
        @click="handleNsecLogin"
      >
        <UIcon name="i-heroicons-bolt" class="w-5 h-5 mr-2" />
        {{ t('auth.signWithNostr') }}
      </UButton>
    </div>

    <template #footer>
      <div class="text-center">
        <p class="text-xs text-gray-500">
          {{ t('auth.securityReminder') }}
        </p>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import type { StoreUser, AuthMethod } from '~/types';

// Props & Emits
const props = defineProps<{
  users: StoreUser[];
  showNostr?: boolean;
  showPassword?: boolean;
}>();

const emit = defineEmits<{
  (e: 'login', user: StoreUser, method: AuthMethod): void;
  (e: 'error', message: string): void;
}>();

// Composables
const { t } = useI18n();
const toast = useToast();
const staffAuth = useStaffAuth();

// State
const selectedMethod = ref(0);
const pinInput = ref('');
const errorMessage = ref('');
const isLoading = ref(false);
const nostrMethod = ref<'extension' | 'nsec'>('extension');

// Forms
const passwordForm = reactive({
  identifier: '',
  password: '',
});

const nostrForm = reactive({
  nsec: '',
});

// Computed
const loginMethods = computed(() => {
  const methods = [
    { key: 'pin', label: 'PIN', icon: 'i-heroicons-key' },
  ];
  
  if (props.showPassword !== false) {
    methods.push({ key: 'password', label: t('auth.password'), icon: 'i-heroicons-lock-closed' });
  }
  
  if (props.showNostr !== false) {
    methods.push({ key: 'nostr', label: 'Nostr', icon: 'i-heroicons-bolt' });
  }
  
  return methods;
});

const hasNip07Extension = computed(() => {
  if (import.meta.client) {
    return !!(window as Window & { nostr?: unknown }).nostr;
  }
  return false;
});

const isValidNsec = computed(() => {
  return nostrForm.nsec.startsWith('nsec1') && nostrForm.nsec.length > 60;
});

// Methods
function addPinDigit(digit: string) {
  if (pinInput.value.length < 6) {
    pinInput.value += digit;
    errorMessage.value = '';
    
    // Auto-submit when PIN length is 4-6
    if (pinInput.value.length >= 4) {
      handlePinLogin();
    }
  }
}

function removePinDigit() {
  pinInput.value = pinInput.value.slice(0, -1);
}

function clearPin() {
  pinInput.value = '';
  errorMessage.value = '';
}

async function handlePinLogin() {
  if (pinInput.value.length < 4) return;
  
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    const result = await staffAuth.loginWithPin(pinInput.value, props.users);
    
    if (result.success && result.user) {
      emit('login', result.user, 'pin');
      toast.add({
        title: t('auth.loginSuccess'),
        description: t('auth.welcomeBack', { name: result.user.name }),
        color: 'success',
      });
    } else {
      errorMessage.value = result.error || t('auth.invalidPin');
      clearPin();
    }
  } catch {
    errorMessage.value = t('auth.loginFailed');
    clearPin();
  } finally {
    isLoading.value = false;
  }
}

async function handlePasswordLogin() {
  if (!passwordForm.identifier || !passwordForm.password) return;
  
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    const result = await staffAuth.loginWithPassword(
      passwordForm.identifier,
      passwordForm.password,
      props.users
    );
    
    if (result.success && result.user) {
      emit('login', result.user, 'password');
      toast.add({
        title: t('auth.loginSuccess'),
        description: t('auth.welcomeBack', { name: result.user.name }),
        color: 'success',
      });
    } else {
      errorMessage.value = result.error || t('auth.invalidCredentials');
    }
  } catch {
    errorMessage.value = t('auth.loginFailed');
  } finally {
    isLoading.value = false;
  }
}

async function handleNsecLogin() {
  if (!isValidNsec.value) return;
  
  isLoading.value = true;
  nostrMethod.value = 'nsec';
  errorMessage.value = '';
  
  try {
    const result = await staffAuth.loginWithNostr(nostrForm.nsec, props.users);
    
    if (result.success && result.user) {
      emit('login', result.user, 'nostr');
      toast.add({
        title: t('auth.loginSuccess'),
        description: t('auth.welcomeBack', { name: result.user.name }),
        color: 'success',
      });
    } else {
      errorMessage.value = result.error || t('auth.nostrLoginFailed');
    }
  } catch {
    errorMessage.value = t('auth.loginFailed');
  } finally {
    isLoading.value = false;
    nostrForm.nsec = ''; // Clear nsec for security
  }
}

async function handleNip07Login() {
  if (!hasNip07Extension.value) return;
  
  isLoading.value = true;
  nostrMethod.value = 'extension';
  errorMessage.value = '';
  
  try {
    const nostrExt = (window as Window & { nostr?: { getPublicKey: () => Promise<string>; signEvent: (event: Record<string, unknown>) => Promise<Record<string, unknown>> } }).nostr;
    if (!nostrExt) {
      errorMessage.value = t('auth.nip07Failed');
      return;
    }
    
    const pubkey = await nostrExt.getPublicKey();
    
    // Find user by pubkey
    const nostrKey = useNostrKey();
    const npub = nostrKey.hexToNpub(pubkey);
    
    const user = props.users.find(u => u.npub === npub || u.pubkeyHex === pubkey);
    
    if (!user) {
      errorMessage.value = t('auth.userNotFoundWithKey');
      return;
    }
    
    // Check user status
    if (!user.isActive) {
      errorMessage.value = t('auth.accountDeactivated');
      return;
    }
    
    if (user.revokedAt) {
      errorMessage.value = t('auth.accessRevoked');
      return;
    }
    
    // Generate challenge
    const challenge = staffAuth.generateAuthChallenge(npub);
    
    // Sign challenge with extension
    const signedEvent = await nostrExt.signEvent({
      kind: 22242,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['challenge', challenge.challenge]],
      content: 'Authenticate to BitSpace POS',
    });
    
    // Verify signature
    const isValid = await staffAuth.verifyNostrSignature(
      npub,
      JSON.stringify(signedEvent),
      challenge.id
    );
    
    if (isValid) {
      emit('login', user, 'nostr');
      toast.add({
        title: t('auth.loginSuccess'),
        description: t('auth.welcomeBack', { name: user.name }),
        color: 'success',
      });
    } else {
      errorMessage.value = t('auth.signatureVerificationFailed');
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('User rejected')) {
      errorMessage.value = t('auth.userRejectedSignature');
    } else {
      errorMessage.value = t('auth.nip07Failed');
    }
  } finally {
    isLoading.value = false;
  }
}

// Watch for tab changes to clear errors
watch(selectedMethod, () => {
  errorMessage.value = '';
});
</script>
