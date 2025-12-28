<template>
  <div class="space-y-6 w-full flex max-w-3xl mx-auto flex-col">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ $t("settings.general.title") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          {{ $t("settings.general.description") }}
        </p>
      </div>
      <UButton
        :label="$t('common.save')"
        icon="i-heroicons-check"
        size="lg"
        :loading="saving"
        @click="saveSettings"
      />
    </div>

    <!-- Settings Form -->
    <UForm
      ref="formRef"
      :schema="schema"
      :state="state"
      class="w-full"
      @submit="onSubmit"
    >
      <UTabs v-model="activeTab" :items="tabs" class="w-full">
        <!-- General Tab -->
        <template #general="{ item }">
          <UCard class="mt-4">
            <div class="space-y-6">
              <!-- Company Information -->
              <div>
                <h3 class="text-lg font-semibold mb-4">
                  {{ $t("settings.general.company_info") }}
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField
                    :label="$t('settings.general.company_name')"
                    name="companyName"
                    required
                  >
                    <UInput
                      v-model="state.companyName"
                      :placeholder="
                        $t('settings.general.company_name_placeholder')
                      "
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('settings.general.company_email')"
                    name="companyEmail"
                    required
                  >
                    <UInput
                      v-model="state.companyEmail"
                      type="email"
                      :placeholder="
                        $t('settings.general.company_email_placeholder')
                      "
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('settings.general.company_phone')"
                    name="companyPhone"
                  >
                    <UInput
                      v-model="state.companyPhone"
                      :placeholder="
                        $t('settings.general.company_phone_placeholder')
                      "
                      class="w-full"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('settings.general.tax_number')"
                    name="taxNumber"
                  >
                    <UInput
                      v-model="state.taxNumber"
                      :placeholder="
                        $t('settings.general.tax_number_placeholder')
                      "
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <UFormField
                  :label="$t('settings.general.company_address')"
                  name="companyAddress"
                  class="mt-4"
                >
                  <UTextarea
                    v-model="state.companyAddress"
                    :placeholder="
                      $t('settings.general.company_address_placeholder')
                    "
                    class="w-full"
                    :rows="3"
                  />
                </UFormField>
              </div>

              <!-- System Settings -->
              <div>
                <h3 class="text-lg font-semibold mb-4">
                  {{ $t("settings.general.system_settings") }}
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField
                    :label="$t('settings.general.default_currency')"
                    name="defaultCurrency"
                    required
                  >
                    <USelect
                      v-model="state.defaultCurrency"
                      :items="currencies"
                      label-key="name"
                      value-key="code"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('settings.general.default_language')"
                    name="defaultLanguage"
                    required
                  >
                    <USelect
                      v-model="state.defaultLanguage"
                      :items="languages"
                      label-key="name"
                      value-key="code"
                      @update:model-value="onLanguageChange"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('settings.general.date_format')"
                    name="dateFormat"
                  >
                    <USelect
                      v-model="state.dateFormat"
                      :items="dateFormats"
                      label-key="name"
                      value-key="value"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('settings.general.time_format')"
                    name="timeFormat"
                  >
                    <USelect
                      v-model="state.timeFormat"
                      :items="timeFormats"
                      label-key="name"
                      value-key="value"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('settings.general.timezone')"
                    name="timezone"
                  >
                    <USelect
                      v-model="state.timezone"
                      :items="timezones"
                      label-key="name"
                      value-key="value"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('settings.general.decimal_places')"
                    name="decimalPlaces"
                  >
                    <USelect
                      v-model="state.decimalPlaces"
                      :items="decimalOptions"
                      label-key="name"
                      value-key="value"
                    />
                  </UFormField>
                </div>
              </div>

              <!-- Shop Tags & Analytics -->
              <div>
                <h3 class="text-lg font-semibold mb-4">
                  {{
                    $t("settings.general.shop_tags") || "Shop Tags & Analytics"
                  }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {{
                    $t("settings.general.shop_tags_desc") ||
                    "Add tags to categorize your shop and help with analytics."
                  }}
                </p>

                <div class="space-y-4">
                  <!-- Tags Input -->
                  <UFormField
                    :label="$t('settings.general.tags') || 'Tags'"
                    name="tags"
                  >
                    <div class="space-y-2">
                      <div class="flex flex-wrap gap-2 mb-2">
                        <UBadge
                          v-for="(tag, index) in state.tags"
                          :key="index"
                          color="primary"
                          variant="subtle"
                          class="cursor-pointer"
                          @click="removeTag(index)"
                        >
                          {{ tag }}
                          <UIcon
                            name="i-heroicons-x-mark"
                            class="w-3 h-3 ml-1"
                          />
                        </UBadge>
                      </div>
                      <div class="flex gap-2">
                        <UInput
                          v-model="newTag"
                          :placeholder="
                            $t('settings.general.tag_placeholder') ||
                            'e.g. coffee, thai-food, retail'
                          "
                          class="flex-1"
                          @keyup.enter="addTag"
                        />
                        <UButton
                          icon="i-heroicons-plus"
                          :disabled="!newTag.trim()"
                          @click="addTag"
                        />
                      </div>
                    </div>
                    <template #hint>
                      <span class="text-xs text-gray-500">
                        {{
                          $t("settings.general.tags_hint") ||
                          "Press Enter or click + to add tags"
                        }}
                      </span>
                    </template>
                  </UFormField>

                  <!-- Platform Tag (Read-only) -->
                  <UFormField
                    :label="$t('settings.general.platform_tag') || 'Platform'"
                    name="platformTag"
                  >
                    <div class="flex items-center gap-2">
                      <UBadge color="amber" variant="solid" size="lg">
                        <UIcon name="i-heroicons-bolt" class="w-4 h-4 mr-1" />
                        {{ state.platformTag }}
                      </UBadge>
                      <span class="text-xs text-gray-500">
                        {{
                          $t("settings.general.platform_tag_hint") ||
                          "Powered by bnos.space"
                        }}
                      </span>
                    </div>
                  </UFormField>
                </div>
              </div>
            </div>
          </UCard>
        </template>

        <!-- Branches Tab -->
        <template #branches="{ item }">
          <UCard class="mt-4">
            <div class="space-y-6">
              <!-- Branch Management Header -->
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">
                  {{ $t("settings.branches.title") }}
                </h3>
                <UButton
                  :label="$t('common.add')"
                  icon="i-heroicons-plus"
                  @click="openBranchModal"
                />
              </div>

              <!-- Branches Table -->
              <div v-if="loadingBranches" class="text-center py-8">
                <UIcon
                  name="i-heroicons-arrow-path"
                  class="w-6 h-6 animate-spin text-gray-400"
                />
                <p class="mt-2 text-gray-500">{{ $t("common.loading") }}</p>
              </div>

              <div v-else-if="branches.length === 0" class="text-center py-8">
                <UIcon
                  name="i-heroicons-building-storefront"
                  class="w-12 h-12 text-gray-300 mx-auto"
                />
                <p class="mt-2 text-gray-500">
                  {{ $t("settings.branches.noBranches") || "No branches yet" }}
                </p>
                <p class="text-sm text-gray-400">
                  {{
                    $t("settings.branches.addFirst") ||
                    "Add your first branch to get started"
                  }}
                </p>
              </div>

              <div v-else class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                      <th
                        class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                      >
                        {{ $t("settings.branches.name") }}
                      </th>
                      <th
                        class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                      >
                        {{ $t("settings.branches.code") }}
                      </th>
                      <th
                        class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                      >
                        {{ $t("settings.branches.address") || "Address" }}
                      </th>
                      <th
                        class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
                      >
                        {{ $t("common.actions") }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(branch, index) in branches"
                      :key="branch.id ?? index"
                      class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td class="py-3 px-4">
                        <div>
                          <p class="font-medium text-gray-900 dark:text-white">
                            {{ branch.name }}
                          </p>
                        </div>
                      </td>
                      <td class="py-3 px-4">
                        <UBadge color="gray" variant="soft">
                          {{ branch.code }}
                        </UBadge>
                      </td>
                      <td class="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {{ branch.address || "-" }}
                      </td>
                      <td class="py-3 px-4">
                        <div class="flex space-x-2">
                          <UButton
                            icon="i-heroicons-pencil-square"
                            size="sm"
                            variant="ghost"
                            @click="editBranch(branch)"
                          />
                          <UButton
                            icon="i-heroicons-trash"
                            size="sm"
                            variant="ghost"
                            color="red"
                            @click="branch.id && deleteBranch(branch.id)"
                          />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </UCard>
        </template>

        <!-- Security Tab -->
        <template #security="{ item }">
          <UCard class="mt-4">
            <div class="space-y-6">
              <!-- Password Policy -->
              <div>
                <h3 class="text-lg font-semibold mb-4">
                  {{ $t("settings.security.password_policy") }}
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField
                    :label="$t('settings.security.min_password_length')"
                    name="minPasswordLength"
                  >
                    <UInput
                      v-model="state.minPasswordLength"
                      type="number"
                      min="6"
                      max="20"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('settings.security.password_expiry_days')"
                    name="passwordExpiryDays"
                  >
                    <UInput
                      v-model="state.passwordExpiryDays"
                      type="number"
                      min="0"
                      max="365"
                    />
                  </UFormField>
                </div>

                <div class="mt-4 space-y-3">
                  <UCheckbox
                    v-model="state.requireUppercase"
                    :label="$t('settings.security.require_uppercase')"
                  />
                  <UCheckbox
                    v-model="state.requireNumbers"
                    :label="$t('settings.security.require_numbers')"
                  />
                  <UCheckbox
                    v-model="state.requireSpecialChars"
                    :label="$t('settings.security.require_special_chars')"
                  />
                </div>
              </div>

              <!-- Session Settings -->
              <div>
                <h3 class="text-lg font-semibold mb-4">
                  {{ $t("settings.security.session_settings") }}
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormField
                    :label="$t('settings.security.session_timeout')"
                    name="sessionTimeout"
                  >
                    <USelect
                      v-model="state.sessionTimeout"
                      :items="sessionTimeouts"
                      label-key="name"
                      value-key="value"
                    />
                  </UFormField>

                  <UFormField
                    :label="$t('settings.security.max_login_attempts')"
                    name="maxLoginAttempts"
                  >
                    <UInput
                      v-model="state.maxLoginAttempts"
                      type="number"
                      min="3"
                      max="10"
                    />
                  </UFormField>
                </div>

                <div class="mt-4">
                  <UCheckbox
                    v-model="state.enableTwoFactor"
                    :label="$t('settings.security.enable_two_factor')"
                  />
                </div>
              </div>

              <!-- Data Encryption -->
              <div>
                <h3 class="text-lg font-semibold mb-4">
                  {{ $t("settings.security.dataEncryption") }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {{ $t("settings.security.dataEncryptionDesc") }}
                </p>

                <div
                  v-if="!security.isEncryptionEnabled.value"
                  class="space-y-4"
                >
                  <UFormField
                    :label="$t('settings.security.setupMasterPassword')"
                  >
                    <UInput
                      v-model="masterPassword"
                      type="password"
                      :placeholder="$t('settings.security.masterPasswordHint')"
                    />
                  </UFormField>
                  <UFormField :label="$t('settings.security.confirmPassword')">
                    <UInput
                      v-model="confirmMasterPassword"
                      type="password"
                      :placeholder="$t('settings.security.confirmPasswordHint')"
                    />
                  </UFormField>
                  <UButton
                    color="primary"
                    :disabled="
                      !masterPassword ||
                      masterPassword !== confirmMasterPassword
                    "
                    @click="enableEncryption"
                  >
                    {{ $t("settings.security.enableEncryption") }}
                  </UButton>
                </div>

                <div v-else class="space-y-4">
                  <UAlert
                    :icon="
                      security.isLocked.value
                        ? 'i-heroicons-lock-closed'
                        : 'i-heroicons-lock-open'
                    "
                    :color="security.isLocked.value ? 'yellow' : 'green'"
                    variant="subtle"
                    :title="
                      security.isLocked.value
                        ? $t('settings.security.locked')
                        : $t('settings.security.unlocked')
                    "
                  />

                  <div v-if="security.isLocked.value" class="space-y-3">
                    <UFormField
                      :label="$t('settings.security.enterMasterPassword')"
                    >
                      <UInput
                        v-model="unlockPassword"
                        type="password"
                        :placeholder="
                          $t('settings.security.masterPasswordHint')
                        "
                        @keyup.enter="unlockEncryption"
                      />
                    </UFormField>
                    <UButton color="primary" @click="unlockEncryption">
                      {{ $t("settings.security.unlock") }}
                    </UButton>
                  </div>

                  <div v-else>
                    <UButton variant="outline" @click="lockEncryption">
                      <UIcon
                        name="i-heroicons-lock-closed"
                        class="w-4 h-4 mr-2"
                      />
                      {{ $t("settings.security.lock") }}
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </template>
      </UTabs>
    </UForm>

    <!-- Branch Modal -->
    <UModal v-model:open="branchModal.open">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ branchModal.isEdit ? $t("common.edit") : $t("common.add") }}
              {{ $t("settings.branches.branch") }}
            </h3>
          </template>

          <UForm
            ref="branchFormRef"
            :schema="branchSchema"
            :state="branchModal.data"
            @submit="saveBranch"
          >
            <div class="space-y-4">
              <UFormField
                :label="$t('settings.branches.name')"
                name="name"
                required
              >
                <UInput
                  v-model="branchModal.data.name"
                  :placeholder="$t('settings.branches.name_placeholder')"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('settings.branches.code')"
                name="code"
                required
              >
                <UInput
                  v-model="branchModal.data.code"
                  :placeholder="$t('settings.branches.code_placeholder')"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('settings.branches.address') || 'Address'"
                name="address"
              >
                <UTextarea
                  v-model="branchModal.data.address"
                  :placeholder="$t('settings.branches.address_placeholder')"
                  :rows="3"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                :label="$t('settings.branches.bolt12') || 'BOLT12 Offer'"
                name="bolt12Offer"
              >
                <UInput
                  v-model="branchModal.data.bolt12Offer"
                  placeholder="lno1..."
                  class="w-full"
                />
                <template #hint>
                  <span class="text-xs text-gray-500">{{
                    $t("settings.branches.bolt12Hint") ||
                    "Lightning BOLT12 offer for this branch"
                  }}</span>
                </template>
              </UFormField>
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <UButton
                :label="$t('common.cancel')"
                variant="ghost"
                @click="branchModal.open = false"
              />
              <UButton
                :label="$t('common.save')"
                type="submit"
                :loading="branchModal.saving"
              />
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { z } from "zod";

const { t, locale } = useI18n();
const route = useRoute();
const toast = useToast();
const security = useSecurity();

// Page meta
definePageMeta({
  title: "General Settings",
  layout: "default",
  middleware: ["auth"],
});

// Form refs
const formRef = ref();
const branchFormRef = ref();

// State
const saving = ref(false);
const activeTab = ref("0");
const masterPassword = ref("");
const confirmMasterPassword = ref("");
const unlockPassword = ref("");

// Handle tab query parameter
onMounted(() => {
  const tabParam = route.query.tab as string;
  if (tabParam === "security") {
    activeTab.value = "2"; // Security is the 3rd tab (index 2)
  } else if (tabParam === "branches") {
    activeTab.value = "1";
  }
});

// Encryption functions
const enableEncryption = async () => {
  if (
    masterPassword.value &&
    masterPassword.value === confirmMasterPassword.value
  ) {
    const success = await security.setupMasterPassword(masterPassword.value);
    if (success) {
      masterPassword.value = "";
      confirmMasterPassword.value = "";
      toast.add({
        title: t("common.success"),
        description: t("settings.security.encryptionEnabled"),
        color: "green",
      });
    }
  }
};

const unlockEncryption = async () => {
  if (unlockPassword.value) {
    const success = await security.unlock(unlockPassword.value);
    if (success) {
      unlockPassword.value = "";
      toast.add({
        title: t("settings.security.unlocked"),
        color: "green",
      });
    } else {
      toast.add({
        title: t("common.error"),
        description: t("settings.security.wrongPassword"),
        color: "red",
      });
    }
  }
};

const lockEncryption = () => {
  security.lock();
  toast.add({
    title: t("settings.security.locked"),
    color: "yellow",
  });
};

// Form validation schema
const schema = z.object({
  companyName: z.string().min(1, t("validation.required")),
  companyEmail: z.string().email(t("validation.email")),
  companyPhone: z.string().optional(),
  taxNumber: z.string().optional(),
  companyAddress: z.string().optional(),
  defaultCurrency: z.string().min(1, t("validation.required")),
  defaultLanguage: z.string().min(1, t("validation.required")),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
  timezone: z.string().optional(),
  decimalPlaces: z.number().min(0).max(4).optional(),
  minPasswordLength: z.number().min(6).max(20).optional(),
  passwordExpiryDays: z.number().min(0).max(365).optional(),
  requireUppercase: z.boolean().optional(),
  requireNumbers: z.boolean().optional(),
  requireSpecialChars: z.boolean().optional(),
  sessionTimeout: z.number().optional(),
  maxLoginAttempts: z.number().min(3).max(10).optional(),
  enableTwoFactor: z.boolean().optional(),
});

// Branch form schema
const branchSchema = z.object({
  name: z.string().min(1, t("validation.required")),
  code: z.string().min(1, t("validation.required")),
  address: z.string().optional(),
  bolt12Offer: z.string().optional(),
});

// Form state
const state = reactive({
  companyName: "My Company",
  companyEmail: "info@mycompany.com",
  companyPhone: "+856 21 123456",
  taxNumber: "TAX123456",
  companyAddress: "Vientiane, Laos",
  defaultCurrency: "LAK",
  defaultLanguage: "en",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "24",
  timezone: "Asia/Vientiane",
  decimalPlaces: 2,
  minPasswordLength: 8,
  passwordExpiryDays: 90,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  enableTwoFactor: false,
  // Shop Tags & Analytics
  tags: [] as string[],
  platformTag: "bnos.space",
});

// Tag management
const newTag = ref("");

const addTag = () => {
  const tag = newTag.value.trim().toLowerCase().replace(/\s+/g, "-");
  if (tag && !state.tags.includes(tag)) {
    state.tags.push(tag);
    newTag.value = "";
  }
};

const removeTag = (index: number) => {
  state.tags.splice(index, 1);
};

// Tabs configuration
const tabs = [
  {
    slot: "general",
    label: t("settings.general.tab"),
    icon: "i-heroicons-cog-6-tooth",
  },
  {
    slot: "branches",
    label: t("settings.branches.tab"),
    icon: "i-heroicons-building-storefront",
  },
  {
    slot: "security",
    label: t("settings.security.tab"),
    icon: "i-heroicons-shield-check",
  },
];

// Options data
const currencies = [
  { code: "LAK", name: "Lao Kip (LAK)" },
  { code: "USD", name: "US Dollar (USD)" },
  { code: "THB", name: "Thai Baht (THB)" },
];

const languages = [
  { code: "lo", name: "ລາວ (Lao)" },
  { code: "en", name: "English (US)" },
  { code: "th", name: "ไทย (Thai)" },
];

const dateFormats = [
  { value: "DD/MM/YYYY", name: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", name: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", name: "YYYY-MM-DD" },
];

const timeFormats = [
  { value: "24", name: "24 Hour" },
  { value: "12", name: "12 Hour" },
];

const timezones = [
  { value: "Asia/Vientiane", name: "Asia/Vientiane" },
  { value: "Asia/Bangkok", name: "Asia/Bangkok" },
  { value: "UTC", name: "UTC" },
];

const decimalOptions = [
  { value: 0, name: "0" },
  { value: 1, name: "1" },
  { value: 2, name: "2" },
  { value: 3, name: "3" },
  { value: 4, name: "4" },
];

const sessionTimeouts = [
  { value: 15, name: "15 " + t("common.minutes") },
  { value: 30, name: "30 " + t("common.minutes") },
  { value: 60, name: "1 " + t("common.hour") },
  { value: 120, name: "2 " + t("common.hours") },
];

const statusOptions = [
  { value: "active", name: t("common.active") },
  { value: "inactive", name: t("common.inactive") },
];

// Branch type definition - using type from ~/types
import type { Branch } from "~/types";

// Nostr Data Layer
const nostrData = useNostrData();

// Branches data - loaded from Nostr
const branches = ref<Branch[]>([]);
const loadingBranches = ref(false);

// Branch modal state
const branchModal = reactive<{
  open: boolean;
  isEdit: boolean;
  saving: boolean;
  data: Branch;
}>({
  open: false,
  isEdit: false,
  saving: false,
  data: {
    id: "",
    name: "",
    code: "",
    address: "",
  },
});

// Load branches from Nostr on mount
const loadBranches = async () => {
  loadingBranches.value = true;
  try {
    const data = await nostrData.getAllBranches();
    branches.value = data;
  } catch (err) {
    console.error("Failed to load branches:", err);
  } finally {
    loadingBranches.value = false;
  }
};

function onLanguageChange() {}

// Load settings from Nostr on mount
const loadSettings = async () => {
  try {
    const settings = await nostrData.getSettings();
    if (settings) {
      // Handle BOTH new flat structure and legacy nested structure

      // New flat structure fields
      if (settings.companyName) state.companyName = settings.companyName;
      if (settings.companyEmail) state.companyEmail = settings.companyEmail;
      if (settings.companyPhone) state.companyPhone = settings.companyPhone;
      if (settings.taxNumber) state.taxNumber = settings.taxNumber;
      if (settings.companyAddress)
        state.companyAddress = settings.companyAddress;
      if (settings.defaultCurrency)
        state.defaultCurrency = settings.defaultCurrency;
      if (settings.defaultLanguage)
        state.defaultLanguage = settings.defaultLanguage;
      if (settings.dateFormat) state.dateFormat = settings.dateFormat;
      if (settings.timeFormat) state.timeFormat = settings.timeFormat;
      if (settings.timezone) state.timezone = settings.timezone;
      if (settings.decimalPlaces !== undefined)
        state.decimalPlaces = settings.decimalPlaces;

      // Legacy nested structure (from old settings format)
      if (settings.general) {
        if (settings.general.storeName)
          state.companyName = settings.general.storeName;
        if (settings.general.storeAddress)
          state.companyAddress = settings.general.storeAddress;
        if (settings.general.storePhone)
          state.companyPhone = settings.general.storePhone;
        if (settings.general.defaultCurrency)
          state.defaultCurrency = settings.general.defaultCurrency;
        if (settings.general.timezone)
          state.timezone = settings.general.timezone;
        if (settings.general.language) {
          // Map 'en-US' to 'en', 'lo-LA' to 'lo'
          const langMap: Record<string, string> = {
            "en-US": "en",
            "lo-LA": "lo",
          };
          state.defaultLanguage =
            langMap[settings.general.language] || settings.general.language;
        }
      }
    }
  } catch (err) {
    console.error("[general.vue] Failed to load settings:", err);
  }
};

// Initialize on mount
onMounted(() => {
  loadBranches();
  loadSettings();
});

// Methods
const onSubmit = async () => {
  saving.value = true;
  try {
    // Save to Nostr relay
    await nostrData.saveSettings({
      companyName: state.companyName,
      companyEmail: state.companyEmail,
      companyPhone: state.companyPhone,
      taxNumber: state.taxNumber,
      companyAddress: state.companyAddress,
      defaultCurrency: state.defaultCurrency,
      defaultLanguage: state.defaultLanguage,
      dateFormat: state.dateFormat,
      timeFormat: state.timeFormat,
      timezone: state.timezone,
      decimalPlaces: state.decimalPlaces,
    });

    // Show success notification
    const toast = useToast();
    toast.add({
      title: t("common.success"),
      description: t("settings.general.saved_successfully"),
      color: "green",
    });
  } catch (error) {
    console.error("Save error:", error);
    const toast = useToast();
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    saving.value = false;
  }
};

const saveSettings = () => {
  formRef.value?.submit();
};

const openBranchModal = () => {
  branchModal.isEdit = false;
  branchModal.data = {
    id: "",
    name: "",
    code: "",
    address: "",
  };
  branchModal.open = true;
};

const editBranch = (branch: Branch) => {
  branchModal.isEdit = true;
  branchModal.data = { ...branch };
  branchModal.open = true;
};

const saveBranch = async () => {
  branchModal.saving = true;
  try {
    // Generate ID for new branches
    if (!branchModal.isEdit || !branchModal.data.id) {
      branchModal.data.id = crypto.randomUUID();
    }

    // Save to Nostr
    await nostrData.saveBranch(branchModal.data);

    // Reload branches
    await loadBranches();

    branchModal.open = false;

    // Show success notification
    const toast = useToast();
    toast.add({
      title: t("common.success"),
      description: t("settings.branches.saved_successfully"),
      color: "green",
    });
  } catch (error) {
    console.error("Save branch error:", error);
    const toast = useToast();
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "red",
    });
  } finally {
    branchModal.saving = false;
  }
};

const deleteBranch = async (branchId: string) => {
  if (confirm(t("common.confirm_delete"))) {
    try {
      // For now, filter locally - TODO: implement delete in Nostr
      branches.value = branches.value.filter((b) => b.id !== branchId);

      // Show success notification
      const toast = useToast();
      toast.add({
        title: t("common.success"),
        description: t("settings.branches.deleted_successfully"),
        color: "green",
      });
    } catch (error) {
      console.error("Delete branch error:", error);
    }
  }
};
</script>
