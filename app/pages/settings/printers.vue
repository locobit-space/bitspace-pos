<script setup lang="ts">
import {
  usePrinterSettings,
  type Printer,
} from "~/composables/use-printer-settings";
import PrinterFormModal from "~/components/settings/PrinterFormModal.vue";

definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();
const { settings, addPrinter, updatePrinter, removePrinter, loadSettings } =
  usePrinterSettings();

onMounted(() => {
  loadSettings();
});

// Modal State
const isModalOpen = ref(false);
const viewMode = ref<"grid" | "list">("grid");
const editingPrinter = ref<Printer | undefined>(undefined);

// Search State
const searchQuery = ref("");

const filteredPrinters = computed(() => {
  const printers = settings.value.printers || [];
  if (!searchQuery.value) return printers;
  const query = searchQuery.value.toLowerCase();
  return printers.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      p.ip.includes(query) ||
      p.location.toLowerCase().includes(query) ||
      (p.customLocation && p.customLocation.toLowerCase().includes(query)),
  );
});

const openAddModal = () => {
  editingPrinter.value = undefined;
  isModalOpen.value = true;
};

const openEditModal = (printer: Printer) => {
  editingPrinter.value = printer;
  isModalOpen.value = true;
};

const handleSave = (printerData: Omit<Printer, "id">) => {
  if (editingPrinter.value) {
    updatePrinter(editingPrinter.value.id, printerData);
    toast.add({
      title: t("settings.printers.editPrinter"),
      color: "green",
    });
  } else {
    addPrinter(printerData);
    toast.add({
      title: t("settings.printers.addPrinter"),
      color: "green",
    });
  }
};

const confirmDelete = (printer: Printer) => {
  if (confirm(t("common.deleteConfirm", { name: printer.name }))) {
    removePrinter(printer.id);
    toast.add({ title: t("common.deleted"), color: "gray" });
  }
};

const testPrint = (printer: Printer) => {
  console.log(
    `[Mock Print] Sending test job to ${printer.ip}:${printer.port} (${printer.location})`,
  );
  toast.add({
    title: t("settings.printers.testConnecting"),
    description: `${printer.ip}:${printer.port}`,
    icon: "solar:printer-linear",
    color: "blue",
  });

  // Simulate network delay
  setTimeout(() => {
    toast.add({
      title: t("settings.printers.testSent"),
      description: printer.name,
      icon: "solar:check-circle-linear",
      color: "green",
    });
  }, 1500);
};
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ $t("settings.printers.title") }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          {{ $t("settings.printers.description") }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="solar:add-circle-linear"
          :label="$t('settings.printers.addPrinter')"
          color="primary"
          @click="openAddModal"
        />
        <UButton
          icon="solar:printer-linear"
          :label="$t('settings.printers.testPrint')"
          color="neutral"
          variant="outline"
          to="/settings/test-print"
        />
      </div>
    </div>

    <!-- Info Alert -->
    <UAlert
      icon="solar:info-circle-linear"
      color="primary"
      variant="subtle"
      :title="$t('settings.printers.howItWorks')"
      :description="$t('settings.printers.howItWorksDesc')"
    />

    <!-- Toolbar & Empty State Check -->
    <div v-if="settings.printers.length > 0">
      <div class="flex items-center justify-between mb-4">
        <!-- Search Input -->
        <div class="w-64">
          <UInput
            v-model="searchQuery"
            icon="solar:magnifer-linear"
            size="sm"
            :placeholder="$t('common.search')"
          />
        </div>

        <!-- View Toggle -->
        <div
          class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg"
        >
          <UButton
            icon="solar:chart-square-bold-duotone"
            color="gray"
            variant="ghost"
            size="xs"
            :class="[
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            ]"
            @click="viewMode = 'grid'"
          />
          <UButton
            icon="solar:list-linear"
            color="gray"
            variant="ghost"
            size="xs"
            :class="[
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            ]"
            @click="viewMode = 'list'"
          />
        </div>
      </div>

      <!-- Grid View -->
      <div
        v-if="viewMode === 'grid'"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <UCard
          v-for="printer in filteredPrinters"
          :key="printer.id"
          class="overflow-hidden transition-all hover:ring-2 hover:ring-primary-500/50"
        >
          <div class="p-4">
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2">
                <div
                  class="w-2 h-2 rounded-full"
                  :class="printer.isActive ? 'bg-green-500' : 'bg-gray-300'"
                ></div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ printer.name }}
                </h3>
              </div>
              <UBadge color="gray" variant="soft" size="xs">{{
                printer.location === "custom"
                  ? printer.customLocation
                  : $t(`settings.printers.locations.${printer.location}`)
              }}</UBadge>
            </div>

            <div
              class="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-3"
            >
              <!-- Connection Type -->
              <div class="flex items-center gap-2">
                <UIcon
                  :name="
                    printer.type === 'network'
                      ? 'solar:global-linear'
                      : printer.type === 'wireless'
                        ? 'solar:wi-fi-router-minimalistic-line-duotone'
                        : printer.type === 'bluetooth'
                          ? 'solar:bluetooth-linear'
                          : printer.type === 'usb'
                            ? 'solar:usb-linear'
                            : 'solar:server-path-linear'
                  "
                  class="w-4 h-4 text-gray-400"
                />
                <span class="capitalize">{{ printer.type }}</span>
                <UBadge
                  v-if="printer.autoCut"
                  color="green"
                  variant="subtle"
                  size="xs"
                  >Auto-cut</UBadge
                >
              </div>
              <!-- IP Address (for network types) -->
              <div
                v-if="
                  ['network', 'wireless', 'ethernet'].includes(printer.type)
                "
                class="flex items-center gap-2"
              >
                <UIcon
                  name="solar:router-linear"
                  class="w-4 h-4 text-gray-400"
                />
                <span class="font-mono text-xs"
                  >{{ printer.ip }}:{{ printer.port }}</span
                >
              </div>
              <!-- Paper Width -->
              <div class="flex items-center gap-2">
                <UIcon
                  name="solar:document-text-linear"
                  class="w-4 h-4 text-gray-400"
                />
                <span>{{
                  printer.paperWidth === "custom"
                    ? `${printer.customPaperWidth}mm (custom)`
                    : printer.paperWidth
                }}</span>
              </div>
            </div>
          </div>

          <!-- Actions Footer -->
          <div
            class="bg-gray-50 w-full rounded-lg justify-center dark:bg-gray-800/50 px-4 py-2 flex gap-2"
          >
            <UButton
              icon="i-heroicons-printer"
              variant="ghost"
              color="indigo"
              size="xs"
              :label="$t('settings.printers.test')"
              @click="testPrint(printer)"
            />
            <UButton
              icon="solar:pen-new-square-linear"
              variant="ghost"
              color="gray"
              size="xs"
              @click="openEditModal(printer)"
            />
            <UButton
              icon="solar:trash-bin-trash-linear"
              variant="ghost"
              color="red"
              size="xs"
              @click="confirmDelete(printer)"
            />
          </div>
        </UCard>
      </div>

      <!-- List View -->
      <div
        v-else
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xs ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table
            class="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
          >
            <thead class="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {{ $t("settings.printers.status") }}
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {{ $t("settings.printers.name") }}
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Connection
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {{ $t("settings.printers.location") }}
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {{ $t("settings.printers.ipAddress") }}
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {{ $t("settings.printers.paperWidth") }}
                </th>
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  Features
                </th>
                <th scope="col" class="relative px-6 py-3">
                  <span class="sr-only">{{ $t("common.actions") }}</span>
                </th>
              </tr>
            </thead>
            <tbody
              class="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800"
            >
              <tr
                v-for="printer in filteredPrinters"
                :key="printer.id"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-2.5 h-2.5 rounded-full"
                      :class="printer.isActive ? 'bg-green-500' : 'bg-gray-300'"
                    ></div>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      {{
                        printer.isActive
                          ? $t("settings.printers.active")
                          : $t("settings.printers.inactive")
                      }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="text-sm font-medium text-gray-900 dark:text-white"
                    >{{ printer.name }}</span
                  >
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <UIcon
                      :name="
                        printer.type === 'network'
                          ? 'solar:global-linear'
                          : printer.type === 'wireless'
                            ? 'solar:wi-fi-router-minimalistic-line-duotone'
                            : printer.type === 'bluetooth'
                              ? 'solar:bluetooth-linear'
                              : printer.type === 'usb'
                                ? 'solar:usb-linear'
                                : 'solar:server-path-linear'
                      "
                      class="w-4 h-4 text-gray-400"
                    />
                    <span
                      class="text-sm text-gray-900 dark:text-white capitalize"
                      >{{ printer.type }}</span
                    >
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <UBadge color="gray" variant="soft" size="xs">{{
                    printer.location === "custom"
                      ? printer.customLocation
                      : $t(`settings.printers.locations.${printer.location}`)
                  }}</UBadge>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div
                    v-if="
                      ['network', 'wireless', 'ethernet'].includes(printer.type)
                    "
                    class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                  >
                    <span class="font-mono text-xs"
                      >{{ printer.ip }}:{{ printer.port }}</span
                    >
                  </div>
                  <span v-else class="text-sm text-gray-400">-</span>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                >
                  {{
                    printer.paperWidth === "custom"
                      ? `${printer.customPaperWidth}mm`
                      : printer.paperWidth
                  }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex gap-1">
                    <UBadge
                      v-if="printer.autoCut"
                      color="green"
                      variant="subtle"
                      size="xs"
                      >Auto-cut</UBadge
                    >
                    <UBadge
                      v-if="printer.encoding && printer.encoding !== 'UTF-8'"
                      color="blue"
                      variant="subtle"
                      size="xs"
                      >{{ printer.encoding }}</UBadge
                    >
                  </div>
                </td>
                <td
                  class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                >
                  <div class="flex items-center justify-end gap-2">
                    <UButton
                      icon="solar:printer-linear"
                      variant="ghost"
                      color="indigo"
                      size="xs"
                      :label="$t('settings.printers.test')"
                      @click="testPrint(printer)"
                    />
                    <UButton
                      icon="solar:pen-new-square-linear"
                      variant="ghost"
                      color="gray"
                      size="xs"
                      @click="openEditModal(printer)"
                    />
                    <UButton
                      icon="solar:trash-bin-trash-linear"
                      variant="ghost"
                      color="red"
                      size="xs"
                      @click="confirmDelete(printer)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
    >
      <div
        class="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3"
      >
        <UIcon name="solar:printer-linear" class="w-6 h-6 text-gray-400" />
      </div>
      <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-1">
        {{ $t("settings.printers.noPrinters") }}
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {{ $t("settings.printers.addFirst") }}
      </p>
      <UButton
        :label="$t('settings.printers.addPrinter')"
        @click="openAddModal"
      />
    </div>

    <PrinterFormModal
      v-model="isModalOpen"
      :printer="editingPrinter"
      @save="handleSave"
    />
  </div>
</template>
