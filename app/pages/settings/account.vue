<template>
  <div class="p-6">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ $t("account.settings") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          {{ $t("account.settings_description") }}
        </p>
      </div>

      <UCard>
        <UTabs v-model="selectedTab" :items="tabItems" class="w-full">
          <!-- Profile Tab -->
          <template #profile="{ item }">
            <div class="space-y-6">
              <!-- Profile Header -->
              <div class="flex items-center space-x-6">
                <div class="relative">
                  <img
                    :src="userProfile.avatar || '/default-avatar.png'"
                    :alt="userProfile.name"
                    class="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                  />
                  <UButton
                    icon="i-heroicons-camera"
                    size="sm"
                    color="primary"
                    variant="solid"
                    class="absolute bottom-0 right-0 rounded-full"
                    @click="openAvatarModal"
                  />
                </div>
                <div>
                  <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                    {{ userProfile.name }}
                  </h3>
                  <p class="text-gray-600 dark:text-gray-400">{{ userProfile.email }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-500">
                    {{ $t("account.member_since") }}:
                    {{ formatDate(userProfile.createdAt) }}
                  </p>
                </div>
              </div>

              <!-- Profile Form -->
              <UForm
                :schema="profileSchema"
                :state="profileForm"
                @submit="updateProfile"
              >
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <UFormField
                    name="firstName"
                    :label="$t('account.first_name')"
                  >
                    <UInput v-model="profileForm.firstName" />
                  </UFormField>

                  <UFormField name="lastName" :label="$t('account.last_name')">
                    <UInput v-model="profileForm.lastName" />
                  </UFormField>

                  <UFormField name="email" :label="$t('account.email')">
                    <UInput v-model="profileForm.email" type="email" />
                  </UFormField>

                  <UFormField name="phone" :label="$t('account.phone')">
                    <UInput v-model="profileForm.phone" />
                  </UFormField>

                  <UFormField name="position" :label="$t('account.position')">
                    <UInput v-model="profileForm.position" />
                  </UFormField>

                  <UFormField name="branch" :label="$t('account.branch')">
                    <USelect
                      v-model="profileForm.branchId"
                      :items="branchOptions"
                      label-key="label"
                      value-key="value"
                    />
                  </UFormField>
                </div>

                <div class="mt-6">
                  <UFormField name="bio" :label="$t('account.bio')">
                    <UTextarea v-model="profileForm.bio" :rows="4" />
                  </UFormField>
                </div>

                <div class="flex justify-end mt-6">
                  <UButton
                    type="submit"
                    color="primary"
                    :loading="isUpdatingProfile"
                  >
                    {{ $t("common.save_changes") }}
                  </UButton>
                </div>
              </UForm>
            </div>
          </template>

          <!-- Security Tab -->
          <template #security="{ item }">
            <div class="space-y-8">
              <!-- Change Password -->
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {{ $t("account.change_password") }}
                </h3>
                <UForm
                  :schema="passwordSchema"
                  :state="passwordForm"
                  @submit="changePassword"
                >
                  <div class="space-y-4">
                    <UFormField
                      name="currentPassword"
                      :label="$t('account.current_password')"
                    >
                      <UInput
                        v-model="passwordForm.currentPassword"
                        type="password"
                      />
                    </UFormField>

                    <UFormField
                      name="newPassword"
                      :label="$t('account.new_password')"
                    >
                      <UInput
                        v-model="passwordForm.newPassword"
                        type="password"
                      />
                    </UFormField>

                    <UFormField
                      name="confirmPassword"
                      :label="$t('account.confirm_password')"
                    >
                      <UInput
                        v-model="passwordForm.confirmPassword"
                        type="password"
                      />
                    </UFormField>
                  </div>

                  <div class="flex justify-end mt-6">
                    <UButton
                      type="submit"
                      color="primary"
                      :loading="isChangingPassword"
                    >
                      {{ $t("account.update_password") }}
                    </UButton>
                  </div>
                </UForm>
              </div>

              <!-- Two-Factor Authentication -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-8">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                      {{ $t("account.two_factor_auth") }}
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400">
                      {{ $t("account.two_factor_description") }}
                    </p>
                  </div>
                  <USwitch
                    v-model="securitySettings.twoFactorEnabled"
                    @change="toggleTwoFactor"
                  />
                </div>

                <div
                  v-if="securitySettings.twoFactorEnabled"
                  class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg"
                >
                  <div class="flex items-center">
                    <Icon
                      name="heroicons:shield-check"
                      class="text-green-600 dark:text-green-400 text-xl mr-3"
                    />
                    <span class="text-green-800 dark:text-green-300">{{
                      $t("account.two_factor_enabled")
                    }}</span>
                  </div>
                </div>
              </div>

              <!-- Active Sessions -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-8">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {{ $t("account.active_sessions") }}
                </h3>
                <div class="space-y-4">
                  <div
                    v-for="session in activeSessions"
                    :key="session.id"
                    class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div class="flex items-center space-x-4">
                      <Icon
                        :name="getDeviceIcon(session.device)"
                        class="text-gray-600 dark:text-gray-400 text-xl"
                      />
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">{{ session.device }}</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                          {{ session.location }} •
                          {{ formatDate(session.lastActive) }}
                        </p>
                      </div>
                      <span
                        v-if="session.current"
                        class="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded-full"
                      >
                        {{ $t("account.current_session") }}
                      </span>
                    </div>
                    <UButton
                      v-if="!session.current"
                      color="red"
                      variant="ghost"
                      size="sm"
                      @click="terminateSession(session.id)"
                    >
                      {{ $t("account.terminate") }}
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Preferences Tab -->
          <template #preferences="{ item }">
            <div class="space-y-8">
              <!-- Language & Region -->
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {{ $t("account.language_region") }}
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField :label="$t('account.language')">
                    <USelect
                      v-model="preferences.language"
                      :items="languageOptions"
                      label-key="label"
                      value-key="value"
                      @change="changeLanguage"
                    />
                  </UFormField>

                  <UFormField :label="$t('account.timezone')">
                    <USelect
                      v-model="preferences.timezone"
                      :items="timezoneOptions"
                      label-key="label"
                      value-key="value"
                    />
                  </UFormField>

                  <UFormField :label="$t('account.date_format')">
                    <USelect
                      v-model="preferences.dateFormat"
                      :items="dateFormatOptions"
                      label-key="label"
                      value-key="value"
                    />
                  </UFormField>

                  <UFormField :label="$t('account.currency')">
                    <USelect
                      v-model="preferences.currency"
                      :items="currencyOptions"
                      label-key="label"
                      value-key="value"
                    />
                  </UFormField>
                </div>
              </div>

              <!-- Display Settings -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-8">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {{ $t("account.display_settings") }}
                </h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">{{ $t("account.dark_mode") }}</p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.dark_mode_description") }}
                      </p>
                    </div>
                    <USwitch
                      v-model="preferences.darkMode"
                      @change="toggleDarkMode"
                    />
                  </div>

                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.compact_view") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.compact_view_description") }}
                      </p>
                    </div>
                    <USwitch v-model="preferences.compactView" />
                  </div>
                </div>
              </div>

              <!-- Save Preferences -->
              <div class="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                <UButton
                  color="primary"
                  :loading="isSavingPreferences"
                  @click="savePreferences"
                >
                  {{ $t("common.save_changes") }}
                </UButton>
              </div>
            </div>
          </template>

          <!-- Notifications Tab -->
          <template #notifications="{ item }">
            <div class="space-y-8">
              <!-- Email Notifications -->
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {{ $t("account.email_notifications") }}
                </h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.order_updates") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.order_updates_description") }}
                      </p>
                    </div>
                    <USwitch v-model="notifications.email.orders" />
                  </div>

                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.inventory_alerts") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.inventory_alerts_description") }}
                      </p>
                    </div>
                    <USwitch v-model="notifications.email.inventory" />
                  </div>

                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.system_updates") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.system_updates_description") }}
                      </p>
                    </div>
                    <USwitch v-model="notifications.email.system" />
                  </div>
                </div>
              </div>

              <!-- Push Notifications -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-8">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {{ $t("account.push_notifications") }}
                </h3>
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.real_time_alerts") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.real_time_alerts_description") }}
                      </p>
                    </div>
                    <USwitch v-model="notifications.push.realTime" />
                  </div>

                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-gray-900 dark:text-white">
                        {{ $t("account.daily_summary") }}
                      </p>
                      <p class="text-sm text-gray-600 dark:text-gray-400">
                        {{ $t("account.daily_summary_description") }}
                      </p>
                    </div>
                    <USwitch v-model="notifications.push.dailySummary" />
                  </div>
                </div>
              </div>

              <!-- Notification Schedule -->
              <div class="border-t border-gray-200 dark:border-gray-700 pt-8">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {{ $t("account.notification_schedule") }}
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField :label="$t('account.quiet_hours_start')">
                    <UInput
                      v-model="notifications.quietHours.start"
                      type="time"
                    />
                  </UFormField>

                  <UFormField :label="$t('account.quiet_hours_end')">
                    <UInput
                      v-model="notifications.quietHours.end"
                      type="time"
                    />
                  </UFormField>
                </div>
              </div>

              <!-- Save Notifications -->
              <div class="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                <UButton
                  color="primary"
                  :loading="isSavingNotifications"
                  @click="saveNotifications"
                >
                  {{ $t("common.save_changes") }}
                </UButton>
              </div>
            </div>
          </template>
        </UTabs>
      </UCard>
    </div>

    <!-- Avatar Upload Modal -->
    <UModal v-model:open="isAvatarModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ $t("account.change_avatar") }}
            </h3>
          </template>

          <div class="space-y-4">
            <div class="flex justify-center">
              <img
                :src="
                  previewAvatar || userProfile.avatar || '/default-avatar.png'
                "
                alt="Avatar preview"
                class="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
              />
            </div>

            <div class="flex justify-center">
              <input
                ref="avatarInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleAvatarUpload"
              />
              <UButton
                color="primary"
                variant="outline"
                @click="$refs.avatarInput.click()"
              >
                {{ $t("account.choose_file") }}
              </UButton>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end space-x-3">
              <UButton
                color="gray"
                variant="ghost"
                @click="isAvatarModalOpen = false"
              >
                {{ $t("common.cancel") }}
              </UButton>
              <UButton
                color="primary"
                :loading="isUploadingAvatar"
                @click="uploadAvatar"
              >
                {{ $t("common.save") }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { z } from "zod";

const { t } = useI18n();
const colorMode = useColorMode();

// Page meta
definePageMeta({
  title: "Account Settings",
  middleware: "auth",
});

// Reactive data
const selectedTab = ref("0");
const isUpdatingProfile = ref(false);
const isChangingPassword = ref(false);
const isSavingPreferences = ref(false);
const isSavingNotifications = ref(false);
const isAvatarModalOpen = ref(false);
const isUploadingAvatar = ref(false);
const previewAvatar = ref("");

// Tab configuration
const tabItems = computed(() => [
  {
    slot: "profile",
    label: t("account.profile"),
    icon: "i-heroicons-user",
  },
  {
    slot: "security",
    label: t("account.security"),
    icon: "i-heroicons-shield-check",
  },
  {
    slot: "preferences",
    label: t("account.preferences"),
    icon: "i-heroicons-cog-6-tooth",
  },
  {
    slot: "notifications",
    label: t("account.notifications"),
    icon: "i-heroicons-bell",
  },
]);

// User profile data
const userProfile = ref({
  id: "1",
  name: "John Doe",
  email: "john.doe@example.com",
  avatar: null,
  createdAt: "2024-01-15",
  branchId: "1",
});

// Form schemas
const profileSchema = z.object({
  firstName: z.string().min(1, t("validation.required")),
  lastName: z.string().min(1, t("validation.required")),
  email: z.string().email(t("validation.invalid_email")),
  phone: z.string().optional(),
  position: z.string().optional(),
  branchId: z.string().min(1, t("validation.required")),
  bio: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, t("validation.required")),
    newPassword: z.string().min(8, t("validation.min_length", { length: 8 })),
    confirmPassword: z.string().min(1, t("validation.required")),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: t("validation.passwords_dont_match"),
    path: ["confirmPassword"],
  });

// Form states
const profileForm = reactive({
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "+856 20 12345678",
  position: "Store Manager",
  branchId: "1",
  bio: "Experienced retail manager with 5+ years in POS systems.",
});

const passwordForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

// Security settings
const securitySettings = reactive({
  twoFactorEnabled: false,
});

// Active sessions
const activeSessions = ref([
  {
    id: "1",
    device: "Chrome on Windows",
    location: "Vientiane, LA",
    lastActive: "2024-07-26T10:30:00Z",
    current: true,
  },
  {
    id: "2",
    device: "Safari on iPhone",
    location: "Vientiane, LA",
    lastActive: "2024-07-25T15:45:00Z",
    current: false,
  },
]);

// Preferences
const preferences = reactive({
  language: "lo_LA",
  timezone: "Asia/Vientiane",
  dateFormat: "DD/MM/YYYY",
  currency: "LAK",
  darkMode: colorMode.preference === 'dark',
  compactView: false,
});

// Notifications
const notifications = reactive({
  email: {
    orders: true,
    inventory: true,
    system: false,
  },
  push: {
    realTime: true,
    dailySummary: false,
  },
  quietHours: {
    start: "22:00",
    end: "07:00",
  },
});

// Options
const branchOptions = ref([
  { label: "Main Branch - Vientiane", value: "1" },
  { label: "Branch 2 - Luang Prabang", value: "2" },
  { label: "Branch 3 - Savannakhet", value: "3" },
]);

const languageOptions = ref([
  { label: "ລາວ (Lao)", value: "lo_LA" },
  { label: "English", value: "en_US" },
]);

const timezoneOptions = ref([
  { label: "Asia/Vientiane (GMT+7)", value: "Asia/Vientiane" },
  { label: "Asia/Bangkok (GMT+7)", value: "Asia/Bangkok" },
]);

const dateFormatOptions = ref([
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
]);

const currencyOptions = ref([
  { label: "LAK (₭)", value: "LAK" },
  { label: "USD ($)", value: "USD" },
  { label: "THB (฿)", value: "THB" },
]);

// Methods
const updateProfile = async (event: any) => {
  isUpdatingProfile.value = true;
  try {
    // API call to update profile
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    // Show success toast
    console.log("Profile updated successfully");
  } catch (error) {
    // Show error toast
    console.error("Failed to update profile:", error);
  } finally {
    isUpdatingProfile.value = false;
  }
};

const changePassword = async (event: any) => {
  isChangingPassword.value = true;
  try {
    // API call to change password
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    // Clear form
    Object.assign(passwordForm, {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    // Show success toast
    console.log("Password changed successfully");
  } catch (error) {
    // Show error toast
    console.error("Failed to change password:", error);
  } finally {
    isChangingPassword.value = false;
  }
};

const toggleTwoFactor = async (enabled: boolean) => {
  try {
    // API call to toggle 2FA
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("Two-factor authentication", enabled ? "enabled" : "disabled");
  } catch (error) {
    // Revert the toggle
    securitySettings.twoFactorEnabled = !enabled;
    console.error("Failed to toggle 2FA:", error);
  }
};

const terminateSession = async (sessionId: string) => {
  try {
    // API call to terminate session
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Remove from active sessions
    const index = activeSessions.value.findIndex((s) => s.id === sessionId);
    if (index > -1) {
      activeSessions.value.splice(index, 1);
    }
    console.log("Session terminated successfully");
  } catch (error) {
    console.error("Failed to terminate session:", error);
  }
};

const changeLanguage = (newLanguage: string) => {
  // Update i18n locale
  const { setLocale } = useI18n();
  setLocale(newLanguage);
};

const toggleDarkMode = (enabled: boolean) => {
  // Toggle dark mode using Nuxt color mode
  colorMode.preference = enabled ? 'dark' : 'light';
  console.log("Dark mode", enabled ? "enabled" : "disabled");
};

const savePreferences = async () => {
  isSavingPreferences.value = true;
  try {
    // API call to save preferences
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Preferences saved successfully");
  } catch (error) {
    console.error("Failed to save preferences:", error);
  } finally {
    isSavingPreferences.value = false;
  }
};

const saveNotifications = async () => {
  isSavingNotifications.value = true;
  try {
    // API call to save notification settings
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Notification settings saved successfully");
  } catch (error) {
    console.error("Failed to save notification settings:", error);
  } finally {
    isSavingNotifications.value = false;
  }
};

const openAvatarModal = () => {
  isAvatarModalOpen.value = true;
  previewAvatar.value = "";
};

const handleAvatarUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewAvatar.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const uploadAvatar = async () => {
  isUploadingAvatar.value = true;
  try {
    // API call to upload avatar
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Update user profile avatar
    userProfile.value.avatar = previewAvatar.value;
    isAvatarModalOpen.value = false;
    console.log("Avatar uploaded successfully");
  } catch (error) {
    console.error("Failed to upload avatar:", error);
  } finally {
    isUploadingAvatar.value = false;
  }
};

const getDeviceIcon = (device: string) => {
  if (device.includes("iPhone") || device.includes("Android")) {
    return "heroicons:device-phone-mobile";
  } else if (device.includes("iPad") || device.includes("Tablet")) {
    return "heroicons:device-tablet";
  }
  return "heroicons:computer-desktop";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

// Sync dark mode preference on mount and watch for external changes
onMounted(() => {
  preferences.darkMode = colorMode.preference === 'dark' || colorMode.value === 'dark';
});

// Watch for external color mode changes (e.g., from other components)
watch(() => colorMode.value, (newVal) => {
  preferences.darkMode = newVal === 'dark';
});
</script>
