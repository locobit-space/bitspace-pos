<script setup lang="ts">
import type {
  Printer,
  PrinterLocation,
  PrinterType,
} from "~/composables/use-printer-settings";
import { z } from "zod";
import type { FormSubmitEvent } from "#ui/types";

const props = defineProps<{
  modelValue: boolean;
  printer?: Printer; // If provided, we are editing
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "save", printer: Omit<Printer, "id">): void;
}>();

const { t } = useI18n();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const isEditing = computed(() => !!props.printer);

// Default state
const defaultState = {
  name: "",
  ip: "",
  port: 9100,
  type: "network" as PrinterType,
  location: "kitchen" as PrinterLocation,
  customLocation: "",
  paperWidth: "80mm" as "58mm" | "80mm" | "custom",
  customPaperWidth: undefined as number | undefined,
  isActive: true,
  autoCut: true,
  encoding: "UTF-8",
  density: 3,
};

const state = reactive({ ...defaultState });

// Sync state when printer prop changes
watch(
  () => props.printer,
  (newPrinter) => {
    if (newPrinter) {
      Object.assign(state, newPrinter);
    } else {
      Object.assign(state, defaultState);
    }
  },
  { immediate: true },
);

// Auto-parse port from IP if entered as "IP:PORT" format
watch(
  () => state.ip,
  (newIp) => {
    if (newIp && newIp.includes(":")) {
      const parts = newIp.split(":");
      const ip = parts[0]?.trim();
      const portStr = parts[1]?.trim();

      if (ip) {
        state.ip = ip;
      }
      if (portStr) {
        const parsedPort = parseInt(portStr);
        if (!isNaN(parsedPort)) {
          state.port = parsedPort;
        }
      }
    }
  },
);

// Validation Schema
const schema = z.object({
  name: z.string().min(1, t("validation.required")),
  ip: z.string().optional(),
  port: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.number().int().positive().optional(),
  ),
  location: z.enum(["counter", "kitchen", "bar", "custom"]),
  customLocation: z.string().optional(),
});

type Schema = z.output<typeof schema>;

const locations = computed(() => [
  { label: t("settings.printers.locations.counter"), value: "counter" },
  { label: t("settings.printers.locations.kitchen"), value: "kitchen" },
  { label: t("settings.printers.locations.bar"), value: "bar" },
  { label: t("settings.printers.locations.custom"), value: "custom" },
]);

const printerTypes = computed(() => [
  {
    label: t("settings.printers.types.network"),
    value: "network",
    icon: "solar:global-linear",
    description: t("settings.printers.types.networkDesc"),
  },
  {
    label: t("settings.printers.types.wireless"),
    value: "wireless",
    icon: "solar:wi-fi-router-minimalistic-line-duotone",
    description: t("settings.printers.types.wirelessDesc"),
  },
  {
    label: t("settings.printers.types.bluetooth"),
    value: "bluetooth",
    icon: "solar:bluetooth-linear",
    description: t("settings.printers.types.bluetoothDesc"),
  },
  {
    label: t("settings.printers.types.usb"),
    value: "usb",
    icon: "solar:usb-linear",
    description: t("settings.printers.types.usbDesc"),
  },
  {
    label: t("settings.printers.types.ethernet"),
    value: "ethernet",
    icon: "solar:server-path-linear",
    description: t("settings.printers.types.ethernetDesc"),
  },
  {
    label: t("settings.printers.types.system", "System Print"),
    value: "system",
    icon: "solar:printer-minimalistic-linear",
    description: t(
      "settings.printers.types.systemDesc",
      "Print via Browser System Dialog",
    ),
  },
]);

const paperWidths = [
  {
    label: "80mm",
    value: "80mm",
    description: t("settings.printers.paperSizes.80mmDesc"),
  },
  {
    label: "58mm",
    value: "58mm",
    description: t("settings.printers.paperSizes.58mmDesc"),
  },
  {
    label: t("settings.printers.paperSizes.custom"),
    value: "custom",
    description: t("settings.printers.paperSizes.customDesc"),
  },
];

const encodings = [
  { label: "UTF-8", value: "UTF-8" },
  { label: "GB18030", value: "GB18030" },
  { label: "ISO-8859-1", value: "ISO-8859-1" },
  { label: "Windows-1252", value: "Windows-1252" },
];

const showAdvancedSettings = ref(false);

const onSubmit = (event: FormSubmitEvent<Schema>) => {
  emit("save", { ...state });
  isOpen.value = false;
};
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="Printer Settings"
    description="Configure your printer settings"
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3
              class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
            >
              {{
                isEditing
                  ? $t("settings.printers.editPrinter")
                  : $t("settings.printers.addPrinter")
              }}
            </h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="solar:close-circle-linear"
              class="-my-1"
              @click="isOpen = false"
            />
          </div>
        </template>

        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto h-full"
          @submit="onSubmit"
        >
          <UFormField
            :label="$t('settings.printers.name')"
            name="name"
            required
          >
            <UInput
              v-model="state.name"
              placeholder="e.g. Kitchen Main"
              autofocus
              class="w-full"
            />
          </UFormField>

          <!-- Connection Type Selector -->
          <UFormField
            :label="$t('settings.printers.connectionType')"
            name="type"
            required
          >
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                v-for="type in printerTypes"
                :key="type.value"
                type="button"
                :class="[
                  'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all',
                  state.type === type.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                ]"
                @click="state.type = type.value as PrinterType"
              >
                <UIcon :name="type.icon" class="w-6 h-6 mb-1" />
                <span class="text-xs font-medium">{{ type.label }}</span>
              </button>
            </div>
          </UFormField>

          <!-- IP and Port (only for network-based types) -->
          <div
            v-if="['network', 'wireless', 'ethernet'].includes(state.type)"
            class="grid grid-cols-3 gap-4"
          >
            <UFormField
              :label="$t('settings.printers.ipAddress')"
              name="ip"
              required
              class="col-span-2"
            >
              <UInput
                v-model="state.ip"
                placeholder="192.168.1.201 or printer.local"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="$t('settings.printers.port')" name="port">
              <UInput
                v-model.number="state.port"
                type="number"
                placeholder="9100"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Bluetooth Info -->
          <UAlert
            v-if="state.type === 'bluetooth'"
            icon="solar:info-circle-linear"
            color="blue"
            variant="subtle"
            :title="$t('settings.printers.bluetoothInfo')"
            :description="$t('settings.printers.bluetoothInfoDesc')"
          />

          <!-- USB Info -->
          <UAlert
            v-if="state.type === 'usb'"
            icon="solar:info-circle-linear"
            color="blue"
            variant="subtle"
            :title="$t('settings.printers.usbInfo')"
            :description="$t('settings.printers.usbInfoDesc')"
          />

          <!-- Location -->
          <div class="flex gap-4">
            <UFormField
              :label="$t('settings.printers.location')"
              name="location"
              required
              class="flex-1"
            >
              <USelectMenu
                v-model="state.location"
                :items="locations"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>
            <UFormField
              v-if="state.location === 'custom'"
              :label="$t('settings.printers.locations.custom')"
              name="customLocation"
              required
              class="flex-1"
            >
              <UInput
                v-model="state.customLocation"
                placeholder="e.g. Pizza Station"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Paper Width -->
          <UFormField
            :label="$t('settings.printers.paperWidth')"
            name="paperWidth"
          >
            <USelectMenu
              v-model="state.paperWidth"
              :items="paperWidths"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <!-- Custom Paper Width Input -->
          <UFormField
            v-if="state.paperWidth === 'custom'"
            :label="$t('settings.printers.customPaperWidth')"
            name="customPaperWidth"
            required
          >
            <UInput
              v-model.number="state.customPaperWidth"
              type="number"
              placeholder="e.g. 76"
              suffix="mm"
              class="w-full"
            />
          </UFormField>

          <!-- Status Toggle -->
          <UFormField :label="$t('settings.printers.status')" name="isActive">
            <div class="flex items-center gap-2">
              <USwitch v-model="state.isActive" />
              <span class="text-sm text-gray-500 dark:text-gray-400">{{
                state.isActive
                  ? $t("settings.printers.active")
                  : $t("settings.printers.inactive")
              }}</span>
            </div>
          </UFormField>

          <!-- Advanced Settings Toggle -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <button
              type="button"
              class="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              @click="showAdvancedSettings = !showAdvancedSettings"
            >
              <div class="flex items-center gap-2">
                <UIcon
                  name="solar:settings-linear"
                  class="w-5 h-5 text-gray-400"
                />
                <span
                  class="text-sm font-medium text-gray-900 dark:text-white"
                  >{{ $t("settings.printers.advancedSettings") }}</span
                >
              </div>
              <UIcon
                name="solar:alt-arrow-down-linear"
                class="w-5 h-5 text-gray-400 transition-transform"
                :class="[showAdvancedSettings && 'transform rotate-180']"
              />
            </button>

            <div
              v-show="showAdvancedSettings"
              class="p-4 mt-2 space-y-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
            >
              <!-- Auto Cut Toggle -->
              <UFormField
                :label="$t('settings.printers.autoCut')"
                :description="$t('settings.printers.autoCutDesc')"
                name="autoCut"
              >
                <div class="flex items-center gap-2">
                  <USwitch v-model="state.autoCut" />
                  <span class="text-sm text-gray-500 dark:text-gray-400">{{
                    state.autoCut ? $t("common.enabled") : $t("common.disabled")
                  }}</span>
                </div>
              </UFormField>

              <!-- Encoding Selection -->
              <UFormField
                :label="$t('settings.printers.encoding')"
                :description="$t('settings.printers.encodingDesc')"
                name="encoding"
              >
                <USelectMenu
                  v-model="state.encoding"
                  :items="encodings"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>

              <!-- Print Density Slider -->
              <UFormField
                :label="$t('settings.printers.density')"
                :description="$t('settings.printers.densityDesc')"
                name="density"
              >
                <div class="space-y-2">
                  <input
                    v-model.number="state.density"
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  />
                  <div class="flex justify-between text-xs text-gray-500">
                    <span>{{ $t("settings.printers.densityLight") }}</span>
                    <span class="font-semibold text-primary-600">{{
                      state.density
                    }}</span>
                    <span>{{ $t("settings.printers.densityDark") }}</span>
                  </div>
                </div>
              </UFormField>
            </div>
          </div>

          <div class="flex justify-end w-full gap-3 pt-4">
            <UButton
              :label="$t('common.cancel')"
              color="gray"
              variant="ghost"
              block
              @click="isOpen = false"
            />
            <UButton
              type="submit"
              block
              :label="$t('common.save')"
              color="primary"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>
