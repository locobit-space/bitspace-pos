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
  paperWidth: "80mm" as "58mm" | "80mm",
  isActive: true,
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

// Validation Schema
const schema = z.object({
  name: z.string().min(1, t("validation.required")),
  ip: z.string().min(1, t("validation.required")),
  port: z.number().int().positive(),
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

const paperWidths = [
  { label: "80mm", value: "80mm" },
  { label: "58mm", value: "58mm" },
];

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
          class="space-y-4"
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

          <div class="grid grid-cols-3 gap-4">
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

            <UFormField
              :label="$t('settings.printers.port')"
              name="port"
              required
            >
              <UInput
                v-model="state.port"
                type="number"
                placeholder="9100"
                class="w-full"
              />
            </UFormField>
          </div>

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

          <UFormField :label="$t('settings.printers.status')" name="isActive">
            <USwitch v-model="state.isActive" />
            <span class="ml-2 text-sm text-gray-500">{{
              state.isActive
                ? $t("settings.printers.active")
                : $t("settings.printers.inactive")
            }}</span>
          </UFormField>

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
