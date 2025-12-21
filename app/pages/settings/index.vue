<template>
  <div class="p-4 space-y-4">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ $t("settings.title") }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ $t("settings.subtitle") || "Configure your store settings" }}
        </p>
      </div>
    </div>

    <!-- Primary Settings -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <NuxtLink to="/settings/general" class="block">
        <div
          class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-building-storefront"
                class="w-5 h-5 text-gray-600 dark:text-gray-400"
              />
            </div>
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                {{ $t("settings.general.title") }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ $t("settings.general.subtitle") }}
              </p>
            </div>
          </div>
        </div>
      </NuxtLink>

      <NuxtLink to="/settings/lightning" class="block">
        <div
          class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"
            >
              <span class="text-lg">⚡</span>
            </div>
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                {{ $t("settings.lightning.title") }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ $t("settings.lightning.subtitle") }}
              </p>
            </div>
          </div>
        </div>
      </NuxtLink>

      <NuxtLink to="/settings/users" class="block">
        <div
          class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-users"
                class="w-5 h-5 text-blue-600 dark:text-blue-400"
              />
            </div>
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                {{ $t("settings.users.title") }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ $t("settings.users.subtitle") }}
              </p>
            </div>
          </div>
        </div>
      </NuxtLink>

      <NuxtLink to="/settings/account" class="block">
        <div
          class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"
            >
              <UIcon
                name="i-heroicons-user-circle"
                class="w-5 h-5 text-purple-600 dark:text-purple-400"
              />
            </div>
            <div>
              <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                {{ $t("settings.account.title") }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ $t("settings.account.subtitle") }}
              </p>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Business Settings -->
    <div>
      <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        {{ $t("settings.sectionBusiness") }}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <NuxtLink to="/settings/tax" class="block">
          <div
            class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-receipt-percent"
                  class="w-5 h-5 text-green-600 dark:text-green-400"
                />
              </div>
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                  {{ $t("settings.tax.title") }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ $t("settings.tax.subtitle") }}
                </p>
              </div>
            </div>
          </div>
        </NuxtLink>

        <NuxtLink to="/settings/receipt" class="block">
          <div
            class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-document-text"
                  class="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                />
              </div>
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                  {{ $t("settings.receipt.title") }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ $t("settings.receipt.subtitle") }}
                </p>
              </div>
            </div>
          </div>
        </NuxtLink>

        <NuxtLink to="/products/meta" class="block">
          <div
            class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-tag"
                  class="w-5 h-5 text-orange-600 dark:text-orange-400"
                />
              </div>
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                  {{ $t("settings.categories.title") || "Categories" }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ $t("settings.categories.subtitle") }}
                </p>
              </div>
            </div>
          </div>
        </NuxtLink>

        <button class="block w-full text-left" @click="openTermsModal">
          <div
            class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-calendar-days"
                  class="w-5 h-5 text-cyan-600 dark:text-cyan-400"
                />
              </div>
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                  {{ $t("settings.terms.title") || "Payment Terms" }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ terms.length }} terms
                </p>
              </div>
            </div>
          </div>
        </button>

        <NuxtLink to="/settings/tables" class="block">
          <div
            class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-qr-code"
                  class="w-5 h-5 text-purple-600 dark:text-purple-400"
                />
              </div>
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                  {{ $t("tables.title") || "Tables" }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ $t("tables.description") || "QR code ordering" }}
                </p>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- System Settings -->
    <div>
      <h2 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        {{ $t("settings.sectionSystem") }}
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <NuxtLink to="/settings/security" class="block">
          <div
            class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-700 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-key"
                  class="w-5 h-5 text-red-600 dark:text-red-400"
                />
              </div>
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                  {{ $t("settings.security.title") }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ $t("settings.security.subtitle") }}
                </p>
              </div>
            </div>
          </div>
        </NuxtLink>

        <NuxtLink to="/settings/backup" class="block">
          <div
            class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-cloud-arrow-up"
                  class="w-5 h-5 text-cyan-600 dark:text-cyan-400"
                />
              </div>
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                  {{ $t("settings.backup.title") }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ $t("settings.backup.subtitle") }}
                </p>
              </div>
            </div>
          </div>
        </NuxtLink>

        <NuxtLink to="/settings/audit-log" class="block">
          <div
            class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-rose-300 dark:hover:border-rose-700 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-shield-check"
                  class="w-5 h-5 text-rose-600 dark:text-rose-400"
                />
              </div>
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                  {{ $t("settings.auditLog.title") }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ $t("settings.auditLog.subtitle") }}
                </p>
              </div>
            </div>
          </div>
        </NuxtLink>

        <NuxtLink to="/settings/relays" class="block">
          <div
            class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center"
              >
                <UIcon
                  name="i-heroicons-server-stack"
                  class="w-5 h-5 text-violet-600 dark:text-violet-400"
                />
              </div>
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white text-sm">
                  {{ $t("settings.relays.title") || "Nostr Relays" }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ $t("settings.relays.subtitle") || "Sync & connection" }}
                </p>
              </div>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Payment Terms Modal -->
    <UModal v-model:open="termsModalOpen">
      <template #content>
        <div class="bg-white dark:bg-gray-900 rounded-lg">
          <div
            class="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between"
          >
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{ $t("settings.terms.title") || "Payment Terms" }}
            </h3>
            <UButton
              color="primary"
              size="xs"
              icon="i-heroicons-plus"
              @click="openTermModal"
            >
              {{ $t("common.add") }}
            </UButton>
          </div>

          <div class="p-4 max-h-96 overflow-y-auto">
            <div v-if="loadingTerms" class="text-center py-8">
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-6 h-6 animate-spin text-gray-400"
              />
            </div>
            <div
              v-else-if="terms.length === 0"
              class="text-center py-8 text-gray-500"
            >
              <UIcon
                name="i-heroicons-calendar-days"
                class="w-10 h-10 mx-auto text-gray-300 mb-2"
              />
              <p class="text-sm">
                {{ $t("settings.terms.noTerms") || "No payment terms yet" }}
              </p>
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="term in terms"
                :key="term.id"
                class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div>
                  <p class="font-medium text-gray-900 dark:text-white text-sm">
                    {{ term.name }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ term.days }} {{ $t("common.days") }} •
                    {{ term.description }}
                  </p>
                </div>
                <div class="flex gap-1">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil"
                    size="xs"
                    @click="editTerm(term)"
                  />
                  <UButton
                    color="red"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    size="xs"
                    @click="deleteTerm(term.id)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Term Edit Modal -->
    <UModal v-model:open="termModalOpen">
      <template #content>
        <div class="bg-white dark:bg-gray-900 rounded-lg">
          <div class="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{
                editingTerm
                  ? $t("settings.terms.edit")
                  : $t("settings.terms.add")
              }}
            </h3>
          </div>

          <div class="p-4 space-y-4">
            <UFormField name="name" :label="$t('common.name')">
              <UInput v-model="termForm.name" placeholder="e.g. Net 30" />
            </UFormField>

            <UFormField name="days" :label="$t('settings.terms.days')">
              <UInput v-model="termForm.days" type="number" placeholder="30" />
            </UFormField>

            <UFormField name="description" :label="$t('common.description')">
              <UInput
                v-model="termForm.description"
                placeholder="Payment due within 30 days"
              />
            </UFormField>
          </div>

          <div
            class="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2"
          >
            <UButton
              color="neutral"
              variant="outline"
              @click="termModalOpen = false"
            >
              {{ $t("common.cancel") }}
            </UButton>
            <UButton color="primary" :loading="saving" @click="saveTerm">
              {{ $t("common.save") }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { PaymentTerm } from "~/types";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const nostrData = useNostrData();
const toast = useToast();

// State
const saving = ref(false);
const loadingTerms = ref(false);

// Modal states
const termsModalOpen = ref(false);
const termModalOpen = ref(false);

// Editing states
const editingTerm = ref<PaymentTerm | null>(null);

// Form states
const termForm = ref({
  name: "",
  days: 0,
  description: "",
});

// Payment terms data - integrated with Nostr
const terms = ref<PaymentTerm[]>([]);

// Default terms
const defaultTerms: PaymentTerm[] = [
  { id: "1", name: "Cash", days: 0, description: "Payment on delivery" },
  { id: "2", name: "Net 7", days: 7, description: "Payment due within 7 days" },
  {
    id: "3",
    name: "Net 30",
    days: 30,
    description: "Payment due within 30 days",
  },
];

// Load terms from Nostr settings
const loadTerms = async () => {
  loadingTerms.value = true;
  try {
    const settings = await nostrData.getSettings();
    if (settings?.general?.paymentTerms?.length) {
      terms.value = settings.general.paymentTerms;
    } else {
      terms.value = [...defaultTerms];
    }
  } catch {
    terms.value = [...defaultTerms];
  } finally {
    loadingTerms.value = false;
  }
};

// Save terms to Nostr settings
const saveTermsToNostr = async () => {
  try {
    const settings = await nostrData.getSettings();
    if (settings) {
      settings.general.paymentTerms = terms.value;
      await nostrData.saveSettings(settings);
    }
  } catch (error) {
    console.error("Failed to save terms:", error);
  }
};

// Methods
const openTermsModal = () => {
  termsModalOpen.value = true;
  loadTerms();
};

const openTermModal = () => {
  editingTerm.value = null;
  termForm.value = {
    name: "",
    days: 0,
    description: "",
  };
  termModalOpen.value = true;
};

const editTerm = (term: PaymentTerm) => {
  editingTerm.value = term;
  termForm.value = { ...term };
  termModalOpen.value = true;
};

const saveTerm = async () => {
  saving.value = true;
  try {
    if (editingTerm.value) {
      const index = terms.value.findIndex(
        (t) => t.id === editingTerm.value!.id
      );
      if (index !== -1) {
        terms.value[index] = { ...editingTerm.value, ...termForm.value };
      }
    } else {
      const newTerm: PaymentTerm = {
        id: crypto.randomUUID(),
        ...termForm.value,
      };
      terms.value.push(newTerm);
    }

    await saveTermsToNostr();

    toast.add({
      title: t("common.success"),
      description: t("common.saved"),
      color: "success",
    });

    termModalOpen.value = false;
  } finally {
    saving.value = false;
  }
};

const deleteTerm = async (id: string) => {
  if (confirm(t("common.confirm_delete"))) {
    terms.value = terms.value.filter((t) => t.id !== id);
    await saveTermsToNostr();
    toast.add({
      title: t("common.success"),
      description: t("common.deleted"),
      color: "success",
    });
  }
};

// Initialize
onMounted(() => {
  loadTerms();
});

// Set page title
useHead({
  title: t("settings.title"),
});
</script>
