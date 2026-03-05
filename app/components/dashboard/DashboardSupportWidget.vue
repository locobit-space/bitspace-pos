<!-- components/dashboard/DashboardSupportWidget.vue -->
<script setup lang="ts">
import { nip19 } from "nostr-tools";
import { NOSTR_KINDS } from "~/types/nostr-kinds";
import QRCodeVue from "qrcode.vue";

const config = useRuntimeConfig();
const { t } = useI18n();
const relay = useNostrRelay();

type NostrProfile = {
  display_name?: string;
  name?: string;
  picture?: string;
  lud16?: string;
  lud06?: string;
  [key: string]: unknown;
};

// State
const isDismissed = ref(false);
const isLoading = ref(true);
const profile = ref<NostrProfile | null>(null);
const shouldShow = ref(false);

// Developer's npub - hardcoded (same as SupportModal)
const DEVELOPER_NPUB =
  "npub1e65vutc5cfgutyvjetu5wp3ael48asklchtrut8m2svtt4lxdp4sruf0pk";

// Storage key for daily dismissal
const DISMISS_KEY = "bitspace_support_widget_last_shown";
const PROFILE_CACHE_KEY = "bitspace_support_widget_profile_cache";
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CachedProfile = {
  profile: NostrProfile;
  cachedAt: number;
};

// Computed
const developerPubkey = computed(() => {
  try {
    const decoded = nip19.decode(DEVELOPER_NPUB);
    if (decoded.type === "npub") {
      return decoded.data as string;
    }
  } catch (e) {
    console.error("Failed to decode npub:", e);
  }
  return null;
});

const toStringValue = (value: unknown) => {
  return typeof value === "string" ? value : "";
};

const lightningAddress = computed<string>(() => {
  return (
    toStringValue(profile.value?.lud16) ||
    toStringValue(profile.value?.lud06) ||
    toStringValue(config.public?.developerLud16)
  );
});

const developerName = computed<string>(() => {
  return (
    toStringValue(profile.value?.display_name) ||
    toStringValue(profile.value?.name) ||
    toStringValue(config.public?.developerName) ||
    "BitSpace Developer"
  );
});

// Check if we should show based on daily limit
const checkVisibility = () => {
  if (import.meta.server) return;

  const lastShown = localStorage.getItem(DISMISS_KEY);
  if (!lastShown) {
    shouldShow.value = true;
    return;
  }

  const lastDate = new Date(parseInt(lastShown)).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);

  // Show if last shown was before today (yesterday or earlier)
  if (today > lastDate) {
    shouldShow.value = true;
  } else {
    shouldShow.value = false;
  }
};

const readProfileCache = () => {
  if (import.meta.server) return null;

  const raw = localStorage.getItem(PROFILE_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedProfile;
    const isValid =
      parsed &&
      typeof parsed.cachedAt === "number" &&
      typeof parsed.profile === "object" &&
      parsed.profile !== null;

    if (!isValid) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }

    const isFresh = Date.now() - parsed.cachedAt < PROFILE_CACHE_TTL_MS;
    return {
      profile: parsed.profile as NostrProfile,
      isFresh,
    };
  } catch {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    return null;
  }
};

const writeProfileCache = (nextProfile: NostrProfile) => {
  if (import.meta.server) return;

  const payload: CachedProfile = {
    profile: nextProfile,
    cachedAt: Date.now(),
  };

  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
};

// Fetch profile
async function fetchProfile() {
  if (!developerPubkey.value) {
    isLoading.value = false;
    return;
  }

  try {
    const events = await relay.queryEvents({
      kinds: [NOSTR_KINDS.PROFILE],
      authors: [developerPubkey.value],
      limit: 1,
    });

    if (events.length > 0 && events[0]) {
      const content = JSON.parse(events[0].content);
      if (content && typeof content === "object") {
        const parsedProfile = content as NostrProfile;
        profile.value = parsedProfile;
        writeProfileCache(parsedProfile);
      }
    }
  } catch (e) {
    console.error("Failed to fetch profile:", e);
  } finally {
    isLoading.value = false;
  }
}

// Actions
const dismiss = () => {
  isDismissed.value = true;
  if (import.meta.client) {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }
};

const emit = defineEmits(["open-support"]);

const openSupportModal = () => {
  emit("open-support");
};

// Lifecycle
onMounted(() => {
  checkVisibility();
  if (!shouldShow.value) return;

  const cached = readProfileCache();
  if (cached?.profile) {
    profile.value = cached.profile;
  }

  if (cached?.isFresh) {
    isLoading.value = false;
    return;
  }

  if (cached?.profile) {
    isLoading.value = false;
    setTimeout(() => {
      fetchProfile();
    }, 0);
    return;
  }

  fetchProfile();
});
</script>

<template>
  <div
    v-if="shouldShow && !isDismissed"
    class="bg-linear-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200 dark:border-amber-800 p-4 relative overflow-hidden mb-6"
  >
    <!-- Decoration -->
    <div
      class="absolute -top-6 -right-6 w-24 h-24 bg-amber-400/20 rounded-full blur-2xl"
    />

    <div class="flex items-start gap-4 relative z-10">
      <!-- Avatar -->
      <div class="shrink-0">
        <div
          class="w-12 h-12 rounded-full bg-linear-to-br from-amber-400 to-orange-500 p-0.5"
        >
          <img
            v-if="profile?.picture"
            :src="profile.picture"
            :alt="developerName"
            class="w-full h-full rounded-full object-cover"
          >
          <div
            v-else
            class="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-xl"
          >
            ☕
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <h3
          class="text-base font-semibold text-gray-900 dark:text-white truncate"
        >
          {{ t("dashboard.support.title", "Enjoying BnOS POS?") }}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
          {{
            t(
              "dashboard.support.subtitle",
              "Support development with a lightning zap!",
            )
          }}
        </p>

        <div class="mt-3">
          <UButton
            color="amber"
            variant="solid"
            size="sm"
            icon="emojione-v1:lightning-mood"
            @click="openSupportModal"
          >
            {{ t("common.support.title", "Support") }}
          </UButton>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex shrink-0">
        <!-- Static QR & Address -->
        <div
          v-if="lightningAddress"
          class="flex flex-col items-center gap-3 bg-white/50 dark:bg-black/20 p-2 rounded-lg w-fit"
        >
          <div class="bg-white p-3 rounded-lg">
            <QRCodeVue
              :value="lightningAddress"
              :size="100"
              level="M"
              render-as="svg"
              class="rounded-sm"
            />
          </div>
          <code
            class="text-xs font-mono text-gray-900 dark:text-gray-200 select-all truncate"
          >
            {{ lightningAddress }}
          </code>
        </div>

        <span>
          <UButton
            color="gray"
            variant="ghost"
            size="sm"
            icon="solar:close-circle-linear"
            @click="dismiss"
          />
        </span>
      </div>
    </div>
  </div>
</template>
